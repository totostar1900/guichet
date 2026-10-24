import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { RACINE } from "./racine";
import { SEUIL, ecrans, feuillesCss, globals, pireContraste, regles, sansCommentaires, selecteurs, valeur } from "./couleurs";

/**
 * UNE ENCRE POSÉE SUR LE FOND D'UN PARENT.
 *
 * L'ANGLE MORT QUE CETTE GARDE FERME, et les deux gardes voisines le nomment
 * elles-mêmes : « contrast.test.ts » mesure les règles qui posent À LA FOIS un
 * fond et une encre, et écrit en toutes lettres « ce qu'il ne mesure pas :
 * l'encre posée sans fond, dont le sol vient d'un parent ».
 * « contraste-sans-fond.test.ts » prend l'autre moitié : une encre FIXE sur un
 * papier qui bascule. Entre les deux, il restait le cas le plus courant — une
 * encre à jeton, sur le fond coloré d'une boîte parente.
 *
 * CE QUI L'A FAIT ÉCRIRE, le 24 octobre 2026. Le surtitre de la carte
 * « Parcours » de /info tenait à **2,97 : 1** sur son fond de nuit, dans les
 * deux thèmes. La feuille portait bien « .parcours .eyebrow { color: … } »,
 * mais écrite sans « :global » : le module hachait le nom, la règle ne mordait
 * sur rien, et la carte gardait l'encre claire de la maison, faite pour un
 * fond clair. Aucune des deux gardes ne pouvait le voir : le fond est sur
 * « .parcours », l'encre vient de « globals.css », et rien ne les réunit dans
 * un fichier.
 *
 * CE QUI LES RÉUNIT, C'EST LE BALISAGE, et c'est le cœur de la seconde mesure
 * ci-dessous : le JSX dit quelle boîte CONTIENT quel élément. Une garde qui ne
 * lit que du CSS ne peut pas le savoir ; une garde qui lit les deux le peut.
 */

const ABSOLU = /(?:^|[\s;])position\s*:\s*(absolute|fixed)/;

/* Un sélecteur est descendant d'un autre si le second le préfixe ET qu'un
   combinateur suit : « .a .b » descend de « .a », « .ab » non. Les frères
   (« + », « ~ ») ne descendent de personne. */
const descend = (fils: string, pere: string): boolean => fils.startsWith(pere) && fils.length > pere.length && (fils[pere.length] === " " || fils[pere.length] === ">");

type Trouvaille = { ou: string; detail: string; rapport: number; ecran: string };

/**
 * PREMIÈRE MESURE : LE SOL ET L'ENCRE DANS LA MÊME FEUILLE.
 *
 * ELLE EST VOLONTAIREMENT PRUDENTE, et trois conditions disent pourquoi. Sans
 * elles, le premier relevé donnait quatorze écarts dont QUATORZE étaient faux :
 *
 *  — « .band { background: var(--line) } » avec « .band span { color: … } »
 *    semblait poser une encre sur une ligne. Mais la feuille porte aussi
 *    « .band > div { background: var(--surface) } » : la bande ne montre son
 *    trait que dans les gouttières, et le texte est sur la surface. Un
 *    sélecteur-préfixe ne dit pas ce qui s'intercale, donc dès qu'un fond PEUT
 *    s'intercaler, on se tait.
 *  — « .gx { width: 1px; background: var(--line-2) } » avec
 *    « .gx b { position: absolute; bottom: -18px } » : l'étiquette sort de sa
 *    ligne d'un pixel. Une encre en position absolue a un sol que le fichier ne
 *    connaît pas.
 *  — « .mrow small, .mrowOn small { color: var(--ink-3) } » suivi de
 *    « .mrowOn small { color: var(--on-navy-2) } » : la cascade avait déjà
 *    corrigé le cas. On ne lit donc que la DERNIÈRE déclaration d'un sélecteur.
 *
 * Ce qu'elle laisse passer, la seconde mesure le reprend par le balisage.
 */
