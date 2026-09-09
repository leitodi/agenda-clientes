import jwt from 'jsonwebtoken'
import { Request, Response, NextFunction } from 'express'

const JWT_SECRET = process.env.JWT_SECRET || 'cambiar-esta-clave-en-produccion'

export interface AuthRequest extends Request {
  user?: { id: string; username: string; role?: string }
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authorization = req.headers.authorization || ''
  const [type, token] = authorization.split(' ')

  if (type !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'No autorizado' })
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.user = decoded as { id: string; username: string; role?: string }
    return next()
  } catch (error) {
    return res.status(401).json({ error: 'Sesion invalida o expirada' })
  }
}
