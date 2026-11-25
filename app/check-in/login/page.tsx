import type { Metadata } from "next";
import { redirect } from "next/navigation";
export const metadata: Metadata = { title: "Event-day staff access" };
export default function CheckInLoginPage() { redirect("/check-in/events"); }
