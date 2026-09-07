import { ToskerSessionBoundary } from "@/components/tosker-session-boundary";

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return <ToskerSessionBoundary>{children}</ToskerSessionBoundary>;
}
