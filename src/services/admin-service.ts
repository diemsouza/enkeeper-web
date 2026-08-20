import { formatCommand, resolveCommand } from "../lib/commands";
import { formatCanceled } from "../core/formatters";
import { User, UserChannel } from "../lib/prisma";
import { AdminSendMessageIntentData } from "../types/domain";
import { MessageChannel } from "../types/message-channel";
import { countAllActivitiesByUser } from "../repo/activities.repo";
import { saveMessage } from "../repo/messages.repo";
import {
  findUserByIdentifier,
  findUserChannelByUserId,
  fetchUserStats,
  updateUserPlan,
  updateUserPendingIntent,
} from "../repo/users.repo";

const SUBCOMMANDS = [
  "upgrade",
  "expire",
  "extend",
  "info",
  "users",
  "send_message",
  "send_template_message",
];

export async function handleAdminCommand(
  text: string,
  adminUserId: string,
  channel: MessageChannel,
): Promise<string> {
  const parts = text.trim().split(/\s+/);
  const subcommand = parts[1]?.toLowerCase();

  if (!subcommand || subcommand === "help" || !SUBCOMMANDS.includes(subcommand)) {
    return formatAdminHelp();
  }

  if (subcommand === "users") return fetchUsersReport();

  const identifier = parts[2];
  if (!identifier) {
    return `Uso: admin ${subcommand} <identificador>`;
  }

  if (subcommand === "extend") {
    const days = parseInt(parts[3] ?? "", 10);
    if (!parts[3] || isNaN(days) || days <= 0) {
      return "Uso: admin extend <identificador> <dias>";
    }
    return applyExtend(identifier, days);
  }

  if (subcommand === "send_template_message") {
    const templateName = parts[3];
    if (!templateName) {
      return "Uso: admin send_template_message <identificador> <template_name>";
    }
    return sendAdminTemplate(identifier, templateName, channel);
  }

  if (subcommand === "send_message") {
    return startAdminSendMessage(identifier, adminUserId);
  }

  if (subcommand === "upgrade") return applyUpgrade(identifier);
  if (subcommand === "expire") return applyExpire(identifier);
  return fetchInfo(identifier);
}

export async function handleAdminPendingSendMessage(
  adminUser: User,
  channel: MessageChannel,
  text: string,
): Promise<string> {
  const [firstWord] = text.trim().split(/\s+/);
  if (resolveCommand(firstWord) === "cancel") {
    await updateUserPendingIntent(adminUser.id, null);
    return `${formatCanceled()}\n\nUse ${formatCommand("admin")} help para ver os comandos.`;
  }

  const data = getAdminSendMessageData(adminUser);
  await updateUserPendingIntent(adminUser.id, null);
  if (!data) return "Estado invalido, tente novamente.";

  try {
    const result = await channel.sendMessage(data.targetChannelUserId, text);
    await saveMessage({
      userId: data.targetUserId,
      userChannelId: data.targetUserChannelId,
      role: "assistant",
      content: text,
      intent: "admin_message",
      externalId: result.externalId ?? undefined,
    });
    return `Mensagem enviada para ${data.identifier}.`;
  } catch (err) {
    return `Falha ao enviar mensagem para ${data.identifier}: ${extractMetaErrorMessage(err)}`;
  }
}

async function resolveTargetChannel(
  identifier: string,
): Promise<{ user: User; userChannel: UserChannel } | null> {
  const user = await findUserByIdentifier("whatsapp", identifier);
  if (!user) return null;
  const userChannel = await findUserChannelByUserId(user.id, "whatsapp");
  if (!userChannel) return null;
  return { user, userChannel };
}

async function sendAdminTemplate(
  identifier: string,
  templateName: string,
  channel: MessageChannel,
): Promise<string> {
  const target = await resolveTargetChannel(identifier);
  if (!target) return `Usuário não encontrado: ${identifier}`;

  try {
    const result = await channel.sendTemplate(
      target.userChannel.channelUserId,
      templateName,
    );
    await saveMessage({
      userId: target.user.id,
      userChannelId: target.userChannel.id,
      role: "assistant",
      content: templateName,
      intent: "admin_template",
      externalId: result.externalId ?? undefined,
    });
    return `Template "${templateName}" enviado para ${identifier}.`;
  } catch (err) {
    return `Falha ao enviar template "${templateName}" para ${identifier}: ${extractMetaErrorMessage(err)}`;
  }
}

async function startAdminSendMessage(
  identifier: string,
  adminUserId: string,
): Promise<string> {
  const target = await resolveTargetChannel(identifier);
  if (!target) return `Usuário não encontrado: ${identifier}`;

  await updateUserPendingIntent(adminUserId, "waiting_admin_send_message", {
    targetUserId: target.user.id,
    targetUserChannelId: target.userChannel.id,
    targetChannelUserId: target.userChannel.channelUserId,
    identifier,
  });
  return "Escreva sua msg ou use cancelar pra sair.";
}

