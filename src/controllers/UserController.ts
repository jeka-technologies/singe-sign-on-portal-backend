import { Request, Response } from "express";
import { UserService } from "../services";

export class UserController {
  constructor(private readonly userService = new UserService()) {}

  async createUserHandler(request: Request, response: Response) {
    const userRequest = request.body;

    try {
      const result = await this.userService.createUser(userRequest);

      if (!result) {
         response.status(409).json({
            status: "FAILED",
            message: "User already exist"
         });
         return
      }
      response.status(201).json({
        status: "SUCCESS",
        message: "User created successfully",
      });
      return
    } catch (error: any) {
      console.error(error);
      response.status(500).json({
        status: "FAILED",
        message: error.message,
      });
      return
    }
  }
}
