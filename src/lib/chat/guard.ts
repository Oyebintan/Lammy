/**
 * Abuse and spend controls for the public chat endpoint.
 *
 * The endpoint is unauthenticated and every request costs money, so the limits
 * here are the difference between a chat widget and an open bill. They are
 * deliberately strict: a visitor asking about someone's portfolio needs a
 * handful of short turns, not an open-ended session.
 *
 * Honest limitation: the counter is per-instance memory. Serverless instances
 * do not share it, so the effective ceiling is (limit x warm instances) rather
 * than a hard global cap. That is enough to stop casual hammering and a stuck
 * retry loop, which is what this is for. A hard global limit needs shared
 * state — Vercel KV, Upstash, or Redis — keyed the same way.
 */

export const LIMITS = {
  /** Requests per IP per window. */
  requestsPerWindow: 12,
  windowMs: 60_000,
  /** Longest single visitor message. */
  maxMessageChars: 800,
  /** Turns of history accepted from the client, newest kept. */
  maxHistoryMessages: 12,
  /** Hard ceiling on generated tokens — answers here should be short. */
  maxOutputTokens: 700,
} as const;

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

/** Keeps the map from growing without bound on a long-lived instance. */
function sweep(now: number) {
  if (buckets.size < 5_000) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function checkRateLimit(ip: string): { ok: true } | { ok: false; retryAfter: number } {
  const now = Date.now();
  sweep(now);

  const bucket = buckets.get(ip);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(ip, { count: 1, resetAt: now + LIMITS.windowMs });
    return { ok: true };
  }

  if (bucket.count >= LIMITS.requestsPerWindow) {
    return { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return { ok: true };
}

/** Vercel sets x-forwarded-for; the first entry is the client. */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return headers.get('x-real-ip') ?? 'unknown';
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Validates and clamps client input. Everything crossing this boundary is
 * untrusted: a caller can post any JSON, so shape, roles, lengths and turn
 * count are all re-derived here rather than assumed.
 */
export function parseTurns(input: unknown): ChatTurn[] | null {
  if (!Array.isArray(input) || input.length === 0) return null;

  const turns: ChatTurn[] = [];
  for (const raw of input.slice(-LIMITS.maxHistoryMessages)) {
    if (typeof raw !== 'object' || raw === null) return null;
    const { role, content } = raw as Record<string, unknown>;
    if (role !== 'user' && role !== 'assistant') return null;
    if (typeof content !== 'string') return null;

    const trimmed = content.trim().slice(0, LIMITS.maxMessageChars);
    if (!trimmed) continue;
    turns.push({ role, content: trimmed });
  }

  if (!turns.length) return null;
  // The Messages API requires the conversation to open on a user turn.
  while (turns.length && turns[0].role !== 'user') turns.shift();
  if (!turns.length || turns[turns.length - 1].role !== 'user') return null;

  return turns;
}
