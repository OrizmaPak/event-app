"use client";

import { useEffect } from "react";

const DEFAULT_ACCENT = "#7557ff";

function hexToRgb(hex: string) {
  const value = hex.replace("#", "");
  const full = value.length === 3 ? value.split("").map((part) => part + part).join("") : value;
  return `${parseInt(full.slice(0, 2), 16)}, ${parseInt(full.slice(2, 4), 16)}, ${parseInt(full.slice(4, 6), 16)}`;
}

export function applyAccent(hex: string) {
  const safeHex = /^#[0-9a-f]{6}$/i.test(hex) ? hex : DEFAULT_ACCENT;
  document.documentElement.style.setProperty("--brand", safeHex);
  document.documentElement.style.setProperty("--brand-rgb", hexToRgb(safeHex));
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const savedAccent = window.localStorage.getItem("nasa-event-accent") ?? DEFAULT_ACCENT;
    const savedMode = window.localStorage.getItem("nasa-event-mode") ?? "light";
    applyAccent(savedAccent);
    document.documentElement.dataset.theme = savedMode;
  }, []);

  return children;
}
