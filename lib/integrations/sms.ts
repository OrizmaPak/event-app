export async function sendTransactionalSms(input: { to: string; text: string }) {
  const apiKey = process.env.TERMII_API_KEY;
  const senderId = process.env.TERMII_SENDER_ID;
  if (!apiKey || !senderId) return { status: "preview" as const };
  const response = await fetch("https://api.ng.termii.com/api/sms/send", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ api_key: apiKey, to: input.to, from: senderId, sms: input.text, type: "plain", channel: "generic" }) });
  const payload = await response.json() as { message_id?: string; message?: string };
  if (!response.ok || !payload.message_id) throw new Error(payload.message ?? `SMS provider rejected the request (${response.status})`);
  return { status: "sent" as const, providerReference: payload.message_id };
}
