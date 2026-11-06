/**
 * UN LECTEUR DE CLASSEUR EXCEL QUI TIENT DANS UN NAVIGATEUR (6 novembre 2026).
 *
 * L'export « Toutes les offres » d'OJA pèse 8,6 Mo et compte 32 870 lignes sur 48 colonnes. La bibliothèque d'usage (exceljs) le charge en 9 secondes et près d'un gigaoctet
 * de mémoire : trop pour un navigateur, et un envoi vers le serveur dépasserait la limite des fonctions (4,5 Mo). Ce lecteur décompresse le classeur par morceaux, ne garde que les
 * colonnes demandées et ne se fie jamais à la dimension déclarée de la feuille : « Enchères » et « Titres » annoncent UNE ligne alors qu'ils en ont 4 451 et 4 449, et un
 * lecteur qui s'y fie ne voit qu'une ligne.
 *
 * Il ne lit que la première feuille et ne sait rien des styles : une date reste un numéro de série (voir `jourDe` dans oja.ts). Pur, sans dépendance : il tourne aussi bien
 * dans le navigateur que dans les tests (DecompressionStream existe dans les deux).
 */

const SIG_FIN = 0x06054b50;
const SIG_CENTRAL = 0x02014b50;
const SIG_LOCAL = 0x04034b50;

interface Entree {
  nom: string;
  methode: number;
  tailleCompressee: number;
  decalageLocal: number;
}

const u16 = (d: DataView, o: number) => d.getUint16(o, true);
const u32 = (d: DataView, o: number) => d.getUint32(o, true);

function lireAnnuaire(buf: Uint8Array): Map<string, Entree> {
  const d = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let fin = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65_557); i--) {
    if (u32(d, i) === SIG_FIN) { fin = i; break; }
  }
  if (fin < 0) throw new Error("Ce fichier n'est pas un classeur Excel (.xlsx).");
  const n = u16(d, fin + 10);
  let o = u32(d, fin + 16);
  const out = new Map<string, Entree>();
  const dec = new TextDecoder();
  for (let k = 0; k < n; k++) {
    if (u32(d, o) !== SIG_CENTRAL) throw new Error("Classeur Excel illisible (annuaire de l'archive).");
    const methode = u16(d, o + 10);
    const tailleCompressee = u32(d, o + 20);
    const lNom = u16(d, o + 28);
    const lExtra = u16(d, o + 30);
    const lCom = u16(d, o + 32);
    const decalageLocal = u32(d, o + 42);
    out.set(dec.decode(buf.subarray(o + 46, o + 46 + lNom)), { nom: dec.decode(buf.subarray(o + 46, o + 46 + lNom)), methode, tailleCompressee, decalageLocal });
    o += 46 + lNom + lExtra + lCom;
  }
  return out;
}

/** Les octets compressés d'une entrée, tels qu'ils sont rangés dans l'archive. */
function octets(buf: Uint8Array, e: Entree): Uint8Array {
  const d = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  if (u32(d, e.decalageLocal) !== SIG_LOCAL) throw new Error("Classeur Excel illisible (en-tête local).");
  const debut = e.decalageLocal + 30 + u16(d, e.decalageLocal + 26) + u16(d, e.decalageLocal + 28);
  return buf.subarray(debut, debut + e.tailleCompressee);
}

