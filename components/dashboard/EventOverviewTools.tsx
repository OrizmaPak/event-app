"use client";

import { Check, Copy, ExternalLink, QrCode, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { DemoQr } from "@/components/shared/DemoQr";

export function EventShareButton({ eventTitle, url }: { eventTitle: string; url: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "shared">("idle");

  async function share() {
    const publicUrl = new URL(url, window.location.origin).toString();
    try {
      if (navigator.share) {
        await navigator.share({ title: eventTitle, text: `Join ${eventTitle}`, url: publicUrl });
        setStatus("shared");
      } else {
        await navigator.clipboard.writeText(publicUrl);
        setStatus("copied");
      }
    } catch {
      setStatus("idle");
    }
    window.setTimeout(() => setStatus("idle"), 2200);
  }

  return <button className="button button--outline button--small" type="button" onClick={() => void share()}>{status === "shared" || status === "copied" ? <Check size={14} /> : <Share2 size={14} />}{status === "shared" ? "Shared" : status === "copied" ? "Link copied" : "Share event"}</button>;
}

export function EventOverviewTools({ eventTitle, url, qrValue }: { eventTitle: string; url: string; qrValue: string }) {
  const [copied, setCopied] = useState(false);
  const [publicQrValue, setPublicQrValue] = useState(qrValue);

  useEffect(() => {
    setPublicQrValue(new URL(qrValue, window.location.origin).toString());
  }, [qrValue]);

  async function copyLink() {
    await navigator.clipboard.writeText(new URL(url, window.location.origin).toString());
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2200);
  }

  return <section className="event-overview-tools"><div className="event-overview-tools__copy"><span className="metric-icon metric-icon--violet"><QrCode size={19} /></span><div><small>SHARE THIS EVENT</small><h2>Invite guests</h2><p>Copy the public event link or scan the QR code to open the event page.</p><div className="event-overview-tools__actions"><button className="button button--brand button--small" type="button" onClick={() => void copyLink()}>{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? "Link copied" : "Copy event link"}</button><a className="button button--outline button--small" href={url} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Open preview</a></div></div></div><div className="event-overview-tools__qr"><DemoQr size={148} value={publicQrValue} /><small>SCAN TO OPEN</small></div></section>;
}
