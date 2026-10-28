/** Compatibility facade for tests and older imports. */
export {
  DITCH_HAND_CLAIM_ID,
  DITCH_HAND_PROVENANCE_ID,
  DITCH_HAND_RECOGNITION_EVIDENCE_ID,
  DITCH_HAND_SERVANT_ID,
  beginDitchHandPractice as installDitchHandFixture,
  createDitchHandServant,
  recognizeDitchHand as recognizeDitchHandFixture,
} from "./ditch-hand";
