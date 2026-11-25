"use client";

import { Check, LoaderCircle, X } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function AccountInvitationActions({ invitationId }: { invitationId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"accept" | "decline" | null>(null);
  const [error, setError] = useState("");

  async function act(action: "accept" | "decline") {
    if (busy) return;
    setBusy(action);
    setError("");
    try {
      const response = await fetch(`/api/v1/account/invitations/${invitationId}`, { method: action === "accept" ? "POST" : "DELETE" });
      const payload = await response.json().catch(() => ({})) as { error?: { message?: string } };
      if (!response.ok) {
        setError(payload.error?.message ?? "We could not update this invitation. Please try again.");
        return;
      }
      router.refresh();
    } catch {
      setError("We could not reach the server. Check your connection and try again.");
    } finally {
      setBusy(null);
    }
  }

  return <div className="account-invitation-actions">
    <div>
      <button className="button button--brand button--small" type="button" onClick={() => void act("accept")} disabled={busy !== null}>
        {busy === "accept" ? <LoaderCircle className="spin" size={14} /> : <Check size={14} />}
        {busy === "accept" ? "Accepting…" : "Accept"}
      </button>
      <button className="button button--danger button--small" type="button" onClick={() => void act("decline")} disabled={busy !== null}>
        {busy === "decline" ? <LoaderCircle className="spin" size={14} /> : <X size={14} />}
        {busy === "decline" ? "Declining…" : "Decline"}
      </button>
    </div>
    {error && <p role="alert">{error}</p>}
  </div>;
}
