export type ApiResult<T> = { ok: boolean; status: number; body: T };

export async function getJson<T>(url: string): Promise<ApiResult<T>> {
  const res = await fetch(url, { credentials: "include" });
  const body = (await res.json().catch(() => ({}))) as T;
  return { ok: res.ok, status: res.status, body };
}

export async function postJson<T>(
  url: string,
  payload: unknown,
): Promise<ApiResult<T>> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  const body = (await res.json().catch(() => ({}))) as T;
  return { ok: res.ok, status: res.status, body };
}

export async function postForm<T>(
  url: string,
  formData: FormData,
): Promise<ApiResult<T>> {
  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  const body = (await res.json().catch(() => ({}))) as T;
  return { ok: res.ok, status: res.status, body };
}
