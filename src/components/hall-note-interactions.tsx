"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, MessageCircle } from "lucide-react";
import { addHallCommentAction, listHallCommentsAction, setHallReactionAction } from "@/server/shared-state/actions";
import { HALL_REACTIONS, safeHallImagePath, type HallReaction } from "@/lib/hall-contract";

type CommentPage = Awaited<ReturnType<typeof listHallCommentsAction>>;

export function HallNoteInteractions({ conversationId, item, onChanged }: {
  conversationId: string;
  item: { id: string; title: string | null; commentCount?: number; imagePath?: string | null; imageAlt?: string | null; reactions?: Array<{ reaction: HallReaction; count: number; mine: boolean }> };
  onChanged: () => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [page, setPage] = useState<CommentPage>({ comments: [], hasMore: false });
  const [loading, setLoading] = useState(false);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const draftId = useRef<string | null>(null);
  const imagePath = safeHallImagePath(item.imagePath);
  useEffect(() => {
    if (!expanded) return;
    let active = true;
    listHallCommentsAction(conversationId, item.id)
      .then((next) => { if (active) { setPage(next); setLoading(false); } })
      .catch(() => { if (active) { setError("Comments couldn't be loaded."); setLoading(false); } });
    return () => { active = false; };
  }, [expanded, conversationId, item.id, item.commentCount]);
  const react = async (reaction: HallReaction, active: boolean) => {
    if (busy) return;
    setBusy(true); setError("");
    try { await setHallReactionAction({ conversationId, itemId: item.id, reaction, active }); await onChanged(); }
    catch { setError("Reaction couldn't be saved. Try again."); }
    finally { setBusy(false); }
  };
  return (
    <div className="hall-note-context">
      {imagePath ? <Image className="hall-note-image" src={imagePath} alt={item.imageAlt || item.title || "Note photo"} width={640} height={480} sizes="(max-width: 640px) 90vw, 320px" /> : null}
      <div className="hall-object-actions">
        <div className="hall-reactions" aria-label="Note reactions">
          {HALL_REACTIONS.map(({ key, emoji, label }) => {
            const value = item.reactions?.find((entry) => entry.reaction === key);
            return <button key={key} disabled={busy} aria-label={`${label}, ${value?.count ?? 0} reactions`} aria-pressed={value?.mine ?? false} onClick={() => void react(key, !value?.mine)}><span aria-hidden="true">{emoji}</span><span>{value?.count ?? 0}</span></button>;
          })}
        </div>
        <button className="hall-comments-toggle" aria-label={`Comments, ${item.commentCount ?? 0}`} aria-expanded={expanded} aria-controls={`comments-${item.id}`} onClick={() => { setLoading(!expanded); setExpanded(!expanded); }}><MessageCircle size={15} /><span>{item.commentCount ?? 0}</span></button>
      </div>
      {expanded ? <section id={`comments-${item.id}`} className="hall-comments" aria-label="Comments">
        {loading ? <p role="status">Loading…</p> : null}
        {page.hasMore ? <button className="hall-earlier" disabled={busy} onClick={async () => {
          setBusy(true); setError("");
          try { const older = await listHallCommentsAction(conversationId, item.id, page.comments[0]?.id); setPage((current) => ({ hasMore: older.hasMore, comments: [...older.comments, ...current.comments] })); }
          catch { setError("Earlier comments couldn't be loaded."); }
          finally { setBusy(false); }
        }}>Earlier comments</button> : null}
        <div className="hall-comment-list">{page.comments.map((comment) => <article key={comment.id} className="hall-comment"><span className="avatar avatar-pink" aria-hidden="true">{comment.author.split(/\s+/).map((part) => part[0]).join("").slice(0, 2)}</span><div><strong>{comment.author}</strong><time dateTime={comment.createdAt} title={new Date(comment.createdAt).toLocaleString()}>{new Date(comment.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</time><p>{comment.body}</p></div></article>)}</div>
        <form className="hall-comment-form" onSubmit={async (event) => {
          event.preventDefault();
          if (!body.trim() || busy) return;
          setBusy(true); setError(""); draftId.current ??= crypto.randomUUID();
          let saved = false;
          try {
            await addHallCommentAction({ conversationId, itemId: item.id, body, id: draftId.current });
            saved = true;
            setBody(""); draftId.current = null;
            setPage(await listHallCommentsAction(conversationId, item.id));
            await onChanged();
          } catch { setError(saved ? "Comment saved. Reopen comments to refresh." : "Comment couldn't be saved. Your draft is still here."); }
          finally { setBusy(false); }
        }}>
          <textarea rows={1} maxLength={1000} disabled={busy} aria-label="Add a comment" placeholder="Add a comment…" value={body} onChange={(event) => { setBody(event.target.value); draftId.current = null; }} />
          <button type="submit" className="hall-comment-send" aria-label="Post comment" disabled={!body.trim() || busy}><ArrowUp size={17} /></button>
        </form>
      </section> : null}
      {error ? <p className="hall-inline-error" role="alert">{error}</p> : null}
    </div>
  );
}
