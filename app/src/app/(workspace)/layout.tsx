import { SyncProvider } from "@/components/layout/SyncProvider";

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return <SyncProvider>{children}</SyncProvider>;
}
