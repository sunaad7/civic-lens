import { mkdir, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { config } from '../config.js'
import { logger } from './logger.js'

const supabaseEnabled = Boolean(config.SUPABASE_URL && config.SUPABASE_SERVICE_ROLE_KEY)

const supabase: SupabaseClient | null = supabaseEnabled
  ? createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  : null

const uploadRoot = path.resolve(process.cwd(), config.UPLOAD_DIR)

export const storageMode = supabaseEnabled ? 'supabase' : 'local'

export async function storeImage(key: string, data: Buffer, mimeType: string): Promise<string> {
  if (supabase) {
    const objectPath = `complaints/${key}`
    const { error } = await supabase.storage.from(config.SUPABASE_BUCKET).upload(objectPath, data, {
      contentType: mimeType,
      upsert: false,
    })
    if (error) throw new Error(`Supabase upload failed: ${error.message}`)
    return objectPath
  }
  await mkdir(uploadRoot, { recursive: true })
  await writeFile(path.join(uploadRoot, key), data)
  return key
}

export async function publicUrl(storagePath: string): Promise<string> {
  if (supabase) {
    const { data, error } = await supabase.storage.from(config.SUPABASE_BUCKET).createSignedUrl(storagePath, 3600)
    if (error) throw new Error(`Supabase signed URL failed: ${error.message}`)
    return data.signedUrl
  }
  return `${config.API_PUBLIC_URL}/uploads/${encodeURIComponent(storagePath)}`
}

export async function removeImage(storagePath: string): Promise<void> {
  if (supabase) {
    const { error } = await supabase.storage.from(config.SUPABASE_BUCKET).remove([storagePath])
    if (error) logger.warn(`Supabase remove failed for ${storagePath}: ${error.message}`)
    return
  }
  try {
    await unlink(path.join(uploadRoot, storagePath))
  } catch {
    // already gone
  }
}
