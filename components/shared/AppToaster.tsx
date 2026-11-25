"use client";

import { Toaster } from "sonner";

export function AppToaster() {
  return <Toaster position="top-right" closeButton richColors expand visibleToasts={4} duration={4200} />;
}
