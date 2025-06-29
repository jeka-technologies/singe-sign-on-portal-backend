import { IsEmail, IsNotEmpty, IsOptional, IsString, Length, MinLength } from "class-validator";

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @Length(2, 50)
  first_name!: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 50)
  last_name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsString()
  phone_number!: string;

  @IsString()
  @IsOptional()
  salt?: string;

  @IsString()
  profile_image!: string;
}