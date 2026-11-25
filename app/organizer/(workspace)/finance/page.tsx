import { FinanceManager } from "@/components/dashboard/FinanceManager";

export default function FinancePage() {
  return <div className="dashboard-page"><header className="page-heading"><div><span>FINANCE</span><h1>Payments and payouts</h1><p>Track collected funds, fees, refund approvals and payout status.</p></div></header><FinanceManager /></div>;
}
