import { after } from "next/server";
import { Prisma, User } from "../lib/prisma";
import { findOrCreateUser, UserIdentity } from "../repo/users.repo";
import { TRIAL_DAYS } from "../lib/constants";
import { sendSupportEmail } from "../vendors/email.vendor";
import {
  AttributionCookie,
  buildSourceData,
  hasAttributionSignal,
  resolveSource,
} from "../core/attribution";

type WebLoginParams = {
  timezone?: string;
  attribution?: AttributionCookie | null;
};

type GoogleProfile = { email: string; name: string | null; imageUrl: string | null };

type WebLoginResult = { user: User; isNew: boolean };

function describeIdentity(identity: UserIdentity): { label: string; value: string } {
  if ("phone" in identity) return { label: "Telefone", value: `+${identity.phone}` };
  return { label: "E-mail", value: identity.email };
}

async function resolveWebLogin(
  identity: UserIdentity,
  { timezone, attribution }: WebLoginParams,
  profile?: Pick<GoogleProfile, "name" | "imageUrl">,
): Promise<WebLoginResult> {
  const source = resolveSource(attribution ?? null);
  const { user, isNew } = await findOrCreateUser({
    identity,
    name: profile?.name,
    imageUrl: profile?.imageUrl,
    planExpiresAt: new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000),
    source,
    sourceData:
      attribution && hasAttributionSignal(attribution)
        ? (buildSourceData(attribution) as Prisma.InputJsonValue)
        : null,
    timezone,
  });

  if (isNew) {
    after(() =>
      sendSupportEmail({
        subject: "Novo usuário",
        title: "Novo usuário cadastrado",
        fields: [
          { label: "ID", value: user.id },
          describeIdentity(identity),
          { label: "Origem", value: source },
        ],
      }),
    );
  }
  return { user, isNew };
}

// Login web por telefone: o número é a identidade da conta, então o mesmo
// número digitado de qualquer forma (já normalizado) cai sempre no mesmo User.
export async function resolveWebLoginByPhone(
  phone: string,
  timezone?: string,
  attribution?: AttributionCookie | null,
): Promise<WebLoginResult> {
  return resolveWebLogin({ phone }, { timezone, attribution });
}

// Login com Google: a conta é achada só pelo e-mail (já verificado e em
// minúsculas); nome e foto entram só na criação, nunca sobrescrevem.
export async function resolveWebLoginByEmail(
  profile: GoogleProfile,
  params: WebLoginParams,
): Promise<WebLoginResult> {
  return resolveWebLogin({ email: profile.email }, params, profile);
}
