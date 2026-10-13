"use client";
import { useEffect, useId, useRef, useState } from "react";
import { LocateFixed, Users } from "lucide-react";
import { ModalLayer } from "./modal-layer";
import type { useSharedLocation } from "./use-shared-location";
import type { useLocalMapLocation } from "./use-local-map-location";
import type { LocationPrecision } from "@/lib/shared-location-contract";
import { REGION_LICENSE, REGION_SOURCE } from "@/lib/maps/area-label";
import { locationSharingFeedback } from "@/lib/location-sharing-feedback";
import styles from "./room-map-workspace.module.css";

// Explicit opt-in, AND Development mode. A Production build cannot enable it.
const qaControls = process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_LOCATION_QA_UI === "1";

export function SharedLocationControl({ sharing, localLocation, disabled, sandbox, contextName, open, setOpen, onBeforeLocate, onClear }: {
  sharing: ReturnType<typeof useSharedLocation>;
  localLocation: ReturnType<typeof useLocalMapLocation>;
  disabled: boolean; sandbox: boolean; contextName: string;
  open: boolean; setOpen: (value: boolean) => void;
  onBeforeLocate: () => void; onClear: () => void;
}) {
  const [precision, setPrecision] = useState<LocationPrecision>("area");
  const heading = useId();
  const generation = useRef(0);
  useEffect(() => {
    const intent = generation;
    const cancel = () => { ++intent.current; setOpen(false); };
    const hidden = () => { if (document.hidden) cancel(); };
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("pagehide", cancel);
    // Activity restoration must not revive a previously dismissed consent prompt.
    queueMicrotask(cancel);
    return () => { ++intent.current; document.removeEventListener("visibilitychange", hidden); window.removeEventListener("pagehide", cancel); };
  }, [setOpen]);
  const active = !!localLocation.location || localLocation.busy;
  const available = !disabled && !!localLocation.location;
  const feedback = locationSharingFeedback(sharing);
  const status = feedback || (active ? "Only on your map" : "Off");
  const toggle = () => {
    onBeforeLocate();
    const epoch = ++generation.current;
    setOpen(false);
    // An unconfirmed Stop must remain retryable through the single control,
    // without acquiring another position or opening a fresh sharing prompt.
    if (active || sharing.error) { onClear(); return; }
    sharing.dismissEndNotice();
    setPrecision("area");
    localLocation.locate(() => {
      if (generation.current === epoch && !document.hidden && !sandbox) setOpen(true);
    });
  };
  return <>
    <button type="button" className={styles.control} aria-label="Locate" aria-describedby={`${heading}-status`} aria-pressed={active} disabled={sharing.stopping || (disabled && !active && !sharing.lease)} onClick={toggle} title="Locate · turn off to clear your location and stop sharing"><LocateFixed size={17} aria-hidden="true"/><span>Locate</span>{active && sharing.lease && <Users className={styles.locateSharingIndicator} size={13} aria-hidden="true"/>}</button>
    <span id={`${heading}-status`} className={styles.srOnly}>{status}</span>
    {open && available && !sandbox && <ModalLayer onClose={() => setOpen(false)}><section className={`creation-panel ${styles.locationConsent}`} aria-labelledby={heading}>
      <h2 id={heading}>Share your location with this conversation?</h2>
      <p><strong>Audience: {contextName}</strong><br/>Authorized participants in this conversation only. Local synthetic QA.</p>
      <fieldset><legend>Choose what people can see</legend>
        <label><input type="radio" name={heading} checked={precision === "area"} onChange={() => setPrecision("area")}/> Broad area only (default)</label>
        <p>A region or city label. No precise peer marker.</p>
        <label><input type="radio" name={heading} checked={precision === "precise"} onChange={() => setPrecision("precise")}/> Precise position on peers’ Maps</label>
        <p>This reveals your coordinates and accuracy to people in this conversation.</p>
      </fieldset>
      <p>One snapshot, up to five minutes. Manual refresh only; no tracking. Locate off, leaving the Map, hiding this tab or disconnecting stops sharing. Returning never restarts it.</p>
      <details><summary>Privacy and retention</summary>
        <p>Includes participants granted access while valid; not other chats or Rooms. Tosker stores only the latest snapshot, not a movement trail. Broad area stores no coordinates. Ably carries change notices only.</p>
        <p>Confirmed Stop deletes the active snapshot. Running peers remove unverified markers within five seconds. The supervised QA worker cleans expired rows; recovery history may retain prior data for six hours. This is not instant physical erasure. Recipients can copy received data.</p>
        <p>Refresh does not extend expiry. No provider lookup or background tracking in this synthetic QA wave.</p>
      </details>
      {!sharing.connected && <p role="status">Reconnect to this conversation to share. Your location remains private.</p>}
      <div className={styles.actions}><button className={styles.primary} disabled={!sharing.connected || sharing.busy || sharing.stopping || !!sharing.lease} onClick={() => { setOpen(false); void sharing.start(precision); }}>{precision === "area" ? "Share broad area" : "Share precise position"}</button><button className={styles.control} onClick={() => setOpen(false)}>Keep private</button></div>
    </section></ModalLayer>}
  </>;
}
export function SharedLocationStatus({ sharing }: { sharing: ReturnType<typeof useSharedLocation> }) {
  const feedback = locationSharingFeedback(sharing);
  return <div className={styles.sharingStatus}>
    <p role="status" aria-atomic="true" className={feedback ? undefined : styles.srOnly}>{feedback}</p>
    {qaControls && sharing.lease && <div className={styles.sharingActions} aria-label="Development location QA"><span>Snapshot expires {new Date(sharing.lease.expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span><button className={styles.control} disabled={sharing.busy || sharing.stopping || !!sharing.error} onClick={() => void sharing.refresh()}>Refresh snapshot</button><button className={styles.control} disabled={sharing.stopping} onClick={() => void sharing.stop()}>Stop sharing</button></div>}
    {sharing.error && <p role="alert">{sharing.error}</p>}
    {!!sharing.peers.length && <ul aria-label="Shared location snapshots">{sharing.peers.map(({ snapshot, identity }) => <li key={snapshot.id}><strong>{identity.displayName}</strong>: {snapshot.label} <small>({snapshot.precision === "area" ? "broad area only" : "precise marker shared"}; temporary snapshot)</small>{snapshot.source === "ura" ? <small> · <a href={REGION_SOURCE} target="_blank" rel="noopener noreferrer">URA MP2019 indicative region</a> (<a href={REGION_LICENSE} target="_blank" rel="noopener noreferrer">licence</a>)</small> : <small> · Area by <a href="https://www.geoapify.com/" target="_blank" rel="noopener noreferrer">Geoapify</a></small>}</li>)}</ul>}
  </div>;
}
