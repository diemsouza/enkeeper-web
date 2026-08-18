import { formatCommand } from "../lib/commands";
import { User } from "../lib/prisma";
import { countAllActivitiesByUser } from "../repo/activities.repo";
import {
  findUserByIdentifier,
  fetchUserStats,
  updateUserPlan,
} from "../repo/users.repo";

export async function handleAdminCommand(text: string): Promise<string> {
  const parts = text.trim().split(/\s+/);
  const subcommand = parts[1]?.toLowerCase();

  if (
    !subcommand ||
    subcommand === "help" ||
    !["upgrade", "expire", "extend", "info", "users"].includes(subcommand)
  ) {
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

  if (subcommand === "upgrade") return applyUpgrade(identifier);
  if (subcommand === "expire") return applyExpire(identifier);
  return fetchInfo(identifier);
}

async function applyUpgrade(identifier: string): Promise<string> {
  const user = await findUserByIdentifier("whatsapp", identifier);
  if (!user) return `Usuário não encontrado: ${identifier}`;
  const planExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await updateUserPlan(user.id, {
    planCode: "pro",
    planStatus: "active",
    planExpiresAt,
  });
  return buildUserInfo(
    { ...user, planCode: "pro", planStatus: "active", planExpiresAt },
    identifier,
  );
}

async function applyExpire(identifier: string): Promise<string> {
  const user = await findUserByIdentifier("whatsapp", identifier);
  if (!user) return `Usuário não encontrado: ${identifier}`;
  const planExpiresAt = new Date();
  await updateUserPlan(user.id, { planStatus: "expired", planExpiresAt });
  return buildUserInfo(
    { ...user, planStatus: "expired", planExpiresAt },
    identifier,
  );
}

async function applyExtend(identifier: string, days: number): Promise<string> {
  const user = await findUserByIdentifier("whatsapp", identifier);
  if (!user) return `Usuário não encontrado: ${identifier}`;
  const planExpiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  await updateUserPlan(user.id, { planStatus: "active", planExpiresAt });
  return buildUserInfo(
    { ...user, planStatus: "active", planExpiresAt },
    identifier,
  );
}

async function fetchInfo(identifier: string): Promise<string> {
  const user = await findUserByIdentifier("whatsapp", identifier);
  if (!user) return `Usuário não encontrado: ${identifier}`;
  return buildUserInfo(user, identifier);
}

async function buildUserInfo(user: User, identifier: string): Promise<string> {
  const countActivities = await countAllActivitiesByUser(user.id);
  return formatAdminUserInfo(user, identifier, countActivities);
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
      return `${u.channelUserId} - ${u.name ?? "Nao identificado"} - ${date}`;
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
  ].join("\n");
}

function formatAdminUserInfo(
  user: User,
  identifier: string,
  activityCount: number,
): string {
  const expiresAt = user.planExpiresAt
    ? user.planExpiresAt.toISOString().slice(0, 10)
    : "sem expiracao";
  return [
    `identificador: ${identifier}`,
    `planCode: ${user.planCode}`,
    `planStatus: ${user.planStatus}`,
    `planExpiresAt: ${expiresAt}`,
    `activityCount: ${activityCount}`,
  ].join("\n");
}
