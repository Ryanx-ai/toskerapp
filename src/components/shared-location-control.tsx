"use client";
import { useId, useState } from "react";
import { Users } from "lucide-react";
import { ModalLayer } from "./modal-layer";
import type { useSharedLocation } from "./use-shared-location";
import type { LocationPrecision } from "@/lib/shared-location-contract";
import { REGION_LICENSE, REGION_SOURCE } from "@/lib/maps/area-label";
import styles from "./room-map-workspace.module.css";

export function SharedLocationControl({ sharing, available, contextName }: { sharing: ReturnType<typeof useSharedLocation>; available: boolean; contextName: string }) {
  const [open, setOpen] = useState(false), [precision, setPrecision] = useState<LocationPrecision>("area");
  const heading = useId();
  return <>
    <button type="button" className={styles.control} disabled={!available || sharing.busy || !!sharing.lease} onClick={() => { setPrecision("area"); setOpen(true); }} title={available ? "Share a temporary location snapshot" : "Turn Locate on before sharing"}><Users size={17} aria-hidden="true"/><span>Share location</span></button>
    {open && <ModalLayer onClose={() => setOpen(false)}><section className="creation-panel" aria-labelledby={heading}>
      <h2 id={heading}>Share location in {contextName}?</h2>
      <p>Visible to authorized members of this exact conversation, including members who join before a manual refresh. Not your other chats or Rooms.</p>
      <fieldset><legend>Choose what people can see</legend>
        <label><input type="radio" name={heading} checked={precision === "area"} onChange={() => setPrecision("area")}/> Broad area only (default)</label>
        <p>A region or city label. No precise peer marker.</p>
        <label><input type="radio" name={heading} checked={precision === "precise"} onChange={() => setPrecision("precise")}/> Precise position on peers’ Maps</label>
        <p>This reveals your coordinates and accuracy to people in this conversation.</p>
      </fieldset>
      <p>One snapshot, expiring within five minutes. Refresh is manual and does not extend expiry. Stop anytime. Leaving the Map, hiding this tab or disconnecting stops sharing; returning does not restart it.</p>
      <p>Tosker does not keep location history. Ably delivers the snapshot to connected authorized peers. Outside Singapore’s mapped regions, a rounded position is sent to Geoapify for a city label. These providers process requests under their privacy policies. People can copy a snapshot they already received; Stop cannot undo that.</p>
      <p><a href="https://ably.com/privacy" target="_blank" rel="noopener noreferrer">Ably privacy</a> · <a href="https://www.geoapify.com/privacy-policy/" target="_blank" rel="noopener noreferrer">Geoapify privacy</a></p>
      <div className={styles.actions}><button className={styles.primary} disabled={!available || sharing.busy} onClick={() => { setOpen(false); void sharing.start(precision); }}>{precision === "area" ? "Share broad area" : "Share precise position"}</button><button className={styles.control} onClick={() => setOpen(false)}>Keep private</button></div>
    </section></ModalLayer>}
  </>;
}
export function SharedLocationStatus({ sharing }: { sharing: ReturnType<typeof useSharedLocation> }) {
  return <div className={styles.sharingStatus}>
    {sharing.lease && <div className={styles.sharingActions} role="status"><span>{sharing.stopping ? "Stopping sharing…" : `Snapshot expires ${new Date(sharing.lease.expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`} · {sharing.lease.precision === "area" ? "broad area" : "precise position"}</span><button className={styles.control} disabled={sharing.busy || sharing.stopping || !!sharing.error} onClick={() => void sharing.refresh()}>Share displayed position again</button><button className={styles.control} disabled={sharing.stopping} onClick={() => void sharing.stop()}>Stop sharing</button></div>}
    {sharing.busy && <p role="status">Sending this snapshot…</p>}
    {sharing.error && <p role="alert">{sharing.error}</p>}
    {!!sharing.peers.length && <ul aria-label="Shared location snapshots">{sharing.peers.map(({ snapshot, identity }) => <li key={snapshot.id}><strong>{identity.displayName}</strong>: {snapshot.label} <small>({snapshot.precision === "area" ? "broad area only" : "precise marker shared"}; temporary snapshot)</small>{snapshot.source === "ura" ? <small> · <a href={REGION_SOURCE} target="_blank" rel="noopener noreferrer">URA MP2019 indicative region</a> (<a href={REGION_LICENSE} target="_blank" rel="noopener noreferrer">licence</a>)</small> : <small> · Area by <a href="https://www.geoapify.com/" target="_blank" rel="noopener noreferrer">Geoapify</a></small>}</li>)}</ul>}
  </div>;
}
