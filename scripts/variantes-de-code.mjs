/**
 * UN CARACTERE QUI HESITE FABRIQUE UNE SECONDE SEANCE.
 *
 * La lecture d un scan rend « CM2J000000063 » la ou la piece francaise rend
 * « CM2J00000063 », « CM21.00000028 » pour « CM2L00000028 », « TD 1200000875 »
 * pour « TD1200000875 ». Un zero de trop, un point pour un L, une espace : la
 * clef change, et la meme seance compte double.
 *
 * ON NE DEVINE PAS, ON NE REPARE QUE CE QU UN JUMEAU CONFIRME.
 *
 * Un premier jet tronquait les codes de treize caracteres par la droite :
 * « CM2J000000063 » devenait « CM2J00000006 », qui ne correspond a rien. Le
 * caractere en trop est un zero du remplissage, pas la fin du code. Completer
 * ou raccourcir se decide donc seulement quand l autre ligne de la MEME
 * SEANCE porte le code repare, et quand les chiffres des deux lignes
 * s accordent.
 *
 * LE GABON A ADJUGE DEUX LIGNES D OTA A TROIS ANS LE 7 FEVRIER 2024, servies
 * 26,7 et 24,4 milliards a 91 et 93,4 : deux codes, deux series de chiffres,
 * deux seances. Exiger l accord des chiffres est ce qui empeche de les
 * confondre.
 *
 *   npx tsx --conditions=react-server scripts/variantes-de-code.mjs [--ecrire]
 */
import fs from "node:fs";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { tout } = await import("./_journal.mjs");
const dire = (s) => fs.writeSync(1, `${s}\n`);
const ecrire = process.argv.includes("--ecrire");

/**
 * LA FORME D UN CODE DU CRCT, QUI SUFFIT A DESIGNER LA BONNE VARIANTE.
 *
 * Douze caracteres : deux lettres de pays, puis 1 pour le court terme suivi
 * de neuf chiffres, ou 2 pour le long terme suivi d UNE LETTRE de serie et de
 * huit chiffres. « CM2L00000028 » a la forme, « CM2100000028 » ne l a pas, et
 * c est ainsi qu on sait laquelle des deux lectures a invente son caractere.
 */
const CANONIQUE = (c) => /^[A-Z]{2}1\d{9}$/.test(String(c ?? "")) || /^[A-Z]{2}2[A-Z]\d{8}$/.test(String(c ?? ""));

/**
 * Le code debarrasse de ce que le champ a avale autour de lui : espaces,
 * ponctuation, et le reste de la boite imprimee (« GA110000292 BTA-13
 * 23-OCTO-2026 »). On s arrete des que les mots suivants ne tiennent plus
 * dans un code, et on ne complete ni ne tronque.
 */
export function nettoyer(brut) {
  const s = String(brut ?? "").toUpperCase();
  const suffixe = s.match(/\/[A-Z0-9]{1,4}\b/)?.[0] ?? "";
  const mots = s.replace(/[^A-Z0-9 ]/g, "").split(/\s+/).filter(Boolean);
  let acc = "";
  for (const t of mots) {
    if ((acc + t).length > 12) break;
    acc += t;
  }
  return acc.length >= 10 ? acc + suffixe : s.trim() || null;
}

/** Combien de caracteres separent deux chaines : insertion, suppression, echange. */
export function distance(a, b) {
  const m = a.length;
  const n = b.length;
  if (Math.abs(m - n) > 2) return 9;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return d[m][n];
}

const CHIFFRES = ["announced", "bid", "served", "rate_avg", "rate_limit", "price_avg", "price_limit", "coverage"];
/** Deux lignes disent la meme chose quand au moins deux chiffres coincident. */
const memesChiffres = (a, b) => {
  let compares = 0;
  for (const k of CHIFFRES) {
    if (a[k] == null || b[k] == null) continue;
    compares++;
    if (Math.abs(Number(a[k]) - Number(b[k])) > 0.02) return false;
  }
  return compares >= 2;
};

const nos = await tout(sb, "auction_results", "*");

