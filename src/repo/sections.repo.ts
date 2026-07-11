import { Section, SectionStatus, SectionType } from "../lib/prisma";
import { prisma } from "../lib/prisma";

type CreateSectionData = {
  userId: string;
  docId?: string;
  activityId: string;
  sectionType: SectionType;
  title: string;
  content: string;
  order: number;
};

export async function createSection(data: CreateSectionData): Promise<Section> {
  return prisma.section.create({ data });
}

export async function updateSection(
  id: string,
  data: { status?: SectionStatus },
): Promise<void> {
  await prisma.section.update({ where: { id }, data });
}

export async function findSectionById(id: string): Promise<Section | null> {
  return prisma.section.findFirst({ where: { id, deletedAt: null } });
}

export async function getSectionsByActivityId(
  activityId: string,
): Promise<Pick<Section, "id" | "sectionType" | "content" | "title" | "order">[]> {
  return prisma.section.findMany({
    where: { activityId, deletedAt: null },
    select: { id: true, sectionType: true, content: true, title: true, order: true },
    orderBy: { order: "asc" },
  });
}

export async function recalcSectionStatus(sectionId: string): Promise<void> {
  const total = await prisma.question.count({
    where: { sectionId, deletedAt: null },
  });
  const answered = await prisma.question.count({
    where: { sectionId, deletedAt: null, status: { not: null } },
  });
  const status: SectionStatus | null =
    answered === 0 ? null : answered < total ? "partial" : "completed";
  await prisma.section.update({ where: { id: sectionId }, data: { status } });
}
