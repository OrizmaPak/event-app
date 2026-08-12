import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PublicFooter } from "@/components/public/PublicFooter";
import { PublicHeader } from "@/components/public/PublicHeader";

export const metadata: Metadata = { title: "Help centre" };
const faqs = [
  ["Do guests need to create an account?", "No. Guests open the invitation link, respond and receive their personal event pass without creating an account."],
  ["Is every QR code different?", "Yes. Every confirmed guest receives a unique pass connected to their guest record and event."],
  ["Can I assign tables after people RSVP?", "Yes. Organizers can assign or change tables and seats from the guest and seating areas before event day."],
  ["What happens if the internet is weak at the venue?", "The event-day application includes connection status, retry guidance, a prepared offline roster and manual pass-code lookup as fallback paths."],
  ["Can a guest use the same pass twice?", "The check-in screen shows when a pass has already been used and requires a supervisor to reverse a mistaken check-in."],
  ["Can my event be private?", "Yes. Private events are available only to people with the invitation link and do not appear in public event discovery."],
];

export default function HelpPage() { return <><PublicHeader /><main className="public-main"><section className="page-hero"><div className="page-hero__inner"><span className="eyebrow">Help centre</span><h1>Clear answers, without the technical language.</h1><p>Find quick guidance for organizing an event, responding to an invitation or checking guests in.</p></div></section><section className="public-section"><div className="page-shell faq-layout"><aside><span className="eyebrow">Common questions</span><h2>What would you like to know?</h2><p>Still need help? Send our support team a message and include the event name.</p><Link className="button button--brand" href="/contact">Contact support <ArrowRight size={15} /></Link></aside><div className="faq-list">{faqs.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div></div></section></main><PublicFooter /></>; }
