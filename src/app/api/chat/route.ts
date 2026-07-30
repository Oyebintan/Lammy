import Anthropic from '@anthropic-ai/sdk';
import { buildSystemPrompt } from '@/lib/chat/context';
import { LIMITS, checkRateLimit, clientIp, parseTurns } from '@/lib/chat/guard';

/**
 * Streaming chat endpoint.
 *
 * The rest of the site is fully static; this is the one dynamic route. It is
 * kept deliberately isolated — if the key is missing or the API is down, the
 * widget reports itself offline and every page still builds and renders.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* Built once per instance rather than per request: it is identical every time,
   which is also what makes it cacheable server-side. */
const SYSTEM_PROMPT = buildSystemPrompt();

const encoder = new TextEncoder();

function sse(event: string, data: unknown) {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // Graceful degradation, not a 500 — an unconfigured deploy is a valid state.
    return Response.json(
      { error: 'offline', message: 'Chat is not configured on this deployment.' },
      { status: 503 },
    );
  }

  const limit = checkRateLimit(clientIp(request.headers));
  if (!limit.ok) {
    return Response.json(
      { error: 'rate_limited', message: 'Too many messages. Give it a minute.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'bad_request' }, { status: 400 });
  }

  const turns = parseTurns((body as { messages?: unknown })?.messages);
  if (!turns) {
    return Response.json({ error: 'bad_request' }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const message = client.messages.stream({
          model: 'claude-opus-5',
          max_tokens: LIMITS.maxOutputTokens,
          /* The system prompt is large and byte-identical on every request, so
             caching it turns the dominant cost of this endpoint into a cache
             read at roughly a tenth of the input rate. */
          system: [
            {
              type: 'text',
              text: SYSTEM_PROMPT,
              cache_control: { type: 'ephemeral' },
            },
          ],
          /* Low effort suits a chat widget — short answers, fast first token.
             Thinking is left on: disabling it on this model can put a tool call
             into visible text or leak internal tags, and low effort already
             captures most of the token saving. */
          output_config: { effort: 'low' },
          messages: turns,
        });

        for await (const event of message) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            controller.enqueue(sse('delta', { text: event.delta.text }));
          }
        }

        const final = await message.finalMessage();

        // Safety classifiers can decline with a 200 — check before trusting content.
        if (final.stop_reason === 'refusal') {
          controller.enqueue(
            sse('error', { message: "I can't help with that one. Try another question." }),
          );
        } else if (final.stop_reason === 'max_tokens') {
          controller.enqueue(sse('truncated', {}));
        }

        controller.enqueue(sse('done', {}));
      } catch (error) {
        const status = error instanceof Anthropic.APIError ? error.status : undefined;
        const message =
          status === 429
            ? 'The assistant is busy right now. Try again shortly.'
            : 'Something went wrong reaching the assistant.';
        console.error('[chat]', error);
        controller.enqueue(sse('error', { message }));
        controller.enqueue(sse('done', {}));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store, no-transform',
      Connection: 'keep-alive',
    },
  });
}
