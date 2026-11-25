import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/policy";

export default async function FinanceLayout({ children }: { children: React.ReactNode }) {
  if (!await requirePermission("finance.view")) redirect("/organizer");
  return children;
}
