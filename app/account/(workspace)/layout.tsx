import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, CalendarDays, Store, UserRound } from "lucide-react";
import { headers } from "next/headers";
import { UserSignOutButton } from "@/components/dashboard/UserSignOutButton";
import { getCurrentUser } from "@/lib/auth/session";

export default async function AccountWorkspaceLayout({ children }: { children: React.ReactNode }) {
  const current = await getCurrentUser();
  if (!current) {
    const path = (await headers()).get("x-app-path") ?? "/account";
    redirect(`/organizer/login?returnTo=${encodeURIComponent(path.startsWith("/account") ? path : "/account")}`);
  }

  const fullName = `${current.user.firstName} ${current.user.lastName}`.trim();
  const initials = fullName
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return <div className="dashboard-app"><aside className="dashboard-sidebar"><div className="dashboard-sidebar__brand"><Link className="brand-lockup brand-lockup--inverse" href="/"><span className="brand-symbol" aria-hidden="true"><i>N</i></span><span className="brand-word">NASA<span>.</span>EVENT</span></Link></div><nav className="dashboard-nav" aria-label="Account navigation"><small>My account</small><Link href="/account"><CalendarDays size={17} /><span>Organizations and events</span></Link><Link href="/account/resources"><Store size={17} /><span>Resources</span></Link><Link href="/account/create-organization"><Building2 size={17} /><span>Create organization</span></Link><Link href="/account/profile"><UserRound size={17} /><span>Profile</span></Link></nav><div className="dashboard-sidebar__foot"><UserSignOutButton /></div></aside><div className="dashboard-main"><header className="dashboard-topbar account-topbar"><div className="account-topbar__title"><small>PERSONAL ACCOUNT</small><strong>My workspace</strong></div><Link className="account-topbar__user" href="/account/profile" aria-label="Open account profile"><span className="account-topbar__avatar" aria-hidden="true">{initials}</span><span><b>{fullName}</b><small>{current.user.email}</small></span><UserRound size={15} aria-hidden="true" /></Link></header><main className="dashboard-content">{children}</main></div></div>;
}
