import type { WorldFactId } from "../types";

export { WORLD_FACT_IDS, isWorldFactId } from "./fact-identifiers";

export interface WorldFactDefinition {
  title: string;
  description: string;
}

export const WORLD_FACTS: Record<WorldFactId, WorldFactDefinition> = {
  "hollis-vane-dead": {
    title: "Hollis Vane is dead",
    description:
      "The false reeve who kept the ossuary road died among its leaning burial markers.",
  },
  "hollis-vane-rendered": {
    title: "Hollis Vane was rendered",
    description:
      "Hollis’s remains were opened on the road for grave materials. The work left evidence whether or not anyone saw it done.",
  },
  "saint-orra-unbound": {
    title: "Saint Orra is unbound",
    description:
      "The thing beneath the hollow tollhouse lost the vows, names, and borrowed remains that held it together.",
  },
  "shared-mourning-fire": {
    title: "A mourning fire was shared",
    description:
      "A north-road household offered food and a place beside its dead. They saw the practitioner who accepted both.",
  },
  "aided-county-burial": {
    title: "A county burial was aided",
    description:
      "County burial workers remember practical help given while bodies were under their custody.",
  },
  "gave-use-name-to-burial-crews": {
    title: "A use-name was given at the burial cut",
    description:
      "The burial crew heard the name offered freely. Whether it travels farther depends on who chose to record or repeat it.",
  },
  "dealt-with-iven": {
    title: "Iven Saye rendered aid",
    description:
      "The roadside surgeon accepted ossuary ichor in exchange for clean, competent treatment.",
  },
  "roadside-bundle-examined": {
    title: "A disputed bundle was examined",
    description:
      "Eda Pell and Oren Vask watched the sealed blackcloth bundle examined beside their stranded carts.",
  },
  "bundle-trace-points-to-broker": {
    title: "The bundle came from the broker’s cart",
    description:
      "Blue packing thread and dry limestone beneath the outer cord place the bundle on Oren Vask’s cart before the burial cart entered the washout.",
  },
  "bundle-left-under-burial-custody": {
    title: "The bundle stayed under burial custody",
    description:
      "The sealed bundle remained on Eda Pell’s corpse cart to await a county decision.",
  },
  "bundle-released-to-broker": {
    title: "The bundle returned to the broker",
    description:
      "Oren Vask received the sealed bundle while Eda Pell recorded the transfer beside the road.",
  },
  "ditch-hand-body-recognized": {
    title: "Eda Pell recognized Ditch-Hand’s body",
    description:
      "A county burial seal and a mended collarbone let Eda place the servant’s remains among bodies once carried under her tally.",
  },
};
