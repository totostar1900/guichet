import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const lire = (p: string) => fs.readFileSync(path.join(__dirname, p), "utf8");

/**
 * POSER UNE QUESTION ET LA CLORE SE FONT EN DEUX TEMPS ; « PORTER AU TRÉSOR » N'EXISTE PLUS (12 novembre 2026, à la demande du client).
 */
describe("le sondage du desk : deux temps pour poser et pour clore", () => {
  const f = lire("Formulaires.tsx");

  it("« Poser la question » ouvre une relecture : plus de bouton qui poste directement", () => {
    expect(f).toMatch(/<ConfirmPublish form=\{formId\} label=\{t\("Poser la question"\)\}/);
    expect(f.slice(f.indexOf("export function PoserUneQuestion"), f.indexOf("export function Statuer"))).not.toMatch(/type="submit"/);
  });

  it("la relecture redit la ligne, le montant, l'horizon et ce que les clients liront", () => {
    for (const mot of ["Question : {i}", "Montant cherché : {m} FCFA", "Ce que les clients liront", "dès maintenant sur la page de tous les clients"]) expect(f).toContain(mot);
  });

  it("« Clore » ouvre TOUJOURS une relecture, qui se valide par le mot « ok » : aucun motif n'est demandé", () => {
    const s = f.slice(f.indexOf("export function Statuer"));
    expect(s).toMatch(/<ConfirmPublish\s+form=\{formId\}\s+label=\{t\("Clore"\)\}/);
    expect(s).toContain("Les {n} réponses qui la suivent sont closes avec elle.");
    expect(s, "le mot à recopier est « ok »").toMatch(/typed="ok"/);
    expect(s, "plus aucun champ de motif").not.toMatch(/name="motif"/);
    expect(s).not.toMatch(/\n\s+disabled=/);
    expect(s).not.toMatch(/type="submit"/);
  });

  it("les montants des tableaux sont abrégés (milliards, millions) : un seul formateur, celui de la maison", () => {
    for (const fichier of ["Accumulation.tsx", "Questions.tsx", "Reponses.tsx"]) {
      const src = lire(fichier);
      expect(src, `${fichier} écrit un montant en toutes lettres de chiffres`).not.toMatch(/\bfmt\(/);
      expect(src).toMatch(/fmtUnits\(/);
    }
  });

  it("« Portée au Trésor » n'est plus un geste du desk, ni la section « À porter au Trésor », ni l'action de la tuile du Carnet", () => {
    expect(f).not.toMatch(/t\("Portée au Trésor"\)|setEtat\("consolidee"\)/);
    const page = lire("page.tsx");
    expect(page).not.toMatch(/À porter au Trésor|styles\.mur\b/);
    expect(lire("../today/today.ts")).not.toMatch(/porter au Trésor/);
  });

  it("une demande qui a franchi le seuil ne disparaît pas : la table de ce qui s'accumule les montre toutes, avec le seuil", () => {
    expect(lire("page.tsx")).toMatch(/groupes\.map\(\(c\) => \{[\s\S]*?mur\(c\)/);
    expect(lire("Accumulation.tsx")).toMatch(/x\.atteint \? t\("atteint"\) : t\("sous le seuil"\)/);
  });

  it("tout bouton qui écrit passe par une seconde question : la page Sondages n'a plus un seul envoi direct", () => {
    expect(f, "un bouton d'envoi direct est revenu dans les formulaires du sondage").not.toMatch(/type="submit"/);
    expect((f.match(/<ConfirmPublish/g) ?? []).length, "Poser la question et Clore").toBe(2);
  });
});

describe("« À la une » : les boutons qui écrivent passent par une seconde question", () => {
  const u = lire("../featured/FeaturePanel.tsx");
  it("« Mettre à la une » et « Retirer » ouvrent une relecture ; « Diffuser » garde la sienne", () => {
    expect((u.match(/<ConfirmPublish/g) ?? []).length, "Mettre à la une, Retirer, Diffuser").toBe(3);
    expect(u).toMatch(/label=\{t\("Mettre à la une"\)\}/);
    expect(u).toMatch(/label=\{t\("Retirer"\)\}/);
  });
  it("le seul envoi direct restant est « Voir qui serait prévenu » : il ne fait que compter, sans rien envoyer", () => {
    const directs = [...u.matchAll(/<button[^>]*type="submit"[^>]*>\s*\{t\(([^)]*)\)\}/g)].map((m) => m[1]);
    expect(directs).toHaveLength(1);
    expect(directs[0]).toMatch(/Voir qui serait prévenu/);
  });
});

describe("un geste qui fait disparaître ou apparaître une rangée ne reste pas muet", () => {
  it("clore redirige vers la page, qui écrit ce qui vient d'être fait", () => {
    expect(lire("actions.ts")).toMatch(/if \(etat === "close"\) redirect\(`\$\{PATH\}\?clos=/);
    const page = lire("page.tsx");
    expect(page).toMatch(/un\("clos"\) && \(\s*<Fait/);
  });
  it("mettre à la une et retirer font de même sur la page « À la une »", () => {
    const a = lire("../featured/actions.ts");
    expect(a).toMatch(/redirect\(`\/desk\/a-la-une\?mise=/);
    expect(a).toMatch(/redirect\(`\/desk\/a-la-une\?retiree=/);
    const p = lire("../a-la-une/page.tsx");
    expect(p).toMatch(/un\("mise"\) && \(/);
    expect(p).toMatch(/un\("retiree"\) && \(/);
  });
  it("le message est un composant « Fait » avec un lien pour le fermer : un rôle « status », lu par les lecteurs d'écran", () => {
    expect(fs.readFileSync(path.join(__dirname, "../../../components/desk/Fait.tsx"), "utf8")).toMatch(/role="status"/);
  });
});
