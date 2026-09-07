"use client";
import { useState } from "react";
import { Plus, X } from "lucide-react";
import { QUICK_EMOJI, type ReactionSummary } from "@/lib/reaction-contract";

export function EmojiPicker({ onPick, onClose, choices }: { onPick: (emoji: string) => void; onClose: () => void; choices?: readonly (readonly [string, string])[] }) {
  const [data, setData] = useState<string[][] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("All");
  const [limit, setLimit] = useState(80);
  const expand = async () => {
    setLoading(true); setError(false);
    try { setData((await import("@/data/emoji.json")).default); }
    catch { setError(true); }
    finally { setLoading(false); }
  };
  const matches = data?.filter(([emoji, name, category]) => (group === "All" || group === category) && `${emoji} ${name}`.toLowerCase().includes(query.toLowerCase()));
  return <section className="emoji-picker" aria-label="Choose emoji">
    <header><strong>{data ? "All emoji" : "Quick reactions"}</strong><button aria-label="Close emoji picker" onClick={onClose}><X size={16} /></button></header>
    {!data ? <div className="emoji-quick">{(choices ?? QUICK_EMOJI).map(([emoji, name]) => <button key={emoji} aria-label={name} title={name} onClick={() => onPick(emoji)}>{emoji}</button>)}</div> : <>
      <input autoFocus aria-label="Search emoji" placeholder="Search emoji" value={query} onChange={(event) => { setQuery(event.target.value); setLimit(80); }} />
      <select aria-label="Emoji category" value={group} onChange={(event) => { setGroup(event.target.value); setLimit(80); }}><option>All</option>{[...new Set(data.map((item) => item[2]))].map((name) => <option key={name}>{name}</option>)}</select>
      <div className="emoji-grid">{matches?.slice(0, limit).map(([emoji, name]) => <button key={emoji} aria-label={name} title={name} onClick={() => onPick(emoji)}>{emoji}</button>)}</div>
      {!matches?.length ? <p role="status">No matching emoji</p> : null}
      {(matches?.length ?? 0) > limit ? <button className="emoji-expand" onClick={() => setLimit((value) => value + 80)}>Show more ({matches!.length - limit})</button> : null}
      <small>Appearance depends on your device.</small>
    </>}
    {!data && !choices ? <button className="emoji-expand" disabled={loading} onClick={() => void expand()}><Plus size={16} />{loading ? "Loading…" : error ? "Retry all emoji" : "All emoji"}</button> : null}
  </section>;
}

export function ReactionChips({ values, disabled, onToggle }: { values: ReactionSummary[]; disabled?: boolean; onToggle: (emoji: string, active: boolean) => void }) {
  return <div className="reaction-chips">{values.filter((value) => value.count > 0).map((value) => <button key={value.emoji} disabled={disabled} aria-pressed={value.mine}
    aria-label={`${value.emoji}, ${value.count} reaction${value.count === 1 ? "" : "s"}${value.mine ? ", including you" : ""}. ${value.participants.join(", ")}`}
    title={value.participants.join(", ") || "Toggle your reaction"} onClick={() => onToggle(value.emoji, !value.mine)}><span aria-hidden="true">{value.emoji}</span><span>{value.count}</span></button>)}</div>;
}
