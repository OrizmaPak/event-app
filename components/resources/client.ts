export async function resourceRequest<T>(url: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(url, { method, headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined, cache: "no-store" });
  const payload = await response.json() as { data?: T; error?: { message?: string } };
  if (!response.ok) throw new Error(payload.error?.message ?? "The request failed. Please try again.");
  return payload.data as T;
}
