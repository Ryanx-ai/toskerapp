"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ChevronDown, X } from "lucide-react";
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
function SettingsFooter({ children, onClose }: { children: ReactNode | ((requestClose: () => void) => ReactNode); onClose: () => void }) {
  return <footer className="scoped-settings-footer">{typeof children === "function" ? children(onClose) : children}</footer>;
}
/** Small layout primitives only; no settings schema or speculative persistence. */
export function SettingsShell({ title, context, identity, sections, onClose, busy = false, dirty = false, onDiscard, children, footer, selectedSection, onSectionChange }: {
  title: string; context: string; identity?: ReactNode; sections: { id: string; label: string; content: ReactNode }[];
  onClose: () => void; busy?: boolean; dirty?: boolean; onDiscard?: () => void; children?: ReactNode; footer?: ReactNode | ((requestClose: () => void) => ReactNode);
  selectedSection?: string; onSectionChange?: (id: string) => void;
}) {
  const id = useId(), [selected, setSelected] = useState(sections[0]?.id);
  const [categories, setCategories] = useState(false), [discard, setDiscard] = useState(false);
  const [pendingSection, setPendingSection] = useState<string | null>(null);
  const panel = useRef<HTMLElement>(null), categoryButton = useRef<HTMLButtonElement>(null), returnFocus = useRef<HTMLElement | null>(null);
  const current = sections.find((section) => section.id === (selectedSection ?? selected)) ?? sections[0];
  useEffect(() => {
    const dialog = panel.current?.closest("dialog"), viewport = window.visualViewport;
    if (!dialog || !viewport) return;
    const update = () => {
      // Scope keyboard geometry to Settings, including wide/landscape touch screens.
      // Pinch zoom remains native; never scale or clamp the user's zoom.
      if (viewport.scale !== 1) return;
      dialog.style.setProperty("--settings-viewport-height", `${viewport.height}px`);
      dialog.style.setProperty("--settings-viewport-top", `${viewport.offsetTop}px`);
      dialog.toggleAttribute("data-settings-short", viewport.height < 500);
    };
    update(); viewport.addEventListener("resize", update); viewport.addEventListener("scroll", update);
    return () => { viewport.removeEventListener("resize", update); viewport.removeEventListener("scroll", update); };
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const preventLoss = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", preventLoss);
    return () => window.removeEventListener("beforeunload", preventLoss);
  }, [dirty]);
  const keepEditing = () => { setDiscard(false); requestAnimationFrame(() => {
    if (returnFocus.current?.isConnected && returnFocus.current.checkVisibility()) returnFocus.current.focus();
    else panel.current?.querySelector<HTMLElement>(".scoped-settings-body :is(input,select,textarea,button)")?.focus();
  }); };
  const requestClose = () => {
    if (busy) return;
    if (dirty) { returnFocus.current = document.activeElement as HTMLElement; setPendingSection(null); setCategories(false); setDiscard(true); }
    else onClose();
  };
  const selectSection = (sectionId: string) => {
    setSelected(sectionId); setCategories(false); onSectionChange?.(sectionId);
    panel.current?.querySelector(".scoped-settings-body")?.scrollTo({ top: 0 });
    requestAnimationFrame(() => {
      if (categoryButton.current?.checkVisibility()) categoryButton.current.focus();
    });
  };
  const confirmation = discard ? <div className="settings-discard" role="alert" aria-labelledby={`${id}-discard`}>
    <h3 id={`${id}-discard`}>Discard your changes?</h3><p>Your unsaved changes will be lost.</p>
    <div className="overlay-actions"><button type="button" autoFocus onClick={keepEditing}>Keep editing</button><button type="button" className="danger" onClick={() => {
      if (pendingSection) { onDiscard?.(); setDiscard(false); selectSection(pendingSection); }
      else onClose();
    }}>Discard</button></div>
  </div> : null;
  return <ModalLayer onClose={() => {
    if (discard) keepEditing();
    else if (categories) { setCategories(false); categoryButton.current?.focus(); }
    else requestClose();
  }}><section ref={panel} className={`creation-panel scoped-settings-shell${categories ? " categories-open" : ""}`} aria-labelledby={`${id}-title`}>
    <header className="scoped-settings-header"><div className="scoped-settings-identity">{identity}<div><h2 id={`${id}-title`}>{title}</h2><p>{context}</p></div></div><button type="button" className="overlay-close" aria-label={`Close ${title}`} disabled={busy} onClick={requestClose}><X size={18} /></button></header>
    <div className="scoped-settings-layout">
      <button ref={categoryButton} type="button" className="settings-category-trigger" aria-expanded={categories} aria-controls={`${id}-sections`} disabled={busy || Boolean(children) || discard} onClick={() => setCategories(!categories)}>{current?.label}<ChevronDown size={16} aria-hidden="true" /></button>
      <nav id={`${id}-sections`} aria-label={`${title} sections`} className="scoped-settings-nav">{sections.map((section) => <button type="button" key={section.id} id={`${id}-${section.id}`} aria-current={current?.id === section.id ? "page" : undefined} disabled={busy || Boolean(children) || discard} onClick={() => {
        if (dirty && onDiscard && section.id !== current?.id) { returnFocus.current = document.activeElement as HTMLElement; setPendingSection(section.id); setCategories(false); setDiscard(true); }
        else selectSection(section.id);
      }}>{section.label}</button>)}</nav>
      <div className="scoped-settings-body" role="region" aria-label={current?.label}><div hidden={discard}>{children ?? current?.content}</div>{confirmation}</div>
    </div>{footer && !discard ? <SettingsFooter onClose={requestClose}>{footer}</SettingsFooter> : null}
  </section></ModalLayer>;
}
