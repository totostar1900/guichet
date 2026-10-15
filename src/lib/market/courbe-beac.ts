/**
 * LIRE LA COURBE QUE LA BEAC PUBLIE EN DESSIN.
 *
 * La BEAC ne publie pas de table de rendements : elle publie un graphique. Et
 * elle en publie PLUSIEURS par document, ce que Georges a relevé le 15 octobre
 * 2026 : la feuille « CEMAC » porte trois courbes, une par Trésor qui cote, et
 * les feuilles par pays en portent une chacune. Deux cent soixante-dix-sept
 * pièces dorment ainsi depuis 2015, et nous n'en avions jamais tiré un chiffre.
 *
 * ON NE RELÈVE PAS UN POINT À L'ŒIL. Une courbe lue sur une image invente une
 * précision que la source ne donne pas, et ce chiffre inventé finirait par
 * s'opposer à nos propres mesures sans qu'on sache lequel croire. Mais un
 * graphique vectoriel n'est pas une image : ses coordonnées sont dans le flux
 * du document, au point près, et le repère qui les convertit en pour cent y est
 * aussi.
 *
 * LE REPÈRE SE PREND SUR LA GRILLE, PAS SUR LES ÉTIQUETTES. L'étiquette « 2,00 »
 * est posée à la ligne de base de son texte, deux points sous le trait qu'elle
 * nomme : calibrer dessus décale toute la courbe de 0,15 point de pourcentage,
 * ce qui ne se voit pas et fausse tout. Les traits de grille, eux, sont
 * exactement aux valeurs rondes.
 *
 * L'IDENTITÉ D'UNE COURBE EST SA COULEUR, PAS SON RANG. Trois courbes sont
 * tracées dans un ordre qui n'est pas celui de la légende, et rien n'oblige la
 * BEAC à le garder. La légende dessine un trait court de la couleur de chaque
 * courbe devant le nom du pays : c'est cette couleur qui les apparie.
 *
 * CE QUI N'EST PAS LISIBLE EST DIT, JAMAIS DEVINÉ. Sur les 277 pièces, 54
 * seulement sont vectorielles ; les autres sont des scans, et la fonction les
 * refuse en disant pourquoi.
 */

/** Une couleur de tracé, telle que le document la pose. */
type Couleur = string;

interface Trace {
  points: { x: number; y: number }[];
  couleur: Couleur;
}

export interface PointDeCourbe {
  /** Le Trésor que la légende nomme, ou « CEMAC » pour la courbe de zone. */
  pays: string;
  /** La durée telle que l'axe l'écrit : « 3 mois », « 1,5 ans ». */
  tenor: string;
  /** La même, en années, pour trier et comparer. */
  annees: number;
  /** Le rendement en pour cent, pris sur le tracé et converti par la grille. */
  taux: number;
}

export interface CourbeBeac {
  /** Le mois de la courbe, en AAAA-MM, lu dans le titre du document. */
  mois?: string;
  points: PointDeCourbe[];
  /** Les noms que la légende porte, dans l'ordre où elle les écrit. */
  legende: string[];
  /**
   * LE DOCUMENT CONTRE LUI-MÊME : combien de points ont été lus deux fois, par
   * le tracé et par le chiffre imprimé, et de combien ils s écartent au pire.
   */
  controle: { compares: number; ecartMax: number };
  /** Ce qui empêche de lire, ou ce qui reste incertain. Vide si tout est net. */
  reserves: string[];
}

const MOIS = ["janvier", "fevrier", "mars", "avril", "mai", "juin", "juillet", "aout", "septembre", "octobre", "novembre", "decembre"];
const aplat = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/** « juillet 2026 » dans un nom de fichier ou un titre → « 2026-07 ». */
export function moisDuTitre(titre: string): string | undefined {
  const f = aplat(titre);
  const m = f.match(new RegExp(`(${MOIS.join("|")})\\s+(\\d{4})`));
  if (!m) return undefined;
  return `${m[2]}-${String(MOIS.indexOf(m[1]) + 1).padStart(2, "0")}`;
}

/**
 * LE PAYS QUE LE TITRE NOMME, Y COMPRIS SOUS SA FORME ADJECTIVE.
 *
 * La BEAC écrit « des titres publics camerounais » aussi souvent que « du
 * Cameroun », et c'est le seul endroit où le pays figure sur une feuille qui
 * n'a pas de légende.
 */
