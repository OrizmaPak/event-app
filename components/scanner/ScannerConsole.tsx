"use client";

import {
  AlertTriangle,
  ArrowRight,
  Bluetooth,
  Camera,
  Check,
  CheckCircle2,
  Flashlight,
  Keyboard,
  QrCode,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  UserCheck,
  UsersRound,
  Wifi,
} from "lucide-react";
import { useMemo, useState } from "react";
import { DemoQr } from "@/components/shared/DemoQr";
import { fallbackBooking } from "@/lib/data/seating-data";
import type { Booking } from "@/lib/data/types";
import { CheckInHeader } from "./CheckInHeader";
import { ScannerNav } from "./ScannerNav";

type Result = "idle" | "scanning" | "valid" | "duplicate" | "invalid";
type CheckInMap = Record<string, string>;

function storedBooking() {
  if (typeof window === "undefined") return fallbackBooking;
  try { return JSON.parse(window.localStorage.getItem("nasa-demo-booking") ?? "") as Booking; } catch { return fallbackBooking; }
}

function storedCheckIns(): CheckInMap {
  if (typeof window === "undefined") return { "att-amara": "5:52 PM" };
  try { return JSON.parse(window.localStorage.getItem("nasa-demo-checkins") ?? "") as CheckInMap; } catch { return { "att-amara": "5:52 PM" }; }
}

