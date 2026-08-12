import type { Metadata } from "next";
import { CheckInGuard } from "@/components/scanner/CheckInGuard";
import { ManualCheckIn } from "@/components/scanner/ManualCheckIn";
import { guests } from "@/lib/data/mock-data";
export const metadata: Metadata = { title: "Manual guest lookup" };
export default function ManualCheckInPage() { return <CheckInGuard><ManualCheckIn initialGuests={guests} /></CheckInGuard>; }
