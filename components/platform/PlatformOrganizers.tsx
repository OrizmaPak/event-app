"use client";

import { Ban, Check, LoaderCircle, MoreHorizontal, RefreshCw, ShieldCheck, ShieldOff } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { PLATFORM_PAGE_SIZE, TablePagination } from "./TablePagination";
import { PlatformDetailModal } from "./PlatformDetailModal";

type OrganizerRow = { id: string; name: string; email: string; phone: string | null; status: string; autoEventApproval: boolean; profile: Record<string, unknown>; eventCount: number; createdAt: string };

export function PlatformOrganizers() {
  const [rows, setRows] = useState<OrganizerRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<{ id: string; status?: "active" | "blocked" | "pending"; setting?: "auto" } | null>(null);
  const [details, setDetails] = useState<OrganizerRow | null>(null);
  const [savingDetails, setSavingDetails] = useState(false);
  const [page, setPage] = useState(1);
  const load = useCallback(async () => { setLoading(true); setError(""); const response = await fetch("/api/v1/platform/organizers"); const body = await response.json() as { data?: OrganizerRow[]; error?: { message?: string } } | null; if (response.ok) { setRows(body?.data ?? []); setPage(1); } else setError(body?.error?.message ?? "Unable to load organizers."); setLoading(false); }, []);
  useEffect(() => { void load(); }, [load]);
  async function setStatus(organizer: OrganizerRow, status: "active" | "blocked" | "pending") {
    setBusy({ id: organizer.id, status });
    setError("");
    const action = status === "active" ? "Approve" : status === "blocked" ? "Block" : "Set pending";
    const toastId = toast.loading(`${action} ${organizer.name}`, { description: "Saving organizer access securely…" });
    try {
      const response = await fetch(`/api/v1/platform/organizers/${organizer.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status }) });
      if (!response.ok) {
        const body = await response.json() as { error?: { message?: string } };
        const message = body.error?.message ?? "Organizer status could not be updated.";
        setError(message);
        toast.error("Organizer update failed", { id: toastId, description: message });
        await load();
        return;
      }
      await load();
      toast.success(`${organizer.name} is now ${status}`, { id: toastId, description: "The organizer access change has been saved." });
    } catch {
      const message = "The organizer update could not reach the server. Please try again.";
      setError(message);
      toast.error("Connection problem", { id: toastId, description: message });
      await load();
    } finally {
      setBusy(null);
    }
  }
  async function setAutoApproval(organizer: OrganizerRow) {
    const enabled = !organizer.autoEventApproval;
    setBusy({ id: organizer.id, setting: "auto" });
    setError("");
    const toastId = toast.loading(`${enabled ? "Enable" : "Disable"} auto approval`, { description: `Updating ${organizer.name}…` });
    try {
      const response = await fetch(`/api/v1/platform/organizers/${organizer.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ autoEventApproval: enabled }) });
      const body = await response.json() as { error?: { message?: string } };
      if (!response.ok) { const message = body.error?.message ?? "Organizer setting could not be updated."; setError(message); toast.error("Setting update failed", { id: toastId, description: message }); return; }
      await load();
      toast.success(`Auto event approval ${enabled ? "enabled" : "disabled"}`, { id: toastId, description: organizer.name });
    } catch { const message = "The organizer setting could not reach the server."; setError(message); toast.error("Connection problem", { id: toastId, description: message }); } finally { setBusy(null); }
  }
  async function saveDetails(values: Record<string, string | boolean>) {
    if (!details) return;
    setSavingDetails(true);
    const toastId = toast.loading(`Saving ${details.name}`, { description: "Updating organizer details…" });
    try {
      const response = await fetch(`/api/v1/platform/organizers/${details.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: values.name, phone: values.phone, city: values.city, autoEventApproval: values.autoEventApproval }) });
      const body = await response.json() as { error?: { message?: string } };
      if (!response.ok) throw new Error(body.error?.message ?? "Organizer details could not be updated.");
      await load();
      setDetails(null);
      toast.success("Organizer details saved", { id: toastId, description: "The changes are now live." });
    } catch (saveError) { toast.error("Could not save organizer details", { id: toastId, description: saveError instanceof Error ? saveError.message : "Please try again." }); } finally { setSavingDetails(false); }
  }
  const visibleRows = rows.slice((page - 1) * PLATFORM_PAGE_SIZE, page * PLATFORM_PAGE_SIZE);
  const profileValue = (key: string) => typeof details?.profile?.[key] === "string" ? String(details.profile[key]) : "";
  return <section className="platform-management"><div className="platform-toolbar"><div><b>{loading ? "Loading organizers…" : `${rows.length} organizers`}</b><small>Workspace approval and access control</small></div><button className="button button--quiet" type="button" onClick={() => void load()} disabled={loading || Boolean(busy)}><RefreshCw size={16} /> {loading ? "Loading…" : "Refresh"}</button></div>{error && <div className="form-error" role="alert">{error}</div>}<div className="finance-table-wrap"><table className="finance-table"><thead><tr><th>Organizer</th><th>Status</th><th>Events</th><th>Created</th><th>Auto event approval</th><th>Actions</th></tr></thead><tbody>{visibleRows.map((row) => { const rowBusy = busy?.id === row.id; return <tr key={row.id}><td><b>{row.name}</b><small>{row.email}</small></td><td><span className={`status-badge status-badge--${row.status}`}>{row.status}</span></td><td>{row.eventCount}</td><td>{new Date(row.createdAt).toLocaleDateString("en-NG")}</td><td><button className={`platform-setting-toggle${row.autoEventApproval ? " active" : ""}`} type="button" title={`${row.autoEventApproval ? "Disable" : "Enable"} auto event approval`} aria-pressed={row.autoEventApproval} disabled={Boolean(busy)} onClick={() => void setAutoApproval(row)}>{rowBusy && busy?.setting === "auto" ? <LoaderCircle className="spin" size={15} /> : row.autoEventApproval ? <ShieldCheck size={15} /> : <ShieldOff size={15} />}<span>{row.autoEventApproval ? "Enabled" : "Off"}</span></button></td><td><span className="decision-actions"><button type="button" title={`View details for ${row.name}`} aria-label={`View details for ${row.name}`} disabled={Boolean(busy)} onClick={() => setDetails(row)}><MoreHorizontal size={16} /></button>{row.status !== "active" && <button className={rowBusy && busy?.status === "active" ? "is-loading" : ""} type="button" title={`Approve ${row.name}`} aria-label={`Approve ${row.name}`} disabled={Boolean(busy)} onClick={() => void setStatus(row, "active")}>{rowBusy && busy?.status === "active" ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}</button>}{row.status !== "blocked" && <button className={rowBusy && busy?.status === "blocked" ? "is-loading" : ""} type="button" title={`Block ${row.name}`} aria-label={`Block ${row.name}`} disabled={Boolean(busy)} onClick={() => void setStatus(row, "blocked")}>{rowBusy && busy?.status === "blocked" ? <LoaderCircle className="spin" size={16} /> : <Ban size={16} />}</button>}</span></td></tr>; })}{!loading && !rows.length && <tr><td className="empty-table" colSpan={6}>No organizer applications found.</td></tr>}{loading && <tr><td className="empty-table" colSpan={6}>Loading organizer records…</td></tr>}</tbody></table><TablePagination count={rows.length} page={page} onPageChange={setPage} label="organizers" /></div>{details && <PlatformDetailModal title={details.name} subtitle="Organizer profile" initials={details.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()} image={profileValue("logoUrl") || profileValue("logo")} fields={[{ key: "name", label: "Organization name", value: details.name, editable: true }, { key: "email", label: "Email address", value: details.email }, { key: "phone", label: "Phone number", value: details.phone ?? "", editable: true }, { key: "tagline", label: "Tagline", value: profileValue("tagline") }, { key: "city", label: "City", value: profileValue("city"), editable: true }, { key: "status", label: "Account status", value: details.status }, { key: "autoEventApproval", label: "Auto event approval", value: details.autoEventApproval ? "Enabled" : "Off", editable: true, kind: "toggle" }, { key: "created", label: "Created", value: new Date(details.createdAt).toLocaleString("en-NG") }]} onClose={() => setDetails(null)} onSave={saveDetails} saving={savingDetails} />}</section>;
}
