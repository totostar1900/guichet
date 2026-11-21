import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { COMPTE_PAGES, PARAMETRES_PAGES } from "@/lib/nav-groups";

const lire = (f: string) => readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

/**
 * MON COMPTE EN QUATRE RUBRIQUES, UNE DONNÉE UNE FOIS (19 novembre 2026, planche « Compte, connexion et textes », 3A).
 * L'audit : l'e-mail et le téléphone en trois endroits, le canal de contact en trois, les alertes en deux, et « Sécurité » cachée derrière le menu du coin.
 */
describe("Mon compte, consolidé", () => {
  it("le sommaire a deux rubriques, « Mes pièces » et « Profil d'investisseur » ; « Profil et coordonnées » et « Mon dossier » n'existent plus (21 novembre 2026)", () => {
    expect(COMPTE_PAGES.map((p) => p.label)).toEqual(["Mes pièces", "Profil d'investisseur"]);
    expect(COMPTE_PAGES.some((p) => p.sousDe), "une rubrique est rangée sous une autre").toBe(false);
    expect(PARAMETRES_PAGES.map((p) => p.href), "Paramètres sort de Mon compte et a sa propre adresse").toEqual(["/parametres"]);
    expect(lire("src/app/moi/dossier/page.tsx"), "« Mon dossier » ne mène plus au compte").toMatch(/redirect\("\/moi\/compte"\)/);
    expect(lire("src/app/moi/identite/page.tsx"), "« Profil et coordonnées » ne mène plus à Mes pièces").toMatch(/redirect\("\/ouvrir-un-compte#profil-et-coordonnees"\)/);
  });
  it("l'identité, l'e-mail et le téléphone vivent une fois, sur « Mes pièces », avec leur preuve", () => {
    const pieces = lire("src/app/ouvrir-un-compte/page.tsx");
    expect(pieces).toMatch(/id="profil-et-coordonnees"/);
    expect(pieces).toMatch(/<Identite /);
    expect(pieces).toMatch(/<Canaux /);
    expect(lire("src/app/ouvrir-un-compte/Canaux.tsx")).toMatch(/<ProofBlock kind="phone"/);
    for (const f of ["src/app/parametres/page.tsx", "src/app/moi/securite/SecurityPanel.tsx"]) {
      expect(lire(f), `${f} reparle des coordonnées`).not.toMatch(/ProofBlock|ContactForm|Mes coordonnées|Mes deux canaux/);
    }
  });
  it("toutes les notifications vivent une fois, dans « Paramètres » et en interrupteurs : alertes, informations WhatsApp et e-mail, relevés", () => {
    const pref = lire("src/app/moi/appareil/Appareil.tsx");
    for (const m of [/<PushToggle[^>]*interrupteur/, /Informations · WhatsApp/, /Informations · e-mail/, /Comment vous joindre d'abord/, /Relevés par e-mail/]) expect(pref).toMatch(m);
    expect(pref, "Apparence et langue restent dans le menu du coin").not.toMatch(/PaletteSwitch|LangSwitch/);
    expect(lire("src/app/parametres/page.tsx"), "des alertes ou un consentement sont revenus hors de leur section").not.toMatch(/PushToggle|ConsentForm/);
  });
  it("les anciennes adresses « Sécurité et connexion » et « Préférences » mènent à Paramètres", () => {
    for (const f of ["src/app/moi/securite/page.tsx", "src/app/moi/appareil/page.tsx"]) expect(lire(f)).toMatch(/redirect\("\/parametres"/);
  });
  it("« Paramètres » porte « Se déconnecter partout », et le sommaire ne garde que la sortie d'ici", () => {
    expect(lire("src/app/parametres/page.tsx")).toMatch(/<DeconnexionPartout \/>/);
    const hub = lire("src/app/moi/compte/Deconnexion.tsx");
    const debut = hub.indexOf("export function Deconnexion()");
    const deconnexion = hub.slice(debut, hub.indexOf("export function DeconnexionPartout", debut));
    expect(deconnexion).not.toMatch(/partout/i);
  });
  it("le sommaire mène aux textes, plus bas, et n'a plus ni aide ni contact (21 novembre 2026)", () => {
    const hub = lire("src/app/moi/compte/page.tsx");
    expect(hub).toMatch(/href: "\/moi\/textes"/);
    expect(hub, "l'aide ou le contact sont revenus au compte").not.toMatch(/\/info\/aide|\/moi\/contact|Aide et contact/);
  });
  it("« cet appareil » mène à la porte du code, « partout » à l'accueil (21 novembre 2026)", () => {
    const a = lire("src/app/connexion/actions.ts");
    const corps = (nom: string) => {
      const debut = a.indexOf(`export async function ${nom}(`);
      return a.slice(debut, a.indexOf("\n}", debut));
    };
    expect(corps("logout"), "« cet appareil » ne mène plus à la porte du code").toMatch(/redirect\("\/connexion"\)/);
    expect(corps("logoutEverywhere"), "« partout » ne mène plus à l'accueil").toMatch(/redirect\("\/"\)/);
    for (const nom of ["logout", "logoutEverywhere"]) expect(corps(nom), `${nom} efface l'appareil reconnu`).not.toMatch(/oublierAppareil/);
  });
});
