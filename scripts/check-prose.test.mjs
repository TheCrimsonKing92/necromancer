import assert from "node:assert/strict";
import test from "node:test";
import { inspectProse, isProseCandidate } from "./prose-rules.mjs";
import { stringLiteralsIn } from "./prose-source-extraction.mjs";

test("flags a grammatically valid plural pronoun that obscures an abstract referent", () => {
  assert.deepEqual(
    inspectProse("The road reeve refuses to swear subjecthood for households that did not empower her to surrender them.")
      .map(({ rule }) => rule),
    ["abstract-singular-followed-by-plural-object-pronoun"],
  );
});

test("accepts an explicit singular referent", () => {
  assert.deepEqual(
    inspectProse("The road reeve refuses to swear subjecthood for households that did not empower her to surrender it."),
    [],
  );
});

test("flags answer used in place of a concrete physical relation", () => {
  assert.deepEqual(
    inspectProse("One bar answers the water, and one the millstone.").map(({ rule }) => rule),
    ["vague-answer-verb"],
  );
  assert.deepEqual(
    inspectProse("The officer answers before the gathered town."),
    [],
  );
});

test("does not mistake HTML template markup for authored prose", () => {
  assert.equal(isProseCandidate('<button class="button button--primary">Continue</button>'), false);
});

test("normalizes source indentation before checking punctuation", () => {
  assert.deepEqual(inspectProse("A sentence that\n    remains clean."), []);
});

test("does not consume source between interpolated template literals", () => {
  const source = 'const first = `Count ${value ? "one" : "many"} households.`;\n' +
    'const second = "The road remains open.";';
  assert.deepEqual(
    stringLiteralsIn(source).map(({ text }) => text),
    ["one", "many", "Count  INTERPOLATION households.", "The road remains open."],
  );
});

test("checks an interpolated sentence as one prose candidate", () => {
  const [literal] = stringLiteralsIn(
    "const line = `The ordinance governs ${count} households that cannot surrender them.`;",
  );
  assert.deepEqual(
    inspectProse(literal.text).map(({ rule }) => rule),
    ["abstract-singular-followed-by-plural-object-pronoun"],
  );
});
