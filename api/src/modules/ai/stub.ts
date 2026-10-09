import type { AiProvider, LetterInput, TriageResult } from './provider.js'

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  roads: ['road', 'pothole', 'sidewalk', 'pavement', 'street', 'crack', 'curb', 'asphalt'],
  lighting: ['light', 'lamp', 'streetlight', 'dark', 'dim', 'flicker', 'illumination'],
  waste: ['trash', 'garbage', 'waste', 'dump', 'litter', 'bin', 'rubbish', 'debris', 'dumpster'],
  water: ['water', 'leak', 'pipe', 'drain', 'sewage', 'flood', 'sewer', 'hydrant', 'puddle'],
  parks: ['park', 'tree', 'grass', 'bench', 'playground', 'garden', 'shrub', 'hedge'],
  safety: ['safety', 'danger', 'broken glass', 'vandal', 'graffiti', 'sign', 'signal', 'hazard', 'exposed'],
}

const DEPARTMENTS: Record<string, string> = {
  roads: 'Public Works — Roads Division',
  lighting: 'Public Works — Street Lighting',
  waste: 'Sanitation Department',
  water: 'Water & Sewerage Board',
  parks: 'Parks & Recreation Department',
  safety: 'Municipal Safety Office',
  other: 'Citizen Services Desk',
}

const CATEGORY_ORDER = Object.keys(DEPARTMENTS)

function fnv1a(text: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

function pickCategory(description: string): string {
  const text = description.toLowerCase()
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => text.includes(kw))) return category
  }
  return CATEGORY_ORDER[fnv1a(text) % CATEGORY_ORDER.length]
}

export const stubProvider: AiProvider = {
  name: 'stub',

  async triage({ description, images }): Promise<TriageResult> {
    const seed = `${description}|${images.length}|${images[0]?.bytes.length ?? 0}|${images[0]?.mimeType ?? ''}`
    const hash = fnv1a(seed)
    const category = pickCategory(description)
    const severity = 1 + (hash % 5)
    const confidence = Number((0.55 + (hash % 40) / 100).toFixed(2))
    const snippet = description.length > 140 ? `${description.slice(0, 140)}…` : description
    return {
      category,
      severity,
      department: DEPARTMENTS[category],
      confidence,
      summary: `Offline stub triage: "${snippet}" appears to be a ${category} issue with severity ${severity}/5. Route to ${DEPARTMENTS[category]}.`,
      model: 'stub',
    }
  },

  async draftLetter({ title, description, category, locationLabel, createdAt }: LetterInput): Promise<string> {
    const place = locationLabel ?? 'the reported location'
    const date = createdAt.toISOString().slice(0, 10)
    return [
      `Office of Civic Maintenance`,
      ``,
      `Re: Complaint "${title}" (${category}) — reported ${date}`,
      ``,
      `To the relevant department,`,
      ``,
      `A citizen complaint has been received regarding "${title}" at ${place}.`,
      `The reported conditions are as follows:`,
      ``,
      description,
      ``,
      `This matter has been logged in the civic complaints system and triaged under the`,
      `${category} category. We request the assigned department inspect the site and`,
      `initiate remedial action at the earliest, keeping the reporting citizen informed`,
      `of progress.`,
      ``,
      `Please update the complaint record once action is taken.`,
      ``,
      `Sincerely,`,
      `Office of Civic Maintenance`,
    ].join('\n')
  },
}
