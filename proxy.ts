import { NextRequest, NextResponse } from "next/server";

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function clientAddress(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

function limitFor(pathname: string) {
  if (pathname.startsWith("/api/v1/auth/")) return { requests: 12, windowMs: 60_000 };
  if (pathname.includes("/holds") || pathname.includes("/bookings")) return { requests: 60, windowMs: 60_000 };
  return null;
}

function securityHeaders(response: NextResponse, requestId: string) {
  const scriptSource = process.env.NODE_ENV === "production"
    ? "'self' 'unsafe-inline'"
    : "'self' 'unsafe-inline' 'unsafe-eval'";
  response.headers.set("x-request-id", requestId);
  response.headers.set("x-content-type-options", "nosniff");
  response.headers.set("x-frame-options", "DENY");
  response.headers.set("referrer-policy", "strict-origin-when-cross-origin");
  response.headers.set("permissions-policy", "camera=(self), microphone=(), geolocation=()");
  response.headers.set("strict-transport-security", "max-age=31536000; includeSubDomains");
  response.headers.set("content-security-policy", `default-src 'self'; img-src 'self' data: blob: https:; media-src 'self' https:; style-src 'self' 'unsafe-inline'; script-src ${scriptSource}; connect-src 'self' https://api.cloudinary.com https://api.paystack.co https://*.neon.tech wss://*.neon.tech; frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://checkout.paystack.com`);
  return response;
}

function isAllowedRequestOrigin(origin: string, requestOrigin: string) {
  if (origin === requestOrigin) return true;
  if (process.env.NODE_ENV === "production") return false;

  try {
    const source = new URL(origin);
    const target = new URL(requestOrigin);
    const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
    return source.protocol === target.protocol
      && source.port === target.port
      && localHosts.has(source.hostname)
      && localHosts.has(target.hostname);
  } catch {
    return false;
  }
}

export function proxy(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const pathname = request.nextUrl.pathname;
  const unsafe = !["GET", "HEAD", "OPTIONS"].includes(request.method);
  const exemptOrigin = pathname.startsWith("/api/v1/payments/webhooks/") || pathname.startsWith("/api/v1/internal/");
  if (unsafe && pathname.startsWith("/api/") && !exemptOrigin) {
    const origin = request.headers.get("origin");
    if (origin && !isAllowedRequestOrigin(origin, request.nextUrl.origin)) return securityHeaders(NextResponse.json({ data: null, error: { code: "INVALID_ORIGIN", message: "Request origin is not allowed." }, fieldErrors: null, requestId }, { status: 403 }), requestId);
  }
  const limit = limitFor(pathname);
  if (limit) {
    const key = `${clientAddress(request)}:${pathname.split("/").slice(0, 6).join("/")}`;
    const now = Date.now();
    const current = buckets.get(key);
    const bucket = !current || current.resetAt <= now ? { count: 0, resetAt: now + limit.windowMs } : current;
    bucket.count += 1;
    buckets.set(key, bucket);
    if (bucket.count > limit.requests) {
      const response = NextResponse.json({ data: null, error: { code: "RATE_LIMITED", message: "Too many requests. Try again shortly." }, fieldErrors: null, requestId }, { status: 429 });
      response.headers.set("retry-after", String(Math.ceil((bucket.resetAt - now) / 1000)));
      return securityHeaders(response, requestId);
    }
  }
  const headers = new Headers(request.headers);
  headers.set("x-request-id", requestId);
  headers.set("x-app-path", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return securityHeaders(NextResponse.next({ request: { headers } }), requestId);
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
