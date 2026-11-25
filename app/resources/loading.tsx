import { LoaderCircle } from "lucide-react";
import { PublicFooter } from "@/components/public/PublicFooter";
import { PublicHeader } from "@/components/public/PublicHeader";

export default function ResourcesLoading() {
  return <>
    <PublicHeader />
    <main className="public-main rs-public" aria-busy="true" aria-live="polite">
      <section className="rs-directory-skeleton" role="status">
        <div className="rs-skeleton-copy"><span>RESOURCE DIRECTORY</span><h1>Discover trusted event services.</h1><p>Loading available providers and filters…</p></div>
        <div className="rs-skeleton-search" />
        <div className="rs-skeleton-layout">
          <aside><i /><i /><i /><i /></aside>
          <div className="rs-skeleton-cards">{Array.from({ length: 6 }, (_, index) => <article key={index}><i /><b /><b /><small /></article>)}</div>
        </div>
        <div className="rs-loading-status"><LoaderCircle className="rs-spin" size={18} />Loading resources</div>
      </section>
    </main>
    <PublicFooter />
  </>;
}
