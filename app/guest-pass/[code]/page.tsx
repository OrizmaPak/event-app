import type { Metadata } from "next";
import { GuestPass } from "@/components/public/GuestPass";
import { PublicFooter } from "@/components/public/PublicFooter";
import { PublicHeader } from "@/components/public/PublicHeader";

export const metadata: Metadata = { title: "Your event pass" };

export default async function GuestPassByCodePage({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ ticket?: string }> }) {
  const { code } = await params;
  const query = await searchParams;
  if (query.ticket === "1") return <GuestPass bookingCode={code} />;
  return <><PublicHeader /><main className="public-main pass-page"><GuestPass bookingCode={code} /></main><PublicFooter /></>;
}
