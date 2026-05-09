import { User } from "@prisma/client";
import { findActiveActivitiesByUser } from "../repo/activities.repo";
import { findUserByChannel, updateUserPlan } from "../repo/users.repo";

export async function handleAdminCommand(text: string): Promise<string> {
  const parts = text.trim().split(/\s+/);
  const subcommand = parts[1]?.toLowerCase();

  if (!subcommand || subcommand === "help" || !["upgrade", "expire", "extend", "info"].includes(subcommand)) {
    return formatAdminHelp();
  }

  const waId = parts[2];
  if (!waId) {
    return `Uso: /admin ${subcommand} <wa_id>`;
  }

  if (subcommand === "extend") {
    const days = parseInt(parts[3] ?? "", 10);
    if (!parts[3] || isNaN(days) || days <= 0) {
      return "Uso: /admin extend <wa_id> <dias>";
    }
    return applyExtend(waId, days);
  }

  if (subcommand === "upgrade") return applyUpgrade(waId);
  if (subcommand === "expire") return applyExpire(waId);
  return fetchInfo(waId);
}

async function applyUpgrade(waId: string): Promise<string> {
  const user = await findUserByChannel("whatsapp", waId);
  if (!user) return `Usuário não encontrado: ${waId}`;
  const planExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await updateUserPlan(user.id, { planCode: "pro", planStatus: "active", planExpiresAt });
  return buildUserInfo({ ...user, planCode: "pro", planStatus: "active", planExpiresAt }, waId);
}

async function applyExpire(waId: string): Promise<string> {
  const user = await findUserByChannel("whatsapp", waId);
  if (!user) return `Usuário não encontrado: ${waId}`;
  const planExpiresAt = new Date();
  await updateUserPlan(user.id, { planStatus: "expired", planExpiresAt });
  return buildUserInfo({ ...user, planStatus: "expired", planExpiresAt }, waId);
}

async function applyExtend(waId: string, days: number): Promise<string> {
  const user = await findUserByChannel("whatsapp", waId);
  if (!user) return `Usuário não encontrado: ${waId}`;
  const planExpiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  await updateUserPlan(user.id, { planStatus: "active", planExpiresAt });
  return buildUserInfo({ ...user, planStatus: "active", planExpiresAt }, waId);
}

async function fetchInfo(waId: string): Promise<string> {
  const user = await findUserByChannel("whatsapp", waId);
  if (!user) return `Usuário não encontrado: ${waId}`;
  return buildUserInfo(user, waId);
}

async function buildUserInfo(user: User, waId: string): Promise<string> {
  const activities = await findActiveActivitiesByUser(user.id);
  return formatAdminUserInfo(user, waId, activities.length);
}

function formatAdminHelp(): string {
  return [
    "*Admin*",
    "",
    "/admin help - lista este menu",
    "/admin info <wa_id> - estado atual do usuario",
    "/admin upgrade <wa_id> - pro ativo por 30 dias",
    "/admin expire <wa_id> - expirar plano agora",
    "/admin extend <wa_id> <dias> - estender plano por N dias",
  ].join("\n");
}

function formatAdminUserInfo(user: User, waId: string, activityCount: number): string {
  const expiresAt = user.planExpiresAt
    ? user.planExpiresAt.toISOString().slice(0, 10)
    : "sem expiracao";
  return [
    `wa_id: ${waId}`,
    `planCode: ${user.planCode}`,
    `planStatus: ${user.planStatus}`,
    `planExpiresAt: ${expiresAt}`,
    `activityCount: ${activityCount}`,
  ].join("\n");
}
