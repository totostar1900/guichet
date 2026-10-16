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

const { VERSION_DU_LECTEUR: VERSION, lecteursARelire, relectureUtile } = await import("../src/lib/market/lecteur-version.ts");
const { readBeacDoc } = await import("../src/lib/market/beac.ts");

/** Les versions des bulletins, qu'aucun compte filtré ne peut rendre. */
async function lignes_market_bulletins() {
  const { data, error } = await sb.from("market_bulletins").select("reader_version").limit(2000);
  if (error) throw new Error(`market_bulletins : ${error.message}`);
  return data ?? [];
}

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

/**
 * Toutes les rangées d'une table, par tranches.
 *
 * Supabase rend mille lignes et se tait. Un contrôle qui lit une table de
 * 2 311 observations sans pagination mesure les mille premières et annonce
 * un résultat : c'est la panne muette appliquée à l'instrument de mesure.
 */
async function toutes(table, colonnes) {
  const out = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await sb.from(table).select(colonnes).range(de, de + 999);
    if (error) throw new Error(`${table} : ${error.message}`);
    out.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) return out;
  }
}

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
    /* LA MÊME FAUTE QUE CE MATIN, UN CRAN PLUS LOIN. Ce contrôle comparait
       au numéro COURANT du lecteur, qui couvre trois lecteurs. La v15 ne
       touche que les VL : les 16 867 lignes d'encours estampillées v14 sont
       parfaitement à jour, et le point passait au rouge pour une montée qui
       ne les concerne pas. On demande donc à `relectureUtile` si le lecteur
       D'ENCOURS a bougé, et à lui seul. */
    /**
     * ET IL PROMETTAIT UNE MESURE EN RENDANT UNE DÉCLARATION, troisième du
     * même genre le 16 octobre 2026.
     *
     * Son attendu dit « ferait GAGNER » ; son code disait « porte une
     * estampille antérieure ». Ce n'est pas la même phrase.
     * `TOUCHE_PAR_VERSION` dit quel LECTEUR une version a touché, jamais
     * quelles SÉANCES : la v18 ne change que les bulletins à sous-tableaux.
     * Le point a donc annoncé 6 826 lignes à relire, et la passe lancée pour
     * lui obéir a relu 188 séances sans gagner ni perdre une seule ligne.
     *
     * Une estampille ancienne reste un signal, mais elle n'est plus une
     * condamnation : si une relecture a été MESURÉE pour cette version et
     * n'a rien rendu, le point tient et dit la date de la mesure. Reste
     * rouge le cas où personne n'a mesuré, qui est le seul où l'on ne sait
     * pas. Un échantillon ne vaut pas une passe complète, et le mot est
     * écrit dans la mesure.
     */
    attendu: "aucune ligne qu'une relecture de l'encours ferait gagner, mesuré et non supposé",
    async mesurer() {
      const { data, error } = await sb.from("debt_outstandings").select("reader_version").order("reader_version").limit(1);
      if (error) throw new Error(`debt_outstandings : ${error.message}`);
      const plusVieille = data?.[0]?.reader_version ?? undefined;
      if (!relectureUtile(plusVieille, "encours")) return { mesure: `toutes à jour (plus ancienne : v${plusVieille ?? "?"})`, tient: true };

      const vieilles = await compter("debt_outstandings", (q) => q.lt("reader_version", VERSION));
      const { data: m } = await sb
        .from("relectures_mesurees")
        .select("mesure_le, portee, seances_testees, seances_changees, lignes_gagnees, lignes_perdues")
        .eq("lecteur", "encours")
        .eq("version", VERSION)
        .maybeSingle();

      if (!m) return { mesure: `${vieilles} ligne(s) estampillée(s) d'avant la v${VERSION}, et personne n'a mesuré ce qu'une relecture rendrait`, tient: false };

      const rendu = (m.lignes_gagnees ?? 0) + (m.lignes_perdues ?? 0) + (m.seances_changees ?? 0);
      const quand = String(m.mesure_le).slice(0, 10);
      if (rendu === 0) {
        return {
          mesure: `${vieilles} ligne(s) d'avant la v${VERSION}, mais la relecture a été mesurée le ${quand} sur ${m.seances_testees} séance(s) (${m.portee}) : gain nul`,
          tient: true,
        };
      }
      return {
        mesure: `${m.seances_changees} séance(s) changeraient, +${m.lignes_gagnees} / -${m.lignes_perdues} ligne(s), mesuré le ${quand}`,
        tient: false,
      };
    },
  },
  {
    lot: "2",
    point: "Complétude de la série d'encours",
    /**
     * UNE LIGNE ABSENTE ENTRE DEUX PRÉSENCES EST UN TROU, PAS UN
     * REMBOURSEMENT. Mesuré le 14 octobre 2026 : 1 547 lignes manquent sur
     * 18 493 attendues, huit pour cent, sur 547 séances des 808, et aucune
     * ne le disait. Un encours est un stock : la ligne absente fait baisser
     * le total, et la baisse se lit comme un amortissement. Toute étude
     * d'évolution, qui est l'objet de cette table, en serait faussée.
     *
     * Le garde est posé à l'ingestion depuis ce jour ; ce contrôle mesure
     * l'ARRIÉRÉ, qui ne se referme que par relecture.
     */
    attendu: "aucune ligne attendue et absente",
    async mesurer() {
      /* LE CLIENT PLAFONNE À MILLE LIGNES, EN SILENCE. Sans pagination ce
         contrôle lisait 1 934 lignes attendues au lieu de 18 493 et annonçait
         48 % de trous : une mesure fausse sur un garde de complétude, ce qui
         est à peu près le pire endroit. On pagine, et on vérifie le compte. */
      const lignes = [];
      for (let de = 0; ; de += 1000) {
        const { data, error } = await sb.from("debt_outstandings").select("isin, session_date").order("session_date").order("isin").range(de, de + 999);
        if (error) throw new Error(`debt_outstandings : ${error.message}`);
        lignes.push(...(data ?? []));
        if ((data ?? []).length < 1000) break;
      }
      const total = await compter("debt_outstandings");
      if (lignes.length !== total) throw new Error(`pagination incomplète : ${lignes.length} lues pour ${total} en base`);
      const seances = [...new Set(lignes.map((l) => l.session_date))].sort();
      const presentes = new Set(lignes.map((l) => `${l.isin}|${l.session_date}`));
      const bornes = new Map();
      for (const l of lignes) {
        const b = bornes.get(l.isin) ?? { d1: l.session_date, d2: l.session_date };
        if (l.session_date < b.d1) b.d1 = l.session_date;
        if (l.session_date > b.d2) b.d2 = l.session_date;
        bornes.set(l.isin, b);
      }
      let manquantes = 0;
      let attendues = 0;
      const seancesTrouees = new Set();
      for (const [isin, b] of bornes) {
        for (const s of seances) {
          if (s < b.d1 || s > b.d2) continue;
          attendues++;
          if (!presentes.has(`${isin}|${s}`)) {
            manquantes++;
            seancesTrouees.add(s);
          }
        }
      }
      const pct = attendues ? (manquantes / attendues) * 100 : 0;
      return {
        mesure: manquantes ? `${manquantes} sur ${attendues} (${pct.toFixed(1)} %) · ${seancesTrouees.size} séance(s) trouée(s)` : "série complète",
        tient: manquantes === 0,
      };
    },
  },
  {
    lot: "3",
    point: "Séances de résultats déposées",
    /**
     * CE CONTRÔLE COMPTAIT 249 ET EN ATTENDAIT 950, un seuil que j'avais
     * écrit en croyant que la BEAC publiait mille communiqués de résultats.
     * Elle en publie environ cinq cents, et mille est le journal ENTIER :
     * annonces, résultats, calendriers et tableaux de bord confondus. Le
     * point serait resté rouge à jamais sur une collecte presque finie, et
     * un rouge qui ne peut pas devenir vert apprend à ne plus regarder le
     * panneau.
     *
     * LE DÉNOMINATEUR NE SE DEVINE PLUS, IL SE LIT. La source dit elle-même
     * combien de séances elle annonce : on compte les couples (pays, séance)
     * portés par ses communiqués de résultats, et on regarde lesquels
     * n'ont pas de ligne chez nous. Une traduction et son original tombent
     * sur le même couple, donc ne comptent qu'une fois.
     *
     * ET LE GENRE RANGÉ EN BASE NE FAIT PAS FOI. Le 16 octobre 2026, cent
     * pièces espagnoles portaient encore le genre « autre » alors que le
     * lecteur courant les appelle des résultats depuis c21e39e : la
     * grammaire avait été écrite, les pièces jamais repassées. Un contrôle
     * qui avait interrogé la colonne n'aurait rien vu. On fait donc relire
     * chaque titre par le lecteur D'AUJOURD'HUI, ce qui rend ce point
     * sensible au retard d'une relecture autant qu'à celui d'un dépôt.
     */
    attendu: "aucune séance annoncée par le journal qui ne soit déposée",
    async mesurer() {
      const vues = await toutes("beac_observations", "url, titre, pays, seance, instrument");
      const seances = await toutes("auction_results", "country, session_on, instrument");
      /**
       * DEUX MAILLES, PARCE QU'UN JOUR PORTE PARFOIS DEUX LIGNES. Le
       * 29 septembre 2021 le Cameroun a servi un OTA à 5 ans ET un BTA à
       * 26 semaines : au grain (pays, séance) la seconde pièce se cache
       * derrière la première, et le contrôle a annoncé « 182 sur 183 » le
       * jour où quarante-trois communiqués n'avaient jamais rendu un
       * chiffre. On descend donc d'un cran quand la pièce dit son
       * instrument, et on retombe sur le couple quand elle se tait.
       *
       * CE N'EST PAS ENCORE LE BON GRAIN. Celui de la migration 0108 est
       * (pays, séance, CODE), et le code ne se connaît qu'après lecture de
       * la pièce. Tant qu'aucune table ne dit quelle pièce a produit quelle
       * ligne, ce contrôle reste une borne basse : deux BTA le même jour se
       * cachent encore l'un l'autre.
       */
      const deposees = new Set(seances.map((s) => `${s.country}|${s.session_on}`));
      const deposeesFines = new Set(seances.map((s) => `${s.country}|${s.session_on}|${s.instrument}`));

      const attendues = new Set();
      const grosses = new Set();
      let muettes = 0;
      for (const v of vues) {
        const lu = readBeacDoc({ url: v.url ?? "", title: v.titre ?? "", country: v.pays ?? "", year: "" });
        if (lu.kind !== "resultats") continue;
        /* LE TITRE FAIT FOI, PAS LA COLONNE. Règle posée en c21e39e, après onze
           avis d'émission rangés sous le mauvais Trésor. La colonne garde
           l'attribution d'avant la règle : la préférer ici fabriquait cinq
           séances fantômes dans un pays qui ne les a pas tenues. */
        const pays = lu.country ?? v.pays;
        const le = v.seance ?? lu.on;
        /* Une pièce dont on ne sait dire ni le pays ni la date ne peut pas
           être rapprochée : elle se compte à part plutôt que de disparaître
           dans un total qui aurait l'air propre. */
        if (!pays || !le) { muettes += 1; continue; }
        const jour = `${pays}|${String(le).slice(0, 10)}`;
        const quoi = v.instrument ?? lu.instrument;
        if (quoi) attendues.add(`${jour}|${quoi}`);
        else grosses.add(jour);
      }

      /**
       * UNE JOURNÉE SANS AUCUNE LIGNE EST CERTAINEMENT MANQUANTE. Un
       * instrument annoncé sans ligne ne l'est PAS : le journal tire son
       * instrument du titre, et le titre se trompe. Mesuré le 16 octobre
       * 2026 sur les deux seules « lignes à déposer » que ce contrôle
       * affichait, et les deux étaient des fantômes :
       *
       *   le « BTA 26 semaines » gabonais du 16 avril 2025 est un OTA 2 ans
       *   servi à zéro, code GA2A00000209, deja en table ;
       *   le « BTA » centrafricain du 5 mai 2021 est un OTA 3 ans,
       *   code CF2J00000026, deja en table.
       *
       * Le rouge va donc a ce qui est certain, et les deux signaux faibles
       * se DISENT sans tenir la barriere : un contrôle qui crie sur ce qu'il
       * ne peut pas distinguer apprend a ne plus etre lu. La campagne, elle,
       * continue de chercher au grain fin, parce qu'elle OUVRE la piece :
       * c'est la seule autorite sur l'instrument.
       */
      const douteuses = [...attendues].filter((c) => !deposeesFines.has(c)).length;
      const perdues = [...grosses].filter((c) => !deposees.has(c)).length
        + [...attendues].filter((c) => !deposees.has(c.split("|").slice(0, 2).join("|"))).length;
      const annoncees = attendues.size + grosses.size;
      const reserves = [
        perdues ? `${perdues} journée(s) sans aucune ligne` : "",
        douteuses ? `${douteuses} instrument(s) annoncé(s) sans ligne, à ouvrir` : "",
        muettes ? `${muettes} pièce(s) sans pays ni date` : "",
      ].filter(Boolean);
      const dit = `${annoncees} annoncée(s)` + (reserves.length ? ` · ${reserves.join(" · ")}` : " · rien en attente");
      return { mesure: dit, tient: perdues === 0 };
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
    point: "Échéance d'une adjudication, récupérable",
    /**
     * CE CONTRÔLE EXIGEAIT UNE ÉCHÉANCE IMPRIMÉE et comptait 44 lignes
     * « manquantes ». Elles ne manquent pas : la durée annoncée est présente
     * sur les 259 lignes sans exception, et `vieRestante` en déduit la vie
     * restante EN NOMMANT SON ORIGINE, « échéance » ou « durée annoncée ».
     * Une donnée déduite qui dit qu'elle est déduite n'est pas une donnée
     * absente, et la compter comme telle masquait le seul cas qui l'est
     * vraiment.
     *
     * CE CAS EST L'ABONDEMENT. Le Trésor gabonais rouvre un bon à treize
     * semaines : le 22 juillet 2026, deux de ses quatre lignes arrivaient à
     * terme vingt-trois et trente-sept jours plus tard. L'étiquette nomme la
     * ligne rouverte, elle ne dit pas la date. Pour un abondement, et pour
     * lui seul, la durée annoncée ne remplace pas l'échéance imprimée.
     *
     * Le point reste donc dans le lot 3 et garde des dents, mais elles
     * mordent là où quelque chose est réellement perdu.
     */
    attendu: "aucune ligne dont l'échéance ne puisse être ni lue ni déduite",
    async mesurer() {
      const tout = await compter("auction_results");
      const deduites = await compter("auction_results", (q) => q.is("maturity_on", null));
      const sansDuree = await compter("auction_results", (q) => q.is("maturity_on", null).or("tenor.is.null,tenor.eq."));
      const abondements = await compter("auction_results", (q) => q.is("maturity_on", null).eq("abondement", true));
      const perdues = sansDuree + abondements;
      const dit = perdues
        ? `${perdues} irrécupérable(s) : ${abondements} abondement(s), ${sansDuree} sans durée`
        : `${deduites} déduite(s) de la durée annoncée sur ${tout}, aucune perdue`;
      return { mesure: dit, tient: perdues === 0 };
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
    point: "Relecture qui rendrait quelque chose",
    /* LA FAUSSE PRÉMISSE QUE CE CONTRÔLE PORTAIT. Il disait « aucun bulletin
       en version antérieure, AVANT TOUT ENVOI AU FOURNISSEUR », ce qui a
       justifié deux heures et demie de relecture inutile le 13 octobre 2026.
       Un seul numéro couvre trois lecteurs : être en v12 ne veut pas dire que
       les remarques ont vieilli, et ici elles n'avaient pas bougé. La bonne
       question est par lecteur, et le rapport n'attend rien de tout cela. */
    attendu: "aucune séance dont les cotations ou les VL auraient à gagner",
    async mesurer() {
      const bulletins = await lignes_market_bulletins();
      /* L'ENCOURS EST ÉCARTÉ D'ICI, ET CE N'EST PAS UNE COMMODITÉ. Il porte
         son propre tampon dans sa propre table, que le contrôle du lot 2
         interroge directement ; le tampon du BULLETIN ne sait rien de ce que
         son écrivain a fait. Lui poser la question ici rendrait ce point
         rouge pour 787 séances dont l'encours est à jour depuis des heures,
         et c'est exactement le faux signal qui a coûté la relecture. */
      const par = {};
      for (const b of bulletins) {
        for (const l of lecteursARelire(b.reader_version ?? undefined)) {
          if (l !== "encours") par[l] = (par[l] ?? 0) + 1;
        }
      }
      const total = Object.values(par).reduce((a, n) => a + n, 0);
      const detail = Object.entries(par).map(([l, n]) => `${n} ${l}`).join(", ");
      return { mesure: total ? detail : "rien à relire : cotations et VL à jour sur les 813", tient: total === 0 };
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
