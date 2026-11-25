export type EventCategory =
  | "Celebration"
  | "Business"
  | "Culture"
  | "Community"
  | "Wedding";

export type EventStatus = "draft" | "pending_approval" | "published" | "closed";
export type RsvpStatus = "confirmed" | "pending" | "declined";
export type CheckInStatus = "checked-in" | "not-checked-in";
export type PricingMode = "free" | "paid";
export type AdmissionMode = "general" | "assigned" | "selectable";
export type LayoutObjectType = "round-table" | "rectangle-table" | "row" | "seat" | "stage" | "aisle" | "label";
export type SeatStatus = "available" | "held" | "booked" | "reserved" | "blocked" | "unavailable";
export type EventPageTemplate = "wedding" | "show" | "business" | "celebration";
export type EventPageShell = "platform" | "microsite";
export type EventPageAccessMode = "public" | "private-listed" | "private-unlisted";
export type EventPageSectionType = "hero" | "story" | "schedule" | "people" | "highlights" | "venue" | "travel" | "gallery" | "sponsors" | "registry" | "faq" | "contact" | "cta";

export interface EventMedia {
  id: string;
  src: string;
  alt: string;
  type?: "image" | "video";
  caption?: string;
}

export interface EventScheduleItem {
  id: string;
  title: string;
  subtitle?: string;
  description: string;
  scheduleMode?: "day" | "date" | "time" | "date-time";
  dayLabel?: string;
  startISO: string;
  endISO: string;
  venue: string;
  address: string;
  directionsUrl?: string;
}

export interface EventPerson {
  id: string;
  name: string;
  role: string;
  bio?: string;
  image?: EventMedia;
}

export interface EventFAQ {
  id: string;
  question: string;
  answer: string;
}

export interface TravelRecommendation {
  id: string;
  category: "hotel" | "transport" | "parking" | "note";
  title: string;
  description: string;
  url?: string;
  media?: EventMedia;
}

export interface GiftMethod {
  id: string;
  type: "link" | "bank";
  label: string;
  description?: string;
  url?: string;
  country?: string;
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  currency?: string;
}

interface EventPageSectionBase {
  id: string;
  type: EventPageSectionType;
  title: string;
  eyebrow?: string;
  visible: boolean;
  tone?: "light" | "tint" | "dark";
}

export type EventPageSection =
  | (EventPageSectionBase & { type: "hero"; subtitle: string; media?: EventMedia; countdown: boolean })
  | (EventPageSectionBase & { type: "story"; body: string[]; media?: EventMedia; quote?: string })
  | (EventPageSectionBase & { type: "schedule"; items: EventScheduleItem[] })
  | (EventPageSectionBase & { type: "people"; intro?: string; people: EventPerson[] })
  | (EventPageSectionBase & { type: "highlights"; items: Array<{ id: string; title: string; description: string }> })
  | (EventPageSectionBase & { type: "venue"; description: string; venues: Array<{ id: string; name: string; address: string; directionsUrl?: string }> })
  | (EventPageSectionBase & { type: "travel"; intro: string; items: TravelRecommendation[] })
  | (EventPageSectionBase & { type: "gallery"; media: EventMedia[] })
  | (EventPageSectionBase & { type: "sponsors"; intro?: string; names: string[] })
  | (EventPageSectionBase & { type: "registry"; intro: string; methods: GiftMethod[] })
  | (EventPageSectionBase & { type: "faq"; intro?: string; items: EventFAQ[] })
  | (EventPageSectionBase & { type: "contact"; body: string; email?: string; phone?: string })
  | (EventPageSectionBase & { type: "cta"; body: string; buttonLabel: string });

export interface EventPageConfig {
  template: EventPageTemplate;
  shell: EventPageShell;
  access: { mode: EventPageAccessMode; hint?: string };
  branding: {
    logoText: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    typography: "editorial" | "modern" | "bold";
    buttonStyle: "solid" | "outline";
  };
  primaryAction: { type: "native" | "external"; label: string; url?: string };
  sections: EventPageSection[];
  seo: { title: string; description: string; image?: string };
  eventDates?: string[];
}

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
  gallery?: PortfolioGalleryImage[];
}

export interface PortfolioGalleryImage {
  id: string;
  src: string;
  title: string;
  caption: string;
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
  privateListing?: "listed" | "unlisted";
  cover: "violet" | "coral" | "teal" | "gold";
  accent: string;
  tableCount: number;
  responseRate: number;
  featured?: boolean;
  pricingMode?: PricingMode;
  admissionMode?: AdmissionMode;
  currency?: string;
  bookingLimit?: number | null;
  eventPage?: EventPageConfig;
}

export interface PriceBand {
  id: string;
  name: string;
  price: number;
  color: string;
}

export interface TicketCategory {
  id: string;
  name: string;
  description: string;
  price: number;
  quantityAvailable: number;
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
  email?: string;
  phone?: string;
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
  eventSlug?: string;
  eventTitle?: string;
  eventDate?: string;
  eventVenue?: string;
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