dire(`=== LES CODES QUE LE CHAMP A MAL DECOUPES ===`);
const aNettoyer = [];
for (const n of nos) {
  if (!n.code_emission) continue;
  const propre = nettoyer(n.code_emission);
  if (propre && propre !== n.code_emission) {
    aNettoyer.push({ n, propre });
    dire(`   ${String(n.session_on).slice(0, 10)} ${String(n.country).padEnd(12)} « ${n.code_emission} »  →  « ${propre} »`);
  }
}
dire(`   ${aNettoyer.length} code(s) à nettoyer\n`);
const propreDe = new Map(aNettoyer.map((x) => [x.n.id, x.propre]));
const code = (n) => propreDe.get(n.id) ?? n.code_emission;

dire(`=== LES VARIANTES D UN MEME CODE SUR UNE MEME SEANCE ===`);
const par = new Map();
for (const n of nos) {
  const c = `${n.country}|${String(n.session_on).slice(0, 10)}|${n.instrument ?? "?"}|${n.tenor ?? "?"}`;
  par.set(c, [...(par.get(c) ?? []), n]);
}
const fusions = [];
const laissees = [];
for (const [clef, lignes] of par) {
  if (lignes.length < 2) continue;
  const pris = new Set();
  for (let i = 0; i < lignes.length; i++) {
    for (let j = i + 1; j < lignes.length; j++) {
      const a = lignes[i];
      const b = lignes[j];
      if (pris.has(a.id) || pris.has(b.id)) continue;
      const ca = String(code(a) ?? "");
      const cb = String(code(b) ?? "");
      const d = distance(ca, cb);
      const memes = memesChiffres(a, b);
      if (d <= 1 && memes) {
        const garde = CANONIQUE(ca) && !CANONIQUE(cb) ? a : CANONIQUE(cb) && !CANONIQUE(ca) ? b : a;
        const jette = garde === a ? b : a;
        pris.add(jette.id);
        fusions.push({ clef, garde, jette, codeGarde: code(garde), codeJette: code(jette) });
        dire(`   ${clef.padEnd(40)} « ${code(jette)} » → « ${code(garde)} »  (un caractère, chiffres identiques)`);
      } else {
        laissees.push({ clef, a, b, d, memes });
      }
    }
  }
}
dire(`   ${fusions.length} variante(s) à fusionner\n`);

dire(`=== CE QUI RESTE EN DOUBLE, ET POURQUOI ON N Y TOUCHE PAS ===`);
const mds = (v) => (v == null ? "—" : (Number(v) / 1e9).toFixed(3));
for (const l of laissees) {
  dire(
    `   ${l.clef.padEnd(40)} « ${code(l.a)} » / « ${code(l.b)} » : ${l.d === 9 ? "plus de deux" : l.d} caractère(s) d'écart, chiffres ${l.memes ? "identiques" : "DIFFÉRENTS"}` +
      (l.memes ? "" : `\n      servi ${mds(l.a.served)} / ${mds(l.b.served)} · taux ${l.a.rate_avg ?? l.a.price_avg ?? "—"} / ${l.b.rate_avg ?? l.b.price_avg ?? "—"}`),
  );
}

if (!ecrire) {
  dire(`\nEssai a blanc. Relancer avec --ecrire.`);
  process.exit(0);
}
let nettoyes = 0;
const fusionnees = new Set(fusions.map((f) => f.jette.id));
for (const x of aNettoyer) {
  if (fusionnees.has(x.n.id)) continue;
  const { error } = await sb.from("auction_results").update({ code_emission: x.propre, updated_at: new Date().toISOString() }).eq("id", x.n.id);
  if (error) dire(`   ERREUR nettoyage ${x.n.id} : ${error.message}`);
  else nettoyes++;
}
let fusionnes = 0;
for (const f of fusions) {
  /* Ce que la jetee sait et que la gardee ignore passe avant la suppression. */
  const complement = {};
  for (const k of CHIFFRES) if (f.garde[k] == null && f.jette[k] != null) complement[k] = f.jette[k];
  const { error: e1 } = await sb
    .from("auction_results")
    .update({ ...complement, code_emission: f.codeGarde, updated_at: new Date().toISOString() })
    .eq("id", f.garde.id);
  if (e1) {
    dire(`   ERREUR mise à jour ${f.clef} : ${e1.message}`);
    continue;
  }
  const { error } = await sb.from("auction_results").delete().eq("id", f.jette.id);
  if (error) dire(`   ERREUR fusion ${f.clef} : ${error.message}`);
  else fusionnes++;
}
dire(`\n=== ${nettoyes} code(s) nettoyé(s), ${fusionnes} variante(s) fusionnée(s) ===`);
