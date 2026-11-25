import { NextResponse } from "next/server";

export type ApiError = { code: string; message: string };

export function requestId(request?: Request) {
  return request?.headers.get("x-request-id") ?? crypto.randomUUID();
}

export function ok<T>(data: T, status = 200, id = crypto.randomUUID()) {
  return NextResponse.json({ data, error: null, fieldErrors: null, requestId: id }, { status });
}

export function fail(code: string, message: string, status: number, fieldErrors: Record<string, string> | null = null, id = crypto.randomUUID()) {
  return NextResponse.json({ data: null, error: { code, message } satisfies ApiError, fieldErrors, requestId: id }, { status });
}
