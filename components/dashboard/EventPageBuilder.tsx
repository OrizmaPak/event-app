"use client";

import { ArrowDown, ArrowUp, Copy, Eye, EyeOff, Fullscreen, ImageUp, Laptop, LoaderCircle, Plus, Save, Smartphone, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { EventMicrosite } from "@/components/public/EventMicrosite";
import { createEditorPageConfig, templateLabels } from "@/lib/data/event-page-data";
import type { EventPageConfig, EventPageSection, EventPageSectionType, EventPageTemplate, EventRecord } from "@/lib/data/types";

const sectionNames: Record<EventPageSectionType, string> = {
  hero: "Hero", story: "Story", schedule: "Schedule", people: "People", highlights: "Highlights", venue: "Venue", travel: "Travel", gallery: "Gallery", sponsors: "Sponsors", registry: "Registry", faq: "FAQ", contact: "Contact", cta: "Final call to action",
};

function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }

function defaultSection(type: "schedule"): Extract<EventPageSection, { type: "schedule" }>;
function defaultSection(type: EventPageSectionType): EventPageSection;
function defaultSection(type: EventPageSectionType): EventPageSection {
  const base = { id: `section-${type}-${Date.now()}`, type, title: sectionNames[type], eyebrow: "New section", visible: true, tone: "light" as const };
  if (type === "hero") return { ...base, type, subtitle: "A memorable experience begins here.", countdown: true };
  if (type === "story") return { ...base, type, body: ["Tell guests what makes this gathering special."] };
  if (type === "schedule") return { ...base, type, items: [{ id: `schedule-${Date.now()}`, title: "Event begins", description: "Add the details guests need.", startISO: "2026-12-12T10:00:00+01:00", endISO: "2026-12-12T12:00:00+01:00", venue: "Event venue", address: "Lagos, Nigeria" }] };
  if (type === "people") return { ...base, type, intro: "Meet the people shaping the experience.", people: [{ id: `person-${Date.now()}`, name: "Guest name", role: "Role", bio: "Short introduction." }] };
  if (type === "highlights") return { ...base, type, items: [{ id: `highlight-${Date.now()}`, title: "A useful highlight", description: "Explain what guests can expect." }] };
  if (type === "venue") return { ...base, type, description: "Everything guests need for arrival.", venues: [{ id: `venue-${Date.now()}`, name: "Event venue", address: "Lagos, Nigeria" }] };
  if (type === "travel") return { ...base, type, intro: "Helpful recommendations for out-of-town guests.", items: [{ id: `travel-${Date.now()}`, category: "hotel", title: "Recommended hotel", description: "Add a helpful note and optional link." }] };
  if (type === "gallery") return { ...base, type, media: [{ id: `media-${Date.now()}`, src: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1000&q=80", alt: "Guests enjoying an event" }] };
  if (type === "sponsors") return { ...base, type, intro: "With support from", names: ["Partner name"] };
  if (type === "registry") return { ...base, type, intro: "Your presence is the greatest gift.", methods: [{ id: `gift-${Date.now()}`, type: "link", label: "Gift list", url: "https://example.com", description: "Open the registry." }] };
  if (type === "faq") return { ...base, type, items: [{ id: `faq-${Date.now()}`, question: "What should guests know?", answer: "Add a clear and useful answer." }] };
  if (type === "contact") return { ...base, type, body: "Contact the event team if you need help.", email: "hello@example.com" };
  return { ...base, type: "cta", body: "Reserve your place and join us.", buttonLabel: "Respond now", tone: "dark" };
}

function mergeTemplate(current: EventPageConfig, nextTemplate: EventPageTemplate, title: string) {
  const next = createEditorPageConfig(nextTemplate, title, current.branding.accent);
  const used = new Set<string>();
  next.sections = next.sections.map((section) => {
    const existing = current.sections.find((item) => item.type === section.type && !used.has(item.id));
    if (!existing) return section;
    used.add(existing.id);
    return { ...existing, tone: section.tone } as EventPageSection;
  });
  const extras = current.sections.filter((section) => !used.has(section.id) && !next.sections.some((item) => item.id === section.id));
  next.sections.push(...extras);
  next.branding = { ...next.branding, accent: current.branding.accent, background: current.branding.background, surface: current.branding.surface, text: current.branding.text };
  next.access = current.access;
  next.primaryAction = current.primaryAction;
  return next;
}

function commonPatch(section: EventPageSection, patch: Partial<EventPageSection>) { return { ...section, ...patch } as EventPageSection; }

export function EventPageBuilder({ event, initialConfig, dateSummary = "", onChange, persist = true }: { event: EventRecord; initialConfig?: EventPageConfig; dateSummary?: string; onChange?: (config: EventPageConfig) => void; persist?: boolean }) {
  const [config, setConfig] = useState<EventPageConfig>(() => {
    const base = clone(initialConfig ?? event.eventPage ?? createEditorPageConfig(event.category === "Wedding" ? "wedding" : event.category === "Business" ? "business" : event.category === "Culture" ? "show" : "celebration", event.title, event.accent));
    return { ...base, sections: base.sections.map((section) => section.type === "hero" ? { ...section, title: event.title, subtitle: dateSummary || section.subtitle } : section) };
  });
  const [selectedId, setSelectedId] = useState(() => config.sections[0]?.id ?? "");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [fullPreview, setFullPreview] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState("");
  const [heroImageMode, setHeroImageMode] = useState<"upload" | "link">("upload");
  const [inspectorElement, setInspectorElement] = useState<HTMLElement | null>(null);
  const selected = config.sections.find((section) => section.id === selectedId) ?? config.sections[0];
  const previewEvent = useMemo(() => ({ ...event, eventPage: config, accent: config.branding.accent }), [event, config]);
  const issues = useMemo(() => {
    const messages: string[] = [];
    const hero = config.sections.find((section) => section.type === "hero" && section.visible);
    if (!hero?.title.trim()) messages.push("Add a hero title");
    if (!config.primaryAction.label.trim()) messages.push("Name the primary action");
    if (config.primaryAction.type === "external" && !config.primaryAction.url?.startsWith("http")) messages.push("Add a complete external URL");
    config.sections.forEach((section) => {
      if (section.type === "gallery" && section.visible && section.media.some((media) => !media.alt.trim())) messages.push("Describe every gallery image");
      if (section.type === "schedule" && section.visible && section.items.some((item) => !item.venue.trim() || !item.startISO)) messages.push("Complete every schedule venue and date");
    });
    return [...new Set(messages)];
  }, [config]);

  useEffect(() => { onChange?.(config); }, [config, onChange]);
  useEffect(() => { setInspectorElement(document.querySelector<HTMLElement>(".page-builder-inspector")); }, []);

  async function savePage() {
    setSaving(true);
    setSaveNotice("");
    const response = await fetch(`/api/v1/workspaces/current/events/${event.slug}/page`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ config }) });
    const body = await response.json() as { error?: { message?: string } };
    setSaving(false);
    setSaveNotice(response.ok ? "Page design saved." : body.error?.message ?? "Page design could not be saved.");
  }

  function updateConfig(patch: Partial<EventPageConfig>) { setConfig((value) => ({ ...value, ...patch })); }
  function updateSelected(next: EventPageSection) { setConfig((value) => ({ ...value, sections: value.sections.map((section) => section.id === next.id ? next : section) })); }
  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= config.sections.length) return;
    const sections = [...config.sections];
    [sections[index], sections[target]] = [sections[target], sections[index]];
    updateConfig({ sections });
  }
  function duplicate(section: EventPageSection) {
    const copy = clone(section);
    copy.id = `${section.id}-copy-${Date.now()}`;
    copy.title = `${section.title} copy`;
    const index = config.sections.findIndex((item) => item.id === section.id);
    const sections = [...config.sections];
    sections.splice(index + 1, 0, copy);
    updateConfig({ sections });
    setSelectedId(copy.id);
  }
  function remove(section: EventPageSection) {
    const sections = config.sections.filter((item) => item.id !== section.id);
    updateConfig({ sections });
    setSelectedId(sections[0]?.id ?? "");
  }
  function addSection(type: EventPageSectionType) {
    const section = defaultSection(type);
    updateConfig({ sections: [...config.sections, section] });
    setSelectedId(section.id);
    setAddOpen(false);
  }

  return <div className="event-page-builder">
    <header className="page-builder-toolbar"><div><span className="dashboard-eyebrow">Event microsite</span><h2>Design the guest experience</h2><p>Choose a strong starting point, then shape every section.</p>{saveNotice && <small role="status">{saveNotice}</small>}</div><div className="page-builder-toolbar__actions"><div className="page-builder-device" aria-label="Preview size"><button type="button" className={device === "desktop" ? "active" : ""} onClick={() => setDevice("desktop")} title="Desktop preview"><Laptop size={17} /></button><button type="button" className={device === "mobile" ? "active" : ""} onClick={() => setDevice("mobile")} title="Mobile preview"><Smartphone size={17} /></button></div><button className="button button--outline button--small" type="button" onClick={() => setFullPreview(true)}><Fullscreen size={15} /> Full preview</button>{persist && <button className="button button--brand button--small" type="button" disabled={saving} onClick={() => void savePage()}><Save size={15} /> {saving ? "Saving..." : "Save"}</button>}</div></header>

    <div className="page-builder-template-row">{(Object.keys(templateLabels) as EventPageTemplate[]).map((template) => <button type="button" key={template} className={config.template === template ? "active" : ""} onClick={() => setConfig((value) => mergeTemplate(value, template, event.title))}><b>{templateLabels[template]}</b><span>{template === "wedding" ? "Story-led and intimate" : template === "show" ? "Bold and media-first" : template === "business" ? "Agenda and speakers" : "Warm and flexible"}</span></button>)}</div>

    <div className="page-builder-settings"><label><span>Page shell</span><select value={config.shell} onChange={(event) => updateConfig({ shell: event.target.value as EventPageConfig["shell"] })}><option value="platform">NASA EVENT</option><option value="microsite">Branded microsite</option></select></label><label><span>Visibility & access</span><select value={config.access.mode} onChange={(event) => updateConfig({ access: { ...config.access, mode: event.target.value as EventPageConfig["access"]["mode"] } })}><option value="public">Public · listed and open</option><option value="private-listed">Private · listed with invitation gate</option><option value="private-unlisted">Private · unlisted invitation only</option></select></label><label><span>Primary action</span><select value={config.primaryAction.type} onChange={(event) => updateConfig({ primaryAction: { ...config.primaryAction, type: event.target.value as "native" | "external" } })}><option value="native">NASA RSVP / tickets</option><option value="external">External link</option></select></label><label><span>Button label</span><input value={config.primaryAction.label} onChange={(event) => updateConfig({ primaryAction: { ...config.primaryAction, label: event.target.value } })} /></label>{config.primaryAction.type === "external" && <label><span>External URL</span><input value={config.primaryAction.url ?? ""} onChange={(event) => updateConfig({ primaryAction: { ...config.primaryAction, url: event.target.value } })} placeholder="https://" /></label>}<label><span>Accent</span><span className="page-builder-color"><input type="color" value={config.branding.accent} onChange={(event) => updateConfig({ branding: { ...config.branding, accent: event.target.value } })} /><input value={config.branding.accent} onChange={(event) => updateConfig({ branding: { ...config.branding, accent: event.target.value } })} /></span></label><label><span>Type style</span><select value={config.branding.typography} onChange={(event) => updateConfig({ branding: { ...config.branding, typography: event.target.value as EventPageConfig["branding"]["typography"] } })}><option value="editorial">Editorial</option><option value="modern">Modern</option><option value="bold">Bold display</option></select></label></div>

    <div className="page-builder-workspace">
      <aside className="page-builder-sections"><header><div><span>Page sections</span><small>{config.sections.filter((section) => section.visible).length} visible</small></div><button type="button" onClick={() => setAddOpen((value) => !value)}><Plus size={15} /> Add</button>{addOpen && <div className="page-builder-add-menu">{(Object.keys(sectionNames) as EventPageSectionType[]).filter((type) => type !== "hero" || !config.sections.some((section) => section.type === "hero")).map((type) => <button type="button" key={type} onClick={() => addSection(type)}>{sectionNames[type]}</button>)}</div>}</header><div>{config.sections.map((section, index) => <article key={section.id} className={selected?.id === section.id ? "active" : ""} onClick={() => setSelectedId(section.id)}><button type="button" className="page-builder-section-main"><span>{String(index + 1).padStart(2, "0")}</span><p><b>{section.title}</b><small>{sectionNames[section.type]}</small></p></button><div><button type="button" onClick={(event) => { event.stopPropagation(); updateSelected(commonPatch(section, { visible: !section.visible })); }} title={section.visible ? "Hide section" : "Show section"}>{section.visible ? <Eye size={14} /> : <EyeOff size={14} />}</button><button type="button" onClick={(event) => { event.stopPropagation(); move(index, -1); }} disabled={index === 0} title="Move up"><ArrowUp size={14} /></button><button type="button" onClick={(event) => { event.stopPropagation(); move(index, 1); }} disabled={index === config.sections.length - 1} title="Move down"><ArrowDown size={14} /></button></div></article>)}</div></aside>

      <section className="page-builder-inspector">{selected ? <><header><div><span className="dashboard-eyebrow">{sectionNames[selected.type]}</span><h3>Edit section</h3></div><div><button type="button" onClick={() => duplicate(selected)} title="Duplicate section"><Copy size={15} /></button><button type="button" onClick={() => remove(selected)} disabled={selected.type === "hero"} title="Delete section"><Trash2 size={15} /></button></div></header><div className="page-builder-fields"><label><span>Section title</span><input value={selected.title} onChange={(event) => updateSelected(commonPatch(selected, { title: event.target.value }))} /></label><label><span>Eyebrow</span><input value={selected.eyebrow ?? ""} onChange={(event) => updateSelected(commonPatch(selected, { eyebrow: event.target.value }))} /></label><label><span>Section treatment</span><select value={selected.tone ?? "light"} onChange={(event) => updateSelected(commonPatch(selected, { tone: event.target.value as "light" | "tint" | "dark" }))}><option value="light">Light</option><option value="tint">Tinted</option><option value="dark">Dark</option></select></label>{selected.type === "hero" && <><label><span>Invitation line</span><textarea value={selected.subtitle} onChange={(event) => updateSelected({ ...selected, subtitle: event.target.value })} /></label><label><span>Hero image URL</span><input value={selected.media?.src ?? ""} onChange={(event) => updateSelected({ ...selected, media: { id: selected.media?.id ?? `hero-${Date.now()}`, src: event.target.value, alt: selected.media?.alt ?? "" } })} /></label><label><span>Image description</span><input value={selected.media?.alt ?? ""} onChange={(event) => updateSelected({ ...selected, media: { id: selected.media?.id ?? `hero-${Date.now()}`, src: selected.media?.src ?? "", alt: event.target.value } })} /></label><label className="page-builder-check"><input type="checkbox" checked={selected.countdown} onChange={(event) => updateSelected({ ...selected, countdown: event.target.checked })} /><span>Show live countdown</span></label></>}{selected.type === "story" && <><label><span>Story paragraphs</span><textarea rows={7} value={selected.body.join("\n\n")} onChange={(event) => updateSelected({ ...selected, body: event.target.value.split(/\n\s*\n/) })} /></label><label><span>Pull quote</span><input value={selected.quote ?? ""} onChange={(event) => updateSelected({ ...selected, quote: event.target.value })} /></label></>}{selected.type === "schedule" && <ListEditor title="Schedule items" items={selected.items} summary={(item) => item.title} onAdd={() => updateSelected({ ...selected, items: [...selected.items, defaultSection("schedule").type === "schedule" ? defaultSection("schedule").items[0] : selected.items[0]] })} render={(item, index) => <><input value={item.title} onChange={(event) => updateSelected({ ...selected, items: selected.items.map((value, itemIndex) => itemIndex === index ? { ...value, title: event.target.value } : value) })} placeholder="Item title" /><input type="datetime-local" value={item.startISO.slice(0, 16)} onChange={(event) => updateSelected({ ...selected, items: selected.items.map((value, itemIndex) => itemIndex === index ? { ...value, startISO: `${event.target.value}:00+01:00` } : value) })} /><input value={item.venue} onChange={(event) => updateSelected({ ...selected, items: selected.items.map((value, itemIndex) => itemIndex === index ? { ...value, venue: event.target.value } : value) })} placeholder="Venue" /></>} />}{selected.type === "faq" && <ListEditor title="Questions" items={selected.items} summary={(item) => item.question} onAdd={() => updateSelected({ ...selected, items: [...selected.items, { id: `faq-${Date.now()}`, question: "New question", answer: "Add the answer." }] })} render={(item, index) => <><input value={item.question} onChange={(event) => updateSelected({ ...selected, items: selected.items.map((value, itemIndex) => itemIndex === index ? { ...value, question: event.target.value } : value) })} /><textarea value={item.answer} onChange={(event) => updateSelected({ ...selected, items: selected.items.map((value, itemIndex) => itemIndex === index ? { ...value, answer: event.target.value } : value) })} /></>} />}{selected.type === "gallery" && <ListEditor title="Gallery images" items={selected.media} summary={(item) => item.alt || "Untitled image"} onAdd={() => updateSelected({ ...selected, media: [...selected.media, { id: `media-${Date.now()}`, src: "", alt: "" }] })} render={(item, index) => <><input value={item.src} onChange={(event) => updateSelected({ ...selected, media: selected.media.map((value, itemIndex) => itemIndex === index ? { ...value, src: event.target.value } : value) })} placeholder="Image URL" /><input value={item.alt} onChange={(event) => updateSelected({ ...selected, media: selected.media.map((value, itemIndex) => itemIndex === index ? { ...value, alt: event.target.value } : value) })} placeholder="Image description" /></>} />}{selected.type === "cta" && <><label><span>Supporting copy</span><textarea value={selected.body} onChange={(event) => updateSelected({ ...selected, body: event.target.value })} /></label><label><span>Button label</span><input value={selected.buttonLabel} onChange={(event) => updateSelected({ ...selected, buttonLabel: event.target.value })} /></label></>}</div></> : <p>Select a section to edit it.</p>}</section>

      <section className={`page-builder-preview page-builder-preview--${device}`}><header><span>Live draft preview</span><b className={issues.length ? "needs-work" : "ready"}>{issues.length ? `${issues.length} check${issues.length === 1 ? "" : "s"}` : "Ready"}</b></header><div className="page-builder-preview__canvas"><EventMicrosite event={previewEvent} config={config} preview skipAccess /></div></section>
    </div>
    {inspectorElement && selected?.type === "hero" && createPortal(<div className="page-builder-upload page-builder-upload--inside"><HeroImageChooser mode={heroImageMode} onModeChange={setHeroImageMode} value={selected.media?.src ?? ""} alt={selected.media?.alt ?? "Hero image"} onLinkChange={(src) => updateSelected({ ...selected, media: { id: selected.media?.id ?? `hero-${Date.now()}`, src, alt: selected.media?.alt ?? "Hero image" } })} onUploaded={(media) => updateSelected({ ...selected, media })} /></div>, inspectorElement)}
    {inspectorElement && selected?.type === "schedule" && createPortal(<ScheduleEditor section={selected} onChange={updateSelected} />, inspectorElement)}
    {inspectorElement && selected?.type === "highlights" && createPortal(<HighlightsEditor section={selected} onChange={updateSelected} />, inspectorElement)}
    {inspectorElement && selected?.type === "travel" && createPortal(<TravelEditor section={selected} onChange={updateSelected} />, inspectorElement)}
    {inspectorElement && selected?.type === "cta" && createPortal(<CtaEyebrowEditor section={selected} fallback={config.branding.logoText} onChange={updateSelected} />, inspectorElement)}
    {selected && (selected.type === "hero" || selected.type === "gallery") && <div className="page-builder-upload">{selected.type === "hero" ? <HeroImageChooser mode={heroImageMode} onModeChange={setHeroImageMode} value={selected.media?.src ?? ""} alt={selected.media?.alt ?? "Hero image"} onLinkChange={(src) => updateSelected({ ...selected, media: { id: selected.media?.id ?? `hero-${Date.now()}`, src, alt: selected.media?.alt ?? "Hero image" } })} onUploaded={(media) => updateSelected({ ...selected, media })} /> : <ImageUploader label="Add gallery image" alt="Gallery image" onUploaded={(media) => updateSelected({ ...selected, media: [...selected.media, media] })} />}</div>}
    {issues.length > 0 && <div className="page-builder-validation"><b>Before publishing</b>{issues.map((issue) => <span key={issue}>{issue}</span>)}</div>}
    {fullPreview && <div className="page-builder-full" role="dialog" aria-modal="true" aria-label="Full event page preview"><button type="button" onClick={() => setFullPreview(false)}><X size={18} /> Close preview</button><EventMicrosite event={previewEvent} config={config} preview skipAccess /></div>}
  </div>;
}

