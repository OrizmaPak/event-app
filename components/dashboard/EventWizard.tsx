"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Armchair,
  Check,
  Eye,
  Globe2,
  ImagePlus,
  Lock,
  Plus,
  Sparkles,
  Tags,
  Ticket,
  UserRoundCog,
  UsersRound,
} from "lucide-react";
import { useState } from "react";
import type { AdmissionMode, PricingMode } from "@/lib/data/types";
import { SeatPlanBuilder } from "./SeatPlanBuilder";

const steps = ["Event basics", "Event page", "Admission & seating", "Guest details", "Review & publish"];

const admissionOptions: { id: AdmissionMode; title: string; body: string; icon: typeof Ticket }[] = [
  { id: "general", title: "General admission", body: "Guests choose a quantity. No seat map is shown.", icon: UsersRound },
  { id: "assigned", title: "I assign the seats", body: "Guests choose a tier, then you place them later.", icon: UserRoundCog },
  { id: "selectable", title: "Guests pick seats", body: "Guests choose exact available seats from your plan.", icon: Armchair },
];

export function EventWizard() {
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("The Lumina Gala 2026");
  const [visibility, setVisibility] = useState("public");
  const [accent, setAccent] = useState("#7557ff");
  const [pricingMode, setPricingMode] = useState<PricingMode>("paid");
  const [admissionMode, setAdmissionMode] = useState<AdmissionMode>("selectable");
  const [published, setPublished] = useState(false);
  const stepCount = steps.length;

  function next() { setStep(Math.min(stepCount, step + 1)); }
  function back() { setStep(Math.max(1, step - 1)); }
  function publish() {
    setPublished(true);
    window.localStorage.setItem("nasa-demo-event-settings", JSON.stringify({ pricingMode, admissionMode, currency: "NGN" }));
    window.setTimeout(() => { window.location.href = "/organizer/events/lumina-gala"; }, 750);
  }

  return <div className={`event-wizard ${step === 3 && admissionMode !== "general" ? "event-wizard--planner" : ""}`}>
    <header className="wizard-top"><Link href="/organizer/events"><ArrowLeft size={16} /> Events</Link><span>New event</span><button type="button">Save draft</button></header>
    <div className="wizard-progress">{steps.map((label, index) => <div className={step >= index + 1 ? "active" : ""} key={label}><i>{step > index + 1 ? <Check size={13} /> : index + 1}</i><span><b>{label}</b><small>{index === 0 ? "Name, date & venue" : index === 1 ? "Look and information" : index === 2 ? "Tickets, prices & room" : index === 3 ? "Names and passes" : "Check everything"}</small></span></div>)}</div>
    <div className="wizard-body">
      <section className="wizard-form">
        {step === 1 && <><span className="eyebrow">Step 1 of {stepCount}</span><h1>Let&apos;s start with the basics.</h1><p>You can change any of these details later.</p><div className="field-grid"><label className="field field--full"><span>Event name</span><input value={title} onChange={(event) => setTitle(event.target.value)} /></label><label className="field"><span>Event type</span><select defaultValue="Celebration"><option>Celebration</option><option>Conference</option><option>Wedding</option><option>Community event</option></select></label><label className="field"><span>Who can see it?</span><select value={visibility} onChange={(event) => setVisibility(event.target.value)}><option value="public">Public - discoverable</option><option value="private">Private - invitation link only</option></select></label><label className="field"><span>Start date</span><input type="date" defaultValue="2026-08-24" /></label><label className="field"><span>Start time</span><input type="time" defaultValue="18:00" /></label><label className="field field--full"><span>Venue</span><input defaultValue="The Monarch Event Centre, Lagos" /></label></div></>}
        {step === 2 && <><span className="eyebrow">Step 2 of {stepCount}</span><h1>Give the page its personality.</h1><p>Choose a colour, write the story and see the guest page update beside you.</p><button className="cover-upload" type="button"><ImagePlus size={22} /><span><b>Add event cover</b><small>Upload a wide JPG or PNG · 1600 × 900 recommended</small></span></button><label className="field"><span>Short invitation line</span><input defaultValue="An evening in full colour" /></label><label className="field"><span>Event description</span><textarea defaultValue="A radiant night of dining, live music and unforgettable company." /></label><div className="theme-picker"><span>Event colour</span><div>{["#7557ff", "#078b9a", "#e05270", "#d28a28", "#27845b"].map((color) => <button key={color} className={accent === color ? "active" : ""} style={{ background: color }} onClick={() => setAccent(color)} type="button" aria-label={`Use ${color}`} />)}<label><Plus size={15} /><input type="color" value={accent} onChange={(event) => setAccent(event.target.value)} /></label></div></div></>}
        {step === 3 && <div className="admission-step"><div className="admission-step__intro"><span className="eyebrow">Step 3 of {stepCount}</span><h1>How will guests enter?</h1><p>Pricing and seating are independent. Choose the setup that fits this event.</p></div><div className="pricing-choice" role="group" aria-label="Event pricing"><button type="button" className={pricingMode === "free" ? "active" : ""} onClick={() => setPricingMode("free")}><span><Ticket size={18} /></span><b>Free event</b><small>Every publicly bookable place is free.</small></button><button type="button" className={pricingMode === "paid" ? "active" : ""} onClick={() => setPricingMode("paid")}><span><Tags size={18} /></span><b>Paid event</b><small>Use multiple prices, including complimentary seats.</small></button></div><div className="admission-choice" role="group" aria-label="Admission style">{admissionOptions.map((option) => <button type="button" key={option.id} className={admissionMode === option.id ? "active" : ""} onClick={() => setAdmissionMode(option.id)}><i>{admissionMode === option.id ? <Check size={14} /> : <option.icon size={17} />}</i><span><b>{option.title}</b><small>{option.body}</small></span></button>)}</div>{admissionMode === "general" ? <div className="general-admission-note"><UsersRound size={22} /><div><b>No seating plan required</b><span>Guests will choose their quantity and enter every attendee&apos;s name. You can still create Standard, VIP, or complimentary ticket tiers.</span></div></div> : <SeatPlanBuilder />}</div>}
        {step === 4 && <><span className="eyebrow">Step 4 of {stepCount}</span><h1>Know every person attending.</h1><p>One buyer can book any available quantity, but every place must have an attendee name.</p><div className="form-question-list"><div><i>1</i><span><b>Buyer name and email</b><small>Required · Booking owner</small></span><em>Required</em></div><div><i>2</i><span><b>Attendee name for every place</b><small>Required · Used at check-in</small></span><em>Required</em></div><div><i>3</i><span><b>Dietary or accessibility note</b><small>Optional per attendee</small></span><em>Optional</em></div><div><i>4</i><span><b>One group QR pass</b><small>Supports partial group arrival</small></span><em>Enabled</em></div></div><button className="button button--outline" type="button"><Plus size={15} /> Add a question</button><label className="switch-card"><input type="checkbox" defaultChecked /><span><b>Allow partial group check-in</b><small>Door staff select the people who are physically present.</small></span></label></>}
        {step === 5 && <><span className="eyebrow">Step 5 of {stepCount}</span><h1>Ready when you are.</h1><p>Review the important details. Publishing creates your shareable event page.</p><div className="publish-checklist"><div><span><Sparkles size={18} /></span><p><b>Event page</b><small>{title} · Page design complete</small></p><Check size={18} /></div><div><span>{visibility === "public" ? <Globe2 size={18} /> : <Lock size={18} />}</span><p><b>Visibility</b><small>{visibility === "public" ? "Public and discoverable" : "Private invitation link"}</small></p><Check size={18} /></div><div><span><Armchair size={18} /></span><p><b>{admissionOptions.find((item) => item.id === admissionMode)?.title}</b><small>{pricingMode === "paid" ? "Paid in NGN · Mixed price bands enabled" : "All places are free"}</small></p><Check size={18} /></div><div><span><Eye size={18} /></span><p><b>Group booking and QR</b><small>All attendee names required · Partial arrival enabled</small></p><Check size={18} /></div></div><div className="publish-note"><Globe2 size={17} /><span><b>Your event link</b><small>nasaevent.demo/events/lumina-gala</small></span></div></>}
        <div className="wizard-actions"><button className="button button--quiet" type="button" onClick={back} disabled={step === 1}><ArrowLeft size={16} /> Back</button>{step < stepCount ? <button className="button button--brand button--large" type="button" onClick={next}>Continue <ArrowRight size={16} /></button> : <button className="button button--brand button--large" type="button" onClick={publish}>{published ? "Publishing..." : <>Publish event <Sparkles size={16} /></>}</button>}</div>
      </section>
      {step !== 3 && <aside className="wizard-preview"><div className="wizard-preview__bar"><span>Live event page preview</span><button type="button">Open full preview <Eye size={13} /></button></div><div className="wizard-phone"><div className="wizard-phone__art" style={{ background: accent }}><small>YOU&apos;RE INVITED</small><h2>{title || "Your event name"}</h2><span>24 · 08 · 26</span></div><div className="wizard-phone__body"><small>{visibility === "public" ? "PUBLIC EVENT" : "PRIVATE INVITATION"}</small><h3>Save the date</h3><p>Monday, 24 August · 6:00 PM</p><button style={{ background: accent }}>{step >= 3 && admissionMode === "selectable" ? "Choose seats" : "RSVP now"}</button></div></div></aside>}
    </div>
  </div>;
}
