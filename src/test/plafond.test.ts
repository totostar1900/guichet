import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ordreSignable } from "@/lib/domain/intent";
import { coutAuPrixDuPlafond, depasseLePlafond, plafondPropose, prixDuPlafond, seSigneAuPlafond } from "@/lib/domain/plafond";
import { SEED_OFFERS } from "@/data/seed";
import type { Intent } from "@/lib/domain/types";

/**
 * « AU PLUS CECI », LA BORNE QUI REND UN TITRE SIGNABLE.
 *
 * Une part d'OPCVM se signe pour un montant : on verse, et c'est la quantité
 * qui se découvre à la VL. Un titre marche à l'envers : la quantité est
 * voulue, c'est la DÉPENSE qui se découvre au prix servi. On ne peut pas
 * demander une signature sur un montant inconnu, et c'est ce qui obligeait
 * encore ces ordres à passer par un aller-retour avec le desk.
 *
 * Le chiffre existait pourtant d'avance : ce que l'ordre coûterait au prix le
 * plus cher que le client ait accepté. Au-dessus il n'était pas preneur, en
 * dessous il paie moins.
 */
const obligation = SEED_OFFERS.find((o) => o.kind === "OTA" && o.couponRate != null && o.maturityOn)!;

const ordre = (p: Partial<Intent> = {}): Intent => ({
  id: "i1",
  ref: "PF-1009-AAAA",
  offerId: obligation.id,
  offerVersion: 1,
  clientName: "Essai",
  clientSegment: "Personne physique",
  clientId: "u1",
  type: "ferme",
  amount: 10_000_000,
  channel: "E-mail",
  state: "recue",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...p,
});

describe("quels ordres se bornent", () => {
  it("ceux dont la dépense dépend du prix servi, et eux seuls", () => {
    expect(seSigneAuPlafond("ferme")).toBe(true);
    expect(seSigneAuPlafond("achat")).toBe(true);
    // Une part : le montant versé EST la borne, il n'y a rien à calculer.
    expect(seSigneAuPlafond("souscription")).toBe(false);
    // Une vente rapporte : il n'y a pas de dépense à borner.
    expect(seSigneAuPlafond("vente")).toBe(false);
    expect(seSigneAuPlafond("cession")).toBe(false);
  });
});

describe("le prix qui fait la borne", () => {
  it("la limite du client d'abord, le prix annoncé ensuite", () => {
    expect(prixDuPlafond(ordre({ limitPrice: 92 }), obligation)).toBe(92);
    expect(prixDuPlafond(ordre(), obligation)).toBe(obligation.pricePct ?? 100);
  });

  it("une limite plus chère coûte plus cher : c'est tout le sens de la borne", () => {
    const bas = coutAuPrixDuPlafond(ordre({ limitPrice: 90 }), obligation);
    const haut = coutAuPrixDuPlafond(ordre({ limitPrice: 98 }), obligation);
    expect(haut).toBeGreaterThan(bas);
  });

  it("le plafond s'arrondit AU-DESSUS, au millier", () => {
    const o = ordre({ limitPrice: 94 });
    const brut = coutAuPrixDuPlafond(o, obligation);
    const p = plafondPropose(o, obligation);
    expect(p % 1000).toBe(0);
    /* Jamais en dessous, et c'est la raison de l'arrondi : un plafond trop bas
       d'un franc ferait échouer un ordre entièrement servi, à cause des
       centimes d'un coupon couru qui se décalent d'un jour à l'autre. */
    expect(p).toBeGreaterThanOrEqual(brut);
    expect(p - brut).toBeLessThan(1000);
  });
});

describe("ce que la borne interdit", () => {
  const signe = (max: number) => ordre({ limitPrice: 94, maxAmount: max, signedAt: new Date().toISOString() });

  it("un prix meilleur passe, un prix plus cher ne passe pas", () => {
    const max = plafondPropose(ordre({ limitPrice: 94 }), obligation);
    expect(depasseLePlafond(signe(max), obligation, 92).depasse).toBe(false);
    expect(depasseLePlafond(signe(max), obligation, 99).depasse).toBe(true);
  });

  it("le refus porte les deux chiffres, pas seulement le verdict", () => {
    const max = plafondPropose(ordre({ limitPrice: 94 }), obligation);
    const v = depasseLePlafond(signe(max), obligation, 99);
    expect(v.cout).toBeGreaterThan(v.plafond);
    expect(v.plafond).toBe(max);
  });
});

describe("la signature s'ouvre aux titres, mais pas à vide", () => {
  it("un ordre sur titre se signe dès qu'il porte sa borne", () => {
    expect(ordreSignable(ordre({ maxAmount: 9_500_000 }))).toBe(true);
    expect(ordreSignable(ordre({ type: "achat", maxAmount: 9_500_000 }))).toBe(true);
  });

  it("sans borne, il ne se signe pas : le desk le mènera par son canal", () => {
    /* C'est la différence entre « pas encore construit » et « cassé ». Un
       écran qui offrirait une signature sur un montant inconnu demanderait un
       engagement que personne ne peut tenir. */
    expect(ordreSignable(ordre())).toBe(false);
    expect(ordreSignable(ordre({ maxAmount: 0 }))).toBe(false);
  });

  it("le desk refuse d'exécuter au-delà, et le dit avec l'écart", () => {
    const src = readFileSync("src/app/desk/marche/actions.ts", "utf8");
    expect(src).toContain("depasseLePlafond");
    expect(src).toContain("au-delà du plafond de");
  });

  it("la borne se fige à la déclaration, jamais au moment de signer", () => {
    const src = readFileSync("src/app/offres/[id]/actions.ts", "utf8");
    expect(src).toContain("plafondPropose(intent, offer)");
  });
});

/**
 * UN DÉPOUILLEMENT PASSE, ET IL SIGNALE.
 *
 * Décision du 9 octobre 2026, posée par le dirigeant : une ligne au-delà du
 * plafond signé ne doit pas arrêter l'import. Un dépouillement porte cinquante
 * lignes ; s'arrêter sur une ferait attendre quarante-neuf clients pour un, et
 * le desk recommencerait son import au lieu de régler le cas.
 *
 * Ce qui rend la décision tenable, c'est la seconde moitié : le signal doit se
 * VOIR. Une trace au journal d'un dépouillement de cinquante lignes ne se lit
 * pas ; le compte rendu la redit donc en haut de l'écran, avec le geste à
 * faire. Sans cela on aurait arrêté l'import pour rien, puis signalé dans le
 * vide, ce qui est la panne muette de la maison.
 */
describe("le dépouillement d'une adjudication", () => {
  const src = () => readFileSync("src/lib/results/service.ts", "utf8");

  it("ne sert pas au-delà de la borne, et continue le lot", () => {
    const s = src();
    expect(s).toContain("depasseLePlafond");
    // La ligne devient non servie, elle n'interrompt pas la boucle.
    expect(s).toContain("units = 0");
    expect(s).not.toMatch(/depasse[^\n]*\n\s*(throw|return)/);
  });

  it("le journal nomme la cause et les deux chiffres", () => {
    expect(src()).toContain("au-delà du plafond signé");
    expect(src()).toContain("appelez le client");
  });

  it("le compte rendu de l'écran le redit, parce qu'un journal de cinquante lignes ne se lit pas", () => {
    const a = readFileSync("src/app/desk/resultats/actions.ts", "utf8");
    expect(a).toContain("horsPlafond");
    expect(a).toContain("à appeler");
  });
});
