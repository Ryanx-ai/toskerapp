"use client";

import { cloneElement, isValidElement, useEffect, useRef, type HTMLAttributes, type ReactNode } from "react";

/** Native top layer escapes transformed/isolated workspace ancestors. */
export function ModalLayer({ children, onClose, dismissOutside = true, dismissEscape = true }: { children: ReactNode; onClose: () => void; dismissOutside?: boolean; dismissEscape?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const panel = isValidElement<HTMLAttributes<HTMLElement>>(children) ? children : null;
  const labelledBy = panel?.props["aria-labelledby"];
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    return () => { dialog?.close(); if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, []);
  return <dialog ref={ref} className="modal-layer" aria-labelledby={labelledBy} aria-label={labelledBy ? undefined : panel?.props["aria-label"] ?? "Tosker dialog"}
    onKeyDownCapture={(event) => { if (!dismissEscape && event.key === "Escape") { event.preventDefault(); event.stopPropagation(); } }}
    onCancel={(event) => { event.preventDefault(); if (dismissEscape) onClose(); }}
    onClick={(event) => { if (dismissOutside && event.target === event.currentTarget) onClose(); }}>
    {panel ? cloneElement(panel, { role: undefined, "aria-modal": undefined }) : children}
  </dialog>;
}
