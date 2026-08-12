"use client";

import { ChevronDown, LogOut, MoreHorizontal, Wifi, WifiOff } from "lucide-react";
import { useState } from "react";
import { Brand } from "@/components/shared/Brand";

export function CheckInHeader({ compact = false }: { compact?: boolean }) {
  const [online, setOnline] = useState(true);
  function exit() { window.localStorage.removeItem("nasa-checkin-session"); window.location.href = "/check-in/login"; }
  return <header className={`checkin-header${compact ? " checkin-header--compact" : ""}`}><Brand inverse compact={compact} /><div className="checkin-header__event"><span><small>NOW CHECKING IN</small><b>The Lumina Gala 2026</b></span><ChevronDown size={15} /></div><button className={`network-pill ${online ? "online" : "offline"}`} type="button" onClick={() => setOnline(!online)}>{online ? <Wifi size={14} /> : <WifiOff size={14} />}<span><b>{online ? "Online" : "Offline"}</b><small>{online ? "All changes synced" : "Using cached roster"}</small></span></button><button className="checkin-more" type="button" aria-label="More options"><MoreHorizontal size={20} /></button><button className="checkin-exit" type="button" onClick={exit}><LogOut size={16} /> Exit</button></header>;
}
