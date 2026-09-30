"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, X } from "lucide-react";
import { readTripCommentsAction } from "@/server/trips/actions";
import type { TripCommentPage } from "@/lib/trip-contract";
import type { TripChange } from "./trip-route-controls";
import { ModalLayer } from "./modal-layer";
import { NamecardButton } from "./namecard-context";
import styles from "./room-map-workspace.module.css";

export function TripComments({ scope, placeId, title, revision, disabled, change, deny, close, retry, saveError }: { scope: string; placeId: string; title: string; revision: number; disabled: boolean; change: TripChange; deny(): void; close(): void; retry?: () => ReturnType<TripChange>; saveError: string }) {
  const [page, setPage] = useState<TripCommentPage>({ comments: [], hasMore: false });
  const [body, setBody] = useState(""), [error, setError] = useState(""), [loading, setLoading] = useState(true);
  const submitting = useRef(false), composing = useRef(false), alive = useRef(true), sequence = useRef(0);
  const load = useCallback(async (before?: string) => {
    const version = ++sequence.current;
    try {
      const result = await readTripCommentsAction(scope, placeId, before);
      if (!alive.current || version !== sequence.current) return;
      if (!result.ok) {
        setPage({ comments: [], hasMore: false });
        if (result.code === "denied") { deny(); return; }
        setError(result.message); return;
      }
      setPage(previous => before ? { hasMore: result.value.hasMore, comments: [...result.value.comments, ...previous.comments].filter((c,i,rows) => rows.findIndex(row => row.id === c.id) === i) } : result.value);
      setError("");
    } catch { if (alive.current) { setPage({ comments: [], hasMore: false }); setError("Comments unavailable. Retry to refresh."); } }
    finally { if (alive.current && version === sequence.current) setLoading(false); }
  }, [scope, placeId, deny]);
  useEffect(() => { alive.current = true; queueMicrotask(() => { if (alive.current) void load(); }); return () => { alive.current = false; }; }, [load, revision]);
  return <ModalLayer onClose={close}><section className={`creation-panel ${styles.commentSheet}`} aria-label={`Comments on ${title}`}>
    <button className="overlay-close" aria-label="Close comments" onClick={close}><X size={18} /></button>
    <h2>Comments</h2><p className={styles.commentPlace}>{title}</p>
    {loading && <p role="status">Loading…</p>}
    {page.hasMore && <button className="quiet-action" disabled={loading} onClick={() => { setLoading(true); void load(page.comments[0]?.id); }}>Earlier comments</button>}
    <div className={styles.commentList} aria-live="polite">{page.comments.map(comment => <article key={comment.id} data-comment-id={comment.id}>
      <header><NamecardButton userId={comment.authorId} name={comment.author}><strong>{comment.author}</strong></NamecardButton><time dateTime={comment.createdAt} title={new Date(comment.createdAt).toLocaleString()}>{new Date(comment.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</time></header><p>{comment.body}</p>
    </article>)}</div>
    {!loading && !page.comments.length && !error && <p className={styles.helper}>Add the first comment.</p>}
    {error && <p role="alert">{error} <button className="quiet-action" onClick={() => void load()}>Retry</button></p>}
    {saveError && <p role="alert">{saveError}{retry && <button className="quiet-action" onClick={async () => { if (submitting.current) return; submitting.current = true; try { if (await retry()) { setBody(""); await load(); } } finally { submitting.current = false; } }}>Retry same comment</button>}</p>}
    <form className={styles.commentForm} onSubmit={async e => {
      e.preventDefault(); if (disabled || submitting.current || composing.current || !body.trim()) return;
      submitting.current = true;
      try { const result = await change({ type: "comment", placeId, body }); if (result && alive.current) { setBody(""); await load(); } }
      finally { submitting.current = false; }
    }}>
      <label className={styles.srOnly} htmlFor={`trip-comment-${placeId}`}>Add a comment</label>
      <textarea id={`trip-comment-${placeId}`} rows={2} maxLength={1000} disabled={disabled} placeholder="Add a comment…" value={body} onChange={e => setBody(e.target.value)} onCompositionStart={() => { composing.current = true; }} onCompositionEnd={() => { composing.current = false; }} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && !composing.current && e.nativeEvent.keyCode !== 229) { e.preventDefault(); if (!e.repeat) e.currentTarget.form?.requestSubmit(); } }} />
      <button type="submit" className="primary-action" aria-label="Post location comment" disabled={disabled || !body.trim()}><ArrowUp size={17} /></button>
    </form>
  </section></ModalLayer>;
}
