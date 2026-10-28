import { itemCount } from "../items";
import type { RunState } from "../types";

interface RecoveryRecord {
  stabilized: number;
  improved: number;
  scarred: number;
  condition: number;
  healed: number;
}

interface RenderingRecord {
  yield: "fouled" | "usable" | "pure";
  witnessed: boolean;
}

const latestRenderingRecord = (
  run: RunState,
): RenderingRecord | null => {
  const record = [...run.flags]
    .reverse()
    .find((flag) => flag.startsWith("hollis-rendering:"));
  if (!record) return null;

  const [, yieldResult, witnessResult] = record.split(":");
  if (
    yieldResult !== "fouled" &&
    yieldResult !== "usable" &&
    yieldResult !== "pure"
  ) {
    return null;
  }

  return {
    yield: yieldResult,
    witnessed: witnessResult === "witnessed",
  };
};

export const renderingOutcomeBody = (run: RunState): string => {
  const record = latestRenderingRecord(run);
  if (!record) return "The opened body cools beside the road.";

  const work =
    record.yield === "fouled"
      ? "Rain enters the opened vessels before the salts will set. The residue darkens and will not keep."
      : record.yield === "pure"
        ? "Salt, tallow, and a thread of silver ichor separate under steady heat. Saint Orra left more in Hollis than blood."
        : "Gray salt forms along the basin. A measure of hard tallow settles beneath it.";
  const witness = record.witnessed
    ? "A carrier’s cart slows at the burial markers. The driver sees the opened body, the heated glass, and Hollis’s county hook. She turns south without speaking."
    : "No wheel or lantern passes while the work lies exposed. Rain begins to soften the marks around your knees.";

  return `${work} ${witness}`;
};

export const renderingOutcomeResult = (
  run: RunState,
): string => {
  const record = latestRenderingRecord(run);
  if (!record) return "No rendering recorded";

  const materials =
    record.yield === "fouled"
      ? "No usable reagents recovered"
      : record.yield === "pure"
        ? "Grave salt +2 · Mortuary tallow +1 · Ossuary ichor +1"
        : "Grave salt +1 · Mortuary tallow +1";
  return record.witnessed
    ? `${materials} · A carrier witnessed the work`
    : `${materials} · No witness seen`;
};

export const renderingOutcomeRewards = (run: RunState) => {
  const record = latestRenderingRecord(run);
  if (!record || record.yield === "fouled") return [];
  return [
    {
      kind: "item" as const,
      itemId: "grave-salt" as const,
      quantity: record.yield === "pure" ? 2 : 1,
    },
    {
      kind: "item" as const,
      itemId: "mortuary-tallow" as const,
    },
    ...(record.yield === "pure"
      ? [
          {
            kind: "item" as const,
            itemId: "ossuary-ichor" as const,
          },
        ]
      : []),
  ];
};

const latestRecoveryRecord = (
  run: RunState,
): RecoveryRecord | null => {
  const record = [...run.flags]
    .reverse()
    .find((flag) => flag.startsWith("convalescence:"));
  if (!record) return null;

  const [stabilized, improved, scarred, condition, healed] = record
    .split(":")
    .slice(1)
    .map((value) => Number.parseInt(value, 10));
  return {
    stabilized: stabilized ?? 0,
    improved: improved ?? 0,
    scarred: scarred ?? 0,
    condition: condition ?? 0,
    healed: healed ?? 0,
  };
};

const recoveryChanges = (record: RecoveryRecord): string[] => [
  record.stabilized
    ? `${record.stabilized} ${record.stabilized === 1 ? "injury" : "injuries"} stabilized`
    : "",
  record.improved
    ? `${record.improved} ${record.improved === 1 ? "injury" : "injuries"} eased`
    : "",
  record.healed
    ? `${record.healed} ${record.healed === 1 ? "closed injury heals" : "closed injuries heal"}`
    : "",
  record.scarred
    ? `${record.scarred} minor ${record.scarred === 1 ? "wound closes" : "wounds close"} into ${record.scarred === 1 ? "a scar" : "scars"}`
    : "",
].filter(Boolean);

export const tollhouseRecoveryParagraph = (
  run: RunState,
): string => {
  const record = latestRecoveryRecord(run);
  if (!record) {
    return "The careful hour gathers your Spirit and gives the body what rest it can take.";
  }

  const changes = recoveryChanges(record);
  if (changes.length === 0) {
    return "The careful hour finds no wound ready to change its shape. It gathers your Spirit and gives the battered body what rest it can take.";
  }

  return `At the tollhouse hearth, ${changes.join("; ")}. Between them, the injured parts recover ${record.condition} condition. Your Spirit settles cold and ready for the descent.`;
};

export const saintRecoveryResult = (run: RunState): string => {
  const record = latestRecoveryRecord(run);
  const healthFlag = [...run.flags]
    .reverse()
    .find(
      (flag) =>
        flag.startsWith("saint-recovery-health:") ||
        flag.startsWith("saint-recovery-vitality:"),
    );
  const health = healthFlag?.split(":").at(-1) ?? "0";
  const changes = record ? recoveryChanges(record) : [];
  const woundText =
    changes.length > 0
      ? changes.join(" · ")
      : "No wound was ready to change";
  return `${health} Health recovered · Spirit restored · ${woundText}${record ? ` · ${record.condition} body condition restored` : ""} · Each enemy in the wake will gather 2 Ward`;
};

export const poacherRecognitionParagraph = (
  run: RunState,
): string => {
  const recognition =
    run.player.equipment.head === "grave-iron-mask"
      ? "recognizes Saint Orra’s grave-iron mask over your face"
      : itemCount(run.player.inventory, "grave-iron-mask") > 0
        ? "recognizes Saint Orra’s grave-iron mask among what you carry"
        : "watches you come from Saint Orra’s open stair";
  return `Two reliquary poachers emerge with grave copper under their coats. Their leader ${recognition} and tells her companion not to leave a witness.`;
};
