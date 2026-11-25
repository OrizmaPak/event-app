import { ShieldCheck } from "lucide-react";

export function PlatformPageHeading({ eyebrow, title, description, section }: { eyebrow: string; title: string; description: string; section: string }) {
  return <header className="platform-page-heading">
    <div className="platform-page-heading__copy">
      <span className="platform-page-heading__eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
    <div className="platform-page-heading__meta"><span className="platform-page-heading__icon"><ShieldCheck size={20} /></span><div><small>SUPER ADMIN</small><b>{section}</b></div></div>
  </header>;
}
