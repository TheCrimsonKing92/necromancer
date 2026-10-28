import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { inspectProse } from "./prose-rules.mjs";
import { stringLiteralsIn } from "./prose-source-extraction.mjs";

const ROOT = process.cwd();
const SOURCE_ROOTS = [path.join(ROOT, "src", "game"), path.join(ROOT, "src", "ui")];

const TEXT_EXTENSIONS = new Set([".ts"]);
const walk = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(absolute));
    else if (TEXT_EXTENSIONS.has(path.extname(entry.name)) && !entry.name.endsWith(".test.ts")) files.push(absolute);
  }
  return files;
};

const lineFor = (source, offset) => source.slice(0, offset).split(/\r?\n/u).length;

const findings = [];
for (const file of (await Promise.all(SOURCE_ROOTS.map(walk))).flat()) {
  const source = await readFile(file, "utf8");
  for (const literal of stringLiteralsIn(source)) {
    for (const finding of inspectProse(literal.text)) {
      findings.push({ file, line: lineFor(source, literal.offset), ...finding });
    }
  }
}

if (findings.length > 0) {
  console.error("Prose checks failed:");
  for (const finding of findings.slice(0, 50)) {
    console.error(`- ${path.relative(ROOT, finding.file)}:${finding.line} [${finding.rule}] ${JSON.stringify(finding.excerpt)}`);
    if (finding.explanation) console.error(`  ${finding.explanation}`);
  }
  if (findings.length > 50) console.error(`- ...and ${findings.length - 50} more findings.`);
  process.exitCode = 1;
} else {
  console.log("Prose checks passed: authored literals have clean punctuation, repetition, and known high-risk referents.");
}
