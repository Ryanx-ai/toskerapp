"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Languages, Paperclip, Phone, Video } from "lucide-react";
import { DEVELOPMENT_REVIEW } from "@/config/app";

const capabilities = {
  files: { title: "Files & images", Icon: Paperclip, debt: "Deferred · MS7.6 P-001", detail: "Requires private storage, authorized metadata and signed delivery." },
  call: { title: "Call", Icon: Phone, debt: "Deferred · future communication foundation", detail: "Requires authorized media sessions, signaling and microphone permissions." },
  video: { title: "Video", Icon: Video, debt: "Deferred · future communication foundation", detail: "Requires media sessions, camera permissions and recovery." },
  translate: { title: "Translate", Icon: Languages, debt: "Deferred · future internationalization capability", detail: "Requires reviewed provider/on-device privacy, quality and cost contract." },
};

/** Development debt disclosure only: never opens permissions, pickers or mutations. */
export function DeferredControl({ kind, text = false }: { kind: keyof typeof capabilities; text?: boolean }) {
  const { title, Icon, debt, detail } = capabilities[kind];
  const id = useId(), panel = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null);
  const suppress = useRef(false), timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [visible, setVisible] = useState(false), [pinned, setPinned] = useState(false);
  const cancelTimer = () => { if (timer.current) clearTimeout(timer.current); };
  const reveal = () => { cancelTimer(); if (!suppress.current) setVisible(true); };
  const leave = () => { cancelTimer(); if (!pinned) timer.current = setTimeout(() => setVisible(false), 140); };
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => {
    const element = panel.current;
    if (!element || !visible) { element?.hidePopover(); return; }
    element.showPopover();
    const place = () => {
      const rect = trigger.current?.getBoundingClientRect(); if (!rect) return;
      element.style.left = `${Math.max(8, Math.min(rect.left, innerWidth - element.offsetWidth - 8))}px`;
      const above = rect.top - element.offsetHeight - 6;
      element.style.top = `${above >= 8 ? above : Math.max(8, Math.min(rect.bottom + 6, innerHeight - element.offsetHeight - 8))}px`;
    };
    place();
    const close = () => { suppress.current = true; setVisible(false); setPinned(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { event.preventDefault(); event.stopImmediatePropagation(); close(); trigger.current?.focus({ preventScroll: true }); } };
    const outside = (event: PointerEvent) => { if (!element.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) close(); };
    document.addEventListener("keydown", escape, true); document.addEventListener("pointerdown", outside); window.addEventListener("resize", close);
    return () => { element.hidePopover(); document.removeEventListener("keydown", escape, true); document.removeEventListener("pointerdown", outside); window.removeEventListener("resize", close); };
  }, [visible]);
  if (!DEVELOPMENT_REVIEW) return null;
  return <span className={`fp2-deferred ${text ? "with-text" : ""}`}>
    <button ref={trigger} type="button" className="fp2-deferred-trigger" aria-label={`${title} — deferred`} aria-describedby={visible ? id : undefined} aria-expanded={visible}
      onPointerEnter={() => { suppress.current = false; reveal(); }} onPointerLeave={leave}
      onFocus={reveal} onBlur={() => { suppress.current = false; setVisible(false); setPinned(false); }}
      onClick={() => { cancelTimer(); suppress.current = false; setVisible(true); setPinned(true); }}>
      <Icon size={17} aria-hidden="true" />{text ? <span>{title}<small>Deferred</small></span> : <span className="fp2-deferred-dot" aria-hidden="true">i</span>}
    </button>
    <div ref={panel} id={id} popover="manual" role="tooltip" className="fp2-deferred-info" onPointerEnter={cancelTimer} onPointerLeave={leave}>
      <strong>{title}</strong><small>{debt}</small><p>{detail}</p>
    </div>
  </span>;
}
