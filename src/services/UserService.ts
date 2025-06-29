import { CreateUserDto } from "../dtos";
import { UserRepository } from "../repositories";
import { generateSalt, hashPassword } from "../utils";

export class UserService {
  constructor(private readonly userRepository = new UserRepository()) {}

  async createUser(user: CreateUserDto) {
    try {
      const existingUser = await this.userRepository.getUserByEmail(
        user?.email
      );

      if (existingUser) {
        return null;
      }

      const salt = await generateSalt();
      const hashedPassword = await hashPassword(user.password, salt);
      return this.userRepository.createUser({
        ...user,
        password: hashedPassword,
        salt,
      });
    } catch (error) {
      console.error("user-creation: ", error);
    }
  }
}
