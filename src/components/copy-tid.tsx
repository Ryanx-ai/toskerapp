"use client";
import { useState } from "react";
import { Copy } from "lucide-react";
import { isCanonicalTid } from "@/lib/tid-contract";

export function CopyTid({ tid }: { tid: string }) {
  const [feedback,setFeedback]=useState("");
  if(!isCanonicalTid(tid)) return null;
  return <span className="tid-copy"><button className="quiet-action" type="button" aria-label="Copy TID" onClick={async()=>{
    try { await navigator.clipboard.writeText(tid); setFeedback("TID copied."); }
    catch { setFeedback("Couldn't copy. Select the TID and copy it manually."); }
  }}><Copy size={14} aria-hidden="true" />Copy TID</button><span role="status" aria-atomic="true">{feedback}</span></span>;
}
