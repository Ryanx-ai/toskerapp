/** No identity or conversation data is shown before the authorized page resolves. */
export default function WorkspaceLoading() {
  return <main className="workspace-opening" aria-busy="true"><p role="status">Opening Tosker…</p></main>;
}
