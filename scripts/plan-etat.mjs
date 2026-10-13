/**
 * L'ÉTAT DU PLAN DETTE, MESURÉ PLUTÔT QUE DÉCLARÉ.
 *
 * POURQUOI. L'avancement du plan vivait dans la conversation. À chaque
 * compaction il fallait le reconstituer en fouillant le transcript, et deux
 * fois le 13 octobre 2026 j'ai annoncé un lot « fait » qui ne l'était pas :
 * un commit étiqueté « lot 4 » n'en faisait aucun des quatre points, et une
 * horloge que je croyais arrêtée était simplement quotidienne.
 *
 * UN ÉTAT ÉCRIT À LA MAIN VIEILLIT ET MENT SANS BRUIT, c'est la leçon de la
 * documentation exacte. Celui-ci se recalcule : chaque ligne du plan porte
 * une mesure et le seuil qui la juge, et le script réécrit le bloc du
 * document. Personne ne met l'état à jour, on le regénère.
 *
 *   npx tsx --conditions=react-server scripts/plan-etat.mjs [--ecrire]
 *
 * Sans --ecrire il se contente d'afficher. Avec, il remplace le bloc borné
 * par les deux marqueurs dans docs/plan-dette.md.
 */
import fs from "node:fs";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const dire = (s) => fs.writeSync(1, `${s}\n`);

const { VERSION_DU_LECTEUR: VERSION } = await import("../src/lib/market/lecteur-version.ts");

const DOC ="C:/dev/guichet/docs/plan-dette.md";
const DEBUT = "<!-- etat:debut -->";
const FIN = "<!-- etat:fin -->";

/** Combien de rangées répondent au filtre, sans en rapporter une seule. */
async function compter(table, filtrer = (q) => q) {
  const { count, error } = await filtrer(sb.from(table).select("*", { count: "exact", head: true }));
  if (error) throw new Error(`${table} : ${error.message}`);
  return count ?? 0;
}

/** La dernière valeur d'une colonne de date, ou undefined si la table est vide. */
async function derniere(table, colonne) {
  const { data, error } = await sb.from(table).select(colonne).order(colonne, { ascending: false }).limit(1);
  if (error) throw new Error(`${table} : ${error.message}`);
  return data?.[0]?.[colonne];
}

const jours = (iso) => (iso ? Math.floor((Date.now() - Date.parse(iso)) / 86400000) : undefined);

/** Un fichier existe-t-il, et porte-t-il ce texte ? */
const fichierPorte = (chemin, texte) => {
  try {
    return fs.readFileSync(`C:/dev/guichet/${chemin}`, "utf8").includes(texte);
  } catch {
    return false;
  }
};

/**
 * Chaque contrôle rend une mesure, un attendu lisible, et le verdict.
 * Le verdict est la seule chose que lit un coup d'œil ; la mesure est ce
 * qui permet de le contester.
 */
