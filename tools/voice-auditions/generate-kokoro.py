#!/usr/bin/env python3
"""Render nonproduction Kokoro auditions from the reviewed manifest."""

from __future__ import annotations

import argparse
import hashlib
import importlib.metadata
import json
import platform
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

TOOL_ROOT = Path(__file__).resolve().parent
REPOSITORY_ROOT = TOOL_ROOT.parent.parent
MANIFEST_PATH = TOOL_ROOT / "manifest.json"


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def sha256_text(value: str) -> str:
    return sha256_bytes(value.encode("utf-8"))


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def load_manifest() -> dict[str, Any]:
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    if manifest.get("status") != "nonproduction-audition":
        raise RuntimeError("Refusing to render a manifest not marked nonproduction-audition.")
    if manifest.get("output", {}).get("root") != "output/voice-auditions/kokoro":
        raise RuntimeError("Refusing to render outside the nonproduction audition directory.")
    for line in manifest["lines"]:
        if sha256_text(line["exactText"]) != line["textSha256"]:
            raise RuntimeError(f"Stale text hash for {line['id']}; run npm run voice:auditions:validate.")
        source = (REPOSITORY_ROOT / line["source"]["path"]).read_text(encoding="utf-8")
        if line["exactText"] not in source:
            raise RuntimeError(f"Audition text {line['id']} no longer occurs in its authored source.")
    return manifest


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--character", action="append", help="Render only this character id; repeatable.")
    parser.add_argument("--line", action="append", help="Render only this line id; repeatable.")
    parser.add_argument("--candidate", action="append", help="Render only this candidate id; repeatable.")
    parser.add_argument("--offline", action="store_true", help="Use only already-cached Hugging Face artifacts.")
    parser.add_argument("--force", action="store_true", help="Replace an existing candidate WAV.")
    parser.add_argument("--dry-run", action="store_true", help="Validate and list work without importing Kokoro.")
    return parser.parse_args()


def selected_takes(manifest: dict[str, Any], args: argparse.Namespace) -> list[tuple[dict[str, Any], dict[str, Any], dict[str, Any]]]:
    characters = {character["id"]: character for character in manifest["characters"]}
    takes = []
    for line in manifest["lines"]:
        character = characters[line["characterId"]]
        if args.character and character["id"] not in args.character:
            continue
        if args.line and line["id"] not in args.line:
            continue
        for candidate in character["candidates"]:
            if args.candidate and candidate["id"] not in args.candidate:
                continue
            takes.append((character, line, candidate))
    return takes


def output_name(pattern: str, character: dict[str, Any], line: dict[str, Any], candidate: dict[str, Any]) -> str:
    return pattern.format(
        characterId=character["id"],
        lineId=line["id"],
        candidateId=candidate["id"],
        speedPercent=round(candidate["speed"] * 100),
        textHash8=line["textSha256"][:8],
    )


def require_environment() -> None:
    if not ((3, 10) <= sys.version_info[:2] < (3, 14)):
        raise RuntimeError("Kokoro 0.9.4 requires Python 3.10 through 3.13.")
    missing = []
    for package in ("kokoro", "huggingface_hub", "numpy", "soundfile", "torch"):
        try:
            importlib.metadata.version(package)
        except importlib.metadata.PackageNotFoundError:
            missing.append(package)
    if missing:
        raise RuntimeError(
            "Missing local voice-tool dependencies: " + ", ".join(missing)
            + ". Install tools/voice-auditions/requirements.txt in an isolated environment."
        )
    kokoro_version = importlib.metadata.version("kokoro")
    if kokoro_version != "0.9.4":
        raise RuntimeError(f"Expected kokoro 0.9.4, found {kokoro_version}.")
    if shutil.which("espeak-ng") is None:
        try:
            loader_version = importlib.metadata.version("espeakng-loader")
            import espeakng_loader
            library_path = Path(espeakng_loader.get_library_path())
            data_path = Path(espeakng_loader.get_data_path())
        except (ImportError, importlib.metadata.PackageNotFoundError, RuntimeError) as error:
            raise RuntimeError(
                "No usable eSpeak-NG runtime was found. Install the pinned espeakng-loader "
                "package or put espeak-ng on PATH; phonemization must not silently omit "
                "out-of-dictionary names."
            ) from error
        if loader_version != "0.2.4" or not library_path.is_file() or not data_path.is_dir():
            raise RuntimeError("The pinned espeakng-loader 0.2.4 runtime is incomplete.")


def assert_published_hash(path: Path, prefix: str, label: str) -> str:
    digest = file_sha256(path)
    if not digest.startswith(prefix):
        raise RuntimeError(f"{label} checksum {digest} does not match published prefix {prefix}.")
    return digest


def delayed_double(audio: Any, treatment: dict[str, Any], np: Any) -> Any:
    ratio = float(treatment["rateRatio"])
    source_positions = np.arange(0, len(audio), ratio)
    shifted = np.interp(source_positions, np.arange(len(audio)), audio).astype(np.float32)
    delay = round(24000 * float(treatment["delayMs"]) / 1000)
    mixed_length = max(len(audio), delay + len(shifted))
    mixed = np.zeros(mixed_length, dtype=np.float32)
    mixed[: len(audio)] += audio
    mixed[delay : delay + len(shifted)] += shifted * float(treatment["gain"])
    peak = float(np.max(np.abs(mixed))) if len(mixed) else 0.0
    return mixed if peak <= 0.98 else mixed * (0.98 / peak)


