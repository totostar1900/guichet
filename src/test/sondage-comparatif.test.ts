import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import type { AuctionResult } from "@/lib/market/auction-results";
import { choixDeLAdresse, cleDeDuree, comparatifDeLigne } from "@/lib/domain/sondage-comparatif";
import { limitesDeSondage } from "@/lib/domain/gabarit";

const lire = (f: string) => fs.readFileSync(path.join(process.cwd(), f), "utf8");

const base = (p: Partial<AuctionResult>): AuctionResult =>
  ({
    id: p.id ?? Math.random().toString(36).slice(2),
    country: "Cameroun",
    instrument: "OTA",
    tenor: "5 ans",
    sessionOn: "2026-09-14",
    maturityOn: "2031-09-15",
    abondement: false,
    couponRate: 6.75,
    priceAvg: 95,
    priceMin: 95,
    priceMax: 95,
    confirmedBy: "Georges",
    sourceUrl: "https://exemple",
    sourceTitle: "communiqué",
    createdAt: "2026-09-15",
    updatedAt: "2026-09-15",
    ...p,
  }) as AuctionResult;

/** Une OTA à cinq ans adjugée le jour donné (échéance cinq ans plus tard, jour pour jour). */
const cinqAns = (id: string, d: string, over: Partial<AuctionResult> = {}) => base({ id, sessionOn: d, maturityOn: `${Number(d.slice(0, 4)) + 5}${d.slice(4)}`, ...over });
const quatreAns = (id: string, d: string, over: Partial<AuctionResult> = {}) => base({ id, tenor: "4 ans", sessionOn: d, maturityOn: `${Number(d.slice(0, 4)) + 4}${d.slice(4)}`, ...over });

const ligne = { instrument: "OTA" as const, country: "Cameroun" as const, tenor: "5 ans", rate: 6.5, pricePct: 95 };
const aujourdHui = "2026-11-03";

