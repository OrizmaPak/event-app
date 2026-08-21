"use client";

import { ArrowDown, ArrowUp, Copy, Eye, EyeOff, Fullscreen, Laptop, Plus, Smartphone, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
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

export function EventPageBuilder({ event, initialConfig }: { event: EventRecord; initialConfig?: EventPageConfig }) {
  const [config, setConfig] = useState<EventPageConfig>(() => clone(initialConfig ?? event.eventPage ?? createEditorPageConfig(event.category === "Wedding" ? "wedding" : event.category === "Business" ? "business" : event.category === "Culture" ? "show" : "celebration", event.title, event.accent)));
  const [selectedId, setSelectedId] = useState(() => config.sections[0]?.id ?? "");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [fullPreview, setFullPreview] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
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
    <header className="page-builder-toolbar"><div><span className="dashboard-eyebrow">Event microsite</span><h2>Design the guest experience</h2><p>Choose a strong starting point, then shape every section.</p></div><div className="page-builder-toolbar__actions"><div className="page-builder-device" aria-label="Preview size"><button type="button" className={device === "desktop" ? "active" : ""} onClick={() => setDevice("desktop")} title="Desktop preview"><Laptop size={17} /></button><button type="button" className={device === "mobile" ? "active" : ""} onClick={() => setDevice("mobile")} title="Mobile preview"><Smartphone size={17} /></button></div><button className="button button--outline button--small" type="button" onClick={() => setFullPreview(true)}><Fullscreen size={15} /> Full preview</button></div></header>

    <div className="page-builder-template-row">{(Object.keys(templateLabels) as EventPageTemplate[]).map((template) => <button type="button" key={template} className={config.template === template ? "active" : ""} onClick={() => setConfig((value) => mergeTemplate(value, template, event.title))}><b>{templateLabels[template]}</b><span>{template === "wedding" ? "Story-led and intimate" : template === "show" ? "Bold and media-first" : template === "business" ? "Agenda and speakers" : "Warm and flexible"}</span></button>)}</div>

    <div className="page-builder-settings"><label><span>Page shell</span><select value={config.shell} onChange={(event) => updateConfig({ shell: event.target.value as EventPageConfig["shell"] })}><option value="platform">NASA EVENT</option><option value="microsite">Branded microsite</option></select></label><label><span>Visibility & access</span><select value={config.access.mode} onChange={(event) => updateConfig({ access: { ...config.access, mode: event.target.value as EventPageConfig["access"]["mode"] } })}><option value="public">Public · listed and open</option><option value="private-listed">Private · listed with invitation gate</option><option value="private-unlisted">Private · unlisted invitation only</option></select></label><label><span>Primary action</span><select value={config.primaryAction.type} onChange={(event) => updateConfig({ primaryAction: { ...config.primaryAction, type: event.target.value as "native" | "external" } })}><option value="native">NASA RSVP / tickets</option><option value="external">External link</option></select></label><label><span>Button label</span><input value={config.primaryAction.label} onChange={(event) => updateConfig({ primaryAction: { ...config.primaryAction, label: event.target.value } })} /></label>{config.primaryAction.type === "external" && <label><span>External URL</span><input value={config.primaryAction.url ?? ""} onChange={(event) => updateConfig({ primaryAction: { ...config.primaryAction, url: event.target.value } })} placeholder="https://" /></label>}<label><span>Accent</span><span className="page-builder-color"><input type="color" value={config.branding.accent} onChange={(event) => updateConfig({ branding: { ...config.branding, accent: event.target.value } })} /><input value={config.branding.accent} onChange={(event) => updateConfig({ branding: { ...config.branding, accent: event.target.value } })} /></span></label><label><span>Type style</span><select value={config.branding.typography} onChange={(event) => updateConfig({ branding: { ...config.branding, typography: event.target.value as EventPageConfig["branding"]["typography"] } })}><option value="editorial">Editorial</option><option value="modern">Modern</option><option value="bold">Bold display</option></select></label></div>

    <div className="page-builder-workspace">
      <aside className="page-builder-sections"><header><div><span>Page sections</span><small>{config.sections.filter((section) => section.visible).length} visible</small></div><button type="button" onClick={() => setAddOpen((value) => !value)}><Plus size={15} /> Add</button>{addOpen && <div className="page-builder-add-menu">{(Object.keys(sectionNames) as EventPageSectionType[]).filter((type) => type !== "hero" || !config.sections.some((section) => section.type === "hero")).map((type) => <button type="button" key={type} onClick={() => addSection(type)}>{sectionNames[type]}</button>)}</div>}</header><div>{config.sections.map((section, index) => <article key={section.id} className={selected?.id === section.id ? "active" : ""} onClick={() => setSelectedId(section.id)}><button type="button" className="page-builder-section-main"><span>{String(index + 1).padStart(2, "0")}</span><p><b>{section.title}</b><small>{sectionNames[section.type]}</small></p></button><div><button type="button" onClick={(event) => { event.stopPropagation(); updateSelected(commonPatch(section, { visible: !section.visible })); }} title={section.visible ? "Hide section" : "Show section"}>{section.visible ? <Eye size={14} /> : <EyeOff size={14} />}</button><button type="button" onClick={(event) => { event.stopPropagation(); move(index, -1); }} disabled={index === 0} title="Move up"><ArrowUp size={14} /></button><button type="button" onClick={(event) => { event.stopPropagation(); move(index, 1); }} disabled={index === config.sections.length - 1} title="Move down"><ArrowDown size={14} /></button></div></article>)}</div></aside>

      <section className="page-builder-inspector">{selected ? <><header><div><span className="dashboard-eyebrow">{sectionNames[selected.type]}</span><h3>Edit section</h3></div><div><button type="button" onClick={() => duplicate(selected)} title="Duplicate section"><Copy size={15} /></button><button type="button" onClick={() => remove(selected)} disabled={selected.type === "hero"} title="Delete section"><Trash2 size={15} /></button></div></header><div className="page-builder-fields"><label><span>Section title</span><input value={selected.title} onChange={(event) => updateSelected(commonPatch(selected, { title: event.target.value }))} /></label><label><span>Eyebrow</span><input value={selected.eyebrow ?? ""} onChange={(event) => updateSelected(commonPatch(selected, { eyebrow: event.target.value }))} /></label><label><span>Section treatment</span><select value={selected.tone ?? "light"} onChange={(event) => updateSelected(commonPatch(selected, { tone: event.target.value as "light" | "tint" | "dark" }))}><option value="light">Light</option><option value="tint">Tinted</option><option value="dark">Dark</option></select></label>{selected.type === "hero" && <><label><span>Invitation line</span><textarea value={selected.subtitle} onChange={(event) => updateSelected({ ...selected, subtitle: event.target.value })} /></label><label><span>Hero image URL</span><input value={selected.media?.src ?? ""} onChange={(event) => updateSelected({ ...selected, media: { id: selected.media?.id ?? `hero-${Date.now()}`, src: event.target.value, alt: selected.media?.alt ?? "" } })} /></label><label><span>Image description</span><input value={selected.media?.alt ?? ""} onChange={(event) => updateSelected({ ...selected, media: { id: selected.media?.id ?? `hero-${Date.now()}`, src: selected.media?.src ?? "", alt: event.target.value } })} /></label><label className="page-builder-check"><input type="checkbox" checked={selected.countdown} onChange={(event) => updateSelected({ ...selected, countdown: event.target.checked })} /><span>Show live countdown</span></label></>}{selected.type === "story" && <><label><span>Story paragraphs</span><textarea rows={7} value={selected.body.join("\n\n")} onChange={(event) => updateSelected({ ...selected, body: event.target.value.split(/\n\s*\n/) })} /></label><label><span>Pull quote</span><input value={selected.quote ?? ""} onChange={(event) => updateSelected({ ...selected, quote: event.target.value })} /></label></>}{selected.type === "schedule" && <ListEditor title="Schedule items" items={selected.items} summary={(item) => item.title} onAdd={() => updateSelected({ ...selected, items: [...selected.items, defaultSection("schedule").type === "schedule" ? defaultSection("schedule").items[0] : selected.items[0]] })} render={(item, index) => <><input value={item.title} onChange={(event) => updateSelected({ ...selected, items: selected.items.map((value, itemIndex) => itemIndex === index ? { ...value, title: event.target.value } : value) })} placeholder="Item title" /><input type="datetime-local" value={item.startISO.slice(0, 16)} onChange={(event) => updateSelected({ ...selected, items: selected.items.map((value, itemIndex) => itemIndex === index ? { ...value, startISO: `${event.target.value}:00+01:00` } : value) })} /><input value={item.venue} onChange={(event) => updateSelected({ ...selected, items: selected.items.map((value, itemIndex) => itemIndex === index ? { ...value, venue: event.target.value } : value) })} placeholder="Venue" /></>} />}{selected.type === "faq" && <ListEditor title="Questions" items={selected.items} summary={(item) => item.question} onAdd={() => updateSelected({ ...selected, items: [...selected.items, { id: `faq-${Date.now()}`, question: "New question", answer: "Add the answer." }] })} render={(item, index) => <><input value={item.question} onChange={(event) => updateSelected({ ...selected, items: selected.items.map((value, itemIndex) => itemIndex === index ? { ...value, question: event.target.value } : value) })} /><textarea value={item.answer} onChange={(event) => updateSelected({ ...selected, items: selected.items.map((value, itemIndex) => itemIndex === index ? { ...value, answer: event.target.value } : value) })} /></>} />}{selected.type === "gallery" && <ListEditor title="Gallery images" items={selected.media} summary={(item) => item.alt || "Untitled image"} onAdd={() => updateSelected({ ...selected, media: [...selected.media, { id: `media-${Date.now()}`, src: "", alt: "" }] })} render={(item, index) => <><input value={item.src} onChange={(event) => updateSelected({ ...selected, media: selected.media.map((value, itemIndex) => itemIndex === index ? { ...value, src: event.target.value } : value) })} placeholder="Image URL" /><input value={item.alt} onChange={(event) => updateSelected({ ...selected, media: selected.media.map((value, itemIndex) => itemIndex === index ? { ...value, alt: event.target.value } : value) })} placeholder="Image description" /></>} />}{selected.type === "cta" && <><label><span>Supporting copy</span><textarea value={selected.body} onChange={(event) => updateSelected({ ...selected, body: event.target.value })} /></label><label><span>Button label</span><input value={selected.buttonLabel} onChange={(event) => updateSelected({ ...selected, buttonLabel: event.target.value })} /></label></>}</div></> : <p>Select a section to edit it.</p>}</section>

      <section className={`page-builder-preview page-builder-preview--${device}`}><header><span>Live preview · resets on reload</span><b className={issues.length ? "needs-work" : "ready"}>{issues.length ? `${issues.length} check${issues.length === 1 ? "" : "s"}` : "Ready"}</b></header><div><EventMicrosite event={previewEvent} config={config} preview skipAccess /></div></section>
    </div>
    {issues.length > 0 && <div className="page-builder-validation"><b>Before publishing</b>{issues.map((issue) => <span key={issue}>{issue}</span>)}</div>}
    {fullPreview && <div className="page-builder-full" role="dialog" aria-modal="true" aria-label="Full event page preview"><button type="button" onClick={() => setFullPreview(false)}><X size={18} /> Close preview</button><EventMicrosite event={previewEvent} config={config} preview skipAccess /></div>}
  </div>;
}

function ListEditor<T>({ title, items, summary, render, onAdd }: { title: string; items: T[]; summary: (item: T) => string; render: (item: T, index: number) => React.ReactNode; onAdd: () => void }) {
  return <section className="page-builder-list-editor"><header><span>{title}</span><button type="button" onClick={onAdd}><Plus size={14} /> Add</button></header>{items.map((item, index) => <details key={index} open={index === 0}><summary>{summary(item)}</summary><div>{render(item, index)}</div></details>)}</section>;
}
