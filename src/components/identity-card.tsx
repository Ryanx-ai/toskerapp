import { PersonAvatar } from "@/components/identity-avatar";

export type IdentityCardProfile = {
  userId?: string;
  avatarUrl?: string | null;
  name: string;
  username: string;
  tid: string;
  initials: string;
  color: string;
  status: string;
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
    <article className={`namecard ${compact ? "namecard-compact" : ""}`}>
      <div className="namecard-banner" aria-hidden="true" />
      <PersonAvatar seed={profile.userId ?? profile.tid} initials={profile.initials} imageUrl={profile.avatarUrl} className="namecard-avatar" />
      <div className="namecard-body">
        <h2>{profile.name}</h2>
        <strong>{profile.username} · {profile.tid}</strong>
        <span className="presence">{profile.status}</span>
        {action}
      </div>
    </article>
  );
}