describe("le comparatif des séances passées d'une intention (3 novembre 2026)", () => {
  it("retient par défaut les séances du pays et de la durée exacte de la ligne, la plus récente d'abord, et en limite le nombre", () => {
    const h = ["2020-12-09", "2021-02-24", "2021-09-29", "2022-03-21", "2026-09-14", "2019-08-21"].map((d, i) => cinqAns(`s${i}`, d));
    const c = comparatifDeLigne(ligne, h, aujourdHui)!;
    expect(c.seances.map((s) => s.le)).toEqual(["2026-09-14", "2022-03-21", "2021-09-29", "2021-02-24", "2020-12-09"]);
    expect(c.trouvees, "le compte dit combien de séances le choix trouve, pas seulement combien sont montrées").toBe(6);
  });

  it("écarte un abondement, une séance écartée, une séance non relue et une séance future", () => {
    const h = [
      cinqAns("ok", "2026-09-14"),
      cinqAns("abond", "2026-06-01", { maturityOn: "2030-12-01" }),
      cinqAns("ecartee", "2026-05-01", { setAsideAt: "2026-05-02" }),
      cinqAns("nonrelue", "2026-04-01", { confirmedBy: undefined }),
      cinqAns("future", "2026-12-01"),
    ];
    expect(comparatifDeLigne(ligne, h, aujourdHui)!.seances.map((s) => s.id)).toEqual(["ok"]);
  });

  it("une durée exacte ne mêle pas deux lignes ; un panier les réunit", () => {
    const h = [cinqAns("cinq", "2026-09-14"), quatreAns("quatre", "2026-09-14", { couponRate: 6.5, priceAvg: 96 }), base({ id: "deux", tenor: "2 ans", sessionOn: "2026-05-01", maturityOn: "2028-05-01" })];
    expect(comparatifDeLigne(ligne, h, aujourdHui)!.seances.map((s) => s.id), "deux émissions du même jour se confondaient").toEqual(["cinq"]);
    const panier = comparatifDeLigne(ligne, h, aujourdHui, { pays: "Cameroun", duree: { type: "panier", nom: "4-5 ans" } })!;
    expect(panier.seances.map((s) => s.id).sort(), "un panier réunit ses durées et rien d'autre").toEqual(["cinq", "quatre"]);
    expect(panier.seances.find((s) => s.id === "quatre")!.tenor, "la durée est dite sur chaque séance").toBe("4 ans");
  });

  it("un seul pays à la fois : le pays choisi, jamais mêlé à celui de la ligne", () => {
    const h = [cinqAns("cm", "2026-09-14"), cinqAns("ga", "2026-08-01", { country: "Gabon" })];
    expect(comparatifDeLigne(ligne, h, aujourdHui)!.seances.map((s) => s.id)).toEqual(["cm"]);
    const gabon = comparatifDeLigne(ligne, h, aujourdHui, { pays: "Gabon", duree: { type: "exacte", annees: 5, libelle: "5 ans" } })!;
    expect(gabon.seances.map((s) => s.id)).toEqual(["ga"]);
  });

  it("dit les pays et les durées possibles, et une durée sans séance reste dans la liste avec zéro", () => {
    const h = [cinqAns("cm", "2026-09-14"), quatreAns("cm4", "2026-03-01"), cinqAns("ga", "2026-08-01", { country: "Gabon" })];
    const c = comparatifDeLigne(ligne, h, aujourdHui)!;
    expect(c.options.pays.map((p) => p.pays)).toEqual(["Cameroun", "Gabon"]);
    expect(c.options.exactes.map((e) => [e.annees, e.n])).toEqual([
      [4, 1],
      [5, 1],
    ]);
    const gabonSansQuatre = comparatifDeLigne(ligne, h, aujourdHui, { pays: "Gabon", duree: { type: "exacte", annees: 5, libelle: "5 ans" } })!;
    expect(gabonSansQuatre.options.exactes.find((e) => e.annees === 4)!.n, "une durée sans séance dans ce pays doit rester visible, grisée").toBe(0);
  });

  it("l'adresse est lue avec méfiance : un pays inconnu ou une durée absurde retombent sur la ligne", () => {
    expect(choixDeLAdresse(ligne, "Atlantide", "n'importe quoi")).toEqual({ pays: "Cameroun", duree: { type: "exacte", annees: 5, libelle: "5 ans" } });
    expect(choixDeLAdresse(ligne, "Gabon", "3 ans")).toEqual({ pays: "Gabon", duree: { type: "exacte", annees: 3, libelle: "3 ans" } });
    const p = choixDeLAdresse(ligne, undefined, "panier:4-5 ans");
    expect(p.duree).toEqual({ type: "panier", nom: "4-5 ans" });
    expect(cleDeDuree(p.duree), "la clef d'adresse d'un panier est préfixée").toBe("panier:4-5 ans");
    expect(choixDeLAdresse(ligne, undefined, "panier:inventé").duree.type, "un panier inconnu retombe sur la durée de la ligne").toBe("exacte");
  });

  it("compte les séances où le prix moyen servi respecte le prix max, sur au moins deux séances", () => {
    const h = [cinqAns("a", "2026-09-14", { priceAvg: 95 }), cinqAns("b", "2022-03-21", { priceAvg: 98.05 })];
    expect(comparatifDeLigne(ligne, h, aujourdHui)!.servies).toEqual({ n: 1, sur: 2 });
    expect(comparatifDeLigne(ligne, [h[0]], aujourdHui)!.servies, "une séance seule ne fonde aucun compte").toBeUndefined();
    expect(comparatifDeLigne({ ...ligne, pricePct: undefined }, h, aujourdHui)!.servies, "sans limite, aucun compte").toBeUndefined();
  });

  it("porte le coupon de la ligne adjugée, que le client compare au sien", () => {
    const c = comparatifDeLigne(ligne, [cinqAns("a", "2026-09-14", { couponRate: 6.75 })], aujourdHui)!;
    expect(c.seances[0].coupon).toBe(6.75);
    expect(c.limiteCoupon).toBe(6.5);
  });

  it("sur un bon, la limite est un taux minimum : le compte va dans l'autre sens, et il n'y a pas de coupon", () => {
    const bta = (id: string, d: string, taux: number) => base({ id, instrument: "BTA", tenor: "52 semaines", sessionOn: d, maturityOn: `${Number(d.slice(0, 4)) + 1}${d.slice(4)}`, rateAvg: taux, priceAvg: undefined, priceMin: undefined, priceMax: undefined, couponRate: undefined });
    const h = [bta("a", "2026-07-01", 5.5), bta("b", "2026-01-07", 4.9)];
    const c = comparatifDeLigne({ instrument: "BTA", country: "Cameroun", tenor: "52 semaines", rate: 5.2, pricePct: undefined }, h, aujourdHui)!;
    expect(c.unite).toBe("taux");
    expect(c.servies).toEqual({ n: 1, sur: 2 });
    expect(c.limiteCoupon).toBeUndefined();
    expect(c.seances[0].coupon).toBeUndefined();
  });

  it("se tait sans séance de cet instrument", () => {
    expect(comparatifDeLigne(ligne, [], aujourdHui)).toBeUndefined();
  });
});