function ListEditor<T>({ title, items, summary, render, onAdd }: { title: string; items: T[]; summary: (item: T) => string; render: (item: T, index: number) => React.ReactNode; onAdd: () => void }) {
  return <section className="page-builder-list-editor"><header><span>{title}</span><button type="button" onClick={onAdd}><Plus size={14} /> Add</button></header>{items.map((item, index) => <details key={index} open={index === 0}><summary>{summary(item)}</summary><div>{render(item, index)}</div></details>)}</section>;
}

function HighlightsEditor({ section, onChange }: { section: Extract<EventPageSection, { type: "highlights" }>; onChange: (next: EventPageSection) => void }) {
  return <div className="page-builder-upload page-builder-upload--inside highlights-editor"><ListEditor title="Highlight cards" items={section.items} summary={(item) => item.title || "Untitled highlight"} onAdd={() => onChange({ ...section, items: [...section.items, { id: `highlight-${Date.now()}`, title: "New highlight", description: "Describe this highlight for guests." }] })} render={(item, index) => <><label><span>Highlight title</span><input value={item.title} onChange={(event) => onChange({ ...section, items: section.items.map((value, itemIndex) => itemIndex === index ? { ...value, title: event.target.value } : value) })} placeholder="Title" /></label><label><span>Description</span><textarea rows={4} value={item.description} onChange={(event) => onChange({ ...section, items: section.items.map((value, itemIndex) => itemIndex === index ? { ...value, description: event.target.value } : value) })} placeholder="Tell guests what this highlight includes." /></label><button type="button" className="button button--quiet highlights-editor__remove" onClick={() => onChange({ ...section, items: section.items.filter((_, itemIndex) => itemIndex !== index) })}><Trash2 size={14} /> Remove highlight</button></>} /></div>;
}

