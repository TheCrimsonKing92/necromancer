import {
  LanguageVariant,
  SyntaxKind,
  createScanner,
} from "typescript/unstable/ast";

export const stringLiteralsIn = (source) => {
  const scanner = createScanner(false, LanguageVariant.Standard, source);
  const literals = [];
  const templateExpressions = [];
  let kind;

  do {
    kind = scanner.scan();
    if (
      kind === SyntaxKind.StringLiteral ||
      kind === SyntaxKind.NoSubstitutionTemplateLiteral
    ) {
      literals.push({ text: scanner.getTokenValue(), offset: scanner.getTokenStart() });
      continue;
    }
    if (kind === SyntaxKind.TemplateHead) {
      templateExpressions.push({
        nestedBraces: 0,
        offset: scanner.getTokenStart(),
        text: scanner.getTokenValue(),
      });
      continue;
    }
    const currentTemplate = templateExpressions.at(-1);
    if (!currentTemplate) continue;
    if (kind === SyntaxKind.OpenBraceToken) {
      currentTemplate.nestedBraces += 1;
      continue;
    }
    if (kind !== SyntaxKind.CloseBraceToken) continue;
    if (currentTemplate.nestedBraces > 0) {
      currentTemplate.nestedBraces -= 1;
      continue;
    }

    kind = scanner.reScanTemplateToken(false);
    currentTemplate.text += ` INTERPOLATION${scanner.getTokenValue()}`;
    if (kind === SyntaxKind.TemplateTail) {
      literals.push({ text: currentTemplate.text, offset: currentTemplate.offset });
      templateExpressions.pop();
    }
  } while (kind !== SyntaxKind.EndOfFile);

  return literals;
};