def main() -> int:
    args = parse_args()
    manifest = load_manifest()
    takes = selected_takes(manifest, args)
    if not takes:
        raise RuntimeError("The supplied filters select no audition takes.")

    output_root = REPOSITORY_ROOT / manifest["output"]["root"]
    for character, line, candidate in takes:
        print(output_name(manifest["output"]["filePattern"], character, line, candidate))
    if args.dry_run:
        print(f"Dry run: {len(takes)} take(s); no model import, download, or output write occurred.")
        return 0

    require_environment()
    from huggingface_hub import hf_hub_download
    from kokoro import KModel, KPipeline
    import numpy as np
    import soundfile as sf
    import torch

    generator = manifest["generator"]
    download_options = {
        "repo_id": generator["modelId"],
        "revision": generator["modelRevision"],
        "local_files_only": args.offline,
    }
    model_path = Path(hf_hub_download(filename=generator["modelFile"], **download_options))
    config_path = Path(hf_hub_download(filename=generator["configFile"], **download_options))
    model_hash = assert_published_hash(model_path, generator["modelSha256Prefix"], "Kokoro model")
    resolved_revision = next((part for index, part in enumerate(model_path.parts) if index and model_path.parts[index - 1] == "snapshots"), generator["modelRevision"])

    torch.manual_seed(generator["seed"])
    np.random.seed(generator["seed"])
    model = KModel(repo_id=generator["modelId"], config=str(config_path), model=str(model_path)).to("cpu").eval()
    pipelines: dict[str, Any] = {}
    output_root.mkdir(parents=True, exist_ok=True)
    index_path = output_root / manifest["output"]["indexFile"]
    prior_index = json.loads(index_path.read_text(encoding="utf-8")) if index_path.exists() else {"takes": []}
    prior_entries = {entry["outputPath"]: entry for entry in prior_index.get("takes", [])}
    index_entries = dict(prior_entries)

    for character, line, candidate in takes:
        filename = output_name(manifest["output"]["filePattern"], character, line, candidate)
        output_path = output_root / filename
        relative_output = output_path.relative_to(REPOSITORY_ROOT).as_posix()
        if output_path.exists() and not args.force:
            prior = prior_entries.get(relative_output)
            unchanged = prior and all((
                prior.get("outputSha256") == file_sha256(output_path),
                prior.get("textSha256") == line["textSha256"],
                prior.get("voiceId") == candidate["voiceId"],
                prior.get("speed") == candidate["speed"],
                prior.get("directionSha256") == character["directionSha256"],
            ))
            if unchanged:
                print(f"Keeping verified existing take: {relative_output}")
                continue
            raise RuntimeError(f"Refusing to replace unverified {output_path}; pass --force deliberately.")
        language = candidate["languageCode"]
        if language not in pipelines:
            pipelines[language] = KPipeline(lang_code=language, repo_id=generator["modelId"], model=model)
        pipeline = pipelines[language]
        voice_path = Path(hf_hub_download(filename=f"voices/{candidate['voiceId']}.pt", **download_options))
        voice_hash = assert_published_hash(voice_path, candidate["voiceSha256Prefix"], candidate["voiceId"])
        chunks = [result.audio.numpy() for result in pipeline(line["exactText"], voice=str(voice_path), speed=candidate["speed"]) if result.audio is not None]
        if not chunks:
            raise RuntimeError(f"Kokoro produced no audio for {line['id']} / {candidate['id']}.")
        audio = np.concatenate(chunks).astype(np.float32)
        treatment = character.get("treatment")
        if treatment and treatment["kind"] == "delayed-double":
            audio = delayed_double(audio, treatment, np)
        sf.write(output_path, audio, generator["sampleRateHz"], subtype="PCM_16")
        index_entries[relative_output] = {
            "lineId": line["id"],
            "characterId": character["id"],
            "candidateId": candidate["id"],
            "voiceId": candidate["voiceId"],
            "speed": candidate["speed"],
            "directionRevision": character["directionRevision"],
            "directionSha256": character["directionSha256"],
            "exactText": line["exactText"],
            "textSha256": line["textSha256"],
            "source": line["source"],
            "sourceFileSha256": file_sha256(REPOSITORY_ROOT / line["source"]["path"]),
            "outputPath": relative_output,
            "outputSha256": file_sha256(output_path),
            "voiceAssetSha256": voice_hash,
            "treatment": treatment,
        }

    packages = {}
    for distribution in ("kokoro", "misaki", "huggingface-hub", "numpy", "soundfile", "torch", "transformers"):
        try:
            packages[distribution] = importlib.metadata.version(distribution)
        except importlib.metadata.PackageNotFoundError:
            packages[distribution] = None
    index = {
        "status": manifest["status"],
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "manifestSha256": file_sha256(MANIFEST_PATH),
        "generator": {
            **generator,
            "resolvedModelRevision": resolved_revision,
            "modelAssetSha256": model_hash,
            "configAssetSha256": file_sha256(config_path),
            "python": sys.version,
            "platform": platform.platform(),
            "packages": packages,
        },
        "takes": [index_entries[key] for key in sorted(index_entries)],
    }
    index_path.write_text(json.dumps(index, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Audition index contains {len(index_entries)} take(s): {index_path.relative_to(REPOSITORY_ROOT)}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:  # Keep tool failures direct rather than a large framework traceback.
        print(f"voice audition generation failed: {error}", file=sys.stderr)
        raise SystemExit(1)
