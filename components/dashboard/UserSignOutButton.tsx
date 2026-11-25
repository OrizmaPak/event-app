"use client";

import { LogOut } from "lucide-react";

export function UserSignOutButton() {
  async function signOut() {
    await fetch("/api/v1/auth/logout", { method: "POST" }).catch(() => undefined);
    window.location.href = "/user/login";
  }
  return <button type="button" onClick={() => void signOut}><LogOut size={17} /><span>Sign out</span></button>;
}
