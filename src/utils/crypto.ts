import bcrypt from 'bcrypt'

/**
 * Generates a random salt
 */
export const generateSalt = async (rounds = 10): Promise<string> => {
    return await bcrypt.genSalt(rounds)
}

/**
 * Hashes a password using the provided salt
 */
export const hashPassword = async (password: string, salt: string): Promise<string> => {
    return await bcrypt.hash(password, salt)
}
