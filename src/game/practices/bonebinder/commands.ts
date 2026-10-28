import type {
  BonebinderServantState,
  ServantCapabilityId,
  ServantCommandId,
  ServantCommandTargetKind,
} from "./types";

export interface ServantCommandDefinition {
  id: ServantCommandId;
  targetKind: ServantCommandTargetKind;
  requiredCapability: ServantCapabilityId | null;
}

export const SERVANT_COMMANDS = {
  await: {
    id: "await",
    targetKind: "none",
    requiredCapability: null,
  },
  counsel: {
    id: "counsel",
    targetKind: "optional-combatant",
    requiredCapability: null,
  },
  guard: {
    id: "guard",
    targetKind: "none",
    requiredCapability: "guard",
  },
  interpose: {
    id: "interpose",
    targetKind: "combatant",
    requiredCapability: "interpose",
  },
  harry: {
    id: "harry",
    targetKind: "combatant",
    requiredCapability: "harry",
  },
  labor: {
    id: "labor",
    targetKind: "task",
    requiredCapability: "corporeal-labor",
  },
  withdraw: {
    id: "withdraw",
    targetKind: "none",
    requiredCapability: null,
  },
} as const satisfies Record<
  ServantCommandId,
  ServantCommandDefinition
>;

export type IssueServantCommandFailure =
  | "missing-target"
  | "unsupported-command";

export type IssueServantCommandResult =
  | {
      ok: true;
      servant: BonebinderServantState;
    }
  | {
      ok: false;
      reason: IssueServantCommandFailure;
      servant: BonebinderServantState;
    };

export const issueServantCommand = (
  servant: BonebinderServantState,
  commandId: ServantCommandId,
  targetReference: string | null = null,
  issuedAtReference: string | null = null,
): IssueServantCommandResult => {
  const definition = SERVANT_COMMANDS[commandId];
  if (
    definition.requiredCapability !== null &&
    !servant.capabilities.includes(definition.requiredCapability)
  ) {
    return { ok: false, reason: "unsupported-command", servant };
  }
  if (
    (definition.targetKind === "combatant" ||
      definition.targetKind === "task") &&
    targetReference === null
  ) {
    return { ok: false, reason: "missing-target", servant };
  }

  return {
    ok: true,
    servant: {
      ...servant,
      command: {
        sequence: servant.command.sequence + 1,
        current: {
          id: commandId,
          targetReference:
            definition.targetKind === "none" ? null : targetReference,
          issuedAtReference,
        },
      },
    },
  };
};
