import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { hrefDeLecture, retourDeLectureSur, sourceDeLectureValide } from "@/lib/lecture";

const ROOT = process.cwd();
const lire = (f: string) => readFileSync(path.join(ROOT, f), "utf8");

/**
 * UN DOCUMENT SE LIT DANS L'APP, SUR UNE PAGE QUI NE MONTRE QUE LUI (15 novembre 2026, maquette « Lecteur » : 1B · 2B2 · 3 OK · 4 OK · 5 OK).
 *
 * Un lien qui ouvre un PDF « à part » est un aller simple dans l'app installée : fermer la lecture ferme l'app. Tout document du client passe par « /lire ».
 */
describe("l'adresse de lecture", () => {
  it("n'accepte que des adresses internes, d'une liste fermée", () => {
    for (const ok of ["/api/documents/abc-123", "/api/documents/mandat-apercu/m1", "/api/documents/ordre/i-017", "/pieces/ab12cd-ef", "/offres/rca-ota-a-2028/doc/0", "/offres/x1/fiche"]) expect(sourceDeLectureValide(ok), ok).toBe(true);
    for (const non of ["https://exemple.cm/x.pdf", "//exemple.cm/x.pdf", "/api/documents/../secret", "/moi/profil", "/api/cron/epargne", "/api/documents/", undefined, "javascript:alert(1)"]) expect(sourceDeLectureValide(non as string | undefined), String(non)).toBe(false);
  });

  it("ne renvoie le lecteur que chez lui", () => {
    expect(retourDeLectureSur("/moi/prelevements")).toBe("/moi/prelevements");
    expect(retourDeLectureSur("//mal.example")).toBe("/");
    expect(retourDeLectureSur("https://mal.example")).toBe("/");
    expect(retourDeLectureSur(undefined, "/moi/documents")).toBe("/moi/documents");
  });

  it("construit l'adresse avec le titre, la phrase fine et le retour", () => {
    const h = hrefDeLecture("/api/documents/mandat-apercu/m1", { titre: "Mandat MP-1", note: "Rien n'est engagé.", de: "/moi/prelevements" });
    const u = new URL(h, "https://x.test");
    expect(u.pathname).toBe("/lire");
    expect(u.searchParams.get("src")).toBe("/api/documents/mandat-apercu/m1");
    expect(u.searchParams.get("titre")).toBe("Mandat MP-1");
    expect(u.searchParams.get("note")).toBe("Rien n'est engagé.");
    expect(u.searchParams.get("de")).toBe("/moi/prelevements");
  });
});

describe("le lecteur", () => {
  const l = lire("src/app/lire/Lecteur.tsx");
  it("ne montre que le contenu : une barre fine et une croix qui ne ferme jamais l'app", () => {
    expect(l).toMatch(/onClick=\{fermer\}/);
    expect(l).toMatch(/const fermer = \(\) => reculer\(router, repli\);/);
    expect(l, "Échap ferme comme la croix").toMatch(/e\.key === "Escape"/);
    expect(l, "le verrou de défilement est celui de la maison").toMatch(/useVerrouDeDefilement\(true\)/);
    expect(l).not.toMatch(/window\.close|target="_blank"/);
  });
  it("garde la phrase de réassurance d'un document non signé", () => {
    expect(l).toMatch(/\{note && <p className=\{styles\.note\}>\{note\}<\/p>\}/);
    expect(lire("src/app/moi/prelevements/MesMandats.tsx")).toMatch(/Rien n'est engagé tant que vous n'avez pas saisi le code/);
    expect(lire("src/components/EpargneParcours.tsx")).toMatch(/Rien n'est engagé tant que vous n'avez pas saisi le code/);
  });
  it("le PDF passe par la visionneuse en lecture seule, la copie web par un cadre isolé", () => {
    expect(l).toMatch(/<SourceViewer src=\{src\} title=\{titre\} fill lecture \/>/);
    expect(l).toMatch(/<iframe[^>]*sandbox=""/);
    expect(lire("src/components/SourceViewer.tsx")).toMatch(/lecture \? styles\.lecture/);
  });
});

/**
 * LA GARDE : AUCUN LIEN DU CLIENT NE SORT DE L'APP VERS UN DOCUMENT.
 * Un lien vers un site extérieur passe par « LienExterne » (copier l'adresse dans l'app installée) ; un document de la maison, par « hrefDeLecture ».
 */
describe("aucun lien du client ne piège l'app installée", () => {
  const fichiers = (d: string): string[] =>
    readdirSync(path.join(ROOT, d), { withFileTypes: true }).flatMap((e) => {
      const p = `${d}/${e.name}`;
      if (e.isDirectory()) return d === "src/app" && e.name === "desk" ? [] : fichiers(p);
      return /\.tsx$/.test(e.name) ? [p] : [];
    });
  /* Les sorties qui restent à part : le lien d'une source extérieure au navigateur (LienExterne, SourceViewer, Sorties), WhatsApp, et l'aide qui n'a pas de document. */
  const PERMIS = new Set([
    "src/components/LienExterne.tsx",
    "src/components/SourceViewer.tsx",
    "src/app/moi/documents/[id]/Sorties.tsx",
    "src/components/menu/Pieces.tsx",
  ]);
  it("pas de « target=_blank » ni de « window.open » vers un document, une pièce ou une fiche PDF", () => {
    const fautifs: string[] = [];
    for (const f of [...fichiers("src/app"), ...fichiers("src/components")]) {
      if (PERMIS.has(f)) continue;
      const s = lire(f);
      for (const m of s.matchAll(/<a\b[^>]*>|window\.open\([^)]*\)/g)) {
        const t = m[0];
        if (!/target="_blank"|window\.open/.test(t)) continue;
        if (/\/api\/documents|\/pieces\/|\/doc\/|\/fiche|\.pdf/.test(t)) fautifs.push(`${f} · ${t.slice(0, 90)}`);
      }
    }
    expect(fautifs, `ces liens emportent l'app installée :\n  ${fautifs.join("\n  ")}`).toEqual([]);
  });
});
