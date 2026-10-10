import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ANS_D_ECART,
  correspondances,
  ecartVivant,
  estMotifDEcart,
  memePiece,
  MOTIFS_D_ECART,
  termeParDefaut,
  type Ecarte,
  type PersonneDuDossier,
} from "@/lib/domain/registre-ecartes";

/**
 * UNE MESURE VIT SUR UN COMPTE, ET FERMER LE COMPTE L'EFFACE.
 *
 * Ce registre est ce qui reste quand le compte part. Ces cas tiennent ce
 * qu'il attrape, ce qu'il laisse volontairement passer, et les deux choses
 * qu'il ne fera jamais : décider, et parler d'un soupçon.
 */
const MAINTENANT = new Date("2026-10-10T12:00:00.000Z");
const lire = (p: string) => readFileSync(p, "utf8");

const ecarte = (over: Partial<Ecarte> = {}): Ecarte => ({
  id: "e1",
  nom: "Jean-Pierre Onana",
  naissance: "1984-03-12",
  pieceType: "CNI",
  pieceNumero: "123456789",
  motif: "fraude_averee",
  par: "Georges",
  le: "2026-10-01T09:00:00.000Z",
  jusquAu: "2031-10-01",
  ...over,
});

const personne = (over: Partial<PersonneDuDossier> = {}): PersonneDuDossier => ({ role: "le titulaire", nom: "Jean-Pierre Onana", naissance: "1984-03-12", pieceType: "CNI", pieceNumero: "123456789", ...over });

describe("ce que le registre attrape", () => {
  it("le même numéro, quelle que soit sa ponctuation", () => {
    expect(memePiece({ pieceNumero: "P 0456789" }, { pieceNumero: "p0456789" })).toBe(true);
    expect(memePiece({ pieceType: "CNI", pieceNumero: "123" }, { pieceType: "cni", pieceNumero: "123" })).toBe(true);
    // Deux pays numérotent leurs cartes de la même façon sans parler des mêmes gens.
    expect(memePiece({ pieceType: "CNI", pieceNumero: "123" }, { pieceType: "Passeport", pieceNumero: "123" })).toBe(false);
    /* UN TYPE MANQUANT NE CONTREDIT RIEN : un dossier porte le type pour son
       titulaire et pas pour un mandataire, et exiger le type ferait un
       registre qui n'attrape jamais l'homme revenu comme mandataire, c'est à
       dire le cas même qu'on vise. */
    expect(memePiece({ pieceNumero: "123" }, { pieceType: "CNI", pieceNumero: "123" })).toBe(true);
  });

  it("et celui qui revient avec une pièce neuve, par son nom ET sa date de naissance", () => {
    const hits = correspondances([ecarte()], [personne({ pieceType: "Passeport", pieceNumero: "P999" })], MAINTENANT);
    expect(hits).toHaveLength(1);
    expect(hits[0].niveau).toBe("ressemblance");
  });

  it("le nom seul n'accroche rien, et c'est voulu", () => {
    // « Jean Nguema » accrocherait tous les Jean Nguema du pays, et un drapeau
    // qui se lève toujours cesse d'être lu.
    expect(correspondances([ecarte({ naissance: undefined })], [personne({ naissance: undefined, pieceNumero: "AUTRE" })], MAINTENANT)).toHaveLength(0);
    expect(correspondances([ecarte()], [personne({ naissance: "1990-01-01", pieceNumero: "AUTRE" })], MAINTENANT)).toHaveLength(0);
  });

  it("les accents et la casse ne distinguent personne", () => {
    const hits = correspondances([ecarte({ nom: "JEAN-PIERRE ONANA" })], [personne({ nom: "jean-pierre onana", pieceNumero: "AUTRE" })], MAINTENANT);
    expect(hits).toHaveLength(1);
  });
});

