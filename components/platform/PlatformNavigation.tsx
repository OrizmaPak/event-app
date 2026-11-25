"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/platform/organizers", label: "Organizers" },
  { href: "/platform/users", label: "Users" },
  { href: "/platform/events", label: "Event approvals" },
  { href: "/platform/resources", label: "Resource approvals" },
  { href: "/platform/payouts", label: "Payouts" },
  { href: "/platform", label: "Refunds" },
];

export function PlatformNavigation() {
  const pathname = usePathname();
  return <nav className="platform-nav" aria-label="Platform navigation">
    {items.map((item) => {
      const active = pathname === item.href;
      return <Link key={item.href} href={item.href} className={active ? "active" : undefined} aria-current={active ? "page" : undefined}>{item.label}</Link>;
    })}
    <Link className="platform-public-link" href="/">Public website</Link>
  </nav>;
}
