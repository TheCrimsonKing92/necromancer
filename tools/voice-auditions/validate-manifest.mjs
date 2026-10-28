import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateVoiceAuditionManifest } from "./manifest-validation.mjs";

const toolRoot = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(toolRoot, "../..");
const manifest = JSON.parse(await readFile(resolve(toolRoot, "manifest.json"), "utf8"));
const errors = await validateVoiceAuditionManifest(manifest, repositoryRoot);

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exitCode = 1;
} else {
  const takeCount = manifest.lines.reduce((count, line) => {
    const character = manifest.characters.find(({ id }) => id === line.characterId);
    return count + character.candidates.length;
  }, 0);
  console.log(`Voice audition manifest is valid: ${manifest.lines.length} lines, ${takeCount} candidate takes.`);
}
