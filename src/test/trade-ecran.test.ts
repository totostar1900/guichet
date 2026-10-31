import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(__dirname, "../..");
const lire = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");
/* Le code, sans ce qu'on en dit : ces deux fichiers citent justement dans
   leurs commentaires les classes et les niveaux dont ils expliquent le
   placement, et une épreuve qui compte des occurrences compterait les
   explications avec elles. */
const code = (p: string) =>
  lire(p)
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

/**
 * L'ÉCRAN DE « TRADE », RELEVÉ LE 31 OCTOBRE 2026.
 *
 * ─── Ce que cette feuille gardait avant, et qui n'existe plus ──────────────
 *
 * Elle s'appelait « trade-parcours » et tenait un ruban de trois écrans : le
 * fil d'Ariane, les points de profondeur, le sommaire des rayons, la tête
 * posée dans le panneau de la racine. Les trois écrans sont devenus un, sur
 * décision du dirigeant, et cinq de ses clauses décrivaient alors des pièces
 * supprimées. Une clause qui garde un fichier absent ne garde rien : elle
 * tombe au chargement, ou pire, elle passe.
 *
 * ─── Ce qu'elle garde maintenant ───────────────────────────────────────────
 *
 * LES DEUX CRANS INTERMÉDIAIRES NE DOIVENT PAS REVENIR, et c'est la raison
 * qui compte plus que la règle : la fiche d'un service redisait `RAISON` et
 * `ETAPES` — la même table que le brief de sa page — et la liste d'un rayon
 * répétait des noms déjà lus. Le client traversait deux écrans pour arriver
 * là où la tuile pouvait le mener directement.
 *
 * LE « i » DOIT RESTER CLIQUABLE, et c'est le défaut le plus silencieux de
 * tout ce travail. La tuile porte deux gestes : un lien qui s'étend sur elle
 * par un calque, et un bouton qui ouvre le brief. Emboîtés, le navigateur
 * n'en clique qu'un — un bouton dans un lien est invalide en HTML. Sans
 * « z-index », le rond passe SOUS le calque : il répond encore au clavier,
 * donc rien ne tombe, et seule la souris tombe dans le trou.
 *
 * LA PRÉCONDITION DOIT RESTER DITE. Quand le compte-titres n'est pas ouvert,
 * les services du compte mènent à l'ouverture. La fiche était le seul endroit
 * qui l'écrivait ; sans elle, quatre tuiles emmèneraient ailleurs que là où
 * elles annoncent, sans un mot.
 */
