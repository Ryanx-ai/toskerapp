"use client";
import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { changeSidebarPinAction } from "@/server/conversations/sidebar-actions";
import type { SidebarPinChange } from "@/server/conversations/sidebar-pins";
import { ACTIVITY_REFRESH } from "@/lib/realtime-contract";
import { InteractionPopover } from "./interaction-popover";

const mime = "application/x-tosker-private-pin";
export function SidebarPinRow({ id, name, ids, enabled, onSaved, children, pinAllowed = true, actions }: { id?: string; name: string; ids: string[]; enabled: boolean; onSaved: (ids: string[]) => void; children: ReactNode; pinAllowed?: boolean; actions?: (close: () => void) => ReactNode }) {
  const router = useRouter();
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null), [busy, setBusy] = useState(false), [over, setOver] = useState(false), [error, setError] = useState("");
  const index = id ? ids.indexOf(id) : -1, pinned = index >= 0;
  if (!enabled || !id) return children;
  const change = async (sourceId: string, mutation: SidebarPinChange) => {
    if (busy) return;
    setBusy(true); setError(""); setAnchor(null);
    try { const result = await changeSidebarPinAction(sourceId, mutation); onSaved(result.ids); if (result.conflict) setError("Order changed elsewhere. Refreshed; try again."); }
    catch { setError("Sidebar preference wasn't saved. Check your connection or access and try again."); }
    finally { setBusy(false); window.dispatchEvent(new Event(ACTIVITY_REFRESH)); router.refresh(); }
  };
  return <div className={`sidebar-pin-row ${pinned ? "is-pinned" : ""} ${over ? "drag-target" : ""}`} data-pin-id={id} draggable={pinned && !busy}
    onDragStart={(event) => { if (!pinned || busy) return; event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData(mime,id); setAnchor(null); }}
    onDragOver={(event) => { if (pinned && !busy && event.dataTransfer.types.includes(mime)) { event.preventDefault(); event.dataTransfer.dropEffect = "move"; setOver(true); } }}
    onDragLeave={() => setOver(false)} onDrop={(event) => { if (!pinned || busy || !event.dataTransfer.types.includes(mime)) return; event.preventDefault(); setOver(false); const source = event.dataTransfer.getData(mime); if (source !== id && ids.includes(source)) void change(source, { kind: "move", targetId: id, expectedIds: ids }); }}>
    {children}
    <button className="sidebar-pin-control" aria-label={`Organize ${name}`} aria-haspopup="dialog" aria-expanded={Boolean(anchor)} disabled={busy} draggable={pinned && !busy}
      onClick={(event) => setAnchor(event.currentTarget)} onDragStart={(event) => { event.stopPropagation(); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData(mime, id); setAnchor(null); }} onDragEnd={() => setOver(false)}>
      <MoreHorizontal size={15} aria-hidden="true" />
    </button>
    {anchor ? <InteractionPopover anchor={anchor} onClose={() => setAnchor(null)} label={`Organize ${name}`}><div className="message-action-list">
      {actions?.(() => setAnchor(null))}
      {pinAllowed ? <button disabled={busy} onClick={() => void change(id, { kind: "pin", pinned: !pinned })}>{pinned ? "Unpin" : "Pin to top"}</button> : null}
      {pinned ? <><button disabled={busy || index <= 0} onClick={() => void change(id, { kind: "move", targetId: ids[index - 1], expectedIds: ids })}>Move earlier</button><button disabled={busy || index === ids.length - 1} onClick={() => void change(id, { kind: "move", targetId: ids[index + 1], expectedIds: ids })}>Move later</button></> : null}
      {pinAllowed ? <p className="settings-scope">Pin to keep it close. Drag pinned chats and Rooms, or use Move earlier/later. Only you see this order.</p> : null}
    </div></InteractionPopover> : null}
    {busy ? <span className="sr-only" role="status">Saving sidebar preference…</span> : null}{error ? <p className="sidebar-pin-error" role="alert">{error}</p> : null}
  </div>;
}
