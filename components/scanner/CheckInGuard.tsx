"use client";

import { CalendarDays, KeyRound, LoaderCircle, QrCode, ShieldCheck, Ticket } from "lucide-react";
import { useEffect, useState } from "react";

function formatStaffCodeInput(value: string) {
  const clean = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 32);
  if (!/^\d*$/.test(clean) || clean.length > 12) return clean;
  return clean.match(/.{1,4}/g)?.join("-") ?? clean;
}

export function CheckInGuard({ children, eventSlug }: { children: React.ReactNode; eventSlug?: string }) {
  const [ready, setReady] = useState(false);
  const [codeRequired, setCodeRequired] = useState(false);
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch(`/api/v1/check-in/staff-access${eventSlug ? `?eventSlug=${encodeURIComponent(eventSlug)}` : ""}`)
      .then(async (response) => ({
        response,
        body: await response.json() as { data?: { eventSlug?: string }; error?: { code?: string; message?: string }; fieldErrors?: { eventSlug?: string } },
      }))
      .then(({ response, body }) => {
        if (!active) return;
        if (response.ok && body.data?.eventSlug) {
          if (eventSlug && body.data.eventSlug === eventSlug) setReady(true);
          else window.location.replace(`/check-in/${body.data.eventSlug}`);
          return;
        }
        const assignedEventSlug = body.fieldErrors?.eventSlug ?? body.data?.eventSlug;
        if (body.error?.code === "WRONG_EVENT" && assignedEventSlug) {
          setError(`This code belongs to another event. Opening ${assignedEventSlug}…`);
          window.location.replace(`/check-in/${assignedEventSlug}`);
          return;
        }
        setCodeRequired(true);
      })
      .catch(() => { if (active) setCodeRequired(true); });
    return () => { active = false; };
  }, [eventSlug]);

  async function submitCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setChecking(true);
    setError("");
    try {
      const response = await fetch("/api/v1/check-in/staff-access", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const body = await response.json() as { data?: { eventSlug: string }; error?: { message?: string } };
      if (!response.ok) { setError(body.error?.message ?? "The staff code could not be verified."); return; }
      window.location.replace(`/check-in/${body.data!.eventSlug}`);
    } catch {
      setError("The staff code could not be verified. Check your connection and try again.");
    } finally {
      setChecking(false);
    }
  }

  if (codeRequired && !ready) {
    return (
      <main className="scanner-code-gate">
        <section className="scanner-code-gate__intro">
          <div className="scanner-code-gate__brand"><i>N</i><b>NASA EVENT</b><span>STAFF PORTAL</span></div>
          <small className="scanner-code-gate__eyebrow">CHECK-IN OPERATIONS <i /></small>
          <h1>Your shift<br />starts here<span>.</span></h1>
          <p>One personal code opens the event you are assigned to.</p>
          <div className="scanner-code-gate__objects" aria-hidden="true">
            <div className="event-float event-float--ticket"><Ticket size={19} /><span>ENTRY PASS</span><b>STAFF</b><i>•••• · •••• · ••••</i></div>
            <div className="event-float event-float--calendar"><CalendarDays size={20} /><span>AUG</span><b>24</b></div>
            <div className="event-float event-float--scan"><QrCode size={30} /><small>READY TO SCAN</small></div>
            <i className="event-confetti event-confetti--one" />
            <i className="event-confetti event-confetti--two" />
            <i className="event-confetti event-confetti--three" />
            <i className="event-confetti event-confetti--four" />
          </div>
          <footer><b>ENTRY CONTROL</b><span>01 <i /> STAFF ACCESS</span></footer>
        </section>

        <section className="scanner-code-gate__panel">
          <div className="scanner-code-gate__form-wrap">
            <span className="scanner-code-gate__icon"><KeyRound size={22} /></span>
            <small className="scanner-code-gate__label">STAFF VERIFICATION</small>
            <h2>Enter your code</h2>
            <p>Keep your code private. Contact the event creator if you need a replacement.</p>
            <form className="scanner-code-gate__form" onSubmit={submitCode}>
              {error && <div className="scanner-code-gate__error" role="alert">{error}</div>}
              <label htmlFor="staff-access-code">Your staff code</label>
              <input
                id="staff-access-code"
                autoComplete="one-time-code"
                autoFocus
                required
                maxLength={38}
                value={code}
                onChange={(event) => setCode(formatStaffCodeInput(event.target.value))}
                placeholder="0000-0000-0000"
                aria-describedby="staff-code-help"
              />
              <small id="staff-code-help">12 digits · assigned to you by the event creator</small>
              <button type="submit" disabled={checking || code.replace(/[^A-Z0-9]/gi, "").length < 12}>
                {checking ? <><LoaderCircle className="spin" size={17} /> Checking access…</> : <><ShieldCheck size={17} /> Open check-in</>}
              </button>
            </form>
            <div className="scanner-code-gate__privacy"><ShieldCheck size={16} /><span><b>Private staff access</b><small>Your code only opens your assigned event.</small></span></div>
          </div>
          <div className="scanner-code-gate__panel-foot"><span>SECURE ENTRY</span><span>NASA EVENT <i>·</i> CHECK-IN</span></div>
        </section>
      </main>
    );
  }
  if (!ready) return <div className="scanner-loading"><i>N</i><p>Preparing event-day check-in…</p></div>;
  return children;
}