export function paysDuTitre(titre: string): string | undefined {
  const f = aplat(titre);
  if (/\bcemac\b/.test(f)) return "CEMAC";
  if (/cameroun|camerounais/.test(f)) return "Cameroun";
  if (/gabon|gabonais/.test(f)) return "Gabon";
  if (/congo|congolais/.test(f)) return "Congo";
  if (/tchad|tchadien/.test(f)) return "Tchad";
  if (/guinee|equatoguineen/.test(f)) return "Guinée éq.";
  /* « centrafric » n'est PAS dans « Centrafrique » : le mot s'arrête à
     « centrafri ». Même coquille qu'au lecteur des communiqués. */
  if (/centrafri|\brca\b/.test(f)) return "RCA";
  return undefined;
}

/**
 * DIX « COURBES » NE SONT PAS DES PDF, CE SONT DES CLASSEURS EXCEL.
 *
 * La BEAC a publié, de septembre 2016 à août 2017, dix feuilles sous un nom
 * en « .pdf » dont les octets commencent par « PK » : ce sont des classeurs,
 * et pdfjs n'y voyait qu'une « Invalid PDF structure ». Ils portent mieux que
 * les autres : la DONNÉE SOURCE, une feuille par pays, échéance par échéance,
 * sans graphique à relire.
 *
 * On arrondit à deux décimales comme partout ailleurs : la BEAC publie ses
 * courbes à deux décimales, et une colonne où cohabitent 2,20 et
 * 2,2020230458302597 invite à des comparaisons qui n'ont pas de sens.
 */
export async function courbesDuClasseur(bytes: Uint8Array, titre = ""): Promise<CourbeBeac> {
  const mois = moisDuTitre(titre);
  const points: PointDeCourbe[] = [];
  const reserves: string[] = [];
  let wb;
  try {
    const ExcelJS = (await import("exceljs")).default;
    wb = new ExcelJS.Workbook();
    await wb.xlsx.load(Buffer.from(bytes) as unknown as ArrayBuffer);
  } catch (e) {
    return { mois, points: [], legende: [], controle: { compares: 0, ecartMax: 0 }, reserves: [`classeur illisible : ${e instanceof Error ? e.message : "erreur"}`] };
  }
  const legende: string[] = [];
  for (const ws of wb.worksheets) {
    const pays = paysDuTitre(ws.name);
    if (!pays || pays === "CEMAC") continue;
    legende.push(ws.name);
    let lues = 0;
    ws.eachRow({ includeEmpty: false }, (row) => {
      const tenor = String(row.getCell(1).value ?? "").trim();
      const annees = anneesDuTenor(tenor);
      if (annees == null) return;
      const brut = row.getCell(2).value;
      const v = typeof brut === "number" ? brut : typeof brut === "object" && brut && "result" in brut ? Number((brut as { result: unknown }).result) : Number(brut);
      if (!Number.isFinite(v)) return;
      points.push({ pays, tenor, annees, taux: Math.round(v * 100) / 100 });
      lues++;
    });
    if (!lues) reserves.push(`la feuille « ${ws.name} » ne porte aucune échéance lisible`);
  }
  if (!points.length) reserves.push("aucune feuille de pays dans ce classeur");
  const tenus = points.filter((p) => p.taux >= 1 && p.taux <= 20);
  for (const p of points) {
    if (p.taux < 1 || p.taux > 20) reserves.push(`${p.pays} à ${p.tenor} : ${p.taux} % écarté, aucun Trésor de la zone ne s'est financé à ce prix`);
  }
  return { mois, points: tenus.sort((a, b) => a.pays.localeCompare(b.pays) || a.annees - b.annees), legende, controle: { compares: 0, ecartMax: 0 }, reserves };
}

/**
 * « 3 mois » → 0,25 ; « 1,5 ans » → 1,5 ; « 3,5A » → 3,5.
 *
 * La BEAC abrège « ans » en « A » une fois sur dix-neuf, toujours au même
 * endroit de l'axe, et l'oublier perdait un point de chaque courbe.
 */
export function anneesDuTenor(s: string): number | undefined {
  const m = aplat(s).match(/^(\d+(?:[,.]\d+)?)\s*(mois|ans?|a)$/);
  if (!m) return undefined;
  const n = Number(m[1].replace(",", "."));
  if (!Number.isFinite(n)) return undefined;
  return m[2] === "mois" ? n / 12 : n;
}

/** Les segments d'un chemin, points de contrôle des courbes compris. */
function pointsDuChemin(types: number[], args: number[], OPS: Record<string, number>): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  let k = 0;
  for (const t of types) {
    if (t === OPS.moveTo || t === OPS.lineTo) {
      pts.push({ x: args[k], y: args[k + 1] });
      k += 2;
    } else if (t === OPS.curveTo) {
      pts.push({ x: args[k + 4], y: args[k + 5] });
      k += 6;
    } else if (t === OPS.curveTo2 || t === OPS.curveTo3) {
      pts.push({ x: args[k + 2], y: args[k + 3] });
      k += 4;
    } else if (t === OPS.rectangle) k += 4;
  }
  return pts;
}

