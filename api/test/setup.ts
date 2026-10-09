import { testDbUrl } from './env.js'

process.env.DATABASE_URL = testDbUrl()
process.env.NODE_ENV = 'test'
