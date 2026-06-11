import { SyncProvider } from "@/components/layout/SyncProvider";
import { HelpButton } from "@/components/help/HelpButton";

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <SyncProvider>
      {children}
      <HelpButton />
    </SyncProvider>
  );
}
