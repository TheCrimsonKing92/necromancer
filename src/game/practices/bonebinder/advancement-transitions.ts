import type { EngineResult, GameState } from "../../types";
import { configureServantCompact } from "./advancement-state";
import type { ServantServicePurposeId } from "./compact";
import { bonebinderStateFor } from "./practice-state";

const compactError = (reason: string): string => {
  switch (reason) {
    case "doctrine-not-learned":
      return "Letter of Service has not been learned.";
    case "wrong-doctrine":
      return "Called Counsel excludes a written service.";
    case "conflicting-doctrines":
      return "Conflicting compact doctrines must be resolved first.";
    case "unsafe-to-rewrite":
      return "The service cannot be rewritten during combat or after death.";
    case "servant-not-present":
      return "No persistent servant is present.";
    case "compact-breached":
      return "A broken compact cannot be rewritten without an authored reconciliation.";
    default:
      return "The service could not be written.";
  }
};

export const setServantServicePurpose = (
  state: GameState,
  purposeId: ServantServicePurposeId,
): EngineResult => {
  const run = state.run;
  const practice = run ? bonebinderStateFor(run) : null;
  if (!run || !practice?.servant) {
    return { state, error: "No persistent servant is present." };
  }
  const safeToRewrite =
    state.screen !== "battle" &&
    state.ending !== "defeat" &&
    run.player.hp > 0;
  const configured = configureServantCompact(
    practice,
    run.player.advancements,
    purposeId,
    safeToRewrite,
  );
  if (!configured.ok) {
    return { state, error: compactError(configured.reason) };
  }

  const next = structuredClone(state);
  next.run!.practiceStates!.bonebinder = configured.practice;
  return { state: next };
};
