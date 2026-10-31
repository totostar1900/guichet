import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { cequiManque, REGLEMENT_DEFAUT, reglementUtilisable, type CoordonneesDeReglement } from "@/lib/domain/reglement";

/**
 * LE COMPTE DE RÈGLEMENT : OÙ L'ARGENT DU CLIENT VA.
 *
 * Trois lignes qui étaient en dur — le bénéficiaire dans le code, la banque et
 * le RIB dans deux variables d'environnement — et que le desk écrit depuis le
 * 25 octobre 2026. Ces épreuves tiennent les quatre décisions qui coûteraient
 * cher à perdre :
 *
 *   LES POINTS DE SUSPENSION NE REVIENNENT PAS. « …………… (RIB à renseigner) »
 *   était un texte d'attente à l'endroit exact où un client tape un numéro de
 *   compte. Un client qui le recopie fait un virement qui n'arrive nulle part,
 *   et personne ne le sait avant que son argent manque.
 *
 *   LES PIÈCES NE LISENT PLUS LA CONFIGURATION. Les coordonnées passent par le
 *   contexte du document, et le compilateur refuse donc un appel de fonds qui
 *   s'imprimerait sans elles. Un registre installé au chargement aurait laissé
 *   passer en silence le chemin qui aurait oublié de le charger.
 *
 *   ENREGISTRER NE PUBLIE PAS, et PUBLIER N'EST PAS LA MÊME MAIN. C'est la
 *   seule défense qui vaille contre la fraude au virement : un faux RIB arrive
 *   toujours par une seule main pressée.
 *
 *   ET CE QUI MANQUE SE NOMME, des deux côtés — l'écran du client dit qu'il n'y
 *   a rien à recopier, la pièce dit « à demander au desk ».
 */
const ROOT = resolve(__dirname, "../..");
const lire = (f: string) => readFileSync(f, "utf8");
const code = (f: string) =>
  lire(f)
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const PAGE_CLIENT = "src/app/moi/provision/alimenter/page.tsx";
const ACTIONS = "src/app/desk/referentiel/reglement/actions.ts";
const PAGE_DESK = "src/app/desk/referentiel/reglement/page.tsx";
const TEMPLATES = "src/lib/documents/pdf/templates.tsx";
const FONDS = "src/lib/documents/pdf/fund-templates.tsx";

const plein: CoordonneesDeReglement = { beneficiaire: "Purpose Capital S.A.", banque: "Banque d'essai", rib: "10033 00001 12345678901 97" };

describe("ce qui manque aux coordonnées de règlement", () => {
  it("ne compte rien quand les trois lignes obligatoires sont là", () => {
    expect(cequiManque(plein)).toEqual([]);
    expect(reglementUtilisable(plein)).toBe(true);
  });

  it("nomme chaque ligne manquante, dans l'ordre du formulaire de banque", () => {
    expect(cequiManque({ beneficiaire: "", banque: "", rib: "" })).toEqual(["Bénéficiaire", "Banque du bénéficiaire", "RIB / IBAN"]);
    expect(cequiManque({ ...plein, rib: "" })).toEqual(["RIB / IBAN"]);
    /* Des espaces ne sont pas un RIB : un champ rempli d'un blanc passerait le
       contrôle et s'imprimerait vide sur l'appel de fonds. */
    expect(cequiManque({ ...plein, banque: "   " })).toEqual(["Banque du bénéficiaire"]);
    expect(reglementUtilisable({ ...plein, rib: "" })).toBe(false);
  });

  it("ne compte pas le BIC, qui est facultatif", () => {
    /* Le compter ferait tenir tout le chemin du virement pour fermé dans une
       maison qui ne reçoit que des virements de la zone. */
    expect(cequiManque({ ...plein, bic: undefined })).toEqual([]);
    expect(reglementUtilisable({ ...plein, bic: undefined })).toBe(true);
  });
});

describe("le défaut du code", () => {
  /* LES POINTS DE SUSPENSION SONT PARTIS, et ils ne reviennent ni dans la
     configuration, ni dans le défaut qui en dérive. */
  it("ne porte plus de texte d'attente à la place d'un numéro de compte", () => {
    const config = lire("src/lib/config.ts");
    expect(config, "un texte d'attente est revenu dans les coordonnées de règlement").not.toMatch(/SETTLEMENT[\s\S]{0,400}…{3}/);
    for (const [quoi, v] of Object.entries({ banque: REGLEMENT_DEFAUT.banque, rib: REGLEMENT_DEFAUT.rib })) {
      expect(v, `le défaut de « ${quoi} » imite une valeur au lieu d'être vide`).not.toMatch(/…|renseigner|à remplir/i);
    }
    /* Non vacuité : le bénéficiaire, lui, EST livré par le code — sans quoi
       cette épreuve passerait sur un objet vide. */
    expect(REGLEMENT_DEFAUT.beneficiaire).toMatch(/Purpose Capital/);
  });

  it("se lit toujours des variables d'environnement, pour ne rien perdre d'un déploiement existant", () => {
    const config = lire("src/lib/config.ts");
    for (const clef of ["SETTLEMENT_BANK", "SETTLEMENT_IBAN", "SETTLEMENT_BIC"]) {
      expect(config, `${clef} n'est plus lue`).toContain(`process.env.${clef}`);
      expect(lire(".env.example"), `${clef} n'est pas nommée dans l'exemple`).toContain(clef);
    }
  });
});

