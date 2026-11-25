import { desc, eq } from "drizzle-orm";
import { organizerBankAccounts, organizers, payouts } from "@/db/schema";
import { requirePlatformRole } from "@/lib/auth/policy";
import { getDatabase } from "@/lib/db/client";
import { fail, ok, requestId } from "@/lib/http/api-response";

export async function GET(request: Request) {
  const id = requestId(request);
  if (!await requirePlatformRole("super_admin", "finance_admin")) return fail("FORBIDDEN", "Finance approval access is required.", 403, null, id);
  const rows = await getDatabase().select({ payout: payouts, organizerName: organizers.name, organizerEmail: organizers.email, accountName: organizerBankAccounts.accountName, accountNumberLast4: organizerBankAccounts.accountNumberLast4, bankCode: organizerBankAccounts.bankCode }).from(payouts).innerJoin(organizers, eq(organizers.id, payouts.organizerId)).innerJoin(organizerBankAccounts, eq(organizerBankAccounts.id, payouts.bankAccountId)).orderBy(desc(payouts.createdAt)).limit(200);
  return ok(rows.map(({ payout, ...details }) => ({ ...payout, ...details })), 200, id);
}
