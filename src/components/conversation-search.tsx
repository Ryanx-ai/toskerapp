"use client";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X, ChevronUp } from "lucide-react";
import type { ConversationSearchPage } from "@/server/conversations/search";
import { MESSAGE_LOCATION_REQUEST } from "@/lib/message-location";
import { CHAT_REFRESH, CONVERSATION_ACCESS_LOST } from "@/lib/realtime-contract";
import { MESSAGES_REMOVED, removedMessageIds } from "@/lib/message-removal";
import { messagePlainPreview } from "@/lib/message-format";

// Ephemeral handoff across Board/Map -> Chat, never localStorage or URL query text.
let handoff: { conversationId: string; query: string } | null = null;
function Highlight({ text, query }: { text: string; query: string }) {
  text = messagePlainPreview(text);
  const start = text.toLocaleLowerCase().indexOf(query.toLocaleLowerCase());
  return start < 0 ? <>{text}</> : <>{text.slice(0, start)}<mark>{text.slice(start, start + query.length)}</mark>{text.slice(start + query.length)}</>;
}

export function ConversationSearch({ conversationId, name, href, scopeLabel, compact = false }: { conversationId?: string; name?: string; href?: string; scopeLabel: string; compact?: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState(() => handoff && handoff.conversationId === conversationId ? handoff.query : "");
  const [open, setOpen] = useState(false), [composing, setComposing] = useState(false);
  const [page, setPage] = useState<ConversationSearchPage | null>(null);
  const [pending, setPending] = useState(false), [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0), [active, setActive] = useState(-1);
  const input = useRef<HTMLInputElement>(null), root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const request = useRef<AbortController | null>(null), epoch = useRef(0);
  const listId = useId(), helpId = useId();
  const term = query.trim();
  const close = useCallback(() => { request.current?.abort(); epoch.current++; setPending(false); setOpen(false); setActive(-1); }, []);
  const dismiss = () => {
    close();
    requestAnimationFrame(() => {
      if (trigger.current?.checkVisibility()) trigger.current.focus();
    });
  };
  const cancelRequest = useCallback(() => { request.current?.abort(); epoch.current++; }, []);
  useEffect(() => { handoff = null; return cancelRequest; }, [cancelRequest]);
  const search = useCallback(async (before?: string) => {
    if (!conversationId || term.length < 2) return;
    request.current?.abort(); const controller = new AbortController(); request.current = controller;
    const version = ++epoch.current;
    setPending(true); setError(""); setActive(-1); setPage(null);
    try {
      const params = new URLSearchParams({ q: term }); if (before) params.set("before", before);
      const response = await fetch(`/api/conversations/${encodeURIComponent(conversationId)}/search?${params}`, { cache: "no-store", credentials: "same-origin", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]) });
      if (controller.signal.aborted || version !== epoch.current) return;
      if (response.status === 401 || response.status === 403) {
        setPage(null); setQuery(""); close();
        window.dispatchEvent(new CustomEvent(CONVERSATION_ACCESS_LOST, { detail: conversationId })); return;
      }
      if (!response.ok) throw new Error();
      const result = await response.json() as ConversationSearchPage;
      if (!controller.signal.aborted && version === epoch.current) setPage({ ...result, results: result.results.filter(row => !removedMessageIds(conversationId).has(row.id)) });
    } catch { if (!controller.signal.aborted && version === epoch.current) setError("Search couldn't be loaded. Try again."); }
    finally { if (!controller.signal.aborted && version === epoch.current) setPending(false); }
  }, [conversationId, term, close]);
  useEffect(() => {
    if (!open || composing || term.length < 2 || !conversationId) return;
    const timer = setTimeout(() => void search(), 350);
    return () => { clearTimeout(timer); cancelRequest(); };
  }, [open, composing, term, conversationId, attempt, search, cancelRequest]);
  useEffect(() => {
    if (!open) return;
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => { if (!document.hidden) { clearTimeout(timer); timer = setTimeout(() => setAttempt(value => value+1), 350); } };
    const remove = () => setPage(current => current && conversationId ? { ...current, results: current.results.filter(row => !removedMessageIds(conversationId).has(row.id)) } : current);
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) close(); };
    const escape = (event: KeyboardEvent) => {
      // A successful retry unmounts its button, leaving focus on body.
      if (event.key !== "Escape" || event.defaultPrevented || event.isComposing || composing || (document.activeElement !== document.body && !root.current?.contains(document.activeElement))) return;
      event.preventDefault(); close();
      requestAnimationFrame(() => { if (trigger.current?.checkVisibility()) trigger.current.focus(); });
    };
    const denied = (event: Event) => { if ((event as CustomEvent<string>).detail === conversationId) { setPage(null); setQuery(""); close(); } };
    window.addEventListener(CHAT_REFRESH, refresh); window.addEventListener(MESSAGES_REMOVED, remove);
    window.addEventListener(CONVERSATION_ACCESS_LOST, denied); document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    document.addEventListener("visibilitychange", refresh);
    const poll = setInterval(refresh, 15000);
    return () => { clearTimeout(timer); clearInterval(poll); window.removeEventListener(CHAT_REFRESH, refresh); window.removeEventListener(MESSAGES_REMOVED, remove); window.removeEventListener(CONVERSATION_ACCESS_LOST, denied); document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); document.removeEventListener("visibilitychange", refresh); };
  }, [open, conversationId, close, composing]);
  const select = (id: string) => {
    if (!conversationId || !href || removedMessageIds(conversationId).has(id)) return;
    dismiss();
    if (document.querySelector(`[data-chat-conversation="${conversationId}"]`)) {
      window.dispatchEvent(new CustomEvent(MESSAGE_LOCATION_REQUEST, { detail: { conversationId, messageId: id, query: term } }));
    } else { handoff = { conversationId, query }; router.push(`${href}?message=${id}`, { scroll: false }); }
  };
  return <div ref={root} className={`context-search ${compact ? "is-compact" : ""} ${open ? "is-open" : ""}`} onKeyDown={event => { if (event.key === "Escape" && !event.nativeEvent.isComposing && !composing) { event.preventDefault(); event.stopPropagation(); dismiss(); } }} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) close(); }}>
    <button ref={trigger} className="context-search-compact" aria-label={scopeLabel} aria-expanded={open} onClick={() => { setOpen(true); requestAnimationFrame(() => input.current?.focus()); }}><Search size={18} aria-hidden="true" /></button>
    <div className="context-search-field">
      <Search size={18} aria-hidden="true" />
      <input ref={input} type="search" role="combobox" aria-label={scopeLabel} aria-expanded={open} aria-controls={listId} aria-autocomplete="list" aria-activedescendant={active >= 0 && page?.results[active] ? `${listId}-${page.results[active].id}` : undefined} aria-describedby={open ? helpId : undefined}
        placeholder={scopeLabel} value={query} maxLength={120} onFocus={() => setOpen(true)} onClick={() => setOpen(true)}
        onCompositionStart={() => { setComposing(true); request.current?.abort(); epoch.current++; setPage(null); }} onCompositionEnd={() => setComposing(false)}
        onChange={event => { request.current?.abort(); epoch.current++; setQuery(event.target.value); setPage(null); setPending(false); setError(""); setActive(-1); setOpen(true); }}
        onKeyDown={event => {
          if (event.nativeEvent.isComposing || composing) return;
          if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); dismiss(); }
          if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); setOpen(true); const length=page?.results.length ?? 0; if (length) { const next=event.key === "ArrowDown" ? (active+1)%length : active<=0 ? length-1 : active-1; setActive(next); root.current?.querySelector(`#${CSS.escape(`${listId}-${page!.results[next].id}`)}`)?.scrollIntoView({ block:"nearest" }); } }
          if (event.key === "Enter" && open && page?.results.length) { event.preventDefault(); select(page.results[Math.max(0,active)].id); }
        }} />
      {query && <button aria-label="Clear message search" onClick={() => { request.current?.abort(); epoch.current++; setQuery(""); setPage(null); setError(""); setPending(false); if (compact) dismiss(); else input.current?.focus(); }}><X size={16} aria-hidden="true" /></button>}
      <button className="context-search-close" aria-label="Close message search" onClick={dismiss}><ChevronUp size={18} aria-hidden="true" /></button>
    </div>
    {open && <section className="context-search-dropdown" aria-label="Chat search results">
      <p id={helpId} className="context-search-scope">{conversationId ? `Chat messages in ${name}` : "Choose a chat, Room or Sandbox first. Sidebar search finds chats and Rooms by name."}</p>
      {conversationId && <>
        <p role={error ? "alert" : "status"}>{error || (composing ? "Finish typing to search." : term.length < 2 ? "Enter at least 2 characters." : pending || !page ? "Searching messages…" : !page.results.length ? "No messages found." : `${page.results.length} results${page.nextCursor ? " · more available" : ""}`)}</p>
        {error && <button className="quiet-action" onClick={() => setAttempt(value => value+1)}>Retry message search</button>}
        <div id={listId} role="listbox" aria-label="Matching messages" aria-busy={pending}>
          {page?.results.map((result,index) => <button key={result.id} id={`${listId}-${result.id}`} role="option" aria-selected={index===active} className="conversation-search-result" onClick={() => select(result.id)}>
            <span><strong>{result.author}</strong><time dateTime={result.createdAt}>{new Date(result.createdAt).toLocaleString()}</time></span><p><Highlight text={result.excerpt} query={term} /></p>
          </button>)}
        </div>
        {page?.nextCursor && <button className="quiet-action" disabled={pending} onClick={() => void search(page.nextCursor!)}>Older results</button>}
      </>}
    </section>}
  </div>;
}
