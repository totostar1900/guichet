import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { accesVivant, clefDeCanal, direLAcces, peutRecevoirUnAcces, refusDAcces, ROLES_QUI_AGISSENT, type AccesCompte } from "@/lib/domain/acces-nomme";

/**
 * L'ACCÈS NOMMÉ : QUI AGIT SUR UN COMPTE QUI N'EST PAS UNE PERSONNE PHYSIQUE.
 *
 * Un compte porte un identifiant, donc une connexion, et deux ou trois
 * personnes la partageaient. Ces cas tiennent les trois choses qui font que
 * le socle vaut quelque chose : seuls ceux qui peuvent agir reçoivent un
 * accès, le compte ne bouge pas sous la personne, et chaque geste porte le
 * nom de la main qui l'a fait.
 */
const lire = (p: string) => readFileSync(p, "utf8");

const acces = (over: Partial<AccesCompte> = {}): AccesCompte => ({
  id: "a1",
  compteUserId: "compte-1",
  nom: "Jean-Pierre Onana",
  role: "representant",
  canal: "phone",
  canalValeur: "+237600000099",
  accordePar: "Georges",
  accordeLe: "2026-10-11T09:00:00.000Z",
  ...over,
});

describe("qui peut recevoir un accès", () => {
  it("un représentant légal et un cotitulaire désigné, pas un bénéficiaire effectif", () => {
    // Détenir plus de 25 % n'est pas agir.
    expect([...ROLES_QUI_AGISSENT]).toEqual(["representant", "cotitulaire"]);
    expect(peutRecevoirUnAcces("representant")).toBe(true);
    expect(peutRecevoirUnAcces("cotitulaire")).toBe(true);
    expect(peutRecevoirUnAcces("beneficiaire_effectif")).toBe(false);
    expect(refusDAcces({ nom: "A. M.", role: "beneficiaire_effectif", canal: "phone", valeur: "+237600000099" })).toContain("détenir plus de 25 %");
  });

  it("et seulement une personne que le dossier déclare", () => {
    /* Taper un nom libre reviendrait à faire entrer quelqu'un que le dossier
       ne connaît pas, c'est à dire à recréer la procuration par la porte de
       service. L'action cherche la personne dans le dossier. */
    const a = lire("src/app/desk/clients/acces-actions.ts");
    expect(a).toContain("f.persons.find((p) => p.name === nom)");
    expect(a).toContain("n'est pas déclarée au dossier");
    // Et l'écran ne paraît pas du tout sur un compte de personne physique.
    expect(a).toContain('f.kind === "physique"');
    expect(lire("src/app/desk/clients/page.tsx")).toContain('selected.kind !== "physique" && (');
  });
});

describe("le canal est la clef, et il se compare sur ce qui compte", () => {
  it("un numéro sur ses chiffres, une adresse en minuscules", () => {
    expect(clefDeCanal("phone", "+237 6 00 00 00 99")).toBe("+237600000099");
    expect(clefDeCanal("phone", "237600000099")).toBe("+237600000099");
    expect(clefDeCanal("email", "  Jean@Exemple.CM ")).toBe("jean@exemple.cm");
  });

  it("une faute de frappe ne pose pas un accès que personne n'ouvrira", () => {
    // Un accès muet est pire que pas d'accès : le desk le croit donné.
    expect(refusDAcces({ nom: "Jean-Pierre Onana", role: "representant", canal: "phone", valeur: "6000" })).toContain("trop court");
    expect(refusDAcces({ nom: "Jean-Pierre Onana", role: "representant", canal: "email", valeur: "pas-une-adresse" })).toContain("adresse");
    expect(refusDAcces({ nom: "Jean-Pierre Onana", role: "representant", canal: "phone", valeur: "+237600000099" })).toBeUndefined();
  });

  it("et deux comptes ne partagent pas un canal", () => {
    /* Sinon la personne reçoit un code sans savoir de quel compte il parle.
       Le refus nomme l'autre accès plutôt que de laisser remonter une
       erreur de base. */
    const a = lire("src/app/desk/clients/acces-actions.ts");
    expect(a).toContain("accesParCanal(clef)");
    expect(a).toContain("ouvre déjà un accès, au nom de");
    expect(lire("supabase/migrations/0085_acces_nomme.sql")).toContain("acces_compte_canal_vivant");
  });
});

