"use client";

import Link from "next/link";
import { Check, ExternalLink, Eye, Globe2, ImagePlus, Loader2, Save, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { featuredOrganizer } from "@/lib/data/mock-data";
import type { PortfolioGalleryImage } from "@/lib/data/types";

export function PortfolioEditor() {
  const [name, setName] = useState("Velvet & Vine Experiences");
  const [tagline, setTagline] = useState("Celebrations with soul, colour and remarkable detail.");
  const [visible, setVisible] = useState(true);
  const [saved, setSaved] = useState(false);
  const [gallery, setGallery] = useState<PortfolioGalleryImage[]>(featuredOrganizer.gallery ?? []);
  const [about, setAbout] = useState(featuredOrganizer.bio);
  const [city, setCity] = useState(featuredOrganizer.city);
  const [email, setEmail] = useState(featuredOrganizer.email);
  const [phone, setPhone] = useState(featuredOrganizer.phone);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/v1/workspaces/current/profile").then(async (response) => await response.json() as { data?: { name: string; email: string; phone?: string; profile?: Record<string, unknown> } }).then((body) => {
      if (!body.data) return;
      const profile = body.data.profile ?? {};
      setName(body.data.name); setEmail(body.data.email); setPhone(body.data.phone ?? "");
      setTagline(String(profile.tagline ?? featuredOrganizer.tagline)); setAbout(String(profile.about ?? profile.bio ?? featuredOrganizer.bio)); setCity(String(profile.city ?? featuredOrganizer.city)); setVisible(profile.visible !== false);
      if (Array.isArray(profile.gallery)) setGallery(profile.gallery as PortfolioGalleryImage[]);
    }).catch(() => setError("The saved profile could not be loaded."));
  }, []);

  async function save() {
    setError("");
    const response = await fetch("/api/v1/workspaces/current/profile", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, email, phone, profile: { tagline, about, city, visible, gallery: gallery.filter((image) => image.src.trim()) } }) });
    const body = await response.json() as { error?: { message?: string } };
    if (!response.ok) { setError(body.error?.message ?? "The profile could not be saved."); return; }
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }

  async function uploadImage(file: File) {
    setUploading(true); setError("");
    try {
      const signResponse = await fetch("/api/v1/media/sign", { method: "POST" });
      const signed = await signResponse.json() as { data?: { uploadUrl: string; apiKey: string; timestamp: number; folder: string; signature: string }; error?: { message?: string } };
      if (!signResponse.ok || !signed.data) throw new Error(signed.error?.message ?? "Media upload is unavailable.");
      const form = new FormData(); form.set("file", file); form.set("api_key", signed.data.apiKey); form.set("timestamp", String(signed.data.timestamp)); form.set("folder", signed.data.folder); form.set("signature", signed.data.signature);
      const uploadResponse = await fetch(signed.data.uploadUrl, { method: "POST", body: form });
      const uploaded = await uploadResponse.json() as { public_id?: string; secure_url?: string; width?: number; height?: number; bytes?: number; error?: { message?: string } };
      if (!uploadResponse.ok || !uploaded.public_id || !uploaded.secure_url) throw new Error(uploaded.error?.message ?? "Image upload failed.");
      const title = file.name.replace(/\.[^.]+$/, "").replaceAll(/[-_]+/g, " ");
      await fetch("/api/v1/media", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ providerId: uploaded.public_id, url: uploaded.secure_url, alt: title, width: uploaded.width, height: uploaded.height, bytes: uploaded.bytes }) });
      setGallery((items) => [...items, { id: uploaded.public_id!, src: uploaded.secure_url!, title, caption: "" }]);
    } catch (uploadError) { setError(uploadError instanceof Error ? uploadError.message : "Image upload failed."); }
    finally { setUploading(false); if (fileInput.current) fileInput.current.value = ""; }
  }

  function updateGalleryImage(id: string, patch: Partial<PortfolioGalleryImage>) {
    setGallery((items) => items.map((image) => image.id === id ? { ...image, ...patch } : image));
  }

  function addGalleryImage() {
    setGallery((items) => [
      ...items,
      {
        id: `gallery-${Date.now()}`,
        src: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1200&q=80",
        title: "New gallery image",
        caption: "Describe this event moment.",
      },
    ]);
  }

  function removeGalleryImage(id: string) {
    setGallery((items) => items.filter((image) => image.id !== id));
  }

  const previewGallery = gallery.filter((image) => image.src.trim()).slice(0, 3);
  const fallbackGallery = featuredOrganizer.gallery ?? [];

  return (
    <div className="portfolio-editor-layout">
      <section className="dashboard-panel portfolio-form">
        <div className="panel-heading">
          <div><small>PUBLIC IDENTITY</small><h2>Organizer profile</h2></div>
          <button className="button button--brand button--small" onClick={() => void save()}>{saved ? <><Check size={14} /> Saved</> : <><Save size={14} /> Save changes</>}</button>
        </div>
        {error && <div className="form-error" role="alert">{error}</div>}

        <button className="portfolio-logo-upload" type="button"><span>VV</span><p><b>Change logo</b><small>Square PNG or JPG</small></p><ImagePlus size={18} /></button>

        <div className="field-grid">
          <label className="field field--full"><span>Organizer name</span><input value={name} onChange={(event) => setName(event.target.value)} /></label>
          <label className="field field--full"><span>Tagline</span><input value={tagline} onChange={(event) => setTagline(event.target.value)} /></label>
          <label className="field field--full"><span>About</span><textarea value={about} onChange={(event) => setAbout(event.target.value)} /></label>
          <label className="field"><span>City</span><input value={city} onChange={(event) => setCity(event.target.value)} /></label>
          <label className="field"><span>Contact email</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <label className="field field--full"><span>Phone number</span><input value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
          <label className="field field--full"><span>Public address</span><div className="slug-field"><em>nasaevent.demo/organizers/</em><input defaultValue="velvet-vine" /></div></label>
        </div>

        <label className="switch-card"><input type="checkbox" checked={visible} onChange={(event) => setVisible(event.target.checked)} /><span><b>Portfolio is publicly visible</b><small>Guests can discover your profile and published events.</small></span></label>

        <section className="portfolio-gallery-builder">
          <header>
            <div>
              <small>PUBLIC GALLERY</small>
              <h2>Portfolio images</h2>
              <p>Upload images or add external image URLs. Titles provide accessible descriptions on the public page.</p>
            </div>
            <div className="portfolio-gallery-actions"><input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/avif" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadImage(file); }} /><button className="button button--brand" type="button" disabled={uploading} onClick={() => fileInput.current?.click()}>{uploading ? <Loader2 size={16} /> : <ImagePlus size={16} />} {uploading ? "Uploading..." : "Upload image"}</button><button className="button button--outline" type="button" onClick={addGalleryImage}><ExternalLink size={16} /> Add URL</button></div>
          </header>
          <div className="portfolio-gallery-editor-list">
            {gallery.map((image, index) => (
              <article key={image.id}>
                <div className="portfolio-gallery-thumb">{image.src ? <img src={image.src} alt="" onError={(event) => { const fallback = fallbackGallery[index % Math.max(fallbackGallery.length, 1)]?.src; if (fallback && event.currentTarget.src !== fallback) event.currentTarget.src = fallback; }} /> : <ImagePlus size={24} />}</div>
                <div className="portfolio-gallery-fields">
                  <label className="field field--full"><span>Image URL</span><input value={image.src} onChange={(event) => updateGalleryImage(image.id, { src: event.target.value })} placeholder="https://..." /></label>
                  <label className="field"><span>Title</span><input value={image.title} onChange={(event) => updateGalleryImage(image.id, { title: event.target.value })} placeholder={`Gallery image ${index + 1}`} /></label>
                  <label className="field"><span>Caption</span><input value={image.caption} onChange={(event) => updateGalleryImage(image.id, { caption: event.target.value })} placeholder="Short description" /></label>
                </div>
                <button type="button" onClick={() => removeGalleryImage(image.id)} title="Remove image"><Trash2 size={16} /></button>
              </article>
            ))}
          </div>
        </section>
      </section>

      <aside className="portfolio-live-preview">
        <div className="portfolio-preview-bar"><span><Eye size={14} /> Live preview</span><Link href="/organizers/velvet-vine" target="_blank">Open public page <ExternalLink size={13} /></Link></div>
        <div className="portfolio-preview-card">
          <div className="portfolio-preview-hero"><span>VV</span><small><Sparkles size={12} /> VERIFIED ORGANIZER</small><h2>{name}</h2><p>{tagline}</p></div>
          <div className="portfolio-preview-body">
            <div><span><b>28</b><small>EVENTS</small></span><span><b>12.4k</b><small>GUESTS</small></span><span><b>4.9</b><small>RATING</small></span></div>
            <h3>Gallery</h3>
            <div className="portfolio-preview-gallery">{previewGallery.length ? previewGallery.map((image, index) => <img key={image.id} src={image.src} alt={image.title} onError={(event) => { const fallback = fallbackGallery[index % Math.max(fallbackGallery.length, 1)]?.src; if (fallback && event.currentTarget.src !== fallback) event.currentTarget.src = fallback; }} />) : <span>No images yet</span>}</div>
            <h3>Upcoming experiences</h3>
            <article><i /><span><small>24 AUG</small><b>The Lumina Gala</b></span></article>
          </div>
        </div>
        <p className="preview-status"><Globe2 size={15} />{visible ? "Visible to the public" : "Hidden from public discovery"}</p>
      </aside>
    </div>
  );
}
