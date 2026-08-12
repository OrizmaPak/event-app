"use client";

import { Check, Moon, Palette, RotateCcw, Save, Sparkles, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { applyAccent } from "@/components/shared/ThemeProvider";

const colors = ["#7557ff", "#078b9a", "#e05270", "#d28a28", "#27845b"];

export function ThemeSettings() {
  const [accent, setAccent] = useState("#7557ff");
  const [mode, setMode] = useState("light");
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    const preferenceTimer = window.setTimeout(() => {
      setAccent(window.localStorage.getItem("nasa-event-accent") ?? "#7557ff");
      setMode(window.localStorage.getItem("nasa-event-mode") ?? "light");
    }, 0);
    return () => window.clearTimeout(preferenceTimer);
  }, []);
  function choose(color: string) { setAccent(color); applyAccent(color); }
  function changeMode(value: string) { setMode(value); document.documentElement.dataset.theme = value; }
  function save() { window.localStorage.setItem("nasa-event-accent", accent); window.localStorage.setItem("nasa-event-mode", mode); setSaved(true); window.setTimeout(() => setSaved(false), 1800); }
  function reset() { choose("#7557ff"); changeMode("light"); }
  return <div className="theme-settings-layout"><section className="dashboard-panel theme-controls"><div className="panel-heading"><div><small>WORKSPACE APPEARANCE</small><h2>Make it feel like yours</h2></div></div><div className="theme-section"><span><Palette size={17} /><b>Signature colour</b></span><p>Used for buttons, highlights, charts and your organizer experience.</p><div className="theme-color-row">{colors.map((color) => <button key={color} style={{ background: color }} className={accent.toLowerCase() === color ? "active" : ""} onClick={() => choose(color)} aria-label={`Use ${color}`}>{accent.toLowerCase() === color && <Check size={16} />}</button>)}<label><Sparkles size={16} /><input type="color" value={accent} onChange={(event) => choose(event.target.value)} /></label></div><label className="hex-control"><span style={{ background: accent }} /><input value={accent.toUpperCase()} onChange={(event) => { if (/^#[0-9A-F]{6}$/i.test(event.target.value)) choose(event.target.value); else setAccent(event.target.value); }} /><button type="button" onClick={() => applyAccent(accent)}>Apply</button></label></div><div className="theme-section"><span><Sun size={17} /><b>Interface mode</b></span><p>Choose the most comfortable workspace for you.</p><div className="mode-choice"><button className={mode === "light" ? "active" : ""} onClick={() => changeMode("light")}><Sun size={19} /><span><b>Light</b><small>Bright and airy</small></span></button><button className={mode === "dark" ? "active" : ""} onClick={() => changeMode("dark")}><Moon size={19} /><span><b>Dark</b><small>Rich and focused</small></span></button></div></div><footer><button className="button button--quiet" onClick={reset}><RotateCcw size={14} /> Reset</button><button className="button button--brand" onClick={save}>{saved ? <><Check size={14} /> Saved</> : <><Save size={14} /> Save appearance</>}</button></footer></section><aside className="theme-live-card"><span className="dashboard-eyebrow">LIVE PREVIEW</span><div className="theme-mini-dashboard"><nav><i>N</i><span /><span /><span /></nav><main><small>YOUR DASHBOARD</small><h2>Good morning, John ✦</h2><div className="theme-mini-metrics"><i /><i /><i /></div><div className="theme-mini-chart"><span /></div></main></div><h2>Beautiful by default.<br /><em>Distinctly yours.</em></h2><p>Your saved choice will remain on this device until a real account preference service is connected.</p></aside></div>;
}
