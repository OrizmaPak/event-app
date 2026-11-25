"use client";
import { useParams } from "next/navigation";

import { ArrowLeft, Check, Search, UserCheck, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";
import { CheckInHeader } from "./CheckInHeader";
import { ScannerNav } from "./ScannerNav";

type LookupResult = {
  attendee: { id: string; name: string; email?: string; phone?: string; priceBandName: string; seatLabel?: string | null };
  booking: { id: string; code: string; buyerName: string; buyerEmail: string };
  event: { id: string; title: string; slug: string };
  checkIn: { checkedInAt: string; entrance: string } | null;
};

export function ManualCheckIn() {
  const { slug } = useParams<{ slug: string }>();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LookupResult[]>([]);
  const [selected, setSelected] = useState<LookupResult | null>(null);
  const [notice, setNotice] = useState("");
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); setSelected(null); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(`/api/v1/check-in/lookup?eventSlug=${encodeURIComponent(slug)}&q=${encodeURIComponent(query.trim())}`, { signal: controller.signal });
        const body = await response.json() as { data?: LookupResult[] };
        if (response.ok && body.data) { setResults(body.data); setSelected((current) => body.data!.find((item) => item.attendee.id === current?.attendee.id) ?? body.data![0] ?? null); }
      } catch (error) { if (!controller.signal.aborted) setNotice(error instanceof Error ? error.message : "Lookup failed. Please retry."); } finally { setSearching(false); }
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query, slug]);

  async function checkIn() {
    if (!selected || selected.checkIn) return;
    const response = await fetch("/api/v1/check-in/entries", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ bookingId: selected.booking.id, attendeeIds: [selected.attendee.id], entrance: "Entrance A", operationId: crypto.randomUUID() }) });
    const body = await response.json() as { error?: { message?: string } };
    if (!response.ok) { setNotice(body.error?.message ?? "Check-in could not be saved"); return; }
    const checked = { checkedInAt: new Date().toISOString(), entrance: "Entrance A" };
    setSelected({ ...selected, checkIn: checked });
    setResults((items) => items.map((item) => item.attendee.id === selected.attendee.id ? { ...item, checkIn: checked } : item));
    setNotice(`${selected.attendee.name} checked in`);
    window.setTimeout(() => setNotice(""), 2000);
  }

  return <main className="scanner-app"><CheckInHeader /><ScannerNav active="manual" /><section className="manual-checkin-layout"><div className="manual-search-panel"><div className="manual-heading"><span className="scanner-kicker"><i /> BACKUP LOOKUP</span><h1>Find anyone in a booking.</h1><p>Search live records by buyer, attendee, booking code, table, seat, email, or ticket tier.</p></div><label className="manual-search"><Search size={21} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search attendee, booking, table or seat" /><kbd>{searching ? "..." : `${results.length} found`}</kbd></label><div className="manual-results">{results.map((result) => <button type="button" className={selected?.attendee.id === result.attendee.id ? "active" : ""} key={result.attendee.id} onClick={() => setSelected(result)}><span>{result.attendee.name.split(" ").map((part) => part[0]).join("")}</span><p><b>{result.attendee.name}</b><small>{result.booking.code} · {result.attendee.seatLabel ?? result.attendee.priceBandName}</small></p><em className={`checkin-status ${result.checkIn ? "used" : "ready"}`}>{result.checkIn ? "Checked in" : "Ready"}</em></button>)}</div></div><aside className="manual-guest-detail">{selected ? <><span className="manual-avatar">{selected.attendee.name.split(" ").map((part) => part[0]).join("")}</span><small>SELECTED ATTENDEE</small><h2>{selected.attendee.name}</h2><p>Booked by {selected.booking.buyerName} · {selected.booking.buyerEmail}</p><div className="manual-detail-grid"><div><small>BOOKING</small><b>{selected.booking.code.split("-").at(-1)}</b></div><div><small>TIER</small><b>{selected.attendee.priceBandName}</b></div><div><small>TABLE / ROW</small><b>{selected.attendee.seatLabel?.split(" · ")[0] ?? "Pending"}</b></div><div><small>SEAT</small><b>{selected.attendee.seatLabel?.split(" · ")[1]?.replace("Seat ", "") ?? "—"}</b></div></div><div className="pass-code-row"><small>GROUP BOOKING CODE</small><b>{selected.booking.code}</b></div>{selected.checkIn ? <div className="already-admitted"><Check size={18} /><span><b>Already checked in</b><small>{new Date(selected.checkIn.checkedInAt).toLocaleString("en-NG")} · {selected.checkIn.entrance}</small></span></div> : <button className="manual-admit" onClick={checkIn}><UserCheck size={18} /> Confirm this attendee&apos;s check-in</button>}<a href={`/check-in/${slug}`}><ArrowLeft size={15} /> Return to group scanner</a></> : <div className="scan-idle"><UsersRound size={30} /><h2>{query.length < 2 ? "Enter at least two characters" : "No attendee selected"}</h2></div>}</aside></section>{notice && <div className="scanner-toast"><Check size={16} />{notice}</div>}</main>;
}
