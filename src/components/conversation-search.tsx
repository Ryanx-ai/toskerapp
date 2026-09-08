"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { ModalLayer } from "./modal-layer";
import type { ConversationSearchPage } from "@/server/conversations/search";
import { MESSAGE_LOCATION_REQUEST } from "@/lib/message-location";

function Highlight({ text, query }: { text: string; query: string }) {
  const start = text.toLocaleLowerCase().indexOf(query.toLocaleLowerCase());
  return start < 0 ? <>{text}</> : <>{text.slice(0, start)}<mark>{text.slice(start, start + query.length)}</mark>{text.slice(start + query.length)}</>;
}

export function ConversationSearch({ conversationId, name, href, onClose }: { conversationId: string; name: string; href: string; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [page, setPage] = useState<ConversationSearchPage | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    // React's autoFocus runs before the native dialog enters the top layer.
    const frame = requestAnimationFrame(() => input.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);
  const search = async (before?: string) => {
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    const term = query.trim();
    setPending(true); setError(""); setSubmitted(term);
    if (!before) setPage(null);
    try {
      const params = new URLSearchParams({ q: term }); if (before) params.set("before", before);
      const response = await fetch(`/api/conversations/${encodeURIComponent(conversationId)}/search?${params}`, { cache: "no-store", credentials: "same-origin", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]) });
      if (!response.ok) throw new Error();
      const result = await response.json() as ConversationSearchPage;
      if (!controller.signal.aborted) setPage(result);
    } catch { if (!controller.signal.aborted) setError("Search couldn't be loaded. Try again."); }
    finally { if (!controller.signal.aborted) setPending(false); }
  };
  return <ModalLayer onClose={onClose}><section className="creation-panel conversation-search" aria-labelledby="conversation-search-title">
    <button className="overlay-close" aria-label="Close search" onClick={onClose}><X size={18} /></button>
    <h2 id="conversation-search-title">Search Chat</h2><p className="search-context">{name}</p>
    <form onSubmit={(event) => { event.preventDefault(); void search(); }}>
      <label className="wizard-field"><span>Message text</span><input ref={input} autoFocus type="search" value={query} maxLength={120} minLength={2} required onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onClose(); } }} onChange={(event) => { request.current?.abort(); setPending(false); setError(""); setPage(null); setSubmitted(""); setQuery(event.target.value); }} placeholder="Search this conversation" /></label>
      <button className="quiet-action" disabled={pending || query.trim().length < 2}><Search size={16} />{pending ? "Searching…" : "Search"}</button>
    </form>
    <div className="conversation-search-results" aria-busy={pending}>
      {error ? <p role="alert">{error}</p> : <p role="status">{pending ? "Searching messages…" : page ? page.results.length ? `${page.results.length} results${page.nextCursor ? "; more available" : ""}` : "No messages found." : "Enter at least 2 characters."}</p>}
      {!pending && page?.results.map((result) => <Link key={result.id} href={`${href}?message=${result.id}`} className="conversation-search-result" onClick={() => {
        onClose();
        if (window.location.pathname === href && new URLSearchParams(window.location.search).get("message") === result.id) window.dispatchEvent(new CustomEvent(MESSAGE_LOCATION_REQUEST, { detail: { conversationId, messageId: result.id } }));
      }} scroll={false}>
        <span><strong>{result.author}</strong><time dateTime={result.createdAt}>{new Date(result.createdAt).toLocaleString()}</time></span><p><Highlight text={result.excerpt} query={submitted} /></p>
      </Link>)}
      {page?.nextCursor ? <button className="quiet-action" disabled={pending} onClick={() => void search(page.nextCursor!)}>Older results</button> : null}
    </div>
  </section></ModalLayer>;
}
