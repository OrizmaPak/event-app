import Link from "next/link";
import { Instagram, Linkedin, Mail } from "lucide-react";
import { Brand } from "@/components/shared/Brand";

export function PublicFooter() {
  return (
    <footer className="public-footer">
      <div className="public-footer__top">
        <div className="public-footer__brand">
          <Brand inverse />
          <p>Beautiful invitations. Clear guest lists. Effortless arrivals.</p>
          <div className="social-row" aria-label="Social links">
            <a href="#" aria-label="Instagram"><Instagram size={17} /></a>
            <a href="#" aria-label="LinkedIn"><Linkedin size={17} /></a>
            <a href="mailto:hello@nasaevent.demo" aria-label="Email"><Mail size={17} /></a>
          </div>
        </div>
        <div><h3>Discover</h3><Link href="/events">All events</Link><Link href="/organizers">Organizers</Link><Link href="/how-it-works">How it works</Link></div>
        <div><h3>Organizers</h3><Link href="/organizer/register">Create an account</Link><Link href="/organizer/login">Sign in</Link><Link href="/help">Help centre</Link></div>
        <div><h3>Company</h3><Link href="/contact">Contact</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></div>
      </div>
      <div className="public-footer__bottom"><span>© 2026 NASA EVENT</span><span>Made for remarkable gatherings.</span></div>
    </footer>
  );
}
