import { Suspense } from "react";
import { ResourceManager } from "@/components/resources/ResourceManager";
export default function PersonalResourcesPage() { return <Suspense fallback={<p>Loading resources...</p>}><ResourceManager /></Suspense>; }
