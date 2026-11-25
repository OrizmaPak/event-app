"use client";
import { useCallback, useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Check, LoaderCircle, Search, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import type { ManagedResource, ResourceTerm } from "@/lib/resources/model";
import { ResourceDetail } from "./ResourcePresentation";
import { resourceRequest } from "./client";
import { ResourceNotices, type ResourceNotice } from "./ResourceManager";

type Revision = { id: string; listingId: string; version: number; decision: string; reason: string; createdAt: string };
function TermReview({ term, terms, onSaved }: { term: ResourceTerm; terms: ResourceTerm[]; onSaved: () => Promise<void> }) {
  const [name, setName] = useState(term.name);
  const [targetId, setTarget] = useState("");
  const [busy, setBusy] = useState("");
  async function act(action: "approve" | "rename" | "merge") {
    setBusy(action);
    try { await resourceRequest(`/api/v1/platform/resource-options/${term.id}`, "PATCH", { action, name, targetId: targetId || undefined }); toast.success("Option updated"); await onSaved(); }
    catch (failure) { toast.error((failure as Error).message); } finally { setBusy(""); }
  }
  return <div className="rs-term-review"><label>{term.kind === "category" ? "Service category" : "Event type"}<input aria-label={`Name for ${term.name}`} value={name} maxLength={80} onChange={(event) => setName(event.target.value)} /></label><span className={`rs-status rs-status--${term.status}`}>{term.status}</span><div className="rs-term-actions"><button disabled={Boolean(busy) || name.trim().length < 2} onClick={() => void act(term.status === "pending" ? "approve" : "rename")}>{busy && busy !== "merge" ? <LoaderCircle className="rs-spin" size={16} /> : <Check size={16} />}{term.status === "pending" ? "Approve option" : "Save name"}</button><select aria-label={`Merge ${term.name} into`} value={targetId} onChange={(event) => setTarget(event.target.value)}><option value="">Merge into existing option</option>{terms.filter((item) => item.kind === term.kind && item.id !== term.id && item.status === "approved").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><button disabled={Boolean(busy) || !targetId} onClick={() => void act("merge")}>{busy === "merge" ? <LoaderCircle className="rs-spin" size={16} /> : null}Merge</button></div></div>;
}
export function ResourceApprovals() {
  const [data, setData] = useState<{ listings: ManagedResource[]; terms: ResourceTerm[]; revisions: Revision[]; notices: ResourceNotice[] } | null>(null);
  const [view, setView] = useState<"listings" | "options">("listings");
  const [status, setStatus] = useState("pending");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const load = useCallback(async () => { try { setData(await resourceRequest("/api/v1/platform/resources")); setError(""); } catch (failure) { setError((failure as Error).message); } }, []);
  useEffect(() => { void load(); }, [load]);
  const selected = data?.listings.find((item) => item.id === selectedId);
  async function moderate(action: "approve" | "reject" | "suspend") {
    if (!selected) return;
    setBusy(action);
    try { await resourceRequest(`/api/v1/platform/resources/${selected.id}`, "PATCH", { action, version: selected.version, reason }); toast.success(`Listing ${action === "approve" ? "approved" : action === "reject" ? "rejected" : "suspended"}`); await load(); setSelectedId(null); setReason(""); }
    catch (failure) { toast.error((failure as Error).message); } finally { setBusy(""); }
  }
  const rows = data?.listings.filter((row) => (status === "all" || row.review === status || row.publication === status) && `${row.content.title} ${row.provider}`.toLowerCase().includes(search.toLowerCase())) ?? [];
  const options = data?.terms.filter((term) => term.status !== "merged" && term.name.toLowerCase().includes(search.toLowerCase())) ?? [];
  const proposed = data?.terms.filter((term) => term.status === "pending" && selected && [...selected.content.categoryIds, ...selected.content.eventTypeIds].includes(term.id)) ?? [];
  return <div className="rs-workspace"><header className="rs-workspace-heading"><div><span className="rs-kicker">PLATFORM REVIEW</span><h1>Resource approvals</h1><p>Review providers, listing changes, and new service options.</p></div><ShieldCheck size={30} /></header>
    {error && <div className="rs-error" role="alert">{error}<button onClick={() => void load()}>Retry</button></div>}
    {!data && !error && <div className="rs-empty" role="status"><LoaderCircle className="rs-spin" />Loading reviews...</div>}
    {data && <><ResourceNotices notices={data.notices} /><nav className="rs-tabs" aria-label="Resource administration"><button aria-pressed={view === "listings"} onClick={() => setView("listings")}>Listings <span>{data.listings.filter((row) => row.review === "pending").length}</span></button><button aria-pressed={view === "options"} onClick={() => setView("options")}>Categories and event types <span>{data.terms.filter((term) => term.status === "pending").length}</span></button></nav><div className="rs-manager-toolbar"><label className="rs-search-label"><Search size={17} /><input aria-label="Search resource reviews" placeholder="Search" value={search} onChange={(event) => setSearch(event.target.value)} /></label>{view === "listings" && <label>Status<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="pending">Awaiting approval</option><option value="all">All listings</option><option value="published">Published</option><option value="rejected">Rejected</option><option value="suspended">Suspended</option><option value="archived">Archived</option></select></label>}</div>
      {view === "listings" ? rows.length ? <div className="rs-table-scroll"><table className="rs-admin-table"><thead><tr><th>Listing</th><th>Provider</th><th>Publication</th><th>Review</th><th>Action</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td><b>{row.content.title || "Untitled listing"}</b><small>{row.content.location}</small></td><td>{row.provider}<small>{row.organizerId ? "Organization" : "Personal account"}</small></td><td><span className={`rs-status rs-status--${row.publication}`}>{row.publication}</span></td><td><span className={`rs-status rs-status--${row.review}`}>{row.review}</span></td><td><button className="button button--outline" onClick={() => { setSelectedId(row.id); setReason(""); }}>Review</button></td></tr>)}</tbody></table></div> : <div className="rs-empty"><ShieldCheck size={30} /><h2>No listings to review</h2><p>Submitted listings will appear here.</p></div> : <div className="rs-term-list">{options.map((term) => <TermReview key={`${term.id}-${term.name}-${term.status}`} term={term} terms={data.terms} onSaved={load} />)}</div>}
    </>}
    <Dialog.Root open={Boolean(selected)} onOpenChange={(open) => { if (!open && !busy) setSelectedId(null); }}><Dialog.Portal><Dialog.Overlay className="rs-overlay" /><Dialog.Content className="rs-preview-modal" aria-describedby={undefined}><header><Dialog.Title>Review listing</Dialog.Title><Dialog.Close className="rs-icon-button" disabled={Boolean(busy)} aria-label="Close review"><X /></Dialog.Close></header>{selected && data && <><ResourceDetail content={selected.content} provider={selected.provider} terms={data.terms} preview />{selected.approvedContent && <details className="rs-previous-version"><summary>View currently approved version</summary><ResourceDetail content={selected.approvedContent} provider={selected.provider} terms={data.terms} preview /></details>}{proposed.length > 0 && <section className="rs-proposals"><h2>Review new options first</h2>{proposed.map((term) => <TermReview key={term.id} term={term} terms={data.terms} onSaved={load} />)}</section>}<details className="rs-history"><summary>Review history</summary>{data.revisions.filter((item) => item.listingId === selected.id).map((item) => <p key={item.id}>Version {item.version}: {item.decision}{item.reason ? ` - ${item.reason}` : ""}</p>)}</details>{selected.publication !== "archived" && <footer className="rs-review-footer"><label>Decision reason (required for rejection or suspension)<textarea rows={2} maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} /></label><div>{selected.review === "pending" && <><button disabled={Boolean(busy) || !reason.trim()} className="button rs-danger-button" onClick={() => void moderate("reject")}>{busy === "reject" && <LoaderCircle className="rs-spin" size={17} />}Reject</button><button disabled={Boolean(busy) || proposed.length > 0} className="button button--ink" onClick={() => void moderate("approve")}>{busy === "approve" ? <LoaderCircle className="rs-spin" size={17} /> : <Check size={17} />}Approve and publish</button></>}{selected.publication === "published" && <button disabled={Boolean(busy) || !reason.trim()} className="button rs-danger-button" onClick={() => void moderate("suspend")}>{busy === "suspend" && <LoaderCircle className="rs-spin" size={17} />}Suspend listing</button>}</div></footer>}</>}</Dialog.Content></Dialog.Portal></Dialog.Root>
  </div>;
}
