/**
 * LE TCHAD DU 9 DECEMBRE 2020 : UN CHIFFRE, ET C EST LE SIEN.
 *
 * Sa couverture ne tombait ni sur le carnet ni sur le servi, seule de
 * deux cent quarante-quatre. La piece porte une couche de texte, et elle
 * imprime exactement ce que nous avons lu : annonce 6 035, soumissions
 * 8 400, servi 6 035, couverture 137,19 %.
 *
 * Or 8 400 / 6 035 fait 139,19 %. L ecart est de DEUX POINTS TOUT RONDS,
 * la signature d un chiffre pour un autre : le neuf imprime en sept. Notre
 * lecture est donc fidele au caractere pres, et c est l arithmetique du
 * Tresor qui se trompe.
 *
 * ON NE CORRIGE PAS. Le taux de couverture est ce que la piece publie et
 * reste opposable ; le remplacer par notre calcul effacerait la seule
 * chose interessante, a savoir que le Tresor s est trompe. On ecrit.
 *
 *   npx tsx --conditions=react-server scripts/noter-couverture-tchad-2020.mjs [--ecrire]
 */
import fs from "node:fs";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { repo } = await import("../src/lib/data/index.ts");
const dire = (s) => fs.writeSync(1, `${s}\n`);
const ecrire = process.argv.includes("--ecrire");

const r = (await repo().listAuctionResults({ limit: 2000 })).find((x) => x.country === "Tchad" && x.sessionOn === "2020-12-09" && x.instrument === "BTA");
if (!r) {
  dire("seance introuvable");
  process.exit(1);
}

/* ON VERIFIE LA SIGNATURE AVANT D ECRIRE : deux points tout ronds entre le
   rapport imprime et le rapport calcule. Une autre valeur serait une autre
   histoire, et la note ne la raconterait pas. */
const calcule = (Number(r.bid) / Number(r.announced)) * 100;
const ecart = calcule - Number(r.coverage);
dire(`   imprime ${r.coverage} % · calcule ${calcule.toFixed(2)} % · ecart ${ecart.toFixed(2)} point`);
if (Math.abs(ecart - 2) > 0.02) {
  dire(`   l ecart ne vaut pas deux points tout ronds : NON COMPRIS, on ne touche a rien.`);
  process.exit(1);
}
if (r.correction?.includes("neuf imprimé en sept")) {
  dire(`   deja notee.`);
  process.exit(0);
}

const note =
  `Le taux de couverture publié est faux d'un chiffre, et notre lecture lui est fidèle. ` +
  `La pièce imprime un montant annoncé de 6 035 millions, des soumissions de 8 400 millions, un montant servi de 6 035 millions et un taux de couverture de 137,19 %. ` +
  `Or 8 400 / 6 035 fait 139,19 % : l'écart vaut deux points tout ronds, la signature d'un chiffre pris pour un autre, le neuf imprimé en sept. ` +
  `Vérifié sur la couche de texte du communiqué, qui porte bien ces quatre nombres. ` +
  `Rien n'est modifié : le taux publié reste opposable, et le remplacer par notre calcul effacerait la seule chose à retenir, à savoir que le Trésor s'est trompé. ` +
  `C'est la seule séance sur deux cent quarante-quatre dont le taux de couverture ne tombe ni sur les soumissions ni sur le servi. Établi le 18 octobre 2026.`;

dire(`\n   ${r.codeEmission} · aucun chiffre ne bouge`);
if (!ecrire) {
  dire(`\nEssai a blanc. Relancer avec --ecrire.`);
  process.exit(0);
}
const { error } = await sb
  .from("auction_results")
  .update({ correction: r.correction ? `${r.correction}\n\n${note}` : note, updated_at: new Date().toISOString() })
  .eq("id", r.id);
dire(error ? `ERREUR : ${error.message}` : `\n=== notee, sans qu un chiffre bouge ===`);
