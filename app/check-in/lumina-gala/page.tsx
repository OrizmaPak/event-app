import type { Metadata } from "next";
import { CheckInGuard } from "@/components/scanner/CheckInGuard";
import { ScannerConsole } from "@/components/scanner/ScannerConsole";
export const metadata: Metadata = { title: "Lumina Gala check-in" };
export default function ScannerPage() { return <CheckInGuard><ScannerConsole /></CheckInGuard>; }
