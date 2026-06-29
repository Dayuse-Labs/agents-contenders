import { GoogleGenAI } from '@google/genai';
import { type Result, ok, err } from '@/shared/result';
import {
  type MusicGenerator,
  type TrackRequest,
  type GeneratedTrack,
  type VoiceSpec,
  MusicGenerationError,
} from '@/application/ports/music-generator';

/**
 * Implémentation Lyria 3 (Gemini API) du port MusicGenerator.
 * Un appel = la battle entière : un morceau continu où les deux voix alternent
 * par couplet. La réponse contient aussi les paroles horodatées (parts texte),
 * qu'on renvoie pour la synchro du player.
 * Doc : https://ai.google.dev/gemini-api/docs/music-generation
 */
const LYRIA_MODEL = 'lyria-3-pro-preview';

/** Pause avant l'unique relance (couvre un faux positif/erreur transitoire du filtre). */
const RETRY_DELAY_MS = 1500;

const DEFAULT_STYLE =
  'French rap battle, boom-bap, ~90 BPM, hard kick, vinyl scratches, ' +
  'deep bass, crowd hype, aggressive articulate flow, punchlines, dark tense battle-stage energy';

export class LyriaMusicGenerator implements MusicGenerator {
  private readonly ai: GoogleGenAI;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  async generateTrack(
    request: TrackRequest,
  ): Promise<Result<GeneratedTrack, MusicGenerationError>> {
    const prompt = buildPrompt(request);
    const first = await this.attempt(prompt);
    if (first.success) return first;

    // Une seule relance : couvre un faux positif/erreur transitoire du filtre.
    // Un blocage déterministe (nom réel chanté, etc.) échouera de nouveau — c'est
    // le caviardage en amont (redactNames) qui le règle, pas la relance.
    console.warn(`[lyria] échec (${first.error.message}) — nouvelle tentative…`);
    await new Promise<void>((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    return this.attempt(prompt);
  }

  /** Une tentative de génération sur le stream Lyria. */
  private async attempt(prompt: string): Promise<Result<GeneratedTrack, MusicGenerationError>> {
    try {
      const stream = await this.ai.models.generateContentStream({
        model: LYRIA_MODEL,
        contents: prompt,
      });

      const audioChunks: string[] = [];
      const textChunks: string[] = [];
      let mimeType = 'audio/wav';
      let blockReason: string | null = null;

      for await (const chunk of stream) {
        // Prompt refusé (ex. PROHIBITED_CONTENT) : aucun candidat, raison dans promptFeedback.
        if (chunk.promptFeedback?.blockReason) {
          blockReason = chunk.promptFeedback.blockReason;
        }
        const candidate = chunk.candidates?.[0];
        if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
          blockReason = candidate.finishReason;
        }
        const parts = candidate?.content?.parts;
        if (!parts) continue;
        for (const part of parts) {
          if (part.text) textChunks.push(part.text);
          const inline = part.inlineData;
          if (inline?.data) {
            if (inline.mimeType) mimeType = inline.mimeType;
            audioChunks.push(inline.data);
          }
        }
      }

      if (blockReason) {
        // Diagnostic : la raison exacte (PROHIBITED_CONTENT / SAFETY / RECITATION…)
        // et le prompt envoyé, pour identifier précisément ce qui déclenche le filtre.
        console.warn(`[lyria] bloqué : ${blockReason}\n--- prompt ---\n${prompt}\n--------------`);
        return err(
          new MusicGenerationError(
            `Génération bloquée par Lyria : ${blockReason}`,
            undefined,
            blockReason,
          ),
        );
      }
      const base64 = audioChunks.join('');
      if (base64.length === 0) {
        return err(new MusicGenerationError('Aucun audio renvoyé par Lyria.'));
      }
      const bytes = new Uint8Array(Buffer.from(base64, 'base64'));
      return ok({ bytes, mimeType, timedLyricsText: textChunks.join('\n') });
    } catch (cause) {
      return err(new MusicGenerationError('Échec de la génération Lyria.', cause));
    }
  }
}

function voiceDescriptor(voice: VoiceSpec): string {
  const sex = voice.sex === 'féminin' ? 'female' : 'male';
  return `a ${sex} voice sounding about ${voice.age} years old`;
}

/**
 * Construit le prompt de la battle entière. Surtout pas de nom de personnalité
 * (protection anti-imitation de Lyria → PROHIBITED_CONTENT) : les voix sont
 * décrites par sexe + âge.
 *
 * Chaque couplet est tagué avec SA voix exacte (« [Verse - a female voice…] »),
 * et non un label « Rapper A/B » : Lyria ne reconnaît que les tags de structure
 * (`[Verse]`, `[Chorus]`…) et ignore le suffixe « Rapper A », si bien qu'il se
 * contentait d'alterner les deux voix dans l'ordre — d'où des voix inversées
 * quand B ouvrait la battle. Le descripteur est dans les crochets (métadonnée,
 * jamais chantée) pour lier la voix au couplet quel que soit l'ordre.
 */
export function buildPrompt(request: TrackRequest): string {
  const { voices, verses, styleHint } = request;
  const style = styleHint ?? DEFAULT_STYLE;
  const header =
    `${style}. ONE continuous song on a single beat: two clearly distinct rappers — ` +
    `${voiceDescriptor(voices.A)} and ${voiceDescriptor(voices.B)} — trading verses. ` +
    'Each verse below is tagged with the exact voice that must sing it: honour every tag ' +
    'and keep each voice consistent from start to finish.';
  const sections = verses.map(
    (verse) =>
      `[Verse - ${voiceDescriptor(verse.rapper === 'A' ? voices.A : voices.B)}]\n${verse.bars.join('\n')}`,
  );
  return [header, ...sections].join('\n\n');
}
