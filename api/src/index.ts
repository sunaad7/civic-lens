import { createApp } from './app.js'
import { config } from './config.js'
import { closeDb } from './db/client.js'
import { logger } from './lib/logger.js'

const app = createApp()

const server = app.listen(config.PORT, () => {
  logger.info(`API listening on http://localhost:${config.PORT} (${config.NODE_ENV})`)
})

let shuttingDown = false

function shutdown(signal: string): void {
  if (shuttingDown) return
  shuttingDown = true
  logger.info(`${signal} received — shutting down gracefully`)

  const force = setTimeout(() => {
    logger.error('Graceful shutdown timed out — forcing exit')
    process.exit(1)
  }, 10_000)
  force.unref()

  server.close(async (error) => {
    if (error) logger.error('Error while closing HTTP server', error)
    try {
      await closeDb()
      logger.info('Shutdown complete')
      process.exit(0)
    } catch (dbError) {
      logger.error('Error while closing database pool', dbError)
      process.exit(1)
    }
  })
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', reason)
})
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', error)
  shutdown('uncaughtException')
})