/** Le texte d'une entrée, rendu morceau par morceau. */
async function* texteDe(buf: Uint8Array, e: Entree): AsyncGenerator<string> {
  const brut = octets(buf, e);
  const decodeur = new TextDecoder("utf-8");
  if (e.methode === 0) {
    yield decodeur.decode(brut);
    return;
  }
  if (e.methode !== 8) throw new Error("Classeur Excel : méthode de compression non prise en charge.");
  const flux = new Blob([brut as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  const lecteur = flux.getReader();
  for (;;) {
    const { done, value } = await lecteur.read();
    if (done) break;
    yield decodeur.decode(value, { stream: true });
  }
  const reste = decodeur.decode();
  if (reste) yield reste;
}

async function texteEntier(buf: Uint8Array, e: Entree): Promise<string> {
  let s = "";
  for await (const m of texteDe(buf, e)) s += m;
  return s;
}

const ENTITES: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'" };
const decoder = (s: string): string => s.replace(/&(amp|lt|gt|quot|apos);|&#(\d+);|&#x([0-9a-fA-F]+);/g, (m, _n, d, h) => (d ? String.fromCodePoint(Number(d)) : h ? String.fromCodePoint(parseInt(h, 16)) : ENTITES[m] ?? m));

function chaines(xml: string): string[] {
  const out: string[] = [];
  const re = /<si>([\s\S]*?)<\/si>|<si\/>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    let t = "";
    if (m[1]) {
      const rt = /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g;
      let x: RegExpExecArray | null;
      while ((x = rt.exec(m[1]))) t += x[1];
    }
    out.push(decoder(t));
  }
  return out;
}

/** « AB12 » → 27 (colonne AB, base 0). */
function colonneDe(ref: string): number {
  let n = 0;
  for (let i = 0; i < ref.length; i++) {
    const c = ref.charCodeAt(i);
    if (c < 65 || c > 90) break;
    n = n * 26 + (c - 64);
  }
  return n - 1;
}

export interface Classeur {
  entetes: string[];
  lignes: Record<string, unknown>[];
}

/**
 * Lit la première feuille. `colonnes` limite aux en-têtes voulus (les autres ne sont pas gardés en mémoire) ; sans elle, tout est gardé.
 */
export async function lireClasseur(source: ArrayBuffer | Uint8Array, opts: { colonnes?: string[]; surProgres?: (lignes: number) => void; /** S'arrêter après la ligne d'en-têtes : reconnaître un fichier sans le lire en entier. */ seulementEntetes?: boolean } = {}): Promise<Classeur> {
  const buf = source instanceof Uint8Array ? source : new Uint8Array(source);
  const annuaire = lireAnnuaire(buf);
  const classeurXml = annuaire.get("xl/workbook.xml");
  if (!classeurXml) throw new Error("Ce fichier n'est pas un classeur Excel (.xlsx).");
  // La première feuille : son identifiant dans le classeur, puis son adresse dans les relations.
  const wb = await texteEntier(buf, classeurXml);
  const rid = /<sheet\s[^>]*r:id="([^"]+)"/.exec(wb)?.[1];
  let chemin = "xl/worksheets/sheet1.xml";
  const rels = annuaire.get("xl/_rels/workbook.xml.rels");
  if (rid && rels) {
    const x = await texteEntier(buf, rels);
    const re = new RegExp(`<Relationship\\s[^>]*Id="${rid}"[^>]*>`);
    const cible = re.exec(x)?.[0].match(/Target="([^"]+)"/)?.[1];
    if (cible) chemin = cible.startsWith("/") ? cible.slice(1) : `xl/${cible}`;
  }
  const feuille = annuaire.get(chemin);
  if (!feuille) throw new Error("Classeur Excel : première feuille introuvable.");
  const partagees = annuaire.get("xl/sharedStrings.xml");
  const textes = partagees ? chaines(await texteEntier(buf, partagees)) : [];

  const voulues = opts.colonnes ? new Set(opts.colonnes) : undefined;
  let entetes: string[] = [];
  const nomDeColonne = new Map<number, string>();
  const lignes: Record<string, unknown>[] = [];
  let reste = "";
  let nbLignes = 0;
  const reRow = /<row\b[^>]*[^/]>([\s\S]*?)<\/row>/g;
  const reCell = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
  const traiter = (corps: string) => {
    const premiere = nbLignes === 0;
    nbLignes++;
    const ligne: Record<string, unknown> = {};
    reCell.lastIndex = 0;
    let c: RegExpExecArray | null;
    while ((c = reCell.exec(corps))) {
      const attrs = c[1];
      const ref = /\br="([A-Z]+)\d+"/.exec(attrs)?.[1];
      if (!ref) continue;
      const col = colonneDe(ref);
      if (!premiere) {
        const nom = nomDeColonne.get(col);
        if (!nom) continue;
        if (voulues && !voulues.has(nom)) continue;
      }
      const t = /\bt="([^"]+)"/.exec(attrs)?.[1];
      const inner = c[2] ?? "";
      let v: unknown = null;
      if (t === "inlineStr") v = decoder([...inner.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((x) => x[1]).join(""));
      else {
        const brut = /<v>([\s\S]*?)<\/v>/.exec(inner)?.[1];
        if (brut == null) v = null;
        else if (t === "s") v = textes[Number(brut)] ?? null;
        else if (t === "str" || t === "d") v = decoder(brut);
        else if (t === "b") v = brut === "1";
        else if (t === "e") v = null;
        else v = Number(brut);
      }
      if (premiere) {
        const nom = v == null ? "" : String(v).trim();
        nomDeColonne.set(col, nom);
        entetes.push(nom);
      } else ligne[nomDeColonne.get(col)!] = v;
    }
    if (!premiere) {
      lignes.push(ligne);
      if (opts.surProgres && lignes.length % 2000 === 0) opts.surProgres(lignes.length);
    }
  };
  for await (const morceau of texteDe(buf, feuille)) {
    reste += morceau;
    reRow.lastIndex = 0;
    let dernier = 0;
    let m: RegExpExecArray | null;
    while ((m = reRow.exec(reste))) {
      traiter(m[1]);
      dernier = reRow.lastIndex;
      if (opts.seulementEntetes) return { entetes: entetes.filter(Boolean), lignes: [] };
    }
    reste = reste.slice(dernier);
  }
  entetes = entetes.filter(Boolean);
  return { entetes, lignes };
}
