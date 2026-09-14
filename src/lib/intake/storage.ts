import "server-only";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Where uploaded sources (PDF, photos) live.
 *  - demo mode: ./.uploads on disk (gitignored)
 *  - Supabase mode: private bucket "sources"
 * Both keep the original byte-for-byte: it is the audit trail of the offer.
 */

const BUCKET = "sources";
const LOCAL_DIR = path.join(process.cwd(), ".uploads");
const onSupabase = () => Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

export async function saveSource(key: string, bytes: Uint8Array, mimeType: string): Promise<void> {
  if (onSupabase()) {
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
    const { error } = await sb.storage.from(BUCKET).upload(key, bytes, { contentType: mimeType, upsert: true });
    if (error) throw new Error(`Stockage source : ${error.message}`);
    return;
  }
  await mkdir(LOCAL_DIR, { recursive: true });
  await writeFile(path.join(LOCAL_DIR, safe(key)), bytes);
}

export async function readSource(key: string): Promise<Uint8Array> {
  if (onSupabase()) {
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
    const { data, error } = await sb.storage.from(BUCKET).download(key);
    if (error || !data) throw new Error(`Lecture source : ${error?.message ?? "introuvable"}`);
    return new Uint8Array(await data.arrayBuffer());
  }
  return new Uint8Array(await readFile(path.join(LOCAL_DIR, safe(key))));
}

const safe = (key: string) => key.replace(/[^a-zA-Z0-9._-]/g, "_");
