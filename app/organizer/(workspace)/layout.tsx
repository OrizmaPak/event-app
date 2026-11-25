import { redirect } from "next/navigation";
import { OrganizerShell } from "@/components/dashboard/OrganizerShell";
import { getCurrentUser } from "@/lib/auth/session";
import { getOrganizerAccessState, getPlatformPrincipal, getWorkspacePrincipal } from "@/lib/auth/policy";
import { listDatabaseOrganizerEvents } from "@/lib/db/events";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const current = await getCurrentUser();
  if (!current) redirect("/organizer/login");
  const principal = await getWorkspacePrincipal();
  if (!principal) {
    if (await getPlatformPrincipal()) redirect("/platform");
    const access = await getOrganizerAccessState();
    if (access === "pending") redirect("/organizer/login?status=pending_approval");
    if (access === "blocked") redirect("/organizer/login?status=blocked");
    redirect("/organizer/login?status=no_workspace");
  }
  const events = await listDatabaseOrganizerEvents(principal.organizerId);
  return <OrganizerShell principal={{ name: principal.name, email: principal.email, role: principal.role, permissions: [...principal.permissions] }} events={events}>{children}</OrganizerShell>;
}
