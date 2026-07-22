import { prisma } from "@/src/lib/prisma";

const SPAM_NAME = "UserTest";

async function main(): Promise<void> {
  const confirm = process.argv.includes("--confirm");

  const where = {
    name: { equals: SPAM_NAME, mode: "insensitive" as const },
    status: "pending" as const,
  };

  const count = await prisma.waitlist.count({ where });

  if (!confirm) {
    console.log(
      `[dry-run] ${count} waitlist entries match name="${SPAM_NAME}" and status="pending". Run with --confirm to delete.`,
    );
    return;
  }

  const result = await prisma.waitlist.deleteMany({ where });
  console.log(`Deleted ${result.count} waitlist entries.`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
