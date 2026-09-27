"use client";
import { useEffect, useId, useRef } from "react";

/** Native top layer escapes the sidebar's rounded clipping and sibling stacking contexts. */
export function WorkspaceTooltips() {
  const ref = useRef<HTMLDivElement>(null), id = useId();
  useEffect(() => {
    const panel = ref.current;
    if (!panel) return;
    let anchor: HTMLElement | null = null, timer: ReturnType<typeof setTimeout> | undefined;
    const close = () => {
      clearTimeout(timer);
      if (anchor?.getAttribute("aria-describedby") === id) anchor.removeAttribute("aria-describedby");
      anchor = null;
      if (panel.matches(":popover-open")) panel.hidePopover();
    };
    const show = (event: Event) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>(".messaging-app [data-tip], .sidebar-collapsed .conversation-row[data-name], .sidebar-collapsed .tooltip-item[data-tooltip]") : null;
      if (!target || target === anchor) return;
      close(); anchor = target;
      timer = setTimeout(() => {
        if (!target.isConnected || anchor !== target) return;
        panel.textContent = target.dataset.tip ?? target.dataset.name ?? target.dataset.tooltip ?? "";
        panel.showPopover();
        const rect = target.getBoundingClientRect(), gap = 8;
        const collapsed = Boolean(target.closest(".sidebar-collapsed"));
        const left = collapsed ? rect.right + gap : rect.left + (rect.width - panel.offsetWidth) / 2;
        const top = collapsed ? rect.top + (rect.height - panel.offsetHeight) / 2 : rect.top - panel.offsetHeight - gap;
        panel.style.left = `${Math.max(gap, Math.min(left, window.innerWidth - panel.offsetWidth - gap))}px`;
        panel.style.top = `${Math.max(gap, Math.min(top, window.innerHeight - panel.offsetHeight - gap))}px`;
        if (!target.hasAttribute("aria-describedby")) target.setAttribute("aria-describedby", id);
      }, event.type === "focusin" ? 0 : 250);
    };
    const leave = (event: Event) => {
      const next = (event as MouseEvent).relatedTarget;
      if (next instanceof Node && (anchor?.contains(next) || panel.contains(next))) return;
      clearTimeout(timer); timer = setTimeout(close, 120);
    };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    const hold = () => clearTimeout(timer);
    document.addEventListener("pointerover", show); document.addEventListener("focusin", show);
    document.addEventListener("pointerout", leave); document.addEventListener("focusout", leave);
    document.addEventListener("keydown", escape); document.addEventListener("pointerdown", close);
    window.addEventListener("resize", close); window.addEventListener("scroll", close, true);
    panel.addEventListener("pointerenter", hold); panel.addEventListener("pointerleave", leave);
    return () => {
      close(); document.removeEventListener("pointerover", show); document.removeEventListener("focusin", show);
      document.removeEventListener("pointerout", leave); document.removeEventListener("focusout", leave);
      document.removeEventListener("keydown", escape); document.removeEventListener("pointerdown", close);
      window.removeEventListener("resize", close); window.removeEventListener("scroll", close, true);
      panel.removeEventListener("pointerenter", hold); panel.removeEventListener("pointerleave", leave);
    };
  }, [id]);
  return <div ref={ref} id={id} role="tooltip" popover="manual" className="workspace-tooltip" />;
}
