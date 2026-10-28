const STORAGE_KEY = "necro:scale";
const SCALES = ["standard", "large", "largest"];

export const installTextScalePreference = (
  documentRef: Document,
  storage: Pick<Storage, "getItem" | "setItem">,
): void => {
  const control = documentRef.querySelector<HTMLButtonElement>("[data-text-scale-control]");
  if (!control) return;

  let index = SCALES.indexOf(storage.getItem(STORAGE_KEY) ?? "");
  if (index < 0) index = 0;

  const apply = (): void => {
    const scale = SCALES[index] ?? "standard";
    documentRef.documentElement.dataset.textScale = scale;
    const label = scale[0]?.toUpperCase() + scale.slice(1);
    control.setAttribute("aria-label", `Text size: ${label}.`);
  };

  apply();
  control.addEventListener("click", () => {
    index = (index + 1) % SCALES.length;
    apply();
    storage.setItem(STORAGE_KEY, SCALES[index] ?? "standard");
  });
};
