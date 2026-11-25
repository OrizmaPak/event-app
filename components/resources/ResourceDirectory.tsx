"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowRight, ChevronLeft, ChevronRight, ListFilter, LoaderCircle, Plus, Search, X } from "lucide-react";
import { parseResourceQuery, type ResourceResults } from "@/lib/resources/model";
import { ResourceCard } from "./ResourcePresentation";

export function ResourceDirectory({ results }: { results: ResourceResults }) {
  const router = useRouter();
  const params = useSearchParams();
  const query = parseResourceQuery(new URLSearchParams(params.toString()));
  const [busy, transition] = useTransition();
  const [filterOpen, setFilterOpen] = useState(false);
  function update(key: string, values: string[]) {
    const next = new URLSearchParams(params.toString());
    next.delete(key); if (key !== "page") next.delete("page");
    for (const value of values) if (value) next.append(key, value);
    transition(() => router.push(`/resources?${next}`, { scroll: false }));
  }
  const groups = [{ key: "category", label: "Services", values: query.categories, options: results.facets.categories }, { key: "eventType", label: "Event types", values: query.eventTypes, options: results.facets.eventTypes }, { key: "location", label: "Location", values: query.locations, options: results.facets.locations }];
  const selected = groups.flatMap((group) => group.values.map((id) => ({ key: group.key, id, name: group.options.find((item) => item.id === id)?.name ?? id, values: group.values })));
  const filters = <>{groups.map((group) => group.options.length > 0 && <fieldset key={group.key}><legend>{group.label}</legend><div className="rs-filter-options">{group.options.map((option) => <label key={option.id}><input type="checkbox" checked={group.values.includes(option.id)} onChange={() => update(group.key, group.values.includes(option.id) ? group.values.filter((id) => id !== option.id) : [...group.values, option.id])} /><span>{option.name}</span><small>{option.count}</small></label>)}</div></fieldset>)}{!groups.some((group) => group.options.length) && <p>Filters appear as services are published.</p>}</>;
  return <div className="rs-directory">
    <header className="rs-directory-heading"><div><span className="rs-kicker">THE EVENT DIRECTORY</span><h1>Resources for your next event</h1><p>Find the people, places, and services that bring it together.</p></div><div className="rs-heading-actions"><Link href="/account/resources">My listings <ArrowRight size={16} /></Link><Link className="button button--ink" href="/account/resources?create=1"><Plus size={17} />Create listing</Link></div></header>
    <div className="rs-directory-search"><form onSubmit={(event) => { event.preventDefault(); update("q", [String(new FormData(event.currentTarget).get("q") ?? "")]); }}><Search size={20} /><input key={query.q} name="q" aria-label="Search resources" placeholder="Search services, providers, or locations" defaultValue={query.q} /><button className="button button--ink" type="submit">Search</button></form><label><span className="rs-sr-only">Sort listings</span><select value={query.sort} onChange={(event) => update("sort", [event.target.value])}><option value="newest">Newest listings</option><option value="title">Title A-Z</option></select></label><button className="rs-mobile-filters button button--outline" onClick={() => setFilterOpen(true)}><ListFilter size={17} />Filters {selected.length || ""}</button></div>
    {(selected.length > 0 || query.q) && <div className="rs-selected-filters">{query.q && <button onClick={() => update("q", [])}>Search: {query.q}<X size={14} /></button>}{selected.map((item) => <button key={`${item.key}-${item.id}`} onClick={() => update(item.key, item.values.filter((id) => id !== item.id))}>{item.name}<X size={14} /></button>)}<button className="rs-clear" onClick={() => transition(() => router.push("/resources", { scroll: false }))}>Clear all</button></div>}
    <div className="rs-directory-layout"><aside className="rs-filters"><h2><ListFilter size={18} />Filter resources</h2>{filters}</aside><section aria-busy={busy}><div className="rs-results-heading"><h2>{results.total} {results.total === 1 ? "listing" : "listings"}</h2>{busy && <span role="status"><LoaderCircle className="rs-spin" size={18} />Updating results</span>}</div>{results.items.length ? <div className="rs-card-grid">{results.items.map((item) => <ResourceCard key={item.id} item={item} />)}</div> : <div className="rs-empty"><Search size={32} /><h2>{selected.length || query.q ? "No matching listings" : "The directory is ready for your services"}</h2><p>{selected.length || query.q ? "Try removing a filter or searching for another service." : "Create a listing to introduce your services to event organizers."}</p><Link className="button button--ink" href="/account/resources?create=1"><Plus size={17} />Create listing</Link></div>}<footer className="rs-pagination"><span>Page {results.page} of {results.pageCount}</span><div><button aria-label="Previous page" disabled={busy || results.page <= 1} onClick={() => update("page", [String(results.page - 1)])}><ChevronLeft size={18} /></button><button aria-label="Next page" disabled={busy || results.page >= results.pageCount} onClick={() => update("page", [String(results.page + 1)])}><ChevronRight size={18} /></button></div></footer></section></div>
    <Dialog.Root open={filterOpen} onOpenChange={setFilterOpen}><Dialog.Portal><Dialog.Overlay className="rs-overlay" /><Dialog.Content className="rs-filter-drawer" aria-describedby={undefined}><header><Dialog.Title>Filter resources</Dialog.Title><Dialog.Close className="rs-icon-button" aria-label="Close filters"><X /></Dialog.Close></header><div className="rs-filters">{filters}</div><Dialog.Close className="button button--ink">Show {results.total} listings</Dialog.Close></Dialog.Content></Dialog.Portal></Dialog.Root>
  </div>;
}
