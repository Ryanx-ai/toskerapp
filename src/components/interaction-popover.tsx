"use client";
import { useEffect, useRef, type ReactNode } from "react";

/** Browser top-layer popover; never clipped by a message/board scroll container. */
export function InteractionPopover({ anchor, onClose, label, children }: { anchor: HTMLElement | null; onClose: () => void; label: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  useEffect(() => {
    const panel = ref.current;
    if (!panel) return;
    const previous = document.activeElement as HTMLElement | null;
    document.querySelectorAll<HTMLElement>(".interaction-popover:popover-open").forEach((other) => { if (other !== panel) other.hidePopover(); });
    panel.showPopover();
    const place = () => {
      const rect = anchor?.getBoundingClientRect();
      const width = panel.offsetWidth, height = panel.offsetHeight;
      panel.style.left = `${Math.max(8, Math.min(rect?.left ?? 8, window.innerWidth - width - 8))}px`;
      panel.style.top = `${Math.max(8, Math.min(rect?.bottom ?? 80, window.innerHeight - height - 8))}px`;
    };
    place();
    const observer = new ResizeObserver(place); observer.observe(panel);
    const dismiss = () => closeRef.current();
    // Native auto light-dismiss can close a context menu on the same right-button
    // release that opened it. Dismiss on the next outside press instead.
    const outside = (event: PointerEvent) => { if (!panel.contains(event.target as Node)) dismiss(); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); dismiss(); } };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape, true);
    window.addEventListener("resize", dismiss);
    (panel.querySelector<HTMLElement>("input:not(:disabled),button:not(:disabled),a[href]") ?? panel).focus();
    return () => { observer.disconnect(); document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape, true); window.removeEventListener("resize", dismiss); if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, [anchor]);
  return <div ref={ref} popover="manual" className="interaction-popover" role="dialog" aria-label={label} tabIndex={-1}
    onToggle={(event) => { if (event.newState === "closed") closeRef.current(); }}
    onKeyDown={(event) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) return;
      if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
      const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("button:not(:disabled),a[href]"));
      const index = buttons.indexOf(document.activeElement as HTMLElement);
      const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length;
      event.preventDefault(); buttons[next]?.focus();
    }}>{children}</div>;
}
