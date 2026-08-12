"use client";

import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Armchair,
  Check,
  CheckCircle2,
  Clock3,
  CreditCard,
  List,
  Mail,
  Map,
  Minus,
  PartyPopper,
  Plus,
  ShieldCheck,
  Ticket,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { compactMoney, demoLayoutObjects, demoPriceBands, demoSeats, formatMoney } from "@/lib/data/seating-data";
import type { AdmissionMode, Booking, PricingMode } from "@/lib/data/types";

type BuyerData = { name: string; email: string; phone: string };
type ViewMode = "map" | "list";

const initialBuyer: BuyerData = { name: "", email: "", phone: "" };

function readEventSettings() {
  if (typeof window === "undefined") return { admissionMode: "selectable" as AdmissionMode, pricingMode: "paid" as PricingMode };
  const saved = window.localStorage.getItem("nasa-demo-event-settings");
  if (!saved) return { admissionMode: "selectable" as AdmissionMode, pricingMode: "paid" as PricingMode };
  try {
    const settings = JSON.parse(saved) as { admissionMode?: AdmissionMode; pricingMode?: PricingMode };
    return { admissionMode: settings.admissionMode ?? "selectable", pricingMode: settings.pricingMode ?? "paid" };
  } catch {
    return { admissionMode: "selectable" as AdmissionMode, pricingMode: "paid" as PricingMode };
  }
}

