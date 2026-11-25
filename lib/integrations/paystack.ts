import { createHmac, timingSafeEqual } from "node:crypto";

function secret() {
  const value = process.env.PAYSTACK_SECRET_KEY;
  if (!value) throw new Error("PAYSTACK_SECRET_KEY is not configured");
  return value;
}

export async function initializePaystack(input: { email: string; amountMinor: number; reference: string; callbackUrl: string; metadata: Record<string, unknown> }) {
  const response = await fetch("https://api.paystack.co/transaction/initialize", { method: "POST", headers: { authorization: `Bearer ${secret()}`, "content-type": "application/json" }, body: JSON.stringify({ email: input.email, amount: input.amountMinor, reference: input.reference, callback_url: input.callbackUrl, metadata: input.metadata }) });
  const payload = await response.json() as { status: boolean; message: string; data?: { authorization_url: string; access_code: string; reference: string } };
  if (!response.ok || !payload.status || !payload.data) throw new Error(payload.message || "Unable to initialize payment");
  return payload.data;
}

export function verifyPaystackSignature(rawBody: string, signature: string | null) {
  if (!signature) return false;
  const expected = createHmac("sha512", secret()).update(rawBody).digest("hex");
  const left = Buffer.from(expected);
  const right = Buffer.from(signature);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function createPaystackRefund(input: { transactionReference: string; amountMinor: number }) {
  const response = await fetch("https://api.paystack.co/refund", { method: "POST", headers: { authorization: `Bearer ${secret()}`, "content-type": "application/json" }, body: JSON.stringify({ transaction: input.transactionReference, amount: input.amountMinor }) });
  const payload = await response.json() as { status: boolean; message: string; data?: { id: number; status: string; transaction: { reference: string } } };
  if (!response.ok || !payload.status || !payload.data) throw new Error(payload.message || "Unable to create refund");
  return { providerReference: String(payload.data.id), status: payload.data.status };
}
