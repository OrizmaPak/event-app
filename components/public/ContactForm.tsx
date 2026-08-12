"use client";

import { Check, Send } from "lucide-react";
import { useState } from "react";

export function ContactForm() {
  const [sent, setSent] = useState(false);
  return <form className="form-card" onSubmit={(event) => { event.preventDefault(); setSent(true); }}><h2>Send us a message</h2><p>This prototype shows the complete client-side form. A backend will later route the submission to support.</p><div className="field-grid"><label className="field"><span>Full name</span><input required placeholder="Your name" /></label><label className="field"><span>Email address</span><input required type="email" placeholder="you@example.com" /></label><label className="field field--full"><span>What can we help with?</span><select><option>Creating an event</option><option>Managing an RSVP</option><option>Using the check-in app</option><option>Something else</option></select></label><label className="field field--full"><span>Message</span><textarea required placeholder="Tell us what happened or what you need." /></label></div><button className="button button--brand button--large" type="submit">{sent ? <><Check size={17} /> Message prepared</> : <>Send message <Send size={16} /></>}</button>{sent && <p className="privacy-note"><Check size={16} /> Mock mode: your message was not sent to a real inbox.</p>}</form>;
}
