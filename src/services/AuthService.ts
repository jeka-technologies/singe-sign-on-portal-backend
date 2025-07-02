import bcrypt from 'bcrypt'
import { UserRepository } from '../repositories'
import { AuthUtils } from '../utils'

export class AuthService {
    constructor(private readonly userRepository = new UserRepository()) {}

    async login(email: string, password: string) {
        const user = await this.userRepository.getUserByEmail(email)
        if (!user) return { status: 'FAILED', error: 'Invalid credentials' }

        const isMatch = await bcrypt.compare(password, user.password)
        if (!isMatch) return { status: 'FAILED', error: 'Invalid credentials' }

        const payload = { userId: user.id, email: user.email }
        const accessToken = AuthUtils.signAccessToken(payload)
        const refreshToken = AuthUtils.signRefreshToken(payload)

        return { user, accessToken, refreshToken }
    }
}