function TravelEditor({ section, onChange }: { section: Extract<EventPageSection, { type: "travel" }>; onChange: (next: EventPageSection) => void }) {
  const patchItem = (index: number, patch: Partial<(typeof section.items)[number]>) => onChange({ ...section, items: section.items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item) });
  const addItem = () => onChange({ ...section, items: [...section.items, { id: `travel-${Date.now()}`, category: "hotel", title: "New recommendation", description: "Add a helpful note for guests." }] });
  return <div className="page-builder-upload page-builder-upload--inside travel-editor"><ListEditor title="Travel recommendations" items={section.items} summary={(item) => item.title || "Untitled recommendation"} onAdd={addItem} render={(item, index) => <><label><span>Recommendation type</span><select value={item.category} onChange={(event) => patchItem(index, { category: event.target.value as (typeof item)["category"] })}><option value="hotel">Hotel</option><option value="transport">Transport</option><option value="parking">Parking</option><option value="note">Helpful note</option></select></label><label><span>Title</span><input value={item.title} onChange={(event) => patchItem(index, { title: event.target.value })} placeholder="Place or recommendation name" /></label><label><span>Description</span><textarea rows={4} value={item.description} onChange={(event) => patchItem(index, { description: event.target.value })} placeholder="Explain why guests should consider this." /></label><label><span>Recommendation link</span><input type="url" value={item.url ?? ""} onChange={(event) => patchItem(index, { url: event.target.value })} placeholder="https://..." /></label><label><span>Image URL</span><input type="url" value={item.media?.src ?? ""} onChange={(event) => patchItem(index, { media: { id: item.media?.id ?? `travel-media-${Date.now()}`, src: event.target.value, alt: item.media?.alt ?? item.title } })} placeholder="Paste an image link or upload below" /></label><label><span>Image description</span><input value={item.media?.alt ?? ""} onChange={(event) => patchItem(index, { media: item.media ? { ...item.media, alt: event.target.value } : { id: `travel-media-${Date.now()}`, src: "", alt: event.target.value } })} placeholder="Describe the image" /></label><ImageUploader label="Upload recommendation image" alt={item.media?.alt || item.title} onUploaded={(media) => patchItem(index, { media })} /><button type="button" className="button button--quiet travel-editor__remove" onClick={() => onChange({ ...section, items: section.items.filter((_, itemIndex) => itemIndex !== index) })}><Trash2 size={14} /> Remove recommendation</button></>} /></div>;
}

