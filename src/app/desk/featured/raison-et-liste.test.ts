import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const lire = (p: string) => fs.readFileSync(path.join(__dirname, p), "utf8");

/**
 * LA RAISON DE « À LA UNE » ET SA LISTE DE LIGNES (12 novembre 2026, à la demande du client).
 */
describe("la raison se choisit dans une vraie liste, et peut rester vide", () => {
  const f = lire("FeaturePanel.tsx");

  it("une liste de la maison remplace la liste native d'un champ texte, avec « Sans commentaire » et « Autre raison »", () => {
    expect(f).not.toMatch(/<datalist|list="feature-reasons"/);
    expect(f).toMatch(/\{ value: SANS_COMMENTAIRE, label: t\("Sans commentaire"\) \}/);
    expect(f).toMatch(/\{ value: AUTRE_RAISON, label: t\("Autre raison…"\) \}/);
    expect(f).toMatch(/<input type="hidden" name="reason" value=\{reason\} \/>/);
  });

  it("la raison peut être vide côté serveur, mais une raison écrite reste factuelle et d'au moins 4 caractères", () => {
    const a = lire("actions.ts");
    expect(a).toMatch(/v === "" \|\| v\.length >= 4/);
    expect(a).toMatch(/FORBIDDEN\.test\(p\.data\.reason\)/);
  });

  it("sans commentaire, la mise en garde « une sélection, pas un conseil » reste affichée", () => {
    const o = fs.readFileSync(path.join(__dirname, "../../../components/OfferBrowser.tsx"), "utf8");
    const note = o.slice(o.indexOf("function NoteDeSelection"));
    expect(note).toMatch(/if \(!o\.featured\) return null;/);
    expect(note).not.toMatch(/if \(!o\.featured\?\.reason\) return null;/);
    expect(note).toMatch(/Une sélection, pas un conseil/);
  });

  it("le message diffusé ne laisse pas un point seul quand il n'y a pas de raison", () => {
    const b = fs.readFileSync(path.join(__dirname, "../../../lib/notify/broadcast.ts"), "utf8");
    expect(b).toMatch(/\$\{motif \? ` \$\{motif\}\.` : ""\}/);
  });
});

describe("la liste des lignes propose toutes les lignes", () => {
  it("elle n'est plus coupée à huit : elle défile, et son en-tête dit combien elle en porte", () => {
    const f = lire("FeaturePanel.tsx");
    expect(f).not.toMatch(/\.slice\(0, 8\)/);
    expect(f).toMatch(/lignes ouvertes ou cotées/);
    expect(lire("FeaturePanel.module.css")).toMatch(/\.hits \{[^}]*overflow-y: auto/);
  });
});
