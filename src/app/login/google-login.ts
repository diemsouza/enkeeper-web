import {
  buildAndroidIntentUrl,
  buildExternalLoginUrl,
  buildSafariUrl,
  CampaignParams,
  getMobilePlatform,
  isEmbeddedBrowser,
} from "@/src/core/embedded-browser";

const SAFARI_OPEN_TIMEOUT_MS = 1500;

function goToGoogleStart(): void {
  const current = new URLSearchParams(window.location.search);
  const params = new URLSearchParams({
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
  const redirectTo = current.get("redirect_to");
  if (redirectTo) params.set("redirect_to", redirectTo);
  window.location.assign(`/api/auth/google/start?${params.toString()}`);
}

// Se o Safari abrir, a página perde a visibilidade; continuar visível depois
// do prazo significa que o navegador embutido ignorou o esquema.
function tryOpenSafari(loginUrl: string, onBlocked: () => void): void {
  window.location.href = buildSafariUrl(loginUrl);
  window.setTimeout(() => {
    if (document.visibilityState === "visible") onBlocked();
  }, SAFARI_OPEN_TIMEOUT_MS);
}

// Detecção só no clique: o Google bloqueia login em navegador embutido, mas
// quem vai entrar por WhatsApp não precisa sair do app.
export function startGoogleLogin(
  campaignParams: CampaignParams,
  onSafariBlocked: (loginUrl: string) => void,
): void {
  const userAgent = navigator.userAgent;
  if (!isEmbeddedBrowser(userAgent)) {
    goToGoogleStart();
    return;
  }

  const loginUrl = buildExternalLoginUrl(window.location.href, campaignParams);
  const platform = getMobilePlatform(userAgent);
  if (platform === "android") {
    window.location.href = buildAndroidIntentUrl(loginUrl);
    return;
  }
  if (platform === "ios") {
    tryOpenSafari(loginUrl, () => onSafariBlocked(loginUrl));
    return;
  }
  goToGoogleStart();
}
