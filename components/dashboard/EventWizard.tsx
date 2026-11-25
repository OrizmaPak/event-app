"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Armchair,
  Check,
  Eye,
  Globe2,
  Lock,
  Plus,
  Sparkles,
  Tags,
  Ticket,
  Trash2,
  UserRoundCog,
  UsersRound,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { events } from "@/lib/data/mock-data";
import { createEditorPageConfig } from "@/lib/data/event-page-data";
import type { AdmissionMode, EventPageConfig, PricingMode, TicketCategory } from "@/lib/data/types";
import { EventPageBuilder } from "./EventPageBuilder";
import { SeatPlanBuilder, type SeatPlanDraft } from "./SeatPlanBuilder";

const steps = ["Event basics", "Event page", "Admission & seating", "Guest details", "Review & publish"];

const admissionOptions: { id: AdmissionMode; title: string; body: string; icon: typeof Ticket }[] = [
  { id: "general", title: "General admission", body: "Guests choose a quantity. No seat map is shown.", icon: UsersRound },
  { id: "assigned", title: "I assign the seats", body: "Guests choose a tier, then you place them later.", icon: UserRoundCog },
  { id: "selectable", title: "Guests pick seats", body: "Guests choose exact available seats from your plan.", icon: Armchair },
];

const initialTicketCategories: TicketCategory[] = [
  { id: "ticket-standard", name: "Standard", description: "General event admission", price: 12000, quantityAvailable: 250, color: "#7557ff" },
  { id: "ticket-vip", name: "VIP", description: "Priority access and VIP benefits", price: 35000, quantityAvailable: 50, color: "#d28a28" },
];

type QuestionType = "short_text" | "long_text" | "email" | "phone" | "number" | "date" | "time" | "single_choice" | "multi_choice" | "checkbox" | "consent" | "file" | "rating";
type QuestionScope = "buyer" | "each_attendee" | "booking";
type EventDay = { date: string; startTime: string; endTime: string };

interface CustomQuestion {
  id: string;
  label: string;
  type: QuestionType;
  scope: QuestionScope;
  required: boolean;
  placeholder: string;
  helpText: string;
  options: string[];
  min: string;
  max: string;
}

const questionTypes: { id: QuestionType; label: string; needsOptions?: boolean; supportsRange?: boolean }[] = [
  { id: "short_text", label: "Short answer" },
  { id: "long_text", label: "Long answer" },
  { id: "email", label: "Email" },
  { id: "phone", label: "Phone number" },
  { id: "number", label: "Number", supportsRange: true },
  { id: "date", label: "Date" },
  { id: "time", label: "Time" },
  { id: "single_choice", label: "Single choice", needsOptions: true },
  { id: "multi_choice", label: "Multiple choice", needsOptions: true },
  { id: "checkbox", label: "Checkbox" },
  { id: "consent", label: "Agreement / consent" },
  { id: "file", label: "File upload" },
  { id: "rating", label: "Rating scale", supportsRange: true },
];

const emptyQuestionDraft: CustomQuestion = {
  id: "",
  label: "",
  type: "short_text",
  scope: "each_attendee",
  required: false,
  placeholder: "",
  helpText: "",
  options: ["Option 1", "Option 2"],
  min: "",
  max: "",
};