function CtaEyebrowEditor({ section, fallback, onChange }: { section: Extract<EventPageSection, { type: "cta" }>; fallback: string; onChange: (next: EventPageSection) => void }) {
  return <div className="page-builder-upload page-builder-upload--inside cta-eyebrow-editor"><label><span>CTA eyebrow</span><small>The label shown above the final call to action. It currently reads “{fallback}”.</small><input value={section.eyebrow ?? fallback} onChange={(event) => onChange({ ...section, eyebrow: event.target.value })} placeholder="Lumina" /></label></div>;
}

function ScheduleEditor({ section, onChange }: { section: Extract<EventPageSection, { type: "schedule" }>; onChange: (next: EventPageSection) => void }) {
  const patchItem = (index: number, patch: Partial<(typeof section.items)[number]>) => onChange({ ...section, items: section.items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item) });
  const addItem = () => onChange({ ...section, items: [...section.items, { id: `schedule-${Date.now()}`, title: "New schedule item", description: "Add the details guests need.", startISO: "2026-12-12T10:00:00+01:00", endISO: "2026-12-12T12:00:00+01:00", venue: "Event venue", address: "Lagos, Nigeria", directionsUrl: "", scheduleMode: "date-time" }] });
  return <div className="page-builder-upload page-builder-upload--inside schedule-editor"><ListEditor title="Schedule items" items={section.items} summary={(item) => item.title || "Untitled schedule item"} onAdd={addItem} render={(item, index) => { const mode = item.scheduleMode ?? "date-time"; const patch = (value: Partial<(typeof item)>) => patchItem(index, value); const localStart = item.startISO.slice(0, 16); const localEnd = item.endISO.slice(0, 16); return <><label><span>Title</span><input value={item.title} onChange={(event) => patch({ title: event.target.value })} placeholder="Schedule title" /></label><label><span>Description</span><textarea rows={4} value={item.description} onChange={(event) => patch({ description: event.target.value })} placeholder="Describe what happens." /></label><label><span>Schedule display</span><select value={mode} onChange={(event) => patch({ scheduleMode: event.target.value as NonNullable<(typeof item)["scheduleMode"]> })}><option value="day">Day label</option><option value="date">Date</option><option value="time">Time</option><option value="date-time">Date and time</option></select></label>{mode === "day" && <label><span>Day label</span><input value={item.dayLabel ?? ""} onChange={(event) => patch({ dayLabel: event.target.value })} placeholder="Day 1 or Opening day" /></label>}{(mode === "date" || mode === "date-time") && <label><span>{mode === "date" ? "Date" : "Start date and time"}</span><input type={mode === "date" ? "date" : "datetime-local"} value={mode === "date" ? localStart.slice(0, 10) : localStart} onChange={(event) => patch({ startISO: mode === "date" ? `${event.target.value}T${localStart.slice(11) || "10:00"}:00+01:00` : `${event.target.value}:00+01:00` })} /></label>}{mode === "time" && <label><span>Start time</span><input type="time" value={localStart.slice(11, 16)} onChange={(event) => patch({ startISO: `${localStart.slice(0, 10)}T${event.target.value}:00+01:00` })} /></label>}{(mode === "time" || mode === "date-time") && <label><span>{mode === "time" ? "End time" : "End date and time"}</span><input type={mode === "time" ? "time" : "datetime-local"} value={mode === "time" ? localEnd.slice(11, 16) : localEnd} onChange={(event) => patch({ endISO: mode === "time" ? `${localEnd.slice(0, 10)}T${event.target.value}:00+01:00` : `${event.target.value}:00+01:00` })} /></label>}<label><span>Event centre name</span><input value={item.venue} onChange={(event) => patch({ venue: event.target.value })} placeholder="Event centre or venue name" /></label><label><span>Full address</span><textarea rows={3} value={item.address} onChange={(event) => patch({ address: event.target.value })} placeholder="Street, area, city, country" /></label><label><span>Directions link</span><input type="url" value={item.directionsUrl ?? ""} onChange={(event) => patch({ directionsUrl: event.target.value })} placeholder="https://maps.google.com/..." /></label><button type="button" className="button button--quiet schedule-editor__remove" onClick={() => onChange({ ...section, items: section.items.filter((_, itemIndex) => itemIndex !== index) })}><Trash2 size={14} /> Remove schedule item</button></>; }} /></div>;
}

