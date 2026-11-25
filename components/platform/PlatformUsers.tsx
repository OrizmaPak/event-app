"use client";

import { Ban, Check, LoaderCircle, MoreHorizontal, RefreshCw, UserRoundX } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { PLATFORM_PAGE_SIZE, TablePagination } from "./TablePagination";
import { PlatformDetailModal } from "./PlatformDetailModal";

type UserRow = { id: string; email: string; firstName: string; lastName: string; phone: string | null; status: string; platformRole: string | null; createdAt: string };

export function PlatformUsers() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<{ id: string; status: "active" | "suspended" | "deactivated" } | null>(null);
  const [details, setDetails] = useState<UserRow | null>(null);
  const [savingDetails, setSavingDetails] = useState(false);
  const [page, setPage] = useState(1);
  const load = useCallback(async () => { const response = await fetch("/api/v1/platform/users"); const body = await response.json() as { data?: UserRow[]; error?: { message?: string } } | null; if (response.ok) { setRows(body?.data ?? []); setPage(1); } else setError(body?.error?.message ?? "Unable to load users."); }, []);
  useEffect(() => { void load(); }, [load]);
  async function setStatus(user: UserRow, status: "active" | "suspended" | "deactivated") {
    setBusy({ id: user.id, status });
    setError("");
    const action = actionLabel(status).replace(" user", "");
    const toastId = toast.loading(`${action} ${user.firstName} ${user.lastName}`, { description: "Saving access change securely…" });
    try {
      const response = await fetch(`/api/v1/platform/users/${user.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status }) });
      if (!response.ok) {
        const body = await response.json() as { error?: { message?: string } };
        const message = body.error?.message ?? "User status could not be updated.";
        setError(message);
        toast.error("Access update failed", { id: toastId, description: message });
        return;
      }
      await load();
      toast.success(`${user.firstName} ${user.lastName} is now ${status}`, { id: toastId, description: "The access change has been saved." });
    } catch {
      const message = "The access update could not reach the server. Please try again.";
      setError(message);
      toast.error("Connection problem", { id: toastId, description: message });
    } finally {
      setBusy(null);
    }
  }
  function actionLabel(status: "active" | "suspended" | "deactivated") { return status === "active" ? "Activate user" : status === "suspended" ? "Suspend user" : "Deactivate user"; }
  async function saveDetails(values: Record<string, string | boolean>) {
    if (!details) return;
    setSavingDetails(true);
    const toastId = toast.loading(`Saving ${details.firstName} ${details.lastName}`, { description: "Updating user details…" });
    try {
      const response = await fetch(`/api/v1/platform/users/${details.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ firstName: values.firstName, lastName: values.lastName, phone: values.phone }) });
      const body = await response.json() as { error?: { message?: string } };
      if (!response.ok) throw new Error(body.error?.message ?? "User details could not be updated.");
      await load();
      setDetails(null);
      toast.success("User details saved", { id: toastId, description: "The changes are now live." });
    } catch (saveError) { toast.error("Could not save user details", { id: toastId, description: saveError instanceof Error ? saveError.message : "Please try again." }); } finally { setSavingDetails(false); }
  }
  const visibleRows = rows.slice((page - 1) * PLATFORM_PAGE_SIZE, page * PLATFORM_PAGE_SIZE);
  return <section className="platform-management"><div className="platform-toolbar"><div><b>{rows.length} users</b><small>Platform and organizer accounts</small></div><button className="button button--quiet" type="button" onClick={() => void load()} disabled={Boolean(busy)}><RefreshCw size={16} /> Refresh</button></div>{error && <div className="form-error" role="alert">{error}</div>}<div className="finance-table-wrap"><table className="finance-table"><thead><tr><th>User</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead><tbody>{visibleRows.map((row) => { const rowBusy = busy?.id === row.id; return <tr key={row.id}><td><b>{row.firstName} {row.lastName}</b><small>{row.email}</small></td><td>{row.platformRole?.replaceAll("_", " ") ?? "Organizer account"}</td><td><span className={`status-badge status-badge--${row.status}`}>{row.status}</span></td><td>{new Date(row.createdAt).toLocaleDateString("en-NG")}</td><td><span className="decision-actions"><button type="button" title={`View details for ${row.firstName} ${row.lastName}`} aria-label={`View details for ${row.firstName} ${row.lastName}`} disabled={Boolean(busy)} onClick={() => setDetails(row)}><MoreHorizontal size={16} /></button>{row.status !== "active" && <button className={rowBusy ? "is-loading" : ""} type="button" title={actionLabel("active")} aria-label={`${actionLabel("active")} for ${row.email}`} disabled={Boolean(busy)} onClick={() => void setStatus(row, "active")}>{rowBusy && busy?.status === "active" ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}</button>}{row.status === "active" && <button className={rowBusy ? "is-loading" : ""} type="button" title={actionLabel("suspended")} aria-label={`${actionLabel("suspended")} for ${row.email}`} disabled={Boolean(busy)} onClick={() => void setStatus(row, "suspended")}>{rowBusy && busy?.status === "suspended" ? <LoaderCircle className="spin" size={16} /> : <Ban size={16} />}</button>}{row.status !== "deactivated" && <button className={rowBusy ? "is-loading" : ""} type="button" title={actionLabel("deactivated")} aria-label={`${actionLabel("deactivated")} for ${row.email}`} disabled={Boolean(busy)} onClick={() => void setStatus(row, "deactivated")}>{rowBusy && busy?.status === "deactivated" ? <LoaderCircle className="spin" size={16} /> : <UserRoundX size={16} />}</button>}</span></td></tr>; })}{!rows.length && <tr><td className="empty-table" colSpan={5}>No users found.</td></tr>}</tbody></table><TablePagination count={rows.length} page={page} onPageChange={setPage} label="users" /></div>{details && <PlatformDetailModal title={`${details.firstName} ${details.lastName}`} subtitle="User account" initials={`${details.firstName[0] ?? ""}${details.lastName[0] ?? ""}`.toUpperCase()} fields={[{ key: "firstName", label: "First name", value: details.firstName, editable: true }, { key: "lastName", label: "Last name", value: details.lastName, editable: true }, { key: "email", label: "Email address", value: details.email }, { key: "phone", label: "Phone number", value: details.phone ?? "", editable: true }, { key: "role", label: "Role", value: details.platformRole?.replaceAll("_", " ") ?? "Organizer account" }, { key: "status", label: "Account status", value: details.status }, { key: "joined", label: "Joined", value: new Date(details.createdAt).toLocaleString("en-NG") }]} onClose={() => setDetails(null)} onSave={saveDetails} saving={savingDetails} />}</section>;
}
