import { describe, expect, it } from "vitest";
import { deskHostServes, isDeskPath, DESK_HOST_ALLOW } from "@/lib/hosts";

/**
 * Le partage entre les deux hôtes.
 *
 * Le cliquet existe pour une raison précise : `isDeskPath` et `deskHostServes`
 * doivent découper un chemin de la MÊME façon. Quand elles divergeaient, le
 * hôte client envoyait « /deskonaute » au desk, le desk ne le servait pas et le
 * renvoyait au client, et le navigateur tournait jusqu'à rendre les armes.
 * Rien dans le code ne le disait, et rien n'échouait.
 */
describe("le partage entre les deux hôtes", () => {
  it("reconnaît une adresse du desk, et elle exige la barre", () => {
    expect(isDeskPath("/desk")).toBe(true);
    expect(isDeskPath("/desk/analyses")).toBe(true);
    expect(isDeskPath("/desk/clients/piece/1/recto")).toBe(true);
    for (const p of ["/deskonaute", "/desknote", "/desk-analyses", "/deskx", "/", "/titres", "/moi"]) {
      expect(isDeskPath(p), p).toBe(false);
    }
  });

  it("ne renvoie jamais au desk une adresse que le desk ne sert pas", () => {
    // La condition qui interdit la boucle : ce que le client envoie au desk,
    // le desk doit le servir.
    for (const p of ["/desk", "/desk/analyses", "/deskonaute", "/desknote", "/desk-analyses", "/deskx"]) {
      if (isDeskPath(p)) expect(deskHostServes(p), `le desk doit servir ${p}`).toBe(true);
    }
  });

  it("garde sur le hôte du desk ce qu'il doit servir en plus du desk", () => {
    for (const p of ["/connexion", "/connexion/mfa", "/auth/callback", "/api/cron/beac", "/moi/securite", "/info", "/info/risques", "/robots.txt"]) {
      expect(deskHostServes(p), p).toBe(true);
    }
  });

  it("laisse au hôte client tout le reste", () => {
    for (const p of ["/", "/titres", "/fonds", "/marche", "/indice", "/indice/notes", "/moi", "/moi/services", "/ouvrir-un-compte", "/offres/abc", "/societes"]) {
      expect(deskHostServes(p), p).toBe(false);
    }
  });

  it("ne laisse pas un préfixe sans barre ouvrir une branche du desk", () => {
    // « /informations » n'est pas « /info », « /apis » n'est pas « /api ».
    for (const p of ["/informations-financieres", "/apis", "/authentique", "/connexions"]) {
      expect(deskHostServes(p), p).toBe(false);
    }
  });

  it("garde la liste des chemins servis lisible : chacun commence par une barre", () => {
    for (const p of DESK_HOST_ALLOW) expect(p.startsWith("/"), p).toBe(true);
  });
});