describe("une inscription finit", () => {
  it("elle tombe d'elle-même à son terme", () => {
    expect(ecartVivant(ecarte({ jusquAu: "2026-10-09" }), MAINTENANT)).toBe(false);
    expect(ecartVivant(ecarte({ jusquAu: "2026-10-10" }), MAINTENANT)).toBe(true);
    expect(correspondances([ecarte({ jusquAu: "2026-10-09" })], [personne()], MAINTENANT)).toHaveLength(0);
  });

  it("une levée n'accroche plus, et n'est pas supprimée pour autant", () => {
    const leve = ecarte({ leveeLe: "2026-10-05T10:00:00.000Z", leveePar: "Georges", leveeMotif: "dette réglée" });
    expect(ecartVivant(leve, MAINTENANT)).toBe(false);
    // La ligne reste : c'est la seule façon de répondre à quelqu'un qui
    // demande pourquoi il a été refusé l'an dernier.
    expect(leve.leveeMotif).toBe("dette réglée");
  });

  it("cinq ans par défaut, sauf les trois motifs qui peuvent ne pas finir", () => {
    expect(ANS_D_ECART).toBe(5);
    expect(termeParDefaut("fraude_averee", MAINTENANT)).toBe("2031-10-10");
    for (const m of ["declaration_anif", "sanctions", "demande_de_la_personne"] as const) {
      expect(MOTIFS_D_ECART[m].sansTerme, m).toBe(true);
      expect(termeParDefaut(m, MAINTENANT), m).toBeUndefined();
    }
  });
});

describe("ce que le registre ne fera jamais", () => {
  it("décider : rien dans le code ne refuse une approbation sur une correspondance", () => {
    const a = lire("src/app/desk/clients/actions.ts");
    /* Le garde EXIGE une phrase, il ne refuse pas : une homonymie n'est pas
       une fraude. Et il n'est pas décoratif pour autant : sans la phrase,
       l'approbation ne passe pas. */
    expect(a).toContain("correspondancesDuDossier(f)");
    expect(a).toContain("registre.passe_outre");
    expect(a).toMatch(/dit\.length < 20/);
  });

  it("parler d'un soupçon : quatre motifs sur six ne se disent pas", () => {
    const tus = Object.entries(MOTIFS_D_ECART).filter(([, v]) => v.conformite);
    expect(tus.map(([k]) => k).sort()).toEqual(["declaration_anif", "faux_documents", "fraude_averee", "sanctions"]);
    // Le journal du desk se relit à vingt : un soupçon écrit en clair dans un
    // fil commun finit par se savoir.
    expect(lire("src/app/desk/referentiel/registre/actions.ts")).toContain("motif de conformité");
  });

  it("et la publication demande une seconde personne", () => {
    const a = lire("src/app/desk/referentiel/registre/actions.ts");
    expect(a).toContain("quatreYeux(me,");
    expect(a).toContain("direLeGestePasseSeul");
    // Écarter quelqu'un vaut une mesure posée d'avance : le mot se recopie aussi.
    expect(a).toContain('mot !== "publier"');
  });

  it("un motif hors liste n'existe pas", () => {
    expect(estMotifDEcart("fraude_averee")).toBe(true);
    expect(estMotifDEcart("il_me_deplait")).toBe(false);
    expect(estMotifDEcart(undefined)).toBe(false);
  });
});

describe("les mots qui passent par une variable sont traduits", () => {
  it("les six motifs et les quatre rôles", async () => {
    /* L'ANGLE MORT DU SCANNER : il ne voit que les littéraux écrits en toutes lettres, et
       ces mots-là arrivent par t(MOTIFS_D_ECART[k].libelle) et t(p.role).
       Un cliquet les tient, comme pour les crans de mesure. */
    const { EN_MORE } = await import("@/i18n/en-desk");
    const manquants: string[] = [];
    for (const v of Object.values(MOTIFS_D_ECART)) if (!EN_MORE[v.libelle]) manquants.push(v.libelle);
    for (const r of ["le titulaire", "représentant", "cotitulaire", "bénéficiaire effectif"]) if (!EN_MORE[r]) manquants.push(r);
    expect(manquants, `sans traduction :\n  ${manquants.join("\n  ")}`).toEqual([]);
  });

  it("et les rôles du registre sont bien ceux que le dossier porte", async () => {
    const { personnesDuDossier } = await import("@/lib/desk/registre-data");
    expect(typeof personnesDuDossier).toBe("function");
    // Le libellé vient de registre-data : si l'un change, l'autre cas tombe.
    expect(lire("src/lib/desk/registre-data.ts")).toContain('representant: "représentant"');
    expect(lire("src/lib/desk/registre-data.ts")).toContain('role: "le titulaire"');
  });
});

describe("une inscription muette serait pire que pas d'inscription", () => {
  it("sans numéro de pièce, la date de naissance est obligatoire", () => {
    // Le desk croirait la personne écartée et elle ne le serait pas.
    expect(lire("src/app/desk/referentiel/registre/actions.ts")).toMatch(/!pieceNumero && !naissance/);
  });
});
