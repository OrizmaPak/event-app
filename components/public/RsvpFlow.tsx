"use client";

import { AlertCircle, ArrowLeft, ArrowRight, Armchair, Check, CheckCircle2, Clock3, CreditCard, List, LoaderCircle, Mail, Map as MapIcon, Minus, PartyPopper, Plus, ShieldCheck, Ticket, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { DynamicRegistrationFields } from "./DynamicRegistrationFields";
import { events } from "@/lib/data/mock-data";
import { compactMoney, demoLayoutObjects, demoPriceBands, demoSeats, formatMoney } from "@/lib/data/seating-data";
import type { AdmissionMode, Booking, LayoutObject, LayoutObjectType, PricingMode, TicketCategory } from "@/lib/data/types";

type BuyerData = { name: string; email: string; phone: string };
type AttendeeDetails = { name: string; email: string; phone: string };
type ViewMode = "map" | "list";
type Inventory = {
  event: { id: string; pricingMode: PricingMode; admissionMode: AdmissionMode; currency: string; bookingLimit: number | null };
  priceBands: Array<{ id: string; name: string; color: string; priceMinor: number }>;
  layout: { objects: Array<{ id: string; type: LayoutObjectType; label: string; x: number; y: number; width: number; height: number; rotation: number; seatCount: number }> };
  seats: Array<{ id: string; layoutObjectId: string; stableKey: string; label: string; shortLabel: string; priceBandId: string | null; priceMinor: number; status: string }>;
  ticketCategories: Array<{ id: string; name: string; description: string; color: string; priceMinor: number; quantityAvailable: number }>;
};
type GuestSeat = { id: string; inventoryId?: string; objectId: string; label: string; shortLabel: string; priceBandId: string; price: number; status: string };
type BookingAccess = { bookingId: string; managementToken: string };
type ApiEnvelope<T> = { data: T | null; error: { code: string; message: string } | null };

const initialBuyer: BuyerData = { name: "", email: "", phone: "" };
const fallbackTicketCategories: TicketCategory[] = [
  {
    id: "ticket-standard",
    name: "Standard",
    description: "General event admission",
    price: 12000,
    quantityAvailable: 250,
    color: "#7557ff",
  },
  {
    id: "ticket-vip",
    name: "VIP",
    description: "Priority access and VIP benefits",
    price: 35000,
    quantityAvailable: 50,
    color: "#d28a28",
  },
];

function parseEventSettings(saved: string) {
  if (!saved)
    return {
      admissionMode: "selectable" as AdmissionMode,
      pricingMode: "paid" as PricingMode,
      ticketCategories: fallbackTicketCategories,
    };
  try {
    const settings = JSON.parse(saved) as {
      admissionMode?: AdmissionMode;
      pricingMode?: PricingMode;
      ticketCategories?: TicketCategory[];
    };
    return {
      admissionMode: settings.admissionMode ?? "selectable",
      pricingMode: settings.pricingMode ?? "paid",
      ticketCategories: settings.ticketCategories?.length ? settings.ticketCategories : fallbackTicketCategories,
    };
  } catch {
    return {
      admissionMode: "selectable" as AdmissionMode,
      pricingMode: "paid" as PricingMode,
      ticketCategories: fallbackTicketCategories,
    };
  }
}

const subscribeToEventSettings = () => () => undefined;

function demoEventSettings(eventSlug: string) {
  const event = events.find((item) => item.slug === eventSlug) ?? events[0];
  return {
    event,
    admissionMode: event.admissionMode ?? "selectable" as AdmissionMode,
    pricingMode: event.pricingMode ?? "paid" as PricingMode,
  };
}

function guestSeatPosition(type: LayoutObjectType, index: number, total: number) {
  if (type === "row") return { left: `${((index + 0.5) / total) * 100}%`, top: "50%" };
  if (type === "seat") return { left: "50%", top: "50%" };
  const angle = ((Math.PI * 2) / total) * index - Math.PI / 2;
  return { left: `${50 + Math.cos(angle) * 45}%`, top: `${50 + Math.sin(angle) * 45}%` };
}

export function RsvpFlow({ eventSlug = "lumina-gala" }: { eventSlug?: string }) {
  const savedSettings = useSyncExternalStore(
    subscribeToEventSettings,
    () => window.localStorage.getItem("nasa-demo-event-settings") ?? "",
    () => "",
  );
  const initialSettings = useMemo(() => parseEventSettings(savedSettings), [savedSettings]);
  const demoSettings = useMemo(() => demoEventSettings(eventSlug), [eventSlug]);
  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [attending, setAttending] = useState<"yes" | "no">("yes");
  const admissionMode = inventory?.event.admissionMode ?? (eventSlug === "lumina-gala" ? initialSettings.admissionMode : demoSettings.admissionMode);
  const pricingMode = inventory?.event.pricingMode ?? (eventSlug === "lumina-gala" ? initialSettings.pricingMode : demoSettings.pricingMode);
  const ticketCategories = inventory?.ticketCategories.length
    ? inventory.ticketCategories.map((category) => ({ ...category, price: category.priceMinor / 100 }))
    : eventSlug === "lumina-gala" ? initialSettings.ticketCategories : fallbackTicketCategories;
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [tierId, setTierId] = useState("band-standard");
  const [attendeeDetails, setAttendeeDetails] = useState<Record<string, AttendeeDetails>>({});
  const [buyer, setBuyer] = useState(initialBuyer);
  const [view, setView] = useState<ViewMode>("map");
  const [enabledBands, setEnabledBands] = useState<string[]>(demoPriceBands.map((band) => band.id));
  const [holdSeconds, setHoldSeconds] = useState(600);
  const [paymentState, setPaymentState] = useState<"ready" | "processing" | "declined">("ready");
  const [busy, setBusy] = useState(false);
  const [customQuestionsValid, setCustomQuestionsValid] = useState(true);
  const [holdToken, setHoldToken] = useState("");
  const [holdSignature, setHoldSignature] = useState("");
  const [bookingAccess, setBookingAccess] = useState<BookingAccess | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const [flowError, setFlowError] = useState("");

  useEffect(() => {
    let active = true;
    fetch(`/api/v1/public/events/${eventSlug}/inventory`, { credentials: "include" })
      .then(async (response) => ({ response, body: await response.json() as ApiEnvelope<Inventory> }))
      .then(({ response, body }) => {
        if (!active) return;
        if (response.ok && body.data) setInventory(body.data);
        setInventoryLoading(false);
      })
      .catch(() => { if (active) setInventoryLoading(false); });
    return () => { active = false; };
  }, [eventSlug]);

  useEffect(() => {
    if (!selectedIds.length || holdSeconds <= 0) return;
    const timer = window.setInterval(() => setHoldSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [selectedIds.length, holdSeconds]);

  const activePriceBands = useMemo(() => inventory?.priceBands.length ? inventory.priceBands.map((band) => ({ ...band, price: band.priceMinor / 100 })) : demoPriceBands, [inventory]);
  const activeLayoutObjects = useMemo<LayoutObject[]>(() => inventory?.layout.objects.length ? inventory.layout.objects.map((object) => ({ ...object, priceBandId: undefined })) : demoLayoutObjects, [inventory]);
  const activeSeats = useMemo<GuestSeat[]>(() => inventory?.seats.length ? inventory.seats.map((seat) => ({ id: seat.stableKey, inventoryId: seat.id, objectId: seat.layoutObjectId, label: seat.label, shortLabel: seat.shortLabel, priceBandId: seat.priceBandId ?? "", price: seat.priceMinor / 100, status: seat.status })) : demoSeats.map((seat) => ({ ...seat, price: demoPriceBands.find((band) => band.id === seat.priceBandId)?.price ?? 0 })), [inventory]);
  useEffect(() => { setEnabledBands(activePriceBands.map((band) => band.id)); }, [activePriceBands]);
  const activeSeatById = useMemo(() => new Map(activeSeats.map((seat) => [seat.id, seat])), [activeSeats]);
  const selectedSeats = useMemo(() => selectedIds.map((id) => activeSeatById.get(id)).filter(Boolean) as GuestSeat[], [activeSeatById, selectedIds]);
  const placeKeys = admissionMode === "selectable" ? selectedIds : Array.from({ length: quantity }, (_, index) => `place-${index + 1}`);
  const ticketOptions =
    admissionMode === "general" || Boolean(inventory?.ticketCategories.length)
      ? ticketCategories
      : activePriceBands.map((band) => ({
          ...band,
          description: "Seat assigned later",
          quantityAvailable: 500,
        }));
  const selectedTier = ticketOptions.find((tier) => tier.id === tierId) ?? ticketOptions[0];
  const seatPrice = (seatId: string) => {
    const seat = activeSeatById.get(seatId);
    return pricingMode === "free" ? 0 : seat?.price ?? 0;
  };
  const subtotal = pricingMode === "free" ? 0 : admissionMode === "selectable" ? selectedIds.reduce((sum, id) => sum + seatPrice(id), 0) : selectedTier.price * quantity;
  const fees = 0;
  const total = subtotal + fees;
  const allAttendeeDetailsEntered = placeKeys.length > 0 && placeKeys.every((key) => attendeeDetails[key]?.name.trim() && attendeeDetails[key]?.email.trim());
  const totalSteps = pricingMode === "paid" && attending === "yes" ? 5 : 4;
  const progressStep = pricingMode === "paid" && attending === "yes" ? step : step > 4 ? 4 : step;

  function next() {
    if (attending === "no") {
      finishDecline();
      return;
    }
    setStep((value) => Math.min(5, value + 1));
  }
  function back() {
    setStep((value) => Math.max(1, value - 1));
  }
  function updateBuyer(key: keyof BuyerData, value: string) {
    setBuyer((current) => ({ ...current, [key]: value }));
  }
  function updateAttendee(key: string, field: keyof AttendeeDetails, value: string) {
    setAttendeeDetails((current) => ({
      ...current,
      [key]: {
        name: current[key]?.name ?? "",
        email: current[key]?.email ?? "",
        phone: current[key]?.phone ?? "",
        [field]: value,
      },
    }));
  }

  function toggleSeat(id: string) {
    const seat = activeSeatById.get(id);
    if (!seat || seat.status !== "available" || holdSeconds === 0) return;
    setSelectedIds((ids) => (ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]));
    setHoldToken("");
    setHoldSignature("");
    setHoldSeconds(600);
  }

  function toggleBand(id: string) {
    setEnabledBands((ids) => (ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]));
  }

  async function createHold() {
    if (!inventory || !selectedTier) {
      setFlowError("Live ticket availability could not be loaded. Refresh the page and try again.");
      return false;
    }
    const signature = admissionMode === "selectable" ? [...selectedIds].sort().join(",") : `${selectedTier.id}:${quantity}`;
    if (holdToken && holdSignature === signature && holdSeconds > 0) return true;
    setBusy(true);
    setFlowError("");
    const body = admissionMode === "selectable"
      ? { seatIds: selectedIds.map((key) => activeSeatById.get(key)?.inventoryId).filter((id): id is string => Boolean(id)), tickets: [] }
      : { seatIds: [], tickets: [{ ticketCategoryId: selectedTier.id, quantity }] };
    try {
      const response = await fetch(`/api/v1/public/events/${eventSlug}/holds`, { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json() as ApiEnvelope<{ holdToken: string; expiresAt: string }>;
      if (!response.ok || !result.data) throw new Error(result.error?.message ?? "Your selection could not be held.");
      setHoldToken(result.data.holdToken);
      setHoldSignature(signature);
      setHoldSeconds(Math.max(0, Math.floor((new Date(result.data.expiresAt).getTime() - Date.now()) / 1000)));
      return true;
    } catch (error) {
      setFlowError(error instanceof Error ? error.message : "Your selection could not be held.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  function finishDecline() {
    setBusy(true);
    window.setTimeout(() => {
      window.location.href = `/events/${eventSlug}`;
    }, 500);
  }

  function buildBooking(paymentStatus: Booking["paymentStatus"]): Booking {
    const attendees = placeKeys.map((key, index) => {
      const seat = admissionMode === "selectable" ? activeSeatById.get(key) : undefined;
      const band = seat ? activePriceBands.find((item) => item.id === seat.priceBandId)! : selectedTier;
      return {
        id: `attendee-${index + 1}`,
        name: attendeeDetails[key].name.trim(),
        email: attendeeDetails[key].email.trim(),
        phone: attendeeDetails[key].phone.trim() || undefined,
        seatId: seat?.id,
        seatLabel: seat?.label,
        priceBandName: pricingMode === "free" ? "Complimentary" : band.name,
        price: admissionMode === "selectable" ? seatPrice(key) : pricingMode === "free" ? 0 : band.price,
      };
    });
    return {
      id: `booking-${demoSettings.event.slug}-demo`,
      eventId: demoSettings.event.id,
      code: `${demoSettings.event.shortTitle.replace(/[^a-z0-9]/gi, "").slice(0, 3).toUpperCase()}-GROUP-2408`,
      eventSlug: demoSettings.event.slug,
      eventTitle: demoSettings.event.title,
      eventDate: demoSettings.event.dateLabel,
      eventVenue: demoSettings.event.venue,
      qrToken: `demo://${demoSettings.event.slug}/booking-demo`,
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
    const booking = confirmedBooking ?? buildBooking(paymentStatus);
    window.localStorage.setItem("nasa-demo-booking", JSON.stringify(booking));
    window.localStorage.removeItem("nasa-demo-checkins");
    setBusy(true);
    window.setTimeout(() => {
      window.location.href = `/guest-pass/${encodeURIComponent(booking.code)}`;
    }, 650);
  }

  async function loadConfirmedBooking(access: BookingAccess) {
    const response = await fetch(`/api/v1/public/bookings/${access.bookingId}`, { headers: { "x-booking-token": access.managementToken } });
    const result = await response.json() as ApiEnvelope<{
      id: string; eventId: string; code: string; status: string; paymentStatus: string; buyerName: string; buyerEmail: string; buyerPhone: string | null; currency: string; subtotalMinor: number; feesMinor: number; totalMinor: number; admissionMode: AdmissionMode; qrToken: string | null; createdAt: string;
      attendees: Array<{ id: string; name: string; email: string | null; phone: string | null; seatId: string | null; seatLabel: string | null; priceBandName: string; priceMinor: number }>;
    }>;
    if (!response.ok || !result.data || result.data.status !== "confirmed" || !result.data.qrToken) throw new Error(result.error?.message ?? "The booking is not confirmed yet.");
    const data = result.data;
    const booking: Booking = {
      id: data.id, eventId: data.eventId, code: data.code, qrToken: data.qrToken!, buyerName: data.buyerName, buyerEmail: data.buyerEmail, buyerPhone: data.buyerPhone ?? "", currency: data.currency, admissionMode: data.admissionMode,
      attendees: data.attendees.map((attendee) => ({ id: attendee.id, name: attendee.name, email: attendee.email ?? undefined, phone: attendee.phone ?? undefined, seatId: attendee.seatId ?? undefined, seatLabel: attendee.seatLabel ?? undefined, priceBandName: attendee.priceBandName, price: attendee.priceMinor / 100 })),
      subtotal: data.subtotalMinor / 100, fees: data.feesMinor / 100, total: data.totalMinor / 100, paymentStatus: data.paymentStatus === "paid" ? "paid" : "not-required", createdAt: new Date(data.createdAt).toLocaleString("en-NG"),
    };
    setConfirmedBooking(booking);
    return booking;
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") !== "return") return;
    const saved = window.sessionStorage.getItem(`nasa-booking:${eventSlug}`);
    if (!saved) {
      setFlowError("Your payment returned successfully, but this browser no longer has the booking access details. Contact the event organizer with your payment reference.");
      return;
    }
    let cancelled = false;
    let access: BookingAccess;
    try {
      access = JSON.parse(saved) as BookingAccess;
    } catch {
      setFlowError("The saved booking details are invalid. Contact the event organizer with your payment reference.");
      return;
    }
    setBookingAccess(access);
    setBusy(true);
    void (async () => {
      for (let attempt = 0; attempt < 6 && !cancelled; attempt += 1) {
        try {
          const booking = await loadConfirmedBooking(access);
          if (cancelled) return;
          window.localStorage.setItem("nasa-demo-booking", JSON.stringify(booking));
          setStep(5);
          setFlowError("");
          window.history.replaceState({}, "", `/events/${eventSlug}/rsvp`);
          setBusy(false);
          return;
        } catch {
          await new Promise((resolve) => window.setTimeout(resolve, 1500));
        }
      }
      if (!cancelled) {
        setBusy(false);
        setStep(4);
        setFlowError("Payment confirmation is still processing. Use Retry payment status in a moment; you will not be charged twice.");
      }
    })();
    return () => { cancelled = true; };
  }, [eventSlug]);

  async function prepareBooking() {
    if (!holdToken || holdSeconds <= 0) {
      setFlowError("Your ticket hold has expired. Return to ticket selection and try again.");
      return;
    }
    setBusy(true);
    setFlowError("");
    const attendees = placeKeys.map((key) => ({
      name: attendeeDetails[key].name.trim(), email: attendeeDetails[key].email.trim(), phone: attendeeDetails[key].phone.trim() || undefined,
      seatId: admissionMode === "selectable" ? activeSeatById.get(key)?.inventoryId : undefined,
      ticketCategoryId: admissionMode === "selectable" ? undefined : selectedTier.id,
      answers: {},
    }));
    try {
      const response = await fetch(`/api/v1/public/events/${eventSlug}/bookings`, {
        method: "POST", credentials: "include", headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
        body: JSON.stringify({ holdToken, buyerName: buyer.name, buyerEmail: buyer.email, buyerPhone: buyer.phone || undefined, attendees, answers: {} }),
      });
      const result = await response.json() as ApiEnvelope<{ bookingId: string; managementToken: string; paymentRequired: boolean }>;
      if (!response.ok || !result.data?.managementToken) throw new Error(result.error?.message ?? "The booking could not be created.");
      const access = { bookingId: result.data.bookingId, managementToken: result.data.managementToken };
      setBookingAccess(access);
      window.sessionStorage.setItem(`nasa-booking:${eventSlug}`, JSON.stringify(access));
      if (!result.data.paymentRequired) await loadConfirmedBooking(access);
      setStep(4);
    } catch (error) {
      setFlowError(error instanceof Error ? error.message : "The booking could not be created.");
    } finally {
      setBusy(false);
    }
  }

  async function pay(success: boolean) {
    if (!bookingAccess) return;
    setPaymentState("processing");
    setFlowError("");
    if (!success) {
      setPaymentState("declined");
      return;
    }
    try {
      if (process.env.NODE_ENV !== "production") {
        const response = await fetch("/api/v1/payments/simulate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...bookingAccess, outcome: "success" }) });
        const result = await response.json() as ApiEnvelope<{ confirmed: boolean }>;
        if (!response.ok) throw new Error(result.error?.message ?? "Payment could not be completed.");
        await loadConfirmedBooking(bookingAccess);
        setPaymentState("ready");
        setStep(5);
        return;
      }
      const response = await fetch("/api/v1/payments/initialize", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(bookingAccess) });
      const result = await response.json() as ApiEnvelope<{ authorizationUrl: string }>;
      if (!response.ok || !result.data) throw new Error(result.error?.message ?? "Payment could not be started.");
      window.location.href = result.data.authorizationUrl;
    } catch (error) {
      setPaymentState("ready");
      setFlowError(error instanceof Error ? error.message : "Payment could not be completed.");
    }
  }

  async function continueFromSeats() {
    if (admissionMode === "selectable" && !selectedIds.length) return;
    if (await createHold()) setStep(3);
  }

  const minutes = String(Math.floor(holdSeconds / 60)).padStart(2, "0");
  const seconds = String(holdSeconds % 60).padStart(2, "0");

  return (
    <div className={`rsvp-flow booking-flow ${step === 2 && admissionMode === "selectable" ? "booking-flow--wide" : ""}`}>
      <div className="rsvp-progress" aria-label={`Step ${progressStep} of ${totalSteps}`}>
        <span style={{ width: `${(progressStep / totalSteps) * 100}%` }} />
      </div>
      <div className="rsvp-step-label">
        <span>
          Step {progressStep} of {totalSteps}
        </span>
        <span>{step === 1 ? "Your response" : step === 2 ? (admissionMode === "selectable" ? "Choose seats" : "Choose tickets") : step === 3 ? "Attendee details" : step === 4 && pricingMode === "paid" ? "Payment" : "Review"}</span>
      </div>
      {flowError && (
        <div className="payment-error rsvp-flow-error" role="alert">
          <AlertCircle size={17} />
          <span><b>We could not continue</b><small>{flowError}</small></span>
        </div>
      )}

      {step === 1 && (
        <section className="rsvp-step">
          <span className="rsvp-step__icon">
            <PartyPopper size={24} />
          </span>
          <h1>Will you be joining us?</h1>
          <p>Choose your response. One booking can include everyone arriving with you.</p>
          <div className="choice-grid">
            <button type="button" className={attending === "yes" ? "active" : ""} onClick={() => setAttending("yes")}>
              <i>
                <Check size={18} />
              </i>
              <b>Yes, we&apos;ll be there</b>
              <span>{admissionMode === "selectable" ? "Choose seats together and receive one group pass." : "Reserve places together under one booking."}</span>
            </button>
            <button type="button" className={attending === "no" ? "active" : ""} onClick={() => setAttending("no")}>
              <i>—</i>
              <b>Sorry, I can&apos;t attend</b>
              <span>Let the organizer know you won&apos;t be joining.</span>
            </button>
          </div>
          <button className="button button--brand button--large rsvp-primary" type="button" onClick={next}>
            {attending === "yes" ? (
              <>
                Continue <ArrowRight size={17} />
              </>
            ) : (
              "Send response"
            )}
          </button>
        </section>
      )}

      {step === 2 && admissionMode === "selectable" && (
        <section className="rsvp-step seat-selection-step">
          <div className="seat-selection-heading">
            <div>
              <span className="rsvp-step__icon">
                <Armchair size={24} />
              </span>
              <h1>Choose seats together.</h1>
              <p>Every seat shows its price. Reserved and blocked seats cannot be selected.</p>
            </div>
            <div className="seat-hold">
              <Clock3 size={17} />
              <span>
                <small>SEAT HOLD</small>
                <b>
                  {minutes}:{seconds}
                </b>
              </span>
            </div>
          </div>
          <div className="booking-workspace">
            <aside className="booking-filters">
              <div className="booking-view-toggle">
                <button type="button" className={view === "map" ? "active" : ""} onClick={() => setView("map")}>
                  <MapIcon size={15} /> Map
                </button>
                <button type="button" className={view === "list" ? "active" : ""} onClick={() => setView("list")}>
                  <List size={15} /> List
                </button>
              </div>
              <small>PRICE RANGE</small>
              {activePriceBands.map((band) => (
                <label key={band.id}>
                  <input type="checkbox" checked={enabledBands.includes(band.id)} onChange={() => toggleBand(band.id)} />
                  <i style={{ background: band.color }} />
                  <span>
                    <b>{band.name}</b>
                    <em>{pricingMode === "free" ? "Free" : formatMoney(band.price)}</em>
                  </span>
                </label>
              ))}
              <div className="seat-legend">
                <small>SEAT STATUS</small>
                <span>
                  <i className="available" /> Available
                </span>
                <span>
                  <i className="selected" /> Selected
                </span>
                <span>
                  <i className="reserved" /> Reserved
                </span>
                <span>
                  <i className="blocked" /> Blocked
                </span>
              </div>
            </aside>
            <div className={`guest-seat-map guest-seat-map--${view} ${view === "map" ? "guest-seat-map--planned" : ""}`} aria-busy={inventoryLoading}>
              {inventoryLoading && <div className="guest-seat-map__loading" role="status" aria-live="polite"><LoaderCircle size={28} /><b>Loading current seating</b><small>Updating seats and prices…</small></div>}
              {view === "map" ? (
                activeLayoutObjects.map((object) => {
                  const objectStyle = { left: `${object.x}%`, top: `${object.y}%`, width: `${object.width}%`, height: `${object.height}%`, transform: `rotate(${object.rotation}deg)` };
                  if (object.type === "stage") return <div key={object.id} className="guest-layout-stage" style={objectStyle}>{object.label}</div>;
                  if (object.type === "aisle") return <div key={object.id} className="guest-layout-aisle" style={objectStyle} aria-label={object.label} />;
                  if (object.type === "label") return <div key={object.id} className="guest-layout-label" style={objectStyle}>{object.label}</div>;
                  const seatsForObject = activeSeats.filter((seat) => seat.objectId === object.id);
                  return (
                    <section className={`guest-seat-group guest-seat-group--${object.type}`} key={object.id} style={objectStyle}>
                      <h3>{object.label}</h3>
                      <div>
                        {seatsForObject.map((seat, index) => {
                            const band = activePriceBands.find((item) => item.id === seat.priceBandId) ?? { name: "Unpriced", color: "#8a8391", price: 0 };
                            const liveStatus = seat.status;
                            const selected = selectedIds.includes(seat.id);
                            const hidden = !enabledBands.includes(seat.priceBandId);
                            return (
                              <button
                                type="button"
                                key={seat.id}
                                className={`guest-seat guest-seat--${liveStatus} ${selected ? "selected" : ""} ${hidden ? "filtered" : ""}`}
                                style={
                                  {
                                    "--seat-band": band.color,
                                    ...guestSeatPosition(object.type, index, seatsForObject.length),
                                  } as React.CSSProperties
                                }
                                onClick={() => toggleSeat(seat.id)}
                                disabled={inventoryLoading || liveStatus !== "available" || hidden}
                                aria-pressed={selected}
                                title={`${seat.label}, ${pricingMode === "free" ? "Free" : formatMoney(band.price)}`}
                              >
                                <span>{seat.shortLabel}</span>
                                <em>{pricingMode === "free" ? "Free" : compactMoney(band.price)}</em>
                              </button>
                            );
                          })}
                      </div>
                    </section>
                  );
                })
              ) : (
                <div className="seat-accessible-list">
                  {activeSeats
                    .filter((seat) => enabledBands.includes(seat.priceBandId))
                    .map((seat) => {
                      const band = activePriceBands.find((item) => item.id === seat.priceBandId) ?? { name: "Unpriced", price: 0 };
                      const liveStatus = seat.status;
                      return (
                        <button type="button" key={seat.id} className={selectedIds.includes(seat.id) ? "selected" : ""} onClick={() => toggleSeat(seat.id)} disabled={inventoryLoading || liveStatus !== "available"}>
                          <span>
                            <b>{seat.label}</b>
                            <small>
                              {band.name} · {liveStatus}
                            </small>
                          </span>
                          <em>{pricingMode === "free" ? "Free" : formatMoney(band.price)}</em>
                          {selectedIds.includes(seat.id) && <Check size={15} />}
                        </button>
                      );
                    })}
                </div>
              )}
            </div>
            <aside className="booking-basket">
              <div>
                <small>YOUR SEATS</small>
                <h2>{selectedSeats.length ? `${selectedSeats.length} selected` : "Choose a seat"}</h2>
              </div>
              <div className="basket-seat-list">
                {selectedSeats.map((seat) => {
                  const band = activePriceBands.find((item) => item.id === seat.priceBandId) ?? { name: "Unpriced", color: "#8a8391", price: 0 };
                  return (
                    <div key={seat.id}>
                      <i style={{ background: band.color }} />
                      <span>
                        <b>{seat.label}</b>
                        <small>{band.name}</small>
                      </span>
                      <em>{pricingMode === "free" ? "Free" : formatMoney(band.price)}</em>
                      <button type="button" onClick={() => toggleSeat(seat.id)} aria-label={`Remove ${seat.label}`}>
                        ×
                      </button>
                    </div>
                  );
                })}
                {!selectedSeats.length && (
                  <div className="basket-empty">
                    <Armchair size={22} />
                    <span>Select seats on the map. They will appear here with their individual prices.</span>
                  </div>
                )}
              </div>
              <div className="basket-total">
                <span>
                  <small>Subtotal</small>
                  <b>{formatMoney(subtotal)}</b>
                </span>
                <span>
                  <small>Fees</small>
                  <b>{fees ? formatMoney(fees) : "—"}</b>
                </span>
                <span>
                  <strong>Total</strong>
                  <strong>{formatMoney(total)}</strong>
                </span>
              </div>
              <button className="button button--brand button--large" type="button" disabled={!selectedIds.length || holdSeconds === 0 || busy} onClick={continueFromSeats}>
                {busy ? "Holding seats..." : "Add attendee names"} <ArrowRight size={16} />
              </button>
            </aside>
          </div>
        </section>
      )}

      {step === 2 && admissionMode !== "selectable" && (
        <section className="rsvp-step">
          <span className="rsvp-step__icon">{admissionMode === "assigned" ? <Armchair size={24} /> : <Ticket size={24} />}</span>
          <h1>{admissionMode === "assigned" ? "Choose your ticket tier." : "Choose a ticket category."}</h1>
          <p>{admissionMode === "assigned" ? "The organizer will assign matching seats before the event." : "Choose a category and the number of tickets you need. No seats are selected."}</p>
          {(admissionMode === "general" || pricingMode === "paid") && (
            <div className="ticket-tier-list">
              {ticketOptions.map((tier) => (
                <button
                  type="button"
                  key={tier.id}
                  className={selectedTier.id === tier.id ? "active" : ""}
                  onClick={() => {
                    setTierId(tier.id);
                    setQuantity(1);
                    setHoldToken("");
                    setHoldSignature("");
                  }}
                >
                  <i style={{ background: tier.color }} />
                  <span>
                    <b>{tier.name}</b>
                    <small>{admissionMode === "assigned" ? "Seat assigned later" : `${tier.description} · ${tier.quantityAvailable} available`}</small>
                  </span>
                  <em>{pricingMode === "free" ? "Free" : formatMoney(tier.price)}</em>
                  {selectedTier.id === tier.id && <Check size={16} />}
                </button>
              ))}
            </div>
          )}
          <div className="quantity-picker">
            <span>
              <small>NUMBER OF TICKETS</small>
              <b>
                {quantity} {quantity === 1 ? "ticket" : "tickets"}
              </b>
              {admissionMode === "general" && <em>{selectedTier.quantityAvailable - quantity} remaining after this order</em>}
            </span>
            <div>
              <button type="button" onClick={() => { setQuantity((value) => Math.max(1, value - 1)); setHoldToken(""); setHoldSignature(""); }}>
                <Minus size={17} />
              </button>
              <b>{quantity}</b>
              <button type="button" onClick={() => { setQuantity((value) => Math.min(selectedTier.quantityAvailable, value + 1)); setHoldToken(""); setHoldSignature(""); }} disabled={quantity >= selectedTier.quantityAvailable}>
                <Plus size={17} />
              </button>
            </div>
          </div>
          <DynamicRegistrationFields eventSlug={eventSlug} attendeeKeys={placeKeys} onValidityChange={setCustomQuestionsValid} />
          <div className="rsvp-actions">
            <button className="button button--quiet" type="button" onClick={back}>
              <ArrowLeft size={16} /> Back
            </button>
            <button className="button button--brand button--large" type="button" disabled={busy} onClick={continueFromSeats}>
              {busy ? "Holding tickets..." : "Add attendee names"} <ArrowRight size={17} />
            </button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="rsvp-step attendee-details-step">
          <span className="rsvp-step__icon">
            <Mail size={24} />
          </span>
          <h1>Who is coming?</h1>
          <p>Enter one name and email for every {admissionMode === "selectable" ? "selected seat" : admissionMode === "general" ? "ticket" : "reserved place"}. Phone number is optional. The group will share one QR pass.</p>
          <div className="buyer-fields">
            <label className="field">
              <span>Buyer&apos;s full name</span>
              <input value={buyer.name} onChange={(event) => updateBuyer("name", event.target.value)} placeholder="e.g. Amara Okafor" />
            </label>
            <label className="field">
              <span>Email address</span>
              <input type="email" value={buyer.email} onChange={(event) => updateBuyer("email", event.target.value)} placeholder="amara@example.com" />
            </label>
            <label className="field field--full">
              <span>Phone number optional</span>
              <input value={buyer.phone} onChange={(event) => updateBuyer("phone", event.target.value)} placeholder="+234 800 000 0000" />
            </label>
          </div>
          <div className="attendee-name-list">
            {placeKeys.map((key, index) => {
              const seat = admissionMode === "selectable" ? activeSeatById.get(key) : undefined;
              const band = seat ? activePriceBands.find((item) => item.id === seat.priceBandId)! : selectedTier;
              const attendee = attendeeDetails[key] ?? { name: "", email: "", phone: "" };
              return (
                <label key={key}>
                  <i>{index + 1}</i>
                  <span className="attendee-detail-fields">
                    <small>{seat?.label ?? `${band.name} · Ticket ${index + 1}`}</small>
                    <input
                      value={attendee.name}
                      onChange={(event) => updateAttendee(key, "name", event.target.value)}
                      placeholder="Please enter attendee full name"
                    />
                    <input
                      type="email"
                      value={attendee.email}
                      onChange={(event) => updateAttendee(key, "email", event.target.value)}
                      placeholder="Please enter attendee email address"
                    />
                    <input
                      value={attendee.phone}
                      onChange={(event) => updateAttendee(key, "phone", event.target.value)}
                      placeholder="Phone number optional"
                    />
                  </span>
                  <em>{pricingMode === "free" ? "Free" : formatMoney(seat ? seatPrice(key) : band.price)}</em>
                </label>
              );
            })}
          </div>
          <div className="rsvp-actions">
            <button className="button button--quiet" type="button" onClick={back}>
              <ArrowLeft size={16} /> Back
            </button>
            <button className="button button--brand button--large" type="button" disabled={!buyer.name || !buyer.email || !allAttendeeDetailsEntered || !customQuestionsValid || busy} onClick={prepareBooking}>
              {busy ? "Creating booking..." : pricingMode === "paid" ? "Continue to payment" : "Review booking"} <ArrowRight size={17} />
            </button>
          </div>
        </section>
      )}

      {step === 4 && pricingMode === "paid" && (
        <section className="rsvp-step checkout-step">
          <span className="rsvp-step__icon">
            <CreditCard size={24} />
          </span>
          <h1>Complete payment.</h1>
          <p>{process.env.NODE_ENV === "production" ? "Payment is completed securely through Paystack." : "Development checkout uses a simulated Paystack result. No card is charged."}</p>
          <div className="checkout-layout">
            <div className="payment-card">
              <div className="mock-payment-banner">
                <ShieldCheck size={16} />
                <span>
                  <b>Secure demo payment</b>
                  <small>Use any test details</small>
                </span>
              </div>
              {paymentState === "declined" && (
                <div className="payment-error">
                  <AlertCircle size={17} />
                  <span>
                    <b>Payment was declined</b>
                    <small>No charge was made. Check the details and try again.</small>
                  </span>
                </div>
              )}
              <label className="field">
                <span>Card number</span>
                <input inputMode="numeric" defaultValue="4084 0840 8408 4081" />
              </label>
              <div className="field-grid">
                <label className="field">
                  <span>Expiry</span>
                  <input defaultValue="08/29" />
                </label>
                <label className="field">
                  <span>CVV</span>
                  <input defaultValue="123" />
                </label>
              </div>
              <label className="field">
                <span>Name on card</span>
                <input defaultValue={buyer.name} />
              </label>
              <button type="button" className="button button--brand button--large checkout-pay" onClick={() => pay(true)} disabled={paymentState === "processing"}>
                {paymentState === "processing" ? "Processing..." : `Pay ${formatMoney(total)}`} <ShieldCheck size={16} />
              </button>
              <button type="button" className="simulate-decline" onClick={() => pay(false)}>
                Test a declined payment
              </button>
            </div>
            <aside className="checkout-summary">
              <small>ORDER SUMMARY</small>
              <h3>
                {placeKeys.length} {placeKeys.length === 1 ? "attendee" : "attendees"}
              </h3>
              {placeKeys.map((key, index) => {
                const seat = activeSeatById.get(key);
                const attendee = attendeeDetails[key];
                return (
                  <div key={key}>
                    <span>
                      <b>{attendee?.name}</b>
                      <small>{attendee?.email}</small>
                      <small>{seat?.label ?? `${selectedTier.name} · Place ${index + 1}`}</small>
                    </span>
                    <em>{formatMoney(seat ? seatPrice(key) : selectedTier.price)}</em>
                  </div>
                );
              })}
              <footer>
                <span>
                  Subtotal <b>{formatMoney(subtotal)}</b>
                </span>
                <span>
                  Service fee <b>{formatMoney(fees)}</b>
                </span>
                <span>
                  Total <b>{formatMoney(total)}</b>
                </span>
              </footer>
            </aside>
          </div>
          <button className="button button--quiet" type="button" onClick={back}>
            <ArrowLeft size={16} /> Back to attendees
          </button>
        </section>
      )}

      {step === 4 && pricingMode === "free" && <Review booking={confirmedBooking ?? buildBooking("not-required")} busy={busy} onBack={back} onComplete={() => complete("not-required")} />}
      {step === 5 && pricingMode === "paid" && <Review booking={confirmedBooking ?? buildBooking("paid")} busy={busy} onBack={back} onComplete={() => complete("paid")} />}
    </div>
  );
}

function Review({ booking, busy, onBack, onComplete }: { booking: Booking; busy: boolean; onBack: () => void; onComplete: () => void }) {
  return (
    <section className="rsvp-step">
      <span className="rsvp-step__icon">
        <CheckCircle2 size={24} />
      </span>
      <h1>Everything looks good.</h1>
      <p>One group pass will cover every attendee. Door staff can check people in separately as they arrive.</p>
      <div className="booking-review">
        <div>
          <small>BOOKING OWNER</small>
          <b>{booking.buyerName}</b>
          <span>{booking.buyerEmail}</span>
        </div>
        <div>
          <small>GROUP</small>
          <b>{booking.attendees.length} attendees</b>
          <span>{booking.admissionMode === "selectable" ? "Selected seating" : booking.admissionMode === "assigned" ? "Seats assigned later" : "General admission"}</span>
        </div>
        {booking.attendees.map((attendee) => (
          <div key={attendee.id}>
            <i>
              <UsersRound size={15} />
            </i>
            <span>
              <b>{attendee.name}</b>
              <small>{attendee.seatLabel ?? attendee.priceBandName}</small>
            </span>
            <em>{formatMoney(attendee.price)}</em>
          </div>
        ))}
        <footer>
          <span>Total</span>
          <b>{formatMoney(booking.total)}</b>
        </footer>
      </div>
      <div className="privacy-note">
        <ShieldCheck size={17} />
        <span>Your details are securely shared only with the event organizer.</span>
      </div>
      <div className="rsvp-actions">
        <button className="button button--quiet" type="button" onClick={onBack}>
          <ArrowLeft size={16} /> Back
        </button>
        <button className="button button--brand button--large" type="button" onClick={onComplete}>
          {busy ? "Creating group pass..." : "Confirm booking"} {!busy && <Check size={17} />}
        </button>
      </div>
    </section>
  );
}
