export const OBJECTIVE_PROSE_RULES = [
  {
    id: "space-before-punctuation",
    pattern: /\s+[,.!?;:](?=\s|$)/u,
    explanation: "Remove the space before the punctuation mark.",
  },
  {
    id: "duplicate-word",
    pattern: /\b([A-Za-z]+)\s+\1\b/iu,
    explanation: "Remove or deliberately rewrite the repeated word.",
  },
];

export const REFERENT_RISK_RULES = [
  {
    id: "abstract-singular-followed-by-plural-object-pronoun",
    pattern: /\b(subjecthood|custody|authority|ownership|consent|service|continuity|obligation|ordinance)\b[^.!?]{0,120}\b(?:surrender|cede|transfer|grant|withdraw|renounce|swear)\s+(?:them|themselves)\b/iu,
    explanation: "Repeat the abstract noun or use a singular pronoun; the plural pronoun can attach to a nearer group noun.",
  },
];

export const VAGUE_ACTION_RULES = [
  {
    id: "vague-answer-verb",
    pattern: /\b(?:answer|answers|answered|answering)\s+(?:(?:the|this|that|your|his|her|its|their|one|a|an)\s+)?(?:water|fire|thaw|road|route|crossing|mark|hire|work|motion|wound|linen|joint|seam|blow|sluice|mill|order|binding|command|counsel|trespass)\b/iu,
    explanation: "Name the concrete reply, resistance, repair, movement, or consequence instead of using ‘answer’ as a generic atmospheric verb.",
  },
];

export const normalizeProse = (text) => text.replace(/\s+/gu, " ").trim();

export const isProseCandidate = (text) => {
  const normalized = normalizeProse(text);
  return normalized.length >= 12 &&
    /[A-Za-z]{3}\s+[A-Za-z]{2}/u.test(normalized) &&
    !/[<>]|\b(?:class|data-[a-z-]+|aria-[a-z-]+)=/iu.test(normalized);
};

export const inspectProse = (text) => {
  if (!isProseCandidate(text)) return [];
  const normalized = normalizeProse(text);
  return [...OBJECTIVE_PROSE_RULES, ...REFERENT_RISK_RULES, ...VAGUE_ACTION_RULES].flatMap((rule) => {
    const match = normalized.match(rule.pattern);
    if (match?.[0].replaceAll("INTERPOLATION", "").trim().length === 0) return [];
    return match ? [{ rule: rule.id, excerpt: match[0], explanation: rule.explanation }] : [];
  });
};
