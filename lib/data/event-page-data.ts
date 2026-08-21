import type { EventPageConfig, EventPageSection, EventPageTemplate } from "./types";

const images = {
  weddingHero: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1800&q=88",
  weddingStory: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&q=86",
  weddingGallery1: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=84",
  weddingGallery2: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1200&q=84",
  showHero: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1800&q=88",
  showGallery1: "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=1200&q=84",
  showGallery2: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=84",
  businessHero: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1800&q=88",
  celebrationHero: "https://images.unsplash.com/photo-1496337589254-7e19d01cec44?auto=format&fit=crop&w=1800&q=88",
};

const actionSection = (id: string, title: string, body: string, buttonLabel: string): EventPageSection => ({
  id,
  type: "cta",
  title,
  body,
  buttonLabel,
  visible: true,
  tone: "dark",
});

export const templateLabels: Record<EventPageTemplate, string> = {
  wedding: "Wedding",
  show: "Show & culture",
  business: "Business",
  celebration: "Celebration & community",
};

export const eventPageConfigs: Record<string, EventPageConfig> = {
  "ade-and-zara": {
    template: "wedding",
    shell: "microsite",
    access: { mode: "private-listed", hint: "Use the email and unique code included with your invitation." },
    branding: { logoText: "A + Z", accent: "#6f7d3c", background: "#f8f5ef", surface: "#ffffff", text: "#26271f", typography: "editorial", buttonStyle: "solid" },
    primaryAction: { type: "native", label: "RSVP for the wedding" },
    seo: { title: "Ade & Zara | Our Wedding", description: "Join Ade and Zara for two days of family, tradition and celebration.", image: images.weddingHero },
    sections: [
      { id: "az-hero", type: "hero", title: "Ade & Zara", subtitle: "Two families, one joyful beginning · 12–13 December 2026", visible: true, tone: "light", media: { id: "az-hero-image", src: images.weddingHero, alt: "A wedding celebration beneath white flowers" }, countdown: true },
      { id: "az-story", type: "story", eyebrow: "Our story", title: "A friendship that found its way home.", body: ["What began as an easy conversation became years of friendship, shared adventures and a love rooted in family.", "We cannot imagine beginning this chapter without the people who have encouraged us along the way."], quote: "Come for the vows. Stay for the dancing.", visible: true, tone: "light", media: { id: "az-story-image", src: images.weddingStory, alt: "A newly married couple walking together" } },
      { id: "az-schedule", type: "schedule", eyebrow: "Two days together", title: "Wedding schedule", visible: true, tone: "tint", items: [
        { id: "az-traditional", title: "Traditional ceremony", subtitle: "Family rites and reception", description: "Our families meet for a colourful celebration of heritage, music and food.", startISO: "2026-12-12T10:00:00+01:00", endISO: "2026-12-12T15:00:00+01:00", venue: "The Garden Pavilion", address: "Victoria Island, Lagos", directionsUrl: "https://maps.google.com/?q=Victoria+Island+Lagos" },
        { id: "az-white", title: "The wedding and reception", subtitle: "Ceremony followed by dinner", description: "Join us for the vows, dinner, speeches and a dance floor that stays open late.", startISO: "2026-12-13T14:00:00+01:00", endISO: "2026-12-13T22:00:00+01:00", venue: "Harbour Point", address: "4 Wilmot Point Road, Victoria Island, Lagos", directionsUrl: "https://maps.google.com/?q=Harbour+Point+Lagos" },
      ] },
      { id: "az-highlights", type: "highlights", eyebrow: "Guest notes", title: "A few helpful details", visible: true, tone: "light", items: [
        { id: "az-dress", title: "Dress beautifully", description: "Traditional day: jewel tones. Wedding day: formal evening wear." },
        { id: "az-family", title: "Adults-only reception", description: "We love your little ones, but the evening reception is reserved for adult guests." },
        { id: "az-camera", title: "Unplugged vows", description: "Please keep phones away during the ceremony; our photographers have it covered." },
      ] },
      { id: "az-travel", type: "travel", eyebrow: "Plan your stay", title: "Travel & accommodation", intro: "A few comfortable options close to both venues.", visible: true, tone: "tint", items: [
        { id: "az-hotel-1", category: "hotel", title: "The Art Hotel", description: "A short drive from both celebrations.", url: "https://www.google.com/search?q=The+Art+Hotel+Lagos" },
        { id: "az-transport", category: "transport", title: "Guest shuttle", description: "Shuttles leave the recommended hotels 45 minutes before each ceremony." },
        { id: "az-parking", category: "parking", title: "Venue parking", description: "Complimentary valet parking is available at both venues." },
      ] },
      { id: "az-gallery", type: "gallery", eyebrow: "Our people, our places", title: "Gallery", visible: true, tone: "light", media: [
        { id: "az-gallery-1", src: images.weddingHero, alt: "Wedding tables beneath hanging flowers" },
        { id: "az-gallery-2", src: images.weddingGallery1, alt: "An elegant reception table" },
        { id: "az-gallery-3", src: images.weddingGallery2, alt: "A couple sharing a quiet wedding-day moment" },
        { id: "az-gallery-4", src: images.weddingStory, alt: "A couple walking after their ceremony" },
      ] },
      { id: "az-registry", type: "registry", eyebrow: "With gratitude", title: "Registry & gifts", intro: "Your presence is our greatest gift. For guests who still wish to give, we have included two options.", visible: true, tone: "tint", methods: [
        { id: "az-gift-link", type: "link", label: "View our gift list", description: "A small collection of things for our new home.", url: "https://example.com/ade-zara-registry" },
        { id: "az-bank", type: "bank", label: "Celebration fund", description: "A fictional prototype account for the demo.", country: "Nigeria", bankName: "Demo Heritage Bank", accountName: "Ade and Zara Celebration", accountNumber: "1026001842", currency: "NGN" },
      ] },
      { id: "az-faq", type: "faq", eyebrow: "Before you arrive", title: "Frequently asked questions", visible: true, tone: "light", items: [
        { id: "az-faq-1", question: "When should I RSVP?", answer: "Please respond by 1 November so we can prepare your place." },
        { id: "az-faq-2", question: "Can I bring a guest?", answer: "Your invitation and RSVP form show the number of places reserved for your party." },
        { id: "az-faq-3", question: "Who can help on the day?", answer: "Contact the guest experience team using the details at the bottom of this page." },
      ] },
      { id: "az-contact", type: "contact", eyebrow: "Need help?", title: "Guest experience", body: "For travel, invitation or accessibility questions, our guest team is happy to help.", email: "weddinghelp@example.com", phone: "+234 800 000 2026", visible: true, tone: "light" },
      actionSection("az-cta", "We hope you can celebrate with us.", "Confirm every guest in your party and keep your group pass ready for arrival.", "Respond to invitation"),
    ],
  },
  "night-of-living-art": {
    template: "show",
    shell: "microsite",
    access: { mode: "public" },
    branding: { logoText: "LIVING / ART", accent: "#ef5a44", background: "#0c0c0f", surface: "#17171c", text: "#f8f5ef", typography: "bold", buttonStyle: "solid" },
    primaryAction: { type: "native", label: "Get free passes" },
    seo: { title: "A Night of Living Art", description: "An after-dark programme of installation, performance and sound.", image: images.showHero },
    sections: [
      { id: "art-hero", type: "hero", title: "A Night of Living Art", subtitle: "Installation · performance · sound · 18 September", visible: true, tone: "dark", media: { id: "art-hero-image", src: images.showHero, alt: "A live audience under vibrant stage lights" }, countdown: true },
      { id: "art-story", type: "story", eyebrow: "One night. Many forms.", title: "The gallery comes alive after dark.", body: ["Move through rooms shaped by projection, sound, conversation and live performance.", "Arrive at your own pace, follow the programme or simply see where the night takes you."], visible: true, tone: "dark" },
      { id: "art-people", type: "people", eyebrow: "Featured artists", title: "Meet the programme", intro: "Artists working across sound, movement and moving image.", visible: true, tone: "tint", people: [
        { id: "art-person-1", name: "Nayo Studio", role: "Immersive installation", bio: "Light, memory and city movement." },
        { id: "art-person-2", name: "Teni K", role: "Live performance", bio: "A new set created for the gallery." },
        { id: "art-person-3", name: "Common Ground", role: "Sound room", bio: "Selectors from Lagos and Accra." },
      ] },
      { id: "art-schedule", type: "schedule", eyebrow: "Programme", title: "Plan your night", visible: true, tone: "dark", items: [
        { id: "art-open", title: "Doors and installations", description: "Explore all three gallery rooms.", startISO: "2026-09-18T19:30:00+01:00", endISO: "2026-09-18T21:00:00+01:00", venue: "Art Twenty One", address: "Eko Hotel, Victoria Island, Lagos", directionsUrl: "https://maps.google.com/?q=Art+Twenty+One+Lagos" },
        { id: "art-live", title: "Live room", description: "Performance followed by the closing sound programme.", startISO: "2026-09-18T21:00:00+01:00", endISO: "2026-09-19T00:00:00+01:00", venue: "Art Twenty One", address: "Eko Hotel, Victoria Island, Lagos", directionsUrl: "https://maps.google.com/?q=Art+Twenty+One+Lagos" },
      ] },
      { id: "art-gallery", type: "gallery", eyebrow: "Preview", title: "Inside the experience", visible: true, tone: "dark", media: [
        { id: "art-gallery-1", src: images.showHero, alt: "Crowd watching a performance" },
        { id: "art-gallery-2", src: images.showGallery1, alt: "Musician performing under blue lights" },
        { id: "art-gallery-3", src: images.showGallery2, alt: "Festival stage with a large audience" },
      ] },
      { id: "art-sponsors", type: "sponsors", eyebrow: "With support from", title: "Partners", visible: true, tone: "tint", names: ["Open Canvas", "Night Shift Radio", "Studio 21", "City Arts Fund"] },
      actionSection("art-cta", "See the city differently.", "Reserve a free pass. Capacity is limited across the installation rooms.", "Get a pass"),
    ],
  },
  "founders-connect-lagos": {
    template: "business",
    shell: "platform",
    access: { mode: "public" },
    branding: { logoText: "FC / LAGOS", accent: "#078b9a", background: "#f4f8f8", surface: "#ffffff", text: "#14262a", typography: "modern", buttonStyle: "solid" },
    primaryAction: { type: "native", label: "Choose a ticket" },
    seo: { title: "Founders Connect Lagos", description: "A focused day for founders and operators building what comes next.", image: images.businessHero },
    sections: [
      { id: "fc-hero", type: "hero", title: "Founders Connect Lagos", subtitle: "Practical conversations for ambitious builders", visible: true, tone: "light", media: { id: "fc-hero-image", src: images.businessHero, alt: "A modern meeting space prepared for founders" }, countdown: true },
      { id: "fc-highlights", type: "highlights", eyebrow: "Built for useful conversations", title: "Leave with something practical", visible: true, tone: "light", items: [
        { id: "fc-workshops", title: "Operator workshops", description: "Focused sessions with people doing the work." },
        { id: "fc-office", title: "Expert office hours", description: "Short, useful conversations about your current challenge." },
        { id: "fc-network", title: "Curated introductions", description: "Meet relevant founders, partners and collaborators." },
      ] },
      { id: "fc-people", type: "people", eyebrow: "Speakers", title: "Experience over headlines", visible: true, tone: "tint", people: [
        { id: "fc-person-1", name: "Maya Okoro", role: "Founder, Fieldwork", bio: "Building durable teams through early growth." },
        { id: "fc-person-2", name: "Ibrahim Lawal", role: "Partner, Northstar", bio: "Capital strategy for African technology companies." },
        { id: "fc-person-3", name: "Reni Cole", role: "COO, Relay", bio: "Systems that make scale calmer." },
      ] },
      { id: "fc-schedule", type: "schedule", eyebrow: "Agenda", title: "A focused day", visible: true, tone: "light", items: [
        { id: "fc-morning", title: "Main-stage conversations", description: "Short talks, interviews and honest operating stories.", startISO: "2026-09-06T10:00:00+01:00", endISO: "2026-09-06T12:30:00+01:00", venue: "Civic Centre", address: "Ozumba Mbadiwe Avenue, Victoria Island, Lagos", directionsUrl: "https://maps.google.com/?q=Civic+Centre+Lagos" },
        { id: "fc-afternoon", title: "Workshops and office hours", description: "Choose your room and go deeper on the work.", startISO: "2026-09-06T13:30:00+01:00", endISO: "2026-09-06T16:00:00+01:00", venue: "Civic Centre", address: "Ozumba Mbadiwe Avenue, Victoria Island, Lagos", directionsUrl: "https://maps.google.com/?q=Civic+Centre+Lagos" },
      ] },
      { id: "fc-faq", type: "faq", eyebrow: "Good to know", title: "Event FAQs", visible: true, tone: "tint", items: [
        { id: "fc-faq-1", question: "Who is this for?", answer: "Founders, operators and team leads working on an active business or product." },
        { id: "fc-faq-2", question: "Can my team attend together?", answer: "Yes. Choose multiple tickets and enter each attendee name during booking." },
      ] },
      actionSection("fc-cta", "Build better, together.", "Choose your ticket category and reserve places for your team.", "Choose tickets"),
    ],
  },
  "lumina-gala": {
    template: "celebration",
    shell: "platform",
    access: { mode: "public" },
    branding: { logoText: "LUMINA", accent: "#7557ff", background: "#f7f5fb", surface: "#ffffff", text: "#17131f", typography: "editorial", buttonStyle: "solid" },
    primaryAction: { type: "native", label: "Choose your seats" },
    seo: { title: "The Lumina Gala 2026", description: "A radiant night of dining, live music and unforgettable company.", image: images.celebrationHero },
    sections: [
      { id: "lumina-hero", type: "hero", title: "The Lumina Gala", subtitle: "An evening in full colour · 24 August 2026", visible: true, tone: "dark", media: { id: "lumina-hero-image", src: images.celebrationHero, alt: "Guests celebrating under warm event lighting" }, countdown: true },
      { id: "lumina-story", type: "story", eyebrow: "The evening", title: "A room made for connection.", body: ["Join creators, community leaders and friends for dinner, performance and small moments designed to stay with you.", "Dress beautifully, bring your curiosity and keep your group QR pass ready for a smooth arrival."], visible: true, tone: "light" },
      { id: "lumina-highlights", type: "highlights", eyebrow: "What to expect", title: "The night at a glance", visible: true, tone: "tint", items: [
        { id: "lumina-dinner", title: "A considered dinner", description: "A shared menu with complimentary options available." },
        { id: "lumina-music", title: "Live performance", description: "Special guests and music throughout the evening." },
        { id: "lumina-seats", title: "Your chosen seat", description: "Pick seats together and see the full group total before checkout." },
      ] },
      { id: "lumina-schedule", type: "schedule", eyebrow: "Programme", title: "Your evening", visible: true, tone: "light", items: [
        { id: "lumina-arrival", title: "Arrival and welcome", description: "Present your group QR pass and find your table.", startISO: "2026-08-24T18:00:00+01:00", endISO: "2026-08-24T19:00:00+01:00", venue: "The Monarch Event Centre", address: "138 Lekki–Epe Expressway, Lekki, Lagos", directionsUrl: "https://maps.google.com/?q=The+Monarch+Event+Centre+Lagos" },
        { id: "lumina-dinner-show", title: "Dinner and performances", description: "Dinner service followed by the headline programme.", startISO: "2026-08-24T19:00:00+01:00", endISO: "2026-08-24T23:00:00+01:00", venue: "The Monarch Event Centre", address: "138 Lekki–Epe Expressway, Lekki, Lagos", directionsUrl: "https://maps.google.com/?q=The+Monarch+Event+Centre+Lagos" },
      ] },
      actionSection("lumina-cta", "Choose your place in the room.", "Select multiple seats, name every attendee and receive one group pass.", "Choose seats"),
    ],
  },
};

export function createEditorPageConfig(template: EventPageTemplate, title: string, accent = "#7557ff"): EventPageConfig {
  const source = Object.values(eventPageConfigs).find((config) => config.template === template) ?? eventPageConfigs["lumina-gala"];
  return {
    ...source,
    access: { ...source.access, mode: "public" },
    branding: { ...source.branding, accent, logoText: title ? title.slice(0, 12).toUpperCase() : source.branding.logoText },
    seo: { ...source.seo, title: title || source.seo.title },
    sections: source.sections.map((section, index) => ({ ...section, id: `draft-${template}-${index}`, ...(section.type === "hero" ? { title: title || section.title } : {}) } as EventPageSection)),
  };
}
