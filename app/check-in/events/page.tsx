import type { Metadata } from "next";
import { CheckInGuard } from "@/components/scanner/CheckInGuard";
import { EventSelection } from "@/components/scanner/EventSelection";
export const metadata: Metadata = { title: "Choose check-in event" };
export default function CheckInEventsPage() { return <CheckInGuard><EventSelection /></CheckInGuard>; }
