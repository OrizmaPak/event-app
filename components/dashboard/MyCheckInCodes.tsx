"use client";

import Link from "next/link";
import { ArrowRight, Check, Clipboard, Eye, KeyRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface PersonalCode { code: string | null; needsReplacement: boolean; eventSlug: string; eventTitle: string; organizerName: string; expiresAt: string }

export function MyCheckInCodes() {
  const [codes, setCodes] = useState<PersonalCode[] | null>(null);
  const [visible, setVisible] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState("");
  const revealTimer = useRef<number | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/v1/account/check-in-codes").then(async (response) => ({ response, body: await response.json() as { data?: { codes: PersonalCode[] } } })).then(({ response, body }) => {
      if (!active) return;
      if (response.ok) setCodes(body.data?.codes ?? []);
      else setCodes([]);
    }).catch(() => { if (active) setError("Your check-in codes could not be loaded."); });
    return () => { active = false; if (revealTimer.current) window.clearTimeout(revealTimer.current); };
  }, []);

  function reveal(slug: string) {
    setVisible(slug);
    if (revealTimer.current) window.clearTimeout(revealTimer.current);
    revealTimer.current = window.setTimeout(() => { setVisible((current) => current === slug ? null : current); revealTimer.current = null; }, 10_000);
  }

  async function copy(code: PersonalCode) {
    try {
      if (!code.code) return;
      await navigator.clipboard.writeText(code.code);
      setCopied(code.eventSlug);
      window.setTimeout(() => setCopied((current) => current === code.eventSlug ? null : current), 1800);
    } catch { setError("The code could not be copied. Reveal it and copy manually."); }
  }

  if (!codes?.length) return null;
  return <section className="personal-checkin-codes"><header><span><KeyRound size={17} /></span><div><small>EVENT-DAY ACCESS</small><h2>Your staff codes</h2><p>Each code opens its assigned event and identifies you. Keep it private.</p></div></header>{error && <p role="alert">{error}</p>}<div>{codes.map((item) => <article key={item.eventSlug}><div><b>{item.eventTitle}</b><small>{item.organizerName} · Expires {new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.expiresAt))}</small></div><code>{visible === item.eventSlug && item.code ? item.code : "••••••••••••••••••"}</code>{item.needsReplacement && <p className="personal-checkin-codes__notice">This code predates secure code viewing. Contact the event creator to replace it.</p>}<div className="personal-checkin-codes__actions"><button type="button" onClick={() => reveal(item.eventSlug)} disabled={!item.code} title="Reveal for 10 seconds" aria-label={`Reveal ${item.eventTitle} code for 10 seconds`}><Eye size={16} /><span>{visible === item.eventSlug ? "Visible" : "Reveal"}</span></button><button type="button" onClick={() => void copy(item)} disabled={!item.code} aria-label={`Copy ${item.eventTitle} code`}>{copied === item.eventSlug ? <Check size={16} /> : <Clipboard size={16} />}<span>{copied === item.eventSlug ? "Copied" : "Copy"}</span></button><Link href={`/check-in/${item.eventSlug}`}><span>Open check-in</span><ArrowRight size={15} /></Link></div></article>)}</div></section>;
}
