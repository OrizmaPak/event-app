"use client";

import { LogOut } from "lucide-react";
import { useState } from "react";

export function PlatformHeaderActions({ name, role }: { name: string; role: string }) {
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    await fetch("/api/v1/auth/logout", { method: "POST" }).catch(() => null);
    window.location.href = "/organizer/login";
  }

  return <div className="platform-header-actions"><span>{name} · {role.replaceAll("_", " ")}</span><button className="platform-signout" type="button" onClick={() => void signOut()} disabled={busy}><LogOut size={16} /> {busy ? "Signing out…" : "Sign out"}</button></div>;
}
