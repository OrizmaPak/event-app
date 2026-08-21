import { constantTimeEqual } from "./invitations";

export interface OrganizerSession { organizerId: string; email: string; role: string; exp: number }

function encode(value: string) { return btoa(unescape(encodeURIComponent(value))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
function decode(value: string) { const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "="); return decodeURIComponent(escape(atob(padded))); }
async function sign(payload: string) { const secret = process.env.INVITATION_SECRET; if (!secret) throw new Error("INVITATION_SECRET is not configured"); const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]); const bytes = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload)); return encode(String.fromCharCode(...new Uint8Array(bytes))); }

export async function createOrganizerSession(data: Omit<OrganizerSession, "exp">, durationSeconds = 60 * 60 * 24 * 7) { const payload = encode(JSON.stringify({ ...data, exp: Math.floor(Date.now() / 1000) + durationSeconds })); return `${payload}.${await sign(payload)}`; }
export async function verifyOrganizerSession(token: string): Promise<OrganizerSession | null> { const [payload, signature] = token.split("."); if (!payload || !signature || !constantTimeEqual(await sign(payload), signature)) return null; try { const data = JSON.parse(decode(payload)) as OrganizerSession; return data.exp > Date.now() / 1000 ? data : null; } catch { return null; } }
export const organizerSessionCookie = "nasa_organizer_session";
