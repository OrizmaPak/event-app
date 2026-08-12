"use client";

import { Check, CloudDownload, FileDown, ListChecks, RefreshCw, Search, ShieldCheck, WifiOff } from "lucide-react";
import { useMemo, useState } from "react";
import type { Guest } from "@/lib/data/types";
import { CheckInHeader } from "./CheckInHeader";
import { ScannerNav } from "./ScannerNav";

export function OfflineRoster({ guests }: { guests: Guest[] }) {
  const [query, setQuery] = useState("");
  const [refreshed, setRefreshed] = useState(false);
  const list = useMemo(() => guests.filter((guest) => `${guest.name} ${guest.passCode}`.toLowerCase().includes(query.toLowerCase())), [guests, query]);
  return <main className="scanner-app"><CheckInHeader /><ScannerNav active="roster" /><section className="offline-roster-page"><header><div><span className="scanner-kicker"><i /> OFFLINE FALLBACK</span><h1>Your cached guest roster.</h1><p>Use this list if the venue connection becomes unreliable. Check-ins are queued and synchronized when the device comes back online.</p></div><button type="button" onClick={() => { setRefreshed(true); window.setTimeout(() => setRefreshed(false), 1700); }}>{refreshed ? <><Check size={16} /> Up to date</> : <><RefreshCw size={16} /> Refresh cache</>}</button></header><div className="offline-status-grid"><article><span><WifiOff size={20} /></span><p><small>OFFLINE READY</small><b>462 guest records cached</b></p><Check size={18} /></article><article><span><ListChecks size={20} /></span><p><small>LAST UPDATED</small><b>12 August · 5:42 PM</b></p><Check size={18} /></article><article><span><CloudDownload size={20} /></span><p><small>PENDING SYNC</small><b>0 check-ins waiting</b></p><Check size={18} /></article></div><div className="offline-roster-card"><div className="offline-roster-tools"><label><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search cached guests" /></label><button type="button"><FileDown size={15} /> Printable list</button></div><div className="offline-roster-list">{list.map((guest) => <div key={guest.id}><span>{guest.name.split(" ").map((part) => part[0]).join("")}</span><p><b>{guest.name}</b><small>{guest.passCode}</small></p><em>{guest.table ? `${guest.table} · ${guest.seat}` : "Unassigned"}</em><i className={guest.checkIn === "checked-in" ? "used" : "ready"}>{guest.checkIn === "checked-in" ? "Checked in" : "Ready"}</i></div>)}</div></div><footer><ShieldCheck size={17} /><span><b>Supervisor note</b><small>When working offline, keep this iPad assigned to one entrance to reduce duplicate entry risk.</small></span></footer></section></main>;
}
