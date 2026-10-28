type DevelopmentProofEpilogueRenderer = () => string;

let renderer: DevelopmentProofEpilogueRenderer | undefined;

export const installDevelopmentProofEpilogueRenderer = (
  next: DevelopmentProofEpilogueRenderer,
): void => {
  renderer = next;
};

export const renderLoadedDevelopmentProofEpilogue = (
  visible: boolean,
): string => visible ? renderer?.() ?? "" : "";
