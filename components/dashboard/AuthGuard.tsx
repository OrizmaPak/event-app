"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const session = window.localStorage.getItem("nasa-organizer-session");
    if (!session) {
      window.location.replace(`/organizer/login?returnTo=${encodeURIComponent(pathname)}`);
      return;
    }
    let active = true;
    const parsed = JSON.parse(session) as { email?: string };
    fetch("/api/auth/demo", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: parsed.email }) }).finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, [pathname]);

  if (!ready) return <div className="auth-loading"><span className="brand-symbol"><i>N</i></span><p>Opening your organizer workspace…</p></div>;
  return children;
}