export function ScannerConsole() {
  const [result, setResult] = useState<Result>("idle");
  const [booking] = useState<Booking>(storedBooking);
  const [checkIns, setCheckIns] = useState<CheckInMap>(storedCheckIns);
  const [selected, setSelected] = useState<string[]>([]);
  const [count, setCount] = useState(286);
  const [flash, setFlash] = useState(false);
  const [backupCode, setBackupCode] = useState("LUM-GROUP-2408");
  const [notice, setNotice] = useState("");

  const remaining = useMemo(() => booking.attendees.filter((attendee) => !checkIns[attendee.id]), [booking, checkIns]);

  function simulate(next: Exclude<Result, "idle" | "scanning">) {
    setResult("scanning");
    setSelected([]);
    window.setTimeout(() => setResult(next), 650);
  }

  function toggleAttendee(id: string) {
    if (checkIns[id]) return;
    setSelected((ids) => ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]);
  }

  function admitSelected() {
    const newIds = selected.filter((id) => !checkIns[id]);
    if (!newIds.length) return;
    const time = new Date().toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit" });
    const next = { ...checkIns };
    newIds.forEach((id) => { next[id] = time; });
    setCheckIns(next);
    window.localStorage.setItem("nasa-demo-checkins", JSON.stringify(next));
    setCount((value) => value + newIds.length);
    setSelected([]);
    setNotice(`${newIds.length} ${newIds.length === 1 ? "attendee" : "attendees"} admitted`);
    window.setTimeout(() => setNotice(""), 2200);
  }

  return <main className="scanner-app"><CheckInHeader /><ScannerNav active="scan" /><section className="scanner-console"><div className="scanner-camera"><div className="camera-surface"><div className="camera-glow" /><div className={`scan-target ${result === "scanning" ? "processing" : ""}`}><i /><i /><i /><i /><span className="scan-line" /><DemoQr size={210} /></div><p>{result === "scanning" ? "Reading group pass..." : "Position the booking QR pass inside the frame"}</p><button type="button" className={flash ? "active" : ""} onClick={() => setFlash(!flash)}><Flashlight size={16} />{flash ? "Light on" : "Turn on light"}</button></div><div className="scan-demo-controls"><span><b>Prototype test scans</b><small>Test a group pass, used pass, or invalid code.</small></span><button onClick={() => simulate("valid")}><CheckCircle2 size={14} /> Group pass</button><button onClick={() => simulate("duplicate")}><AlertTriangle size={14} /> Used</button><button onClick={() => simulate("invalid")}><ShieldAlert size={14} /> Invalid</button></div></div><aside className={`scan-result group-scan-result scan-result--${result}`}>
    {result === "idle" && <div className="scan-idle"><span><QrCode size={33} /></span><h2>Ready to scan</h2><p>Group members, seats, and individual entry status appear as soon as a pass is read.</p><button className="scanner-primary" type="button" onClick={() => simulate("valid")}>Simulate a group scan <Camera size={17} /></button><a href="/check-in/lumina-gala/manual"><Search size={15} /> Search guest manually</a></div>}
    {result === "scanning" && <div className="scan-idle"><span className="spinner"><RefreshCw size={31} /></span><h2>Checking pass...</h2><p>Confirming the booking, event, and attendee entry states.</p></div>}
    {result === "valid" && <div className="group-scan"><header><span className="result-orb"><Check size={28} /></span><div><small>GROUP PASS VERIFIED</small><h2>{booking.buyerName}&apos;s group</h2><p>{booking.code} · {remaining.length} still expected</p></div></header><div className="group-scan-summary"><span><UsersRound size={16} /><b>{booking.attendees.length} attendees</b></span><span><CheckCircle2 size={16} /><b>{booking.attendees.length - remaining.length} admitted</b></span></div><div className="group-scan-list">{booking.attendees.map((attendee) => { const checkedAt = checkIns[attendee.id]; const isSelected = selected.includes(attendee.id); return <button type="button" key={attendee.id} className={`${checkedAt ? "admitted" : ""} ${isSelected ? "selected" : ""}`} onClick={() => toggleAttendee(attendee.id)} disabled={!!checkedAt}><i>{checkedAt ? <Check size={15} /> : <span />}</i><span><b>{attendee.name}</b><small>{attendee.seatLabel ?? `${attendee.priceBandName} · Seat assigned later`}</small></span>{checkedAt ? <em>Entered {checkedAt}</em> : <em>{isSelected ? "Arriving now" : "Not selected"}</em>}</button>})}</div>{remaining.length ? <><p className="group-scan-instruction">Select only the people physically present. No attendees are selected automatically.</p><button className="scanner-success-button" onClick={admitSelected} disabled={!selected.length}>Confirm {selected.length || "selected"} & keep pass open <ArrowRight size={17} /></button></> : <div className="group-complete"><CheckCircle2 size={19} /><span><b>Entire group admitted</b><small>Scanning again will not create duplicate entries.</small></span></div>}<button className="scanner-text-button" type="button" onClick={() => setResult("idle")}><RotateCcw size={15} /> Scan next pass</button></div>}
    {result === "duplicate" && <div className="scan-warning"><span className="result-orb"><AlertTriangle size={34} /></span><small>ATTENDEE ALREADY ADMITTED</small><h2>No duplicate created.</h2><p>This attendee was checked in at Entrance B at 5:52 PM.</p><div className="duplicate-card"><b>Amara Okafor</b><span>Table 01 · Seat 04</span><em>Part of {booking.code}</em></div><button className="scanner-warning-button" type="button">Request supervisor review</button><button className="scanner-text-button" type="button" onClick={() => setResult("idle")}><RotateCcw size={15} /> Scan another pass</button></div>}
    {result === "invalid" && <div className="scan-error"><span className="result-orb"><ShieldAlert size={34} /></span><small>PASS NOT VALID</small><h2>We couldn&apos;t verify this pass.</h2><p>It may belong to another event, be revoked, or be unreadable.</p><div className="invalid-reasons"><span>Wrong event</span><span>Revoked pass</span><span>Unreadable code</span></div><button className="scanner-error-button" type="button" onClick={() => setResult("idle")}>Try scanning again</button><a href="/check-in/lumina-gala/manual">Search guest manually</a></div>}
  </aside></section><section className="backup-scanner-panel" id="backup"><div><span className="backup-icon"><Bluetooth size={22} /></span><div><small>BACKUP METHOD</small><h2>Handheld scanner or booking code</h2><p>Pair a scanner that types into the field, or enter the printed group booking code manually.</p></div></div><div className="backup-connection"><Wifi size={15} /><span><b>Scanner input ready</b><small>Waiting for code</small></span></div><label><Keyboard size={18} /><input value={backupCode} onChange={(event) => setBackupCode(event.target.value)} placeholder="Scan or enter booking code" /><button type="button" onClick={() => simulate("valid")}>Verify group <ArrowRight size={15} /></button></label></section><footer className="scanner-statusbar"><span><i className="online" /><b>All changes synced</b></span><span>Last action <b>{notice || "Ready for arrivals"}</b></span><span>Entrance A · <b>John Oreva</b></span><span className="live-total"><small>CHECKED IN</small><b>{count}</b><em>/ 462</em></span></footer>{notice && <div className="scanner-toast"><UserCheck size={16} />{notice}</div>}</main>;
}
