import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'cambiar-esta-clave-en-produccion'

export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10)
  return bcrypt.hash(password, salt)
}

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash)
}

export const generateToken = (user: { id: string; username: string; role?: string }): string => {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role || 'admin',
    },
    JWT_SECRET,
    {
      expiresIn: '12h',
    }
  )
}
