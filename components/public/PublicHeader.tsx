"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Brand } from "@/components/shared/Brand";

const links = [
  { href: "/events", label: "Explore events" },
  { href: "/organizers", label: "Organizers" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/help", label: "Help" },
];

export function PublicHeader({ transparent = false, fixed = false }: { transparent?: boolean; fixed?: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <header className={`public-header${transparent ? " public-header--transparent" : ""}${fixed ? " public-header--fixed" : ""}`}>
      <div className="public-header__inner">
        <Brand inverse={transparent} />
        <nav className="public-nav" aria-label="Public website navigation">
          {links.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}
        </nav>
        <div className="public-header__actions">
          <Link className="button button--quiet" href="/organizer/login">Sign in</Link>
          <Link className="button button--ink" href="/organizer/register">Create an event</Link>
        </div>
        <button className="mobile-menu-button" type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Toggle navigation">
          {open ? <X size={21} /> : <Menu size={21} />}
        </button>
      </div>
      {open && (
        <nav className="mobile-public-nav" aria-label="Mobile navigation">
          {links.map((link) => <Link key={link.href} href={link.href} onClick={() => setOpen(false)}>{link.label}</Link>)}
          <Link href="/organizer/login" onClick={() => setOpen(false)}>Organizer sign in</Link>
          <Link className="button button--brand" href="/organizer/register" onClick={() => setOpen(false)}>Create an event</Link>
        </nav>
      )}
    </header>
  );
}
