"use client";
import { useEffect, useRef, useState } from "react";
import { Copy, MoreHorizontal, Pencil, Pin, Reply, SmilePlus, Trash2 } from "lucide-react";
import { messageTextParts } from "@/lib/message-links";
import type { Message } from "@/data/messaging-data";
import type { ReactionSummary } from "@/lib/reaction-contract";
import { EmojiPicker, ReactionChips } from "./emoji-picker";
import { InteractionPopover } from "./interaction-popover";
import { ModalLayer } from "./modal-layer";
import { DeferredControl } from "./deferred-control";
import { PersonAvatar } from "./identity-avatar";
import { validMentionSpans, type MentionSpan } from "@/lib/mentions";

function MessageText({ body, mentions = [] }: { body: string; mentions?: MentionSpan[] }) {
  const text = (value: string) => messageTextParts(value).map((part, index) => part.href ? <a key={index} className="message-link" href={part.href} target="_blank" rel="noopener noreferrer" title="Opens in a new tab" aria-label={`${part.text} (opens in new tab)`}>{part.text}</a> : part.text);
  if (!validMentionSpans(body, mentions) || !mentions.length) return <>{text(body)}</>;
  const spans = [...mentions].sort((a, b) => a.start - b.start);
  return <>{spans.map((span, index) => <span key={span.start}>{text(body.slice(index ? spans[index - 1].start + spans[index - 1].length : 0, span.start))}<span className="message-mention" title="Mentioned member">{span.label}</span></span>)}{text(body.slice(spans.at(-1)!.start + spans.at(-1)!.length))}</>;
}