function formatEventDates(dates: string[]) {
  const labels = dates.filter(Boolean).map((date) => new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${date}T12:00:00`)));
  if (labels.length <= 1) return labels[0] ?? "Choose your event dates";
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")} and ${labels.at(-1)}`;
}

export function EventWizard() {
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("The Lumina Gala 2026");
  const [category, setCategory] = useState("Celebration");
  const [visibility, setVisibility] = useState("public");
  const [eventSchedule, setEventSchedule] = useState<EventDay[]>([{ date: "2027-08-24", startTime: "18:00", endTime: "22:00" }]);
  const [venue, setVenue] = useState("The Monarch Event Centre");
  const [address, setAddress] = useState("Lagos, Nigeria");
  const [accent] = useState("#7557ff");
  const [pricingMode, setPricingMode] = useState<PricingMode>("paid");
  const [admissionMode, setAdmissionMode] = useState<AdmissionMode>("selectable");
  const [ticketCategories, setTicketCategories] = useState<TicketCategory[]>(initialTicketCategories);
  const [customQuestions, setCustomQuestions] = useState<CustomQuestion[]>([]);
  const [questionModalOpen, setQuestionModalOpen] = useState(false);
  const [questionDraft, setQuestionDraft] = useState<CustomQuestion>(emptyQuestionDraft);
  const [published, setPublished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [pageConfig, setPageConfig] = useState<EventPageConfig | null>(null);
  const [seatPlan, setSeatPlan] = useState<SeatPlanDraft | null>(null);
  const stepCount = steps.length;

  function setEventDayCount(value: number) {
    const count = Math.max(1, Math.min(31, value || 1));
    setEventSchedule((days) => Array.from({ length: count }, (_, index) => days[index] ?? { date: "", startTime: "18:00", endTime: "22:00" }));
  }
  function updateEventDay(index: number, patch: Partial<EventDay>) { setEventSchedule((days) => days.map((day, dayIndex) => dayIndex === index ? { ...day, ...patch } : day)); }

  function saveAdmissionSettings() {
    window.localStorage.setItem("nasa-demo-event-settings", JSON.stringify({ pricingMode, admissionMode, currency: "NGN", ticketCategories: ticketCategories.map((category) => ({ ...category, price: pricingMode === "free" ? 0 : category.price })) }));
  }
  function next() {
    if (step === 3) saveAdmissionSettings();
    setStep(Math.min(stepCount, step + 1));
  }
  function back() { setStep(Math.max(1, step - 1)); }
  async function saveEvent(status: "draft" | "published") {
    setSaving(true);
    setSaveError("");
    if (status === "published") setPublished(true);
    saveAdmissionSettings();
    const template = category === "Wedding" ? "wedding" : category === "Conference" ? "business" : "celebration";
    const schedule = eventSchedule.filter((day) => day.date).sort((a, b) => a.date.localeCompare(b.date));
    const selectedDates = schedule.map((day) => day.date);
    const firstDay = schedule[0] ?? { date: "", startTime: "18:00", endTime: "22:00" };
    const lastDay = schedule.at(-1) ?? firstDay;
    const page = { ...(pageConfig ?? createEditorPageConfig(template, title, accent)), eventDates: selectedDates, schedule };
    try {
      const response = await fetch("/api/v1/workspaces/current/events", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
        title, category, visibility, pricingMode, admissionMode, currency: "NGN", startAt: `${firstDay.date}T${firstDay.startTime}:00+01:00`, endAt: `${lastDay.date}T${lastDay.endTime}:00+01:00`, eventDates: selectedDates, schedule, timezone: "Africa/Lagos",
        venue, address, city: "Lagos", accent, capacity: admissionMode === "selectable" ? 0 : ticketCategories.reduce((sum, item) => sum + item.quantityAvailable, 0),
        status, page, ticketCategories, questions: customQuestions, seating: admissionMode === "selectable" ? seatPlan : undefined,
      }) });
      const body = await response.json() as { data?: { slug: string }; error?: { message?: string } };
      if (!response.ok || !body.data) throw new Error(body.error?.message ?? "The event could not be saved.");
      window.location.href = `/organizer/events/${body.data.slug}`;
    } catch (error) {
      setPublished(false);
      setSaving(false);
      setSaveError(error instanceof Error ? error.message : "The event could not be saved.");
    }
  }
  function openQuestionModal() {
    setQuestionDraft({ ...emptyQuestionDraft, id: `question-${Date.now()}` });
    setQuestionModalOpen(true);
  }
  function editQuestion(question: CustomQuestion) {
    setQuestionDraft({ ...question, options: question.options.length ? question.options : ["Option 1", "Option 2"] });
    setQuestionModalOpen(true);
  }
  function saveQuestion(question: CustomQuestion) {
    const selectedType = questionTypes.find((type) => type.id === question.type);
    const normalizedQuestion = {
      ...question,
      label: question.label.trim(),
      placeholder: question.placeholder.trim(),
      helpText: question.helpText.trim(),
      options: selectedType?.needsOptions ? question.options.map((option) => option.trim()).filter(Boolean) : [],
    };
    if (!normalizedQuestion.label) return;
    setCustomQuestions((questions) => questions.some((item) => item.id === normalizedQuestion.id) ? questions.map((item) => item.id === normalizedQuestion.id ? normalizedQuestion : item) : [...questions, normalizedQuestion]);
    setQuestionModalOpen(false);
  }
  function removeQuestion(id: string) {
    setCustomQuestions((questions) => questions.filter((question) => question.id !== id));
  }

  const previewDay = eventSchedule.find((day) => day.date) ?? { date: "2027-08-24", startTime: "18:00", endTime: "22:00" };
  const draftEvent = { ...events[0], title, shortTitle: title, accent, dateISO: `${previewDay.date}T${previewDay.startTime}:00+01:00` };
  const previewDate = previewDay.date ? new Date(`${previewDay.date}T${previewDay.startTime}:00`).toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "long" }) : "Choose a date";

  return <div className={`event-wizard ${step === 2 ? "event-wizard--page-builder" : step === 3 ? "event-wizard--planner" : ""}`}>
    <header className="wizard-top"><Link href="/organizer/events"><ArrowLeft size={16} /> Events</Link><span>New event</span><button type="button" disabled={saving || title.trim().length < 3} onClick={() => void saveEvent("draft")}>{saving ? "Saving..." : "Save draft"}</button></header>
    <div className="wizard-progress">{steps.map((label, index) => <div className={step >= index + 1 ? "active" : ""} key={label}><i>{step > index + 1 ? <Check size={13} /> : index + 1}</i><span><b>{label}</b><small>{index === 0 ? "Name, date & venue" : index === 1 ? "Look and information" : index === 2 ? "Tickets, prices & room" : index === 3 ? "Names and passes" : "Check everything"}</small></span></div>)}</div>
    <div className="wizard-body">
      <section className="wizard-form">
        {step === 1 && <><span className="eyebrow">Step 1 of {stepCount}</span><h1>Let&apos;s start with the basics.</h1><p>Set each programme day with its own date and time range. Days can be consecutive or separate.</p><div className="field-grid"><label className="field field--full"><span>Event name</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. The Lumina Gala" /></label><label className="field"><span>Event type</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option>Celebration</option><option>Conference</option><option>Wedding</option><option>Community event</option></select></label><label className="field"><span>Visibility & guest access</span><select value={visibility} onChange={(event) => setVisibility(event.target.value)}><option value="public">Public · listed and open</option><option value="private-listed">Private · listed with invitation gate</option><option value="private-unlisted">Private · hidden, invitation link only</option></select><small>Private guests enter their email and unique invitation code.</small></label><label className="field"><span>How many event days?</span><input type="number" min="1" max="31" value={eventSchedule.length} onChange={(event) => setEventDayCount(Number(event.target.value))} /><small>Add up to 31 separately scheduled days.</small></label><section className="event-schedule-picker field--full"><header><div><span>Programme schedule</span><small>Choose a date and the time range for each day.</small></div></header><div>{eventSchedule.map((day, index) => <article className="event-schedule-row" key={index}><strong>Day {index + 1}</strong><label className="field"><span>Date</span><input type="date" value={day.date} onChange={(event) => updateEventDay(index, { date: event.target.value })} /></label><label className="field"><span>Starts</span><input type="time" value={day.startTime} onChange={(event) => updateEventDay(index, { startTime: event.target.value })} /></label><label className="field"><span>Ends</span><input type="time" value={day.endTime} onChange={(event) => updateEventDay(index, { endTime: event.target.value })} /></label></article>)}</div></section><label className="field"><span>Venue</span><input value={venue} onChange={(event) => setVenue(event.target.value)} /></label><label className="field"><span>Address</span><input value={address} onChange={(event) => setAddress(event.target.value)} /></label></div></>}
        {step === 2 && <EventPageBuilder event={draftEvent} dateSummary={formatEventDates(eventSchedule.map((day) => day.date))} onChange={setPageConfig} persist={false} />}
        {step === 3 && <div className={`admission-step admission-step--${admissionMode}`}><div className="admission-step__intro"><span className="eyebrow">Step 3 of {stepCount}</span><h1>How will guests enter?</h1><p>Ticket categories sell quantities. Seat price bands price specific positions in a room.</p></div><div className="pricing-choice" role="group" aria-label="Event pricing"><button type="button" className={pricingMode === "free" ? "active" : ""} onClick={() => setPricingMode("free")}><span><Ticket size={18} /></span><b>Free event</b><small>Every category or publicly bookable seat is free.</small></button><button type="button" className={pricingMode === "paid" ? "active" : ""} onClick={() => setPricingMode("paid")}><span><Tags size={18} /></span><b>Paid event</b><small>Set category prices or seat price bands.</small></button></div><div className="admission-choice" role="group" aria-label="Admission style">{admissionOptions.map((option) => <button type="button" key={option.id} className={admissionMode === option.id ? "active" : ""} onClick={() => setAdmissionMode(option.id)}><i>{admissionMode === option.id ? <Check size={14} /> : <option.icon size={17} />}</i><span><b>{option.title}</b><small>{option.body}</small></span></button>)}</div>{admissionMode === "selectable" ? <SeatPlanBuilder onChange={setSeatPlan} /> : <TicketCategoryEditor categories={ticketCategories} pricingMode={pricingMode} onChange={setTicketCategories} />}</div>}
        {step === 4 && <><span className="eyebrow">Step 4 of {stepCount}</span><h1>Know every person attending.</h1><p>One buyer can book any available quantity, but every place must have an attendee name.</p><div className="form-question-list"><div><i>1</i><span><b>Buyer name and email</b><small>Required · Booking owner</small></span><em>Required</em></div><div><i>2</i><span><b>Attendee name for every place</b><small>Required · Used at check-in</small></span><em>Required</em></div><div><i>3</i><span><b>Dietary or accessibility note</b><small>Optional per attendee</small></span><em>Optional</em></div><div><i>4</i><span><b>One group QR pass</b><small>Supports partial group arrival</small></span><em>Enabled</em></div>{customQuestions.map((question, index) => <div key={question.id} className="custom-question-row"><i>{index + 5}</i><span><b>{question.label}</b><small>{questionTypeLabel(question.type)} · {questionScopeLabel(question.scope)}{question.options.length ? ` · ${question.options.length} options` : ""}</small></span><em>{question.required ? "Required" : "Optional"}</em><button type="button" onClick={() => editQuestion(question)}>Edit</button><button type="button" onClick={() => removeQuestion(question.id)} aria-label={`Delete ${question.label}`}><Trash2 size={15} /></button></div>)}</div><button className="button button--outline" type="button" onClick={openQuestionModal}><Plus size={15} /> Add a question</button><label className="switch-card"><input type="checkbox" defaultChecked /><span><b>Allow partial group check-in</b><small>Door staff select the people who are physically present.</small></span></label></>}
        {step === 5 && <><span className="eyebrow">Step 5 of {stepCount}</span><h1>Ready when you are.</h1><p>Review the important details. Publishing creates your shareable event page.</p><div className="publish-checklist"><div><span><Sparkles size={18} /></span><p><b>Event page</b><small>{title} · Page design complete</small></p><Check size={18} /></div><div><span>{visibility === "public" ? <Globe2 size={18} /> : <Lock size={18} />}</span><p><b>Visibility</b><small>{visibility === "public" ? "Public and discoverable" : "Private invitation link"}</small></p><Check size={18} /></div><div><span><Armchair size={18} /></span><p><b>{admissionOptions.find((item) => item.id === admissionMode)?.title}</b><small>{pricingMode === "paid" ? "Paid in NGN · Mixed price bands enabled" : "All places are free"}</small></p><Check size={18} /></div><div><span><Eye size={18} /></span><p><b>Group booking and QR</b><small>All attendee names required · Partial arrival enabled</small></p><Check size={18} /></div></div><div className="publish-note"><Globe2 size={17} /><span><b>Your event link</b><small>nasaevent.demo/events/lumina-gala</small></span></div></>}
        {saveError && <div className="form-error" role="alert">{saveError}</div>}
        <div className="wizard-actions"><button className="button button--quiet" type="button" onClick={back} disabled={step === 1 || saving}><ArrowLeft size={16} /> Back</button>{step < stepCount ? <button className="button button--brand button--large" type="button" onClick={next}>Continue <ArrowRight size={16} /></button> : <button className="button button--brand button--large" type="button" disabled={saving || title.trim().length < 3 || !venue.trim()} onClick={() => void saveEvent("published")}>{published ? "Publishing..." : <>Publish event <Sparkles size={16} /></>}</button>}</div>
      </section>
      {step !== 2 && step !== 3 && <aside className="wizard-preview"><div className="wizard-preview__bar"><span>Live event page preview</span><button type="button">Open full preview <Eye size={13} /></button></div><div className="wizard-phone"><div className="wizard-phone__art" style={{ background: accent }}><small>YOU&apos;RE INVITED</small><h2>{title || "Your event name"}</h2><span>{previewDay.date ? previewDay.date.split("-").reverse().join(" · ") : "Choose a date"}</span></div><div className="wizard-phone__body"><small>{visibility === "public" ? "PUBLIC EVENT" : "PRIVATE INVITATION"}</small><h3>Save the date</h3><p>{previewDate} · {previewDay.startTime}</p><PreviewCountdown target={`${previewDay.date}T${previewDay.startTime}:00`} /><button style={{ background: accent }}>{step >= 3 && admissionMode === "selectable" ? "Choose seats" : "RSVP now"}</button></div></div></aside>}
    </div>
    {questionModalOpen && <QuestionModal draft={questionDraft} onChange={setQuestionDraft} onClose={() => setQuestionModalOpen(false)} onSave={saveQuestion} />}
  </div>;
}

