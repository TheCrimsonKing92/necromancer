import type { TacticalScenePrototype } from "../../tactical-scene";
import { actOnWinterSluice } from "./winter-sluice-actions";
import { projectWinterSluice } from "./winter-sluice-projection";
import {
  createWinterSluiceState,
  INTERDICT_WINTER_SLUICE_ID,
  type WinterSluiceState,
} from "./winter-sluice-state";

export const INTERDICT_WINTER_SLUICE_PROTOTYPE: TacticalScenePrototype<WinterSluiceState> = {
  id: INTERDICT_WINTER_SLUICE_ID,
  createState: createWinterSluiceState,
  project: projectWinterSluice,
  act: actOnWinterSluice,
};

export type { WinterSluiceState } from "./winter-sluice-state";
