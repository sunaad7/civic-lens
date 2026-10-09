import type { NextFunction, Request, Response } from 'express'
import { verifyAccessToken } from '../lib/jwt.js'
import { AppError } from './error.js'

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined
  if (!token) {
    next(new AppError(401, 'Authentication required'))
    return
  }
  try {
    req.user = verifyAccessToken(token)
    next()
  } catch {
    next(new AppError(401, 'Invalid or expired access token'))
  }
}

export function requireRole(role: 'admin') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError(401, 'Authentication required'))
      return
    }
    if (req.user.role !== role) {
      next(new AppError(403, 'Admin access required'))
      return
    }
    next()
  }
}
