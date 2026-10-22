/**
 * CE POSTE PEUT-IL CONTINUER LE DEVELOPPEMENT ?
 *
 * Ecrit le 22 octobre 2026, quand la question « je change d ordinateur,
 * que dois-je faire ? » s est posee. Un depot qui se clone ne suffit
 * pas : il faut la bonne version de Node, les clefs, l acces a la base,
 * et le disque de la bibliotheque. Chacun de ces quatre manque en
 * silence, et c est pour cela qu on les MESURE au lieu de les promettre.
 *
 * TROIS VERDICTS, et un seul arrete :
 *   PRET    tout est la ;
 *   DEGRADE ca tourne, mais une fonction est coupee, et on dit laquelle ;
 *   MANQUE  on ne peut pas travailler, et on dit quoi faire.
 *
 * Aucune valeur de clef n est affichee : seulement son nom et sa
 * presence.
 *
 *   npm run poste
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const RACINE = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const dire = (s) => fs.writeSync(1, `${s}\n`);
const lignes = [];
const noter = (verdict, sujet, detail) => lignes.push({ verdict, sujet, detail });
const sh = (cmd) => { try { return execSync(cmd, { cwd: RACINE, stdio: ["ignore", "pipe", "ignore"] }).toString().trim(); } catch { return null; } };

/* ---------- 1. LES OUTILS ---------- */
const PLANCHER = (() => {
  try { return JSON.parse(fs.readFileSync(`${RACINE}/node_modules/next/package.json`, "utf8")).engines.node.replace(/[^\d.]/g, ""); } catch { return "20.9.0"; }
})();
const num = (v) => v.split(".").map(Number);
const auMoins = (a, b) => { const [x, y] = [num(a), num(b)]; for (let i = 0; i < 3; i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) > (y[i] ?? 0); return true; };
const node = process.versions.node;
noter(auMoins(node, PLANCHER) ? "PRET" : "MANQUE", `Node ${node}`, auMoins(node, PLANCHER) ? `plancher ${PLANCHER}` : `Next exige ${PLANCHER}. Installer la version du .nvmrc.`);
noter(sh("git --version") ? "PRET" : "MANQUE", "git", sh("git --version") ?? "installer git");
noter(fs.existsSync(`${RACINE}/node_modules/next`) ? "PRET" : "MANQUE", "dependances", fs.existsSync(`${RACINE}/node_modules/next`) ? `${fs.readdirSync(`${RACINE}/node_modules`).length} paquets` : "lancer « npm install »");

/* ---------- 2. LE DEPOT ---------- */
const distant = sh("git remote get-url origin");
const branche = sh("git rev-parse --abbrev-ref HEAD");
const propre = sh("git status --porcelain") === "";
const devant = sh("git rev-list --count @{u}..HEAD");
const derriere = sh("git rev-list --count HEAD..@{u}");
noter(distant ? "PRET" : "MANQUE", "dépôt distant", distant ?? "aucun « origin » : ce dossier n'est pas le clone");
noter(propre ? "PRET" : "DEGRADE", `branche ${branche}`, propre ? "arbre propre" : `${sh("git status --porcelain")?.split("\n").length} fichier(s) non commis`);
if (devant !== null) noter(devant === "0" && derriere === "0" ? "PRET" : "DEGRADE", "à jour avec origin", devant === "0" && derriere === "0" ? "synchronisé" : `${devant} en avance, ${derriere} en retard : « git pull » puis « git push »`);

/* ---------- 3. LES CLEFS ---------- */
const fichierEnv = `${RACINE}/.env.local`;
const posees = fs.existsSync(fichierEnv)
  ? new Set(fs.readFileSync(fichierEnv, "utf8").split(/\r?\n/).map((l) => l.match(/^([A-Z0-9_]+)=(.+)$/)?.[1]).filter(Boolean))
  : new Set();

const INDISPENSABLES = [
  ["NEXT_PUBLIC_SUPABASE_URL", "sans elle, l'app tourne sur les données de démonstration en mémoire"],
  ["NEXT_PUBLIC_SUPABASE_ANON_KEY", "idem"],
  ["SUPABASE_SERVICE_ROLE_KEY", "le desk et tous les scripts de mesure lisent avec elle"],
  ["AUTH_SECRET", "signe la session"],
];
const CONFORTS = [
  ["ANTHROPIC_API_KEY", "lecture automatique des communiqués coupée, saisie à la main"],
  ["BIBLIOTHEQUE_DISQUE", "le repli de lecture des bulletins est coupé : 53 scripts de reprise ne trouvent plus leurs pièces"],
  ["RESEND_API_KEY", "aucun e-mail ne part d'ici. Voulu sur un poste de travail : ces clefs vivent sur Vercel."],
  ["WHATSAPP_TOKEN", "aucun WhatsApp ne part d'ici. Voulu, même raison."],
  ["VAPID_PRIVATE_KEY", "pas de notification poussée"],
];

