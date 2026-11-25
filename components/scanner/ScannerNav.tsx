"use client";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Camera, Keyboard, ListChecks, Search } from "lucide-react";
export function ScannerNav({ active }: { active: "scan" | "manual" | "roster" }) { const { slug } = useParams<{ slug: string }>(); return <nav className="scanner-nav" aria-label="Check-in methods"><Link className={active === "scan" ? "active" : ""} href={`/check-in/${slug}`}><Camera size={17} /> Scan pass</Link><a href="#backup"><Keyboard size={17} /> Backup scanner</a><Link className={active === "manual" ? "active" : ""} href={`/check-in/${slug}/manual`}><Search size={17} /> Manual lookup</Link><Link className={active === "roster" ? "active" : ""} href={`/check-in/${slug}/roster`}><ListChecks size={17} /> Offline roster</Link></nav>; }