const memeFeuille = (): { ecarts: Trouvaille[]; paires: number } => {
  const tous = ecrans();
  const ecarts: Trouvaille[] = [];
  let paires = 0;
  for (const f of feuillesCss()) {
    const rs = regles(sansCommentaires(fs.readFileSync(f, "utf8")));
    const fonds: [string, string][] = [];
    const poseUnFond = new Set<string>();
    const encre = new Map<string, string>();
    const absolu = new Set<string>();
    for (const { selecteur, declarations } of rs) {
      const fond = valeur(declarations, "background(?:-color)?");
      const col = valeur(declarations, "color");
      for (const s of selecteurs(selecteur)) {
        if (fond) {
          poseUnFond.add(s);
          fonds.push([s, fond.split(/\s+/)[0]]);
        }
        if (col) encre.set(s, col); /* la cascade : la dernière gagne */
        if (ABSOLU.test(declarations)) absolu.add(s);
      }
    }
    for (const [s, col] of encre) {
      if (poseUnFond.has(s) || absolu.has(s)) continue;
      const sols = fonds.filter(([sb]) => descend(s, sb));
      if (!sols.length) continue;
      const [sol, fond] = sols.reduce((a, b) => (b[0].length > a[0].length ? b : a));
      /* Rien ne doit pouvoir s'intercaler entre le sol et l'encre. */
      if ([...poseUnFond].some((x) => x !== sol && descend(x, sol))) continue;
      paires += 1;
      const pire = pireContraste(fond, col, tous);
      if (!pire || pire.rapport >= SEUIL) continue;
      ecarts.push({ ou: path.relative(RACINE, f).replace(/\\/g, "/"), detail: `${sol} (${fond}) ‹ ${s} (${col})`, ...pire });
    }
  }
  return { ecarts, paires };
};

/**
 * SECONDE MESURE : LE FOND VIENT DU MODULE, L'ENCRE DE LA MAISON.
 *
 * C'est le cas de /info, et il ne peut se voir qu'en lisant le JSX : une boîte
 * « className={styles.parcours} » qui porte un fond, et dedans, quelque part,
 * un « className="eyebrow" » dont l'encre est écrite dans « globals.css ».
 *
 * LES TROIS PRUDENCES, mesurées elles aussi sur ce qu'elles écartaient :
 *  — une classe de la maison qui pose SON PROPRE fond n'est pas sur le sol de
 *    la boîte : « .btn » en donnait deux faux à 1,11 : 1 ;
 *  — on prend l'ascendant le plus PROCHE qui pose un fond, boîte de module ou
 *    classe de la maison, car le balisage les mêle ;
 *  — une règle du module qui vise expressément ce couple
 *    (« .parcours :global(.eyebrow) ») l'emporte sur l'encre de la maison :
 *    c'est exactement la réparation qu'on attend, et la compter pour rien
 *    ferait signaler à jamais ce qu'on vient de réparer.
 */
/* « [^<>] » traverse déjà les retours à la ligne : pas besoin du drapeau « s »,
   que la cible de compilation de ce dépôt ne connaît pas. */
const BALISE = /<(\/?)([A-Za-z][\w.]*)([^<>]*?)(\/?)>/g;
const ATTRIBUT_CLASSE = /className=(?:"([^"]*)"|\{([^}]*(?:\}[^}]*)?)\})/;

const sourcesTsx = (): string[] => {
  const out: string[] = [];
  const marche = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) marche(p);
      else if (e.name.endsWith(".tsx")) out.push(p);
    }
  };
  marche(path.join(RACINE, "src"));
  return out.sort();
};

/** Les éléments ouvrants non auto-fermants, avec les bornes de leur contenu. */
const enveloppes = (src: string): { debut: number; fin: number; attrs: string }[] => {
  const out: { debut: number; fin: number; attrs: string }[] = [];
  const balises = [...src.matchAll(BALISE)];
  for (let i = 0; i < balises.length; i++) {
    const m = balises[i];
    if (m[1] || m[4]) continue;
    let prof = 1;
    for (let j = i + 1; j < balises.length; j++) {
      const b = balises[j];
      if (b[2] !== m[2] || b[4]) continue;
      prof += b[1] ? -1 : 1;
      if (prof === 0) {
        out.push({ debut: m.index! + m[0].length, fin: b.index!, attrs: m[3] });
        break;
      }
    }
  }
  return out;
};

