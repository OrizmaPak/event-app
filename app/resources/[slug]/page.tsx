import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ResourceDetail } from "@/components/resources/ResourcePresentation";
import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";
import { getCurrentUser } from "@/lib/auth/session";
import { publicResources } from "@/lib/resources/server";
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const [item] = await publicResources((await params).slug);
  return item ? { title: `${item.content.title} | NASA EVENT`, description: item.content.subtitle, openGraph: { images: item.content.images.slice(0, 1).map((image) => image.url) } } : { title: "Listing unavailable" };
}
export default async function ResourcePage({ params }: { params: Promise<{ slug: string }> }) {
  const [item] = await publicResources((await params).slug); if (!item) notFound();
  const current = await getCurrentUser();
  return <><PublicHeader user={current?.user ?? null} /><main className="public-main rs-public"><Link className="rs-back" href="/resources"><ArrowLeft size={17} />All resources</Link><ResourceDetail content={item.content} provider={item.provider} terms={[...item.categories, ...item.eventTypes]} /></main><PublicFooter /></>;
}