describe("l'écran de Trade", () => {
  /* UN SEUL ÉCRAN, ET UN SEUL ARRANGEMENT. La page rendait deux fois le même
     contenu — un pour l'écran large, un pour le téléphone — et déclarait
     elle-même l'invariant que ça met en danger : « deux rendus d'un même
     contenu finissent toujours par diverger ». La meilleure façon de le tenir
     est de n'en avoir qu'un. */
  it("ne rend plus deux arrangements du même contenu", () => {
    const page = code("src/app/trader/page.tsx");
    for (const parti of ["<Parcours", "<Rayons", "<Fiche", "styles.large", "styles.petit"]) {
      expect(page, `« ${parti} » est revenu : la page rend de nouveau deux fois le même contenu`).not.toContain(parti);
    }
    for (const f of ["src/app/trader/Parcours.tsx", "src/app/trader/Rayons.tsx", "src/app/trader/Fiche.tsx", "src/app/trader/niveaux.ts"]) {
      expect(fs.existsSync(path.join(ROOT, f)), `« ${f} » est revenu : les crans intermédiaires avec lui`).toBe(false);
    }
    /* ET LA FICHE N'EST PAS REVENUE SOUS UN AUTRE NOM : ce qu'elle rendait,
       c'était la raison d'être et les étapes, que le brief rend déjà. */
    const tuiles = code("src/app/trader/Tuiles.tsx");
    for (const table of ["RAISON", "ETAPES"]) {
      expect(tuiles, `les tuiles lisent « ${table} » : c'est la fiche intermédiaire qui revient, et le brief la dit déjà`).not.toContain(table);
    }
  });

  /* LE « i » OUVRE LA MÊME FEUILLE QUE LA PAGE DE SERVICE, et c'est la
     demande même : « c'est pas deux pages distinctes mais bien la même
     page ». Une tuile qui se dessinerait son propre rond ouvrirait autre
     chose le jour où l'un des deux change. */
  it("ouvre le brief du service depuis la tuile, par le composant de la maison", () => {
    const tuiles = code("src/app/trader/Tuiles.tsx");
    expect(tuiles, "les tuiles n'ouvrent plus le brief : le « i » a disparu").toContain("<BriefDuService");
    expect(tuiles, "la tuile s'est dessiné son propre rond : il divergera de celui des pages de service").not.toMatch(/<svg/);
    /* UN SEUL BOUTON DANS LA FEUILLE DU BRIEF : « rond seul partout », décidé
       le 31 octobre 2026. Une seconde forme pour la même chose est ce que la
       maison refuse ailleurs. */
    const css = lire("src/components/EnBref.module.css");
    expect((css.match(/^\.bouton\s*\{/gm) ?? []).length, "« .bouton » est écrit deux fois : deux ronds pour une même feuille").toBe(1);
    expect(css.match(/\.bouton\s*\{([^}]*)\}/)![1], "le rond a repris la hauteur d'une commande : il n'est plus discret").toMatch(/border-radius:\s*50%/);
  });

  /* UN BOUTON DANS UN LIEN EST INVALIDE EN HTML, et le navigateur ne le
     clique pas. La tuile était un bouton qui poussait l'adresse ; elle mène
     maintenant à une page ET porte le « i ». Les deux doivent être FRÈRES,
     et le rond doit passer au-dessus du calque qui étend le lien — sans quoi
     il répond au clavier et pas à la souris, ce qui ne tombe nulle part. */
  it("ne met pas le « i » dans le lien de la tuile, et le pose au-dessus du calque", () => {
    const tuiles = code("src/app/trader/Tuiles.tsx");
    const lien = tuiles.indexOf("<Link");
    const ferme = tuiles.indexOf("</Link>", lien);
    expect(lien, "la tuile ne mène plus nulle part").toBeGreaterThan(0);
    expect(tuiles.slice(lien, ferme), "le « i » est emboîté dans le lien : le navigateur n'en cliquera qu'un").not.toContain("BriefDuService");
    const css = lire("src/app/trader/page.module.css");
    expect(css, "le calque qui étend le lien sur la tuile a disparu : seul le nom est cliquable").toMatch(/\.lien::after\s*\{[^}]*position:\s*absolute/);
    expect(css.match(/\.info\s*\{([^}]*)\}/)?.[1], "le rond passe sous le calque du lien : la souris ouvre la page au lieu du brief, et le clavier non").toMatch(/z-index/);
  });

  /* LA PRÉCONTION VIT SUR LA TUILE, ET SEULEMENT QUAND ELLE EXISTE. Elle
     n'était dite que sur la fiche ; la fiche partie, la tuile la porte à la
     place de sa ligne fixe. Les deux ne coexistent jamais — un service dont
     la porte est fermée n'a pas à expliquer en plus de quoi il s'agit. */
  it("dit la précondition sur la tuile quand il y en a une, à la place de la ligne fixe", () => {
    const tuiles = code("src/app/trader/Tuiles.tsx");
    expect(tuiles, "la précondition a disparu de la tuile : quatre tuiles mènent à l'ouverture sans le dire").toMatch(/sv\.porte \? t\(sv\.porte\.key/);
    expect(tuiles, "la ligne fixe a disparu de la tuile").toContain("t(sv.sous)");
  });

  /* L'INTERTITRE NE CLIQUE PAS. Le rayon ouvrait un écran ; il ne range plus
     qu'une grille. Un titre qui ressemble à un lien et n'en est pas se fait
     viser une fois par lecteur, et l'adresse « ?r=compte » qu'il portait
     n'ouvre plus rien. */
  it("range les tuiles sous deux intertitres qui ne mènent nulle part", () => {
    const tuiles = code("src/app/trader/Tuiles.tsx");
    expect(tuiles, "les rayons ne rangent plus les tuiles").toContain("RAYONS.map");
    expect(tuiles, "l'intertitre du rayon a disparu").toMatch(/<h2 className=\{styles\.rayon\}/);
    expect(tuiles, "le rayon est redevenu un endroit où l'on va").not.toMatch(/aller\(|router\.push|<Rubriques/);
    /* ET L'INDEX DU GUIDE NE PROMET PLUS DE CRAN : « /trader?r=compte »
       ouvrirait la même page en annonçant autre chose. */
    expect(lire("src/lib/guide-index.ts"), "le guide renvoie de nouveau à un cran de rayon qui n'existe plus").not.toContain("/trader?r=");
  });

  /* L'EN-TÊTE. La phrase partait en colonne 8 d'une grille de douze, soit huit
     cent vingt pixels à droite du titre qu'elle explique, sur une page dont
     tout le reste tient en une colonne. */
  it("prend son en-tête de l'étalon", () => {
    expect(lire("src/app/trader/page.tsx"), "la page a repris un en-tête à elle").toContain("<EnTete");
    expect(lire("src/app/trader/page.module.css"), "la grille de douze colonnes est revenue pour le seul en-tête").not.toMatch(/repeat\(12/);
  });

  /* LE MÊME FRANC, UNE SEULE FOIS. Trade porte en tête le disponible de la
     provision : c'est la condition de tout geste qu'on y pose. L'attente
     « disponible » nomme le même nombre à cent pixels de là, avec un autre
     verbe — « Replacer » contre « Alimenter » — et le lecteur cherche alors
     lequel des deux est le vrai.

     LES DEUX MOITIÉS VOYAGENT ENSEMBLE, et c'est tout l'objet de cette
     épreuve. Retirer la bande en laissant le « sauf » prive le client du
     chiffre ; retirer le « sauf » en laissant la bande le lui donne deux
     fois. Ni l'un ni l'autre ne se voit en lisant le diff.

     ET ELLE N'EST ÉCRITE QU'UNE FOIS. Elle l'était deux, du temps des deux
     arrangements : la page en gardait un assemblage commun, passé à l'un et
     à l'autre. Il n'y a plus qu'un écran, donc plus de raison d'assembler. */
  it("ne dit le disponible qu'une fois sur la page qui sert à agir", () => {
    const tsx = lire("src/app/trader/page.tsx");
    expect(tsx, "la bande du disponible a disparu, mais l'attente reste écartée : le chiffre n'est plus nulle part").toContain("styles.solde");
    expect(tsx, "l'attente « disponible » est revenue à côté de la bande : le même franc deux fois").toMatch(/<CeQuiVousAttend[^>]*sauf=\{\["disponible"\]\}/);
    expect((code("src/app/trader/page.tsx").match(/styles\.solde/g) ?? []).length, "la bande du disponible est écrite plus d'une fois : les deux copies divergeront").toBe(1);
  });

  /* UNE CLEF ÉCARTÉE QUI N'EXISTE PAS N'ÉCARTE RIEN, et ne le dit pas. Le
     filtre passerait, la liste serait entière, et la page afficherait de
     nouveau le doublon qu'elle croit avoir retiré. */
  it("écarte une attente que le domaine sait produire", () => {
    const corps = lire("src/lib/domain/services.ts");
    const debut = corps.indexOf("export function attentesDuClient");
    const clefs = new Set([...corps.slice(debut).matchAll(/cle:\s*"([^"]+)"/g)].map((m) => m[1]));
    const ecartees = [...lire("src/app/trader/page.tsx").matchAll(/sauf=\{\[([^\]]*)\]\}/g)].flatMap((m) => [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]));
    expect(ecartees.length, "la page n'écarte plus rien : l'épreuve au-dessus devrait déjà l'avoir dit").toBeGreaterThan(0);
    expect(ecartees.filter((c) => !clefs.has(c)), "ces clefs n'existent dans aucune attente : le filtre ne retire rien et le doublon revient").toEqual([]);
  });

  /* L'ÉCART DE L'ÉTALON, qu'une écriture en double effaçait : « .rayons »
     était défini deux fois à quatre cents lignes d'écart, 32 en haut avec sa
     justification, 20 en bas, et c'est le bas qui l'emportait. Les deux autres
     piles de plis de la maison sont à 32. */
  it("laisse l'écart de l'étalon entre ses rayons", () => {
    const css = lire("src/app/trader/page.module.css");
    const rayons = [...css.matchAll(/\.rayons\s*\{([^}]*)\}/g)];
    expect(rayons.length, "« .rayons » est de nouveau écrit deux fois : la seconde écriture gagne en silence").toBe(1);
    expect(rayons[0][1], "l'écart des rayons n'est plus celui de l'étalon").toMatch(/gap:\s*var\(--s-10\)/);
  });
});

