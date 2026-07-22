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
  DocSource,
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

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma = globalPrisma.prisma ?? createPrismaClient();

globalPrisma.prisma = prisma;
