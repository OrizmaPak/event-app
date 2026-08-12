import type { Metadata } from "next";
import { Clock3, Mail, MessageCircle } from "lucide-react";
import { ContactForm } from "@/components/public/ContactForm";
import { PublicFooter } from "@/components/public/PublicFooter";
import { PublicHeader } from "@/components/public/PublicHeader";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() { return <><PublicHeader /><main className="public-main"><section className="page-hero"><div className="page-hero__inner"><span className="eyebrow">We&apos;re here to help</span><h1>Talk to a real person.</h1><p>Tell us what you are trying to do and where you got stuck. We&apos;ll keep the answer practical and easy to follow.</p></div></section><section className="public-section"><div className="page-shell contact-grid"><div className="contact-details"><article><span><Mail size={20} /></span><div><small>EMAIL SUPPORT</small><b>hello@nasaevent.demo</b></div></article><article><span><MessageCircle size={20} /></span><div><small>WHATSAPP SUPPORT</small><b>+234 800 555 2026</b></div></article><article><span><Clock3 size={20} /></span><div><small>RESPONSE HOURS</small><b>Monday–Friday · 8 AM–6 PM WAT</b></div></article></div><ContactForm /></div></section></main><PublicFooter /></>; }
