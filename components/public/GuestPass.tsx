"use client";

import Link from "next/link";
import { CalendarDays, Check, Download, FileDown, Link2, LoaderCircle, Mail, MapPin, Printer, Share2, TicketCheck, UsersRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { DemoQr } from "@/components/shared/DemoQr";
import { fallbackBooking, formatMoney } from "@/lib/data/seating-data";
import type { Booking } from "@/lib/data/types";

export function GuestPass({ bookingCode }: { bookingCode?: string } = {}) {
  const [booking, setBooking] = useState<Booking>(fallbackBooking);
  const [loading, setLoading] = useState(true);
  const [passIssue, setPassIssue] = useState<"" | "refunded" | "unavailable">("");
  const [notice, setNotice] = useState("");
  const [viewMode, setViewMode] = useState<"group" | "individual">("group");
  const [selectedAttendeeId, setSelectedAttendeeId] = useState(fallbackBooking.attendees[0]?.id ?? "");
  const [standalone, setStandalone] = useState(false);
  const [documentBusy, setDocumentBusy] = useState(false);
  const [eventMeta, setEventMeta] = useState({ slug: "lumina-gala", title: "The Lumina Gala", date: "24 AUG · 6:00 PM", venue: "The Monarch, Lagos", bannerUrl: "" });
  const ticketRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setLoading(true);
    setPassIssue("");
    const restoreTimer = window.setTimeout(() => {
      const routeCode = bookingCode ?? window.location.pathname.match(/\/guest-pass\/([^/]+)$/)?.[1];
      const routeParams = new URLSearchParams(window.location.search);
      const requestedAttendeeId = routeParams.get("attendee");
      setStandalone(routeParams.get("ticket") === "1");
      if (routeCode) {
        void fetch(`/api/v1/public/passes/${encodeURIComponent(routeCode)}`).then(async (response) => {
          const body = await response.json() as any;
          if (!response.ok || !body.data) {
            setPassIssue(body.error?.code === "PASS_REFUNDED" ? "refunded" : "unavailable"); setNotice(body.error?.message ?? "The pass could not be loaded."); setLoading(false); return;
          }
          const data = body.data;
          const restored: Booking = { id: data.id, eventId: data.eventId, code: data.code, qrToken: data.qrToken, buyerName: data.buyerName, buyerEmail: data.buyerEmail, buyerPhone: data.buyerPhone ?? "", currency: data.currency, admissionMode: data.admissionMode, attendees: data.attendees.map((attendee: any) => ({ id: attendee.id, name: attendee.name, email: attendee.email ?? undefined, phone: attendee.phone ?? undefined, seatId: attendee.seatId ?? undefined, seatLabel: attendee.seatLabel ?? undefined, priceBandName: attendee.priceBandName, price: attendee.priceMinor / 100 })), subtotal: data.subtotalMinor / 100, fees: data.feesMinor / 100, total: data.totalMinor / 100, paymentStatus: data.paymentStatus === "paid" ? "paid" : "not-required", createdAt: new Date(data.createdAt).toLocaleString("en-NG") };
          setBooking({ ...restored, eventSlug: data.eventSlug, eventTitle: data.eventTitle, eventDate: data.eventDate, eventVenue: data.eventVenue });
          const requestedAttendee = restored.attendees.find((attendee) => attendee.id === requestedAttendeeId);
          setSelectedAttendeeId(requestedAttendee?.id ?? restored.attendees[0]?.id ?? "");
          if (requestedAttendee) setViewMode("individual");
          setEventMeta({ slug: data.eventSlug, title: data.eventTitle, date: new Date(data.eventDate).toLocaleString("en-NG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).toUpperCase(), venue: data.eventVenue, bannerUrl: data.bannerUrl ?? "" });
          window.localStorage.setItem("nasa-demo-booking", JSON.stringify(restored));
          setLoading(false);
        }).catch(() => { setPassIssue("unavailable"); setNotice("The pass could not be loaded."); setLoading(false); });
        return;
      }
      const token = new URLSearchParams(window.location.hash.slice(1)).get("pass");
      if (token) {
        void fetch("/api/v1/public/passes", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ qrToken: token }) }).then(async (response) => {
          const body = await response.json() as { data?: { id: string; eventId: string; eventSlug: string; eventTitle: string; eventDate: string; eventVenue: string; bannerUrl?: string | null; code: string; qrToken: string; buyerName: string; buyerEmail: string; buyerPhone: string | null; currency: string; admissionMode: Booking["admissionMode"]; subtotalMinor: number; feesMinor: number; totalMinor: number; paymentStatus: string; createdAt: string; attendees: Array<{ id: string; name: string; email: string | null; phone: string | null; seatId: string | null; seatLabel: string | null; priceBandName: string; priceMinor: number }> }; error?: { code?: string; message?: string } };
          if (!response.ok || !body.data) { setPassIssue(body.error?.code === "PASS_REFUNDED" ? "refunded" : "unavailable"); setNotice(body.error?.message ?? "The pass could not be loaded."); setLoading(false); return; }
          const data = body.data;
          const restored: Booking = { id: data.id, eventId: data.eventId, code: data.code, qrToken: data.qrToken, buyerName: data.buyerName, buyerEmail: data.buyerEmail, buyerPhone: data.buyerPhone ?? "", currency: data.currency, admissionMode: data.admissionMode, attendees: data.attendees.map((attendee) => ({ id: attendee.id, name: attendee.name, email: attendee.email ?? undefined, phone: attendee.phone ?? undefined, seatId: attendee.seatId ?? undefined, seatLabel: attendee.seatLabel ?? undefined, priceBandName: attendee.priceBandName, price: attendee.priceMinor / 100 })), subtotal: data.subtotalMinor / 100, fees: data.feesMinor / 100, total: data.totalMinor / 100, paymentStatus: data.paymentStatus === "paid" ? "paid" : "not-required", createdAt: new Date(data.createdAt).toLocaleString("en-NG") };
          setBooking(restored);
          setSelectedAttendeeId(restored.attendees[0]?.id ?? "");
          setEventMeta({ slug: data.eventSlug, title: data.eventTitle, date: new Date(data.eventDate).toLocaleString("en-NG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).toUpperCase(), venue: data.eventVenue, bannerUrl: data.bannerUrl ?? "" });
          window.localStorage.setItem("nasa-demo-booking", JSON.stringify(restored));
          setLoading(false);
        }).catch(() => { setPassIssue("unavailable"); setNotice("The pass could not be loaded."); setLoading(false); });
        return;
      }
      const saved = window.localStorage.getItem("nasa-demo-booking");
      if (!saved) { setLoading(false); return; }
      try {
        const localBooking = JSON.parse(saved) as Booking;
        setBooking(localBooking);
        if (localBooking.eventTitle) setEventMeta({ slug: localBooking.eventSlug ?? "lumina-gala", title: localBooking.eventTitle, date: localBooking.eventDate ?? "24 AUG · 6:00 PM", venue: localBooking.eventVenue ?? "The Monarch, Lagos", bannerUrl: "" });
      } catch { setBooking(fallbackBooking); }
      setLoading(false);
    }, 0);
    return () => window.clearTimeout(restoreTimer);
  }, [bookingCode]);

  function feedback(message: string) { setNotice(message); window.setTimeout(() => setNotice(""), 2200); }
  const selectedAttendee = booking.attendees.find((attendee) => attendee.id === selectedAttendeeId) ?? booking.attendees[0];
  const singleTicket = booking.attendees.length === 1;
  const activeViewMode = singleTicket ? "individual" : viewMode;
  const ticketLabel = activeViewMode === "group" ? booking.code : selectedAttendee?.name ?? booking.code;

  function getDirectTicketUrl() {
    const passUrl = new URL(`/guest-pass/${encodeURIComponent(booking.code)}`, window.location.origin);
    passUrl.searchParams.set("ticket", "1");
    if (activeViewMode === "individual" && selectedAttendee) passUrl.searchParams.set("attendee", selectedAttendee.id);
    return passUrl.toString();
  }

  function printTicket() {
    const previousTitle = document.title;
    document.title = `${eventMeta.title} · ${ticketLabel}`;
    window.setTimeout(() => {
      window.print();
      window.setTimeout(() => { document.title = previousTitle; }, 500);
    }, 0);
  }

  async function createTicketPdf() {
    if (!ticketRef.current) throw new Error("Ticket is not ready");
    setDocumentBusy(true);
    ticketRef.current.classList.add("ticket-exporting");
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
      const canvas = await html2canvas(ticketRef.current, { scale: 2, useCORS: true, backgroundColor: null, logging: false });
      const width = canvas.width / 2;
      const height = canvas.height / 2;
      const pdf = new jsPDF({ orientation: height >= width ? "portrait" : "landscape", unit: "px", format: [width, height], hotfixes: ["px_scaling"] });
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, width, height);
      const safeLabel = ticketLabel.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
      return { blob: pdf.output("blob"), filename: `${safeLabel || "event-ticket"}.pdf` };
    } finally {
      ticketRef.current?.classList.remove("ticket-exporting");
      setDocumentBusy(false);
    }
  }

  function downloadBlob(blob: Blob, filename: string) {
    const blobUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = blobUrl;
    anchor.download = filename;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  }

  async function downloadPdf() {
    try { const pdf = await createTicketPdf(); downloadBlob(pdf.blob, pdf.filename); feedback("Ticket PDF downloaded"); }
    catch { feedback("The ticket PDF could not be created"); }
  }

  async function copyDirectLink() {
    await navigator.clipboard.writeText(getDirectTicketUrl());
    feedback("Direct ticket link copied");
  }

  async function shareLink() {
    const title = `${eventMeta.title} · ${ticketLabel}`;
    const text = activeViewMode === "group" ? `Group ticket for ${booking.attendees.length} attendees.` : `Ticket for ${selectedAttendee?.name ?? "attendee"}.`;
    if (navigator.share) await navigator.share({ title, text, url: getDirectTicketUrl() });
    else await copyDirectLink();
  }

  async function sharePdf() {
    try {
      const pdf = await createTicketPdf();
      const file = new File([pdf.blob], pdf.filename, { type: "application/pdf" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) await navigator.share({ title: `${eventMeta.title} ticket`, files: [file] });
      else { downloadBlob(pdf.blob, pdf.filename); feedback("PDF downloaded; attach it from your downloads to share"); }
    } catch { feedback("The ticket PDF could not be shared"); }
  }

  const ticketActions = <div className="ticket-document-actions" aria-label="Ticket actions">
    <button type="button" onClick={printTicket} disabled={documentBusy}><Printer size={17} /> Print ticket</button>
    <button type="button" onClick={() => void downloadPdf()} disabled={documentBusy}><FileDown size={17} /> {documentBusy ? "Preparing…" : "Download PDF"}</button>
    <button type="button" onClick={() => void copyDirectLink()} disabled={documentBusy}><Link2 size={17} /> Copy direct link</button>
    <button type="button" onClick={() => void shareLink()} disabled={documentBusy}><Share2 size={17} /> Share link</button>
    <button type="button" onClick={() => void sharePdf()} disabled={documentBusy}><Download size={17} /> Share PDF</button>
  </div>;

  const bannerStyle = eventMeta.bannerUrl ? { "--pass-banner": `url(${eventMeta.bannerUrl})` } as React.CSSProperties : undefined;

  function renderGroupTicket() {
    return <section ref={ticketRef} className="digital-pass group-digital-pass ticket-print-target" style={bannerStyle}><div className="digital-pass__top"><div><small>GROUP PASS FOR</small><h2>{eventMeta.title}</h2></div><b>N</b></div><div className="group-pass-qr"><DemoQr size={148} value={booking.qrToken} /><div><small>BOOKING CODE</small><b>{booking.code}</b><span>{booking.attendees.length} people · One reusable group QR</span></div></div><div className="digital-pass__meta"><span><CalendarDays size={15} /><b>{eventMeta.date}</b></span><span><MapPin size={15} /><b>{eventMeta.venue}</b></span></div><div className="group-pass-attendees"><header><span><TicketCheck size={15} /> ATTENDEES & SEATS</span><b>{formatMoney(booking.total)}</b></header>{booking.attendees.map((attendee, index) => <div key={attendee.id}><i>{index + 1}</i><span><b>{attendee.name}</b><small>{attendee.seatLabel ?? `${attendee.priceBandName} · Seat assigned later`}</small></span><em>{formatMoney(attendee.price)}</em></div>)}</div><footer className="group-pass-footer"><ShieldStatus paymentStatus={booking.paymentStatus} /><span>Issued {booking.createdAt}</span></footer></section>;
  }

  function renderIndividualTicket(attendee: Booking["attendees"][number], active: boolean) {
    return <section ref={active ? ticketRef : undefined} className={`digital-pass group-digital-pass digital-pass--individual ${active ? "ticket-print-target" : ""}`} style={bannerStyle}><div className="digital-pass__top"><div><small>INDIVIDUAL TICKET</small><h2>{eventMeta.title}</h2></div><b>N</b></div><div className="individual-ticket-body"><div className="individual-ticket-person"><small>TICKET HOLDER</small><strong>{attendee.name}</strong><span>{attendee.email}</span></div><div className="group-pass-qr"><DemoQr size={148} value={booking.qrToken} /><div><small>{singleTicket ? "BOOKING CODE" : "GROUP BOOKING"}</small><b>{booking.code}</b><span>{singleTicket ? "Present this QR at check-in" : "Use the shared QR at check-in"}</span></div></div><div className="digital-pass__meta"><span><CalendarDays size={15} /><b>{eventMeta.date}</b></span><span><MapPin size={15} /><b>{eventMeta.venue}</b></span></div><div className="individual-ticket-details"><span><small>SEAT</small><b>{attendee.seatLabel ?? "Assigned later"}</b></span><span><small>PRICE BAND</small><b>{attendee.priceBandName}</b></span><span><small>PRICE</small><b>{formatMoney(attendee.price)}</b></span></div></div><footer className="group-pass-footer"><ShieldStatus paymentStatus={booking.paymentStatus} /><span>Issued {booking.createdAt}</span></footer></section>;
  }

  const selectedAttendeeIndex = Math.max(0, booking.attendees.findIndex((attendee) => attendee.id === selectedAttendee?.id));
  const ticketCard = activeViewMode === "group" ? renderGroupTicket() : standalone && selectedAttendee ? renderIndividualTicket(selectedAttendee, true) : singleTicket && selectedAttendee ? renderIndividualTicket(selectedAttendee, true) : <div className="ticket-deck" aria-label={`${booking.attendees.length} individual tickets`}>{booking.attendees.map((attendee, index) => {
    const rank = (index - selectedAttendeeIndex + booking.attendees.length) % booking.attendees.length;
    const active = rank === 0;
    const angle = active ? 0 : (rank % 2 === 0 ? -1 : 1) * (3 + Math.min(rank, 3) * 1.5);
    const deckStyle = { "--deck-rank": rank, "--deck-angle": `${angle}deg`, "--deck-x": `${rank * 8}px`, "--deck-y": `${rank * 7}px`, zIndex: booking.attendees.length - rank } as React.CSSProperties;
    return <div key={attendee.id} className={`ticket-deck-card-shell ${active ? "is-active" : ""}`} style={deckStyle} role={active ? undefined : "button"} tabIndex={active ? -1 : 0} aria-label={active ? undefined : `Bring ${attendee.name}'s ticket to the front`} onClick={() => setSelectedAttendeeId(attendee.id)} onKeyDown={(event) => { if (!active && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); setSelectedAttendeeId(attendee.id); } }}>{renderIndividualTicket(attendee, active)}</div>;
  })}</div>;

  const celebration = <div className="ticket-celebration" aria-hidden="true">{Array.from({ length: 24 }, (_, index) => <i key={index} style={{ "--particle-x": `${(index * 37 + 11) % 100}%`, "--particle-delay": `${-(index % 12) * 1.35}s`, "--particle-duration": `${12 + (index % 7) * 1.4}s`, "--particle-drift": `${(index % 2 === 0 ? 1 : -1) * (18 + (index % 5) * 9)}px`, "--particle-color": ["#6f4cff", "#d8b34f", "#ef6a8a", "#43a887", "#ffffff"][index % 5] } as React.CSSProperties} />)}</div>;

  if (loading) return <div className="pass-loading" role="status" aria-live="polite">
    <section className="pass-loading__surface">
      <div className="pass-loading__mark" aria-hidden="true"><TicketCheck size={25} /></div>
      <span className="eyebrow">NASA.EVENT PASS</span>
      <h1>Preparing your ticket</h1>
      <p>Verifying your booking details and ticket access.</p>
      <div className="pass-loading__progress" aria-hidden="true"><span /></div>
      <div className="pass-loading__status"><LoaderCircle size={15} /><span>Securing your pass</span></div>
    </section>
  </div>;
  if (passIssue) return <section className="pass-unavailable" role="alert"><span className={`pass-unavailable__mark ${passIssue === "refunded" ? "is-refunded" : ""}`}><TicketCheck size={25} /></span><span className="eyebrow">{passIssue === "refunded" ? "Ticket refunded" : "Ticket unavailable"}</span><h1>{passIssue === "refunded" ? "This ticket has been refunded." : "This ticket is no longer available."}</h1><p>{passIssue === "refunded" ? "The booking has been cancelled and its seat or ticket allocation has been returned to the event inventory." : "Check that you opened the complete ticket link, or contact the event organizer for help."}</p><Link className="button button--brand" href="/events">Explore events</Link></section>;

  if (standalone) return <main className="ticket-only-page">
    {celebration}
    <div className="ticket-only-toolbar"><div><span className="eyebrow">Digital ticket</span><h1>{eventMeta.title}</h1></div>{ticketActions}<Link href={`/guest-pass/${encodeURIComponent(booking.code)}`}>View booking details</Link></div>
    {ticketCard}
    {notice && <div className="toast-message" role="status">{notice}</div>}
  </main>;

  return <div className="pass-layout group-pass-layout">
    {celebration}
    <section className="pass-confirmation"><span className="success-orb"><Check size={26} /></span><span className="eyebrow">Booking confirmed</span><h1>{singleTicket ? `Your ticket is ready, ${booking.attendees[0]?.name.split(" ")[0] ?? booking.buyerName.split(" ")[0]}.` : `Your group is on the list, ${booking.buyerName.split(" ")[0]}.`}</h1><p>{singleTicket ? <>This booking contains <b>one ticket</b> for {booking.attendees[0]?.name}.</> : <>This booking contains <b>{booking.attendees.length} individual tickets</b> under one group booking and QR pass.</>}</p>{!singleTicket && <div className="pass-view-switch" role="tablist" aria-label="Pass view"><button type="button" className={activeViewMode === "group" ? "active" : ""} onClick={() => setViewMode("group")}>Group pass</button><button type="button" className={activeViewMode === "individual" ? "active" : ""} onClick={() => setViewMode("individual")}>Individual ticket</button></div>}{!singleTicket && activeViewMode === "individual" && <label className="pass-person-select"><span>Choose attendee</span><select value={selectedAttendee?.id ?? ""} onChange={(event) => setSelectedAttendeeId(event.target.value)}>{booking.attendees.map((attendee) => <option key={attendee.id} value={attendee.id}>{attendee.name}</option>)}</select></label>}{ticketActions}<div className="email-status"><Mail size={18} /><span><b>Confirmation addressed to {booking.buyerEmail}</b><small>{singleTicket ? "This ticket is ready to save, share or present at check-in." : "Each attendee can use the individual ticket view; staff still verifies the shared QR booking."}</small></span></div>{!singleTicket && <div className="group-pass-help"><UsersRound size={17} /><span><b>One booking, separate arrivals</b><small>Group mode shares one QR. Individual mode gives each person their own printable/shareable ticket details.</small></span></div>}<Link className="text-link" href={`/events/${eventMeta.slug}`}>Return to event page →</Link></section>
    {ticketCard}
    {notice && <div className="toast-message" role="status">{notice}</div>}
  </div>;
}

function ShieldStatus({ paymentStatus }: { paymentStatus: Booking["paymentStatus"] }) {
  return <span><Check size={14} /><b>{paymentStatus === "paid" ? "Paid" : "Confirmed free booking"}</b></span>;
}
