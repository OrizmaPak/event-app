import { ResourceDirectory } from "@/components/resources/ResourceDirectory";
import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";
import { getCurrentUser } from "@/lib/auth/session";
import { filterResources, parseResourceQuery } from "@/lib/resources/model";
import { publicResources } from "@/lib/resources/server";
export const dynamic = "force-dynamic";
export const metadata = { title: "Resource directory | NASA EVENT", description: "Discover event professionals, venues, equipment, and services." };
export default async function ResourcesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) for (const item of Array.isArray(value) ? value : value ? [value] : []) params.append(key, item);
  const [current, items] = await Promise.all([getCurrentUser(), publicResources()]);
  return <><PublicHeader user={current?.user ?? null} /><main className="public-main rs-public"><ResourceDirectory results={filterResources(items, parseResourceQuery(params))} /></main><PublicFooter /></>;
}
