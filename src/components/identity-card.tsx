import { PersonAvatar } from "@/components/identity-avatar";
import type { IdentityAccent } from "@/lib/profile-contract";

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
};

export function IdentityCard({
  profile,
  action,
  compact = false,
}: {
  profile: IdentityCardProfile;
  label: string;
  action?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <article className={`namecard identity-accent-${profile.identityAccent ?? "neutral"} ${compact ? "namecard-compact" : ""}`}>
      <div className="namecard-banner" aria-hidden="true" />
      <PersonAvatar seed={profile.userId ?? profile.tid} initials={profile.initials} imageUrl={profile.avatarUrl} className="namecard-avatar" />
      <div className="namecard-body">
        <h2>{profile.name}</h2>
        <strong>{profile.username} · {profile.tid}</strong>
        {profile.status ? <span className="presence">{profile.status}</span> : null}
        {action}
      </div>
    </article>
  );
}
