import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { auctionReadingAvailable, ordonner, readingTrouble, toFrancs } = await import("@/lib/market/auction-extract");

/**
 * Ce que la lecture assistée doit tenir, sans appeler le modèle.
 *
 * L'appel lui-même n'est pas testable ici : il coûte de l'argent, il dépend
 * d'une clef, et ce qu'il rend varie. Ce qui doit être tenu, en revanche, c'est
 * tout ce qui entoure l'appel : l'unité des montants, et le fait que l'écran se
 * comporte correctement quand la lecture n'est pas disponible.
 */
describe("l'unité des montants du communiqué", () => {
  it("ramène les millions en francs, ce que le tableau annonce presque toujours", () => {
    // « 15 000 » sous un en-tête « en millions de FCFA » : quinze milliards.
    expect(toFrancs(15_000, "millions")).toBe(15_000_000_000);
  });

  it("ramène aussi les milliers, qu'un Trésor emploie parfois", () => {
    expect(toFrancs(15_000, "milliers")).toBe(15_000_000);
  });

  it("laisse les francs tels quels", () => {
    expect(toFrancs(15_000, "francs")).toBe(15_000);
  });

  it("ne multiplie rien quand l'unité n'a pas été lue", () => {
    // Deviner l'unité reviendrait à inventer trois zéros. Le chiffre passe brut
    // et une remarque prévient le desk : c'est à lui de trancher sur la pièce.
    expect(toFrancs(15_000, null)).toBe(15_000);
  });

  it("laisse vide ce qui n'est pas imprimé", () => {
    expect(toFrancs(null, "millions")).toBeUndefined();
    expect(toFrancs(null, null)).toBeUndefined();
  });

  it("ne confond pas zéro avec l'absence : un Trésor peut ne rien servir", () => {
    expect(toFrancs(0, "millions")).toBe(0);
  });
});

describe("quand la lecture automatique n'est pas configurée", () => {
  it("se déclare indisponible plutôt que d'échouer à l'usage", () => {
    // Sans clef, l'écran doit le dire d'avance et laisser saisir à la main,
    // plutôt que de proposer un bouton qui tombera en erreur.
    const avant = { key: process.env.ANTHROPIC_API_KEY, tok: process.env.ANTHROPIC_AUTH_TOKEN };
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_AUTH_TOKEN;
    expect(auctionReadingAvailable()).toBe(false);
    process.env.ANTHROPIC_API_KEY = "sk-essai";
    expect(auctionReadingAvailable()).toBe(true);
    delete process.env.ANTHROPIC_API_KEY;
    if (avant.key) process.env.ANTHROPIC_API_KEY = avant.key;
    if (avant.tok) process.env.ANTHROPIC_AUTH_TOKEN = avant.tok;
  });
});

/**
 * Ce que le desk lit quand la lecture échoue.
 *
 * Essayée en production sur le BTA 26 semaines du Congo, la lecture est revenue
 * avec la réponse brute de l'API dans le formulaire, accolade et identifiant de
 * requête compris. Un écran qui recrache cela apprend à ne plus lire ses propres
 * messages, et la panne la plus banale, un compte sans crédit, devient une
 * énigme. Le détail part au journal ; l'écran reçoit la conduite à tenir.
 */
describe("une lecture qui échoue", () => {
  it("dit qu'il n'y a plus de crédit, et non le corps de la réponse", () => {
    const brut = '400 {"type":"error","error":{"type":"invalid_request_error","message":"Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits."},"request_id":"req_011Cf"}';
    const dit = readingTrouble(brut);
    expect(dit).toMatch(/crédit/);
    expect(dit).not.toMatch(/\{|request_id|invalid_request_error/);
  });

  it("distingue la clef refusée, l'encombrement et la panne", () => {
    expect(readingTrouble("401 authentication_error: invalid x-api-key")).toMatch(/clef/i);
    expect(readingTrouble("429 rate_limit_error")).toMatch(/instant/);
    expect(readingTrouble("529 overloaded_error")).toMatch(/répond pas/);
  });

  it("dit toujours quoi faire de la séance en cours", () => {
    // La relecture n'est jamais bloquée : les chiffres se saisissent à la main.
    for (const cas of ["400 credit balance", "401 authentication", "quelque chose d'inattendu"]) {
      expect(readingTrouble(cas)).toMatch(/à la main/);
    }
  });

  it("ne promet rien sur une panne qu'elle ne reconnaît pas", () => {
    const dit = readingTrouble("ECONNRESET");
    expect(dit).toMatch(/n'a pas abouti/);
    expect(dit).toMatch(/journal/);
  });
});

/**
 * Les deux bornes, remises dans leur ordre.
 *
 * Vérifié sur les pièces du Trésor congolais du 21 juillet 2026 : le 4 ans
 * imprime « Prix maximum proposé 90,00 % » puis « Prix minimum proposé
 * 93,00 % », et le 3 ans « maximum 90,00 % » puis « minimum 97,00 % ». Les
 * libellés sont inversés par rapport aux nombres, systématiquement, et la
 * fourchette réelle des soumissions va bien du plus petit au plus grand.
 *
 * La lecture reste littérale : aucun nombre n'est corrigé. Ce qui change est la
 * case où il tombe, et ces cases sont les nôtres. « priceMin » doit contenir le
 * plus petit prix, sans quoi notre propre colonne ment et toute fourchette
 * tracée dessus part à l'envers.
 */
describe("un « minimum » au-dessus de son « maximum »", () => {
  const remarques: string[] = [];
  beforeEach(() => {
    remarques.length = 0;
  });

  it("remet les deux bornes dans leur ordre", () => {
    expect(ordonner(93, 90, "prix", remarques)).toEqual([90, 93]);
    expect(ordonner(97, 90, "prix", remarques)).toEqual([90, 97]);
  });

  it("ne touche à rien quand la pièce est cohérente", () => {
    expect(ordonner(6.5, 7, "taux", remarques)).toEqual([6.5, 7]);
    expect(remarques).toHaveLength(0);
  });

  it("laisse passer l'égalité, qui n'est pas une inversion", () => {
    expect(ordonner(90, 90, "prix", remarques)).toEqual([90, 90]);
    expect(remarques).toHaveLength(0);
  });

  it("ne touche pas à une borne seule : il n'y a rien à comparer", () => {
    expect(ordonner(93, undefined, "prix", remarques)).toEqual([93, undefined]);
    expect(ordonner(undefined, 90, "prix", remarques)).toEqual([undefined, 90]);
    expect(remarques).toHaveLength(0);
  });

  it("dit au desk ce qu'elle a fait, et pourquoi la pièce ne lui ressemble pas", () => {
    ordonner(97, 90, "prix", remarques);
    expect(remarques).toHaveLength(1);
    expect(remarques[0]).toMatch(/97/);
    expect(remarques[0]).toMatch(/90/);
    expect(remarques[0]).toMatch(/inversés/);
  });
});
