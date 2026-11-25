"use client";

import Link from "next/link";
import { Armchair, CheckCircle2, Eye, ExternalLink, Pencil, Ticket, UsersRound, X } from "lucide-react";
import { useMemo, useState } from "react";
import { SeatPlanBuilder, type SeatPlanDraft } from "@/components/dashboard/SeatPlanBuilder";
import { compactMoney } from "@/lib/data/seating-data";
import type { LayoutObject, LayoutObjectType, PriceBand, SeatStatus } from "@/lib/data/types";

type SeatEdit = { priceBandId?: string; status?: SeatStatus; note?: string };
type Attendee = { id: string; name: string; email: string | null; phone: string | null; seatLabel: string | null; priceBandName: string; priceMinor: number; checkedIn: boolean };
type Booking = { code: string; buyerName: string; buyerEmail: string; buyerPhone: string | null; paymentStatus: string; status: string; attendees: Attendee[] };
type SeatRecord = { key: string; label: string; shortLabel: string; status: SeatStatus; priceBandId?: string; note?: string; booking?: Booking };

function seatPosition(type: LayoutObjectType, index: number, total: number) {
  if (type === "row") return { left: `${((index + 0.5) / total) * 100}%`, top: "50%" };
  if (type === "seat") return { left: "50%", top: "50%" };
  const angle = ((Math.PI * 2) / total) * index - Math.PI / 2;
  return { left: `${50 + Math.cos(angle) * 45}%`, top: `${50 + Math.sin(angle) * 45}%` };
}

