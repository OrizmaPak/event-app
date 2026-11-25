"use client";

import { ArrowRight, Bluetooth, Check, CheckCircle2, CloudDownload, FileDown, Keyboard, ListChecks, RefreshCw, Search, ShieldCheck, UsersRound, Wifi, WifiOff } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import type { Guest } from "@/lib/data/types";
import { CheckInHeader } from "./CheckInHeader";
import { ScannerNav } from "./ScannerNav";

type ScannedBooking = {
  booking: { id: string; code: string; buyerName: string };
  attendees: Array<{ id: string; name: string; seatLabel?: string; priceBandName: string; checkIn: { checkedInAt: string } | null }>;
};

export function OfflineRoster({ guests }: { guests: Guest[] }) {
  const { slug } = useParams<{ slug: string }>();
  const [cachedGuests, setCachedGuests] = useState(guests);
  const [cacheState, setCacheState] = useState<"loading" | "online" | "offline">("loading");
  const [query, setQuery] = useState("");
  const [refreshed, setRefreshed] = useState(false);
  const [backupCode, setBackupCode] = useState("");
  const [scan, setScan] = useState<ScannedBooking | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [working, setWorking] = useState(false);
  const [scanMessage, setScanMessage] = useState("");
  const [admittedIds, setAdmittedIds] = useState<string[]>([]);
  const list = useMemo(() => cachedGuests.filter((guest) => `${guest.name} ${guest.passCode}`.toLowerCase().includes(query.toLowerCase())), [cachedGuests, query]);

  async function refreshRoster() {
    setRefreshed(false);
    try {
      const response = await fetch(`/api/v1/check-in/roster?eventSlug=${encodeURIComponent(slug)}`, { cache: "no-store" });
      const payload = await response.json() as { data?: { guests: Guest[] }; error?: { message?: string } };
      if (!response.ok || !payload.data) throw new Error(payload.error?.message ?? "Roster refresh failed");
      setCachedGuests(payload.data.guests);
      window.localStorage.setItem(`nasa-checkin-roster:${slug}`, JSON.stringify(payload.data.guests));
      setCacheState("online");
      setRefreshed(true);
    } catch {
      setCacheState("offline");
    }
  }

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(`nasa-checkin-roster:${slug}`);
      if (stored) setCachedGuests(JSON.parse(stored) as Guest[]);
    } catch { window.localStorage.removeItem(`nasa-checkin-roster:${slug}`); }
    void refreshRoster();
  // Load once for the selected event; refreshRoster intentionally uses the current route slug.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  async function verifyBackupPass(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = backupCode.trim();
    if (!code || working) return;
    setWorking(true);
    setScanMessage("");
    setSelectedIds([]);
    try {
      const response = await fetch("/api/v1/check-in/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ qrToken: code, eventSlug: slug }) });
      const payload = await response.json() as { data?: ScannedBooking; error?: { message?: string } };
      if (!response.ok || !payload.data) {
        setScan(null);
        setScanMessage(payload.error?.message ?? "This pass could not be verified for this event.");
        return;
      }
      setScan(payload.data);
      setScanMessage("Pass verified. Select only the attendees who are here.");
    } catch {
      setScan(null);
      setScanMessage("Could not reach check-in. Keep the offline roster available and try again when connected.");
    } finally {
      setWorking(false);
    }
  }

  async function admitSelected() {
    if (!scan || !selectedIds.length || working) return;
    setWorking(true);
    try {
      const response = await fetch("/api/v1/check-in/entries", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ bookingId: scan.booking.id, attendeeIds: selectedIds, entrance: "Entrance A", operationId: crypto.randomUUID() }) });
      const payload = await response.json() as { data?: { admitted: string[]; alreadyAdmitted: string[] }; error?: { message?: string } };
      if (!response.ok || !payload.data) {
        setScanMessage(payload.error?.message ?? "Check-in could not be saved. Please retry.");
        return;
      }
      setAdmittedIds((current) => [...new Set([...current, ...payload.data!.admitted, ...payload.data!.alreadyAdmitted])]);
      setSelectedIds([]);
      setScanMessage(`${payload.data.admitted.length} ${payload.data.admitted.length === 1 ? "attendee admitted" : "attendees admitted"}.`);
      setScan((current) => current ? { ...current, attendees: current.attendees.map((attendee) => payload.data!.admitted.includes(attendee.id) ? { ...attendee, checkIn: { checkedInAt: new Date().toISOString() } } : attendee) } : current);
    } catch {
      setScanMessage("Check-in could not be saved. Please retry when connected.");
    } finally {
      setWorking(false);
    }
  }

  const admittedCount = list.filter((guest) => guest.checkIn === "checked-in").length;
  const remaining = scan?.attendees.filter((attendee) => !attendee.checkIn && !admittedIds.includes(attendee.id)) ?? [];

  return <main className="scanner-app"><CheckInHeader /><ScannerNav active="roster" /><section className="offline-roster-page">
    <header><div><span className="scanner-kicker"><i /> OFFLINE FALLBACK</span><h1>Your cached guest roster.</h1><p>Keep the guest list ready if connectivity drops. When online, use the backup scanner to verify a pass and admit selected guests.</p></div><button type="button" onClick={() => void refreshRoster()} disabled={cacheState === "loading"}>{refreshed ? <><Check size={16} /> Up to date</> : <><RefreshCw size={16} /> {cacheState === "loading" ? "Refreshing..." : "Refresh cache"}</>}</button></header>
    <div className="offline-status-grid"><article><span><WifiOff size={20} /></span><p><small>ROSTER ON DEVICE</small><b>{cachedGuests.length} guest records</b></p><Check size={18} /></article><article><span><ListChecks size={20} /></span><p><small>CONNECTION</small><b>{cacheState === "loading" ? "Loading roster" : cacheState === "online" ? "Synced just now" : "Using saved roster"}</b></p><Check size={18} /></article><article><span><CloudDownload size={20} /></span><p><small>CHECK-INS ON THIS SCREEN</small><b>{admittedCount + admittedIds.length} recorded</b></p><Check size={18} /></article></div>
    <div className="offline-roster-workspace">
      <div className="offline-roster-card"><div className="offline-roster-tools"><label><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search cached guests" /></label><button type="button" onClick={() => window.print()}><FileDown size={15} /> Printable list</button></div><div className="offline-roster-list">{list.length ? list.map((guest) => <div key={guest.id}><span>{guest.name.split(" ").map((part) => part[0]).join("")}</span><p><b>{guest.name}</b><small>{guest.passCode}</small></p><em>{guest.table ? `${guest.table} · ${guest.seat}` : "Unassigned"}</em><i className={guest.checkIn === "checked-in" ? "used" : "ready"}>{guest.checkIn === "checked-in" ? "Checked in" : "Ready"}</i></div>) : <div className="offline-roster-empty"><UsersRound size={22} /><span><b>{query ? "No matching cached guests" : "No cached guest records"}</b><small>Refresh the roster while connected to prepare this device.</small></span></div>}</div></div>
      <section className="backup-scanner-panel offline-backup-scanner" id="backup" aria-labelledby="backup-scanner-title"><div><span className="backup-icon"><Bluetooth size={22} /></span><div><small>BACKUP SCANNER</small><h2 id="backup-scanner-title">Scan a pass</h2><p>Connect a handheld scanner or enter the pass token. The scanner types directly into this field.</p></div></div><div className="backup-connection"><Wifi size={15} /><span><b>Scanner input ready</b><small>Waiting for pass</small></span></div><form onSubmit={verifyBackupPass}><label><Keyboard size={18} /><input aria-label="Scan or enter pass token" autoComplete="off" value={backupCode} onChange={(event) => setBackupCode(event.target.value)} placeholder="Scan or paste pass token" /><button type="submit" disabled={working || !backupCode.trim()}>{working ? <RefreshCw className="spin" size={15} /> : null}{working ? "Checking" : "Verify pass"}<ArrowRight size={15} /></button></label></form>
        {scanMessage && <p className={`backup-scan-message ${scan ? "success" : ""}`} role="status">{scan ? <CheckCircle2 size={16} /> : null}{scanMessage}</p>}
        {scan && <div className="backup-scan-result"><div className="backup-scan-booking"><span><small>BOOKING</small><b>{scan.booking.code}</b></span><span><small>BOOKED BY</small><b>{scan.booking.buyerName}</b></span></div><div className="backup-scan-attendees">{scan.attendees.map((attendee) => { const checked = Boolean(attendee.checkIn) || admittedIds.includes(attendee.id); return <label key={attendee.id} className={checked ? "checked" : ""}><input type="checkbox" disabled={checked} checked={checked || selectedIds.includes(attendee.id)} onChange={() => setSelectedIds((ids) => ids.includes(attendee.id) ? ids.filter((id) => id !== attendee.id) : [...ids, attendee.id])} /><span><b>{attendee.name}</b><small>{attendee.seatLabel ?? attendee.priceBandName}</small></span><em>{checked ? "Admitted" : "Expected"}</em></label>})}</div>{remaining.length > 0 && <button className="backup-admit-button" type="button" onClick={() => void admitSelected()} disabled={working || selectedIds.length === 0}>{working ? "Saving check-in..." : `Admit ${selectedIds.length || "selected"}`}<ArrowRight size={16} /></button>}</div>}
      </section>
    </div>
    <footer><ShieldCheck size={17} /><span><b>Offline note</b><small>Pass verification and check-in require a connection. Use the cached list for manual reference while offline.</small></span></footer>
  </section></main>;
}