function getAdminSendMessageData(user: {
  metadata: unknown;
}): AdminSendMessageIntentData | undefined {
  const metadata = user.metadata as {
    intent_data: AdminSendMessageIntentData;
  } | null;
  return metadata?.intent_data;
}

function extractMetaErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return "Erro desconhecido";
  const jsonStart = error.message.indexOf("{");
  if (jsonStart === -1) return error.message;
  try {
    const parsed = JSON.parse(error.message.slice(jsonStart)) as {
      error?: { message?: string };
    };
    return parsed.error?.message ?? error.message;
  } catch {
    return error.message;
  }
}

async function applyUpgrade(channelIdentity: string): Promise<string> {
  const user = await findUserByIdentifier("whatsapp", channelIdentity);
  if (!user) return `Usuário não encontrado: ${channelIdentity}`;
  const planExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await updateUserPlan(user.id, {
    planCode: "pro",
    planStatus: "active",
    planExpiresAt,
  });
  return buildUserInfo(
    { ...user, planCode: "pro", planStatus: "active", planExpiresAt },
    channelIdentity,
  );
}

async function applyExpire(channelIdentity: string): Promise<string> {
  const user = await findUserByIdentifier("whatsapp", channelIdentity);
  if (!user) return `Usuário não encontrado: ${channelIdentity}`;
  const planExpiresAt = new Date();
  await updateUserPlan(user.id, { planStatus: "expired", planExpiresAt });
  return buildUserInfo(
    { ...user, planStatus: "expired", planExpiresAt },
    channelIdentity,
  );
}

async function applyExtend(
  channelIdentity: string,
  days: number,
): Promise<string> {
  const user = await findUserByIdentifier("whatsapp", channelIdentity);
  if (!user) return `Usuário não encontrado: ${channelIdentity}`;
  const planExpiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  await updateUserPlan(user.id, { planStatus: "active", planExpiresAt });
  return buildUserInfo(
    { ...user, planStatus: "active", planExpiresAt },
    channelIdentity,
  );
}

async function fetchInfo(channelIdentity: string): Promise<string> {
  const user = await findUserByIdentifier("whatsapp", channelIdentity);
  if (!user) return `Usuário não encontrado: ${channelIdentity}`;
  return buildUserInfo(user, channelIdentity);
}

async function buildUserInfo(
  user: User,
  channelIdentity: string,
): Promise<string> {
  const countActivities = await countAllActivitiesByUser(user.id);
  return formatAdminUserInfo(user, channelIdentity, countActivities);
}

async function fetchUsersReport(): Promise<string> {
  const stats = await fetchUserStats();
  const pad = (n: number) => String(n).padStart(2, "0");
  const lines = [
    "*Usuários*",
    "",
    `*Total:* ${stats.total}`,
    `*Ativos:* ${stats.active}`,
    `*Trial:* ${stats.trial}`,
    `*Pro:* ${stats.pro}`,
    `*Expirados:* ${stats.expired}`,
    "",
    "*Ultimos cadastrados:*",
    ...stats.recent.map((u) => {
      const d = u.createdAt;
      const date = `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
      return `${u.channelIdentity} - ${u.name ?? "Nao identificado"} - ${date}`;
    }),
  ];
  return lines.join("\n");
}

function formatAdminHelp(): string {
  return [
    "*Admin*",
    "",
    `${formatCommand("admin")} help - lista este menu`,
    `${formatCommand("admin")} users - relatorio de cadastros`,
    `${formatCommand("admin")} info <identificador> - estado atual do usuario`,
    `${formatCommand("admin")} upgrade <identificador> - pro ativo por 30 dias`,
    `${formatCommand("admin")} expire <identificador> - expirar plano agora`,
    `${formatCommand("admin")} extend <identificador> <dias> - estender plano por N dias`,
    `${formatCommand("admin")} send_message <identificador> - enviar mensagem livre ao usuario`,
    `${formatCommand("admin")} send_template_message <identificador> <template_name> - enviar template ao usuario`,
  ].join("\n");
}

function formatAdminUserInfo(
  user: User,
  channelIdentity: string,
  activityCount: number,
): string {
  const expiresAt = user.planExpiresAt
    ? user.planExpiresAt.toISOString().slice(0, 10)
    : "sem expiracao";
  return [
    `cid: ${channelIdentity}`,
    `planCode: ${user.planCode}`,
    `planStatus: ${user.planStatus}`,
    `planExpiresAt: ${expiresAt}`,
    `activityCount: ${activityCount}`,
  ].join("\n");
}