function ImageUploader({ label, alt, onUploaded }: { label: string; alt: string; onUploaded: (media: { id: string; src: string; alt: string }) => void }) {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  async function upload(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setMessage("Choose an image file."); return; }
    setUploading(true); setMessage("");
    try {
      const signResponse = await fetch("/api/v1/media/sign", { method: "POST" });
      const signBody = await signResponse.json() as { data?: { uploadUrl: string; apiKey: string; timestamp: number; folder: string; signature: string }; error?: { message?: string } };
      if (!signResponse.ok || !signBody.data) throw new Error(signBody.error?.message ?? "Image uploads are not configured.");
      const form = new FormData();
      form.append("file", file); form.append("api_key", signBody.data.apiKey); form.append("timestamp", String(signBody.data.timestamp)); form.append("folder", signBody.data.folder); form.append("signature", signBody.data.signature);
      const cloudResponse = await fetch(signBody.data.uploadUrl, { method: "POST", body: form });
      const cloudBody = await cloudResponse.json() as { secure_url?: string; public_id?: string; width?: number; height?: number; bytes?: number; error?: { message?: string } };
      if (!cloudResponse.ok || !cloudBody.secure_url || !cloudBody.public_id) throw new Error(cloudBody.error?.message ?? "Cloudinary could not upload this image.");
      const description = alt.trim() || file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
      const assetResponse = await fetch("/api/v1/media", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ providerId: cloudBody.public_id, url: cloudBody.secure_url, alt: description, width: cloudBody.width, height: cloudBody.height, bytes: cloudBody.bytes }) });
      if (!assetResponse.ok) throw new Error("The image uploaded, but its media record could not be saved.");
      onUploaded({ id: `media-${Date.now()}`, src: cloudBody.secure_url, alt: description });
      setMessage("Image uploaded and added to the preview.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Image upload failed."); } finally { setUploading(false); }
  }
  return <label className="page-builder-upload__control"><span><ImageUp size={17} /><b>{uploading ? "Uploading image…" : label}</b><small>{message || "JPG, PNG or WebP. Your image appears in the live preview once uploaded."}</small></span><input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={(event) => void upload(event.target.files?.[0])} />{uploading && <LoaderCircle className="spin" size={17} />}</label>;
}

function HeroImageChooser({ mode, onModeChange, value, alt, onLinkChange, onUploaded }: { mode: "upload" | "link"; onModeChange: (mode: "upload" | "link") => void; value: string; alt: string; onLinkChange: (value: string) => void; onUploaded: (media: { id: string; src: string; alt: string }) => void }) {
  return <section className="hero-image-chooser"><header><div><b>Hero image</b><small>Choose one way to add the image used in the live preview.</small></div><div className="hero-image-chooser__modes" role="tablist" aria-label="Hero image source"><button type="button" className={mode === "upload" ? "active" : ""} onClick={() => onModeChange("upload")} role="tab" aria-selected={mode === "upload"}>Upload image</button><button type="button" className={mode === "link" ? "active" : ""} onClick={() => onModeChange("link")} role="tab" aria-selected={mode === "link"}>Paste link</button></div></header>{mode === "upload" ? <ImageUploader label="Upload hero image" alt={alt} onUploaded={onUploaded} /> : <label className="hero-image-link"><span>Image URL</span><input type="url" value={value} onChange={(event) => onLinkChange(event.target.value)} placeholder="https://example.com/hero-image.jpg" /></label>}</section>;
}
