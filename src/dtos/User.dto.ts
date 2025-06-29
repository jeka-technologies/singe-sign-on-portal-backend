import { IsEmail, IsNotEmpty, IsOptional, IsString, Length, MinLength } from "class-validator";

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @Length(2, 50)
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 50)
  lastName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsString()
  phoneNumber!: string;

  @IsString()
  @IsOptional()
  salt?: string;

  @IsString()
  profileImage!: string;
}