describe("qui lit ces coordonnées", () => {
  /* LE COMPILATEUR GARDE LES PIÈCES, et c'est pour cela que les coordonnées
     passent par le contexte plutôt que par un import. Cette épreuve garde la
     décision elle-même : le jour où une pièce réimporte la configuration, le
     compilateur se tait de nouveau. */
  it("aucune pièce ne lit plus la configuration : tout passe par le contexte", () => {
    /* TOUT LE DOSSIER, ET NON LES DEUX FICHIERS QU'ON AVAIT EN TÊTE. Le mandat
       de prélèvement vit dans « kyc-templates » et imprimait encore
       « SETTLEMENT.bank » au bloc créancier : le 25 octobre 2026, le défaut
       étant devenu vide, cette ligne serait sortie blanche sur un document que
       la banque du client peut réclamer. La garde balaie donc le dossier. */
    const pieces = readdirSync(join(ROOT, "src/lib/documents/pdf")).filter((f) => f.endsWith(".tsx"));
    expect(pieces.length, "le dossier des pièces ne se lit plus").toBeGreaterThan(3);
    for (const f of pieces) {
      expect(code(`src/lib/documents/pdf/${f}`), `${f} relit SETTLEMENT : une pièce peut repartir avec le défaut du code`).not.toContain("SETTLEMENT");
    }
    for (const f of [TEMPLATES, FONDS]) {
      expect(code(f), `${f} relit SETTLEMENT : un appel de fonds peut repartir avec le défaut du code`).not.toContain("SETTLEMENT");
    }
    expect(code(TEMPLATES), "le contexte d'un document ne porte plus les coordonnées").toMatch(/reglement: CoordonneesDeReglement/);
    /* Et les trois endroits qui bâtissent ce contexte les chargent. */
    const gen = code("src/lib/documents/generate.ts");
    expect((gen.match(/reglement: await loadReglement\(\)|reglement: await loadReglement\(\),/g) ?? []).length, "un des contextes de document ne charge plus les coordonnées").toBeGreaterThanOrEqual(3);
  });

  it("la page du client les charge du desk, et ne lit plus la configuration", () => {
    const src = code(PAGE_CLIENT);
    expect(src, "la page du client relit SETTLEMENT").not.toContain("SETTLEMENT");
    expect(src, "la page ne charge plus les coordonnées publiées").toContain("await loadReglement()");
  });

  /* CE QUI MANQUE SE NOMME PLUTÔT QUE DE S'IMITER : sans RIB publié, la page
     ne montre pas trois lignes vides avec un bouton de recopie, elle dit qu'il
     n'y a rien à recopier — et elle garde le motif, qui est au client et ne
     dépend d'aucune coordonnée. */
  it("dit au client que rien n'est publié, au lieu de lui faire recopier du vide", () => {
    const src = code(PAGE_CLIENT);
    expect(src, "le chemin du virement ne distingue plus publié de non publié").toContain("reglementUtilisable(reglement)");
    expect(src, "l'avertissement du client a disparu").toContain("Les coordonnées ne sont pas encore publiées");
    /* Le motif paraît dans LES DEUX branches : deux occurrences de sa ligne. */
    expect((src.match(/styles\.ligneMotif/g) ?? []).length, "le motif ne survit pas aux deux branches").toBe(2);
  });

  it("une ligne absente se nomme aussi sur la pièce", () => {
    expect(code(TEMPLATES), "une case vide sur un appel de fonds passe pour une erreur d'impression").toContain("à demander au desk");
  });
});