/** Les classes d'un « className » : celles d'un module, et celles écrites en clair. */
const classesDe = (attrs: string): { modules: [string, string][]; litterales: string[] } => {
  const m = ATTRIBUT_CLASSE.exec(attrs);
  if (!m) return { modules: [], litterales: [] };
  const brut = m[1] ?? m[2] ?? "";
  const modules = [...brut.matchAll(/(?<![\w.])(\w+)\.(\w+)/g)].map((x) => [x[1], x[2]] as [string, string]);
  /* Les « ${…} » ne sont pas des noms de classe : on les ôte avant de lire. */
  const nu = brut.replace(/\$\{[^}]*\}/g, " ");
  return { modules, litterales: [...nu.matchAll(/(?<![\w.$-])([a-z][\w-]*)(?![\w-])/g)].map((x) => x[1]) };
};

/** Les classes de la maison : leur encre, leur fond, posés au premier niveau de globals.css. */
const maison = (): { encre: Map<string, string>; fond: Set<string> } => {
  const encre = new Map<string, string>();
  const fond = new Set<string>();
  for (const { selecteur, declarations } of regles(sansCommentaires(globals()))) {
    const col = valeur(declarations, "color");
    const bg = valeur(declarations, "background(?:-color)?");
    for (const s of selecteurs(selecteur)) {
      const m = /^\.([A-Za-z][\w-]*)$/.exec(s);
      if (!m) continue;
      if (col) encre.set(m[1], col);
      if (bg) fond.add(m[1]);
    }
  }
  return { encre, fond };
};

/** Pour une feuille de module : le fond de chaque classe, et les encres visant un couple. */
const lectureFeuille = (f: string): { fonds: Map<string, string>; couples: Map<string, string> } => {
  const fonds = new Map<string, string>();
  const couples = new Map<string, string>();
  if (!fs.existsSync(f)) return { fonds, couples };
  for (const { selecteur, declarations } of regles(sansCommentaires(fs.readFileSync(f, "utf8")))) {
    const bg = valeur(declarations, "background(?:-color)?");
    const col = valeur(declarations, "color");
    for (const s of selecteurs(selecteur)) {
      const seule = /^\.([A-Za-z][\w-]*)$/.exec(s);
      if (seule && bg) fonds.set(seule[1], bg.split(/\s+/)[0]);
      /* « :global » EST OBLIGATOIRE ICI, et c'est tout le piège. Écrite
         « .parcours .eyebrow », la règle est hachée par le module et ne mord
         sur rien : c'est la forme INERTE, celle du défaut de /info. La compter
         pour un écrasement ferait taire cette garde exactement là où elle doit
         parler — la vérification à l'envers l'a prise en flagrant délit. */
      const couple = /^\.([A-Za-z][\w-]*)\s*[> ]\s*:global\(\s*\.([A-Za-z][\w-]*)\s*\)$/.exec(s);
      if (couple && col) couples.set(`${couple[1]} ${couple[2]}`, col);
    }
  }
  return { fonds, couples };
};

