import type { ChatTurn } from './guard';

/**
 * Chat backends, in preference order, selected by whichever key is present.
 *
 * The site is not tied to one vendor: the endpoint asks for a provider, and
 * whichever key is configured answers. Gemini is first because its free tier
 * needs no card and comfortably covers a portfolio's traffic; Anthropic is
 * there if quality ever matters more than cost. With no key at all the caller
 * falls back to a local responder, so the widget is never simply broken.
 */
export interface StreamOptions {
  system: string;
  turns: ChatTurn[];
  maxTokens: number;
  signal?: AbortSignal;
}

export interface ChatProvider {
  id: string;
  model: string;
  /** Yields text deltas. Throws on transport or upstream errors. */
  stream(options: StreamOptions): AsyncIterable<string>;
}

class ProviderError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

/* -------------------------------------------------------------------------- */
/* Gemini — free tier, no card required                                        */
/* -------------------------------------------------------------------------- */

function geminiProvider(apiKey: string): ChatProvider {
  const model = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';

  return {
    id: 'gemini',
    model,
    async *stream({ system, turns, maxTokens, signal }) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          signal,
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            // Gemini calls the assistant role "model".
            contents: turns.map((t) => ({
              role: t.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: t.content }],
            })),
            generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 },
          }),
        },
      );

      if (!response.ok || !response.body) {
        throw new ProviderError(
          `Gemini responded ${response.status}`,
          response.status,
        );
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const frames = buffer.split('\n\n');
        buffer = frames.pop() ?? '';

        for (const frame of frames) {
          const line = frame.split('\n').find((l) => l.startsWith('data: '));
          if (!line) continue;

          const payload = line.slice(6).trim();
          if (!payload || payload === '[DONE]') continue;

          try {
            const json = JSON.parse(payload);
            const parts = json?.candidates?.[0]?.content?.parts;
            if (!Array.isArray(parts)) continue;
            for (const part of parts) {
              if (typeof part?.text === 'string' && part.text) yield part.text;
            }
          } catch {
            // A partial frame at a chunk boundary — the next read completes it.
          }
        }
      }
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Anthropic — used only if its key is configured                              */
/* -------------------------------------------------------------------------- */

function anthropicProvider(apiKey: string): ChatProvider {
  const model = process.env.ANTHROPIC_MODEL ?? 'claude-opus-5';

  return {
    id: 'anthropic',
    model,
    async *stream({ system, turns, maxTokens, signal }) {
      const { default: Anthropic } = await import('@anthropic-ai/sdk');
      const client = new Anthropic({ apiKey });

      const message = client.messages.stream(
        {
          model,
          max_tokens: maxTokens,
          // Large and byte-identical per request, so caching it makes the
          // dominant input cost a cache read.
          system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
          output_config: { effort: 'low' },
          messages: turns,
        },
        { signal },
      );

      for await (const event of message) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          yield event.delta.text;
        }
      }

      const final = await message.finalMessage();
      if (final.stop_reason === 'refusal') {
        throw new ProviderError('refusal');
      }
    },
  };
}

/* -------------------------------------------------------------------------- */

/** Returns the configured provider, or null when no key is present. */
export function resolveProvider(): ChatProvider | null {
  const gemini = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
  if (gemini) return geminiProvider(gemini);

  const anthropic = process.env.ANTHROPIC_API_KEY;
  if (anthropic) return anthropicProvider(anthropic);

  return null;
}

export { ProviderError };
