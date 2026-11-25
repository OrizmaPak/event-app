"use client";
/* eslint-disable @next/next/no-img-element -- resource media uses verified dynamic provider URLs and original lightbox proportions */

import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowUpRight, ChevronLeft, ChevronRight, ImageIcon, Mail, MapPin, MessageCircle, Phone, Globe, X } from "lucide-react";
import { useState } from "react";
import type { ResourceContent, ResourceTerm, PublicResource } from "@/lib/resources/model";

export function ResourceImage({ src, alt, className = "" }: { src?: string; alt?: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  return <div className={`rs-image ${className}`}>{src && !failed ? <>{/* The provider URL is verified at registration; dimensions vary by upload. */}<img src={src} alt={alt ?? ""} loading="lazy" onError={() => setFailed(true)} /></> : <span className="rs-no-image"><ImageIcon size={28} /><span>No image available</span></span>}</div>;
}
export function ResourceCard({ item, preview = false }: { item: PublicResource; preview?: boolean }) {
  const body = <><ResourceImage src={item.content.images[0]?.url} alt={item.content.images[0]?.alt} /><div className="rs-card-body"><span className="rs-provider">{item.provider}</span><h3>{item.content.title || "Listing title"}<ArrowUpRight size={18} /></h3><p>{item.content.subtitle || "Your service at a glance"}</p>{item.content.location && <span className="rs-location"><MapPin size={14} />{item.content.location}</span>}<div className="rs-tags">{item.categories.slice(0, 2).map((term) => <span key={term.id}>{term.name}</span>)}{item.categories.length > 2 && <span>+{item.categories.length - 2}</span>}</div></div></>;
  return preview ? <article className="rs-card">{body}</article> : <Link className="rs-card" href={`/resources/${item.slug}`}>{body}</Link>;
}
export function ResourceDetail({ content, provider, terms, preview = false }: { content: ResourceContent; provider: string; terms: ResourceTerm[]; preview?: boolean }) {
  const [photo, setPhoto] = useState<number | null>(null);
  const [cover, setCover] = useState(0);
  const images = content.images;
  const categories = terms.filter((term) => content.categoryIds.includes(term.id));
  const eventTypes = terms.filter((term) => content.eventTypeIds.includes(term.id));
  const contact = content.contact;
  const active = Math.min(cover, Math.max(images.length - 1, 0));
  return <article className="rs-detail">
    <header className="rs-detail-heading"><span className="rs-provider">{provider}</span><h1>{content.title || "Listing title"}</h1><p>{content.subtitle}</p>{content.location && <span className="rs-location"><MapPin size={16} />{content.location}</span>}</header>
    <div className="rs-detail-layout"><div className="rs-detail-main">
      <div className="rs-gallery"><button type="button" className="rs-gallery-cover" disabled={!images.length} onClick={() => setPhoto(active)} aria-label="Open image gallery"><ResourceImage key={images[active]?.url ?? "empty"} src={images[active]?.url} alt={images[active]?.alt} /></button>{images.length > 1 && <div className="rs-thumbnails">{images.map((image, index) => <button type="button" key={image.assetId} aria-label={`View image ${index + 1}`} aria-pressed={active === index} onClick={() => setCover(index)}><ResourceImage src={image.url} alt={image.alt} /></button>)}</div>}</div>
      <section className="rs-detail-section"><h2>About this service</h2><p className="rs-description">{content.description || "Add a description of your service."}</p></section>
      <section className="rs-detail-section"><h2>Services</h2><div className="rs-tags">{categories.map((term) => <span key={term.id}>{term.name}</span>)}</div></section>
      <section className="rs-detail-section"><h2>Events covered</h2><div className="rs-tags">{eventTypes.map((term) => <span key={term.id}>{term.name}</span>)}</div>{content.serviceArea && <p><b>Service area:</b> {content.serviceArea}</p>}</section>
    </div><aside className="rs-contact"><span className="rs-provider">CONTACT PROVIDER</span><h2>{provider}</h2><p>Get in touch to discuss your event and availability.</p>{[
      { value: contact.phone, href: `tel:${contact.phone.replace(/[^\d+]/g, "")}`, label: "Call provider", icon: Phone },
      { value: contact.whatsapp, href: `https://wa.me/${contact.whatsapp.replace(/\D/g, "")}`, label: "WhatsApp", icon: MessageCircle },
      { value: contact.email, href: `mailto:${contact.email}`, label: "Send email", icon: Mail },
      { value: contact.website, href: contact.website, label: "Visit website", icon: Globe },
    ].filter((item) => item.value).map(({ href, label, icon: Icon }) => preview ? <button disabled key={label}><Icon size={18} />{label}</button> : <a href={href} key={label} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer"><Icon size={18} />{label}<ArrowUpRight size={15} /></a>)}</aside></div>
    <Dialog.Root open={photo !== null} onOpenChange={(open) => { if (!open) setPhoto(null); }}><Dialog.Portal><Dialog.Overlay className="rs-overlay" /><Dialog.Content className="rs-lightbox" aria-describedby={undefined} onKeyDown={(event) => { if (event.key === "ArrowRight") setPhoto(((photo ?? 0) + 1) % images.length); if (event.key === "ArrowLeft") setPhoto(((photo ?? 0) + images.length - 1) % images.length); }}><Dialog.Title className="rs-sr-only">Listing gallery</Dialog.Title><Dialog.Close className="rs-icon-button rs-lightbox-close" aria-label="Close gallery"><X /></Dialog.Close>{photo !== null && images[photo] && <>{/* Lightbox images retain their original proportions. */}<img src={images[photo].url} alt={images[photo].alt} /></>}<div className="rs-lightbox-controls"><button aria-label="Previous image" onClick={() => setPhoto(((photo ?? 0) + images.length - 1) % images.length)}><ChevronLeft /></button><span>{(photo ?? 0) + 1} / {images.length}</span><button aria-label="Next image" onClick={() => setPhoto(((photo ?? 0) + 1) % images.length)}><ChevronRight /></button></div></Dialog.Content></Dialog.Portal></Dialog.Root>
  </article>;
}
