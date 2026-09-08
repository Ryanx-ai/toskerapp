import { validMentionSpans, type MentionSpan } from "./mentions";
export type DraftReply = { id: string; author: string; body: string };
export type PendingSend = { id: string; body: string; replyToId?: string; mentions?: MentionSpan[] };
export type ChatDraft = { body: string; reply: DraftReply | null; pending: PendingSend | null; updatedAt: number; mentions?: MentionSpan[] };
export const EMPTY_CHAT_DRAFT: ChatDraft = { body: "", reply: null, pending: null, updatedAt: 0 };
const PREFIX = "tosker.chat-draft.v1:";
const MAX_AGE = 24 * 60 * 60 * 1000;

export function chatDraftKey(actorId: string | undefined, conversationId: string) {
  return actorId ? `${PREFIX}${actorId}:${conversationId}` : `demo:${conversationId}`;
}

export function parseChatDraft(raw: string | null, now = Date.now()): ChatDraft {
  try {
    if (!raw || raw.length > 50_000) return EMPTY_CHAT_DRAFT;
    const draft = JSON.parse(raw) as ChatDraft;
    if (!draft || typeof draft.body !== "string" || draft.body.length > 8000 || !Number.isFinite(draft.updatedAt) || now - draft.updatedAt > MAX_AGE || draft.updatedAt > now + 60_000) return EMPTY_CHAT_DRAFT;
    if (draft.reply !== null && (!draft.reply || typeof draft.reply.id !== "string" || draft.reply.id.length > 64 || typeof draft.reply.author !== "string" || draft.reply.author.length > 200 || typeof draft.reply.body !== "string" || draft.reply.body.length > 8000)) return EMPTY_CHAT_DRAFT;
    if (draft.pending !== null && (!draft.pending || typeof draft.pending.id !== "string" || !/^[a-f0-9-]{36}$/i.test(draft.pending.id) || typeof draft.pending.body !== "string" || draft.pending.body.length > 8000 || (draft.pending.replyToId !== undefined && (typeof draft.pending.replyToId !== "string" || draft.pending.replyToId.length > 64)))) return EMPTY_CHAT_DRAFT;
    if (!validMentionSpans(draft.body, draft.mentions ?? []) || (draft.pending && !validMentionSpans(draft.pending.body, draft.pending.mentions ?? []))) return EMPTY_CHAT_DRAFT;
    return draft;
  } catch { return EMPTY_CHAT_DRAFT; }
}

/** A delayed response may clear only the send it acknowledges, never newer typing. */
export function acknowledgeDraft(draft: ChatDraft, id: string): ChatDraft {
  if (draft.pending?.id !== id) return draft;
  const same = draft.body.trim() === draft.pending.body && draft.reply?.id === draft.pending.replyToId;
  return { ...draft, ...(same ? { body: "", reply: null, ...(draft.mentions ? { mentions: [] } : {}) } : {}), pending: null };
}

export function createChatDraftStore(storage: () => Pick<Storage, "getItem" | "setItem" | "removeItem"> | undefined) {
  const cache = new Map<string, ChatDraft>();
  const listeners = new Set<() => void>();
  const get = (key: string): ChatDraft => {
    if (cache.has(key)) return cache.get(key)!;
    let draft = EMPTY_CHAT_DRAFT;
    try { if (key.startsWith(PREFIX)) draft = parseChatDraft(storage()?.getItem(key) ?? null); } catch { /* Storage disabled: memory still works. */ }
    cache.set(key, draft);
    return draft;
  };
  const update = (key: string, change: (current: ChatDraft) => ChatDraft) => {
    const current = get(key);
    const next = change(current);
    if (next === current) return;
    const saved = { ...next, updatedAt: Date.now() };
    cache.set(key, saved);
    try {
      if (key.startsWith(PREFIX)) {
        if (!saved.body && !saved.reply && !saved.pending) storage()?.removeItem(key);
        else storage()?.setItem(key, JSON.stringify(saved));
      }
    } catch { /* Quota/private mode must never prevent sending. */ }
    listeners.forEach((listener) => listener());
  };
  return { get, update, subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; }, server: () => EMPTY_CHAT_DRAFT };
}

// Tab-local only. Recovery state, never canonical messages or authorization.
export const chatDrafts = createChatDraftStore(() => typeof window === "undefined" ? undefined : window.sessionStorage);
