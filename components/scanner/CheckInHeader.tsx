"use client";

import { ChevronDown, LogOut, MoreHorizontal, Wifi, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Brand } from "@/components/shared/Brand";

export function CheckInHeader({ compact = false }: { compact?: boolean }) {
  const [online, setOnline] = useState(true);
  const { slug } = useParams<{ slug?: string }>();
  const [title, setTitle] = useState("Assigned events");
  useEffect(() => {
    if (slug) fetch(`/api/v1/check-in/staff-access?eventSlug=${encodeURIComponent(slug)}`, { cache: "no-store" }).then((response) => response.json() as Promise<{ data?: { eventTitle?: string } }>).then((body) => setTitle(body.data?.eventTitle ?? "Check-in")).catch(() => setTitle("Check-in"));
    const update = () => setOnline(navigator.onLine);
    update(); window.addEventListener("online", update); window.addEventListener("offline", update);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, [slug]);
  async function exit() { await Promise.allSettled([fetch("/api/v1/auth/logout", { method: "POST" }), fetch("/api/v1/check-in/staff-access", { method: "DELETE" })]); window.localStorage.removeItem("nasa-checkin-session"); window.location.href = "/check-in/login"; }
  return <header className={`checkin-header${compact ? " checkin-header--compact" : ""}`}><Brand inverse compact={compact} /><div className="checkin-header__event"><span><small>NOW CHECKING IN</small><b>{title}</b></span><ChevronDown size={15} /></div><button className={`network-pill ${online ? "online" : "offline"}`} type="button" disabled>{online ? <Wifi size={14} /> : <WifiOff size={14} />}<span><b>{online ? "Online" : "Offline"}</b><small>{online ? "Connected" : "Reconnect to check in"}</small></span></button><button className="checkin-more" type="button" aria-label="More options"><MoreHorizontal size={20} /></button><button className="checkin-exit" type="button" onClick={exit}><LogOut size={16} /> Exit</button></header>;
}
