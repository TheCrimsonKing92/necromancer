import { campaignPreparationCount } from "./campaign-preparations";
import type { RunState } from "./types";
import { journalWorldEntryCountFor } from "./world/journal-visibility";

export const journalEntryCount = (run: RunState): number =>
  campaignPreparationCount(run) +
  run.world.playerKnowledge.length +
  journalWorldEntryCountFor(run);
