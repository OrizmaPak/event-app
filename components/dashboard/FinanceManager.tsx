"use client";

import { ArrowDown, CircleDollarSign, RefreshCw, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type FinanceData = {
  summary: { grossMinor: number; platformFeesMinor: number; processorFeesMinor: number; organizerNetMinor: number; paidOutMinor: number };
  summaryByCurrency: Array<{ currency: string; grossMinor: number; platformFeesMinor: number; processorFeesMinor: number; organizerNetMinor: number; paidOutMinor: number; refundedMinor: number }>;
  eventRevenue: Array<{ eventId: string; title: string; slug: string; currency: string; collectedMinor: number; refundedMinor: number }>;
  payoutBalanceAvailable: boolean;
  transactions: Array<{ id: string; bookingId: string; bookingCode: string; eventTitle: string; amountMinor: number; organizerNetMinor: number; currency: string; status: string; createdAt: string }>;
  refunds: Array<{ id: string; bookingId: string; bookingCode: string; eventTitle: string; amountMinor: number; reason: string; status: string; createdAt: string }>;
  payouts: Array<{ id: string; amountMinor: number; currency: string; status: string; createdAt: string }>;
};

const money = (minor: number, currency = "NGN") => new Intl.NumberFormat("en-NG", { style: "currency", currency, maximumFractionDigits: 2 }).format(minor / 100);

export function FinanceManager() {
  const [data, setData] = useState<FinanceData | null>(null);
  const [error, setError] = useState("");
  const [refund, setRefund] = useState<{ bookingId: string; amount: string; reason: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    setError("");
    const response = await fetch("/api/v1/workspaces/current/finance");
    const body = await response.json() as { data: FinanceData; error?: { message?: string } };
    if (!response.ok) { setError(body.error?.message ?? "Finance data could not be loaded."); return; }
    setData(body.data);
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function requestRefund() {
    if (!refund) return;
    setSaving(true);
    setError("");
    const response = await fetch("/api/v1/workspaces/current/refunds", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ bookingId: refund.bookingId, amountMinor: Math.round(Number(refund.amount) * 100), reason: refund.reason }) });
    const body = await response.json() as { error?: { message?: string } };
    setSaving(false);
    if (!response.ok) { setError(body.error?.message ?? "Refund request could not be submitted."); return; }
    setRefund(null);
    await load();
  }

  if (!data) return <div className="finance-loading"><RefreshCw size={18} /> {error || "Loading financial records..."}</div>;
  const collectedByCurrency = new Map<string, number>();
  data.eventRevenue.forEach((event) => collectedByCurrency.set(event.currency, (collectedByCurrency.get(event.currency) ?? 0) + event.collectedMinor - event.refundedMinor));
  const paidTransactions = data.transactions.filter((transaction) => transaction.status === "paid");
  function showRefundBookings() {
    document.getElementById("refund-eligible-bookings")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  return <div className="finance-manager">
    {error && <div className="form-error" role="alert">{error}</div>}
    <section className="ea-portfolio-total"><div><small>Net collected revenue</small><strong>{collectedByCurrency.size ? [...collectedByCurrency].map(([currency, value]) => money(Math.max(0, value), currency)).join(" · ") : money(0)}</strong><span>Paid ticket collections less processed refunds, before platform and processor fees</span></div></section>
    <section className="finance-refund-entry" aria-labelledby="refund-entry-title"><div><span className="finance-refund-entry__icon"><RotateCcw size={20} /></span><div><small>REFUNDS</small><h2 id="refund-entry-title">Refund a paid ticket</h2><p>Choose the paid booking to refund, enter the amount and reason, then send it for platform approval.</p></div></div><button className="button button--brand" type="button" onClick={showRefundBookings} disabled={!paidTransactions.length}><RotateCcw size={16} />{paidTransactions.length ? "Choose a booking" : "No paid bookings yet"}<ArrowDown size={16} /></button></section>
    <section className="finance-section"><header><div><small>EVENT PERFORMANCE</small><h2>Revenue by event</h2></div></header><div className="finance-table-wrap"><table className="finance-table"><thead><tr><th>Event</th><th>Gross collected</th><th>Refunded</th><th>After refunds</th></tr></thead><tbody>{data.eventRevenue.map((event) => <tr key={event.eventId}><td><Link href={`/organizer/events/${event.slug}/analytics`}>{event.title}</Link></td><td>{money(event.collectedMinor, event.currency)}</td><td>{money(event.refundedMinor, event.currency)}</td><td>{money(event.collectedMinor - event.refundedMinor, event.currency)}</td></tr>)}{!data.eventRevenue.length && <tr><td colSpan={4} className="empty-table">No events yet.</td></tr>}</tbody></table></div></section>
    {data.summaryByCurrency.map((summary) => <section className="finance-summary" aria-label={`${summary.currency} payment settlement summary`} key={summary.currency}>
      <div><small>PROCESSED PAYMENTS · {summary.currency}</small><b>{money(summary.grossMinor, summary.currency)}</b></div>
      <div><small>PLATFORM FEES</small><b>{money(summary.platformFeesMinor, summary.currency)}</b></div>
      <div><small>PROCESSOR FEES</small><b>{money(summary.processorFeesMinor, summary.currency)}</b></div>
      <div><small>{data.payoutBalanceAvailable ? "REMAINING PAYOUT BALANCE" : "NET AFTER REFUNDS"}</small><b>{money(summary.organizerNetMinor - summary.refundedMinor - summary.paidOutMinor, summary.currency)}</b></div>
    </section>)}
    <section className="finance-section" id="refund-eligible-bookings">
      <header><div><small>PAYMENTS</small><h2>Recent transactions</h2></div><button className="button button--quiet" type="button" onClick={() => void load()}><RefreshCw size={16} /> Refresh</button></header>
      <div className="finance-table-wrap"><table className="finance-table"><thead><tr><th>Booking</th><th>Event</th><th>Status</th><th>Gross</th><th>Organizer net</th><th>Action</th></tr></thead><tbody>
        {data.transactions.map((transaction) => <tr key={transaction.id}><td><b>{transaction.bookingCode}</b><small>{new Date(transaction.createdAt).toLocaleDateString("en-NG")}</small></td><td>{transaction.eventTitle}</td><td><span className={`status-badge status-badge--${transaction.status}`}>{transaction.status}</span></td><td>{money(transaction.amountMinor, transaction.currency)}</td><td>{money(transaction.organizerNetMinor, transaction.currency)}</td><td>{transaction.status === "paid" && <button type="button" className="table-action" onClick={() => setRefund({ bookingId: transaction.bookingId, amount: String(transaction.amountMinor / 100), reason: "" })}><RotateCcw size={15} /> Request refund</button>}</td></tr>)}
        {!data.transactions.length && <tr><td colSpan={6} className="empty-table">Paid transactions will appear here.</td></tr>}
      </tbody></table></div>
    </section>
    <section className="finance-section"><header><div><small>REFUNDS</small><h2>Approval status</h2></div></header><div className="finance-table-wrap"><table className="finance-table"><thead><tr><th>Booking</th><th>Event</th><th>Amount</th><th>Reason</th><th>Status</th></tr></thead><tbody>{data.refunds.map((item) => <tr key={item.id}><td>{item.bookingCode}</td><td>{item.eventTitle}</td><td>{money(item.amountMinor)}</td><td>{item.reason}</td><td><span className={`status-badge status-badge--${item.status}`}>{item.status}</span></td></tr>)}{!data.refunds.length && <tr><td colSpan={5} className="empty-table">No refund requests.</td></tr>}</tbody></table></div></section>
    {refund && <div className="modal-backdrop" role="presentation"><div className="finance-modal" role="dialog" aria-modal="true" aria-labelledby="refund-title"><header><CircleDollarSign size={20} /><div><small>REFUND REQUEST</small><h2 id="refund-title">Send for platform approval</h2></div></header><label className="field"><span>Amount in naira</span><input type="number" min="1" value={refund.amount} onChange={(event) => setRefund({ ...refund, amount: event.target.value })} /></label><label className="field"><span>Reason</span><textarea rows={4} value={refund.reason} onChange={(event) => setRefund({ ...refund, reason: event.target.value })} placeholder="Explain why this refund is required" /></label><footer><button className="button button--quiet" type="button" onClick={() => setRefund(null)}>Cancel</button><button className="button button--brand" type="button" disabled={saving || refund.reason.trim().length < 10} onClick={requestRefund}>{saving ? "Submitting..." : "Submit request"}</button></footer></div></div>}
  </div>;
}
