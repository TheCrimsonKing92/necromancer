import type { RunState, WorldFactId } from "./types";
import { WORLD_FACTS } from "./world/facts";

export {
  CAMPAIGN_PREPARATIONS,
  CAMPAIGN_PREPARATION_IDS,
  campaignPreparationCount,
  campaignPreparationsFor,
  preparationSpentFlag,
  spendPreparation,
  type CampaignPreparationDefinition,
  type CampaignPreparationEntry,
  type CampaignPreparationId,
} from "./campaign-preparations";
export { journalEntryCount } from "./journal-count";

export interface KnownFactEntry {
  id: WorldFactId;
  title: string;
  description: string;
}

export const knownFactsFor = (run: RunState): KnownFactEntry[] =>
  run.world.playerKnowledge.map((id) => ({
    id,
    ...WORLD_FACTS[id],
  }));