/**
 * UNE FEUILLE NE GARDE PAS LES MESURES DE CE QUE LA PAGE A PERDU.
 *
 * Celle de Trade portait 617 lignes et 37 classes, dont 22 que plus aucun
 * fichier ne nommait : les neuf cartes de services, la carte du conseiller, le
 * rayon « Comprendre », le tableau « quand ». Une classe morte n'est pas
 * seulement du poids : elle se lit comme une description de la page, et celle
 * qu'elle décrivait n'existe plus.
 *
 * LE COMPTE ÉTAIT UN CLIQUET, il est MAINTENANT À ZÉRO. Le 24 octobre 2026 il
 * portait 95, et deux tiers de ce chiffre étaient l'angle mort du compteur
 * lui-même (voir les deux notes dans le corps). Les 56 qui restaient ont été
 * élaguées feuille par feuille : il n'y a plus de dette à étaler, donc plus de
 * raison de garder un plafond. Zéro se défend mieux qu'un nombre — un nombre
 * demande qu'on sache pourquoi il vaut celui-là.
 *
 * LES FEUILLES dont un fichier compose le nom de classe
 * (« styles[`st_${etat}`] ») restent hors du relevé : on ne peut pas savoir, de
 * l'extérieur, lesquelles de leurs classes servent.
 */
