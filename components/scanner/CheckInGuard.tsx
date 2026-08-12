"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function CheckInGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!window.localStorage.getItem("nasa-checkin-session")) { window.location.replace(`/check-in/login?returnTo=${encodeURIComponent(pathname)}`); return; }
    const readyTimer = window.setTimeout(() => setReady(true), 0);
    return () => window.clearTimeout(readyTimer);
  }, [pathname]);
  if (!ready) return <div className="scanner-loading"><i>N</i><p>Preparing event-day check-in…</p></div>;
  return children;
}