function PreviewCountdown({ target }: { target: string }) {
  const [remaining, setRemaining] = useState(() => getCountdownValues(target));
  useEffect(() => {
    const update = () => setRemaining(getCountdownValues(target));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [target]);
  return <div className="wizard-live-countdown" aria-label="Live event countdown"><small>LIVE COUNTDOWN</small><div><span><b>{remaining.days}</b><em>days</em></span><span><b>{remaining.hours}</b><em>hrs</em></span><span><b>{remaining.minutes}</b><em>min</em></span><span><b>{remaining.seconds}</b><em>sec</em></span></div></div>;
}

function getCountdownValues(target: string) {
  const distance = Math.max(new Date(target).getTime() - Date.now(), 0);
  return { days: Math.floor(distance / 86_400_000), hours: Math.floor(distance / 3_600_000) % 24, minutes: Math.floor(distance / 60_000) % 60, seconds: Math.floor(distance / 1000) % 60 };
}

function questionTypeLabel(type: QuestionType) {
  return questionTypes.find((item) => item.id === type)?.label ?? "Question";
}

function questionScopeLabel(scope: QuestionScope) {
  if (scope === "buyer") return "Buyer only";
  if (scope === "each_attendee") return "Every attendee";
  return "Whole booking";
}

function QuestionModal({ draft, onChange, onClose, onSave }: { draft: CustomQuestion; onChange: (draft: CustomQuestion) => void; onClose: () => void; onSave: (draft: CustomQuestion) => void }) {
  const selectedType = questionTypes.find((type) => type.id === draft.type) ?? questionTypes[0];
  const validOptions = draft.options.map((option) => option.trim()).filter(Boolean);
  const canSave = draft.label.trim().length > 0 && (!selectedType.needsOptions || validOptions.length >= 2);

  function update(patch: Partial<CustomQuestion>) {
    onChange({ ...draft, ...patch });
  }

  function updateOption(index: number, value: string) {
    update({ options: draft.options.map((option, optionIndex) => optionIndex === index ? value : option) });
  }

  function addOption() {
    update({ options: [...draft.options, `Option ${draft.options.length + 1}`] });
  }

  function removeOption(index: number) {
    update({ options: draft.options.filter((_, optionIndex) => optionIndex !== index) });
  }

  return <div className="question-modal" role="dialog" aria-modal="true" aria-labelledby="question-modal-title"><form onSubmit={(event) => { event.preventDefault(); if (canSave) onSave(draft); }}><header><div><span className="dashboard-eyebrow">Custom registration question</span><h2 id="question-modal-title">{draft.label ? "Edit question" : "Create a new question"}</h2><p>Build anything from simple text fields to choices, consent, file upload requests, and attendee-level questions.</p></div><button type="button" onClick={onClose} aria-label="Close question builder"><X size={20} /></button></header><div className="question-modal-grid"><label className="field field--full"><span>Question text</span><input autoFocus value={draft.label} onChange={(event) => update({ label: event.target.value })} placeholder="e.g. Do you have any accessibility needs?" /></label><label className="field"><span>Question type</span><select value={draft.type} onChange={(event) => update({ type: event.target.value as QuestionType })}>{questionTypes.map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}</select></label><label className="field"><span>Ask this for</span><select value={draft.scope} onChange={(event) => update({ scope: event.target.value as QuestionScope })}><option value="each_attendee">Every attendee</option><option value="buyer">Buyer only</option><option value="booking">Whole booking</option></select></label><label className="field field--full"><span>Placeholder or example answer</span><input value={draft.placeholder} onChange={(event) => update({ placeholder: event.target.value })} placeholder="Optional hint shown inside the field" /></label><label className="field field--full"><span>Help text</span><textarea value={draft.helpText} onChange={(event) => update({ helpText: event.target.value })} placeholder="Optional guidance shown under the question" /></label>{selectedType.supportsRange && <div className="question-range"><label className="field"><span>{draft.type === "rating" ? "Lowest rating" : "Minimum value"}</span><input value={draft.min} onChange={(event) => update({ min: event.target.value })} placeholder={draft.type === "rating" ? "1" : "Optional"} /></label><label className="field"><span>{draft.type === "rating" ? "Highest rating" : "Maximum value"}</span><input value={draft.max} onChange={(event) => update({ max: event.target.value })} placeholder={draft.type === "rating" ? "5" : "Optional"} /></label></div>}{selectedType.needsOptions && <section className="question-options"><div><span>Answer options</span><button type="button" onClick={addOption}><Plus size={15} /> Add option</button></div>{draft.options.map((option, index) => <label key={index}><input value={option} onChange={(event) => updateOption(index, event.target.value)} placeholder={`Option ${index + 1}`} /><button type="button" onClick={() => removeOption(index)} disabled={draft.options.length <= 2} aria-label={`Remove option ${index + 1}`}><Trash2 size={15} /></button></label>)}<small>Choice questions need at least two options.</small></section>}<label className="switch-card question-required"><input type="checkbox" checked={draft.required} onChange={(event) => update({ required: event.target.checked })} /><span><b>Require an answer</b><small>Guests cannot confirm their booking until this question is answered.</small></span></label></div><footer><button className="button button--quiet" type="button" onClick={onClose}>Cancel</button><button className="button button--brand" type="submit" disabled={!canSave}>Save question</button></footer></form></div>;
}

function TicketCategoryEditor({ categories, pricingMode, onChange }: { categories: TicketCategory[]; pricingMode: PricingMode; onChange: (categories: TicketCategory[]) => void }) {
  const totalInventory = categories.reduce((sum, category) => sum + category.quantityAvailable, 0);
  const projectedRevenue = categories.reduce((sum, category) => sum + category.quantityAvailable * (pricingMode === "free" ? 0 : category.price), 0);

  function update(id: string, patch: Partial<TicketCategory>) {
    onChange(categories.map((category) => category.id === id ? { ...category, ...patch } : category));
  }

  function addCategory() {
    onChange([...categories, { id: `ticket-${Date.now()}`, name: `Category ${categories.length + 1}`, description: "General event admission", price: 0, quantityAvailable: 100, color: "#078b9a" }]);
  }

  function removeCategory(id: string) {
    if (categories.length <= 1) return;
    onChange(categories.filter((category) => category.id !== id));
  }

  return <section className="ticket-category-builder"><header><div><span className="dashboard-eyebrow">General admission inventory</span><h2>Create ticket categories</h2><p>Guests buy a category and quantity. No seats are selected.</p></div><button type="button" className="button button--brand button--small" onClick={addCategory}><Plus size={14} /> Add category</button></header><div className="ticket-category-metrics"><div><small>Categories</small><b>{categories.length}</b></div><div><small>Total available</small><b>{totalInventory}</b></div><div><small>Potential sales</small><b>{pricingMode === "free" ? "Free event" : new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0, notation: "compact" }).format(projectedRevenue)}</b></div></div><div className="ticket-category-list"><div className="ticket-category-labels"><span>Category</span><span>Description</span><span>Price</span><span>Quantity available</span><span /></div>{categories.map((category) => <article key={category.id}><label className="ticket-category-name"><input type="color" value={category.color} onChange={(event) => update(category.id, { color: event.target.value })} aria-label={`${category.name} colour`} /><input value={category.name} onChange={(event) => update(category.id, { name: event.target.value })} aria-label="Category name" /></label><label><input value={category.description} onChange={(event) => update(category.id, { description: event.target.value })} aria-label={`${category.name} description`} /></label><label className="ticket-category-price"><span>₦</span><input type="number" min="0" step="500" value={pricingMode === "free" ? 0 : category.price} disabled={pricingMode === "free"} onChange={(event) => update(category.id, { price: Math.max(0, Number(event.target.value)) })} aria-label={`${category.name} price`} /></label><label><input type="number" min="1" value={category.quantityAvailable} onChange={(event) => update(category.id, { quantityAvailable: Math.max(1, Number(event.target.value)) })} aria-label={`${category.name} quantity available`} /></label><button type="button" onClick={() => removeCategory(category.id)} disabled={categories.length <= 1} title={`Delete ${category.name}`}><Trash2 size={15} /></button></article>)}</div><footer><UsersRound size={17} /><span><b>{totalInventory} tickets available across {categories.length} categories</b><small>Every buyer will still enter the name of each person in their order.</small></span></footer></section>;
}