const parLeBalisage = (): { ecarts: Trouvaille[]; paires: number; temoin: boolean } => {
  const tous = ecrans();
  const { encre: encreMaison, fond: fondMaison } = maison();
  const cache = new Map<string, ReturnType<typeof lectureFeuille>>();
  const feuille = (f: string) => {
    if (!cache.has(f)) cache.set(f, lectureFeuille(f));
    return cache.get(f)!;
  };
  const ecarts: Trouvaille[] = [];
  let paires = 0;
  let temoin = false;
  for (const p of sourcesTsx()) {
    const src = fs.readFileSync(p, "utf8");
    const imports = Object.fromEntries(
      [...src.matchAll(/import\s+(\w+)\s+from\s+"([^"]+\.module\.css)"/g)].map((m) => [
        m[1],
        m[2].startsWith("@/") ? path.join(RACINE, "src", m[2].slice(2)) : path.resolve(path.dirname(p), m[2]),
      ]),
    );
    if (!Object.keys(imports).length) continue;
    const env = enveloppes(src);
    for (const e of env) {
      const { litterales } = classesDe(e.attrs);
      if (!litterales.length) continue;
      /* L'ascendant le plus proche qui pose un fond, module ou maison. */
      const englobants = env.filter((x) => x.debut <= e.debut && e.fin <= x.fin).sort((a, b) => b.debut - a.debut);
      let sol: { nom: string; fond: string; couples: Map<string, string>; ou: string } | null = null;
      for (const g of englobants) {
        const { modules, litterales: lit } = classesDe(g.attrs);
        for (const [local, nom] of modules) {
          const ch = imports[local];
          if (!ch) continue;
          const { fonds, couples } = feuille(ch);
          if (fonds.has(nom)) {
            sol = { nom, fond: fonds.get(nom)!, couples, ou: path.relative(RACINE, ch).replace(/\\/g, "/") };
            break;
          }
        }
        /* Une classe de la maison peut aussi faire le sol, et alors elle gagne
           si elle est plus proche : on s'arrête à la première trouvée. */
        if (!sol && lit.some((c) => fondMaison.has(c))) break;
        if (sol) break;
      }
      if (!sol) continue;
      for (const classe of new Set(litterales)) {
        if (fondMaison.has(classe)) continue; /* elle porte son propre sol */
        const col = sol.couples.get(`${sol.nom} ${classe}`) ?? encreMaison.get(classe);
        if (!col) continue;
        paires += 1;
        if (p.endsWith("info/page.tsx") && sol.nom === "parcours" && classe === "eyebrow") temoin = true;
        const pire = pireContraste(sol.fond, col, tous);
        if (!pire || pire.rapport >= SEUIL) continue;
        ecarts.push({
          ou: path.relative(RACINE, p).replace(/\\/g, "/"),
          detail: `.${sol.nom} (${sol.fond}, ${sol.ou}) ⊃ "${classe}" (${col})`,
          ...pire,
        });
      }
    }
  }
  return { ecarts, paires, temoin };
};

const dire = (t: Trouvaille[]) => t.map((x) => `${x.ou} · ${x.detail} · ${x.rapport.toFixed(2)}:1 en ${x.ecran}`).sort();

describe("une encre sur le fond d'un parent", () => {
  it("tient le seuil quand le sol et l'encre sont dans la même feuille", () => {
    const { ecarts } = memeFeuille();
    expect(dire(ecarts), `sous ${SEUIL}:1 sur le fond du parent — relever l'encre, ou donner son fond à la règle`).toEqual([]);
  });

  it("tient le seuil quand le fond vient du module et l'encre de la maison", () => {
    const { ecarts } = parLeBalisage();
    expect(dire(ecarts), `sous ${SEUIL}:1 : une classe de la maison écrit son encre pour un fond clair, et le balisage la pose sur une boîte colorée`).toEqual([]);
  });

  /**
   * NON VACUITÉ, et elle pèse plus lourd ici qu'ailleurs : les deux mesures
   * ci-dessus sont VERTES aujourd'hui, donc rien ne distingue « la maison tient
   * le seuil » de « le relevé ne regarde rien ». Trois ancres :
   * le nombre de couples lus de chaque côté, et surtout le couple TÉMOIN —
   * la carte « Parcours » de /info, celle qui a fait écrire cette garde. S'il
   * disparaît du relevé, c'est que le lecteur de balisage ne lit plus.
   */
  it("a bien regardé, et retrouve le couple qui l'a fait écrire", () => {
    const a = memeFeuille();
    const b = parLeBalisage();
    /* Mesuré le 24 octobre 2026 : 181 couples d'un côté, 184 de l'autre. Le
       seuil est posé à peu près à la moitié — assez bas pour qu'une page qui
       s'en va ne le fasse pas tomber, assez haut pour qu'un lecteur cassé,
       qui retombe toujours à zéro ou presque, le fasse tomber. */
    expect(a.paires, "plus aucun couple sol/encre dans une même feuille : la première mesure ne regarde rien").toBeGreaterThan(90);
    expect(b.paires, "plus aucun couple boîte/classe de la maison dans le balisage : la seconde mesure ne regarde rien").toBeGreaterThan(90);
    expect(b.temoin, "le couple témoin — la carte « Parcours » de /info et son surtitre — n'est plus vu : le lecteur de balisage est cassé").toBe(true);
  });

  /* ET LES ÉCRANS, car tout le reste en dépend : une mesure qui ne connaîtrait
     qu'un écran laisserait passer exactement ce qu'on cherche, un contraste
     qui ne tombe que sur l'un d'eux. */
  it("mesure sur chacun des écrans que la maison rend", () => {
    const tous = ecrans();
    expect(Object.keys(tous).length, "un seul écran connu : la mesure ne vaut rien").toBeGreaterThan(2);
    expect(pireContraste("var(--navy)", "var(--ink-3)", tous)!.rapport, "l'encre tertiaire sur le navy devrait rester le cas d'école de cette garde").toBeLessThan(SEUIL);
  });
});

