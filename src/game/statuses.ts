import type { StatusEffect, StatusId } from "./types";

export const statusDisplayName = (status: StatusId): string => {
  switch (status) {
    case "bleeding":
      return "Bleeding";
    case "burning":
      return "Burning";
    case "exposed":
      return "Exposed";
    case "forewarned":
      return "Forewarned";
  }
};

export const statusDuration = (turns: number): string =>
  `${turns} ${turns === 1 ? "round remains" : "rounds remain"}`;

export const statusConsequence = (
  status: StatusEffect,
): string => {
  switch (status.id) {
    case "bleeding":
      return `lose ${status.potency} Health when the exchange closes`;
    case "burning":
      return `lose ${status.potency} Health when the exchange closes${status.preventsHealthRecovery ? " and cannot recover Health" : ""}`;
    case "exposed":
      return `−${status.potency} Defense and Evasion`;
    case "forewarned":
      return `+${status.potency}% Accuracy and Evasion`;
  }
};

export const statusPreview = (status: StatusEffect): string =>
  `${statusDisplayName(status.id)} ${status.potency} · ${statusConsequence(status)} · ${statusDuration(status.turns)}`;
