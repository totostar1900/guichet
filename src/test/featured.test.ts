import { FAUX_NEXT_CACHE } from "./faux-next-cache";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { Session } from "@/lib/auth/types";
import type { FeatureResult } from "@/app/desk/featured/actions";

/**
 * « À la une » and « opportunité du moment » on the in-memory repository: a
 * factual reason is required, three lines at most, the badge shows up in the
 * summary, a broadcast counts before sending and never alerts the same client
 * twice in a day.
 */
const desk: Session = { userId: "u-op", role: "desk", name: "Op Test", email: "op@example.com", segment: "Desk", tier: 2, provider: "dev", mfaEnrolled: true, mfaVerified: true };
const resp: Session = { ...desk, userId: "u-resp", role: "responsable", name: "Resp Test" };
let current: Session = desk;

/** La phrase d’un résultat : un échec porte soit un message, soit un plan de diffusion. */
const said = (r: FeatureResult): string => (r.ok ? r.message : "error" in r ? r.error : "");

vi.mock("@/lib/auth", () => ({ getSession: async () => current, requireSession: async () => current, requireDesk: async () => current, requireResponsable: async () => current, authMode: () => "dev", mfaRequired: () => false }));
vi.mock("next/cache", () => FAUX_NEXT_CACHE);
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

beforeAll(() => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.VAPID_PUBLIC_KEY;
});

const form = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};


/**
 * UNE LIGNE ENCORE OUVERTE, ET LA DATE QUI VA AVEC.
 *
 * Nommer une ligne du jeu d'essai fait dépendre le cas de l'horloge : celle
 * qu'il nommait s'est close le 15 octobre 2026 à dix-sept heures, et quatre
 * cas sont tombés à dix-sept heures treize. On prend donc celle qui ferme le
 * plus tard, et la mise à la une s'arrête à sa clôture.
 */
const ligneClose = async () => {
  const { repo } = await import("@/lib/data");
  const closes = (await repo().listOffers()).filter((o) => Date.parse(o.deadlineAt) <= Date.now());
  if (!closes.length) throw new Error("le jeu d'essai n'a plus une seule ligne close");
  return closes[0].id;
};

/**
 * UNE LIGNE OUVERTE, DATÉE, ET QUE LE CAS OUVRE LUI-MÊME.
 *
 * Elle doit avoir une vraie clôture : la règle ne borne pas la mise à la une
 * d'une ligne de marché ni d'un fonds, qui n'en ont pas, et le cas du
 * dépassement n'aurait alors rien à dépasser. On prend donc une ligne datée
 * du jeu d'essai et on repousse SA clôture dans le dépôt en mémoire, qui est
 * propre à ce test.
 */
const ligneOuverte = async () => {
  const { repo } = await import("@/lib/data");
  const r = repo();
  const datees = (await r.listOffers()).filter((o) => o.kind !== "MARCHE" && o.kind !== "FONDS");
  if (!datees.length) throw new Error("le jeu d'essai n'a plus une seule ligne datée");
  const o = datees.find((x) => Date.parse(x.deadlineAt) > Date.now()) ?? datees[0];
  const dans30 = new Date(Date.now() + 30 * 86_400_000);
  const cloture = Date.parse(o.deadlineAt) > Date.now() ? o.deadlineAt : `${dans30.toISOString().slice(0, 10)}T17:00:00`;
  if (cloture !== o.deadlineAt) await r.publishOffer(o.id, { deadlineAt: cloture });
  const jour = cloture.slice(0, 10);
  const dans5 = new Date(Date.now() + 5 * 86_400_000).toISOString().slice(0, 10);
  return {
    id: o.id,
    until: dans5 < jour ? dans5 : jour,
    /* « après » sert au cas qui doit dépasser la clôture. */
    apres: new Date(Date.parse(cloture) + 2 * 86_400_000).toISOString().slice(0, 10),
  };
};

