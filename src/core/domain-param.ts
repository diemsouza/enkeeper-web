import type { DomainId } from "../lib/constants";
import { isDomainId } from "./activity-request";

export const DOMAIN_URL_PARAM = "domain";

const APP_ENTRY_PATH = "/app";

export function parseDomainParam(
  raw: string | null | undefined,
): DomainId | null {
  if (typeof raw !== "string") return null;
  return isDomainId(raw) ? raw : null;
}

export function buildAppEntryUrl(domain: DomainId | null): string {
  if (!domain) return APP_ENTRY_PATH;
  const params = new URLSearchParams({ [DOMAIN_URL_PARAM]: domain });
  return `${APP_ENTRY_PATH}?${params.toString()}`;
}

// Remove so o domain e mantem os demais params (pagamento, campanha).
export function stripDomainParam(search: string): string {
  const params = new URLSearchParams(search);
  params.delete(DOMAIN_URL_PARAM);
  const rest = params.toString();
  return rest ? `?${rest}` : "";
}