describe("écrire le compte de règlement", () => {
  /* ENREGISTRER NE PUBLIE PAS. Le brouillon est tout le contrôle : s'il
     s'écrivait directement dans « data », une main seule changerait la
     destination de l'argent de toute la clientèle. */
  it("enregistre un brouillon, et jamais la valeur publiée", () => {
    const src = code(ACTIONS);
    const debut = src.indexOf("export async function enregistrerReglementAction");
    const enregistrer = src.slice(debut, src.indexOf("export async function publierReglementAction", debut));
    expect(enregistrer, "l'enregistrement n'écrit plus un brouillon").toContain("saveReferenceDraft");
    expect(enregistrer, "l'enregistrement publie directement : le second regard est contourné").not.toContain("upsertReference");
    expect(enregistrer, "l'enregistrement publie directement : le second regard est contourné").not.toContain("publishReference");
    /* Audité dès le brouillon : savoir qui a PROPOSÉ un RIB compte autant que
       savoir qui l'a publié, puisque c'est la proposition qui porte le
       numéro. */
    expect(enregistrer, "un RIB peut être proposé sans laisser de trace").toContain("audit(");
  });

  it("refuse qu'une main publie ce qu'elle a écrit, et le dit quand personne d'autre ne peut", () => {
    const src = code(ACTIONS);
    const publier = src.slice(src.indexOf("export async function publierReglementAction"));
    expect(publier, "la règle des quatre yeux a quitté la publication").toContain("quatreYeux(me,");
    expect(publier, "le geste passé seul ne se dit plus").toContain("direLeGestePasseSeul");
    expect(publier, "la comparaison se fait sur autre chose que la personne qui a écrit le brouillon").toMatch(/parQui === me\.name/);
    /* Un brouillon incomplet ne se publie pas : il laisserait une ligne vide
       sur l'écran du client et sur chaque appel de fonds. */
    expect(publier, "un brouillon incomplet peut être publié").toContain("cequiManque(brouillon)");
  });

  it("n'est ouvert qu'à un responsable, et laisse une trace à chaque geste", () => {
    const src = code(ACTIONS);
    expect((src.match(/requireResponsable\("\/desk\/referentiel\/reglement"\)/g) ?? []).length, "un des trois gestes n'exige plus un responsable").toBe(3);
    /* Les trois gestes — proposer, publier, jeter — laissent chacun un audit :
       un brouillon jeté en silence ressemble trait pour trait à une
       proposition qui n'a jamais existé. */
    for (const action of ["reglement.brouillon", "reglement.publier", "reglement.jeter"]) {
      expect(src, `« ${action} » ne s'audite plus`).toContain(action);
    }
  });

  /* LA CONFIRMATION SURVIT AU BROUILLON QU'ELLE CONFIRME. Relevé en jouant le
     parcours : le message de réussite vivait DANS le bloc du brouillon, et
     publier efface ce brouillon — donc le bloc, donc le message. La personne
     qui venait de changer la destination de l'argent de toute la clientèle ne
     lisait rien : la page se réécrivait en silence. */
  it("dit à celui qui publie que c'est fait, après que le brouillon a disparu", () => {
    const src = code("src/app/desk/referentiel/reglement/Form.tsx");
    const bloc = src.slice(src.indexOf("{brouillon && ("), src.indexOf("</>", src.indexOf("{brouillon && (")));
    expect(bloc, "la confirmation de publication est retournée dans le bloc qu'elle ne survit pas").not.toMatch(/pub\.ok \? t\(pub\.message\)/);
    expect(bloc, "le refus doit rester près du bouton qui l'a provoqué").toContain("!pub.ok");
    expect(src.slice(src.indexOf("{brouillon && (")), "la réussite ne se dit plus nulle part").toMatch(/pub\?\.ok && /);
  });

  /* UNE DATE DE PUBLICATION NE SE LIT PAS D'UNE LIGNE SANS VALEUR. Relevé en
     jouant le parcours : enregistrer un brouillon crée la ligne du référentiel
     avec sa date, et « data » reste nul — la page annonçait donc « Publié le
     25 octobre » sous quatre lignes vides. Une date fausse sur le panneau qui
     dit « ce que les clients lisent » est pire que pas de date. */
  it("n'annonce une publication que lorsqu'il y a une valeur publiée", () => {
    const src = code(PAGE_DESK);
    expect(src, "la date de publication se lit de nouveau de « updatedAt » seul").not.toMatch(/row\?\.updatedAt \?/);
    expect(src, "la date de publication ne tient plus à l'existence d'une valeur").toMatch(/row\?\.data != null/);
  });

  it("la page du desk montre ce qui est en ligne avant de le changer", () => {
    const src = code(PAGE_DESK);
    expect(src, "la page ne montre plus les coordonnées en vigueur").toContain("Ce que les clients lisent en ce moment");
    expect(src, "la page ne nomme plus ce qui manque").toContain("cequiManque(actuel)");
    /* Et elle se trouve : une page que le desk ne peut pas ouvrir n'existe
       pas, et c'est exactement ce qui est arrivé aux neuf services invisibles. */
    expect(lire("src/lib/desk-groupes.ts"), "la page n'est plus dans la navigation du desk").toContain('"/desk/referentiel/reglement"');
  });
});
