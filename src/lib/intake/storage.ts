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
/* La regle vit dans « cle.ts », sans « server-only », pour que les scripts de
   reprise l importent au lieu d en garder une copie : c est une copie libre qui
   a envoye dix-sept avis de Guinee equatoriale sous une clef illisible. */
import { storageKey } from "./cle";

export { storageKey };

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
    /**
     * LA BIBLIOTHÈQUE D'ABORD, LE DÉPÔT ENSUITE, et l'ordre a été retourné le
     * 17 octobre 2026 sur une mesure.
     *
     * C'est ce repli qui rend le ménage possible sans perdre la relecture.
     * Les scripts de reprise tournent sur une machine de la maison, où la
     * bibliothèque est synchronisée : ils continuent donc de lire les
     * bulletins, et le lecteur peut encore se corriger sur l'historique.
     * Sept cent soixante-sept lignes ont été retrouvées ainsi le 14 octobre.
     *
     * POURQUOI CET ORDRE MAINTENANT. Le dépôt passait en premier, ce qui
     * était juste quand il portait tout. Il ne porte plus que 13,8 Mo sur
     * 1 Go depuis le ménage : pour chaque pièce déménagée, on payait donc un
     * aller-retour réseau VOUÉ À ÉCHOUER, mesuré de 400 à 880 millisecondes,
     * avant de lire un fichier local en moins d'une seconde. Et c'est par là
     * que dix lectures sur vingt-deux sont tombées en « fetch failed » un
     * jour de forte charge : la seule étape fragile de la chaîne était celle
     * dont on n'avait plus besoin.
     *
     * L'index dit où vit la pièce, et il coûte une requête légère, pas un
     * téléchargement. Une pièce non rangée tombe sur le dépôt comme avant.
     *
     * En production, `BIBLIOTHEQUE_DISQUE` est vide et cette branche n'existe
     * pas : Vercel n'a pas de disque, et le desk y renvoie par un lien.
     */
    const { BIBLIOTHEQUE_DISQUE } = await import("./bibliotheque");
    if (BIBLIOTHEQUE_DISQUE) {
      const { data: place } = await sb.from("library_items").select("library_path").eq("file_key", storageKey(key)).maybeSingle();
      if (place?.library_path) {
        try {
          return new Uint8Array(await readFile(path.join(BIBLIOTHEQUE_DISQUE, place.library_path)));
        } catch {
          /* Inscrite mais absente du disque : la synchronisation peut être en
             retard, et le dépôt reste une chance. On ne jette pas ici. */
        }
      }
    }
    const { data, error } = await sb.storage.from(BUCKET).download(storageKey(key));
    if (data) return new Uint8Array(await data.arrayBuffer());
    throw new Error(`Lecture source : ${error?.message ?? "introuvable"}`);
  }
  return new Uint8Array(await readFile(path.join(LOCAL_DIR, safe(storageKey(key)))));
}

const safe = (key: string) => key.replace(/[^a-zA-Z0-9._-]/g, "_");

/**
 * LE LIEN VERS LA BIBLIOTHÈQUE, QUAND LA PIÈCE Y EST RANGÉE.
 *
 * Règle de la maison, arrêtée le 14 octobre 2026 : les documents physiques
 * sont conservés dans la bibliothèque partagée, et le desk n'en garde que le
 * lien. Le dépôt cessait d'être une archive pour devenir une seconde copie
 * que personne ne regardait, et il coûtait son plafond.
 *
 * Rend `undefined` quand la pièce n'est pas indexée, et l'appelant sert alors
 * les octets comme avant. C'est ce qui permet au ménage d'avancer famille par
 * famille sans jamais casser une page : une pièce non rangée reste servie.
 *
 * LES PIÈCES DES CLIENTS N'ONT PAS DE LIEN, ET C'EST VOULU. Un lien
 * SharePoint s'ouvre pour qui a un compte Microsoft 365 de la maison : bon
 * périmètre pour le desk, mauvais pour une pièce d'identité, qui reste au
 * dépôt où l'accès se contrôle ligne par ligne.
 */
export async function lienSource(key: string): Promise<string | undefined> {
  if (!onSupabase()) return undefined;
  const { createClient } = await import("@supabase/supabase-js");
  const { lienBibliotheque } = await import("./bibliotheque");
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const { data } = await sb.from("library_items").select("library_path").eq("file_key", storageKey(key)).maybeSingle();
  return data?.library_path ? lienBibliotheque(data.library_path) : undefined;
}