export function RsvpFlow() {
  const [initialSettings] = useState(readEventSettings);
  const [step, setStep] = useState(1);
  const [attending, setAttending] = useState<"yes" | "no">("yes");
  const [admissionMode] = useState<AdmissionMode>(initialSettings.admissionMode);
  const [pricingMode] = useState<PricingMode>(initialSettings.pricingMode);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [tierId, setTierId] = useState("band-standard");
  const [names, setNames] = useState<Record<string, string>>({});
  const [buyer, setBuyer] = useState(initialBuyer);
  const [view, setView] = useState<ViewMode>("map");
  const [enabledBands, setEnabledBands] = useState<string[]>(demoPriceBands.map((band) => band.id));
  const [holdSeconds, setHoldSeconds] = useState(600);
  const [paymentState, setPaymentState] = useState<"ready" | "processing" | "declined">("ready");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!selectedIds.length || holdSeconds <= 0) return;
    const timer = window.setInterval(() => setHoldSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [selectedIds.length, holdSeconds]);

  const selectedSeats = useMemo(() => selectedIds.map((id) => demoSeats.find((seat) => seat.id === id)).filter(Boolean) as typeof demoSeats, [selectedIds]);
  const placeKeys = admissionMode === "selectable" ? selectedIds : Array.from({ length: quantity }, (_, index) => `place-${index + 1}`);
  const selectedTier = demoPriceBands.find((band) => band.id === tierId) ?? demoPriceBands[2];
  const seatPrice = (seatId: string) => {
    const seat = demoSeats.find((item) => item.id === seatId);
    return pricingMode === "free" ? 0 : (demoPriceBands.find((band) => band.id === seat?.priceBandId)?.price ?? 0);
  };
  const subtotal = pricingMode === "free" ? 0 : admissionMode === "selectable" ? selectedIds.reduce((sum, id) => sum + seatPrice(id), 0) : selectedTier.price * quantity;
  const fees = subtotal ? Math.round(subtotal * 0.02) : 0;
  const total = subtotal + fees;
  const allNamesEntered = placeKeys.length > 0 && placeKeys.every((key) => names[key]?.trim());
  const totalSteps = pricingMode === "paid" && attending === "yes" ? 5 : 4;
  const progressStep = pricingMode === "paid" && attending === "yes" ? step : step > 4 ? 4 : step;

  function next() {
    if (attending === "no") { finishDecline(); return; }
    setStep((value) => Math.min(5, value + 1));
  }
  function back() { setStep((value) => Math.max(1, value - 1)); }
  function updateBuyer(key: keyof BuyerData, value: string) { setBuyer((current) => ({ ...current, [key]: value })); }

  function toggleSeat(id: string) {
    const seat = demoSeats.find((item) => item.id === id);
    if (!seat || seat.status !== "available" || holdSeconds === 0) return;
    setSelectedIds((ids) => ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]);
    setHoldSeconds(600);
  }

  function toggleBand(id: string) {
    setEnabledBands((ids) => ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]);
  }

  function finishDecline() {
    setBusy(true);
    window.setTimeout(() => { window.location.href = "/events/lumina-gala"; }, 500);
  }

  function buildBooking(paymentStatus: Booking["paymentStatus"]): Booking {
    const attendees = placeKeys.map((key, index) => {
      const seat = admissionMode === "selectable" ? demoSeats.find((item) => item.id === key) : undefined;
      const band = demoPriceBands.find((item) => item.id === (seat?.priceBandId ?? tierId)) ?? selectedTier;
      return {
        id: `attendee-${index + 1}`,
        name: names[key].trim(),
        seatId: seat?.id,
        seatLabel: seat?.label,
        priceBandName: pricingMode === "free" ? "Complimentary" : band.name,
        price: admissionMode === "selectable" ? seatPrice(key) : pricingMode === "free" ? 0 : band.price,
      };
    });
    return {
      id: "booking-lumina-demo",
      eventId: "evt_lumina",
      code: "LUM-GROUP-2408",
      qrToken: "demo://lumina/booking-lumina-demo",
      buyerName: buyer.name,
      buyerEmail: buyer.email,
      buyerPhone: buyer.phone,
      currency: "NGN",
      admissionMode,
      attendees,
      subtotal,
      fees,
      total,
      paymentStatus,
      createdAt: "12 Aug 2026, 10:24",
    };
  }

  function complete(paymentStatus: Booking["paymentStatus"]) {
    const booking = buildBooking(paymentStatus);
    window.localStorage.setItem("nasa-demo-booking", JSON.stringify(booking));
    window.localStorage.removeItem("nasa-demo-checkins");
    setBusy(true);
    window.setTimeout(() => { window.location.href = "/guest-pass"; }, 650);
  }

  function pay(success: boolean) {
    setPaymentState("processing");
    window.setTimeout(() => {
      if (!success) { setPaymentState("declined"); return; }
      setPaymentState("ready");
      setStep(5);
    }, 800);
  }

  function continueFromSeats() {
    if (admissionMode === "selectable" && !selectedIds.length) return;
    setStep(3);
  }

  const minutes = String(Math.floor(holdSeconds / 60)).padStart(2, "0");
  const seconds = String(holdSeconds % 60).padStart(2, "0");

  return <div className={`rsvp-flow booking-flow ${step === 2 && admissionMode === "selectable" ? "booking-flow--wide" : ""}`}>
    <div className="rsvp-progress" aria-label={`Step ${progressStep} of ${totalSteps}`}><span style={{ width: `${(progressStep / totalSteps) * 100}%` }} /></div>
    <div className="rsvp-step-label"><span>Step {progressStep} of {totalSteps}</span><span>{step === 1 ? "Your response" : step === 2 ? admissionMode === "selectable" ? "Choose seats" : "Choose tickets" : step === 3 ? "Attendee details" : step === 4 && pricingMode === "paid" ? "Payment" : "Review"}</span></div>

    {step === 1 && <section className="rsvp-step"><span className="rsvp-step__icon"><PartyPopper size={24} /></span><h1>Will you be joining us?</h1><p>Choose your response. One booking can include everyone arriving with you.</p><div className="choice-grid"><button type="button" className={attending === "yes" ? "active" : ""} onClick={() => setAttending("yes")}><i><Check size={18} /></i><b>Yes, we&apos;ll be there</b><span>{admissionMode === "selectable" ? "Choose seats together and receive one group pass." : "Reserve places together under one booking."}</span></button><button type="button" className={attending === "no" ? "active" : ""} onClick={() => setAttending("no")}><i>—</i><b>Sorry, I can&apos;t attend</b><span>Let the organizer know you won&apos;t be joining.</span></button></div><button className="button button--brand button--large rsvp-primary" type="button" onClick={next}>{attending === "yes" ? <>Continue <ArrowRight size={17} /></> : "Send response"}</button></section>}

    {step === 2 && admissionMode === "selectable" && <section className="rsvp-step seat-selection-step"><div className="seat-selection-heading"><div><span className="rsvp-step__icon"><Armchair size={24} /></span><h1>Choose seats together.</h1><p>Every seat shows its price. Reserved and blocked seats cannot be selected.</p></div><div className="seat-hold"><Clock3 size={17} /><span><small>SEAT HOLD</small><b>{minutes}:{seconds}</b></span></div></div><div className="booking-workspace"><aside className="booking-filters"><div className="booking-view-toggle"><button type="button" className={view === "map" ? "active" : ""} onClick={() => setView("map")}><Map size={15} /> Map</button><button type="button" className={view === "list" ? "active" : ""} onClick={() => setView("list")}><List size={15} /> List</button></div><small>PRICE RANGE</small>{demoPriceBands.map((band) => <label key={band.id}><input type="checkbox" checked={enabledBands.includes(band.id)} onChange={() => toggleBand(band.id)} /><i style={{ background: band.color }} /><span><b>{band.name}</b><em>{pricingMode === "free" ? "Free" : formatMoney(band.price)}</em></span></label>)}<div className="seat-legend"><small>SEAT STATUS</small><span><i className="available" /> Available</span><span><i className="selected" /> Selected</span><span><i className="reserved" /> Reserved</span><span><i className="blocked" /> Blocked</span></div></aside><div className={`guest-seat-map guest-seat-map--${view}`}><div className="guest-stage">MAIN STAGE</div>{view === "map" ? demoLayoutObjects.filter((object) => object.seatCount > 0).map((object) => <section className={`guest-seat-group guest-seat-group--${object.type}`} key={object.id}><h3>{object.label}</h3><div>{demoSeats.filter((seat) => seat.objectId === object.id).map((seat) => { const band = demoPriceBands.find((item) => item.id === seat.priceBandId)!; const selected = selectedIds.includes(seat.id); const hidden = !enabledBands.includes(seat.priceBandId); return <button type="button" key={seat.id} className={`guest-seat guest-seat--${seat.status} ${selected ? "selected" : ""} ${hidden ? "filtered" : ""}`} style={{ "--seat-band": band.color } as React.CSSProperties} onClick={() => toggleSeat(seat.id)} disabled={seat.status !== "available" || hidden} aria-pressed={selected} title={`${seat.label}, ${pricingMode === "free" ? "Free" : formatMoney(band.price)}`}><span>{seat.shortLabel}</span><em>{pricingMode === "free" ? "Free" : compactMoney(band.price)}</em></button>})}</div></section>) : <div className="seat-accessible-list">{demoSeats.filter((seat) => enabledBands.includes(seat.priceBandId)).map((seat) => { const band = demoPriceBands.find((item) => item.id === seat.priceBandId)!; return <button type="button" key={seat.id} className={selectedIds.includes(seat.id) ? "selected" : ""} onClick={() => toggleSeat(seat.id)} disabled={seat.status !== "available"}><span><b>{seat.label}</b><small>{band.name} · {seat.status}</small></span><em>{pricingMode === "free" ? "Free" : formatMoney(band.price)}</em>{selectedIds.includes(seat.id) && <Check size={15} />}</button>})}</div>}</div><aside className="booking-basket"><div><small>YOUR SEATS</small><h2>{selectedSeats.length ? `${selectedSeats.length} selected` : "Choose a seat"}</h2></div><div className="basket-seat-list">{selectedSeats.map((seat) => { const band = demoPriceBands.find((item) => item.id === seat.priceBandId)!; return <div key={seat.id}><i style={{ background: band.color }} /><span><b>{seat.label}</b><small>{band.name}</small></span><em>{pricingMode === "free" ? "Free" : formatMoney(band.price)}</em><button type="button" onClick={() => toggleSeat(seat.id)} aria-label={`Remove ${seat.label}`}>×</button></div>})}{!selectedSeats.length && <div className="basket-empty"><Armchair size={22} /><span>Select seats on the map. They will appear here with their individual prices.</span></div>}</div><div className="basket-total"><span><small>Subtotal</small><b>{formatMoney(subtotal)}</b></span><span><small>Fees</small><b>{fees ? formatMoney(fees) : "—"}</b></span><span><strong>Total</strong><strong>{formatMoney(total)}</strong></span></div><button className="button button--brand button--large" type="button" disabled={!selectedIds.length || holdSeconds === 0} onClick={continueFromSeats}>Add attendee names <ArrowRight size={16} /></button></aside></div></section>}

    {step === 2 && admissionMode !== "selectable" && <section className="rsvp-step"><span className="rsvp-step__icon">{admissionMode === "assigned" ? <Armchair size={24} /> : <Ticket size={24} />}</span><h1>{admissionMode === "assigned" ? "Choose your ticket tier." : "How many are attending?"}</h1><p>{admissionMode === "assigned" ? "The organizer will assign matching seats before the event." : "There is no seating plan for this event."}</p>{pricingMode === "paid" && <div className="ticket-tier-list">{demoPriceBands.map((band) => <button type="button" key={band.id} className={tierId === band.id ? "active" : ""} onClick={() => setTierId(band.id)}><i style={{ background: band.color }} /><span><b>{band.name}</b><small>{admissionMode === "assigned" ? "Seat assigned later" : "General admission"}</small></span><em>{formatMoney(band.price)}</em>{tierId === band.id && <Check size={16} />}</button>)}</div>}<div className="quantity-picker"><span><small>NUMBER ATTENDING</small><b>{quantity} {quantity === 1 ? "person" : "people"}</b></span><div><button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))}><Minus size={17} /></button><b>{quantity}</b><button type="button" onClick={() => setQuantity((value) => value + 1)}><Plus size={17} /></button></div></div><div className="rsvp-actions"><button className="button button--quiet" type="button" onClick={back}><ArrowLeft size={16} /> Back</button><button className="button button--brand button--large" type="button" onClick={() => setStep(3)}>Add attendee names <ArrowRight size={17} /></button></div></section>}

    {step === 3 && <section className="rsvp-step attendee-details-step"><span className="rsvp-step__icon"><Mail size={24} /></span><h1>Who is coming?</h1><p>Enter one name for every {admissionMode === "selectable" ? "selected seat" : "reserved place"}. The group will share one QR pass.</p><div className="buyer-fields"><label className="field"><span>Buyer&apos;s full name</span><input value={buyer.name} onChange={(event) => updateBuyer("name", event.target.value)} placeholder="e.g. Amara Okafor" /></label><label className="field"><span>Email address</span><input type="email" value={buyer.email} onChange={(event) => updateBuyer("email", event.target.value)} placeholder="amara@example.com" /></label><label className="field field--full"><span>Phone number</span><input value={buyer.phone} onChange={(event) => updateBuyer("phone", event.target.value)} placeholder="+234 800 000 0000" /></label></div><div className="attendee-name-list">{placeKeys.map((key, index) => { const seat = admissionMode === "selectable" ? demoSeats.find((item) => item.id === key) : undefined; const band = demoPriceBands.find((item) => item.id === (seat?.priceBandId ?? tierId)) ?? selectedTier; return <label key={key}><i>{index + 1}</i><span><small>{seat?.label ?? `${band.name} · Place ${index + 1}`}</small><input value={names[key] ?? ""} onChange={(event) => setNames((items) => ({ ...items, [key]: event.target.value }))} placeholder={`Attendee ${index + 1} full name`} /></span><em>{pricingMode === "free" ? "Free" : formatMoney(seat ? seatPrice(key) : band.price)}</em></label>})}</div><div className="rsvp-actions"><button className="button button--quiet" type="button" onClick={back}><ArrowLeft size={16} /> Back</button><button className="button button--brand button--large" type="button" disabled={!buyer.name || !buyer.email || !buyer.phone || !allNamesEntered} onClick={() => setStep(4)}>{pricingMode === "paid" ? "Continue to payment" : "Review booking"} <ArrowRight size={17} /></button></div></section>}

    {step === 4 && pricingMode === "paid" && <section className="rsvp-step checkout-step"><span className="rsvp-step__icon"><CreditCard size={24} /></span><h1>Complete payment.</h1><p>This is a realistic prototype checkout. No card is charged.</p><div className="checkout-layout"><div className="payment-card"><div className="mock-payment-banner"><ShieldCheck size={16} /><span><b>Secure demo payment</b><small>Use any test details</small></span></div>{paymentState === "declined" && <div className="payment-error"><AlertCircle size={17} /><span><b>Payment was declined</b><small>No charge was made. Check the details and try again.</small></span></div>}<label className="field"><span>Card number</span><input inputMode="numeric" defaultValue="4084 0840 8408 4081" /></label><div className="field-grid"><label className="field"><span>Expiry</span><input defaultValue="08/29" /></label><label className="field"><span>CVV</span><input defaultValue="123" /></label></div><label className="field"><span>Name on card</span><input defaultValue={buyer.name} /></label><button type="button" className="button button--brand button--large checkout-pay" onClick={() => pay(true)} disabled={paymentState === "processing"}>{paymentState === "processing" ? "Processing..." : `Pay ${formatMoney(total)}`} <ShieldCheck size={16} /></button><button type="button" className="simulate-decline" onClick={() => pay(false)}>Test a declined payment</button></div><aside className="checkout-summary"><small>ORDER SUMMARY</small><h3>{placeKeys.length} {placeKeys.length === 1 ? "attendee" : "attendees"}</h3>{placeKeys.map((key, index) => { const seat = demoSeats.find((item) => item.id === key); return <div key={key}><span><b>{names[key]}</b><small>{seat?.label ?? `${selectedTier.name} · Place ${index + 1}`}</small></span><em>{formatMoney(seat ? seatPrice(key) : selectedTier.price)}</em></div>})}<footer><span>Subtotal <b>{formatMoney(subtotal)}</b></span><span>Service fee <b>{formatMoney(fees)}</b></span><span>Total <b>{formatMoney(total)}</b></span></footer></aside></div><button className="button button--quiet" type="button" onClick={back}><ArrowLeft size={16} /> Back to attendees</button></section>}

    {step === 4 && pricingMode === "free" && <Review booking={buildBooking("not-required")} busy={busy} onBack={back} onComplete={() => complete("not-required")} />}
    {step === 5 && pricingMode === "paid" && <Review booking={buildBooking("paid")} busy={busy} onBack={back} onComplete={() => complete("paid")} />}
  </div>;
}

