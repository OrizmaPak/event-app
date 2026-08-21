"use client";

import Link from "next/link";
import { Check, ExternalLink, Eye, Globe2, ImagePlus, Save, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { featuredOrganizer } from "@/lib/data/mock-data";
import type { PortfolioGalleryImage } from "@/lib/data/types";

const galleryStorageKey = `nasa-portfolio-gallery:${featuredOrganizer.slug}`;

export function PortfolioEditor() {
  const [name, setName] = useState("Velvet & Vine Experiences");
  const [tagline, setTagline] = useState("Celebrations with soul, colour and remarkable detail.");
  const [visible, setVisible] = useState(true);
  const [saved, setSaved] = useState(false);
  const [gallery, setGallery] = useState<PortfolioGalleryImage[]>(featuredOrganizer.gallery ?? []);

  useEffect(() => {
    try {
      const savedGallery = window.localStorage.getItem(galleryStorageKey);
      if (!savedGallery) return;
      const parsed = JSON.parse(savedGallery) as PortfolioGalleryImage[];
      if (Array.isArray(parsed) && parsed.length) setGallery(parsed);
    } catch {
      setGallery(featuredOrganizer.gallery ?? []);
    }
  }, []);

  function save() {
    window.localStorage.setItem(galleryStorageKey, JSON.stringify(gallery.filter((image) => image.src.trim())));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
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
          <button className="button button--brand button--small" onClick={save}>{saved ? <><Check size={14} /> Saved</> : <><Save size={14} /> Save changes</>}</button>
        </div>

        <button className="portfolio-logo-upload" type="button"><span>VV</span><p><b>Change logo</b><small>Square PNG or JPG</small></p><ImagePlus size={18} /></button>

        <div className="field-grid">
          <label className="field field--full"><span>Organizer name</span><input value={name} onChange={(event) => setName(event.target.value)} /></label>
          <label className="field field--full"><span>Tagline</span><input value={tagline} onChange={(event) => setTagline(event.target.value)} /></label>
          <label className="field field--full"><span>About</span><textarea defaultValue="We create warm, beautifully considered experiences across Lagos-from intimate dinners to large cultural celebrations. Every guest touchpoint is designed to feel personal." /></label>
          <label className="field"><span>City</span><input defaultValue="Lagos, Nigeria" /></label>
          <label className="field"><span>Contact email</span><input defaultValue="hello@velvetandvine.demo" /></label>
          <label className="field field--full"><span>Public address</span><div className="slug-field"><em>nasaevent.demo/organizers/</em><input defaultValue="velvet-vine" /></div></label>
        </div>

        <label className="switch-card"><input type="checkbox" checked={visible} onChange={(event) => setVisible(event.target.checked)} /><span><b>Portfolio is publicly visible</b><small>Guests can discover your profile and published events.</small></span></label>

        <section className="portfolio-gallery-builder">
          <header>
            <div>
              <small>PUBLIC GALLERY</small>
              <h2>Portfolio images</h2>
              <p>Create a gallery using image URLs, titles, and captions. Changes are stored in this browser for the prototype.</p>
            </div>
            <button className="button button--outline" type="button" onClick={addGalleryImage}><ImagePlus size={16} /> Add image</button>
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