/**
 * L'ENCRE TERTIAIRE TIENT SUR LES FONDS TEINTÉS DE LA MAISON.
 *
 * CELLE-CI NE REGARDE PAS LE CODE, elle regarde les JETONS : quel que soit
 * l'endroit où on les emploie, « --ink-3 » doit se lire sur chacun des fonds
 * doux. Les deux mesures ci-dessus ne voient qu'un couple à la fois, là où le
 * balisage le leur donne ; le jeton, lui, vaut partout.
 *
 * CE QU'ELLE A TROUVÉ, le 24 octobre 2026. « --ink-3 » valait #676d7b, soit
 * 4,84:1 sur le papier — sept pour cent au-dessus du seuil. Une encre sans
 * marge sur le papier TOMBE sur la moindre teinte : 4,03 sur « --crit-soft »,
 * et sous 4,5 sur onze des quatorze fonds doux. Au sombre elle passait à 4,51
 * sur « --neutral-soft », c'est-à-dire d'un centième.
 *
 * LE REMÈDE EST CELUI DE SEPTEMBRE, écrit dans globals.css au-dessus des trois
 * encres de statut : « assombries du strict nécessaire pour tenir 4,5:1, la
 * teinte reste la même à l'œil ». Le même geste, à l'envers au sombre, où
 * l'encre s'éclaircit. L'autre issue — éclaircir les quatorze teintes — a été
 * mesurée puis écartée : elle lavait les couleurs de FAMILLE d'instruments,
 * qui portent du sens, pour réparer une encre qui n'en porte pas.
 *
 * LE SUFFIXE « -soft » EST LA CONVENTION DE LA MAISON pour un fond teinté, et
 * c'est lui qui fait tenir cette garde sans liste à maintenir : une famille
 * d'instruments ajoutée demain sera mesurée le jour où elle est écrite.
 */
describe("l'encre tertiaire", () => {
  it("se lit sur chacun des fonds doux, sur chacun des écrans", () => {
    const tous = ecrans();
    const doux = [...new Set([...sansCommentaires(globals()).matchAll(/(--[\w-]*-soft)\s*:/g)].map((m) => m[1]))].sort();
    const faibles = doux
      .map((t) => ({ t, pire: pireContraste(`var(${t})`, "var(--ink-3)", tous) }))
      .filter((x) => !x.pire || x.pire.rapport < SEUIL)
      .map((x) => (x.pire ? `${x.t} · ${x.pire.rapport.toFixed(2)}:1 en ${x.pire.ecran}` : `${x.t} · ne se résout pas`));
    expect(faibles, "l'encre tertiaire ne se lit plus sur ce fond teinté : l'assombrir du strict nécessaire, comme en septembre, plutôt que laver la teinte").toEqual([]);
    /* Non vacuité : la convention de nommage est ce qui porte la mesure. */
    expect(doux.length, "plus de jeton « -soft » : la garde ne mesure rien").toBeGreaterThan(10);
  });
});