const CONTROLES = [
  {
    lot: "0",
    point: "Cotations d'action sans capitalisation",
    attendu: "au plus 300",
    async mesurer() {
      const sans = await compter("quotes", (q) => q.eq("instrument", "action").is("market_cap_total", null));
      const tout = await compter("quotes", (q) => q.eq("instrument", "action"));
      return { mesure: `${sans} sur ${tout}`, tient: sans <= 300 };
    },
  },
  {
    lot: "1",
    point: "Observations du calendrier BEAC",
    attendu: "la table est alimentée",
    async mesurer() {
      const n = await compter("beac_observations");
      return { mesure: `${n} lignes`, tient: n > 0 };
    },
  },
  {
    lot: "1",
    point: "Fraîcheur du balayage BEAC",
    attendu: "au plus 2 jours (cadence quotidienne, 9 h UTC)",
    async mesurer() {
      const vu = await derniere("beac_observations", "vu_le");
      const j = jours(vu);
      return { mesure: vu ? `vu il y a ${j} jour(s), le ${vu.slice(0, 10)}` : "jamais", tient: j !== undefined && j <= 2 };
    },
  },
  {
    lot: "2",
    point: "Encours de la dette écrits",
    attendu: "plus de 16 000 lignes",
    async mesurer() {
      const n = await compter("debt_outstandings");
      return { mesure: `${n} lignes`, tient: n > 16000 };
    },
  },
  {
    lot: "2",
    point: "Encours relus par le lecteur courant",
    attendu: "aucune ligne en version antérieure",
    async mesurer() {
      const vieilles = await compter("debt_outstandings", (q) => q.lt("reader_version", VERSION));
      return { mesure: `${vieilles} ligne(s) avant la v${VERSION}`, tient: vieilles === 0 };
    },
  },
  {
    lot: "3",
    point: "Adjudications ramassées",
    attendu: "au moins 950 (la liste BEAC en annonce environ 1 000)",
    async mesurer() {
      const n = await compter("auction_results");
      return { mesure: `${n}`, tient: n >= 950 };
    },
  },
  {
    lot: "4",
    point: "Cliquet d'échelle sur les adjudications",
    attendu: "le test existe",
    async mesurer() {
      const existe = fs.existsSync("C:/dev/guichet/src/test/echelle-adjudication.test.ts");
      return { mesure: existe ? "écrit" : "absent", tient: existe };
    },
  },
  {
    lot: "4",
    point: "Ligne tchadienne du 24 janvier 2024",
    attendu: "corrigée ou écartée avec son motif",
    async mesurer() {
      const restantes = await compter("auction_results", (q) =>
        q.eq("session_on", "2024-01-24").gt("announced", 1e12).is("set_aside_reason", null),
      );
      return { mesure: restantes ? `${restantes} ligne(s) à 30 000 Mds, non écartée(s)` : "traitée", tient: restantes === 0 };
    },
  },
  {
    lot: "4",
    point: "Point de Santé sur l'échéance manquante",
    /* LE LOT 4 DEMANDE LE POINT, PAS LA COMPLÉTUDE. Les confondre rendait ce
       contrôle rouge pour une raison qui appartient au lot 3, et un lot ne se
       juge pas sur le critère d'un autre. */
    attendu: "le point existe et dit où agir",
    async mesurer() {
      const pose = fichierPorte("src/lib/health.ts", '"echeance-adjudications"') && fichierPorte("src/lib/health-how.ts", '"echeance-adjudications"');
      return { mesure: pose ? "posé" : "absent", tient: pose };
    },
  },
  {
    lot: "3",
    point: "Date d'échéance des adjudications",
    /* Critère d'acceptation du lot 3, et non un détail : sans échéance, ni le
       mur des échéances ni le taux de rollover ne se calculent. */
    attendu: "aucune manquante",
    async mesurer() {
      const sans = await compter("auction_results", (q) => q.is("maturity_on", null));
      const tout = await compter("auction_results");
      return { mesure: `${sans} manquante(s) sur ${tout}`, tient: sans === 0 };
    },
  },
  {
    lot: "4",
    point: "Libellé du bloc Programme du desk",
    attendu: "ne dit plus « Exécution » pour servi sur annoncé",
    async mesurer() {
      const ment = fichierPorte("src/app/desk/analyses/page.tsx", 't("Exécution")');
      return { mesure: ment ? "dit encore « Exécution »" : "renommé", tient: !ment };
    },
  },
  {
    lot: "rapport",
    point: "Bulletins relus par le lecteur courant",
    attendu: "aucun en version antérieure, avant tout envoi au fournisseur",
    async mesurer() {
      const vieux = await compter("market_bulletins", (q) => q.lt("reader_version", VERSION));
      const tout = await compter("market_bulletins");
      return { mesure: `${vieux} sur ${tout} avant la v${VERSION}`, tient: vieux === 0 };
    },
  },
];

const lignes = [];
for (const c of CONTROLES) {
  let r;
  try {
    r = await c.mesurer();
  } catch (e) {
    r = { mesure: `lecture impossible : ${e.message}`, tient: false };
  }
  lignes.push({ ...c, ...r });
  dire(`${r.tient ? "ok  " : "NON "} lot ${c.lot.padEnd(7)} ${c.point.padEnd(44)} ${r.mesure}`);
}

const tenus = lignes.filter((l) => l.tient).length;
dire("");
dire(`${tenus} contrôles tenus sur ${lignes.length} · lecteur v${VERSION} · ${new Date().toISOString().slice(0, 10)}`);

if (!process.argv.includes("--ecrire")) {
  dire("");
  dire("(--ecrire pour reporter ce tableau dans docs/plan-dette.md)");
  process.exit(0);
}

const tableau = [
  `*Mesuré le ${new Date().toISOString().slice(0, 10)} par \`scripts/plan-etat.mjs\`, lecteur v${VERSION}. Ne pas modifier à la main.*`,
  "",
  "| | lot | point | mesure | attendu |",
  "|---|---|---|---|---|",
  ...lignes.map((l) => `| ${l.tient ? "oui" : "**non**"} | ${l.lot} | ${l.point} | ${l.mesure} | ${l.attendu} |`),
  "",
  `**${tenus} contrôles tenus sur ${lignes.length}.**`,
].join("\n");

const doc = fs.readFileSync(DOC, "utf8");
const i = doc.indexOf(DEBUT);
const j = doc.indexOf(FIN);
if (i < 0 || j < 0) {
  dire(`Marqueurs ${DEBUT} / ${FIN} introuvables dans ${DOC} : rien écrit.`);
  process.exit(1);
}
fs.writeFileSync(DOC, `${doc.slice(0, i + DEBUT.length)}\n\n${tableau}\n\n${doc.slice(j)}`, "utf8");
dire(`docs/plan-dette.md mis à jour.`);
