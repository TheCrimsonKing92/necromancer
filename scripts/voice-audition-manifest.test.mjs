import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { test } from "node:test";
import { validateVoiceAuditionManifest } from "../tools/voice-auditions/manifest-validation.mjs";

const repositoryRoot = resolve(import.meta.dirname, "..");
const manifest = JSON.parse(await readFile(resolve(repositoryRoot, "tools/voice-auditions/manifest.json"), "utf8"));

test("voice auditions remain current, bounded, and outside production delivery", async () => {
  assert.deepEqual(await validateVoiceAuditionManifest(manifest, repositoryRoot), []);
  assert.equal(manifest.lines.length, 9);
  assert.equal(manifest.output.root.startsWith("output/voice-auditions/"), true);
  const gitignore = await readFile(resolve(repositoryRoot, ".gitignore"), "utf8");
  assert.match(gitignore, /^\.voice-tools\/$/m);
  assert.match(gitignore, /^output\/voice-auditions\/$/m);
});

test("Sera audition lines retain mortal knowledge boundaries", () => {
  const seraText = manifest.lines
    .filter(({ characterId }) => characterId === "sera-vale")
    .map(({ exactText }) => exactText)
    .join(" ")
    .toLowerCase();
  assert.doesNotMatch(seraText, /your art|raise him|what remains in him/);
  assert.match(seraText, /one swears/);
  assert.match(seraText, /i have not been close enough/);
});
