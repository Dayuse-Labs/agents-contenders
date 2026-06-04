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
        return err(new MusicGenerationError(`Génération bloquée par Lyria : ${blockReason}`));
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
 * décrites par sexe + âge, les couplets tagués « Rapper A / Rapper B ».
 */
export function buildPrompt(request: TrackRequest): string {
  const { voices, verses, styleHint } = request;
  const style = styleHint ?? DEFAULT_STYLE;
  const header =
    `${style}. ONE continuous song: two rappers trading verses on the SAME beat. ` +
    `Rapper A is ${voiceDescriptor(voices.A)}; Rapper B is ${voiceDescriptor(voices.B)}. ` +
    'Keep one coherent instrumental throughout and alternate the two voices per verse.';
  const sections = verses.map(
    (verse) => `[Verse - Rapper ${verse.rapper}]\n${verse.bars.join('\n')}`,
  );
  return [header, ...sections].join('\n\n');
}
