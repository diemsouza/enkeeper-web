import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../prisma/generated/client";

export type {
  User,
  UserChannel,
  Doc,
  DocItem,
  DailyUsage,
  Section,
  Message,
  Question,
  Activity,
  WeeklyReport,
  Waitlist,
} from "../../prisma/generated/client";

export {
  PlanStatus,
  PlanCode,
  ChannelType,
  DocStatus,
  DocType,
  Level,
  SectionStatus,
  SectionType,
  MessageRole,
  QuestionFormat,
  QuestionStatus,
  AnswerType,
  QuestionType,
  ActivityStatus,
  AiProvider,
  Prisma,
} from "../../prisma/generated/client";

const globalPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function extractSchema(databaseUrl: string): string | undefined {
  const url = new URL(databaseUrl);
  return url.searchParams.get("schema") ?? undefined;
}

function createPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL não está definida");
  }

  const schema = extractSchema(databaseUrl);

  const pool = new Pool({
    connectionString: databaseUrl,
    ...(schema ? { options: `-c search_path="${schema}"` } : {}),
  });

  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma = globalPrisma.prisma ?? createPrismaClient();

globalPrisma.prisma = prisma;
