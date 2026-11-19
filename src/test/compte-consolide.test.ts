import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { COMPTE_PAGES, PARAMETRES_PAGES } from "@/lib/nav-groups";

const lire = (f: string) => readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

/**
 * MON COMPTE EN QUATRE RUBRIQUES, UNE DONNÉE UNE FOIS (19 novembre 2026, planche « Compte, connexion et textes », 3A).
 * L'audit : l'e-mail et le téléphone en trois endroits, le canal de contact en trois, les alertes en deux, et « Sécurité » cachée derrière le menu du coin.
 */
describe("Mon compte, consolidé", () => {
  it("le sommaire a deux rubriques (Paramètres en est sorti) ; les pages du dossier sont rangées dessous", () => {
    const rubriques = COMPTE_PAGES.filter((p) => !p.sousDe).map((p) => p.label);
    expect(rubriques).toEqual(["Profil et coordonnées", "Mon dossier"]);
    expect(PARAMETRES_PAGES.map((p) => p.href), "Paramètres sort de Mon compte et a sa propre adresse").toEqual(["/parametres"]);
    expect(COMPTE_PAGES.filter((p) => p.sousDe === "dossier").map((p) => p.href)).toEqual(["/ouvrir-un-compte", "/moi/profil"]);
    expect(lire("src/app/moi/dossier/page.tsx")).toMatch(/p\.sousDe === "dossier"/);
  });
  it("l'e-mail et le téléphone vivent une fois, sur « Profil et coordonnées », avec leur preuve", () => {
    expect(lire("src/app/moi/identite/page.tsx")).toMatch(/<Canaux /);
    expect(lire("src/app/moi/identite/Canaux.tsx")).toMatch(/<ProofBlock kind="phone"/);
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
  it("le sommaire mène aussi aux textes et à l'aide, plus bas", () => {
    const hub = lire("src/app/moi/compte/page.tsx");
    expect(hub).toMatch(/href: "\/moi\/textes"/);
    expect(hub).toMatch(/href: "\/info\/aide"/);
  });
});
