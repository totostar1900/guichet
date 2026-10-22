/**
 * VINGT-QUATRE BONS CONGOLAIS SANS ECHEANCE : OU LA TROUVER SANS PAYER ?
 *
 * C est le seul manque reel des trente-quatre seances congolaises jamais
 * passees a l extracteur. Il compte : sans echeance, « auctionYield »
 * retombe sur la DUREE ANNONCEE et le declare, si bien que la seance se
 * pose sur la courbe a l endroit que son etiquette indique plutot qu a
 * celui que sa date commande. Sur un bon de treize semaines abonde, les
 * deux ne sont pas au meme endroit.
 *
 * TROIS SOURCES GRATUITES, dans l ordre de la preuve :
 *
 *   L AVIS D EMISSION de la meme seance, qui porte « maturity_on » lu sur
 *   sa propre piece. C est la meilleure : un second document.
 *   LA COUCHE DE TEXTE du communiqué, quand il en a une.
 *   LE REGLEMENT PLUS LA DUREE, qui est un calcul et non une lecture : on
 *   le compte pour savoir ce qu il vaudrait, sans l ecrire.
 *
 * On mesure ce que chacune rendrait AVANT de parler d un appel au modele.
 *
 *   npx tsx --conditions=react-server scripts/congolaises-echeance-gratuite.mjs
 */
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { repo } = await import("../src/lib/data/index.ts");
const { readSource } = await import("../src/lib/intake/storage.ts");
const dire = (s) => fs.writeSync(1, `${s}\n`);

const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
async function texteDe(bytes) {
  const doc = await pdfjs.getDocument({ data: bytes, useSystemFonts: true, isEvalSupported: false }).promise;
  let out = "";
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    out += (await page.getTextContent()).items.map((i) => i.str).join(" ") + "\n";
  }
  await doc.destroy();
  return out;
}

const avis = [];
for (let de = 0; ; de += 1000) {
  const { data, error } = await sb.from("emission_notices").select("country,session_on,instrument,tenor,code_emission,maturity_on,settle_on").range(de, de + 999);
  if (error) throw new Error(error.message);
  avis.push(...(data ?? []));
  if ((data?.length ?? 0) < 1000) break;
}

const toutes = (await repo().listAuctionResults({ limit: 2000 })).filter((r) => r.country === "Congo" && !r.setAsideAt);
const sans = toutes.filter((r) => !r.maturityOn).sort((a, b) => a.sessionOn.localeCompare(b.sessionOn));
dire(`${toutes.length} seances congolaises · ${sans.length} sans echeance\n`);

const compte = { parLeCode: 0, parLaSeance: 0, parLeTexte: 0, rien: 0 };
dire(`   ${"seance".padEnd(11)} ${"i".padEnd(4)} ${"duree".padEnd(12)} ${"code".padEnd(14)}  ou se trouve l echeance`);
for (const r of sans) {
  /* 1. L avis portant LE MEME CODE : la preuve la plus forte. */
  const parCode = r.codeEmission ? avis.find((a) => a.code_emission === r.codeEmission && a.maturity_on) : undefined;
  /* 2. A defaut, l avis de la MEME SEANCE et de la meme duree. */
  const parSeance = avis.find((a) => a.country === "Congo" && a.session_on === r.sessionOn && String(a.tenor) === String(r.tenor) && a.maturity_on);

  let ou = null;
  if (parCode) {
    compte.parLeCode += 1;
    ou = `l'avis du même code → ${parCode.maturity_on}`;
  } else if (parSeance) {
    compte.parLaSeance += 1;
    ou = `l'avis de la même séance et durée → ${parSeance.maturity_on}`;
  } else if (r.fileKey) {
    /* 3. La couche de texte du communique, quand il en a une. */
    try {
      const t = (await texteDe(await readSource(r.fileKey))).replace(/\s+/g, " ");
      if (t.replace(/\s/g, "").length >= 200) {
        const m = t.match(/[ée]ch[ée]ance[^0-9]{0,20}(\d{1,2}[-\s.][A-Za-zéû]{3,10}[-\s.]\d{2,4})/i);
        if (m) {
          compte.parLeTexte += 1;
          ou = `la couche de texte → « ${m[1]} »`;
        }
      }
    } catch {
      /* illisible : on tombera dans « rien » */
    }
  }
  if (!ou) {
    compte.rien += 1;
    ou = "aucune source gratuite";
  }
  dire(`   ${r.sessionOn}  ${String(r.instrument).padEnd(4)} ${String(r.tenor).padEnd(12)} ${String(r.codeEmission ?? "—").padEnd(14)}  ${ou}`);
}

dire(`\n=== CE QUE LES SOURCES GRATUITES RENDRAIENT ===`);
dire(`   ${String(compte.parLeCode).padStart(3)} par l avis portant le meme code`);
dire(`   ${String(compte.parLaSeance).padStart(3)} par l avis de la meme seance et de la meme duree`);
dire(`   ${String(compte.parLeTexte).padStart(3)} par la couche de texte du communique`);
dire(`   ${String(compte.rien).padStart(3)} sans aucune source gratuite`);
dire(`\n   ${compte.parLeCode + compte.parLaSeance + compte.parLeTexte} sur ${sans.length} se recuperent sans un seul appel au modele.`);
