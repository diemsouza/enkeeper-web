import { CodeChallengeMethod, OAuth2Client } from "google-auth-library";

const GOOGLE_SCOPES = ["openid", "email", "profile"];
const GOOGLE_CALLBACK_PATH = "/api/auth/google/callback";

export type GoogleIdentity = {
  email: string | null;
  isEmailVerified: boolean;
  name: string | null;
  picture: string | null;
  nonce: string | null;
};

function getGoogleClientId(): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error("GOOGLE_CLIENT_ID não configurado");
  return clientId;
}

function createGoogleClient(): OAuth2Client {
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientSecret) throw new Error("GOOGLE_CLIENT_SECRET não configurado");
  return new OAuth2Client({
    clientId: getGoogleClientId(),
    clientSecret,
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}${GOOGLE_CALLBACK_PATH}`,
  });
}

export async function createGoogleCodeVerifier(): Promise<{
  codeVerifier: string;
  codeChallenge: string;
}> {
  const { codeVerifier, codeChallenge } =
    await createGoogleClient().generateCodeVerifierAsync();
  if (!codeChallenge) throw new Error("PKCE code challenge não gerado");
  return { codeVerifier, codeChallenge };
}

export function buildGoogleAuthUrl(params: {
  state: string;
  nonce: string;
  codeChallenge: string;
}): string {
  return createGoogleClient().generateAuthUrl({
    scope: GOOGLE_SCOPES,
    state: params.state,
    nonce: params.nonce,
    code_challenge: params.codeChallenge,
    code_challenge_method: CodeChallengeMethod.S256,
    prompt: "select_account",
  });
}

export async function fetchGoogleIdentity(
  code: string,
  codeVerifier: string,
): Promise<GoogleIdentity> {
  const client = createGoogleClient();
  const { tokens } = await client.getToken({ code, codeVerifier });
  if (!tokens.id_token) throw new Error("Google não devolveu id_token");

  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token,
    audience: getGoogleClientId(),
  });
  const payload = ticket.getPayload();
  if (!payload) throw new Error("id_token do Google sem payload");

  return {
    email: payload.email ?? null,
    isEmailVerified: payload.email_verified === true,
    name: payload.name ?? null,
    picture: payload.picture ?? null,
    nonce: payload.nonce ?? null,
  };
}
