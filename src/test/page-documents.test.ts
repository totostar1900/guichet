import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { EN_ALL } from "@/i18n/core";

/**
 * MES DOCUMENTS : QUATRE RAYONS, UN PAPIER UN RAYON, UN GESTE PAR LIGNE.
 *
 * La page était un panneau unique où la convention, un avis d'opéré et un
 * relevé édité le matin même tombaient dans la même liste. Ces vérifications
 * tiennent ce qui a été décidé le 10 octobre 2026, et que rien à l'écran ne
 * rappellerait si cela se défaisait.
 */
const PAGE = "src/app/moi/documents/page.tsx";
const PLI = "src/components/Pli.tsx";
const LIGNE = "src/app/moi/documents/Ligne.tsx";
const OPS = "src/app/moi/documents/Operations.tsx";
const PIECE = "src/app/moi/documents/[id]/page.tsx";
const lire = (f: string) => readFileSync(f, "utf8");

describe("un papier, un rayon", () => {
  it("les trois familles nommées ne se recoupent pas", () => {
    /* Un document rangé dans deux rayons se lirait deux fois, et le total
       mentirait. Les trois listes sont donc disjointes, et le reste tombe
       dans les opérations. */
    const src = lire(PAGE);
    const famille = (nom: string) => {
      const m = src.match(new RegExp(`const ${nom}: DocumentType\\[\\] = \\[([^\\]]+)\\]`));
      return (m?.[1] ?? "").split(",").map((s) => s.trim().replace(/"/g, "")).filter(Boolean);
    };
    const [signes, argent, demarches] = [famille("SIGNES"), famille("ARGENT"), famille("DEMARCHES")];
    expect(signes.length).toBeGreaterThan(3);
    const tous = [...signes, ...argent, ...demarches];
    expect(new Set(tous).size, "un type de document rangé dans deux rayons").toBe(tous.length);
    // Un bulletin est un engagement avant d'être la pièce d'une opération.
    expect(signes).toContain("bulletin");
    expect(signes).toContain("convention");
  });

  it("le rayon des opérations prend ce qui reste, et lui seul", () => {
    expect(lire(PAGE)).toMatch(/!SIGNES\.includes\(d\.type\) && !ARGENT\.includes\(d\.type\) && !DEMARCHES\.includes\(d\.type\)/);
  });
});

describe("la grammaire des plis", () => {
  it("un pli dit toujours ce qu'il cache", () => {
    /* La leçon des plis : « un pli pose au lecteur la question y a-t-il
       quelque chose là-dedans à chaque ouverture ». La tête porte donc le
       compte, et la pastille quand un geste attend. */
    const src = lire(PLI);
    expect(src).toMatch(/compte\?: string/);
    expect(src).toMatch(/attend\?: string/);
    expect(src).toMatch(/\{compte && <span/);
    expect(src).toMatch(/\{attend && <span/);
  });

  it("et il se replie par une grille, sans mesurer de hauteur", () => {
    const css = lire("src/components/Pli.module.css");
    expect(css).toMatch(/grid-template-rows: 1fr/);
    expect(css).toMatch(/\[data-ouvert="non"\] > \.corps \{\s*grid-template-rows: 0fr/);
    // Une animation qu'on ne peut pas arrêter est une animation imposée.
    expect(css).toMatch(/prefers-reduced-motion/);
  });

  it("les trois filets sont trois, et ils viennent des jetons de la maison", () => {
    const pli = lire("src/components/Pli.module.css");
    const ligne = lire("src/app/moi/documents/Ligne.module.css");
    // la bande a un fond, le groupe un filet d'or, la ligne un filet nu
    expect(pli).toMatch(/\.bande \{[^}]*background: var\(--surface-2\)/);
    expect(pli).toMatch(/\.tete \{[^}]*border-bottom: 1px solid var\(--gold-line\)/);
    expect(ligne).toMatch(/\.ligne \{[^}]*border-bottom: 1px solid var\(--line\)/);
  });

  it("la bascule ne gouverne plus que le rayon des opérations", () => {
    /* Elle commandait la page entière : choisir « par date » désagrégeait
       aussi la convention et les mandats, qui n'ont jamais appartenu à une
       opération. */
    expect(lire(OPS)).toMatch(/Par opération/);
    expect(lire(PAGE)).not.toMatch(/Par date/);
  });
});

describe("une ligne porte au plus un geste", () => {
  it("la ligne n'accepte qu'un geste, et ne compte rien", () => {
    const src = lire(LIGNE);
    expect(src).toMatch(/geste\?: GesteDeLigne/);
    expect(src).not.toMatch(/gestes\?:/);
    // Aucun compteur ici : l'accueil est seul à compter les devoirs.
    expect(src).not.toMatch(/compte\?:|\{compte/);
  });

  it("et les gestes sont ceux que le papier attend", () => {
    const src = lire(PAGE);
    /* L'appel se compose, il ne s'écrit pas : le scanner de clefs lit tout
       appel littéral au traducteur, y compris dans un test, et prendrait
       « ${geste} » pour une chaîne à traduire. */
    const appel = (k: string) => `label: ${"t"}(${JSON.stringify(k)})`;
    for (const geste of ["Signer", "Régler", "Modifier", "Contester", "Ouvrir"]) expect(src, geste).toContain(appel(geste));
  });
});

describe("ce qui entre, et ce qui reste dehors", () => {
  it("les trois mouvements d'argent qui n'étaient nulle part sont là", () => {
    const src = lire(PAGE);
    expect(src).toMatch(/listPayouts/);
    expect(src).toMatch(/listTirages/);
    expect(src).toMatch(/listCustodyNotices/);
    // Un tirage qui n'a rien demandé au client n'a rien à prouver.
    expect(src).toMatch(/x\.noticeSent \|\| x\.state === "remis"/);
  });

  it("les textes de la maison ne sont pas dans la liste, sauf ceux qu'on a acceptés", () => {
    /* Le pont : un texte général devient votre document le jour où vous
       l'acceptez. Ce qui n'a jamais été signé vit dans la feuille du compte. */
    const src = lire(PAGE);
    expect(src).toMatch(/consent\.version && \(/);
    expect(src).toMatch(/href="\/moi\/textes"/);
    const textes = lire("src/app/moi/textes/page.tsx");
    // Un sommaire, pas une copie : chaque texte renvoie là où il vit déjà.
    for (const ou of ["/info/mentions", "/info/risques", "/moi/tarifs", "/moi/services"]) expect(textes, ou).toContain(ou);
  });
});

describe("la pièce ouverte", () => {
  it("revient d'où l'on vient, et seulement vers l'intérieur", () => {
    const src = lire(PIECE);
    expect(src).toMatch(/de\.startsWith\("\/"\) && !de\.startsWith\("\/\/"\)/);
    expect(lire(PAGE)).toMatch(/\?de=\$\{encodeURIComponent/);
  });

  it("dit ce qu'elle prouve, et donne ses voisines", () => {
    const src = lire(PIECE);
    expect(src).toMatch(/Il porte votre \{op\} de \{m\} sur/);
    expect(src).toMatch(/const avant = rang > 0/);
    expect(src).toMatch(/const apres = rang >= 0/);
  });
});

describe("ce que le scanner de clefs ne voit pas", () => {
  it("les nombres écrits en ternaire ont leur anglais", () => {
    /* Onze clefs vivent dans un ternaire au milieu de l'appel au traducteur :
       le scanner ne lit qu'un littéral, et elles resteraient en français. */
    const clefs = ["{n} documents", "{n} document", "{n} opérations", "{n} opération", "1 à signer", "{n} à signer", "1 à régler", "{n} à régler", "1 à faire", "{n} à faire"];
    for (const c of clefs) expect(EN_ALL[c], c).toBeTruthy();
  });
});
