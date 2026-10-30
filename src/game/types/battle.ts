import type { AdvancementExpressionId } from "./character";
import type {
  EncounterId,
  WakeVariantId,
} from "./world";
import type { BattleOutcome } from "./continuity";
import type {
  ActionId,
  StatusId,
  LogTone,
  BodyPartId,
  Combatant,
} from "./combat";
import type { Ally } from "./economy";

export interface BattleLogEntry {
  id: number;
  round: number;
  tone: LogTone;
  text: string;
  event?: WitnessEvent;
}

export type WitnessHealthCause =
  | "burning"
  | "bleeding"
  | "untreated-wounds"
  | "lingering-trauma";

export type WitnessSegment =
  | {
      type: "text";
      text: string;
    }
  | {
      type: "damage";
      actor: string;
      action?: string;
      actionLead?: string;
      attackDetail?: string;
      verb?: string;
      target: string;
      targetPossessive?: string;
      location: BodyPartId;
      locationLabel?: string;
      damage: number;
      wardAbsorbed: number;
      armorAbsorbed: number;
      protectionLabel?: string;
      resistanceAbsorbed?: number;
      resistanceLabel?: string;
      woundLabel?: string;
    }
  | {
      type: "miss";
      actor: string;
      action: string;
      target: string;
      text: string;
      chance: number;
      roll: number;
    }
  | {
      type: "transition";
      entity: string;
      transition: "defeated";
      cause: "health" | "vital-region";
      text: string;
    }
  | {
      type: "status";
      lead?: string;
      target: string;
      status: StatusId;
      potency: number;
      turns: number;
    }
  | {
      type: "health-loss";
      target: string;
      amount: number;
      cause: WitnessHealthCause;
    }
  | {
      type: "reward";
      opening: string;
      experience: number;
      lootVerb: "take" | "salvage";
      loot: string[];
      levelReached?: number;
    }
  | {
      type: "skill";
      skill: string;
      effect: string;
    };

export interface WitnessEvent {
  tone: LogTone;
  segments: WitnessSegment[];
}

export interface BattleState {
  encounterId: EncounterId;
  variantId: WakeVariantId | null;
  round: number;
  seed: number;
  enemies: Combatant[];
  allies: Ally[];
  log: BattleLogEntry[];
  outcome: BattleOutcome;
  nextWoundId: number;
  advancementState?: BattleAdvancementState;
  practiceStates?: {
    graveWarden?: import("../practices/grave-warden/types").GraveWardenBattleState;
  };
}

export interface PendingPlayerAction {
  actionId: ActionId;
  targetId?: string;
  chance?: number;
  roll?: number;
  hit?: boolean;
}

export interface BattleAdvancementState {
  usedExpressions: AdvancementExpressionId[];
  pendingPlayerAction?: PendingPlayerAction;
  setTheFrameRound?: number;
  fieldSplintUsed?: boolean;
  workedAroundWoundId?: string;
  workedAroundBurdenApplied?: boolean;
  workedAroundResolved?: boolean;
  departureRecovery?: import("../departure-recovery").DepartureRecoveryState;
}
