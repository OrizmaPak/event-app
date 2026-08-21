export function normalizeEmail(email: string) { return email.trim().toLowerCase(); }

export function generateInvitationCode(prefix = "INV") {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const values = crypto.getRandomValues(new Uint8Array(8));
  const random = Array.from(values, (value) => alphabet[value % alphabet.length]).join("");
  return `${prefix.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4)}-${random.slice(0, 4)}-${random.slice(4)}`;
}

async function digest(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function hashInvitationCode(eventId: string, email: string, code: string) {
  const secret = process.env.INVITATION_SECRET;
  if (!secret) throw new Error("INVITATION_SECRET is not configured");
  return digest(`${secret}:${eventId}:${normalizeEmail(email)}:${code.trim().toUpperCase()}`);
}

export function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

export interface InvitationAccessToken { invitationId: string; eventId: string; guestName: string; exp: number }

function base64Url(value: string) {
  return btoa(unescape(encodeURIComponent(value))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeBase64Url(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return decodeURIComponent(escape(atob(padded)));
}

async function signature(payload: string) {
  const secret = process.env.INVITATION_SECRET;
  if (!secret) throw new Error("INVITATION_SECRET is not configured");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const bytes = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return base64Url(String.fromCharCode(...new Uint8Array(bytes)));
}

export async function createInvitationAccessToken(data: Omit<InvitationAccessToken, "exp">, durationSeconds = 60 * 60 * 12) {
  const payload = base64Url(JSON.stringify({ ...data, exp: Math.floor(Date.now() / 1000) + durationSeconds }));
  return `${payload}.${await signature(payload)}`;
}

export async function verifyInvitationAccessToken(token: string): Promise<InvitationAccessToken | null> {
  const [payload, suppliedSignature] = token.split(".");
  if (!payload || !suppliedSignature || !constantTimeEqual(await signature(payload), suppliedSignature)) return null;
  try {
    const parsed = JSON.parse(decodeBase64Url(payload)) as InvitationAccessToken;
    return parsed.exp > Date.now() / 1000 ? parsed : null;
  } catch { return null; }
}

export function invitationCookieName(eventId: string) { return `nasa_event_access_${eventId.replace(/-/g, "").slice(0, 12)}`; }