const releveDesClasses = () => {
  const tsx: string[] = [];
  const marche = (d: string, dans: string[], suffixe: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) marche(p, dans, suffixe);
      else if (e.name.endsWith(suffixe)) dans.push(p);
    }
  };
  marche(path.join(ROOT, "src"), tsx, ".tsx");

  /* LE CHEMIN DE L'IMPORT, ET NON SON NOM DE FICHIER. Troisième angle mort du
     même compteur, et le plus large : le relevé reconnaissait une feuille à son
     basename. Or « page.module.css » existe SOIXANTE-DIX-NEUF fois dans ce
     dépôt — une par route. Les soixante-dix-neuf se mélangeaient donc : une
     classe de « app/trader/page.module.css » passait pour vivante dès qu'un
     « page.module.css » quelconque la nommait, et il suffisait qu'UN SEUL de
     leurs lecteurs compose ses noms de classe pour que les soixante-dix-neuf
     sortent du relevé d'un coup. C'est ce qui s'est produit : une classe morte
     ajoutée à la main dans la feuille de Trade n'était pas vue. On résout donc
     chaque import — relatif ou sous l'alias « @/ » — jusqu'au fichier. */
  const sources = tsx.map((p) => {
    const texte = fs.readFileSync(p, "utf8");
    const feuillesLues = [...texte.matchAll(/import\s+(\w+)\s+from\s+"([^"]+\.module\.css)"/g)].map(([, local, spec]) => ({
      local,
      chemin: spec.startsWith("@/") ? path.join(ROOT, "src", spec.slice(2)) : path.resolve(path.dirname(p), spec),
    }));
    return { texte, feuillesLues };
  });

  const feuilles: string[] = [];
  marche(path.join(ROOT, "src"), feuilles, ".module.css");

  /* Les classes de la maison, celles que « globals.css » pose au premier
     niveau : « mono », « muted », « btn », « eyebrow », « empty »… */
  const maison = new Set(
    [...fs.readFileSync(path.join(ROOT, "src/app/globals.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/(?<![\w-])\.([A-Za-z][\w-]*)/g)].map((m) => m[1]),
  );

  const out: string[] = [];
  let lues = 0;
  let classes = 0;
  for (const f of feuilles) {
    /* LE CSS, ET NON CE QU'ON EN DIT. Les feuilles de cette maison
       s'expliquent, et leurs commentaires citent des classes — parfois celles
       d'une AUTRE feuille, comme « .teteBoite » cité par le sommaire des
       offres pour dire qu'il s'aligne sur elle. Deux fois ce relevé a compté
       une phrase pour une classe morte : « .mono » écrit dans la note d'un
       en-tête, et celle-là. Un commentaire n'habille rien. */
    const css = fs.readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    /* ET « :global(.x) » N'EST PAS UNE CLASSE DE LA FEUILLE. Quatrième angle
       mort : une classe échappée au module est posée par une CHAÎNE
       (« className="poignee-rail" », ou le composant d'une autre maison qui
       l'écrit), jamais par « styles.x ». Les compter mortes ferait élaguer les
       rails de poignée du desk, qui travaillent. On les tient donc vivantes
       dès qu'un fichier de « src » écrit leur nom quelque part — ce qui laisse
       encore tomber celle que plus personne n'écrit. */
    const globales = new Set([...css.matchAll(/:global\(\s*\.([A-Za-z][\w-]*)/g)].map((m) => m[1]));
    const definies = new Set([...css.matchAll(/(?<![\w-])\.([A-Za-z][\w-]*)/g)].map((m) => m[1]));
    for (const g of globales) if (sources.some((s) => new RegExp(`["'\`\\s](${g})(?![\\w-])`).test(s.texte))) definies.delete(g);
    const nommees = new Set<string>();
    let compose = false;
    for (const s of sources) {
      /* LE NOM LOCAL DE LA FEUILLE, ET NON « styles ». Le relevé ne cherchait
         que « styles.X » : une feuille importée sous un autre nom voyait donc
         TOUTES ses classes comptées mortes, et les « styles.X » d'une AUTRE
         feuille lue par le même fichier lui étaient attribués. « FundCard.tsx »
         fait les deux à la fois — « import styles from OfferCard.module.css »
         et « import propres from ./FundCard.module.css » — et ses quatorze
         classes « mortes » étaient toutes vivantes, dont quatre qu'une épreuve
         voisine exige. Mesuré le 24 octobre 2026 : le compte portait surtout
         l'angle mort du compteur. */
      const nomsLocaux = s.feuillesLues.filter((l) => l.chemin === f).map((l) => l.local);
      if (!nomsLocaux.length) continue;
      for (const local of nomsLocaux) {
        for (const m of s.texte.matchAll(new RegExp(`${local}\\.([A-Za-z][\\w]*)`, "g"))) nommees.add(m[1]);
        for (const m of s.texte.matchAll(new RegExp(`${local}\\["([^"]+)"\\]`, "g"))) nommees.add(m[1]);
        if (new RegExp(`${local}\\[(?!")`).test(s.texte)) compose = true;
      }
    }
    if (compose) continue;
    lues += 1;
    classes += definies.size;
    /* DEUX REMÈDES, ET LE RELEVÉ DOIT DIRE LEQUEL. Une classe qu'aucun fichier
       ne nomme est tantôt le fossile d'une page disparue — on l'élague —,
       tantôt une classe de la maison écrite sans « :global » : le module l'a
       hachée, la règle ne mord sur rien, et il faut la RÉPARER. Six fois sur
       128 le 24 octobre 2026, dont le surtitre de la carte « Parcours » qui
       restait à 2,97 : 1 sur son fond de nuit. Élaguer celles-là effacerait
       l'intention au lieu de la rendre vraie, et c'est le piège où ce relevé
       conduit tout seul. */
    for (const c of definies) if (!nommees.has(c)) out.push(`${path.relative(ROOT, f)} › .${c}${maison.has(c) ? "   ← « " + c + " » est une classe de la maison : la règle visait le global. À RÉPARER en « :global(." + c + ") », pas à élaguer." : ""}`);
  }
  return { mortes: out.sort(), lues, classes };
};

describe("les feuilles de style", () => {
  it("ne gardent pas les mesures de ce qui n'est plus à l'écran", () => {
    const { mortes } = releveDesClasses();
    expect(mortes, `${mortes.length} classes qu'aucun fichier ne nomme :\n  ${mortes.join("\n  ")}`).toEqual([]);
  });

  /**
   * NON VACUITÉ, et c'est elle qui tient l'épreuve ci-dessus. « Aucune classe
   * morte » est aussi ce que répond un relevé qui ne lit rien : une feuille mal
   * trouvée, un commentaire qui avale le fichier, un import mal reconnu — et
   * l'épreuve passe au vert en ayant regardé le vide. QUATRE FOIS ce compteur
   * s'est trompé en silence ; il ne doit plus pouvoir se taire.
   *
   * LES SEUILS SONT CHOISIS SUR LA PLUS GROSSE DE CES QUATRE FOIS. La
   * reconnaissance par nom de fichier faisait tomber les 79 feuilles de routes
   * d'un coup : le relevé en lisait 112 sur 191. Un seuil à 150 l'aurait vu.
   * Mesuré le 24 octobre 2026 : 191 feuilles, 2821 classes.
   */
  it("et le relevé a bien regardé les feuilles de la maison", () => {
    const { lues, classes } = releveDesClasses();
    expect(lues, "le relevé a perdu de vue une famille entière de feuilles : son zéro ne prouve plus rien").toBeGreaterThan(150);
    expect(classes, "le relevé ne voit presque plus de classes : son zéro ne prouve rien").toBeGreaterThan(2000);
  });
});
