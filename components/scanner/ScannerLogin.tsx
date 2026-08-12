"use client";

import Link from "next/link";
import { ArrowRight, Check, KeyRound, QrCode, ShieldCheck, UserRound } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Brand } from "@/components/shared/Brand";

export function ScannerLogin() {
  const search = useSearchParams();
  const [busy, setBusy] = useState(false);
  function submit(event: React.FormEvent) { event.preventDefault(); setBusy(true); window.localStorage.setItem("nasa-checkin-session", JSON.stringify({ staff: "John Oreva", code: "LUM-4826", role: "Supervisor" })); window.setTimeout(() => { window.location.href = search.get("returnTo") || "/check-in/events"; }, 500); }
  return <main className="scanner-login-page"><header><Brand inverse /><Link href="/organizer/login">Organizer dashboard</Link></header><div className="scanner-login-layout"><section className="scanner-login-copy"><span className="scanner-kicker"><i /> EVENT-DAY CHECK-IN</span><h1>Welcome every guest with confidence.</h1><p>This application is intentionally separate from the organizer dashboard. Staff see only the event and guest information they need at the door.</p><div className="scanner-login-features"><span><Check size={15} /> Fast QR verification</span><span><Check size={15} /> Seat and table details</span><span><Check size={15} /> Manual and offline backup</span></div></section><form className="scanner-login-card" onSubmit={submit}><span className="scanner-login-icon"><QrCode size={26} /></span><small>STAFF ACCESS</small><h2>Join the check-in team</h2><p>Enter the access code shared by your event supervisor.</p><label><span>Your name</span><div><UserRound size={18} /><input required defaultValue="John Oreva" /></div></label><label><span>Event access code</span><div><KeyRound size={18} /><input required defaultValue="LUM-4826" /></div></label><button type="submit">{busy ? "Checking access…" : <>Continue to event <ArrowRight size={18} /></>}</button><div className="scanner-security"><ShieldCheck size={17} /><span><b>Restricted access</b><small>Only guest verification for assigned events</small></span></div><em>Demo access is pre-filled. No real staff account is required.</em></form></div></main>;
}
