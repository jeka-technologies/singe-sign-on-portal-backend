import { IsUUID } from 'class-validator'

export class VerifyAuthCodeDto {
    @IsUUID('4', { message: 'Invalid or missing auth code' })
    auth_code!: string
}
