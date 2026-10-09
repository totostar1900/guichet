import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * ON NE FAIT PAS SIGNER UN MANDAT À QUELQU'UN QU'ON NE PEUT PAS JOINDRE.
 *
 * La règle vient d'un fait, pas d'un principe : le dossier n'exige qu'« un
 * téléphone OU un e-mail » (`checklist.ts`), et WhatsApp Cloud API n'est pas
 * posé en production au 9 octobre 2026. Un client prouvé par son seul numéro
 * est donc injoignable, et comme rien ne part sans que son préavis soit parti,
 * il signerait un mandat qui ne tirerait JAMAIS rien. Personne ne le lui
 * dirait : son écran montrerait un mandat actif, et il attendrait.
 *
 * LE PIÈGE QUE CE FICHIER GARDE est la distinction entre deux absences qui se
 * ressemblent. Aucun fournisseur configuré, c'est le mode démonstration et le
 * code s'affiche à l'écran ; un fournisseur configuré sans adresse utilisable,
 * c'est un code qui part dans le vide. Refuser dans le premier cas rendrait
 * l'application inessayable en local ; accepter dans le second est la panne
 * qu'on vient de fermer.
 */
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

const canal = async () => (await import("@/lib/kyc/canal")).aucunCanalPossible;

describe("aucunCanalPossible", () => {
  it("laisse passer la démonstration : aucun fournisseur, le code s'affiche à l'écran", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("EMAIL_FROM", "");
    vi.stubEnv("WHATSAPP_TOKEN", "");
    vi.stubEnv("WHATSAPP_PHONE_ID", "");
    expect((await canal())(undefined)).toBe(false);
  });

  it("refuse quand un fournisseur existe et que ce client n'a aucune adresse", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_essai");
    vi.stubEnv("EMAIL_FROM", "guichet@example.africa");
    expect((await canal())(undefined)).toBe(true);
  });

  it("ne refuse jamais quand un canal a été trouvé", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_essai");
    vi.stubEnv("EMAIL_FROM", "guichet@example.africa");
    expect((await canal())({ channel: "email", to: "g@example.cm", prouve: true })).toBe(false);
  });

  it("se lit des fournisseurs, et non d'un « il faut un e-mail » écrit en dur", async () => {
    /* Le jour où WhatsApp Cloud API sera posé, un client au seul numéro
       redeviendra joignable sans qu'une ligne change : c'est tout l'intérêt
       de lire l'état des fournisseurs plutôt que de nommer un canal. */
    const src = readFileSync("src/lib/kyc/canal.ts", "utf8");
    const corps = src.slice(src.indexOf("export function aucunCanalPossible"));
    expect(corps).toMatch(/emailConfigured\(\) \|\| whatsappConfigured\(\)/);
  });
});

describe("la page et l'action disent la même chose", () => {
  /* Troisième fois dans la journée que les deux divergent, et la troisième
     fois que seul l'écran l'aurait montré : la page promettait un code que
     l'action refusait d'envoyer. Ici, les deux lisent la même fonction. */
  it("le mandat ne se signe ni ne se prépare sans canal joignable", () => {
    const action = readFileSync("src/app/moi/prelevements/actions.ts", "utf8");
    expect(action).toMatch(/aucunCanalPossible\(canal\)/);
    expect(action).toMatch(/adresse e-mail avant de signer/);
    const page = readFileSync("src/app/moi/prelevements/page.tsx", "utf8");
    expect(page).toMatch(/aucunCanalPossible\(canal\)/);
    const ecran = readFileSync("src/app/moi/prelevements/MesMandats.tsx", "utf8");
    // Le bouton du code est fermé, et celui qui ouvre le formulaire aussi.
    expect(ecran).toMatch(/disabled=\{envoyant \|\| !dossier \|\| injoignable\}/);
    expect(ecran).toMatch(/\{injoignable \? \(/);
  });
});
