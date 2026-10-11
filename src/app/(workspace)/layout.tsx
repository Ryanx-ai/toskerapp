import { ToskerSessionBoundary } from "@/components/tosker-session-boundary";
import { WorkspaceRealtimeProvider } from "@/components/workspace-realtime-provider";

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return <ToskerSessionBoundary><WorkspaceRealtimeProvider>{children}</WorkspaceRealtimeProvider></ToskerSessionBoundary>;
}
