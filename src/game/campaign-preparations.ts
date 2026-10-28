import type { RunState } from "./types";

export const CAMPAIGN_PREPARATION_IDS = [
  "burial-tally",
  "hollis-testimony",
  "ward-name",
  "bound-ash-hound",
  "early-descent",
  "grave-warden-road-seal",
] as const;

export type CampaignPreparationId =
  (typeof CAMPAIGN_PREPARATION_IDS)[number];

export interface CampaignPreparationDefinition {
  id: CampaignPreparationId;
  name: string;
  source: string;
  description: string;
  flag: string;
}

export interface CampaignPreparationEntry
  extends CampaignPreparationDefinition {
  status: "active" | "spent";
}

export const CAMPAIGN_PREPARATIONS: Record<
  CampaignPreparationId,
  CampaignPreparationDefinition
> = {
  "burial-tally": {
    id: "burial-tally",
    name: "County funerary tally",
    source: "The burial cut",
    description:
      "A stamped ward token carried by county burial crews. When you enter Saint Orra’s vault, it adds 3 Ward to whatever already surrounds you, up to the Ward limit.",
    flag: "burial-tally",
  },
  "hollis-testimony": {
    id: "hollis-testimony",
    name: "Hollis’s last memory",
    source: "Ossuary road",
    description:
      "Hollis’s testimony remembers the shape of Saint Orra’s counting room. When you enter her vault, it closes around you as 3 additional Ward.",
    flag: "hollis-testimony",
  },
  "ward-name": {
    id: "ward-name",
    name: "Saint Orra’s ward-name",
    source: "Hollis’s ledger",
    description:
      "The name Saint Orra surrendered has been turned against her. She begins the confrontation with 1 less Defense; the name may also remember who read it.",
    flag: "read-ledger",
  },
  "bound-ash-hound": {
    id: "bound-ash-hound",
    name: "Bound ash-hound shade",
    source: "Ossuary road",
    description:
      "The hound’s shade has accepted a new binding. It joins the next encounter and remains for 3 rounds unless destroyed first.",
    flag: "bound-ash-hound",
  },
  "early-descent": {
    id: "early-descent",
    name: "An unfinished accounting",
    source: "The hollow tollhouse",
    description:
      "You gave up an hour of recovery to descend before Saint Orra could finish assembling her borrowed body. She begins the confrontation wounded.",
    flag: "pressed-descent",
  },
  "grave-warden-road-seal": {
    id: "grave-warden-road-seal",
    name: "Roadside threshold seal",
    source: "Ossuary road",
    description:
      "A broken funerary boundary has been taken into custody. One fold of it will be set against Saint Orra when the confrontation begins.",
    flag: "grave-warden-road-seal",
  },
};

export const preparationSpentFlag = (
  id: CampaignPreparationId,
): string => `preparation-spent:${id}`;

export const spendPreparation = (
  run: RunState,
  id: CampaignPreparationId,
): void => {
  const flag = preparationSpentFlag(id);
  if (!run.flags.includes(flag)) run.flags.push(flag);
};

const hasPreparation = (
  run: RunState,
  id: CampaignPreparationId,
): boolean => run.flags.includes(CAMPAIGN_PREPARATIONS[id].flag);

export const campaignPreparationCount = (run: RunState): number => {
  let count = 0;
  for (const id of CAMPAIGN_PREPARATION_IDS) {
    if (hasPreparation(run, id)) count += 1;
  }
  return count;
};

export const campaignPreparationsFor = (
  run: RunState,
): CampaignPreparationEntry[] =>
  CAMPAIGN_PREPARATION_IDS.filter((id) => hasPreparation(run, id)).map(
    (id) => ({
      ...CAMPAIGN_PREPARATIONS[id],
      status: run.flags.includes(preparationSpentFlag(id))
        ? "spent"
        : "active",
    }),
  );
