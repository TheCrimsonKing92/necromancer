# Cheap voice lines for development prototypes

Status: recommendation for prototype use, researched 2026-08-14. This is a production assessment, not legal advice; re-check vendor terms before a commercial release.

## Headline recommendation

For the present, still-changing proofs, begin with **local Kokoro-82M auditions**. The question is whether voice helps character attachment and scene timing at all; polished synthetic casting would create premature investment in dialogue that is still being rewritten. The development-only manifest and generator live under `tools/voice-auditions/`.

Kokoro's code and weights are Apache-2.0 and its 82M-parameter model is small enough for a developer-side batch tool, though the complete model repository is about 363 MB and its own model card warns that very short utterances can be weak. It must never enter the browser's runtime payload. Unreviewed audition output also remains outside `public/` and the production build.

The durable hybrid is:

1. Local Kokoro for disposable reads while dialogue is moving quickly.
2. If the experiment works, a fixed paid synthetic voice for each named character once a scene is stable enough to justify it.
3. Human actors for principal mortal roles after scripts stabilize; retain synthetic treatment for genuinely non-human speakers only if it remains an artistic choice rather than a budget accident.

## Options compared

| Route | Prototype cost and speed | Character/atmosphere quality | Can package output? | Commercial and data cautions | Verdict |
| --- | --- | --- | --- | --- | --- |
| **ElevenLabs paid** | Starter is currently $6/month, 30k credits (about 30 minutes at the plan's published estimate). Regeneration consumes credits. | Strongest inexpensive option for expressive, directed dark-fantasy reads; Voice Design gives stable synthetic identities without copying an actor. | Yes. The API returns files, and content generated during a paid subscription keeps its commercial license indefinitely. | Free output is non-commercial and requires attribution. Beta output cannot be used commercially. Do not clone a performer: Professional Voice Clone only permits a person to verify their own voice; any human voice data needs explicit informed consent. | **Best immediate prototype choice.** |
| **OpenAI Audio API** | Pay-as-you-go; `gpt-4o-mini-tts` is currently $0.60/M text tokens and $12/M output-audio tokens, so short proof dialogue is inexpensive. No API free tier. | Good instruction-following for pace, affect, accent, and register; fewer persistent voice-design controls than ElevenLabs, but fixed built-in voice + fixed direction is workable. | Yes. API docs demonstrate writing the result to a file; business terms assign output to the customer. | The game must clearly disclose that the voice is AI-generated. API inputs/outputs are not used for training by default and `/v1/audio/speech` has no application-state retention, though normal abuse logs may last up to 30 days. **Do not capture ChatGPT Voice**: its separate terms limit it to non-commercial use and forbid repackaging it as an audio file. | **Strong pay-as-you-go runner-up**, particularly if already using the API. |
| **Amazon Polly** | Standard $4/M characters, Neural $16/M, Generative $30/M; free credits depend on account age/status. | Consistent and easy to drive with SSML, but ordinary voices tend to sound more like narration than performed character dialogue. | Explicitly yes: AWS permits caching and replay at no added cost. | AWS states Polly does not store or use inputs/outputs to train Polly. Still review the service terms and disclose synthetic use appropriately. | **Best legally explicit commodity fallback**, not first choice for dramatic principals. |
| **Azure Speech prebuilt voices** | Character-priced, with a free account for evaluation and paid resources for commercial packaging; current pricing varies by voice family/region. | Large voice library and SSML controls; quality ranges from serviceable to strong. | Microsoft staff guidance says paid-resource output may be distributed commercially and saved offline. | Use a paid speech resource for commercial files and follow Microsoft's synthetic-voice disclosure guidance. Custom/personal voices introduce consent, biometric-data, storage, and limited-access requirements; avoid them for this proof. | Viable, but more account/pricing complexity than the leading choices. |
| **Kokoro-82M local** | No per-line fee; local batch setup and ~363 MB of development-side model files. | Surprisingly good fixed voices; limited acting control, and short bark-sized lines can be less reliable. | Yes under Apache-2.0, subject to preserving required notices. Ship rendered audio, not the model. | No vendor receives script or voice data. Keep the exact model/version, voice, and attribution in the asset manifest. | **Best scratch/offline generator.** |
| **Piper local** | Fast on CPU and individual voice models can be relatively compact. | Dependable but generally flatter and less suited to major dramatic characters. | Potentially. The current engine is GPL-3.0 and every voice has its own `MODEL_CARD` license. Using Piper only as an internal render tool is simpler than shipping it. | The project explicitly warns that some voice models have restrictive licenses. A repository-level license label is not enough; approve each selected voice separately. | Good accessibility/scratch fallback after license review. |
| **Browser/system `speechSynthesis`** | Nearly zero implementation cost and no game download. | Device-, OS-, browser-, and installed-voice dependent; no named-character continuity across players. | **Do not record or package it by assumption.** The browser API grants access to voices installed/available on the device, not redistribution rights to their rendered audio. | Useful for user-invoked read-aloud accessibility. It is unsuitable as authored VO and may disappear/change across devices. | Accessibility fallback only. |
| **Self-recorded scratch VO** | Essentially free beyond a microphone and cleanup time. | A committed reading often beats neutral TTS for attachment, even with modest recording quality. Consistency depends on the performer and room. | Yes, when recorded by the developer or under a written agreement. | Keep source takes and releases. Do not later train a clone from a collaborator's recording without separate, explicit consent and compensation. | Excellent for testing whether VO actually helps before buying anything. |
| **Commissioned human VO** | Current indie guidance spans roughly $50–100/hour at the lowest prototype tier, $125–150/hour mid-tier, and $200–250/hour suggested professional indie rates, usually with session minimums. | Best emotional specificity and character attachment; most expensive to revise while scripts churn. | Yes, under a project-specific written game-use agreement. | A normal game-performance buyout does **not** include AI training or synthetic-replica rights. Use a written agreement and the NAVA AI Rider (or equivalent); state scope, retakes, credit, term, sequels, and no-AI use. | Reserve for stable principal characters or a tightly scoped vertical slice. |

### Explicit no-go list

- **ChatGPT Voice output**: non-commercial only and may not be distributed or repackaged as an audio file. This restriction is distinct from the OpenAI Audio API.
- **ElevenLabs free-plan output**: non-commercial; attribution does not turn it into commercially shippable game audio. Beta-service output is also non-commercial.
- **Coqui XTTS-v2**: the Coqui Public Model License permits only non-commercial use of the model **and its outputs**.
- **F5-TTS's main pretrained English/Chinese checkpoints**: CC BY-NC 4.0; the permissive code license does not cure non-commercial model weights.
- **Unreviewed Piper voices**: licenses vary per voice. Never infer commercial rights from the engine or aggregate repository license.
- **Any cloned or lookalike human voice without specific consent**: do not treat audition files, prior game sessions, a general asset buyout, or a public figure's recordings as cloning permission.

## Minimal implementation for the proofs

Do not synthesize at runtime. Treat voice as authored, optional media projected from the same dialogue IDs as the visible text.

1. Add a development-only line manifest, one entry per voiced line:

   ```text
   lineId, exactTextHash, characterId, provider, modelSnapshot,
   voiceId, directionRevision, outputPath, generatedAt,
   commercialBasis, syntheticDisclosure, humanConsentRecord?
   ```

2. Give each character one immutable prototype voice profile. A changed line hash marks only that file stale; a changed voice profile deliberately invalidates all of that character's takes.
3. Generate and review offline. Normalize loudness, trim leading/trailing silence, and export mono Opus around 32–48 kbps. At 48 kbps, one minute is about 360 KB; ten minutes is about 3.6 MB.
4. Keep audio inside the lazy proof content pack. Load only when the proof is entered; use `preload="metadata"` or no preload, never bootstrap preload.
5. Start playback only from the player's action/selection gesture. Do not make scene progress wait for audio, and stop the old line when a new authoritative result arrives.
6. Visible dialogue remains canonical and complete. Add independent Voice/Music/SFX controls, captions that cannot be lost when audio is muted, reduced/disabled voice autoplay, and a one-time/credits disclosure such as “Prototype character voices are synthetically generated.”
7. Log provider/model/voice provenance beside the asset, not merely in a developer's account history. Retain original WAV/FLAC masters outside runtime assets and publish compressed derivatives.

The first harness declares **nine lines total**: three current, source-traced lines each for Sera, Halwen, and the supernatural speaker. Each has three disposable voice candidates. See `tools/voice-auditions/README.md` for validation, setup, generation, and provenance details.

## Initial voice directions

These are performance briefs, not requests to imitate a real performer.

### Sera Vale

**Direction:** A road reeve speaking through smoke and exhaustion without surrendering command. Low-to-mid register; soot-roughened but not a theatrical rasp. Clipped consonants, economical pace, and short breaths taken between decisions. She does not plead and does not sound sarcastic. Concern for the households appears as increased precision, not sentimentality. Let only the last clause soften.

**Audition line:** “Eighteen households are still inside. Twelve grain wagons wait behind them. The thing above the eastern milestone is not a problem my officers can move.”

### Marshal Halwen Sar

**Direction:** A campaign marshal whose courtesy is a form of pressure. Low, steady, educated voice; measured enough that the listener must wait for every condition. No shouted military stereotype and no villainous relish. She believes the offered bargain is practical, remembers who witnesses it, and lets the threat live in exact wording rather than volume.

**Audition line:** “My Sovereign will take the weight. Your masons will make the cut. When the last household clears, our column crosses this road.”

### The air-speaker of the foreign God

**Direction:** Not a demon growl and not an ethereal whisper. Begin with a clean, sex-ambiguous, nearly breathless speaking voice: patient, formal, and inhumanly certain. Add a restrained second layer 20–35 ms late with a tiny pitch offset and bronze-like short resonance, so the voice seems to arrive between separate vanes. Hold clause endings slightly too long. It speaks as the God in the first person and regards possession as a physical fact, not a threat.

**Audition line:** “Enter the households under my ordinance. I keep what is entered. I do not spend shelter upon the uncounted.”

## Sources checked

- [ElevenLabs pricing](https://elevenlabs.io/pricing), [billing and commercial rights](https://elevenlabs.io/docs/overview/administration/billing), [publishing/license guidance](https://help.elevenlabs.io/hc/en-us/articles/13313564601361-Can-I-publish-the-content-I-generate-on-the-platform), [post-cancellation rights](https://help.elevenlabs.io/hc/en-us/articles/15993008593297-What-happens-to-my-content-after-my-subscription-ends), and [Professional Voice Clone ownership rule](https://help.elevenlabs.io/hc/en-us/articles/36842751624209-Can-I-create-a-Professional-Voice-Clone-of-someone-else-s-voice)
- [OpenAI text-to-speech guide and disclosure requirement](https://developers.openai.com/api/docs/guides/text-to-speech), [`gpt-4o-mini-tts` pricing](https://developers.openai.com/api/docs/models/gpt-4o-mini-tts), [API data controls](https://platform.openai.com/docs/models/default-usage-policies-by-endpoint), [business output ownership](https://openai.com/policies/services-agreement/), and [service terms distinguishing ChatGPT Voice](https://openai.com/policies/service-terms/)
- [Amazon Polly pricing and cache/replay rights](https://aws.amazon.com/polly/pricing/) and [Polly privacy/training statement](https://docs.aws.amazon.com/ai/responsible-ai/amazon-polly/overview.html)
- [Azure Speech overview](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/text-to-speech), [audio output formats](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/rest-text-to-speech), [data handling](https://learn.microsoft.com/en-us/azure/ai-foundry/responsible-ai/speech-service/text-to-speech/data-privacy-security), and [commercial offline-use guidance](https://learn.microsoft.com/en-us/answers/questions/2124037/can-i-use-azure-text-to-speech-to-generate-mp3-for)
- [Kokoro-82M model card and Apache license](https://huggingface.co/hexgrad/Kokoro-82M), [Piper engine](https://github.com/OHF-Voice/piper1-gpl), and [Piper per-voice licensing warning](https://github.com/OHF-Voice/piper1-gpl/blob/main/docs/VOICES.md)
- [Coqui XTTS-v2 license](https://huggingface.co/coqui/XTTS-v2/blob/main/LICENSE.txt) and [F5-TTS checkpoint license table](https://github.com/SWivid/F5-TTS/blob/main/src/f5_tts/infer/SHARED.md)
- [MDN `speechSynthesis.getVoices()` device-voice behavior](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis/getVoices)
- [Voice Acting Club Indie Rate Guide](https://voiceactingclub.com/rates/), [voiceover contracts](https://voiceactingclub.com/contracts/), and [NAVA Synthetic Voice/AI Rider](https://navavoices.org/ai-rider/)
