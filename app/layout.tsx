import type { Metadata } from "next";
import { ThemeProvider } from "@/components/shared/ThemeProvider";
import { AppToaster } from "@/components/shared/AppToaster";
import "./globals.css";
import "./resources.css";

export const metadata: Metadata = {
  title: {
    default: "NASA EVENT Frontend Foundation",
    template: "%s · NASA EVENT",
  },
  description: "Create beautiful event pages, manage every RSVP and welcome guests with fast QR check-in.",
  manifest: "/manifest.webmanifest",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <body>
        <ThemeProvider><AppToaster />{children}</ThemeProvider>
      </body>
    </html>
  );
}
