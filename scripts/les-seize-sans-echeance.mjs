/**
 * LES SEIZE SEANCES POSEES PAR LEUR ETIQUETTE.
 *
 * Faute d echeance, « vieRestante » retombe sur la duree annoncee et le
 * declare. POUR UNE LIGNE NEUVE CELA NE COUTE RIEN : l echeance VAUT le
 * reglement plus la duree, et l etiquette dit donc la verite. Le defaut
 * n existe que pour un ABONDEMENT, dont le reliquat n a rien a voir avec
 * l etiquette : c est ainsi qu une gabonaise « 4 ans » a servi de
 * reference a 16,85 % alors qu il lui restait un an et demi.
 *
 * LA VRAIE QUESTION N EST DONC PAS « QUELLE ECHEANCE » MAIS « EST-CE UN
 * ABONDEMENT ». Et elle se pose avant de depenser : si les seize sont des
 * lignes neuves, il n y a rien a reparer, seulement a le dire.
 *
 * Quatre temoins gratuits, dans l ordre de la preuve :
 *   l avis d emission du MEME CODE, qui porte une echeance ;
 *   le titre de la piece ou de l avis, qui dit parfois « abondement » ;
 *   la couche de texte du communique ;
 *   le MEME CODE sur une AUTRE seance, qui prouve l abondement a lui seul,
 *   une ligne adjugee deux fois etant abondee la seconde.
 *
 *   npx tsx --conditions=react-server scripts/les-seize-sans-echeance.mjs
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
  const { data, error } = await sb.from("emission_notices").select("country,session_on,instrument,tenor,code_emission,maturity_on,source_title").range(de, de + 999);
  if (error) throw new Error(error.message);
  avis.push(...(data ?? []));
  if ((data?.length ?? 0) < 1000) break;
}
const toutes = (await repo().listAuctionResults({ limit: 2000 })).filter((r) => !r.setAsideAt);
const sans = toutes.filter((r) => !r.maturityOn).sort((a, b) => a.sessionOn.localeCompare(b.sessionOn));
dire(`${sans.length} seance(s) sans echeance\n`);

const compte = { avis: 0, abondement: 0, texte: 0, deuxFois: 0, rien: 0 };
for (const r of sans) {
  dire(`   ${r.sessionOn} ${String(r.country).padEnd(10)} ${String(r.instrument).padEnd(4)} ${String(r.tenor).padEnd(12)} ${String(r.codeEmission ?? "—").padEnd(14)}`);

  const a = r.codeEmission ? avis.find((x) => x.code_emission === r.codeEmission && x.maturity_on) : undefined;
  if (a) {
    compte.avis += 1;
    dire(`      L AVIS DU MEME CODE porte ${a.maturity_on} · ${String(a.source_title).slice(0, 60)}`);
    continue;
  }

  /* Le meme code sur une autre seance : la seconde est forcement un
     abondement, et son echeance est celle de la premiere. */
  const soeurs = r.codeEmission ? toutes.filter((x) => x.codeEmission === r.codeEmission && x.id !== r.id) : [];
  if (soeurs.length) {
    compte.deuxFois += 1;
    dire(`      MEME CODE sur ${soeurs.length} autre(s) seance(s) : ${soeurs.map((s) => `${s.sessionOn} (echeance ${s.maturityOn ?? "absente"})`).join(", ")}`);
    continue;
  }

  const ditAbondement = /abondement/i.test(String(r.sourceTitle));
  if (ditAbondement) {
    compte.abondement += 1;
    dire(`      le TITRE dit abondement : son reliquat ne suit pas son etiquette`);
  }

  if (r.fileKey) {
    try {
      const t = (await texteDe(await readSource(r.fileKey))).replace(/\s+/g, " ");
      if (t.replace(/\s/g, "").length >= 200) {
        compte.texte += 1;
        const m = t.match(/(\d{1,2}[-\s.]?[A-Za-zéèûÉ]{3,10}[-\s.]?\d{4})/g);
        dire(`      COUCHE DE TEXTE lisible · dates vues : ${(m ?? []).slice(0, 6).join(" · ") || "aucune"}`);
        continue;
      }
    } catch {
      /* illisible */
    }
  }
  if (!ditAbondement) {
    compte.rien += 1;
    dire(`      scan muet, aucun temoin · ligne neuve presumee, l etiquette dit alors la verite`);
  }
}

dire(`\n=== ${compte.avis} par l avis · ${compte.deuxFois} par un meme code ailleurs · ${compte.texte} avec du texte · ${compte.abondement} dits abondement · ${compte.rien} sans rien ===`);
dire(`\n   Une ligne neuve sans echeance ne coute rien : l etiquette dit la verite.`);
dire(`   Le defaut n existe que pour un abondement, et seuls ces cas-la valent une depense.`);
