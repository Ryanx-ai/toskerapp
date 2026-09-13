"use client";

import { useId, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { ModalLayer } from "./modal-layer";

export function SettingsSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return <section className="scoped-settings-section"><h3>{title}</h3>{description ? <p className="settings-scope">{description}</p> : null}{children}</section>;
}
export function SettingsDangerSection({ children }: { children: ReactNode }) {
  return <div className="scoped-settings-danger">{children}</div>;
}
export function SettingsPreview({ title, children }: { title: string; children: ReactNode }) {
  return <section className="scoped-settings-preview"><div><h3>{title}</h3><span>Preview · not available</span></div><p>{children}</p></section>;
}
/** Small layout primitives only; no settings schema or speculative persistence. */
export function SettingsShell({ title, context, identity, sections, onClose, busy = false, children, footer }: {
  title: string; context: string; identity?: ReactNode; sections: { id: string; label: string; content: ReactNode }[];
  onClose: () => void; busy?: boolean; children?: ReactNode; footer?: ReactNode;
}) {
  const id = useId(), [selected, setSelected] = useState(sections[0]?.id);
  const current = sections.find((section) => section.id === selected) ?? sections[0];
  return <ModalLayer onClose={() => { if (!busy) onClose(); }}><section className="creation-panel scoped-settings-shell" aria-labelledby={`${id}-title`}>
    <header className="scoped-settings-header"><div className="scoped-settings-identity">{identity}<div><h2 id={`${id}-title`}>{title}</h2><p>{context}</p></div></div><button className="overlay-close" aria-label={`Close ${title}`} disabled={busy} onClick={onClose}><X size={18} /></button></header>
    <div className="scoped-settings-layout">
      <nav aria-label={`${title} sections`} className="scoped-settings-nav">{sections.map((section) => <button key={section.id} id={`${id}-${section.id}`} aria-current={current?.id === section.id ? "page" : undefined} disabled={busy || Boolean(children)} onClick={() => setSelected(section.id)}>{section.label}</button>)}</nav>
      <div className="scoped-settings-body" role="region" aria-labelledby={`${id}-${current?.id}`}>{children ?? current?.content}</div>
    </div>{footer ? <footer className="scoped-settings-footer">{footer}</footer> : null}
  </section></ModalLayer>;
}