export function MessageBubble({ message, grouped, onReply, onReaction, onChange, onPin, onLocate }: {
  message: Message; grouped?: boolean; onReply: (message: Message) => void;
  onReaction: (id: string, emoji: string, active: boolean) => Promise<void>;
  onChange: (id: string, body?: string, remove?: boolean) => Promise<void>;
  onPin?: (message: Message) => Promise<void>;
  onLocate?: (id: string) => void;
}) {
  const [panel, setPanel] = useState<"menu" | "emoji" | null>(null);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [draft, setDraft] = useState(message.body);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const press = useRef<ReturnType<typeof setTimeout> | null>(null);
  const start = useRef({ x: 0, y: 0 });
  const cancelPress = () => { if (press.current) clearTimeout(press.current); press.current = null; };
  useEffect(() => () => { if (press.current) clearTimeout(press.current); }, []);
  const show = (next: typeof panel, element: HTMLElement) => { cancelPress(); setAnchor(element); setPanel(next); };
  const run = async (operation: () => Promise<void>) => {
    if (busy) return;
    setBusy(true); setError("");
    try { await operation(); setPanel(null); setEditing(false); setDeleting(false); }
    catch { setError("That change couldn't be completed. Try again."); }
    finally { setBusy(false); }
  };
  const values: ReactionSummary[] = message.reactionSummary ?? [...new Set(message.reactions ?? [])].map((emoji) => ({ emoji, count: message.reactions!.filter((item) => item === emoji).length, mine: false, participants: [] }));
  return <article id={`message-${message.id}`} tabIndex={-1} aria-label={`Message from ${message.author}`} className={`message-row ${message.mine ? "mine" : ""} ${grouped ? "is-grouped" : ""} ${message.deletedAt ? "message-deleted" : ""}`}
    onContextMenu={(event) => { if (message.deletedAt) return; event.preventDefault(); show("menu", event.currentTarget); }}
    onKeyDown={(event) => { if (!message.deletedAt && (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10"))) { event.preventDefault(); show("menu", event.currentTarget); } }}>
    {grouped ? <span className="message-avatar-spacer" aria-hidden="true" /> : <PersonAvatar seed={message.authorId ?? message.author} initials={message.initials} imageUrl={message.avatarUrl} />}
    <div className="message-column">
      {!grouped ? <div className="message-author"><strong>{message.author}</strong><time dateTime={message.createdAt} title={message.createdAt ? new Date(message.createdAt).toLocaleString() : undefined}>{message.time}</time></div> : <time className="grouped-message-time" dateTime={message.createdAt} title={message.createdAt ? new Date(message.createdAt).toLocaleString() : undefined}>{message.time}</time>}
      <div className="message-body-wrap">
        <div className="message-bubble" onPointerDown={(event) => {
          if (event.pointerType !== "touch" || message.deletedAt || (event.target as HTMLElement).closest("button,a")) return;
          start.current = { x: event.clientX, y: event.clientY };
          const element = event.currentTarget;
          press.current = setTimeout(() => { show("menu", element); }, 600);
        }} onPointerMove={(event) => { if (Math.hypot(event.clientX - start.current.x, event.clientY - start.current.y) > 8) cancelPress(); }} onPointerUp={cancelPress} onPointerCancel={cancelPress}>
          {message.replyTo ? <blockquote>{message.replyToId && onLocate ? <button className="reply-source" onClick={() => onLocate(message.replyToId!)} aria-label={`Open reply source${message.replyAuthor ? ` from ${message.replyAuthor}` : ""}`}><strong>{message.replyAuthor ?? "Reply"}</strong><span>{message.replyTo}</span></button> : <><strong>{message.replyAuthor ?? "Reply"}</strong>{message.replyTo}</>}</blockquote> : null}
          <p>{message.deletedAt ? message.body : <MessageText body={message.body} mentions={message.mentions} />}</p>
          {message.editedAt && !message.deletedAt ? <small className="message-edited" title={`Edited ${new Date(message.editedAt).toLocaleString()}`}>edited</small> : null}
          {message.attachment ? <p className="message-attachment">{message.attachment.name} · {message.attachment.meta}</p> : null}
        </div>
        {!message.deletedAt ? <div className="message-hover-actions">
          <button aria-label="React" onClick={(event) => show("emoji", event.currentTarget)}><SmilePlus size={16} /></button>
          <button aria-label="Reply" onClick={() => onReply(message)}><Reply size={16} /></button>
          <button aria-label="More message actions" aria-haspopup="dialog" aria-expanded={Boolean(panel)} onClick={(event) => show("menu", event.currentTarget)}><MoreHorizontal size={16} /></button>
        </div> : null}
      </div>
      {!message.deletedAt ? <ReactionChips values={values} disabled={busy} onToggle={(emoji, active) => void run(() => onReaction(message.id, emoji, active))} /> : null}
      {error ? <p role="alert" className="composer-error">{error}</p> : null}
    </div>
    {panel ? <InteractionPopover anchor={anchor} label="Message actions" onClose={() => setPanel(null)}>
      {panel === "emoji" ? <EmojiPicker onClose={() => setPanel(null)} onPick={(emoji) => void run(() => onReaction(message.id, emoji, !values.find((value) => value.emoji === emoji)?.mine))} /> : <div className="message-action-list">
        <button onClick={() => setPanel("emoji")}><SmilePlus size={16} />React</button>
        <button onClick={() => { onReply(message); setPanel(null); }}><Reply size={16} />Reply</button>
        <button onClick={() => void run(() => navigator.clipboard.writeText(message.body))}><Copy size={16} />Copy</button>
        {onPin ? <button disabled={busy} onClick={() => void run(() => onPin(message))}><Pin size={16} />Pin to Hall</button> : null}
        <DeferredControl kind="translate" text />
        {message.mine ? <><hr /><button onClick={() => { setDraft(message.body); setEditing(true); setPanel(null); }}><Pencil size={16} />Edit</button><button className="danger" onClick={() => { setDeleting(true); setPanel(null); }}><Trash2 size={16} />Delete</button></> : null}
      </div>}
    </InteractionPopover> : null}
    {editing || deleting ? <ModalLayer onClose={() => { if (!busy) { setEditing(false); setDeleting(false); } }}><section className="creation-panel message-edit-panel" role="dialog" aria-modal="true" aria-label={editing ? "Edit message" : "Delete message"}>
      <h2>{editing ? "Edit message" : "Delete message?"}</h2>
      {editing ? <textarea autoFocus aria-label="Edit message text" maxLength={8000} rows={4} value={draft} disabled={busy} onChange={(event) => setDraft(event.target.value)} /> : <p>The text will be removed for everyone. This cannot be undone.</p>}
      <div className="overlay-actions"><button disabled={busy} onClick={() => { setEditing(false); setDeleting(false); }}>Cancel</button><button className={editing ? "primary-action" : "danger"} disabled={busy || (editing && !draft.trim())} onClick={() => void run(() => onChange(message.id, editing ? draft : undefined, deleting))}>{busy ? "Saving…" : editing ? "Save" : "Delete"}</button></div>
      {error ? <p role="alert">{error}</p> : null}
    </section></ModalLayer> : null}
  </article>;
}
