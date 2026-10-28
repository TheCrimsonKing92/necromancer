import type {
  CampaignContinuityState,
  ClosedTestamentSummary,
  TestamentEndReason,
} from "./types";

export interface ChronicleTestamentEntry {
  readonly testamentId: string;
  readonly ordinal: number;
  readonly useName: string;
  readonly tradition: ClosedTestamentSummary["tradition"];
  readonly practiceName: string;
  readonly endReason: TestamentEndReason;
  readonly level: number;
  readonly experience: number;
  readonly battlesWon: number;
  readonly finalHealth: number;
  readonly maximumHealth: number;
  readonly hasSuccessor: boolean;
}

export interface ChronicleReadModel {
  readonly campaignId: string;
  readonly hasActiveTestament: boolean;
  readonly testaments: readonly ChronicleTestamentEntry[];
}

/** Player-level history only; this selector never reads character knowledge. */
export const chronicleReadModelFor = (
  campaign: Pick<
    CampaignContinuityState,
    "id" | "activeTestament" | "closedTestaments"
  >,
): ChronicleReadModel => ({
  campaignId: campaign.id,
  hasActiveTestament: Boolean(campaign.activeTestament),
  testaments: campaign.closedTestaments.map((summary) => ({
    testamentId: summary.testamentId,
    ordinal: summary.ordinal,
    useName: summary.useName,
    tradition: summary.tradition,
    practiceName: summary.practiceName,
    endReason: summary.endReason,
    level: summary.level,
    experience: summary.experience,
    battlesWon: summary.battlesWon,
    finalHealth: summary.finalHealth,
    maximumHealth: summary.maximumHealth,
    hasSuccessor: Boolean(summary.successor),
  })),
});
