import type { Metadata } from "next";
import { Suspense } from "react";
import { ScannerLogin } from "@/components/scanner/ScannerLogin";
export const metadata: Metadata = { title: "Event-day staff access" };
export default function CheckInLoginPage() { return <Suspense fallback={<div className="scanner-loading"><i>N</i><p>Preparing staff access…</p></div>}><ScannerLogin /></Suspense>; }
