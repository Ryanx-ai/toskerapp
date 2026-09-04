export type IdentityCardProfile = {
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
      <span className={`avatar avatar-${profile.color} namecard-avatar`}>
        {profile.initials}
      </span>
      <div className="namecard-body">
        <h2>{profile.name}</h2>
        <strong>{profile.username} · {profile.tid}</strong>
        <span className="presence">{profile.status}</span>
        {action}
      </div>
    </article>
  );
}
