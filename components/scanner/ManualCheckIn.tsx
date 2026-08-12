"use client";

import { ArrowLeft, Check, Search, UserCheck, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import type { Booking, Guest } from "@/lib/data/types";
import { fallbackBooking } from "@/lib/data/seating-data";
import { CheckInHeader } from "./CheckInHeader";
import { ScannerNav } from "./ScannerNav";

type CheckInMap = Record<string, string>;

function storedBooking() {
  if (typeof window === "undefined") return fallbackBooking;
  try { return JSON.parse(window.localStorage.getItem("nasa-demo-booking") ?? "") as Booking; } catch { return fallbackBooking; }
}

function storedCheckIns(): CheckInMap {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(window.localStorage.getItem("nasa-demo-checkins") ?? "") as CheckInMap; } catch { return {}; }
}

export function ManualCheckIn({ initialGuests }: { initialGuests: Guest[] }) {
  const [booking] = useState<Booking>(storedBooking);
  const [checkIns, setCheckIns] = useState<CheckInMap>(storedCheckIns);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(fallbackBooking.attendees[0]?.id ?? null);
  const [notice, setNotice] = useState("");

  const searchText = query.toLowerCase();
  const results = useMemo(() => booking.attendees.filter((attendee) => `${booking.buyerName} ${booking.code} ${attendee.name} ${attendee.seatLabel ?? ""} ${attendee.priceBandName}`.toLowerCase().includes(searchText)), [booking, searchText]);
  const selected = booking.attendees.find((attendee) => attendee.id === selectedId) ?? null;

  function checkIn() {
    if (!selected || checkIns[selected.id]) return;
    const time = new Date().toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit" });
    const next = { ...checkIns, [selected.id]: time };
    setCheckIns(next);
    window.localStorage.setItem("nasa-demo-checkins", JSON.stringify(next));
    setNotice(`${selected.name} checked in`);
    window.setTimeout(() => setNotice(""), 2000);
  }

  return <main className="scanner-app"><CheckInHeader /><ScannerNav active="manual" /><section className="manual-checkin-layout"><div className="manual-search-panel"><div className="manual-heading"><span className="scanner-kicker"><i /> BACKUP LOOKUP</span><h1>Find anyone in a booking.</h1><p>Search by buyer, attendee, booking code, table, seat, or ticket tier. {initialGuests.length} legacy guest records remain cached.</p></div><label className="manual-search"><Search size={21} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search attendee, LUM-GROUP, table or seat" /><kbd>{results.length} found</kbd></label><div className="manual-results">{results.map((attendee) => <button type="button" className={selectedId === attendee.id ? "active" : ""} key={attendee.id} onClick={() => setSelectedId(attendee.id)}><span>{attendee.name.split(" ").map((part) => part[0]).join("")}</span><p><b>{attendee.name}</b><small>{booking.code} · {attendee.seatLabel ?? attendee.priceBandName}</small></p><em className={`checkin-status ${checkIns[attendee.id] ? "used" : "ready"}`}>{checkIns[attendee.id] ? "Checked in" : "Ready"}</em></button>)}</div></div><aside className="manual-guest-detail">{selected ? <><span className="manual-avatar">{selected.name.split(" ").map((part) => part[0]).join("")}</span><small>SELECTED ATTENDEE</small><h2>{selected.name}</h2><p>Booked by {booking.buyerName} · {booking.buyerEmail}</p><div className="manual-detail-grid"><div><small>BOOKING</small><b>{booking.code.split("-").at(-1)}</b></div><div><small>TIER</small><b>{selected.priceBandName}</b></div><div><small>TABLE / ROW</small><b>{selected.seatLabel?.split(" · ")[0] ?? "Pending"}</b></div><div><small>SEAT</small><b>{selected.seatLabel?.split(" · ")[1]?.replace("Seat ", "") ?? "—"}</b></div></div><div className="pass-code-row"><small>GROUP PASS CODE</small><b>{booking.code}</b></div>{checkIns[selected.id] ? <div className="already-admitted"><Check size={18} /><span><b>Already checked in</b><small>{checkIns[selected.id]}</small></span></div> : <button className="manual-admit" onClick={checkIn}><UserCheck size={18} /> Confirm this attendee&apos;s check-in</button>}<a href="/check-in/lumina-gala"><ArrowLeft size={15} /> Return to group scanner</a></> : <div className="scan-idle"><UsersRound size={30} /><h2>Select an attendee</h2></div>}</aside></section>{notice && <div className="scanner-toast"><Check size={16} />{notice}</div>}</main>;
}
