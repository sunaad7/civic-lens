import path from 'node:path'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import { sql } from 'kysely'
import { config } from './config.js'
import { db } from './db/client.js'
import { errorHandler, notFoundHandler } from './middleware/error.js'
import adminRoutes from './modules/admin/routes.js'
import authRoutes from './modules/auth/routes.js'
import complaintRoutes from './modules/complaints/routes.js'
import { storageMode } from './lib/storage.js'

const isTest = config.NODE_ENV === 'test'

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => isTest,
})

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 40,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => isTest,
  message: { error: 'Too many attempts. Please try again later.' },
})

export function createApp(): express.Express {
  const app = express()
  app.disable('x-powered-by')
  if (config.trustProxy > 0) app.set('trust proxy', config.trustProxy)

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginEmbedderPolicy: false,
    }),
  )
  app.use(compression())
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || config.corsOrigins.includes(origin)) {
          callback(null, true)
          return
        }
        callback(null, false)
      },
      credentials: true,
    }),
  )
  app.use(express.json({ limit: '1mb' }))
  app.use(cookieParser())

  app.get('/healthz', (_req, res) => {
    res.json({
      ok: true,
      storage: storageMode,
      ai: config.AI_PROVIDER,
      uptime: Math.round(process.uptime()),
    })
  })

  app.get('/readyz', async (_req, res) => {
    try {
      await sql`select 1`.execute(db)
      res.json({ ok: true })
    } catch (error) {
      res.status(503).json({ ok: false, error: (error as Error).message })
    }
  })

  if (storageMode === 'local') {
    app.use(
      '/uploads',
      express.static(path.resolve(process.cwd(), config.UPLOAD_DIR), { maxAge: '1d', index: false }),
    )
  }

  app.use('/api', apiLimiter)
  app.use('/api/auth', authLimiter, authRoutes)
  app.use('/api/complaints', complaintRoutes)
  app.use('/api/admin', adminRoutes)

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
