import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export const sha256 = (value) => createHash("sha256").update(value, "utf8").digest("hex");

const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SHA256 = /^[a-f0-9]{64}$/;
const SHA256_PREFIX = /^[a-f0-9]{8,64}$/;

const duplicateValues = (values) => values.filter((value, index) => values.indexOf(value) !== index);

export async function validateVoiceAuditionManifest(manifest, repositoryRoot) {
  const errors = [];
  if (manifest.schemaVersion !== 1) errors.push("schemaVersion must be 1.");
  if (manifest.status !== "nonproduction-audition") errors.push("status must remain nonproduction-audition.");
  if (manifest.generator?.library !== "kokoro" || manifest.generator?.libraryVersion !== "0.9.4") {
    errors.push("The harness must pin kokoro 0.9.4.");
  }
  if (!SHA256_PREFIX.test(manifest.generator?.modelSha256Prefix ?? "")) {
    errors.push("generator.modelSha256Prefix must contain a published SHA-256 prefix.");
  }
  if (manifest.output?.root !== "output/voice-auditions/kokoro") {
    errors.push("Auditions must remain under output/voice-auditions/kokoro.");
  }

  const characters = Array.isArray(manifest.characters) ? manifest.characters : [];
  const lines = Array.isArray(manifest.lines) ? manifest.lines : [];
  const characterIds = characters.map(({ id }) => id);
  const lineIds = lines.map(({ id }) => id);
  for (const id of duplicateValues(characterIds)) errors.push(`Duplicate character id: ${id}.`);
  for (const id of duplicateValues(lineIds)) errors.push(`Duplicate line id: ${id}.`);

  for (const character of characters) {
    if (!ID.test(character.id ?? "")) errors.push(`Invalid character id: ${character.id}.`);
    if (!SHA256.test(character.directionSha256 ?? "")) {
      errors.push(`${character.id}: directionSha256 must be a complete SHA-256 hash.`);
    } else if (sha256(character.direction) !== character.directionSha256) {
      errors.push(`${character.id}: direction changed without a directionSha256 update.`);
    }
    if (!Array.isArray(character.candidates) || character.candidates.length < 2 || character.candidates.length > 3) {
      errors.push(`${character.id}: define two or three audition candidates.`);
      continue;
    }
    for (const candidate of character.candidates) {
      if (!ID.test(candidate.id ?? "")) errors.push(`${character.id}: invalid candidate id ${candidate.id}.`);
      if (!/^[ab][fm]_[a-z]+$/.test(candidate.voiceId ?? "")) errors.push(`${candidate.id}: invalid English Kokoro voice id.`);
      if (candidate.languageCode !== candidate.voiceId?.[0]) errors.push(`${candidate.id}: languageCode must match voiceId.`);
      if (typeof candidate.speed !== "number" || candidate.speed < 0.75 || candidate.speed > 1.25) {
        errors.push(`${candidate.id}: speed must be between 0.75 and 1.25.`);
      }
      if (!SHA256_PREFIX.test(candidate.voiceSha256Prefix ?? "")) {
        errors.push(`${candidate.id}: voiceSha256Prefix must contain a published SHA-256 prefix.`);
      }
    }
  }

  for (const line of lines) {
    if (!ID.test(line.id ?? "")) errors.push(`Invalid line id: ${line.id}.`);
    if (!characterIds.includes(line.characterId)) errors.push(`${line.id}: unknown character ${line.characterId}.`);
    if (!SHA256.test(line.textSha256 ?? "")) {
      errors.push(`${line.id}: textSha256 must be a complete SHA-256 hash.`);
    } else if (sha256(line.exactText) !== line.textSha256) {
      errors.push(`${line.id}: exactText changed without a textSha256 update.`);
    }
    const sourcePath = line.source?.path;
    if (!sourcePath || sourcePath.startsWith("/") || /^[A-Za-z]:/.test(sourcePath)) {
      errors.push(`${line.id}: source path must be repository-relative.`);
      continue;
    }
    try {
      const source = await readFile(resolve(repositoryRoot, sourcePath), "utf8");
      if (!source.includes(line.exactText)) errors.push(`${line.id}: exactText no longer occurs in ${sourcePath}.`);
    } catch (error) {
      errors.push(`${line.id}: cannot read ${sourcePath}: ${error.message}`);
    }
  }

  const requiredCharacters = ["sera-vale", "halwen-sar", "air-speaker"];
  for (const characterId of requiredCharacters) {
    const count = lines.filter((line) => line.characterId === characterId).length;
    if (count < 2 || count > 3) errors.push(`${characterId}: expected two or three stable audition lines, found ${count}.`);
  }

  return errors;
}
