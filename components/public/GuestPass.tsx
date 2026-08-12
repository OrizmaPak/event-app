"use client";

import Link from "next/link";
import { CalendarDays, Check, Download, Mail, MapPin, Share2, TicketCheck, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";
import { DemoQr } from "@/components/shared/DemoQr";
import { fallbackBooking, formatMoney } from "@/lib/data/seating-data";
import type { Booking } from "@/lib/data/types";

export function GuestPass() {
  const [booking, setBooking] = useState<Booking>(fallbackBooking);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const restoreTimer = window.setTimeout(() => {
      const saved = window.localStorage.getItem("nasa-demo-booking");
      if (!saved) return;
      try { setBooking(JSON.parse(saved) as Booking); } catch { setBooking(fallbackBooking); }
    }, 0);
    return () => window.clearTimeout(restoreTimer);
  }, []);

  function feedback(message: string) { setNotice(message); window.setTimeout(() => setNotice(""), 2200); }

  return <div className="pass-layout group-pass-layout">
    <section className="pass-confirmation"><span className="success-orb"><Check size={26} /></span><span className="eyebrow">Booking confirmed</span><h1>Your group is on the list, {booking.buyerName.split(" ")[0]}.</h1><p>This single QR pass covers <b>{booking.attendees.length} attendees</b>. It can be scanned again when group members arrive at different times.</p><div className="pass-actions"><button className="button button--brand button--large" onClick={() => feedback("Group pass prepared for download")} type="button"><Download size={17} /> Save pass</button><button className="button button--outline button--large" onClick={() => feedback("Share options opened")} type="button"><Share2 size={17} /> Share</button></div><div className="email-status"><Mail size={18} /><span><b>Confirmation prepared for {booking.buyerEmail}</b><small>Mock mode: no real email was sent</small></span></div><div className="group-pass-help"><UsersRound size={17} /><span><b>Arriving separately?</b><small>Share this pass with the group. Staff will select only the people currently present.</small></span></div><Link className="text-link" href="/events/lumina-gala">Return to event page →</Link></section>
    <section className="digital-pass group-digital-pass"><div className="digital-pass__top"><div><small>GROUP PASS FOR</small><h2>The Lumina Gala</h2></div><b>N</b></div><div className="group-pass-qr"><DemoQr size={148} /><div><small>BOOKING CODE</small><b>{booking.code}</b><span>{booking.attendees.length} people · One reusable group QR</span></div></div><div className="digital-pass__meta"><span><CalendarDays size={15} /><b>24 AUG · 6:00 PM</b></span><span><MapPin size={15} /><b>The Monarch, Lagos</b></span></div><div className="group-pass-attendees"><header><span><TicketCheck size={15} /> ATTENDEES & SEATS</span><b>{formatMoney(booking.total)}</b></header>{booking.attendees.map((attendee, index) => <div key={attendee.id}><i>{index + 1}</i><span><b>{attendee.name}</b><small>{attendee.seatLabel ?? `${attendee.priceBandName} · Seat assigned later`}</small></span><em>{formatMoney(attendee.price)}</em></div>)}</div><footer className="group-pass-footer"><ShieldStatus paymentStatus={booking.paymentStatus} /><span>Issued {booking.createdAt}</span></footer></section>
    {notice && <div className="toast-message" role="status">{notice}</div>}
  </div>;
}

function ShieldStatus({ paymentStatus }: { paymentStatus: Booking["paymentStatus"] }) {
  return <span><Check size={14} /><b>{paymentStatus === "paid" ? "Paid" : "Confirmed free booking"}</b></span>;
}
