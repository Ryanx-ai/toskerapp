"use client";

import { useEffect } from "react";

export function useMobileViewport() {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const root = document.documentElement;
        // Keep browser zoom available; do not resize the app during pinch zoom.
        if (window.innerWidth > 640 || viewport.scale !== 1) {
          root.style.removeProperty("--app-viewport-height");
          root.style.removeProperty("--app-viewport-top");
          return;
        }
        root.style.setProperty("--app-viewport-height", `${Math.round(viewport.height)}px`);
        root.style.setProperty("--app-viewport-top", `${Math.round(viewport.offsetTop)}px`);
      });
    };
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      document.documentElement.style.removeProperty("--app-viewport-height");
      document.documentElement.style.removeProperty("--app-viewport-top");
    };
  }, []);
}
