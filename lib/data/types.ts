export type EventCategory =
  | "Celebration"
  | "Business"
  | "Culture"
  | "Community"
  | "Wedding";

export type EventStatus = "draft" | "published" | "closed";
export type RsvpStatus = "confirmed" | "pending" | "declined";
export type CheckInStatus = "checked-in" | "not-checked-in";
export type PricingMode = "free" | "paid";
export type AdmissionMode = "general" | "assigned" | "selectable";
export type LayoutObjectType = "round-table" | "rectangle-table" | "row" | "seat" | "stage" | "aisle" | "label";
export type SeatStatus = "available" | "held" | "booked" | "reserved" | "blocked" | "unavailable";

export interface Organizer {
  id: string;
  slug: string;
  name: string;
  initials: string;
  tagline: string;
  bio: string;
  city: string;
  email: string;
  phone: string;
  website: string;
  accent: string;
  eventsHosted: number;
  guestsWelcomed: number;
  rating: number;
  verified: boolean;
}

export interface EventRecord {
  id: string;
  slug: string;
  organizerId: string;
  title: string;
  shortTitle: string;
  eyebrow: string;
  description: string;
  longDescription: string;
  dateISO: string;
  dateLabel: string;
  timeLabel: string;
  venue: string;
  address: string;
  city: string;
  category: EventCategory;
  capacity: number;
  confirmed: number;
  checkedIn: number;
  status: EventStatus;
  visibility: "public" | "private";
  cover: "violet" | "coral" | "teal" | "gold";
  accent: string;
  tableCount: number;
  responseRate: number;
  featured?: boolean;
  pricingMode?: PricingMode;
  admissionMode?: AdmissionMode;
  currency?: string;
  bookingLimit?: number | null;
}

export interface PriceBand {
  id: string;
  name: string;
  price: number;
  color: string;
}

export interface LayoutObject {
  id: string;
  type: LayoutObjectType;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  seatCount: number;
  priceBandId?: string;
}

export interface SeatRecord {
  id: string;
  eventId: string;
  objectId: string;
  label: string;
  shortLabel: string;
  priceBandId: string;
  priceOverride?: number;
  status: SeatStatus;
  reservedFor?: string;
  blockedReason?: string;
}

export interface BookingAttendee {
  id: string;
  name: string;
  seatId?: string;
  seatLabel?: string;
  priceBandName: string;
  price: number;
  checkedInAt?: string;
}

export interface Booking {
  id: string;
  eventId: string;
  code: string;
  qrToken: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  currency: string;
  admissionMode: AdmissionMode;
  attendees: BookingAttendee[];
  subtotal: number;
  fees: number;
  total: number;
  paymentStatus: "not-required" | "pending" | "paid" | "declined";
  createdAt: string;
}

export interface PaymentAttempt {
  id: string;
  bookingId: string;
  amount: number;
  status: "pending" | "paid" | "declined";
  method: "card";
  createdAt: string;
}

export interface AttendeeCheckIn {
  id: string;
  bookingId: string;
  attendeeId: string;
  entrance: string;
  checkedInAt: string;
}

export interface Guest {
  id: string;
  eventId: string;
  name: string;
  email: string;
  phone: string;
  rsvp: RsvpStatus;
  checkIn: CheckInStatus;
  table: string | null;
  seat: string | null;
  partySize: number;
  passCode: string;
  invitedAt: string;
  checkedInAt?: string;
  dietaryNote?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "Owner" | "Manager" | "Check-in staff" | "Supervisor";
  eventAccess: string;
  status: "Active" | "Invited";
  initials: string;
}

export interface TableRecord {
  id: string;
  name: string;
  seats: number;
  assigned: number;
  zone: string;
}

export interface ActivityItem {
  id: string;
  type: "rsvp" | "check-in" | "message" | "team";
  title: string;
  detail: string;
  time: string;
}
