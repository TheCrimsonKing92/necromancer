import { installDevelopmentProofEpilogueRenderer } from "./development-proof-render-runtime";

installDevelopmentProofEpilogueRenderer(() => `
  <section class="prototype-epilogue" aria-labelledby="prototype-epilogue-title">
    <p class="eyebrow">Development proof complete</p>
    <h2 id="prototype-epilogue-title">Try the road another way.</h2>
    <p>This outcome ends only the isolated proof. Begin it again with the same practice, or return to the four prepared practices.</p>
    <div class="prototype-epilogue__actions">
      <button class="button button--primary" type="button" data-action="restart-development-proof">Replay this practice</button>
      <button class="button button--secondary" type="button" data-action="go-home">Choose another practice</button>
    </div>
  </section>
`);

export const developmentProofSurfaceReady = true;
