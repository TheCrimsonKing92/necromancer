import { escapeHtml } from "./html";
import type { RenderContext } from "./render-context";

export const renderHome = (context: RenderContext): string => `
  <main class="home">
    <section class="home__hero">
      <div class="home__mark" aria-hidden="true">
        <span>N</span>
      </div>
      <p class="eyebrow">A testament from Maldirin</p>
      <h1 data-page-title tabindex="-1">Necromancer</h1>
      <p class="home__lede">
        Walk the rain-black roads as an untested necromancer. The dead are
        not quiet. The living are watching.
      </p>
      <div class="home__actions">
        ${
          context.hasSave
            ? `<button class="button button--primary" type="button" data-action="continue">
                Continue the current testament
              </button>
              <button class="button button--secondary" type="button" data-action="open-chronicle">
                Review the Chronicle
              </button>`
            : `<button class="button button--primary" type="button" data-action="start-new">
                Begin the first testament
              </button>`
        }
      </div>
      ${
        context.hasSave
          ? `<div class="save-note">
              <span>Autosave found${context.savedLabel ? ` · ${escapeHtml(context.savedLabel)}` : ""}</span>
              <button class="text-button" type="button" data-action="delete-save">Reset campaign</button>
            </div>`
          : `<p class="save-note">Your journey autosaves in this browser.</p>`
      }
      ${
        import.meta.env.DEV && context.developmentTools
          ? `<section class="prototype-launcher" aria-labelledby="prototype-launcher-title">
              <p class="eyebrow">Development proof</p>
              <h2 id="prototype-launcher-title">The Fire Road</h2>
              <p>Enter the noncanonical Moving Shade situation with a prepared test character. This run is not autosaved.</p>
              <div class="prototype-launcher__actions">
                <button type="button" data-action="start-fire-road-prototype" data-tradition="medium">Medium</button>
                <button type="button" data-action="start-fire-road-prototype" data-tradition="summoner">Bonebinder</button>
                <button type="button" data-action="start-fire-road-prototype" data-tradition="thaumaturgist">Renderer</button>
                <button type="button" data-action="start-fire-road-prototype" data-tradition="grave-warden">Grave Warden</button>
              </div>
              <section class="prototype-launcher__comparison" aria-labelledby="prototype-comparison-title">
                <p class="eyebrow">Other scene proofs</p>
                <h3 id="prototype-comparison-title">Competing isometric forms</h3>
                <p>Test the same scene grammar against fortification and environmental counter-magic.</p>
                <div class="prototype-launcher__actions">
                  <button type="button" data-action="start-action-prototype" data-prototype-id="fire-road-under-ash">Fire Road direct-play</button>
                  <button type="button" data-action="start-action-prototype" data-prototype-id="siege-breach-yard">Siege direct-play</button>
                  <button type="button" data-action="start-tactical-prototype" data-prototype-id="siege-sovereign">Siege Sovereign</button>
                  <button type="button" data-action="start-tactical-prototype" data-prototype-id="interdict">Interdict</button>
                </div>
              </section>
            </section>`
          : ""
      }
    </section>

    <aside class="home__aside" aria-label="Game principles">
      <p class="folio">I</p>
      <h2>Death never ends</h2>
      <ul class="principles">
        <li><span>01</span> Narrative choices leave mechanical scars.</li>
        <li><span>02</span> Combat is turn-based, legible, and unforgiving.</li>
        <li><span>03</span> Practice shapes your methods without fixing every choice.</li>
      </ul>
      <p class="home__aside-note">
        This opening testament is a playable systems slice. Survive the road. Settle what waits below. Outlive what follows.
      </p>
    </aside>
  </main>
`;
