"use client";
import { useEffect, useRef, type CSSProperties } from "react";

/** One line at rest. Deliberate hover/focus reveals the tail without reflow.
 * Touch/reduced-motion readers can scroll the line; the full text stays in the DOM. */
export function RevealName({ children, focusable = false }: { children: string; focusable?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const measure = () => {
      const distance = Math.max(0, (node.firstElementChild?.scrollWidth ?? 0) - node.clientWidth);
      node.style.setProperty("--name-shift", `${-distance}px`);
      node.style.setProperty("--name-duration", `${Math.max(1, Math.min(8, distance / 55))}s`);
      node.dataset.overflow = String(distance > 1);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    if (node.firstElementChild) observer.observe(node.firstElementChild);
    void document.fonts.ready.then(measure);
    measure();
    return () => observer.disconnect();
  }, [children]);
  return <span ref={ref} className="reveal-name" tabIndex={focusable ? 0 : undefined} title={children} style={{"--name-shift":"0px"} as CSSProperties}><span>{children}</span></span>;
}
