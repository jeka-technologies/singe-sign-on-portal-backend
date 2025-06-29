import { prisma, redis } from "../config";
import { CreateUserDto } from "../dtos";

export class UserRepository {
  private readonly CACHE_KEY = "user:all";

  async getUserByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  }

  async createUser(user: CreateUserDto) {
    const newUser = await prisma.user.create({
      data: {
        ...user,
        salt: user.salt as string,
      },
    });

    await redis.del(this.CACHE_KEY);

    return newUser;
  }
}
