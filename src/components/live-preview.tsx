"use client";
import { useState } from "react";
import { Mic, MicOff, Video, VideoOff, Radio } from "lucide-react";

/** Synthetic UI only: no media APIs, permissions, network calls or real participant data. */
export default function LivePreview() {
  const [mic, setMic] = useState(false), [camera, setCamera] = useState(false), [ptt, setPtt] = useState(false);
  return <section className="live-preview" aria-labelledby="live-preview-title">
    <header><span className="live-preview-badge">Preview</span><h2 id="live-preview-title">Together, wherever.</h2><p>Synthetic participants. Controls demonstrate the layout; nothing is recorded or transmitted.</p></header>
    <div className="live-preview-people" aria-label="Synthetic participants">{["Explorer A", "Explorer B", "Explorer C"].map((name, index) => <div key={name} className="live-preview-person"><span aria-hidden="true">{["A", "B", "C"][index]}</span><strong>{name}</strong><small>Preview participant</small></div>)}</div>
    <div className="live-preview-controls">
      <button aria-pressed={mic} onClick={() => setMic(value => !value)}>{mic ? <Mic size={18} aria-hidden="true" /> : <MicOff size={18} aria-hidden="true" />}Mic</button>
      <button onClick={() => setPtt(value => !value)} aria-pressed={ptt}><Radio size={18} aria-hidden="true" />PTT</button>
      <button aria-pressed={camera} onClick={() => setCamera(value => !value)}>{camera ? <Video size={18} aria-hidden="true" /> : <VideoOff size={18} aria-hidden="true" />}Camera</button>
    </div><p className="live-preview-status" role="status">Preview only · Mic {mic ? "on" : "off"} · PTT {ptt ? "on" : "off"} · Camera {camera ? "on" : "off"}. Real calling is deferred.</p>
  </section>;
}
