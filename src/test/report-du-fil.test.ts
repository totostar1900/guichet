import { describe, expect, it } from "vitest";
import { DECALAGE_WAT_MS, estReporte, quandRevient } from "@/app/desk/messages/report";

/**
 * « Reporter » un fil : à quand, exactement.
 *
 * LE DÉFAUT QU'IL CORRIGE. Le desk n'avait que deux issues pour un fil qu'il ne
 * peut pas traiter tout de suite : le marquer traité à tort, ou le laisser non
 * lu pour toujours. Les deux mentent, et la seconde finit par noyer la file
 * sous ce qu'on a décidé d'ignorer.
 *
 * POURQUOI UNE DATE ET NON UN DRAPEAU. Un drapeau « à revoir » ne revient
 * jamais tout seul. Une date fait rentrer le fil de lui-même, sans robot et
 * sans ménage : une date passée vaut un fil rendu.
 *
 * LE FUSEAU EST CELUI DE LA MAISON. « Demain 9 h » veut dire neuf heures à
 * Douala, et le serveur tourne en UTC. Calculé sans le décalage, le fil
 * reviendrait à dix heures locales, tous les jours, sans que personne ne
 * comprenne pourquoi.
 */
const heure = (iso: string) => new Date(Date.parse(iso) + DECALAGE_WAT_MS).getUTCHours();
const jour = (iso: string) => new Date(Date.parse(iso) + DECALAGE_WAT_MS).getUTCDay();

describe("quand un fil revient", () => {
  it("dans trois heures veut dire trois heures", () => {
    const t0 = Date.parse("2026-10-02T08:00:00.000Z");
    expect(quandRevient("3h", t0)).toBe("2026-10-02T11:00:00.000Z");
  });

  it("« demain 9 h » tombe à neuf heures LOCALES, pas à neuf heures UTC", () => {
    // Le piège : sans le décalage, le fil reviendrait à 10 h à Douala.
    const t0 = Date.parse("2026-10-02T14:00:00.000Z");
    const d = quandRevient("demain", t0)!;
    expect(heure(d)).toBe(9);
    expect(d).toBe("2026-10-03T08:00:00.000Z");
  });

  it("au petit matin, « demain 9 h » est encore aujourd'hui", () => {
    /* Reporter à six heures du matin veut dire « dans trois heures », pas
       « dans vingt-sept ». C'est ce que l'opérateur a en tête. */
    const t0 = Date.parse("2026-10-02T05:00:00.000Z"); // 6 h à Douala
    expect(quandRevient("demain", t0)).toBe("2026-10-02T08:00:00.000Z");
  });

  it("« lundi » est toujours le lundi SUIVANT, même un lundi matin", () => {
    // Sinon le geste n'aurait rien reporté du tout.
    const unLundi = Date.parse("2026-10-05T06:00:00.000Z");
    const d = quandRevient("lundi", unLundi)!;
    expect(jour(d)).toBe(1);
    expect(Date.parse(d)).toBeGreaterThan(unLundi + 6 * 24 * 3_600_000);
  });

  it("depuis un vendredi, lundi est à trois jours", () => {
    const vendredi = Date.parse("2026-10-02T14:00:00.000Z");
    const d = quandRevient("lundi", vendredi)!;
    expect(jour(d)).toBe(1);
    expect(heure(d)).toBe(9);
    expect(d).toBe("2026-10-05T08:00:00.000Z");
  });

  it("ne pose rien sur une clef inconnue, plutôt qu'une heure inventée", () => {
    expect(quandRevient("plus tard", Date.now())).toBeUndefined();
  });
});

describe("un fil reporté", () => {
  const t0 = Date.parse("2026-10-02T08:00:00.000Z");

  it("sort de la file jusqu'à son heure", () => {
    expect(estReporte("2026-10-02T09:00:00.000Z", t0)).toBe(true);
  });

  it("y rentre de lui-même, sans que rien ne tourne", () => {
    // Une date passée vaut un fil rendu : c'est tout le point de la date.
    expect(estReporte("2026-10-02T07:59:59.000Z", t0)).toBe(false);
  });

  it("n'est pas reporté quand il n'a pas de date", () => {
    expect(estReporte(undefined, t0)).toBe(false);
  });
});
