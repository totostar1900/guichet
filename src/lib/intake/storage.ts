import "server-only";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Where uploaded sources (PDF, photos) live.
 *  - demo mode: ./.uploads on disk (gitignored)
 *  - Supabase mode: private bucket "sources"
 * Both keep the original byte-for-byte: it is the audit trail of the offer.
 */

/**
 * La clef d'un objet, telle que les deux dépôts l'acceptent.
 *
 * Supabase refuse une clef qui porte un caractère non ASCII, et le refus arrive
 * au dépôt : le fichier n'est pas gardé, et l'appelant qui n'attrape pas l'erreur
 * croit l'avoir mis à l'abri. Les communiqués du Trésor congolais s'appellent
 * « Communiqué-dannonce-BTA-52-semaines-du-22-septembre-2026.pdf », et les
 * documents d'émetteurs sont nommés d'après leur adresse : la moitié d'une
 * source publique se perdait ainsi sans bruit, ici comme dans la collecte des
 * sociétés.
 *
 * Les accents tombent plutôt que d'être remplacés par un tiret : « Communique »
 * se relit, « Communiqu- » non. Les dossiers restent des dossiers côté Supabase,
 * qui les gère ; sur le disque ils s'aplatissent, le répertoire étant unique.
 */
export const storageKey = (key: string): string =>
  key
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._\-/]+/g, "-");

const BUCKET = "sources";
const LOCAL_DIR = path.join(process.cwd(), ".uploads");
const onSupabase = () => Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

export async function saveSource(key: string, bytes: Uint8Array, mimeType: string): Promise<void> {
  if (onSupabase()) {
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
    const { error } = await sb.storage.from(BUCKET).upload(storageKey(key), bytes, { contentType: mimeType, upsert: true });
    if (error) throw new Error(`Stockage source : ${error.message}`);
    return;
  }
  await mkdir(LOCAL_DIR, { recursive: true });
  await writeFile(path.join(LOCAL_DIR, safe(storageKey(key))), bytes);
}

export async function readSource(key: string): Promise<Uint8Array> {
  if (onSupabase()) {
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
    const { data, error } = await sb.storage.from(BUCKET).download(storageKey(key));
    if (error || !data) throw new Error(`Lecture source : ${error?.message ?? "introuvable"}`);
    return new Uint8Array(await data.arrayBuffer());
  }
  return new Uint8Array(await readFile(path.join(LOCAL_DIR, safe(storageKey(key)))));
}

const safe = (key: string) => key.replace(/[^a-zA-Z0-9._-]/g, "_");
