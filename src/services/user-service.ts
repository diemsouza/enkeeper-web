import { after } from "next/server";
import { Prisma, User } from "../lib/prisma";
import { findOrCreateUserByPhone } from "../repo/users.repo";
import { TRIAL_DAYS } from "../lib/constants";
import { sendSupportEmail } from "../vendors/email.vendor";
import {
  AttributionCookie,
  buildSourceData,
  hasAttributionSignal,
  resolveSource,
} from "../core/attribution";

// Login web por telefone: o número é a identidade da conta, então o mesmo
// número digitado de qualquer forma (já normalizado) cai sempre no mesmo User.
export async function resolveWebLoginByPhone(
  phone: string,
  timezone?: string,
  attribution?: AttributionCookie | null,
): Promise<{ user: User; isNew: boolean }> {
  const source = resolveSource(attribution ?? null);
  const { user, isNew } = await findOrCreateUserByPhone({
    phone,
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
          { label: "Telefone", value: `+${phone}` },
          { label: "Origem", value: source },
        ],
      }),
    );
  }
  return { user, isNew };
}
