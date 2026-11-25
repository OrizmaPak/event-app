import { Suspense } from "react";
import { ResourceManager } from "@/components/resources/ResourceManager";
import { getWorkspacePrincipal, hasPermission } from "@/lib/auth/policy";
import { notFound } from "next/navigation";
export default async function OrganizationResourcesPage() {
  const principal = await getWorkspacePrincipal();
  if (!principal || !(hasPermission(principal, "resources.view") || hasPermission(principal, "resources.manage"))) notFound();
  return <Suspense fallback={<p>Loading resources...</p>}><ResourceManager workspace /></Suspense>;
}