function Review({ booking, busy, onBack, onComplete }: { booking: Booking; busy: boolean; onBack: () => void; onComplete: () => void }) {
  return <section className="rsvp-step"><span className="rsvp-step__icon"><CheckCircle2 size={24} /></span><h1>Everything looks good.</h1><p>One group pass will cover every attendee. Door staff can check people in separately as they arrive.</p><div className="booking-review"><div><small>BOOKING OWNER</small><b>{booking.buyerName}</b><span>{booking.buyerEmail}</span></div><div><small>GROUP</small><b>{booking.attendees.length} attendees</b><span>{booking.admissionMode === "selectable" ? "Selected seating" : booking.admissionMode === "assigned" ? "Seats assigned later" : "General admission"}</span></div>{booking.attendees.map((attendee) => <div key={attendee.id}><i><UsersRound size={15} /></i><span><b>{attendee.name}</b><small>{attendee.seatLabel ?? attendee.priceBandName}</small></span><em>{formatMoney(attendee.price)}</em></div>)}<footer><span>Total</span><b>{formatMoney(booking.total)}</b></footer></div><div className="privacy-note"><ShieldCheck size={17} /><span>Your details are securely shared only with the event organizer.</span></div><div className="rsvp-actions"><button className="button button--quiet" type="button" onClick={onBack}><ArrowLeft size={16} /> Back</button><button className="button button--brand button--large" type="button" onClick={onComplete}>{busy ? "Creating group pass..." : "Confirm booking"} {!busy && <Check size={17} />}</button></div></section>;
}
