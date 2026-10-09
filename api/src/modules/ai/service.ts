import { config } from '../../config.js'
import type { AiProvider } from './provider.js'
import { stubProvider } from './stub.js'

export function getAiProvider(): AiProvider {
  switch (config.AI_PROVIDER) {
    case 'stub':
      return stubProvider
    default: {
      const exhaustive: never = config.AI_PROVIDER
      throw new Error(`Unknown AI provider: ${String(exhaustive)}`)
    }
  }
}

export type { AiProvider, LetterInput, TriageResult } from './provider.js'
