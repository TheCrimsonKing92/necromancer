export const selectTacticalSceneSubject = (
  root: ParentNode,
  subjectId: string,
): boolean => {
  const marker = root.querySelector<HTMLElement>(
    `[data-tactical-subject-id="${CSS.escape(subjectId)}"]`,
  );
  if (!marker) return false;
  for (const candidate of root.querySelectorAll<HTMLElement>(
    "[data-tactical-subject-id]",
  )) candidate.setAttribute("aria-pressed", String(candidate === marker));
  return true;
};
