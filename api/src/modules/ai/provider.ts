export interface TriageResult {
  category: string
  severity: number
  department: string
  confidence: number
  summary: string
  model: string
}

export interface LetterInput {
  title: string
  description: string
  category: string
  locationLabel: string | null
  createdAt: Date
}

export interface AiProvider {
  readonly name: string
  triage(input: { description: string; images: { bytes: Buffer; mimeType: string }[] }): Promise<TriageResult>
  draftLetter(input: LetterInput): Promise<string>
}
