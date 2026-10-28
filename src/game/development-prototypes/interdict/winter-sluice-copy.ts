export interface WinterSluiceIntroduction {
  readonly eyebrow: string;
  readonly paragraphs: readonly string[];
  readonly voices: readonly {
    readonly speaker: string;
    readonly quote: string;
  }[];
}

export const WINTER_SLUICE_INTRODUCTION: WinterSluiceIntroduction = {
  eyebrow: "THE LOWER BANK ASKS",
  paragraphs: [
    "The lower-bank reeve finds you before dawn. At the mill, black water shoulders beneath the ice. Rill-of-Reeds, the old wight of this reach, is chained inside the wheel. Her long back breaks the millrace once each turn before the iron drags her under. While she turns, the winter water passes the lower bank. Forty households stand below the old sluice.",
    "Sivra An has kept watch beside the wheel for six days. Twenty armed companions camp beyond the mill yard, but she stands alone at the race, her coat open to the cold. White bars are buckled over her ribs. When she speaks, the mill's nails and the iron in the wheel repeat her final words. The power carried in that frame calls Rill's bondage theft. Every link laid after silence will break at noon.",
    "At noon Sivra will open the irons. The water will take its old road, and no one living can swear the cracked sluice will bear it. The miller insists the wall will hold while his timber and carts remain locked in the yard. The last mason to inspect the buried works lies on the burial rise. His field book is kept beside his grave; the reeve has not given up on what the man himself might add.",
  ],
  voices: [
    {
      speaker: "The lower-bank reeve",
      quote: "The dead mason knew the covered works. Find me his measure and prove where the thaw will strike. Then I can call the flood right, take the miller's timber, and enter what the town owes him.",
    },
    {
      speaker: "Sivra An",
      quote: "Prove whom the old water will reach, and show me hands ready to meet it. Let the miller show where Rill gave herself to the wheel. I will wait for proof. I will not wait so he can keep her in iron.",
    },
  ],
};
