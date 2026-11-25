"use client";

import Link from "next/link";
import { ArrowRight, Check, Clipboard, CloudDownload, Eye, KeyRound, LoaderCircle, QrCode, RefreshCw, ShieldCheck, Smartphone, UserRound, Wifi } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface CheckInStaff {
  userId: string;
  name: string;
  email: string;
  roleName: string;
  hasCode: boolean;
  codeStatus: "issued" | "disabled" | "not_issued";
  codeRetrievable: boolean;
  expiresAt: string | null;
}

function formatStaffCode(value: string) {
  return (
    value
      .replaceAll("-", "")
      .match(/.{1,4}/g)
      ?.join("-") ?? value
  );
}

export function CheckInSetup({ eventSlug }: { eventSlug: string }) {
  const [staff, setStaff] = useState<CheckInStaff[]>([]);
  const [viewerUserId, setViewerUserId] = useState("");
  const [canIssueCodes, setCanIssueCodes] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyUser, setBusyUser] = useState("");
  const [code, setCode] = useState<{
    userId: string;
    name: string;
    value: string;
    expiresAt: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [codeVisible, setCodeVisible] = useState(false);
  const [revealedStaffCode, setRevealedStaffCode] = useState<{
    userId: string;
    value: string;
  } | null>(null);
  const [revealingUser, setRevealingUser] = useState("");
  const [error, setError] = useState("");
  const revealTimer = useRef<number | null>(null);
  const staffRevealTimer = useRef<number | null>(null);

  const loadStaff = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/v1/workspaces/current/events/${encodeURIComponent(eventSlug)}/staff-codes`);
      const body = (await response.json()) as {
        data?: {
          staff: CheckInStaff[];
          viewerUserId?: string;
          canIssueCodes?: boolean;
        };
        error?: { message?: string };
      };
      if (!response.ok || !body.data) {
        setError(body.error?.message ?? "Staff access could not be loaded.");
        return;
      }
      setStaff(body.data.staff);
      setViewerUserId(body.data.viewerUserId ?? "");
      setCanIssueCodes(Boolean(body.data.canIssueCodes));
    } catch {
      setError("Staff access could not be loaded. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [eventSlug]);

  useEffect(() => {
    void loadStaff();
  }, [loadStaff]);
  useEffect(
    () => () => {
      if (revealTimer.current) window.clearTimeout(revealTimer.current);
      if (staffRevealTimer.current) window.clearTimeout(staffRevealTimer.current);
    },
    [],
  );

  async function issueCode(member: CheckInStaff) {
    setBusyUser(member.userId);
    setError("");
    try {
      const response = await fetch(`/api/v1/workspaces/current/events/${encodeURIComponent(eventSlug)}/staff-codes`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: member.userId }),
      });
      const body = (await response.json()) as {
        data?: {
          code: string;
          expiresAt: string;
          staff: { userId: string; name: string };
        };
        error?: { message?: string };
      };
      if (!response.ok || !body.data) {
        setError(body.error?.message ?? "A personal staff code could not be issued.");
        return;
      }
      if (revealTimer.current) window.clearTimeout(revealTimer.current);
      if (staffRevealTimer.current) window.clearTimeout(staffRevealTimer.current);
      setRevealedStaffCode(null);
      setCodeVisible(false);
      setCode({
        userId: body.data.staff.userId,
        name: body.data.staff.name,
        value: body.data.code,
        expiresAt: body.data.expiresAt,
      });
      setStaff((rows) =>
        rows.map((row) =>
          row.userId === member.userId
            ? {
                ...row,
                hasCode: true,
                codeStatus: "issued",
                codeRetrievable: true,
                expiresAt: body.data!.expiresAt,
              }
            : row,
        ),
      );
    } catch {
      setError("A personal staff code could not be issued. Check your connection and try again.");
    } finally {
      setBusyUser("");
    }
  }

  async function copyStaffCode(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("The code could not be copied. Select and copy it manually.");
    }
  }

  async function copyCode() {
    if (code) await copyStaffCode(code.value);
  }

  async function disableCode(member: CheckInStaff) {
    setBusyUser(member.userId);
    setError("");
    try {
      const response = await fetch(`/api/v1/workspaces/current/events/${encodeURIComponent(eventSlug)}/staff-codes`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: member.userId }),
      });
      const body = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) {
        setError(body.error?.message ?? "This staff code could not be disabled.");
        return;
      }
      setStaff((rows) => rows.map((row) => (row.userId === member.userId ? { ...row, hasCode: false, codeStatus: "disabled", expiresAt: null } : row)));
      setCode((activeCode) => (activeCode?.userId === member.userId ? null : activeCode));
      setRevealedStaffCode((activeCode) => (activeCode?.userId === member.userId ? null : activeCode));
    } catch {
      setError("This staff code could not be disabled. Check your connection and try again.");
    } finally {
      setBusyUser("");
    }
  }

  async function revealMemberCode(member: CheckInStaff) {
    if (!member.codeRetrievable) return;
    if (revealedStaffCode?.userId === member.userId) {
      setRevealedStaffCode(null);
      if (staffRevealTimer.current) window.clearTimeout(staffRevealTimer.current);
      return;
    }
    setRevealingUser(member.userId);
    setError("");
    try {
      const response = await fetch(`/api/v1/workspaces/current/events/${encodeURIComponent(eventSlug)}/staff-codes?userId=${encodeURIComponent(member.userId)}`, { cache: "no-store" });
      const body = (await response.json()) as {
        data?: { code: string; userId: string };
        error?: { message?: string };
      };
      if (!response.ok || !body.data) {
        setError(body.error?.message ?? "This staff code could not be revealed.");
        return;
      }
      setRevealedStaffCode({ userId: member.userId, value: body.data.code });
      if (staffRevealTimer.current) window.clearTimeout(staffRevealTimer.current);
      staffRevealTimer.current = window.setTimeout(() => {
        setRevealedStaffCode((current) => (current?.userId === member.userId ? null : current));
        staffRevealTimer.current = null;
      }, 10_000);
    } catch {
      setError("This staff code could not be revealed. Check your connection and try again.");
    } finally {
      setRevealingUser("");
    }
  }

  function revealCode() {
    if (!code) return;
    setCodeVisible(true);
    if (revealTimer.current) window.clearTimeout(revealTimer.current);
    revealTimer.current = window.setTimeout(() => {
      setCodeVisible(false);
      revealTimer.current = null;
    }, 10_000);
  }

  const ownStaff = staff.find((member) => member.userId === viewerUserId);
  const ownCodeVisible = Boolean(ownStaff && ((codeVisible && code?.userId === ownStaff.userId) || revealedStaffCode?.userId === ownStaff.userId));
  const ownCode = ownStaff ? (code?.userId === ownStaff.userId && codeVisible ? code.value : revealedStaffCode?.userId === ownStaff.userId ? revealedStaffCode.value : null) : null;
  const maskedCode = "••••-••••-••••";

  return (
    <div className="checkin-setup-layout">
      <section>
        <article className="checkin-hero-card">
          <div>
            <span className="dashboard-eyebrow">EVENT-DAY APP</span>
            <h2>Your welcome desk has one simple job.</h2>
            <p>Check-in staff sign in with their own invited account and only see events assigned to them.</p>
            <div>
              <Link className="button button--white" href="/check-in/login" target="_blank">
                Open check-in app <ArrowRight size={15} />
              </Link>
              <button className="button checkin-ghost" type="button">
                <QrCode size={15} /> Run a test scan
              </button>
            </div>
          </div>
          <span className="checkin-device-art">
            <i>
              <QrCode size={46} />
            </i>
            <small>READY TO SCAN</small>
            <b>Entrance A</b>
          </span>
        </article>
        <div className="dashboard-panel setup-checklist">
          <div className="panel-heading">
            <div>
              <small>PREPARATION</small>
              <h2>Event-day checklist</h2>
            </div>
            <span className="pill pill--success">4 of 5 ready</span>
          </div>
          <div className="checklist-rows">
            <div className="done">
              <span>
                <Check size={16} />
              </span>
              <p>
                <b>Guest passes are active</b>
                <small>Guest passes are ready for event entry.</small>
              </p>
              <em>Ready</em>
            </div>
            <div className="done">
              <span>
                <Check size={16} />
              </span>
              <p>
                <b>Staff access is event-scoped</b>
                <small>Staff accounts can only access their assigned events.</small>
              </p>
              <em>Ready</em>
            </div>
            <div className="done">
              <span>
                <Check size={16} />
              </span>
              <p>
                <b>Manual lookup available</b>
                <small>Search guests if a pass cannot be scanned.</small>
              </p>
              <em>Ready</em>
            </div>
            <div>
              <span>4</span>
              <p>
                <b>Issue personal staff codes</b>
                <small>Each eligible team member gets a separate code.</small>
              </p>
              <a href="#staff-access">Manage staff</a>
            </div>
          </div>
        </div>
      </section>
      <aside>
        <article className="dashboard-panel staff-access-card" id="staff-access">
          <span className="metric-icon metric-icon--violet">
            <KeyRound size={19} />
          </span>
          <small>PERSONAL STAFF CODES</small>
          <h2>Unique to each person</h2>
          <p>Event-specific codes expire after the event.</p>
          <div className="staff-code-warning" role="note">
            <ShieldCheck size={17} />
            <span>
              <b>Keep your code private</b>
              <small>Only the event creator can issue or replace codes.</small>
            </span>
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {ownStaff?.hasCode && (
            <div className="staff-code-reveal staff-code-reveal--personal">
              <span>
                <small>YOUR EVENT ACCESS CODE</small>
                <button className="staff-code-value" type="button" disabled={!ownCode} onClick={() => ownCode && void copyStaffCode(ownCode)} title={ownCode ? "Click to copy" : undefined}>
                  {ownCode ? formatStaffCode(ownCode) : maskedCode}
                </button>
                <small>{copied ? "Copied" : ownCodeVisible ? "Visible · click to copy" : ownStaff.codeRetrievable ? "Reveal to view" : "Ask the creator to replace this code"}</small>
              </span>
              {ownStaff.codeRetrievable && (
                <button className="staff-code-eye" type="button" onClick={() => void revealMemberCode(ownStaff)} disabled={Boolean(revealingUser)} aria-label={ownCodeVisible ? "Hide your staff code" : "Reveal your staff code for 10 seconds"} title={ownCodeVisible ? "Hide code" : "Reveal for 10 seconds"}>
                  {revealingUser === ownStaff.userId ? <LoaderCircle className="spin" size={16} /> : <Eye size={16} />}
                  <span>{ownCodeVisible ? "Hide" : "Reveal"}</span>
                </button>
              )}
            </div>
          )}
          {code && code.userId !== ownStaff?.userId && (
            <div className="staff-code-reveal">
              <span>
                <small>NEW CODE FOR {code.name.toUpperCase()}</small>
                <button className="staff-code-value" type="button" disabled={!codeVisible} onClick={() => void copyStaffCode(code.value)} title={codeVisible ? "Click to copy" : undefined}>
                  {codeVisible ? formatStaffCode(code.value) : maskedCode}
                </button>
                <small>{copied ? "Copied" : codeVisible ? "Visible · click to copy" : "Reveal to view"}</small>
              </span>
              <div>
                <button className="staff-code-eye" type="button" onClick={revealCode} aria-label="Reveal code for 10 seconds" title="Reveal for 10 seconds">
                  <Eye size={16} />
                  <span>Reveal 10s</span>
                </button>
                <button className="button button--brand button--small" type="button" onClick={() => void copyCode()}>
                  <Clipboard size={14} /> {copied ? "Copied" : "Copy code"}
                </button>
              </div>
            </div>
          )}
          {ownStaff && !ownStaff.hasCode && (
            <div className="staff-code-reveal staff-code-reveal--personal">
              <span>
                <small>YOUR EVENT ACCESS CODE</small>
                <b>{ownStaff.codeStatus === "disabled" ? "Disabled" : "Not issued"}</b>
                {ownStaff.codeStatus === "not_issued" && <small>Ask the event creator for access.</small>}
              </span>
            </div>
          )}
          <div className="staff-code-list">
            <div className="staff-code-list__head">
              <b>Eligible staff</b>
              {canIssueCodes && (
                <button type="button" onClick={() => void loadStaff()} disabled={loading || Boolean(busyUser)} aria-label="Refresh staff list">
                  <RefreshCw size={15} />
                </button>
              )}
            </div>
            {loading ? (
              <p className="staff-code-empty">
                <LoaderCircle className="spin" size={16} /> Loading staff…
              </p>
            ) : staff.length ? (
              staff.map((member) => (
                <div className="staff-code-row" key={member.userId}>
                  <span>
                    <UserRound size={16} />
                  </span>
                  <p>
                    <b>{member.name}</b>
                    <small>
                      {member.email} · {member.roleName}
                    </small>
                  </p>
                  <em className={`staff-code-status staff-code-status--${member.codeStatus}`}>{member.codeStatus === "issued" ? "Issued" : member.codeStatus === "disabled" ? "Disabled" : "Not issued"}</em>
                  {canIssueCodes && (
                    <div className="staff-code-row__actions">
                      <button className="staff-code-issue" type="button" onClick={() => void issueCode(member)} disabled={Boolean(busyUser) || !canIssueCodes} title={canIssueCodes ? "Issue or replace this staff member's code" : "Only the event creator can issue staff codes"}>
                        {busyUser === member.userId ? <LoaderCircle className="spin" size={15} /> : member.hasCode ? <RefreshCw size={15} /> : <KeyRound size={15} />}
                        <span>{busyUser === member.userId ? "Working…" : member.hasCode ? (member.codeRetrievable ? "New code" : "Replace code") : "Issue code"}</span>
                      </button>
                      {member.hasCode && canIssueCodes && (
                        <button className="staff-code-disable" type="button" onClick={() => void disableCode(member)} disabled={Boolean(busyUser)}>
                          {busyUser === member.userId ? <LoaderCircle className="spin" size={15} /> : <ShieldCheck size={15} />}
                          <span>Disable</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="staff-code-empty">No active team members with check-in access are assigned to this event.</p>
            )}
          </div>
        </article>
        <article className="dashboard-panel setup-methods">
          <div className="panel-heading">
            <div>
              <small>ENTRY METHODS</small>
              <h2>Primary and backup</h2>
            </div>
          </div>
          <div>
            <span>
              <Smartphone size={18} />
            </span>
            <p>
              <b>iPad or phone camera</b>
              <small>Primary QR scan</small>
            </p>
            <em className="pill pill--success">Ready</em>
          </div>
          <div>
            <span>
              <QrCode size={18} />
            </span>
            <p>
              <b>Bluetooth scanner</b>
              <small>Backup hardware input</small>
            </p>
            <em className="pill pill--success">Enabled</em>
          </div>
          <div>
            <span>
              <Wifi size={18} />
            </span>
            <p>
              <b>Manual guest search</b>
              <small>Works with cached roster</small>
            </p>
            <em className="pill pill--success">Ready</em>
          </div>
          <div>
            <span>
              <CloudDownload size={18} />
            </span>
            <p>
              <b>Printable fallback list</b>
              <small>Updated event guest roster</small>
            </p>
            <button type="button">Download</button>
          </div>
        </article>
        <article className="setup-security">
          <ShieldCheck size={18} />
          <span>
            <b>Restricted staff access</b>
            <small>Every staff member uses their own account and event-specific code.</small>
          </span>
        </article>
      </aside>
    </div>
  );
}
