"use client";

import Link from "next/link";
import { Check, ExternalLink, Search, Ticket, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import { formatMoney } from "@/lib/data/seating-data";

export type OrganizerBooking = {
  id: string;
  code: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string | null;
  status: string;
  paymentStatus: string;
  totalMinor: number;
  currency: string;
  createdAt: string;
  attendees: Array<{ id: string; name: string; email: string | null; seatLabel: string | null; priceBandName: string; priceMinor: number; checkedIn: boolean }>;
};

export function BookingManager({ eventTitle, bookings, expectedRevenueMinor, totalPlaces }: { eventTitle: string; bookings: OrganizerBooking[]; expectedRevenueMinor: number; totalPlaces: number }) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return bookings;
    return bookings.filter((booking) => `${booking.code} ${booking.buyerName} ${booking.buyerEmail} ${booking.attendees.map((attendee) => attendee.name).join(" ")}`.toLowerCase().includes(value));
  }, [bookings, query]);
  const confirmed = bookings.filter((booking) => booking.status === "confirmed");
  const expectedGuests = confirmed.reduce((total, booking) => total + booking.attendees.length, 0);
  const checkedInGuests = confirmed.reduce((total, booking) => total + booking.attendees.filter((attendee) => attendee.checkedIn).length, 0);
  const paidBookings = confirmed.filter((booking) => booking.paymentStatus === "paid");
  const revenue = paidBookings.reduce((total, booking) => total + booking.totalMinor, 0);
  const soldPercent = totalPlaces ? Math.min(100, Math.round((expectedGuests / totalPlaces) * 100)) : 0;

  return <section className="booking-manager">
    <div className="booking-summary-row">
      <div className="booking-summary-metric"><small>Confirmed bookings</small><b>{confirmed.length}</b></div>
      <div className="booking-summary-metric"><small>Expected guests</small><b>{expectedGuests}</b></div>
      <div className="booking-summary-metric"><small>Checked in</small><b>{checkedInGuests}</b></div>
      <div className="booking-summary-metric"><small>Ticket revenue</small><b title={formatMoney(revenue / 100)}>{formatMoney(revenue / 100)}</b></div>
      <div className="booking-summary-metric"><small>Expected ticket revenue</small><b title={formatMoney(expectedRevenueMinor / 100)}>{formatMoney(expectedRevenueMinor / 100)}</b></div>
      <div className="booking-summary-metric booking-summary-capacity"><small>Capacity sold <span>{expectedGuests} / {totalPlaces}</span></small><b>{soldPercent}%</b><i aria-label={`${soldPercent}% capacity sold`}><span style={{ width: `${soldPercent}%` }} /></i></div>
    </div>
    <article className="dashboard-panel booking-panel">
      <header><div><span className="dashboard-eyebrow">Ticket buyers</span><h2>Bookings & expected guests</h2><p>Every confirmed purchase appears here. Group bookings stay together, while each attendee remains visible for check-in.</p></div><span className="booking-panel__event"><Ticket size={16} /> {eventTitle}</span></header>
      <div className="booking-tools"><label className="dashboard-input"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search buyer, attendee or booking code" /></label><span><UsersRound size={15} /> {expectedGuests} people expected</span></div>
      <div className="booking-list">{results.map((booking) => <article className="booking-card" key={booking.id}>
        <div className="booking-card__head"><div><b>{booking.buyerName}</b><small>{booking.buyerEmail}{booking.buyerPhone ? ` · ${booking.buyerPhone}` : ""}</small></div><div><strong>{formatMoney(booking.totalMinor / 100, booking.currency)}</strong><em className={`pill ${booking.status === "confirmed" ? "pill--success" : "pill--warning"}`}>{booking.status === "confirmed" ? "Confirmed" : booking.status}</em></div></div>
        <div className="booking-card__meta"><span>Booking <b>{booking.code}</b></span><span>{new Date(booking.createdAt).toLocaleDateString("en-NG")}</span><span>{booking.paymentStatus === "paid" ? "Paid" : booking.paymentStatus}</span><Link href={booking.attendees.length === 1 ? `/guest-pass/${encodeURIComponent(booking.code)}?ticket=1&attendee=${encodeURIComponent(booking.attendees[0].id)}` : `/guest-pass/${encodeURIComponent(booking.code)}`} target="_blank" rel="noreferrer"><Ticket size={13} /> {booking.attendees.length === 1 ? "Open individual ticket" : "Open group ticket"} <ExternalLink size={12} /></Link></div>
        <div className="booking-attendees">{booking.attendees.map((attendee) => <div key={attendee.id}><span className="booking-attendee-avatar">{attendee.name.slice(0, 1).toUpperCase()}</span><p><Link href={`/guest-pass/${encodeURIComponent(booking.code)}?ticket=1&attendee=${encodeURIComponent(attendee.id)}`} target="_blank" rel="noreferrer"><b>{attendee.name}</b><ExternalLink size={12} /></Link><small>{attendee.seatLabel ?? attendee.priceBandName} · {formatMoney(attendee.priceMinor / 100, booking.currency)}</small></p><em className={attendee.checkedIn ? "checked-in" : ""}>{attendee.checkedIn ? <><Check size={13} /> Checked in</> : "Expected"}</em></div>)}</div>
      </article>)}</div>
      {!results.length && <div className="empty-state"><Ticket size={24} /><h3>No ticket bookings found</h3><p>Confirmed purchases will appear here as guests complete their booking.</p></div>}
    </article>
  </section>;
}