export function PublishedSeatingManager({ initialObjects, initialBands, initialSeatEdits, initialCanvas, seats, saveUrl, heading }: { initialObjects: LayoutObject[]; initialBands: PriceBand[]; initialSeatEdits: Record<string, SeatEdit>; initialCanvas?: { width: number; height: number }; seats: SeatRecord[]; saveUrl: string; heading: string }) {
  const [editing, setEditing] = useState(false);
  const [plan, setPlan] = useState<SeatPlanDraft>({ objects: initialObjects, bands: initialBands, seatEdits: initialSeatEdits, canvas: initialCanvas ?? { width: 980, height: 700 } });
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const seatIndex = useMemo(() => new Map(seats.map((seat) => [seat.key, seat])), [seats]);
  const selected = selectedKey ? seatIndex.get(selectedKey) : undefined;
  const seatOwner = selected?.booking?.attendees.find((attendee) => attendee.seatLabel === selected.label);

  function handleSaved(next: SeatPlanDraft) {
    setPlan(next);
    setEditing(false);
    setSelectedKey(null);
  }

  if (editing) {
    return <div className="published-seating-editor">
      <div className="published-seating-editor__bar"><div><span className="dashboard-eyebrow">Edit mode</span><b>Changes are private until you save</b></div><button type="button" className="button button--outline button--small" onClick={() => setEditing(false)}><Eye size={15} /> View seating</button></div>
      <SeatPlanBuilder initialObjects={plan.objects} initialBands={plan.bands} initialSeatEdits={plan.seatEdits} initialCanvas={plan.canvas} saveUrl={saveUrl} eyebrow="Published event seating" heading={`Edit ${heading} seating`} onSaved={handleSaved} />
    </div>;
  }

  return <section className="published-seating">
    <header className="published-seating__header">
      <div><span className="dashboard-eyebrow">Live seating view</span><h2>{heading} seating</h2><p>Click any seat to view its availability, buyer, and group ticket details.</p></div>
      <button type="button" className="button button--brand button--small" onClick={() => setEditing(true)}><Pencil size={15} /> Edit seating</button>
    </header>
    <div className="published-seating__legend"><span><i className="available" /> Available</span><span><i className="booked" /> Booked</span><span><i className="reserved" /> Reserved</span><span><i className="blocked" /> Blocked</span></div>
    <div className="published-seating__content">
      <div className="published-seating__viewport"><div className="published-seating__map" style={{ width: `max(100%, ${plan.canvas.width}px)`, height: plan.canvas.height }}>
        {!plan.objects.length && <div className="published-seating__empty"><Armchair size={28} /><b>No seating layout yet</b><span>Select Edit seating to create the room plan.</span></div>}
        {plan.objects.map((object) => {
          const objectStyle = { left: `${object.x}%`, top: `${object.y}%`, width: `${object.width}%`, height: `${object.height}%`, transform: `rotate(${object.rotation}deg)` } as React.CSSProperties;
          if (object.type === "stage") return <div key={object.id} className="published-layout-stage" style={objectStyle}>{object.label}</div>;
          if (object.type === "aisle") return <div key={object.id} className="published-layout-aisle" style={objectStyle} aria-label={object.label} />;
          if (object.type === "label") return <div key={object.id} className="published-layout-label" style={objectStyle}>{object.label}</div>;
          return <div key={object.id} className={`published-seat-object published-seat-object--${object.type}`} style={objectStyle}>
            <span className="published-seat-object__label">{object.label}</span><div>
              {Array.from({ length: object.seatCount }, (_, index) => {
                const key = `${object.id}:${index}`;
                const record = seatIndex.get(key);
                const edit = plan.seatEdits[key];
                const status = record?.status ?? edit?.status ?? "available";
                const band = plan.bands.find((item) => item.id === (record?.priceBandId ?? edit?.priceBandId ?? object.priceBandId));
                return <button key={key} type="button" className={`published-seat published-seat--${status} ${selectedKey === key ? "active" : ""}`} style={{ ...seatPosition(object.type, index, object.seatCount), "--seat-band": band?.color ?? "#7557ff" } as React.CSSProperties} onClick={() => setSelectedKey(key)} aria-pressed={selectedKey === key} aria-label={`${record?.label ?? `${object.label} seat ${index + 1}`}, ${status}`}><span>{record?.shortLabel ?? index + 1}</span><em>{band ? compactMoney(band.price) : "-"}</em></button>;
              })}
            </div>
          </div>;
        })}
      </div></div>
      <aside className="published-seat-details">
        {!selected && <div className="published-seat-details__placeholder"><Armchair size={24} /><b>Select a seat</b><span>Booking and attendee information appears here for seats that have been sold.</span></div>}
        {selected && <><header><div><span className="dashboard-eyebrow">Seat details</span><h3>{selected.label}</h3></div><button type="button" title="Close details" onClick={() => setSelectedKey(null)}><X size={16} /></button></header>
          <span className={`published-seat-status published-seat-status--${selected.status}`}>{selected.status}</span>
          {selected.booking ? <><div className="published-seat-owner"><small>SEAT OWNER</small><b>{seatOwner?.name ?? "Owner not named"}</b>{seatOwner?.email && <span>{seatOwner.email}</span>}<em>{seatOwner?.priceBandName ?? "Seat attendee"} · {compactMoney((seatOwner?.priceMinor ?? 0) / 100)}</em>{seatOwner && <div className="published-seat-owner__status"><span className={seatOwner.checkedIn ? "checked" : "pending"}>{seatOwner.checkedIn ? "Checked in" : "Not checked in"}</span><Link href={`/guest-pass/${encodeURIComponent(selected.booking.code)}?ticket=1&attendee=${encodeURIComponent(seatOwner.id)}`} target="_blank" rel="noreferrer"><Ticket size={13} /> View ticket <ExternalLink size={11} /></Link></div>}</div><div className="published-buyer"><small>Purchased by</small><b>{selected.booking.buyerName}</b><span>{selected.booking.buyerEmail}</span>{selected.booking.buyerPhone && <span>{selected.booking.buyerPhone}</span>}<em>Booking {selected.booking.code} · {selected.booking.status === "confirmed" ? "Confirmed" : selected.booking.status} · {selected.booking.paymentStatus}</em><Link href={`/guest-pass/${encodeURIComponent(selected.booking.code)}`} target="_blank" rel="noreferrer"><Ticket size={13} /> View group ticket <ExternalLink size={11} /></Link></div>
            <div className="published-group"><div><UsersRound size={16} /><b>Group booking</b><span>{selected.booking.attendees.length} attendee{selected.booking.attendees.length === 1 ? "" : "s"}</span></div>{selected.booking.attendees.map((attendee) => <article key={attendee.id}><span>{attendee.name.slice(0, 1).toUpperCase()}</span><p><Link href={`/guest-pass/${encodeURIComponent(selected.booking!.code)}?ticket=1&attendee=${encodeURIComponent(attendee.id)}`} target="_blank" rel="noreferrer"><b>{attendee.name}</b><ExternalLink size={11} /></Link><small>{attendee.seatLabel ?? "No assigned seat"} · {attendee.priceBandName}</small>{attendee.email && <small>{attendee.email}</small>}</p><em className={attendee.checkedIn ? "checked-in" : "not-checked-in"}>{attendee.checkedIn ? "Checked in" : "Not checked in"}</em></article>)}</div>
          </> : <div className="published-seat-details__state"><CheckCircle2 size={20} /><b>{selected.status === "available" ? "This seat is available" : "This seat is not for sale"}</b><span>{selected.note ?? "No purchaser is attached to this seat."}</span></div>}</>}
      </aside>
    </div>
  </section>;
}
