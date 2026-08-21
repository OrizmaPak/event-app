"use client";

import { ImageIcon } from "lucide-react";
import { useEffect, useState } from "react";
import type { PortfolioGalleryImage } from "@/lib/data/types";

export function PortfolioGallery({ slug, images = [] }: { slug: string; images?: PortfolioGalleryImage[] }) {
  const [gallery, setGallery] = useState(images);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(`nasa-portfolio-gallery:${slug}`);
      if (!saved) return;
      const parsed = JSON.parse(saved) as PortfolioGalleryImage[];
      if (Array.isArray(parsed) && parsed.length) setGallery(parsed.filter((image) => image.src.trim()));
    } catch {
      setGallery(images);
    }
  }, [images, slug]);

  if (!gallery.length) return null;

  return (
    <section className="public-section portfolio-gallery-section">
      <div className="page-shell">
        <div className="section-heading">
          <span className="eyebrow"><ImageIcon size={14} /> Gallery</span>
          <h2>Moments from our work.</h2>
        </div>
        <div className="portfolio-gallery-grid">
          {gallery.map((image, index) => (
            <article className={index === 0 ? "featured" : ""} key={image.id}>
              <img
                src={image.src}
                alt={image.title}
                loading="lazy"
                onError={(event) => {
                  const fallback = images[index % Math.max(images.length, 1)]?.src;
                  if (fallback && event.currentTarget.src !== fallback) event.currentTarget.src = fallback;
                }}
              />
              <span>
                <b>{image.title}</b>
                <small>{image.caption}</small>
              </span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
