"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useToskerIdentity } from "./tosker-identity";
import { OwnProfileEditor } from "./own-profile-editor";

const categories = new Set(["profile","status","account","notifications","privacy","appearance","language","brand","support"]);
export function AccountSettings() {
  const identity = useToskerIdentity(), router = useRouter(), search = useSearchParams();
  const requested = search.get("section") ?? "profile";
  const selected = categories.has(requested) ? requested : "profile";
  if (!identity) return <p role="status">Sign in to manage your account.</p>;
  return <OwnProfileEditor identity={identity} accountMode selectedSection={selected} onSectionChange={id => router.push(`/settings?section=${id}`, {scroll:false})} onClose={() => router.push("/app")} />;
}
