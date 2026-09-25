import { PersonAvatar } from "@/components/identity-avatar";
import type { IdentityAccent, IdentityBanner, IdentityFrame } from "@/lib/profile-contract";
import { CopyTid } from "./copy-tid";
import { RevealName } from "./reveal-name";

export type IdentityCardProfile = {
  userId?: string;
  avatarUrl?: string | null;
  name: string;
  username: string;
  tid: string;
  initials: string;
  color: string;
  status: string;
  identityAccent?: IdentityAccent;
  identityBanner?: IdentityBanner;
  identityFrame?: IdentityFrame;
};

export function IdentityCard({
  profile,
  action,
  compact = false,
  label,
  preview = false,
}: {
  profile: IdentityCardProfile;
  label: string;
  action?: React.ReactNode;
  compact?: boolean;
  preview?: boolean;
}) {
  return (
    <article aria-label={label} className={`namecard identity-accent-${profile.identityAccent ?? "neutral"} ${compact ? "namecard-compact" : ""}`} data-identity-banner={profile.identityBanner ?? "glow"} data-identity-frame={profile.identityFrame ?? "none"}>
      <div className="namecard-banner" aria-hidden="true" />
      <PersonAvatar seed={profile.userId ?? profile.tid} initials={profile.initials} imageUrl={profile.avatarUrl} className="namecard-avatar" />
      <div className="namecard-body">
        {preview ? <h4><RevealName focusable>{profile.name}</RevealName></h4> : <h2><RevealName focusable>{profile.name}</RevealName></h2>}
        <p className="identity-username">@{profile.username.replace(/^@/,"")}</p>
        <p className="identity-tid">TID {profile.tid}</p>
        {!compact && !preview ? <CopyTid tid={profile.tid} /> : null}
        {profile.status ? <span className="presence">{profile.status}</span> : null}
        {action}
      </div>
    </article>
  );
}
