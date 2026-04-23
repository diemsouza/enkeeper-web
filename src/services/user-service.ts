import { prisma } from "../lib/prisma";
import { User } from "@prisma/client";

export class UserService {
  constructor() {}

  async getUser(userId: string): Promise<User | null> {
    const result = await prisma.user.findFirst({
      where: {
        id: userId,
        deletedAt: null,
      },
    });

    return result;
  }

  async updateLocale(id: string, locale: string): Promise<boolean> {
    const result = await prisma.user.update({
      where: { id },
      data: { locale },
    });
    return result ? true : false;
  }
}