if (!fs.existsSync(fichierEnv)) noter("MANQUE", ".env.local", "absent. Il ne voyage pas avec git : le copier depuis l'autre poste par un canal sûr.");
else {
  const absentes = INDISPENSABLES.filter(([k]) => !posees.has(k));
  noter(absentes.length ? "MANQUE" : "PRET", ".env.local", absentes.length ? `il manque ${absentes.map(([k]) => k).join(", ")}` : `${posees.size} clefs posées`);
  for (const [k, cout] of CONFORTS) if (!posees.has(k)) noter("DEGRADE", k, cout);
}

/* ---------- 4. LA BIBLIOTHEQUE SUR CE DISQUE ---------- */
const disque = fs.existsSync(fichierEnv) ? fs.readFileSync(fichierEnv, "utf8").match(/^BIBLIOTHEQUE_DISQUE=(.+)$/m)?.[1]?.trim().replace(/^["']|["']$/g, "") : undefined;
if (disque) {
  const la = fs.existsSync(disque);
  /* Le nombre de PIECES, pas d'entrées à la racine : un dossier synchronisé mais
     vide ressemble sinon à un dossier plein. */
  const compter = (d, n = 0) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (n > 50_000) return n;
      n = e.isDirectory() ? compter(`${d}/${e.name}`, n) : n + 1;
    }
    return n;
  };
  const pieces = la ? compter(disque) : 0;
  noter(
    !la ? "MANQUE" : pieces < 100 ? "DEGRADE" : "PRET",
    "bibliothèque sur ce disque",
    !la
      ? `« ${disque} » n'existe pas ici. Chaque poste a son propre chemin : synchroniser la bibliothèque SharePoint, puis corriger BIBLIOTHEQUE_DISQUE.`
      : pieces < 100
        ? `${pieces} pièce(s) seulement : la synchronisation n'a pas fini, ou le chemin vise le mauvais dossier`
        : `${pieces} pièces`,
  );
}

/* ---------- 5. LA BASE REPOND-ELLE ---------- */
const url = fs.existsSync(fichierEnv) ? fs.readFileSync(fichierEnv, "utf8").match(/^NEXT_PUBLIC_SUPABASE_URL=(.+)$/m)?.[1]?.trim() : undefined;
const clef = fs.existsSync(fichierEnv) ? fs.readFileSync(fichierEnv, "utf8").match(/^SUPABASE_SERVICE_ROLE_KEY=(.+)$/m)?.[1]?.trim() : undefined;
if (url && clef) {
  const t0 = Date.now();
  try {
    const r = await fetch(`${url}/rest/v1/reference?select=kind&limit=1`, { headers: { apikey: clef, Authorization: `Bearer ${clef}` } });
    const ms = Date.now() - t0;
    noter(r.ok ? "PRET" : "MANQUE", "base Supabase", r.ok ? `répond en ${ms} ms` : `HTTP ${r.status} : vérifier la clé de service`);
  } catch (e) {
    noter("MANQUE", "base Supabase", `injoignable : ${e.message}`);
  }
}

/* ---------- 6. LES MIGRATIONS ---------- */
const migrations = fs.readdirSync(`${RACINE}/supabase/migrations`).filter((f) => f.endsWith(".sql")).sort();
noter("PRET", "migrations au dépôt", `${migrations.length}, la dernière est ${migrations.at(-1)}`);

/* ---------- LE RAPPORT ---------- */
const MARQUE = { PRET: "  ok  ", DEGRADE: " part ", MANQUE: "MANQUE" };
dire(`\n   CE POSTE, POUR CONTINUER GUICHET\n`);
for (const { verdict, sujet, detail } of lignes) dire(`   [${MARQUE[verdict]}]  ${sujet.padEnd(30)} ${detail}`);

const manque = lignes.filter((l) => l.verdict === "MANQUE");
const degrade = lignes.filter((l) => l.verdict === "DEGRADE");
dire(``);
if (manque.length) {
  dire(`   ${manque.length} point(s) empêchent de travailler :`);
  for (const l of manque) dire(`      ${l.sujet} : ${l.detail}`);
} else if (degrade.length) {
  dire(`   Prêt à développer. ${degrade.length} fonction(s) coupée(s), listée(s) ci-dessus.`);
} else {
  dire(`   Prêt, rien de coupé.`);
}
dire(``);
process.exit(manque.length ? 1 : 0);
