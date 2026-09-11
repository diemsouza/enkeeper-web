export type ApiResult<T> = { ok: boolean; status: number; body: T };

function networkFailure<T>(): ApiResult<T> {
  return { ok: false, status: 0, body: {} as T };
}

export async function getJson<T>(url: string): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(url, { credentials: "include" });
  } catch {
    return networkFailure<T>();
  }
  const body = (await res.json().catch(() => ({}))) as T;
  return { ok: res.ok, status: res.status, body };
}

export async function postJson<T>(
  url: string,
  payload: unknown,
): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
  } catch {
    return networkFailure<T>();
  }
  const body = (await res.json().catch(() => ({}))) as T;
  return { ok: res.ok, status: res.status, body };
}

export async function postForm<T>(
  url: string,
  formData: FormData,
): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      credentials: "include",
      body: formData,
    });
  } catch {
    return networkFailure<T>();
  }
  const body = (await res.json().catch(() => ({}))) as T;
  return { ok: res.ok, status: res.status, body };
}
