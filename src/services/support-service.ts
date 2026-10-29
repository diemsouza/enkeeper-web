import type { User } from "../lib/prisma";
import { SupportDeliveryError } from "../lib/custom-errors";
import { formatDateTime } from "../lib/datetime-utils";
import { sendSupportEmail } from "../vendors/email.vendor";

// Pedido da modal de suporte: vai so para a equipe, nunca para o chat.
export async function sendSupportRequest(
  user: User,
  message: string,
): Promise<void> {
  const isSent = await sendSupportEmail({
    subject: "Pedido de suporte",
    title: "Novo pedido de suporte",
    message,
    fields: [
      { label: "ID", value: user.id },
      { label: "Nome", value: user.name ?? "Não identificado" },
      { label: "Telefone", value: user.phone ? `+${user.phone}` : "-" },
      { label: "E-mail", value: user.email ?? "-" },
      { label: "Plano", value: user.planCode === "pro" ? "Pro" : "Trial" },
      {
        label: "Expira em",
        value: formatDateTime(user.planExpiresAt ?? undefined, "pt-BR"),
      },
    ],
  });
  if (!isSent) throw new SupportDeliveryError();
}
