import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import User from '../models/User'
import { comparePassword, generateToken, hashPassword } from '../utils/auth'

function normalizeUsername(value: string) {
  return String(value || '').trim().toLowerCase()
}

export const login = async (req: AuthRequest, res: Response) => {
  try {
    const username = normalizeUsername(req.body.email || req.body.username)
    const { password } = req.body

    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contrasena requeridos' })
    }

    const user = await User.findOne({ username })

    if (!user) {
      return res.status(401).json({ error: 'Credenciales invalidas' })
    }

    const isValidPassword = await comparePassword(password, user.passwordHash)

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Credenciales invalidas' })
    }

    const token = generateToken({
      id: user._id.toString(),
      username: user.username,
      role: user.role,
    })

    return res.json({
      token,
      user: {
        id: user._id.toString(),
        email: user.username,
        name: user.name,
      },
    })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: 'Error al iniciar sesion' })
  }
}

export const register = async (req: AuthRequest, res: Response) => {
  try {
    const username = normalizeUsername(req.body.email || req.body.username)
    const { password, name } = req.body

    if (!username || !password || !name) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' })
    }

    const existingUser = await User.findOne({ username })

    if (existingUser) {
      return res.status(400).json({ error: 'El usuario ya esta registrado' })
    }

    const passwordHash = await hashPassword(password)

    const user = await User.create({
      username,
      passwordHash,
      name,
      role: 'admin',
    })

    const token = generateToken({
      id: user._id.toString(),
      username: user.username,
      role: user.role,
    })

    return res.status(201).json({
      token,
      user: {
        id: user._id.toString(),
        email: user.username,
        name: user.name,
      },
    })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: 'Error al registrar usuario' })
  }
}
