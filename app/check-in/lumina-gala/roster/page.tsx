import type { Metadata } from "next";
import { CheckInGuard } from "@/components/scanner/CheckInGuard";
import { OfflineRoster } from "@/components/scanner/OfflineRoster";
import { guests } from "@/lib/data/mock-data";
export const metadata: Metadata = { title: "Offline guest roster" };
export default function OfflineRosterPage() { return <CheckInGuard><OfflineRoster guests={guests} /></CheckInGuard>; }
