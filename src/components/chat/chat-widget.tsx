'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUp, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Turn {
  role: 'user' | 'assistant';
  content: string;
}

const STARTERS = [
  'What has Lammy actually shipped?',
  'Explain the SIWES Finder architecture',
  'How does this site build itself?',
];

const MAX_CHARS = 800;

/**
 * Minimal inline renderer. Model providers emit markdown, and showing a visitor
 * literal `**asterisks**` looks broken — but a full markdown parser is a lot of
 * bundle for two constructs, so this handles bold and bare URLs only.
 */
function renderInline(text: string) {
  const pattern = /(\*\*[^*]+\*\*|https?:\/\/[^\s)]+)/g;
  return text.split(pattern).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-fg">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (/^https?:\/\//.test(part)) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noreferrer noopener"
          className="text-emerald-400 underline decoration-emerald-400/30 underline-offset-2 hover:decoration-emerald-400"
        >
          {part.replace(/^https?:\/\//, '')}
        </a>
      );
    }
    return part;
  });
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [turns, streaming]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim().slice(0, MAX_CHARS);
      if (!trimmed || streaming) return;

      setNotice(null);
      setDraft('');

      const history: Turn[] = [...turns, { role: 'user', content: trimmed }];
      setTurns([...history, { role: 'assistant', content: '' }]);
      setStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: history }),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.message ?? 'The assistant is unavailable.');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        // Parse the SSE frames the route emits: `event: <name>\ndata: <json>\n\n`
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const frames = buffer.split('\n\n');
          buffer = frames.pop() ?? '';

          for (const frame of frames) {
            const nameLine = frame.split('\n').find((l) => l.startsWith('event: '));
            const dataLine = frame.split('\n').find((l) => l.startsWith('data: '));
            if (!nameLine || !dataLine) continue;

            const name = nameLine.slice(7);
            const payload = JSON.parse(dataLine.slice(6));

            if (name === 'delta') {
              setTurns((prev) => {
                const next = [...prev];
                const last = next[next.length - 1];
                if (last?.role === 'assistant') {
                  next[next.length - 1] = { ...last, content: last.content + payload.text };
                }
                return next;
              });
            } else if (name === 'error') {
              setNotice(payload.message);
            } else if (name === 'truncated') {
              setNotice('Answer cut short — ask for the specific part you want.');
            }
          }
        }
      } catch (error) {
        if ((error as Error).name === 'AbortError') return;
        setNotice((error as Error).message);
        // Drop the empty assistant turn so the log doesn't show a blank reply.
        setTurns((prev) =>
          prev[prev.length - 1]?.role === 'assistant' && !prev[prev.length - 1].content
            ? prev.slice(0, -1)
            : prev,
        );
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [streaming, turns],
  );

  return (
    <>
      {/* Launcher */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="chat-panel"
        aria-label={open ? 'Close assistant' : 'Ask about this work'}
        className={cn(
          'glass-strong group fixed bottom-5 right-5 z-50 flex h-12 items-center gap-2.5 rounded-full pl-4 pr-5',
          'transition-all duration-300 hover:-translate-y-0.5 hover:border-border-strong',
          open && 'pointer-events-none opacity-0',
        )}
      >
        <span className="font-mono text-sm text-emerald-400">›</span>
        <span className="text-sm font-medium text-fg">Ask anything</span>
      </button>

      {/* Panel */}
      <div
        id="chat-panel"
        role="dialog"
        aria-label="Assistant"
        aria-modal="false"
        /* Without this the panel is invisible but its buttons and textarea stay
           in the tab order, so a keyboard user tabs into a dialog they cannot
           see. `opacity-0` alone does not remove focusability. */
        inert={!open}
        className={cn(
          'glass-strong fixed inset-x-3 bottom-3 z-50 flex flex-col overflow-hidden rounded-2xl',
          'sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-[26rem]',
          'origin-bottom-right transition-all duration-300 [transition-timing-function:var(--ease-out)]',
          open
            ? 'pointer-events-auto translate-y-0 scale-100 opacity-100'
            : 'pointer-events-none translate-y-3 scale-95 opacity-0',
        )}
        /* Heavier than the shared glass token on purpose: this panel floats over
           project screenshots, and at the default opacity their content reads
           through the conversation text. */
        style={{
          height: 'min(32rem, calc(100dvh - 1.5rem))',
          background: 'oklch(0.07 0.004 265 / 0.93)',
        }}
      >
        {/* Title bar */}
        <header className="flex shrink-0 items-center justify-between border-b border-border-hair px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="relative flex size-1.5" aria-hidden>
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
            </span>
            <span className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-fg-muted">
              lammy&nbsp;·&nbsp;assistant
            </span>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close assistant"
            className="grid size-7 place-items-center rounded-full text-fg-subtle transition-colors hover:bg-bg-2 hover:text-fg"
          >
            <X className="size-4" />
          </button>
        </header>

        {/* Log */}
        <div
          ref={logRef}
          className="flex-1 overflow-y-auto px-4 py-4"
          aria-live="polite"
          aria-atomic="false"
        >
          {turns.length === 0 ? (
            <div className="flex flex-col gap-4">
              <p className="text-sm leading-relaxed text-fg-muted">
                Ask about the projects on this site, how any of them were built, or anything
                technical you&rsquo;re chewing on.
              </p>
              <div className="flex flex-col gap-1.5">
                {STARTERS.map((starter) => (
                  <button
                    key={starter}
                    type="button"
                    onClick={() => send(starter)}
                    className="group flex items-start gap-2 rounded-lg border border-border-hair bg-bg-2/50 px-3 py-2 text-left text-[0.8125rem] text-fg-subtle transition-colors hover:border-border-strong hover:text-fg"
                  >
                    <span className="mt-px font-mono text-emerald-400/70">›</span>
                    {starter}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {turns.map((turn, i) => (
                <div key={i} className="flex gap-2.5">
                  <span
                    className={cn(
                      'mt-0.5 shrink-0 font-mono text-xs',
                      turn.role === 'user' ? 'text-emerald-400' : 'text-fg-faint',
                    )}
                    aria-hidden
                  >
                    {turn.role === 'user' ? '›' : '⏵'}
                  </span>
                  <p
                    className={cn(
                      'min-w-0 whitespace-pre-wrap text-[0.8125rem] leading-relaxed',
                      turn.role === 'user' ? 'text-fg' : 'text-fg-muted',
                    )}
                  >
                    {renderInline(turn.content)}
                    {streaming && i === turns.length - 1 && turn.role === 'assistant' ? (
                      <span className="ml-0.5 inline-block h-3.5 w-1.5 translate-y-0.5 animate-pulse bg-emerald-400" />
                    ) : null}
                  </p>
                </div>
              ))}
            </div>
          )}

          {notice ? (
            <p className="mt-4 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-200/90">
              {notice}
            </p>
          ) : null}
        </div>

        {/* Composer */}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            send(draft);
          }}
          className="flex shrink-0 items-end gap-2 border-t border-border-hair px-3 py-3"
        >
          <span className="pb-2.5 pl-1 font-mono text-sm text-emerald-400" aria-hidden>
            ›
          </span>
          <textarea
            ref={inputRef}
            rows={1}
            value={draft}
            maxLength={MAX_CHARS}
            onChange={(event) => {
              setDraft(event.target.value);
              const el = event.target;
              el.style.height = 'auto';
              el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                send(draft);
              }
            }}
            placeholder="Ask a question…"
            aria-label="Message"
            className="max-h-[120px] flex-1 resize-none bg-transparent py-2 font-mono text-[0.8125rem] text-fg placeholder:text-fg-faint focus:outline-none"
          />
          <button
            type="submit"
            disabled={!draft.trim() || streaming}
            aria-label="Send message"
            className="mb-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-fg text-bg-0 transition-all hover:opacity-90 disabled:opacity-25"
          >
            <ArrowUp className="size-4" />
          </button>
        </form>
      </div>
    </>
  );
}