describe("la session change de compte, jamais en silence", () => {
  it("elle ne cherche un accès que pour une personne sans dossier à elle", () => {
    /* Un client qui a son propre compte y reste, quoi qu'il arrive : il ne
       peut pas se retrouver chez un autre par un numéro mal saisi. */
    const s = lire("src/lib/auth/index.ts");
    expect(s).toContain("if (await r.getClientFileByUser(s.userId)) return s;");
    // Le compte devient celui de l'accès, et la personne est gardée à part.
    expect(s).toContain("userId: acces.compteUserId");
    expect(s).toContain("agissant: { accesId: acces.id, nom: acces.nom, role: acces.role }");
  });

  it("un canal non prouvé n'ouvre rien", () => {
    // Un e-mail prouve l'adresse, un code prouve le numéro. Un numéro tapé
    // et jamais confirmé ne prouve rien.
    expect(lire("src/lib/auth/index.ts")).toContain('s.phoneVerified && s.phone ? clefDeCanal("phone", s.phone)');
  });

  it("et un accès révoqué n'ouvre plus rien", () => {
    expect(accesVivant(acces())).toBe(true);
    expect(accesVivant(acces({ revoqueLe: "2026-10-11T10:00:00.000Z" }))).toBe(false);
    expect(lire("src/lib/auth/index.ts")).toContain("if (!acces || acces.revoqueLe || acces.personneUserId !== s.userId) return s;");
  });

  it("une lecture qui échoue ne déconnecte personne", () => {
    /* Sans accès, la session reste celle de la personne, et c'est le cas de
       l'immense majorité des clients : une table en panne ne doit pas les
       sortir tous. */
    const s = lire("src/lib/auth/index.ts");
    expect(s.slice(s.indexOf("async function résoudreLAcces"))).toMatch(/catch \{[\s\S]*?return s;/);
  });
});

describe("chaque geste porte le nom de la main qui l'a fait", () => {
  it("le registre des gestes", () => {
    expect(lire("src/lib/journal.ts")).toContain("agissant: detail.userId ? undefined : session?.agissant?.nom");
    expect(lire("supabase/migrations/0086_geste_agissant.sql")).toContain("add column if not exists agissant");
  });

  it("l'audit", () => {
    expect(lire("src/lib/audit.ts")).toContain("actor = detail.actor ?? s.agissant?.nom ?? s.email ?? s.name;");
  });

  it("et la personne sait sur quel compte elle agit", () => {
    // Une restriction qu'on découvre en butant dessus est une panne muette ;
    // croire qu'on est chez soi quand on est chez une société en est une pire.
    const dit = direLAcces("representant", "Société de démonstration SARL");
    expect(dit).toContain("Société de démonstration SARL");
    expect(dit).toContain("représentant légal");
    expect(dit).toContain("enregistré à votre nom");
    expect(direLAcces(undefined, "Qui que ce soit")).toBeUndefined();
    expect(lire("src/app/Console.tsx")).toContain("direLAcces(session.agissant?.role, session.name)");
  });
});

describe("le second regard est là où la place le met", () => {
  it("sur l'ouverture d'un accès, pas sur un ordre", () => {
    /* Un ordre est borné, réversible et tracé ; donner à quelqu'un la main
       sur un compte ne l'est pas. C'est la règle d'Interactive Brokers, et
       sa raison est bonne. */
    const a = lire("src/app/desk/clients/acces-actions.ts");
    const ouvre = a.indexOf("export async function accorderAccesAction");
    const ferme = a.indexOf("export async function revoquerAccesAction");
    expect(a.slice(ouvre, ferme)).toContain("quatreYeux(me,");
    // Retirer se fait d'une main : fermer une porte dans l'urgence ne s'attend pas.
    expect(a.slice(ferme)).not.toContain("quatreYeux(");
  });

  it("et un accès retiré reste dans l'histoire du compte", () => {
    const a = lire("src/app/desk/clients/acces-actions.ts");
    expect(a).toContain("revoquerAcces(id, me.name,");
    expect(a).toContain("Les gestes qu'il a faits restent à son nom.");
  });
});
