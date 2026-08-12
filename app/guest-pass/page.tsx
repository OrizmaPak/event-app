import type { Metadata } from "next";
import { GuestPass } from "@/components/public/GuestPass";
import { PublicFooter } from "@/components/public/PublicFooter";
import { PublicHeader } from "@/components/public/PublicHeader";

export const metadata: Metadata = { title: "Your event pass" };

export default function GuestPassPage() { return <><PublicHeader /><main className="public-main pass-page"><GuestPass /></main><PublicFooter /></>; }
