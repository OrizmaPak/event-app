"use client";

import { Check, LoaderCircle, RefreshCw, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { PLATFORM_PAGE_SIZE, TablePagination } from "./TablePagination";

type RefundRequest = { id: string; organizerName: string; bookingCode: string; amountMinor: number; reason: string; status: string; reviewNote: string | null; createdAt: string };
const money = (minor: number) => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(minor / 100);

export function PlatformRefunds() {
  const [rows, setRows] = useState<RefundRequest[]>([]);
  const [error, setError] = useState("");
  const [reviewing, setReviewing] = useState<{ item: RefundRequest; decision: "approve" | "reject"; note: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);
  const load = useCallback(async () => { const response = await fetch("/api/v1/platform/refunds"); const body = await response.json() as { data?: RefundRequest[]; error?: { message?: string } } | null; if (response.ok) { setRows(body?.data ?? []); setPage(1); } else setError(body?.error?.message ?? "Unable to load requests."); }, []);
  useEffect(() => { void load(); }, [load]);
  async function submit() {
    if (!reviewing) return;
    setBusy(true);
    setError("");
    const action = reviewing.decision === "approve" ? "Approve" : "Reject";
    const toastId = toast.loading(`${action} refund`, { description: `Saving the decision for ${reviewing.item.bookingCode}…` });
    try {
      const response = await fetch(`/api/v1/platform/refunds/${reviewing.item.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ decision: reviewing.decision, note: reviewing.note }) });
      const body = await response.json() as { error?: { message?: string } };
      if (!response.ok) { const message = body.error?.message ?? "Review could not be saved."; setError(message); toast.error("Refund decision failed", { id: toastId, description: message }); return; }
      setReviewing(null);
      await load();
      toast.success(`Refund ${reviewing.decision === "approve" ? "approved" : "rejected"}`, { id: toastId, description: `Decision saved for ${reviewing.item.bookingCode}.` });
    } catch {
      const message = "The refund decision could not reach the server. Please try again.";
      setError(message);
      toast.error("Connection problem", { id: toastId, description: message });
    } finally {
      setBusy(false);
    }
  }
  const visibleRows = rows.slice((page - 1) * PLATFORM_PAGE_SIZE, page * PLATFORM_PAGE_SIZE);
  return <div className="platform-refunds">{error && <div className="form-error" role="alert">{error}</div>}<div className="platform-toolbar"><b>{rows.filter((row) => row.status === "requested").length} awaiting review</b><button className="button button--quiet" type="button" onClick={() => void load()} disabled={busy}><RefreshCw size={16} /> Refresh</button></div><div className="finance-table-wrap"><table className="finance-table"><thead><tr><th>Organizer</th><th>Booking</th><th>Amount</th><th>Reason</th><th>Status</th><th>Decision</th></tr></thead><tbody>{visibleRows.map((row) => <tr key={row.id}><td><b>{row.organizerName}</b><small>{new Date(row.createdAt).toLocaleString("en-NG")}</small></td><td>{row.bookingCode}</td><td>{money(row.amountMinor)}</td><td>{row.reason}</td><td><span className={`status-badge status-badge--${row.status}`}>{row.status}</span></td><td>{row.status === "requested" ? <span className="decision-actions"><button type="button" aria-label="Approve refund" title="Approve refund" disabled={busy} onClick={() => setReviewing({ item: row, decision: "approve", note: "Approved after payment and policy review." })}><Check size={16} /></button><button type="button" aria-label="Reject refund" title="Reject refund" disabled={busy} onClick={() => setReviewing({ item: row, decision: "reject", note: "" })}><X size={16} /></button></span> : row.reviewNote}</td></tr>)}{!rows.length && <tr><td className="empty-table" colSpan={6}>No refund requests.</td></tr>}</tbody></table><TablePagination count={rows.length} page={page} onPageChange={setPage} label="refund requests" /></div>{reviewing && <div className="modal-backdrop"><div className="finance-modal" role="dialog" aria-modal="true"><header>{reviewing.decision === "approve" ? <Check size={20} /> : <X size={20} />}<div><small>PLATFORM DECISION</small><h2>{reviewing.decision === "approve" ? "Approve refund" : "Reject refund"}</h2></div></header><p>{reviewing.item.organizerName} · {reviewing.item.bookingCode} · {money(reviewing.item.amountMinor)}</p><label className="field"><span>Review note</span><textarea rows={4} value={reviewing.note} onChange={(event) => setReviewing({ ...reviewing, note: event.target.value })} /></label><footer><button className="button button--quiet" type="button" disabled={busy} onClick={() => setReviewing(null)}>Cancel</button><button className="button button--brand" disabled={busy || reviewing.note.trim().length < 3} type="button" onClick={submit}>{busy ? <><LoaderCircle className="spin" size={15} /> Saving…</> : <>Confirm decision</>}</button></footer></div></div>}</div>;
}
