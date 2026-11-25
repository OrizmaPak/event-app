"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, ChevronLeft, ChevronRight, ImagePlus, LoaderCircle, Plus, Save, Send, Star, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { resourceContentSchema, submissionErrors, type ManagedResource, type ResourceContent, type ResourceTerm, type PublicResource } from "@/lib/resources/model";
import { resourceRequest } from "./client";
import { ResourceCard, ResourceDetail, ResourceImage } from "./ResourcePresentation";
import * as Dialog from "@radix-ui/react-dialog";

function OptionPicker({ kind, title, terms, selected, onChange, onAdded }: { kind: "category" | "eventType"; title: string; terms: ResourceTerm[]; selected: string[]; onChange: (ids: string[]) => void; onAdded: (term: ResourceTerm) => void }) {
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const options = terms.filter((term) => term.kind === kind && term.status !== "merged");
  async function add() {
    setAdding(true);
    try { const term = await resourceRequest<ResourceTerm>("/api/v1/resources/options", "POST", { kind, name: search }); onAdded(term); onChange([...new Set([...selected, term.id])]); setSearch(""); toast.success(term.status === "approved" ? "Existing option selected" : "Option added for review"); }
    catch (error) { toast.error((error as Error).message); } finally { setAdding(false); }
  }
  return <fieldset className="rs-option-picker"><legend>{title}</legend><div className="rs-selected-filters">{selected.map((id) => <button type="button" key={id} aria-label={`Remove ${terms.find((term) => term.id === id)?.name ?? "selected option"}`} onClick={() => onChange(selected.filter((value) => value !== id))}>{terms.find((term) => term.id === id)?.name ?? "Unavailable option"}<X size={14} /></button>)}</div><input aria-label={`Search ${title.toLowerCase()}`} value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${title.toLowerCase()}`} maxLength={80} /><div className="rs-option-list">{options.filter((term) => !selected.includes(term.id) && term.name.toLowerCase().includes(search.toLowerCase())).map((term) => <label key={term.id}><input type="checkbox" checked={false} onChange={() => onChange([...selected, term.id])} /><span>{term.name}{term.status !== "approved" && <small>Awaiting review</small>}</span></label>)}</div>{search.trim().length >= 2 && !options.some((term) => term.name.toLowerCase() === search.trim().toLowerCase()) && <button className="button button--outline" type="button" disabled={adding} onClick={() => void add()}>{adding ? <LoaderCircle size={16} className="rs-spin" /> : <Plus size={16} />}Add &quot;{search.trim()}&quot;</button>}</fieldset>;
}

export function ResourceEditor({ listing, initialTerms, onClose, onSaved }: { listing: ManagedResource; initialTerms: ResourceTerm[]; onClose: () => void; onSaved: () => void }) {
  const [record, setRecord] = useState(listing);
  const [content, setContent] = useState<ResourceContent>(listing.content);
  const [terms, setTerms] = useState(initialTerms);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [upload, setUpload] = useState<{ name: string; progress: number } | null>(null);
  const [failedFiles, setFailedFiles] = useState<File[]>([]);
  const [exitOpen, setExitOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dirty = JSON.stringify(content) !== JSON.stringify(record.content);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); };
    window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function patch(update: Partial<ResourceContent>) { setContent((previous) => ({ ...previous, ...update })); }
  async function save(submit = false) {
    setBusy(submit ? "submit" : "save"); setError("");
    try {
      const checked = resourceContentSchema.safeParse(content);
      if (!checked.success) throw new Error(checked.error.issues[0]?.message ?? "Check the listing details.");
      if (submit) { const issues = submissionErrors(content); if (issues.length) throw new Error(issues.join(" ")); }
      const saved = await resourceRequest<ManagedResource>(`/api/v1/account/resources/${record.id}`, "PATCH", { action: "save", version: record.version, content });
      setRecord({ ...record, ...saved }); setContent(saved.content);
      if (submit) {
        await resourceRequest(`/api/v1/account/resources/${record.id}`, "PATCH", { action: "submit", version: saved.version });
        toast.success("Listing submitted for approval"); onSaved(); onClose();
      } else { toast.success("Draft saved"); onSaved(); }
    } catch (failure) { setError((failure as Error).message); toast.error((failure as Error).message); }
    finally { setBusy(""); }
  }
  async function uploadFiles(files: File[]) {
    if (content.images.length + files.length > 5) { toast.error("A listing can have up to five images."); return; }
    setBusy("upload"); setError("");
    for (const file of files) {
      setUpload({ name: file.name, progress: 0 });
      try {
        if (!["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type) || file.size > 5 * 1024 * 1024) throw new Error("Use a JPG, PNG, WebP, or AVIF image up to 5 MB.");
        const signed = await resourceRequest<{ uploadUrl: string; apiKey: string; folder: string; timestamp: number; signature: string }>("/api/v1/resources/media", "POST", { action: "sign", publisher: record.organizerId ?? "personal" });
        const form = new FormData(); form.set("file", file); form.set("api_key", signed.apiKey); form.set("folder", signed.folder); form.set("timestamp", String(signed.timestamp)); form.set("signature", signed.signature);
        const result = await new Promise<{ public_id: string }>((resolve, reject) => {
          const xhr = new XMLHttpRequest(); xhr.open("POST", signed.uploadUrl); xhr.timeout = 90000;
          xhr.upload.onprogress = (event) => { if (event.lengthComputable) setUpload({ name: file.name, progress: Math.round(event.loaded / event.total * 90) }); };
          xhr.onerror = () => reject(new Error("Upload failed. Check your connection and retry."));
          xhr.ontimeout = () => reject(new Error("Upload timed out. Please retry."));
          xhr.onload = () => { try { const body = JSON.parse(xhr.responseText); if (xhr.status < 200 || xhr.status >= 300 || !body.public_id) reject(new Error(body.error?.message ?? "Upload failed.")); else resolve(body); } catch { reject(new Error("The image provider returned an invalid response.")); } };
          xhr.send(form);
        });
        const alt = file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ").slice(0, 240) || "Service image";
        const asset = await resourceRequest<{ id: string; url: string; alt: string }>("/api/v1/resources/media", "POST", { action: "register", publisher: record.organizerId ?? "personal", providerId: result.public_id, alt: alt.length >= 2 ? alt : "Service image" });
        setContent((previous) => ({ ...previous, images: [...previous.images, { assetId: asset.id, url: asset.url, alt: asset.alt }] }));
        setFailedFiles((previous) => previous.filter((item) => item !== file));
      } catch (failure) { setError((failure as Error).message); setFailedFiles((previous) => previous.includes(file) ? previous : [...previous, file]); }
    }
    setUpload(null); setBusy(""); if (inputRef.current) inputRef.current.value = "";
  }
  function moveImage(index: number, to: number) { const images = [...content.images]; const [image] = images.splice(index, 1); images.splice(to, 0, image); patch({ images }); }
  const preview: PublicResource = { id: record.id, slug: record.slug, content, provider: record.provider, categories: terms.filter((term) => content.categoryIds.includes(term.id)), eventTypes: terms.filter((term) => content.eventTypeIds.includes(term.id)), publishedAt: "" };
  return <div className="rs-editor"><header className="rs-workspace-heading"><div><button className="rs-back" disabled={Boolean(busy)} onClick={() => dirty ? setExitOpen(true) : onClose()}><ArrowLeft size={16} />My listings</button><h1>{record.content.title || "Create a listing"}</h1><p>Publishing as <b>{record.provider}</b></p></div><button className="button button--outline" disabled={Boolean(busy)} onClick={() => void save()}>{busy === "save" ? <LoaderCircle className="rs-spin" size={17} /> : <Save size={17} />}Save draft</button></header>
    <nav className="rs-steps" aria-label="Listing creation steps">{["Services", "Listing details", "Preview and submit"].map((label, index) => <button key={label} type="button" aria-current={step === index ? "step" : undefined} disabled={Boolean(busy)} onClick={() => setStep(index)}><span>{index < step ? <Check size={16} /> : index + 1}</span>{label}</button>)}</nav>
    {error && <div className="rs-error" role="alert">{error}</div>}
    <fieldset disabled={Boolean(busy)} className="rs-editor-fields">
      {step === 0 && <div className="rs-editor-options"><OptionPicker title="Service categories" kind="category" terms={terms} selected={content.categoryIds} onChange={(categoryIds) => patch({ categoryIds })} onAdded={(term) => setTerms((previous) => [...previous.filter((item) => item.id !== term.id), term])} /><OptionPicker title="Event types" kind="eventType" terms={terms} selected={content.eventTypeIds} onChange={(eventTypeIds) => patch({ eventTypeIds })} onAdded={(term) => setTerms((previous) => [...previous.filter((item) => item.id !== term.id), term])} /></div>}
      {step === 1 && <div className="rs-editor-details"><section><h2>Introduce your service</h2><label>Title<input value={content.title} maxLength={120} onChange={(event) => patch({ title: event.target.value })} placeholder="e.g. Professional ushers for memorable events" /></label><label>Subtitle<input value={content.subtitle} maxLength={200} onChange={(event) => patch({ subtitle: event.target.value })} placeholder="A short introduction to what you offer" /></label><label>Description<textarea rows={7} maxLength={8000} value={content.description} onChange={(event) => patch({ description: event.target.value })} placeholder="Describe your services, experience, and what clients can expect." /></label><div className="rs-two-fields"><label>Location (optional)<input value={content.location} maxLength={120} onChange={(event) => patch({ location: event.target.value })} placeholder="Lagos" /></label><label>Service area (optional)<input value={content.serviceArea} maxLength={240} onChange={(event) => patch({ serviceArea: event.target.value })} placeholder="Lagos, Abuja, and nationwide" /></label></div><h2>Public contact details</h2><p>Phone is optional. Add any one contact method that clients can use to reach you.</p><div className="rs-two-fields"><label>Phone number <span className="rs-field-hint">(optional)</span><input inputMode="tel" type="tel" value={content.contact.phone} placeholder="0801 234 5678 or +234 801 234 5678" onChange={(event) => patch({ contact: { ...content.contact, phone: event.target.value } })} /></label><label>Contact email <span className="rs-field-hint">(optional)</span><input type="email" value={content.contact.email} placeholder="hello@example.com" onChange={(event) => patch({ contact: { ...content.contact, email: event.target.value } })} /></label><label>WhatsApp number <span className="rs-field-hint">(optional)</span><input inputMode="tel" type="tel" value={content.contact.whatsapp} placeholder="+234 801 234 5678" onChange={(event) => patch({ contact: { ...content.contact, whatsapp: event.target.value } })} /></label><label>Website <span className="rs-field-hint">(optional)</span><input type="url" value={content.contact.website} placeholder="https://" onChange={(event) => patch({ contact: { ...content.contact, website: event.target.value } })} /></label></div></section>
      <section className="rs-image-editor"><h2>Images <span>{content.images.length}/5</span></h2><p>JPG, PNG, WebP, or AVIF, up to 5 MB each. The first image is your cover.</p><input ref={inputRef} className="rs-sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple onChange={(event) => void uploadFiles(Array.from(event.target.files ?? []))} /><button type="button" className="rs-upload" disabled={content.images.length >= 5} onClick={() => inputRef.current?.click()}><ImagePlus size={24} />Add images</button>{content.images.map((image, index) => <article className="rs-edit-image" key={image.assetId}><ResourceImage src={image.url} alt={image.alt} /><div><label>Image description<input value={image.alt} maxLength={240} onChange={(event) => patch({ images: content.images.map((item, i) => i === index ? { ...item, alt: event.target.value } : item) })} /></label><div className="rs-image-actions"><button type="button" disabled={index === 0} title="Move earlier" aria-label={`Move image ${index + 1} earlier`} onClick={() => moveImage(index, index - 1)}><ChevronLeft size={16} /></button><button type="button" disabled={index === content.images.length - 1} title="Move later" aria-label={`Move image ${index + 1} later`} onClick={() => moveImage(index, index + 1)}><ChevronRight size={16} /></button><button type="button" title="Use as cover" aria-label={`Use image ${index + 1} as cover`} disabled={index === 0} onClick={() => moveImage(index, 0)}><Star size={16} />{index === 0 ? "Cover" : ""}</button><button type="button" className="rs-danger" title="Remove image" aria-label={`Remove image ${index + 1}`} onClick={() => patch({ images: content.images.filter((_, i) => i !== index) })}><Trash2 size={16} /></button></div></div></article>)}</section></div>}
      {step === 2 && <div className="rs-preview"><div className="rs-preview-heading"><h2>Listing preview</h2><p>Your listing will appear publicly after admin approval.</p></div><details><summary>Directory card preview</summary><div className="rs-card-preview"><ResourceCard item={preview} preview /></div></details><ResourceDetail content={content} provider={record.provider} terms={terms} preview /></div>}
    </fieldset>
    {upload && <div className="rs-upload-progress" role="status"><LoaderCircle className="rs-spin" size={18} /><span>Uploading {upload.name}</span><progress max={100} value={upload.progress} /><span>{upload.progress}%</span></div>}
    {failedFiles.map((file, index) => <div className="rs-upload-failed" key={`${file.name}-${index}`}><span>{file.name}: upload incomplete</span><button disabled={Boolean(busy) || content.images.length >= 5} onClick={() => void uploadFiles([file])}>Retry</button><button disabled={Boolean(busy)} aria-label={`Dismiss failed upload ${file.name}`} onClick={() => setFailedFiles((previous) => previous.filter((item) => item !== file))}><X size={16} /></button></div>)}
    <footer className="rs-editor-footer"><span>{dirty ? "Unsaved changes" : "Draft saved"}</span><div><button className="button button--outline" disabled={step === 0 || Boolean(busy)} onClick={() => setStep(step - 1)}><ArrowLeft size={16} />Back</button>{step < 2 ? <button className="button button--ink" disabled={Boolean(busy)} onClick={() => setStep(step + 1)}>Continue<ArrowRight size={16} /></button> : <button className="button button--ink" disabled={Boolean(busy) || failedFiles.length > 0} onClick={() => void save(true)}>{busy === "submit" ? <LoaderCircle size={17} className="rs-spin" /> : <Send size={17} />}Submit for approval</button>}</div></footer>
    <Dialog.Root open={exitOpen} onOpenChange={setExitOpen}><Dialog.Portal><Dialog.Overlay className="rs-overlay" /><Dialog.Content className="rs-confirm"><Dialog.Title>Leave without saving?</Dialog.Title><Dialog.Description>Your latest changes have not been saved.</Dialog.Description><footer><Dialog.Close className="button button--outline">Keep editing</Dialog.Close><button className="button rs-danger-button" onClick={onClose}>Discard changes</button></footer></Dialog.Content></Dialog.Portal></Dialog.Root>
  </div>;
}
