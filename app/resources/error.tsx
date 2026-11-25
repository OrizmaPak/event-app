"use client";

import { PublicFooter } from "@/components/public/PublicFooter";
import { PublicHeader } from "@/components/public/PublicHeader";

export default function ResourcesError({ reset }: { reset: () => void }) {
  return <><PublicHeader /><main className="public-main rs-public"><section className="rs-empty"><h1>Resources could not be loaded</h1><p>Please try again in a moment.</p><button className="button button--ink" onClick={reset}>Try again</button></section></main><PublicFooter /></>;
}
