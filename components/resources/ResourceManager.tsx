"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowUpRight, Bell, LoaderCircle, Plus, Search, Store, X } from "lucide-react";
import { toast } from "sonner";
import type { ManagedResource, Publisher, ResourceTerm } from "@/lib/resources/model";
import { resourceRequest } from "./client";
import { ResourceEditor } from "./ResourceEditor";
import { ResourceDetail, ResourceImage } from "./ResourcePresentation";

export type ResourceNotice = { id: string; title: string; body: string; createdAt: string };
export function ResourceNotices({ notices }: { notices: ResourceNotice[] }) {
  return notices.length > 0 && <details className="rs-notices"><summary><Bell size={17} />Listing updates <span>{notices.length}</span></summary><div>{notices.map((notice) => <article key={notice.id}><b>{notice.title}</b><p>{notice.body}</p><time>{new Date(notice.createdAt).toLocaleDateString("en-NG", { timeZone: "Africa/Lagos", day: "numeric", month: "short" })}</time></article>)}</div></details>;
}
export function ResourceManager({ workspace = false }: { workspace?: boolean }) {
  const params = useSearchParams();
  const [publisher, setPublisher] = useState("personal");
  const [payload, setPayload] = useState<{ publisher?: string; listings: ManagedResource[]; publishers: Publisher[]; terms: ResourceTerm[]; notices: ResourceNotice[] } | null>(null);
  const [editing, setEditing] = useState<ManagedResource | null>(null);
  const [preview, setPreview] = useState<ManagedResource | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [confirm, setConfirm] = useState<{ row: ManagedResource; action: string } | null>(null);
  const autoCreated = useRef(false);
  const endpoint = workspace ? "/api/v1/workspaces/current/resources" : `/api/v1/account/resources?publisher=${publisher}`;
  const load = useCallback(async () => {
    setError("");
    try { setPayload(await resourceRequest(endpoint)); } catch (failure) { setError((failure as Error).message); }
  }, [endpoint]);
  useEffect(() => { setPayload(null); void load(); }, [load]);
  const create = useCallback(async () => {
    if (busy) return;
    setBusy("create");
    try {
      const row = await resourceRequest<ManagedResource>(workspace ? "/api/v1/workspaces/current/resources" : "/api/v1/account/resources", "POST", workspace ? {} : { publisher });
      const owner = payload?.publishers.find((item) => item.id === (row.organizerId ?? "personal"));
      setEditing({ ...row, provider: owner?.name ?? "", canManage: true }); await load();
    } catch (failure) { toast.error((failure as Error).message); } finally { setBusy(""); }
  }, [busy, load, payload, publisher, workspace]);
  useEffect(() => {
    if (!payload || params.get("create") !== "1" || autoCreated.current) return;
    autoCreated.current = true;
    void create();
  }, [payload, params, create]);
  async function act(row: ManagedResource, action: string) {
    setBusy(row.id);
    try { await resourceRequest(`/api/v1/account/resources/${row.id}`, "PATCH", { action, version: row.version }); toast.success(action === "submit" ? "Submitted for approval" : "Listing updated"); setConfirm(null); await load(); }
    catch (failure) { toast.error((failure as Error).message); } finally { setBusy(""); }
  }
  if (editing) return <ResourceEditor key={editing.id} listing={editing} initialTerms={payload?.terms ?? []} onClose={() => setEditing(null)} onSaved={() => void load()} />;
  const selected = payload?.publishers.find((item) => item.id === (workspace ? payload.publisher : publisher));
  const canCreate = selected?.canManage;
  const rows = payload?.listings.filter((row) => (!query || `${row.content.title} ${row.content.subtitle}`.toLowerCase().includes(query.toLowerCase())) && (status === "all" || row.review === status || row.publication === status)) ?? [];
  return <div className="rs-workspace"><header className="rs-workspace-heading"><div><span className="rs-kicker">YOUR SERVICES</span><h1>Resources</h1><p>Introduce your services to people planning their next event.</p></div><div className="rs-heading-actions"><Link href="/resources" target="_blank">Browse directory<ArrowUpRight size={16} /></Link><button className="button button--ink" disabled={Boolean(busy) || !canCreate} onClick={() => void create()}>{busy === "create" ? <LoaderCircle className="rs-spin" size={17} /> : <Plus size={17} />}Create listing</button></div></header>
    {error && <div className="rs-error" role="alert">{error}<button onClick={() => void load()}>Retry</button></div>}
    {!payload && !error ? <div className="rs-empty" role="status"><LoaderCircle className="rs-spin" />Loading listings...</div> : payload && <>
      <ResourceNotices notices={payload.notices} />
      <div className="rs-manager-toolbar">{!workspace && <label>Publisher<select value={publisher} onChange={(event) => setPublisher(event.target.value)}>{payload.publishers.map((item) => <option value={item.id} key={item.id}>{item.name}{item.type === "personal" ? " (personal)" : ""}</option>)}</select></label>}<label className="rs-search-label"><Search size={17} /><input aria-label="Search my listings" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search listings" /></label><label>Status<select value={status} onChange={(event) => setStatus(event.target.value)}>{["all", "draft", "pending", "published", "rejected", "suspended", "unpublished", "archived"].map((value) => <option value={value} key={value}>{value === "all" ? "All listings" : value === "pending" ? "Awaiting approval" : value[0].toUpperCase() + value.slice(1)}</option>)}</select></label></div>
      {rows.length ? <div className="rs-managed-list">{rows.map((row) => <article key={row.id}><ResourceImage src={row.content.images[0]?.url} alt={row.content.images[0]?.alt} /><div className="rs-managed-info"><div className="rs-statuses"><span className={`rs-status rs-status--${row.publication}`}>{row.publication}</span><span className={`rs-status rs-status--${row.review}`}>{row.review === "pending" ? "Awaiting approval" : row.review}</span></div><h2>{row.content.title || "Untitled listing"}</h2><p>{row.content.subtitle || "Complete your listing details"}</p>{row.reason && <p className="rs-review-reason">{row.reason}</p>}<small>Updated {new Date(row.updatedAt).toLocaleDateString("en-NG")}</small></div><div className="rs-list-actions"><button onClick={() => setPreview(row)}>Preview</button>{row.publication === "published" && <Link href={`/resources/${row.slug}`} target="_blank">Public page<ArrowUpRight size={14} /></Link>}{row.canManage && row.publication !== "archived" && <>{row.review !== "pending" && <button onClick={() => setEditing(row)}>Edit listing</button>}{row.review === "pending" ? <button disabled={busy === row.id} onClick={() => setConfirm({ row, action: "withdraw" })}>Withdraw</button> : <button disabled={busy === row.id} onClick={() => void act(row, "submit")}>{busy === row.id ? <LoaderCircle className="rs-spin" size={15} /> : null}Submit for approval</button>}{row.publication === "published" && <button disabled={busy === row.id} onClick={() => setConfirm({ row, action: "unpublish" })}>Unpublish</button>}{row.publication === "unpublished" && row.approvedContent && <button disabled={busy === row.id} onClick={() => void act(row, "republish")}>Republish approved version</button>}<button className="rs-danger" disabled={busy === row.id} onClick={() => setConfirm({ row, action: "archive" })}>Archive</button></>}</div></article>)}</div> : <div className="rs-empty"><Store size={36} /><h2>{query || status !== "all" ? "No matching listings" : "Your next client could start here"}</h2><p>{query || status !== "all" ? "Try another search or status." : "Create a listing for your services, venues, or equipment."}</p></div>}
    </>}
    <Dialog.Root open={Boolean(preview)} onOpenChange={(open) => { if (!open) setPreview(null); }}><Dialog.Portal><Dialog.Overlay className="rs-overlay" /><Dialog.Content className="rs-preview-modal" aria-describedby={undefined}><header><Dialog.Title>Listing preview</Dialog.Title><Dialog.Close className="rs-icon-button" aria-label="Close preview"><X /></Dialog.Close></header>{preview && <ResourceDetail content={preview.content} provider={preview.provider} terms={payload?.terms ?? []} preview />}</Dialog.Content></Dialog.Portal></Dialog.Root>
    <Dialog.Root open={Boolean(confirm)} onOpenChange={(open) => { if (!open && !busy) setConfirm(null); }}><Dialog.Portal><Dialog.Overlay className="rs-overlay" /><Dialog.Content className="rs-confirm"><Dialog.Title>{confirm?.action === "withdraw" ? "Withdraw from review?" : confirm?.action === "archive" ? "Archive this listing?" : "Unpublish this listing?"}</Dialog.Title><Dialog.Description>{confirm?.action === "archive" ? "The listing will leave the directory and become read-only." : confirm?.action === "withdraw" ? "You can edit and submit it again. An existing approved version stays public." : "The listing will leave the directory. You can republish its approved version later."}</Dialog.Description><footer><Dialog.Close disabled={Boolean(busy)} className="button button--outline">Cancel</Dialog.Close><button disabled={Boolean(busy)} className="button rs-danger-button" onClick={() => confirm && void act(confirm.row, confirm.action)}>{busy ? <LoaderCircle className="rs-spin" size={17} /> : null}Confirm</button></footer></Dialog.Content></Dialog.Portal></Dialog.Root>
  </div>;
}
