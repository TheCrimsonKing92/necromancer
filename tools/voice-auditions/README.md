# Local Kokoro voice auditions

This is a development-only, disposable casting harness. It does not synthesize
at runtime, does not place model code or weights in the browser build, and does
not connect unreviewed takes to dialogue. The authored text remains canonical.

The manifest selects three current lines each for Sera Vale, Halwen Sar, and the
air-speaker. Each character has three deliberately varied Kokoro candidates.
Source-file membership and SHA-256 hashes make a dialogue edit fail validation
instead of leaving a stale take that merely sounds plausible.

## Validate without Python or downloads

```powershell
npm run voice:auditions:validate
```

This is part of `npm run test`. It verifies the manifest shape, line and
direction hashes, current authored sources, candidate count, published model
and voice hash prefixes, and the nonproduction output boundary.

## One-time local setup on Windows

The current development machine does not have Python, `py`, `uv`, `espeak-ng`,
or `ffmpeg` on `PATH`. Actual synthesis therefore begins at this explicit tool
installation boundary:

1. Install 64-bit Python 3.12 from python.org.
2. Create a repository-local environment and install only the development tool:

   ```powershell
   py -3.12 -m venv .voice-tools\venv
   .\.voice-tools\venv\Scripts\python.exe -m pip install --requirement tools\voice-auditions\requirements.txt
   ```

The pinned `espeakng-loader` package supplies the Windows eSpeak-NG library and
language data used by Kokoro's English frontend; a machine-wide MSI and `PATH`
change are not required. The harness still refuses synthesis without a complete
phonemizer runtime because names and other out-of-dictionary words must not be
silently omitted.

`.voice-tools/`, Hugging Face downloads, and the generated audition directory
are excluded from source control. Kokoro's first online render fetches the
Apache-2.0 `hexgrad/Kokoro-82M` model (roughly 363 MB in the upstream repository)
and only the selected voice packs. The generator checks the published SHA-256
prefixes before producing a take and records the complete resolved hashes and
environment in `audition-index.json`.

## Preview and render

The dry run imports no Kokoro dependencies and performs no network access:

```powershell
.\.voice-tools\venv\Scripts\python.exe tools\voice-auditions\generate-kokoro.py --dry-run
```

Render one small comparison before the full 27-take cohort:

```powershell
.\.voice-tools\venv\Scripts\python.exe tools\voice-auditions\generate-kokoro.py --line fire-road-arrival
```

Render all declared candidates:

```powershell
.\.voice-tools\venv\Scripts\python.exe tools\voice-auditions\generate-kokoro.py
```

Use `--character`, `--line`, or `--candidate` repeatedly to filter. Use
`--offline` after the model is cached to prove the run no longer needs network.
Verified existing takes are retained and remain in the cumulative cohort index;
an unindexed, modified, or stale WAV is immutable unless `--force` is passed
deliberately.

Outputs live only in `output/voice-auditions/kokoro/`. WAV is intentional for
audition masters. Do not copy a take into `public/`, add it to a content pack,
or compress it for runtime until a human has reviewed the casting, delivery,
pronunciation, scene timing, and synthetic-voice disclosure.

## Provenance and limitations

The cohort index records exact text and source, source/text/direction/output
hashes, model and voice asset hashes, resolved Hugging Face snapshot, package
versions, platform, speed, sample rate, seed, and any deterministic treatment.
[Kokoro 0.9.4](https://github.com/hexgrad/kokoro) and the
[Kokoro-82M weights](https://huggingface.co/hexgrad/Kokoro-82M) are
Apache-2.0; preserve notices and re-check terms before production use.

Kokoro does not follow prose performance directions. The directions in the
manifest are casting criteria for the listener. Candidate voice and speed are
the controllable synthesis inputs. The air-speaker alone receives a restrained,
deterministic delayed double so the audition can test a minimally nonhuman
presentation without concealing the base voice.
