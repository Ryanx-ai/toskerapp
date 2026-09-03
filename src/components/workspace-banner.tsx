export function WorkspaceBanner({
  eyebrow,
  title,
  body,
  intensity = "medium",
  action,
}: {
  eyebrow?: string;
  title: string;
  body?: string;
  intensity?: "quiet" | "medium" | "hero";
  action?: React.ReactNode;
}) {
  return (
    <header className={`workspace-banner banner-${intensity}`}>
      <div className="workspace-banner-copy">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {body ? <p>{body}</p> : null}
        {action}
      </div>
      <div className="workspace-banner-art" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
    </header>
  );
}