/** Les abscisses (ou ordonnées) distinctes d'un jeu de valeurs, à un point près. */
function distinctes(valeurs: number[], tolerance = 1): number[] {
  const out: number[] = [];
  for (const v of [...valeurs].sort((a, b) => a - b)) {
    if (!out.length || Math.abs(v - out[out.length - 1]) > tolerance) out.push(v);
  }
  return out;
}

/**
 * Les courbes d'une page, converties en pour cent.
 *
 * Rend une réserve plutôt qu'un chiffre chaque fois que le repère n'est pas
 * établi : un rendement faux est bien pire qu'un rendement absent, qui se voit.
 */
export async function courbesDuPdf(bytes: Uint8Array, titre = ""): Promise<CourbeBeac> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const OPS = pdfjs.OPS as unknown as Record<string, number>;
  const reserves: string[] = [];
  const mois = moisDuTitre(titre);

  /* UN NOM EN « .pdf » NE FAIT PAS UN PDF. Dix feuilles sont des classeurs,
     et leurs octets le disent avant toute tentative de lecture. */
  if (bytes.length > 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) {
    return courbesDuClasseur(bytes, titre);
  }

  let doc;
  try {
    doc = await pdfjs.getDocument({ data: new Uint8Array(bytes), disableFontFace: true, useSystemFonts: false, isEvalSupported: false, verbosity: 0 }).promise;
  } catch (e) {
    return { mois, points: [], legende: [], controle: { compares: 0, ecartMax: 0 }, reserves: [`document illisible : ${e instanceof Error ? e.message : "erreur"}`] };
  }

  const points: PointDeCourbe[] = [];
  const legendeTotale: string[] = [];
  const controle = { compares: 0, ecartMax: 0 };
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const lue = await courbesDUnePage(page, OPS, paysDuTitre(titre));
    points.push(...lue.points);
    legendeTotale.push(...lue.legende);
    controle.compares += lue.controle.compares;
    controle.ecartMax = Math.max(controle.ecartMax, lue.controle.ecartMax);
    for (const r of lue.reserves) reserves.push(doc.numPages > 1 ? `page ${n} : ${r}` : r);
  }
  /**
   * UN TRÉSOR DE LA ZONE NE SE FINANCE NI SOUS 1 % NI AU-DESSUS DE 20 %.
   *
   * Au-delà, ce n'est pas un marché, c'est une échelle mal posée. Une feuille
   * scannée de juillet 2018 porte un axe reconnu « 31,00 26,00 21,00 6,00
   * 1,00 » là où le Gabon se finançait autour de 6 % : la lecture de
   * caractères a collé les chiffres, et le point sorti valait 26,27 %.
   *
   * ON ÉCARTE, ET ON LE DIT. Un point que personne ne peut défendre vaut
   * moins qu'un trou, qui se voit.
   */
  const tenus = points.filter((p) => p.taux >= 1 && p.taux <= 20);
  for (const p of points) {
    if (p.taux < 1 || p.taux > 20) reserves.push(`${p.pays} à ${p.tenor} : ${p.taux} % écarté, aucun Trésor de la zone ne s'est financé à ce prix`);
  }
  return { mois, points: tenus, legende: legendeTotale, controle, reserves };
}

interface Mot {
  s: string;
  x: number;
  y: number;
}

