import type { EngineResult } from "../game/types";
import { createPlayableCharacter } from "./character-creation-transition";
import { isCharacterSex, isTraditionId } from "./input-identifiers";

export interface CharacterFormAction {
  readonly handled: boolean;
  readonly result?: EngineResult;
  readonly error?: string;
}

export const resolveCharacterFormAction = async (
  event: SubmitEvent,
): Promise<CharacterFormAction> => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement) || form.id !== "character-form") {
    return { handled: false };
  }
  event.preventDefault();
  const data = new FormData(form);
  const name = data.get("characterName");
  const tradition = data.get("tradition");
  const sex = data.get("sex");
  if (typeof name !== "string") {
    return { handled: true, error: "Give the testament a name." };
  }
  if (typeof tradition !== "string" || !isTraditionId(tradition)) {
    return { handled: true, error: "Choose an available necromantic practice." };
  }
  if (typeof sex !== "string" || !isCharacterSex(sex)) {
    return { handled: true, error: "Choose how the testament should refer to you." };
  }
  return {
    handled: true,
    result: await createPlayableCharacter(name, tradition, sex),
  };
};
