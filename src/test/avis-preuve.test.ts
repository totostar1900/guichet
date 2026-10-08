import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * UN AVIS ATTESTE UN RÈGLEMENT, IL NE LE SUPPOSE PAS.
 *
 * L'avis de coupon est un PDF numéroté au registre d'édition, envoyé au client
 * sur son canal. Il s'émettait depuis un flux dont la seule date était passée,
 * et il imprimait « Le montant a été réglé par l'émetteur via le dépositaire et
 * crédité sur votre compte de règlement ». Aucune de ces deux affirmations
 * n'était vérifiée : la maison ne voit ni le paiement de l'émetteur, ni le
 * compte de son client.
 *
 * Un bouton « Émettre les avis » sur l'écran d'accueil du desk en produisait et
 * en envoyait un pour tout flux passé de tous les clients, sans rien saisir.
 *
 * Le cliquet tient trois choses, et c'est le troisième qui compte le plus : une
 * régression ici n'écrit pas un mauvais chiffre dans un écran, elle engage la
 * maison par écrit auprès de son client.
 */
const RACINE = "C:/dev/guichet/src";

function fichiers(dossier: string, out: string[] = []): string[] {
  for (const e of readdirSync(dossier)) {
    const p = path.join(dossier, e);
    if (statSync(p).isDirectory()) fichiers(p, out);
    else if (/\.(ts|tsx)$/.test(e)) out.push(p);
  }
  return out;
}

const lire = (rel: string) => readFileSync(path.join(RACINE, rel), "utf8");

describe("l'avis de coupon et sa preuve", () => {
  it("refuse de s'émettre sans la date du règlement constaté", async () => {
    const { generateCouponNotice } = await import("@/lib/documents/generate");
    // Le client, la ligne et le flux n'ont pas besoin d'exister : le refus vient avant.
    await expect(generateCouponNotice("c-x", "CM0000TEST01", "2026-07-05", { paidOn: "" })).rejects.toThrow(/règlement constatée/i);
    await expect(generateCouponNotice("c-x", "CM0000TEST01", "2026-07-05", { paidOn: "juillet" })).rejects.toThrow(/règlement constatée/i);
  });

  it("n'affirme plus avoir constaté le crédit du compte du client", () => {
    const passages = lire("lib/documents/passages-catalog.ts");
    expect(passages).not.toContain("et crédité sur votre compte de règlement");
    expect(passages).toContain("d'après l'avis du teneur de compte");
  });

  it("n'offre plus d'émission en lot", () => {
    // Le lot émettait ET envoyait, d'un clic, pour tout flux passé de tous les clients.
    // Ce fichier-ci nomme le lot pour expliquer pourquoi il n'existe plus.
    const fautifs = fichiers(RACINE)
      .filter((f) => !f.endsWith("avis-preuve.test.ts"))
      .filter((f) => /couponBatch/i.test(readFileSync(f, "utf8")));
    expect(fautifs.map((f) => path.relative(RACINE, f).replace(/\\/g, "/"))).toEqual([]);
  });

  it("le rappel d'échéance annonce une attente, pas un fait", () => {
    const cron = lire("app/api/cron/coupons/route.ts");
    expect(cron).not.toMatch(/payé le \$\{fmtDate/);
    expect(cron).toContain("est attendu le");
  });

  it("nomme le teneur de compte là où le sous-compte est ouvert", () => {
    // Deux entités réelles : le dépositaire central où les titres sont inscrits,
    // et le teneur de compte au nom duquel l'inscription est faite.
    const notify = lire("lib/kyc/notify.ts");
    expect(notify).not.toContain("chez le dépositaire");
    // Les trois messages d'approbation : la convention reste à accepter, le
    // compte est en cours d'ouverture, le compte est actif.
    expect(notify.split("chez le teneur de compte").length - 1).toBe(3);
  });

  it("regarde bien quelque chose", () => {
    // Non vacuité : un parcours qui ne lirait plus rien passerait au vert.
    expect(fichiers(RACINE).length).toBeGreaterThan(300);
  });
});

describe("une échéance passée n'est pas un règlement", () => {
  it("le champ des flux dépassés ne s'appelle plus « payés »", () => {
    // Ce mot a produit l'attestation, la file de travail et la surévaluation du
    // rendement. Il ne revient pas.
    const positions = lire("lib/positions.ts");
    expect(positions).toMatch(/echus: \{ date: string; amount: number; label: string \}\[\];/);
    expect(positions).not.toMatch(/^\s*paid:/m);
  });

  it("aucun lecteur ne lit plus une position « .paid »", () => {
    const fautifs: string[] = [];
    for (const f of fichiers(RACINE)) {
      const rel = path.relative(RACINE, f).replace(/\\/g, "/");
      readFileSync(f, "utf8")
        .split("\n")
        .forEach((ligne, i) => {
          if (/\bp(osition)?\??\.paid\b/.test(ligne)) fautifs.push(`${rel}:${i + 1}`);
        });
    }
    expect(fautifs).toEqual([]);
  });
});