async function courbesDUnePage(page: { getTextContent: () => Promise<unknown>; getOperatorList: () => Promise<unknown> }, OPS: Record<string, number>, paysDuTitre?: string) {
  const reserves: string[] = [];
  const contenu = (await page.getTextContent()) as { items: { str?: string; transform?: number[] }[] };
  const mots: Mot[] = contenu.items
    .filter((i) => typeof i.str === "string" && i.str.trim() && i.transform)
    .map((i) => ({ s: (i.str as string).trim(), x: (i.transform as number[])[4], y: (i.transform as number[])[5] }));

  const ops = (await page.getOperatorList()) as { fnArray: number[]; argsArray: unknown[] };
  const traces: Trace[] = [];
  let couleur: Couleur = "#000000";
  for (let i = 0; i < ops.fnArray.length; i++) {
    const fn = ops.fnArray[i];
    if (fn === OPS.setStrokeRGBColor) {
      /* `Array.from` et non `.map` : pdfjs rend un tableau typé, dont `.map`
         reconvertit en nombre la chaîne qu on lui rend, et toutes les couleurs
         devenaient la même. */
      const a = Array.from(ops.argsArray[i] as ArrayLike<number>);
      couleur = `#${a.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
      continue;
    }
    if (fn !== OPS.constructPath) continue;
    const [types, args] = ops.argsArray[i] as [number[], number[]];
    const pts = pointsDuChemin(types, args, OPS);
    if (pts.length >= 2) traces.push({ points: pts, couleur });
  }

  /* LA GRILLE. Un trait de grille horizontal garde son ordonnée sur toute sa
     longueur, un vertical son abscisse : c'est à cela qu'on les reconnaît,
     et pas à leur couleur ni à leur rang. */
  /* ON REGARDE LES SEGMENTS, PAS LES CHEMINS. Certaines années dessinent le
     peigne entier en un seul chemin, d'autres un trait par chemin : compter
     les chemins faisait disparaître la grille une année sur deux. */
  const horizontaux: number[] = [];
  for (const t of traces) {
    for (let i = 1; i < t.points.length; i++) {
      const a = t.points[i - 1];
      const b = t.points[i];
      if (Math.abs(a.y - b.y) < 0.5 && Math.abs(a.x - b.x) > 100) horizontaux.push((a.y + b.y) / 2);
    }
  }
  const lignesH = distinctes(horizontaux, 2);

  /* Les graduations de l'ordonnée, et les durées de l'abscisse. */
  /**
   * LES GRADUATIONS SONT UNE PILE, ET C'EST AINSI QU'ON LES RECONNAÎT.
   *
   * La décimale d'abord : sans elle, le « 6 » d'un titre coupé en fragments
   * entrait dans l'échelle. Mais cela ne suffit pas, car les feuilles d'avant
   * 2021 IMPRIMENT LA VALEUR À CÔTÉ DE CHAQUE POINT : « 6,75 » au bout de la
   * courbe ressemble trait pour trait à « 7,00 » sur l'axe. Les graduations,
   * elles, partagent leur abscisse ; les étiquettes de points, non.
   */
  /**
   * ET LA DÉCIMALE S'ÉCRIT AVEC UN POINT UNE FOIS SUR SEPT.
   *
   * Mesuré le 15 octobre 2026 : 37 feuilles sur 277 restaient muettes pour ce
   * seul caractère. « 7.00 » sur l'axe n'entrait pas dans les nombres, donc
   * l'axe n'existait pas ; le lecteur prenait alors pour échelle la colonne
   * d'un TABLEAU ANNEXE imprimé à droite du graphique, dont les ordonnées
   * sont des lignes de tableau et non des hauteurs, puis rejetait tous les
   * chiffres de la courbe comme incohérents avec cette fausse échelle. Une
   * feuille qui porte 33 nombres rendait zéro point.
   */
  const nombres = mots.filter((m) => /^\d{1,2}[.,]\d{2}$/.test(m.s));
  /* LA PILE TOLÈRE LA LARGEUR D'UN CHIFFRE. Les graduations sont alignées à
     DROITE : « 8,00 » commence six points plus loin que « 10,00 », et une
     tolérance trop serrée coupait l'axe en deux piles dont on ne gardait que
     la plus grande, perdant la moitié de l'échelle. */
  const piles: Mot[][] = [];
  for (const m of [...nombres].sort((a, b) => a.x - b.x)) {
    const derniere = piles[piles.length - 1];
    if (derniere && Math.abs(derniere[derniere.length - 1].x - m.x) <= 8) derniere.push(m);
    else piles.push([m]);
  }
  /**
   * LA PLUS GRANDE PILE N'EST PAS TOUJOURS L'AXE.
   *
   * Certaines feuilles alignent AUSSI leurs étiquettes de points sur une même
   * abscisse : la pile des données en comptait quatorze contre huit pour
   * l'axe, et l'échelle se calait sur les données elles-mêmes. Le signe qui
   * distingue un axe ne tient pas au nombre : les valeurs d'un axe montent
   * d'un PAS CONSTANT quand on descend les ordonnées. On choisit donc la pile
   * la plus régulière, et la plus grande seulement à égalité.
   */
  const regularite = (p2: Mot[]): number => {
    if (p2.length < 3) return Infinity;
    const tri = [...p2].map((m) => ({ y: m.y, v: Number(m.s.replace(",", ".")) })).sort((a, b) => a.y - b.y);
    const pas = tri.slice(1).map((c, i) => c.v - tri[i].v);
    if (pas.some((d) => d <= 0)) return Infinity;
    const moyen = pas.reduce((a, b) => a + b, 0) / pas.length;
    return moyen ? Math.max(...pas.map((d) => Math.abs(d - moyen))) / moyen : Infinity;
  };
  const pile = [...piles].sort((a, b) => regularite(a) - regularite(b) || b.length - a.length)[0] ?? [];
  const graduations = pile.map((m) => ({ v: Number(m.s.replace(",", ".")), y: m.y })).sort((a, b) => a.v - b.v);
  /**
   * UNE ÉTIQUETTE DE DURÉE EST SOUVENT COUPÉE EN DEUX.
   *
   * « 3 mois » arrive comme « 3 » à l'abscisse 152 et « mois » à l'abscisse
   * 161, sur la même ligne de base : testé morceau par morceau, aucun des
   * deux n'est une durée, et la feuille entière est déclarée sans axe des
   * durées. Mesuré le 15 octobre 2026 : dix feuilles tombaient ainsi, dont
   * toutes les congolaises de 2021.
   *
   * ON NE RECOLLE QUE CE CAS-LÀ : un nombre nu, puis une unité, à moins de
   * quarante points à sa droite et sur la même ligne. Recoller toute une
   * ligne ferait disparaître les nombres eux-mêmes.
   */
  const UNITE = /^(mois|ans?|a)$/;
  const parLigne = [...mots].sort((a, b) => b.y - a.y || a.x - b.x);
  const recollees: Mot[] = [];
  for (let i = 0; i < parLigne.length - 1; i++) {
    const a = parLigne[i];
    const b = parLigne[i + 1];
    if (!/^\d{1,2}([,.]\d)?$/.test(a.s)) continue;
    if (Math.abs(a.y - b.y) > 2 || b.x - a.x < 0 || b.x - a.x > 40) continue;
    if (!UNITE.test(aplat(b.s))) continue;
    recollees.push({ s: `${a.s} ${aplat(b.s)}`, x: a.x, y: a.y });
  }
  const durees = [...mots, ...recollees]
    .filter((m) => anneesDuTenor(m.s) != null)
    .sort((a, b) => a.x - b.x || a.y - b.y)
    /* Une étiquette entière et sa version recollée au même endroit sont la
       même étiquette : on n'en garde qu'une. L'ORDONNÉE COMPTE AUTANT QUE
       L'ABSCISSE : dédupliquer sur la seule abscisse écrasait les quatorze
       lignes d'une table annexe, qui sont par construction dans la même
       colonne. */
    .filter((m, i, t) => i === 0 || Math.abs(m.x - t[i - 1].x) > 2 || Math.abs(m.y - t[i - 1].y) > 2);

  /**
   * LA TABLE ANNEXE, QUI NE DOIT RIEN À LA GÉOMÉTRIE.
   *
   * À partir de 2022, la BEAC imprime à droite du graphique deux colonnes,
   * « Maturités » et « Rendements » : la durée et son taux, côte à côte, sur
   * la même ligne. C'est la donnée la plus sûre de la feuille, puisqu'elle ne
   * demande ni échelle, ni tracé, ni appariement par la position verticale.
   * Vingt-cinq feuilles ne portaient QUE cela, et rendaient zéro point : le
   * lecteur cherchait des chiffres près de l'axe des durées du graphique, et
   * la table est à six cents points de là.
   *
   * ON N'ACCEPTE UNE TABLE QUE SI ELLE EN EST UNE : au moins quatre lignes,
   * chacune une durée et un nombre sur la même ligne de base, et toutes les
   * durées dans la même colonne comme tous les nombres. Deux mots qui se
   * croisent par hasard ne font pas quatre lignes alignées.
   */
  const lignesTable = [...durees]
    .map((d) => {
      const n = nombres.filter((m) => Math.abs(m.y - d.y) <= 2 && m.x > d.x && m.x - d.x < 220).sort((a, b) => a.x - b.x)[0];
      return n ? { d, n } : undefined;
    })
    .filter((x): x is { d: Mot; n: Mot } => x != null);
  const colonne = (v: number[]) => v.length >= 4 && Math.max(...v) - Math.min(...v) <= 24;
  const table =
    lignesTable.length >= 4 && colonne(lignesTable.map((l) => l.d.x)) && colonne(lignesTable.map((l) => l.n.x))
      ? lignesTable.map((l) => ({ tenor: l.d.s, annees: anneesDuTenor(l.d.s) as number, taux: Number(l.n.s.replace(",", ".")) }))
      : [];
  const pointsDeTable = table.length && paysDuTitre ? table.map((t) => ({ pays: paysDuTitre, tenor: t.tenor, annees: t.annees, taux: t.taux })) : [];
  const direLaTable = (): { points: PointDeCourbe[]; legende: string[]; controle: { compares: number; ecartMax: number }; reserves: string[] } => ({
    points: [...pointsDeTable].sort((a, b) => a.annees - b.annees),
    legende: [],
    controle: { compares: 0, ecartMax: 0 },
    reserves: [...reserves, `${table.length} valeur(s) lues dans la table « maturités / rendements » imprimée à côté du graphique`],
  });

  /* DEUX CHOSES SUFFISENT, ET IL LES FAUT : une échelle verticale, et des
     durées en abscisse. La grille améliore la première, elle ne la remplace
     pas, et les traits verticaux ne servent à rien puisque les étiquettes
     portent déjà leur abscisse.
     SAUF QUAND LA TABLE EST LÀ : elle ne demande ni l'une ni l'autre. */
  if (graduations.length < 2) {
    if (pointsDeTable.length) return direLaTable();
    return { points: [], legende: [], controle: { compares: 0, ecartMax: 0 }, reserves: ["pas d'échelle verticale : la pièce est un scan, ou ses graduations manquent"] };
  }
  if (durees.length < 2) {
    if (pointsDeTable.length) return direLaTable();
    return { points: [], legende: [], controle: { compares: 0, ecartMax: 0 }, reserves: ["pas d'axe des durées : la pièce est un scan, ou ses étiquettes manquent"] };
  }

  /**
   * L'ÉCHELLE SE POSE SUR TOUTES LES GRADUATIONS, PAR MOINDRES CARRÉS.
   *
   * Les étiquettes d'un axe sont posées à la ligne de base de leur texte,
   * donc toutes décalées du MÊME nombre de points sous le trait qu'elles
   * nomment. Ce décalage change l'origine, jamais la pente, et une droite
   * ajustée sur les huit étiquettes rend donc la pente exacte. Les traits de
   * grille servent alors à retrouver l'origine, quand ils sont là.
   *
   * On a d'abord calibré sur les traits seuls : six pièces sur dix n'en ont
   * pas, et l'appariement étiquette-trait se trompait d'un cran sur les
   * autres, ce qui décalait la courbe entière d'un point de pourcentage.
   */
  const droite = (pts: { y: number; v: number }[]): ((y: number) => number) => {
    const n = pts.length;
    const my = pts.reduce((s2, c) => s2 + c.y, 0) / n;
    const mv = pts.reduce((s2, c) => s2 + c.v, 0) / n;
    const num = pts.reduce((s2, c) => s2 + (c.y - my) * (c.v - mv), 0);
    const den = pts.reduce((s2, c) => s2 + (c.y - my) ** 2, 0);
    const a = den ? num / den : 0;
    return (y) => mv + a * (y - my);
  };
  const surEtiquettes = droite(graduations.map((g) => ({ y: g.y, v: g.v })));
  const hTriees = [...lignesH].sort((a, b) => a - b);
  const couples = graduations
    .map((g) => ({ g, t: hTriees.reduce((best, y) => (Math.abs(y - g.y) < Math.abs(best - g.y) ? y : best), hTriees[0] ?? NaN) }))
    .filter((c) => Number.isFinite(c.t) && Math.abs(c.t - c.g.y) < 8);
  /* Les traits ne reprennent la main que s'ils couvrent l'axe entier : à
     moitié appariés, ils décalent au lieu de corriger. */
  const pct = couples.length === graduations.length && couples.length >= 3 ? droite(couples.map((c) => ({ y: c.t, v: c.g.v }))) : surEtiquettes;
  if (couples.length !== graduations.length) reserves.push(`${graduations.length - couples.length} graduation(s) sur ${graduations.length} sans trait de grille : l'échelle est posée sur les étiquettes seules`);

  /**
   * LA LÉGENDE. Le trait court d'une couleur, puis le nom à sa droite. On ne
   * retient comme nom que le mot le plus proche à droite du trait, sur la même
   * ligne : c'est ce que l'œil fait, et c'est vérifiable.
   */
  /* LE NOM EXACT, PAS SON ADJECTIF. « congolais », qui figure dans le titre
     imprimé sur la page, se faisait passer pour une entrée de légende. */
  const yLegende = mots.filter((m) => /^(cameroun|congo|gabon|tchad|rca|centrafrique|cemac|guinee( equatoriale)?)$/i.test(aplat(m.s)));
  const nomParCouleur = new Map<Couleur, string>();
  for (const nom of yLegende) {
    const marqueur = traces
      .filter((t) => t.points.length <= 4 && t.points.every((p) => Math.abs(p.y - nom.y) < 8) && Math.max(...t.points.map((p) => p.x)) < nom.x && nom.x - Math.max(...t.points.map((p) => p.x)) < 40)
      .sort((a, b) => Math.max(...b.points.map((p) => p.x)) - Math.max(...a.points.map((p) => p.x)))[0];
    if (marqueur) nomParCouleur.set(marqueur.couleur, nom.s);
  }

  /**
   * LES COURBES. Ce qui reste : un tracé dont chaque abscisse tombe sur un
   * trait vertical, et qui n'est ni la grille ni un cadre.
   */
  const estGrille = (t: Trace) => {
    const xs = distinctes(t.points.map((p) => p.x));
    const ys = distinctes(t.points.map((p) => p.y));
    return xs.length <= 3 || ys.length <= 3;
  };
  const courbes = traces.filter((t) => t.points.length >= 4 && !estGrille(t));

  /**
   * UNE FEUILLE PAR PAYS N'A PAS DE LÉGENDE, ET SON PAYS EST DANS LE TITRE.
   *
   * « Courbe de rendements des titres publics camerounais - novembre 2019 » ne
   * nomme rien dans la page : le nom est sur la couverture. On n'attribue
   * ainsi QUE s'il n'y a qu'un seul tracé sans nom, faute de quoi on
   * choisirait au hasard entre deux courbes.
   */
  const anonymes = courbes.filter((c) => !nomParCouleur.has(c.couleur));
  const duTitre = anonymes.length === 1 ? paysDuTitre : undefined;

  const points: PointDeCourbe[] = [];
  for (const c of courbes) {
    const nom = nomParCouleur.get(c.couleur) ?? duTitre;
    if (!nom) {
      reserves.push(`un tracé de ${c.points.length} points n'a pas de nom dans la légende (couleur ${c.couleur})`);
      continue;
    }
    for (const p of c.points) {
      /* La durée d'un point est l'étiquette de l'axe la plus proche, et elle
         doit l'être franchement : au-delà d'un demi-intervalle, le point n'est
         pas sur l'axe et on ne l'invente pas. */
      const d = durees.reduce((best, x) => (Math.abs(x.x - p.x) < Math.abs(best.x - p.x) ? x : best), durees[0]);
      const pas = durees.length > 1 ? Math.abs(durees[1].x - durees[0].x) : 30;
      if (Math.abs(d.x - p.x) > pas * 0.6) continue;
      const annees = anneesDuTenor(d.s);
      if (annees == null) continue;
      points.push({ pays: nom, tenor: d.s, annees, taux: Number(pct(p.y).toFixed(2)) });
    }
  }

  /**
   * LA SECONDE LECTURE : LES VALEURS QUE LA FEUILLE IMPRIME.
   *
   * Avant 2021 la BEAC pose le chiffre à côté de chaque point : « 6,75 » au
   * bout de la courbe. C'est une donnée écrite, pas un relevé, et elle vaut
   * mieux que n'importe quelle conversion de coordonnées. Les pièces de ces
   * années-là sont des scans sans tracé vectoriel : sans cette lecture, elles
   * ne rendraient rien du tout.
   *
   * ET ELLE SE VÉRIFIE TOUTE SEULE. Un chiffre imprimé est posé à côté de son
   * point : sa propre hauteur dans le repère doit dire à peu près ce qu'il
   * dit. Un « 16,75 » lu pour « 6,75 » par la reconnaissance de caractères se
   * trahit là, et il est écarté plutôt que cru.
   */
  const xMin = Math.min(...durees.map((d) => d.x)) - 20;
  const xMax = Math.max(...durees.map((d) => d.x)) + 20;
  const pasX = durees.length > 1 ? Math.abs(durees[1].x - durees[0].x) : 30;
  const dansLaPile = new Set(pile.map((m) => `${m.x}|${m.y}`));
  let ecartes = 0;
  const imprimes: { annees: number; tenor: string; v: number }[] = [];
  const candidats: { annees: number; tenor: string; v: number; ecart: number }[] = [];
  for (const m of nombres) {
    if (dansLaPile.has(`${m.x}|${m.y}`)) continue;
    if (m.x < xMin || m.x > xMax) continue;
    const v = Number(m.s.replace(",", "."));
    const d = durees.reduce((best, x) => (Math.abs(x.x - m.x) < Math.abs(best.x - m.x) ? x : best), durees[0]);
    if (Math.abs(d.x - m.x) > pasX * 0.6) continue;
    const annees = anneesDuTenor(d.s);
    if (annees == null) continue;
    candidats.push({ annees, tenor: d.s, v, ecart: v - pct(m.y) });
  }

  /**
   * LE CHIFFRE IMPRIMÉ EST POSÉ À CÔTÉ DE SON POINT, JAMAIS DESSUS, ET TOUJOURS
   * DU MÊME CÔTÉ.
   *
   * Son écart au repère n'est donc pas une erreur, c'est un décalage de mise en
   * page, le même pour toute la feuille. On prend la MÉDIANE de ces écarts, et
   * c'est seulement l'étiquette qui s'en éloigne qui est suspecte : celle qu'une
   * reconnaissance de caractères a mal lue, ou qu'on a rattachée à la mauvaise
   * durée. Le seuil fixe d'un point et demi, lui, rejetait les bons chiffres
   * d'une feuille au décalage un peu plus grand que les autres.
   */
  const ecarts = [...candidats.map((c) => c.ecart)].sort((a, b) => a - b);
  const median = ecarts.length ? ecarts[Math.floor(ecarts.length / 2)] : 0;
  for (const c of candidats) {
    if (Math.abs(c.ecart - median) > 0.8) {
      ecartes++;
      continue;
    }
    imprimes.push({ annees: c.annees, tenor: c.tenor, v: c.v });
  }

  /**
   * LE DOCUMENT VÉRIFIE NOTRE LECTURE.
   *
   * Là où les deux existent, le chiffre imprimé et le chiffre relevé sur le
   * tracé parlent de la même chose par deux chemins indépendants. S'ils
   * coïncident, le repère est juste ; s'ils divergent, c'est le repère qui est
   * faux et il faut le dire. Aucune autre source ne nous donne cela.
   */
  const controle: { compares: number; ecartMax: number } = { compares: 0, ecartMax: 0 };
  /**
   * ET LA TABLE ANNEXE EST UN TROISIÈME TÉMOIN.
   *
   * Quand elle est là, elle dit la même chose que le tracé par un chemin qui
   * ne doit rien à la géométrie : on les compare, puis on garde la table, qui
   * est écrite et dont l'appariement durée-valeur est imprimé, pas déduit.
   * Rendre la table SANS comparer faisait perdre soixante-quinze points de
   * vérification d'un coup.
   */
  if (pointsDeTable.length) {
    for (const p of points) {
      const t = pointsDeTable.find((x) => x.annees === p.annees);
      if (!t) continue;
      controle.compares++;
      controle.ecartMax = Math.max(controle.ecartMax, Math.abs(t.taux - p.taux));
    }
    return {
      ...direLaTable(),
      controle,
      reserves: [
        ...direLaTable().reserves,
        ...(controle.compares ? [`${controle.compares} de ces valeurs confirmées par le tracé, à ${controle.ecartMax.toFixed(2)} point près`] : []),
      ],
    };
  }
  if (points.length && imprimes.length) {
    for (const p of points) {
      const i = imprimes.find((x) => x.annees === p.annees);
      if (!i) continue;
      controle.compares++;
      controle.ecartMax = Math.max(controle.ecartMax, Math.abs(i.v - p.taux));
    }
    if (controle.compares) {
      /**
       * LE CHIFFRE IMPRIMÉ FAIT FOI, MAIS SEULEMENT QUAND IL CONFIRME.
       *
       * Il est écrit, donc exact, là où le relevé est converti : quand les
       * deux s'accordent, on prend l'écrit. Mais un chiffre imprimé est
       * APPARIÉ À SA DURÉE PAR SA POSITION, et cet appariement peut se
       * tromper là où le tracé, lui, porte son abscisse en lui-même. Un écart
       * de plus de trois dixièmes n'est donc pas une précision gagnée, c'est
       * une étiquette mal rattachée : on garde le tracé et on le dit.
       */
      for (const p of points) {
        const i = imprimes.find((x) => x.annees === p.annees && x.tenor === p.tenor);
        if (i) p.taux = i.v;
      }
      if (controle.ecartMax > 0.3) reserves.push(`le tracé s'écarte des chiffres imprimés de ${controle.ecartMax.toFixed(2)} point(s) au plus : ce sont les chiffres imprimés qui sont retenus`);
    }
  } else if (!points.length && imprimes.length && paysDuTitre) {
    for (const i of imprimes) points.push({ pays: paysDuTitre, tenor: i.tenor, annees: i.annees, taux: i.v });
    reserves.push(`${imprimes.length} valeur(s) lues telles qu'imprimées sur la feuille, le tracé n'étant pas vectoriel`);
  }
  if (ecartes) reserves.push(`${ecartes} chiffre(s) imprimé(s) écartés : leur hauteur dans le repère ne dit pas ce qu'ils disent`);

  /* Deux points pour une même durée sur une même courbe : le tracé repasse,
     et le second n'apporte rien. On garde le premier, et on le dit si les deux
     ne disent pas la même chose. */
  const vus = new Map<string, PointDeCourbe>();
  for (const p of points) {
    const clef = `${p.pays}|${p.annees}`;
    const avant = vus.get(clef);
    if (!avant) vus.set(clef, p);
    else if (Math.abs(avant.taux - p.taux) > 0.05) reserves.push(`${p.pays} à ${p.tenor} : deux valeurs tracées, ${avant.taux} % et ${p.taux} %`);
  }

  return { points: [...vus.values()].sort((a, b) => a.pays.localeCompare(b.pays) || a.annees - b.annees), legende: yLegende.map((m) => m.s), controle, reserves };
}