describe("le prix de l'intention s'écrit, tel que le client l'a saisi (3 novembre 2026)", () => {
  const b = { tenor: "4 ans", seanceLe: "2026-12-01", dansJours: undefined, createdAt: "2026-10-01T00:00:00Z" };
  it("une OTA porte « prix max », un bon n'a pas de prix", () => {
    expect(limitesDeSondage({ ...b, instrument: "OTA", rate: 6.5, pricePct: 95 }).prix).toEqual({ valeur: "95 %" });
    expect(limitesDeSondage({ ...b, instrument: "OTA", rate: 6.5 }).prix).toBeUndefined();
    expect(limitesDeSondage({ ...b, instrument: "BTA", rate: 5.2, pricePct: 95 }).prix).toBeUndefined();
  });

  it("l'Accueil écrit le prix max, et le rendement équivalent n'y est qu'en gris entre parenthèses", () => {
    const d = lire("src/components/accueil/DossierAccueil.tsx");
    expect(d, "le prix max n'est plus écrit").toMatch(/\{t\("prix"\)\} \{t\("max"\)\} \{l\.limites\.prix\.valeur\}/);
    expect(d, "le rendement n'est plus un équivalent en gris").toMatch(/<span className=\{styles\.gris\}> \(≈ \{l\.limites\.rendement\.valeur\}\)<\/span>/);
  });

  it("la rangée du sondage écrit le prix max du client et le niveau indicatif de la maison", () => {
    const r = lire("src/app/sondage/RangeeDeSondage.tsx");
    expect(r, "le prix n'est plus écrit sur la rangée").toMatch(/\{t\("prix"\)\} \{mot\("max"\)\} \{lim\.prix\.valeur\}/);
    expect(r, "le rendement n'est plus un équivalent en gris").toMatch(/<span className=\{styles\.gris\}> \(≈ \{lim\.rendement\.valeur\}\)<\/span>/);
  });

  it("la page dédiée écrit le prix max dans les chiffres du client et le comparatif sous eux", () => {
    const p = lire("src/app/sondage/page.tsx");
    expect(p, "le prix max a quitté la bande de faits").toMatch(/\$\{t\("prix"\)\} \$\{role === "question" \? "ind\." : t\("max"\)\}/);
    expect(p, "la page dédiée ne lit plus les séances relues").toMatch(/listAuctionResults\(\{ instrument: choisie\.instrument, confirmed: true/);
    expect(p, "le chapitre de la place n'est plus conditionné au comparatif").toMatch(/\{cmp && \(\s*<section/);
    expect(p, "la page ne lit plus le pays et la durée de l'adresse").toMatch(/choixDeLAdresse\(choisie, pays, duree\)/);
  });
});

describe("la page dédiée : comparatif, boutons, listes (3 novembre 2026)", () => {
  it("le comparatif porte ses listes en tête, sa courbe à fourchette et son nuage en option, sans second tableau de pays", () => {
    const c = lire("src/app/sondage/ComparatifDesSeances.tsx");
    expect(c, "les listes pays et durée ne pilotent plus le comparatif").toMatch(/<SelecteursDeComparaison/);
    expect(c, "la mention du passé a disparu").toMatch(/t\("Les séances passées ne préjugent pas de la prochaine\."\)/);
    expect(c, "un chiffre non publié se lit de nouveau comme un tiret").toMatch(/t\("non publié"\)/);
    expect(c, "un tableau « autres pays » est revenu").not.toMatch(/<details|ailleurs/);
    expect(c, "quand aucune limite n'est fixée, l'écran ne le dit plus").toMatch(/le comparatif ne compte rien/);
    const g = lire("src/app/sondage/CourbeDesSeances.tsx");
    expect(g, "la frise séparée est revenue").not.toMatch(/function Frise/);
    expect(g, "la fourchette n'est plus sur la courbe").toMatch(/className=\{styles\.fourchette\}/);
    expect(g, "la limite n'est plus étiquetée sur la courbe").toMatch(/className=\{styles\.puce\}/);
    expect(g, "le nuage a disparu").toMatch(/function Nuage/);
    expect(g, "le sélecteur de mesure a disparu").toMatch(/aria-pressed=\{active === d\.m\}/);
  });

  it("les listes écrivent le choix dans l'adresse, sans empiler d'historique ni remonter la page", () => {
    const s = lire("src/app/sondage/SelecteursDeComparaison.tsx");
    expect(s, "le choix n'est plus dans l'adresse").toMatch(/router\.replace\(adresse\(p, d\), \{ scroll: false \}\)/);
    expect(s, "« revenir à ma ligne » a disparu").toMatch(/t\("Revenir à ma ligne"\)/);
  });

  it("« Modifier » est le bouton principal du détail et « Retirer » reste un lien", () => {
    const p = lire("src/app/sondage/page.tsx");
    expect(p, "« Modifier » n'est plus un bouton sur le détail").toMatch(/<ProposerMaLigne existante=\{modifiable\(m\)\} bouton/);
    const f = lire("src/app/sondage/Formulaires.tsx");
    expect(f, "le bouton « Modifier » n'est plus le bouton principal").toMatch(/className=\{bouton \? "btn primary" : styles\.lien\}/);
    expect(p, "la liste porte de nouveau « Modifier » et « Retirer »").not.toMatch(/<Retirer[^>]*\/>\s*<\/li>/);
  });

  it("une question du desk ouvre la même page, avec son niveau indicatif", () => {
    const p = lire("src/app/sondage/page.tsx");
    expect(p, "la page dédiée ne retrouve plus les questions du desk").toMatch(/questions\.find\(\(q\) => q\.id === ligne\)/);
    expect(p, "une question n'est plus lue comme une question").toMatch(/const role = duDesk && choisie === duDesk \? "question" : "attente"/);
    expect(lire("src/app/sondage/ComparatifDesSeances.tsx"), "la limite d'une question se lit encore « Votre limite »").toMatch(/role === "question" \? "Niveau indicatif" : "Votre limite"/);
  });

  it("les intentions closes sont repliées sous la liste, et la réponse rapide se déplie sous la rangée", () => {
    const p = lire("src/app/sondage/page.tsx");
    expect(p, "les closes ne sont plus repliées").toMatch(/<details className=\{styles\.closes\}>/);
    expect(p, "la réponse rapide a quitté la rangée").toMatch(/forme="sobre"/);
  });

  it("l'accusé de réception ne porte plus de lien « Voir le détail »", () => {
    const f = lire("src/app/sondage/Formulaires.tsx");
    expect(f, "le lien « Voir le détail » est revenu dans l'accusé").not.toMatch(/Voir le détail|LienDuDetail/);
    expect(lire("src/app/sondage/actions.ts"), "l'action rend de nouveau l'identifiant pour un lien").not.toMatch(/id: creee\.id/);
  });

  it("« Retirer » demande une seconde couche : elle nomme la ligne, dit la conséquence, et « Annuler » vient en premier avec le focus", () => {
    const f = lire("src/app/sondage/Formulaires.tsx");
    const r = f.slice(f.indexOf("export function Retirer"));
    expect(r, "la confirmation ne nomme plus la ligne retirée").toMatch(/t\("Retirer « \{l\} » \?", \{ l: libelle \}\)/);
    expect(r, "la confirmation ne dit plus ce que le retrait coûte").toMatch(/ne se reprend pas : il faudra la redire en entier/);
    expect(r, "« Annuler » n'a plus le focus").toMatch(/className="btn" disabled=\{pending\} autoFocus onClick=\{\(\) => setDemande\(false\)\}/);
    expect(r.indexOf('t("Annuler")'), "« Oui, retirer » vient de nouveau avant « Annuler »").toBeLessThan(r.indexOf('"Oui, retirer"'));
    expect(lire("src/app/sondage/page.tsx"), "la page ne passe plus le libellé de la ligne à « Retirer »").toMatch(/<Retirer id=\{m\.id\} ref_=\{m\.ref\} libelle=\{`\$\{gabaritDeSondage\(m\)\} · \$\{montantDe\(m\)\}`\} \/>/);
  });

  it("le nuage coupon × prix n'est plus masqué : il est toujours sous la courbe quand il y a de quoi le tracer", () => {
    const g = lire("src/app/sondage/CourbeDesSeances.tsx");
    expect(g, "le nuage est de nouveau derrière un bouton").not.toMatch(/aria-expanded|setNuage/);
    expect(g, "le nuage n'est plus rendu sous la courbe").toMatch(/\{unite === "prix" && pointsNuage\.length >= 1 \? \(\s*<Nuage /);
    expect(g, "le nuage disparaît de nouveau avec la courbe (retour anticipé)").not.toMatch(/if \(serie\.length < 2[^\n]*return null/);
    expect(g, "quand le nuage est vide, la page ne dit plus pourquoi").toMatch(/le nuage coupon × prix reste vide/);
  });

  it("les icônes des gestes de l'Accueil (+, −, ↗, ⋯) sont en or et en gras", () => {
    const css = lire("src/app/Console.module.css");
    const m = /\.rondGeste \{([^}]*)\}/.exec(css);
    expect(m, "« .rondGeste » est introuvable").not.toBeNull();
    expect(m![1], "les icônes des gestes ne sont plus en or").toMatch(/color:\s*var\(--gold-ink\);/);
    expect(m![1], "les icônes des gestes ne sont plus en gras").toMatch(/font-weight:\s*800;/);
  });

  it("une tuile de chiffres impaire s'étale sur les deux colonnes, et les listes de la page n'ont pas de seconde étiquette", () => {
    expect(lire("src/app/sondage/page.module.css"), "la dernière tuile impaire laisse de nouveau un trou").toMatch(/\.tuileChiffre:last-child:nth-child\(odd\) \{\s*grid-column: 1 \/ -1;/);
    expect(lire("src/app/sondage/SelecteursDeComparaison.tsx"), "les listes redisent leur nom dans le champ, au-dessus du même mot").not.toMatch(/label=\{t\("(Pays|Durée)"\)\}/);
  });

  it("une classe n'est plus écrite deux fois : « .question » et « .libelleChamp » ne se disputent plus la feuille", () => {
    const css = lire("src/app/sondage/page.module.css");
    expect(css, "« .question » est de nouveau défini").not.toMatch(/^\.question\b/m);
    expect(css, "l'habillage du libellé a perdu son nom").toMatch(/^\.libelleChamp \{/m);
  });

  it("une proposition de ligne ne porte qu'un seul Trésor, au formulaire comme au serveur, et garde ses durées multiples", () => {
    const f = lire("src/app/sondage/Formulaires.tsx");
    expect(f, "le formulaire laisse de nouveau cocher plusieurs Trésors").toMatch(/onClick=\{\(\) => setPays\(\[p\]\)\}/);
    expect(f, "le formulaire dit de nouveau « le ou les Trésors »").not.toMatch(/Le ou les Trésors/);
    expect(f, "les durées ne sont plus multiples").toMatch(/bascule\(tenors, setTenors, d\)/);
    expect(lire("src/app/sondage/actions.ts"), "le serveur accepte de nouveau plusieurs Trésors").toMatch(/if \(pays\.length > 1\) return \{ ok: false, error: "Une proposition porte un seul Trésor/);
  });
});
