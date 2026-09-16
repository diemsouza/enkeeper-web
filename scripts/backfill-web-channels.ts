import { prisma } from "@/src/lib/prisma";

async function main(): Promise<void> {
  const confirm = process.argv.includes("--confirm");

  const whatsappRows = await prisma.userChannel.findMany({
    where: { channelType: "whatsapp", channelUserPhone: { not: null } },
    select: { userId: true, channelUserPhone: true },
  });

  if (!confirm) {
    console.log(
      `[dry-run] ${whatsappRows.length} canais whatsapp com telefone encontrados. ` +
        `Rode com --confirm para criar o canal web correspondente de cada um.`,
    );
    return;
  }

  for (const row of whatsappRows) {
    await prisma.userChannel.upsert({
      where: { userId_channelType: { userId: row.userId, channelType: "web" } },
      update: {},
      create: {
        userId: row.userId,
        channelType: "web",
        channelUserId: row.channelUserPhone as string,
        channelUserPhone: row.channelUserPhone,
      },
    });
  }

  console.log(`Done. ${whatsappRows.length} linhas processadas (idempotente).`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
