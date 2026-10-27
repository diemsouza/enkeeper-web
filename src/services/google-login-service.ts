import { randomBytes } from "node:crypto";
import {
  GoogleOAuthState,
  signGoogleOAuthState,
} from "../core/google-oauth-state";
import { AttributionCookie } from "../core/attribution";
import {
  buildGoogleAuthUrl,
  createGoogleCodeVerifier,
  fetchGoogleIdentity,
} from "../vendors/google-oauth.vendor";
import { resolveWebLoginByEmail } from "./user-service";
import { User } from "../lib/prisma";
import { GoogleLoginError } from "../lib/custom-errors";

function randomToken(): string {
  return randomBytes(32).toString("base64url");
}

export async function startGoogleLogin(
  redirectTo: string,
  timezone: string | null,
): Promise<{ authUrl: string; stateToken: string }> {
  const { codeVerifier, codeChallenge } = await createGoogleCodeVerifier();
  const state = randomToken();
  const nonce = randomToken();
  const stateToken = await signGoogleOAuthState({
    state,
    nonce,
    codeVerifier,
    redirectTo,
    timezone,
  });
  const authUrl = buildGoogleAuthUrl({ state, nonce, codeChallenge });
  return { authUrl, stateToken };
}

type CompleteGoogleLoginParams = {
  callbackParams: URLSearchParams;
  oauthState: GoogleOAuthState | null;
  attribution: AttributionCookie | null;
};

function readAuthorizationCode(
  callbackParams: URLSearchParams,
  oauthState: GoogleOAuthState | null,
): { code: string; oauthState: GoogleOAuthState } {
  // access_denied é o "Cancelar" na tela de escolha de conta do Google.
  if (callbackParams.get("error") === "access_denied") {
    throw new GoogleLoginError("GOOGLE_CANCELED");
  }
  const code = callbackParams.get("code");
  const state = callbackParams.get("state");
  if (!code || !oauthState || state !== oauthState.state) {
    throw new GoogleLoginError("GOOGLE_FAILED", "Callback do Google inválido.");
  }
  return { code, oauthState };
}

export async function completeGoogleLogin(
  params: CompleteGoogleLoginParams,
): Promise<{ user: User; isNew: boolean }> {
  const { code, oauthState } = readAuthorizationCode(
    params.callbackParams,
    params.oauthState,
  );
  const identity = await fetchGoogleIdentity(code, oauthState.codeVerifier);
  if (identity.nonce !== oauthState.nonce) {
    throw new GoogleLoginError("GOOGLE_FAILED", "Nonce do Google inválido.");
  }
  if (!identity.email || !identity.isEmailVerified) {
    throw new GoogleLoginError("GOOGLE_EMAIL_UNVERIFIED");
  }

  return resolveWebLoginByEmail(
    {
      email: identity.email.trim().toLowerCase(),
      name: identity.name,
      imageUrl: identity.picture,
    },
    {
      timezone: oauthState.timezone ?? undefined,
      attribution: params.attribution,
    },
  );
}
