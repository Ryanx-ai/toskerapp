"use client";
import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { GripVertical } from "lucide-react";
import { reorderSubroomsAction } from "@/server/rooms/actions";
import { ACTIVITY_REFRESH } from "@/lib/realtime-contract";
import { InteractionPopover } from "./interaction-popover";

const mime = "application/x-tosker-subroom";
export function SubroomOrderRow({ roomId, ids, id, name, owner, children }: { roomId: string; ids: string[]; id: string; name: string; owner: boolean; children: ReactNode }) {
  const router = useRouter();
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [over, setOver] = useState(false);
  const move = async (source: string, target: string) => {
    if (!owner || busy || source === target || !ids.includes(source) || !ids.includes(target)) return;
    const orderedIds = [...ids]; orderedIds.splice(orderedIds.indexOf(source), 1); orderedIds.splice(ids.indexOf(target), 0, source);
    setBusy(true); setError(""); setOpen(false);
    try {
      const result = await reorderSubroomsAction({ roomId, expectedIds: ids, orderedIds });
      if (result.conflict) setError("Order changed elsewhere. Refreshed; try again.");
    } catch { setError("Order not confirmed. Refreshing access and order."); }
    finally { setBusy(false); window.dispatchEvent(new Event(ACTIVITY_REFRESH)); router.refresh(); }
  };
  if (!owner) return children;
  const index = ids.indexOf(id);
  return <div className={`fp2-order-row ${over ? "drag-target" : ""}`} data-subroom-id={id}
    onDragOver={(event) => { if (!busy && event.dataTransfer.types.includes(mime)) { event.preventDefault(); event.dataTransfer.dropEffect = "move"; setOver(true); } }}
    onDragLeave={() => setOver(false)} onDrop={(event) => {
      event.preventDefault(); setOver(false);
      try { const source = JSON.parse(event.dataTransfer.getData(mime)); if (source.roomId === roomId) void move(source.id, id); } catch { /* unrelated drag */ }
    }}>
    {children}
    <button className="fp2-order-handle" aria-label={`Reorder ${name}`} aria-expanded={open} disabled={busy} draggable={!busy}
      onClick={(event) => { setAnchor(event.currentTarget); setOpen(!open); }} onDragStart={(event) => { event.stopPropagation(); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData(mime, JSON.stringify({ roomId, id })); setOpen(false); }}
      onDragEnd={() => setOver(false)}><GripVertical size={16} aria-hidden="true" /></button>
    {open ? <InteractionPopover anchor={anchor} onClose={() => setOpen(false)} label={`Reorder ${name}`}><div className="message-action-list">
      <button disabled={index <= 0 || busy} onClick={() => void move(id, ids[index - 1])}>Move earlier</button>
      <button disabled={index < 0 || index >= ids.length - 1 || busy} onClick={() => void move(id, ids[index + 1])}>Move later</button>
    </div></InteractionPopover> : null}
    {busy ? <span className="sr-only" role="status">Saving order…</span> : null}
    {error ? <p className="fp2-order-error" role="alert">{error}</p> : null}
  </div>;
}