describe("sélection du desk et diffusion", () => {
  it("refuses a recommendation and accepts a factual reason; the badge appears", async () => {
    const { featureOfferAction } = await import("@/app/desk/featured/actions");
    const { repo } = await import("@/lib/data");
    const { summarize } = await import("@/lib/domain/summary");
    /* NI LA LIGNE NI LA DATE NE SONT ÉCRITES EN DUR : l'une et l'autre
       dépendaient de l'horloge, et le cas tombait le jour de la clôture. */
    const { id: ligne, until } = await ligneOuverte();
    const bad = await featureOfferAction(null, form({ offerId: ligne, reason: "Le meilleur placement du moment", until }));
    expect(bad.ok).toBe(false);
    const ok = await featureOfferAction(null, form({ offerId: ligne, reason: "Clôture cette semaine", until }));
    expect(ok.ok).toBe(true);
    const o = (await repo().getOffer(ligne))!;
    expect(o.featured?.reason).toBe("Clôture cette semaine");
    const s = summarize(o, new Date());
    expect(s.badges.some((b) => b.key === "selection" && b.note === "Clôture cette semaine")).toBe(true);
  });

  it("refuses a closed line and a date past the line's closing", async () => {
    const { featureOfferAction } = await import("@/app/desk/featured/actions");
    /* NI LA LIGNE NI LA DATE NE SONT ÉCRITES EN DUR : l'une et l'autre
       dépendaient de l'horloge, et le cas tombait le jour de la clôture. */
    const { id: ligne, until, apres } = await ligneOuverte();
    const closed = await featureOfferAction(null, form({ offerId: await ligneClose(), reason: "Nouvelle ligne", until }));
    expect(closed.ok).toBe(false);
    expect(said(closed)).toMatch(/clôturée/);
    const late = await featureOfferAction(null, form({ offerId: ligne, reason: "Nouvelle ligne", until: apres }));
    expect(late.ok).toBe(false);
    expect(said(late)).toMatch(/clôture de la ligne/);
  });

  it("caps the selection at three", async () => {
    const { featureOfferAction } = await import("@/app/desk/featured/actions");
    /* NI LA LIGNE NI LA DATE NE SONT ÉCRITES EN DUR : l'une et l'autre
       dépendaient de l'horloge, et le cas tombait le jour de la clôture. */
    const { id: ligne, until } = await ligneOuverte();
    for (const id of ["mkt-bhc", "mkt-ecmr-2031"]) expect((await featureOfferAction(null, form({ offerId: id, reason: "Nouvelle ligne", until }))).ok).toBe(true);
    const fourth = await featureOfferAction(null, form({ offerId: await ligneClose(), reason: "Nouvelle ligne", until }));
    expect(fourth.ok).toBe(false);
    expect(said(fourth)).toMatch(/Trois lignes/);
  });

  it("counts before sending, journals every send, and never alerts a client twice a day", async () => {
    const { broadcastOpportunityAction } = await import("@/app/desk/featured/actions");
    const { repo } = await import("@/lib/data");
    const r = repo();
    const before = (await r.listNotifications(500)).length;
    /* LA LIGNE N'EST PAS ÉCRITE EN DUR : celle qui était nommée s'est close
       le 15 octobre 2026 à dix-sept heures, et le cas est tombé avec elle. */
    const { id: ligne } = await ligneOuverte();
    const preview = await broadcastOpportunityAction(null, form({ offerId: ligne, segment: "Tous les clients" }));
    expect(preview.ok).toBe(false);
    // Le plan se compte sans rien envoyer : c’est ce compte que l’écran fait recopier.
    expect(!preview.ok && "plan" in preview && preview.plan.recipients).toBeGreaterThan(0);
    expect((await r.listNotifications(500)).length).toBe(before); // nothing sent on preview
    const sent = await broadcastOpportunityAction(null, form({ offerId: ligne, segment: "Tous les clients", confirm: "1" }));
    expect(sent.ok).toBe(true);
    const rows = (await r.listNotifications(500)).filter((n) => n.kind === "opportunity");
    expect(rows.length).toBeGreaterThan(0);
    // Channels are not configured in tests: journalled as skipped or queued (quiet hours), never lost.
    expect(rows.every((n) => n.status === "skipped" || n.status === "queued")).toBe(true);
    const again = await broadcastOpportunityAction(null, form({ offerId: ligne, segment: "Tous les clients", confirm: "1" }));
    expect(again.ok).toBe(false);
    expect(said(again)).toMatch(/Personne à prévenir|déjà alerté/);
    current = resp;
  });
});
