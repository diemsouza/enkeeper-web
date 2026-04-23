const isBrowser = typeof window !== "undefined";

export async function http(url: string, init: RequestInit = {}) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(init.body && !("Content-Type" in (init.headers ?? {}))
          ? { "Content-Type": "application/json" }
          : {}),
        ...(init.headers || {}),
      },
      ...(isBrowser ? { credentials: "include" } : {}), // compatibilidade
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const ct = res.headers.get("content-type") || "";
    return ct.includes("application/json") ? res.json() : res.text();
  } finally {
    clearTimeout(id);
  }
}
