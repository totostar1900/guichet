import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { cequiManque, enAttenteDOuverture } from "@/lib/domain/ouverture";
import { orderChecks } from "@/lib/domain/checks";
import type { ClientFile } from "@/lib/domain/kyc";
import type { Offer } from "@/lib/domain/types";

/**
 * UN ÉTAT MACHINE NE SE LOGE PAS DANS UN TEXTE LIBRE.
 *
 * Pendant des semaines, un ordre sur titre partait avec « [compte-titres à
 * ouvrir] » écrit EN TÊTE DU MESSAGE DU CLIENT, et la fiche du desk le
 * relisait avec une expression régulière. Trois défauts dans un seul geste.
 *
 *   IL MENTAIT DÈS LE LENDEMAIN. Le marqueur était figé à la création de
 *   l'intention ; le sous-compte s'ouvrait le surlendemain, et la fiche
 *   continuait d'annoncer une attente qui n'existait plus.
 *
 *   IL SE COMPARAIT DE TRAVERS. L'écriture produisait « [dossier à ouvrir] »
 *   pour une part d'OPCVM et « [compte-titres à ouvrir] » pour un titre ; la
 *   lecture ne cherchait que le second. Une souscription dont le dossier
 *   n'était pas approuvé ne déclenchait donc aucun avertissement.
 *
 *   IL SALISSAIT LE MESSAGE DU CLIENT. Ce champ est ce que la personne a
 *   écrit ; y préfixer un code de la maison le rend faux comme pièce.
 *
 * L'état se calcule maintenant des deux côtés à partir de `ouverture.ts`, et
 * ce cliquet garde le chemin fermé : la tentation de réécrire un marqueur
 * revient dès qu'on a besoin d'un drapeau et qu'un champ texte traîne.
 */
const RACINE = path.resolve(__dirname, "..");

function fichiers(dossier: string, out: string[] = []): string[] {
  for (const e of readdirSync(dossier)) {
    const p = path.join(dossier, e);
    if (statSync(p).isDirectory()) {
      if (e === "test" || e === "node_modules") continue;
      fichiers(p, out);
    } else if (/\.tsx?$/.test(e)) out.push(p);
  }
  return out;
}

describe("le marqueur d'ouverture n'existe plus", () => {
  it("personne ne l'écrit dans un message, personne ne le relit", () => {
    const fautifs: string[] = [];
    for (const f of fichiers(RACINE)) {
      const src = readFileSync(f, "utf8");
      const rel = path.relative(RACINE, f).replace(/\\/g, "/");
      // `ouverture.ts` le cite dans son commentaire d'histoire : c'est sa place.
      if (rel === "lib/domain/ouverture.ts") continue;
      if (/\[(compte-titres|dossier) à ouvrir\]/.test(src)) fautifs.push(`${rel} (l'écrit)`);
      if (/compte-titres à ouvrir\/\.test|\/compte-titres à ouvrir\//.test(src)) fautifs.push(`${rel} (le relit)`);
    }
    expect(fautifs, "un état machine logé dans un texte libre finit par se comparer de travers").toEqual([]);
  });

  it("et le desk lit l'état calculé", () => {
    const src = readFileSync(path.join(RACINE, "app/desk/intentions/[id]/page.tsx"), "utf8");
    expect(src).toMatch(/needsAccount: Boolean\(cequiManque\(it\.type, file\)\)/);
  });
});

const fiche = (p: Partial<ClientFile> = {}): ClientFile =>
  ({
    id: "k1",
    userId: "u1",
    kind: "physique",
    status: "approuve",
    identity: { name: "G. N." },
    persons: [],
    documents: [],
    funds: { pep: false },
    profile: { category: "non_professionnel" },
    consents: { conventionAt: "2026-10-09T08:00:00.000Z" },
    review: {},
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
    ...p,
  }) as ClientFile;

describe("l'état calculé suit le dossier, au lieu de le figer", () => {
  it("cesse d'attendre le jour où le sous-compte s'ouvre", () => {
    expect(enAttenteDOuverture("ferme", fiche())).toBe(true);
    expect(enAttenteDOuverture("ferme", fiche({ review: { custodianAccount: "CT-00412" } }))).toBe(false);
    // Une part d'OPCVM n'a jamais attendu un compte-titres.
    expect(enAttenteDOuverture("souscription", fiche())).toBe(false);
  });

  it("voit aussi le dossier non approuvé, que le marqueur manquait", () => {
    expect(cequiManque("souscription", fiche({ status: "soumis" }))).toBe("dossier à approuver et convention à accepter");
    expect(cequiManque("souscription", fiche())).toBeUndefined();
  });
});

describe("l'avertissement dit ce qui manque vraiment", () => {
  /* Annoncer un compte-titres à quelqu'un qui souscrit des parts lui fait
     chercher une ouverture qui n'aura jamais lieu. */
  const offre = { id: "o1", kind: "FONDS", title: "FCP", issuer: "X", status: "published", fund: { manager: "M", nav: 10_000, navDate: "2026-10-01", minAmount: 50_000 } } as unknown as Offer;
  const titre = { id: "o2", kind: "OTA", title: "OTA", issuer: "Trésor", status: "published", nominal: 10_000, minTitles: 1 } as unknown as Offer;

  it("parle du dossier pour une part, du compte-titres pour un titre", () => {
    const part = orderChecks(offre, "souscription", 100_000, null, { needsAccount: true }).find((c) => c.key === "account");
    expect(part?.text).toMatch(/dossier doit être approuvé/);
    const sur = orderChecks(titre, "ferme", 1_000_000, null, { needsAccount: true }).find((c) => c.key === "account");
    expect(sur?.text).toMatch(/compte-titres doit être ouvert/);
  });

  it("et se tait quand rien ne manque", () => {
    expect(orderChecks(titre, "ferme", 1_000_000, null, {}).find((c) => c.key === "account")).toBeUndefined();
  });
});
