import { buildSystemPrompt } from '@/lib/chat/context';
import { LIMITS, checkRateLimit, clientIp, parseTurns } from '@/lib/chat/guard';
import { localAnswer } from '@/lib/chat/local';
import { ProviderError, resolveProvider } from '@/lib/chat/providers';

/**
 * Streaming chat endpoint.
 *
 * The rest of the site is fully static; this is the one dynamic route. It
 * degrades in two stages rather than failing: with no provider key it answers
 * from the local manifest lookup, and if a configured provider errors it says
 * so plainly. Every page still builds and renders either way.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* Built once per instance — identical every request, which is also what makes
   it cacheable on providers that support prompt caching. */
const SYSTEM_PROMPT = buildSystemPrompt();

const encoder = new TextEncoder();
const sse = (event: string, data: unknown) =>
  encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

/** Emits a fixed string as deltas so the client renders it like any answer. */
async function* asDeltas(text: string) {
  for (const chunk of text.match(/[\s\S]{1,24}/g) ?? []) {
    yield chunk;
    await new Promise((r) => setTimeout(r, 12));
  }
}

export async function POST(request: Request) {
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
  if (!turns) return Response.json({ error: 'bad_request' }, { status: 400 });

  const provider = resolveProvider();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        if (!provider) {
          // No key configured: answer from the manifest rather than erroring.
          for await (const delta of asDeltas(localAnswer(turns))) {
            controller.enqueue(sse('delta', { text: delta }));
          }
          controller.enqueue(sse('mode', { provider: 'local' }));
        } else {
          for await (const delta of provider.stream({
            system: SYSTEM_PROMPT,
            turns,
            maxTokens: LIMITS.maxOutputTokens,
            signal: request.signal,
          })) {
            controller.enqueue(sse('delta', { text: delta }));
          }
        }
      } catch (error) {
        if ((error as Error)?.name === 'AbortError') {
          controller.close();
          return;
        }

        const status = error instanceof ProviderError ? error.status : undefined;
        const message =
          (error as Error)?.message === 'refusal'
            ? "I can't help with that one. Try another question."
            : status === 429
              ? 'The assistant has hit its rate limit. Try again shortly.'
              : 'Something went wrong reaching the assistant.';

        console.error('[chat]', provider?.id ?? 'local', error);
        controller.enqueue(sse('error', { message }));
      } finally {
        controller.enqueue(sse('done', {}));
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
