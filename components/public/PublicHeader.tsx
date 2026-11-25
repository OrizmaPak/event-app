"use client";

import Link from "next/link";
import { Menu, UserRound, X } from "lucide-react";
import { useState } from "react";
import { Brand } from "@/components/shared/Brand";

const links = [
  { href: "/events", label: "Explore events" },
  { href: "/resources", label: "Resources" },
  { href: "/organizers", label: "Organizers" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/help", label: "Help" },
];

type PublicUser = { firstName: string; lastName: string; email: string };

export function PublicHeader({ transparent = false, fixed = false, user = null, workspaceHref = null }: { transparent?: boolean; fixed?: boolean; user?: PublicUser | null; workspaceHref?: string | null }) {
  const [open, setOpen] = useState(false);
  const fullName = user ? `${user.firstName} ${user.lastName}`.trim() : "";
  const initials = fullName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  return (
    <header className={`public-header${transparent ? " public-header--transparent" : ""}${fixed ? " public-header--fixed" : ""}`}>
      <div className="public-header__inner">
        <Brand inverse={transparent} />
        <nav className="public-nav" aria-label="Public website navigation">
          {links.map((link) => <Link key={link.href} href={link.href} prefetch>{link.label}</Link>)}
        </nav>
        <div className="public-header__actions">
          {user ? <Link className="public-header__account" href="/account" aria-label={`Signed in as ${fullName}. Open your account`}><span>{initials || <UserRound size={16} />}</span><b>{fullName || user.email}</b></Link> : <Link className="button button--quiet" href="/organizer/login">Sign in</Link>}
          <Link className="button button--ink" href={workspaceHref ?? "/organizer/register"}>{workspaceHref ? "Go to workspace" : "Create an event"}</Link>
        </div>
        <button className="mobile-menu-button" type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Toggle navigation">
          {open ? <X size={21} /> : <Menu size={21} />}
        </button>
      </div>
      {open && (
        <nav className="mobile-public-nav" aria-label="Mobile navigation">
          {links.map((link) => <Link key={link.href} href={link.href} prefetch onClick={() => setOpen(false)}>{link.label}</Link>)}
          {user ? <Link href="/account" onClick={() => setOpen(false)}><UserRound size={16} /> Signed in as {fullName || user.email} · My account</Link> : <Link href="/organizer/login" onClick={() => setOpen(false)}>Organizer sign in</Link>}
          <Link className="button button--brand" href={workspaceHref ?? "/organizer/register"} onClick={() => setOpen(false)}>{workspaceHref ? "Go to workspace" : "Create an event"}</Link>
        </nav>
      )}
    </header>
  );
}
