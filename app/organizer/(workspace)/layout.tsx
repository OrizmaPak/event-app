import { AuthGuard } from "@/components/dashboard/AuthGuard";
import { OrganizerShell } from "@/components/dashboard/OrganizerShell";
export default function WorkspaceLayout({ children }: { children: React.ReactNode }) { return <AuthGuard><OrganizerShell>{children}</OrganizerShell></AuthGuard>; }
