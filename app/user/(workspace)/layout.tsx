import { redirect } from "next/navigation";
import Link from "next/link";
import { CalendarDays, UserRound } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { UserSignOutButton } from "@/components/dashboard/UserSignOutButton";

export default async function UserWorkspaceLayout({ children }: { children: React.ReactNode }) {
  const current = await getCurrentUser();
  if (!current) redirect("/user/login");
  return <div className="dashboard-app"><aside className="dashboard-sidebar"><div className="dashboard-sidebar__brand"><Link className="brand-lockup brand-lockup--inverse" href="/"><span className="brand-symbol" aria-hidden="true"><i>N</i></span><span className="brand-word">NASA<span>.</span>EVENT</span></Link></div><nav className="dashboard-nav" aria-label="User navigation"><small>My access</small><Link href="/user"><CalendarDays size={17} /><span>Organizations and events</span></Link><Link href="/user/profile"><UserRound size={17} /><span>Profile</span></Link></nav><div className="dashboard-sidebar__foot"><UserSignOutButton /></div></aside><div className="dashboard-main"><header className="dashboard-topbar"><div><small>USER ACCOUNT</small><b>{current.user.firstName} {current.user.lastName}</b></div></header><main className="dashboard-content">{children}</main></div></div>;
}
