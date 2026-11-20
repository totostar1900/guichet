import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { brouillonDepuisUneAnnonce, paysDeLaZone } from "@/lib/intake/annonce";
import { missingFields } from "@/lib/intake/publish";
import type { NoticeReading } from "@/lib/market/notice-extract";

const lire = (f: string) => readFileSync(f, "utf8");

/**
 * LE COMMUNIQUÉ DU 18 NOVEMBRE 2026 (BTA 26 semaines du Gabon), tel que le lecteur des avis le rend : les valeurs sont celles du PDF déposé par le client.
 * Le lecteur générique n'avait jamais abouti dessus (trois abandons à 40 puis 120 s) ; le lecteur des avis a lu 364 communiqués sans incident, et la lecture d'intake passe désormais par lui.
 */
const LECTURE: NoticeReading = {
  model: "claude-haiku-4-5-20251001",
  seconds: 4.2,
  remarks: [],
  proposal: { codeEmission: "GA1200002929", instrument: "BTA", tenor: "26 semaines", maturityOn: "2027-05-21", redemption: "In fine", nominalUnit: 1_000_000, issueVolume: 15_000_000_000, settleOn: "2026-11-20" },
  dates: { countryName: "République Gabonaise", deadlineAt: "2026-11-18T09:00", resultsAt: "2026-11-18", sourceRef: "Fait à Libreville, le 13 novembre 2026" },
};

describe("le brouillon tiré d'un communiqué d'annonce", () => {
  const d = brouillonDepuisUneAnnonce(LECTURE, true)!;

  it("remplit ce qu'une offre exige, sans rien inventer", () => {
    expect(d.kind).toBe("BTA");
    expect(d.operation).toBe("nouvelle_ligne");
    expect(d.country).toBe("Gabon");
    expect(d.isin).toBe("GA1200002929");
    expect(d.nominal).toBe(1_000_000);
    expect(d.maturityOn).toBe("2027-05-21");
    expect(d.deadlineAt).toBe("2026-11-18T09:00");
    expect(d.settleOn).toBe("2026-11-20");
    expect(d.sizeLabel).toBe("15 Mds FCFA");
    expect(d.title).toBe("BTA 26 semaines · 21 mai 2027");
    expect(d.couponRate, "un bon n'a pas de coupon").toBeUndefined();
    expect(d.issuer, "le nom officiel, déduit du pays : une seule orthographe").toBe("Trésor public de la République gabonaise");
    expect(d.countryName).toBe("République gabonaise");
  });

  it("ne laisse manquer à la publication que ce que le communiqué ne dit pas", () => {
    expect(missingFields(d)).toEqual([]);
  });

  it("marque « à vérifier » ce qui est supposé : une heure absente, un titre composé", () => {
    const sansHeure = brouillonDepuisUneAnnonce({ ...LECTURE, dates: { ...LECTURE.dates, deadlineAt: "2026-11-18" } }, true)!;
    expect(sansHeure.deadlineAt).toBe("2026-11-18T12:00");
    expect(sansHeure.confidence.deadlineAt).toBe("check");
    expect(sansHeure.remarks.join(" ")).toMatch(/12 h 00 retenu par convention/);
    expect(d.confidence.title).toBe("check");
    expect(d.confidence.deadlineAt).toBe("sure");
  });

  it("l'attestation « source officielle » est celle de l'appelant, pas celle de la machine", () => {
    expect(brouillonDepuisUneAnnonce(LECTURE, false)!.official).toBe(false);
    expect(d.official).toBe(true);
  });

  it("une OTA porte son coupon, un abondement le dit", () => {
    const ota = brouillonDepuisUneAnnonce({ ...LECTURE, proposal: { ...LECTURE.proposal, instrument: "OTA", couponRate: 6, abondement: true, nominalUnit: 10_000 } }, true)!;
    expect(ota.couponRate).toBe(6);
    expect(ota.operation).toBe("abondement");
    expect(ota.title).toBe("OTA 6,00 % · 21 mai 2027");
  });

  it("rend rien quand il n'y a ni instrument ni code d'émission : le lecteur générique reprend la main", () => {
    expect(brouillonDepuisUneAnnonce({ ...LECTURE, proposal: { ...LECTURE.proposal, codeEmission: undefined } }, true)).toBeUndefined();
    expect(brouillonDepuisUneAnnonce({ ...LECTURE, proposal: { ...LECTURE.proposal, instrument: undefined } }, true)).toBeUndefined();
  });

  it("le pays se lit en clair, puis au préfixe du code d'émission", () => {
    expect(paysDeLaZone("République du Congo")).toBe("Congo");
    expect(paysDeLaZone("République Centrafricaine")).toBe("RCA");
    expect(paysDeLaZone("République de Guinée Équatoriale")).toBe("Guinée éq.");
    const sansPays = brouillonDepuisUneAnnonce({ ...LECTURE, dates: { ...LECTURE.dates, countryName: undefined } }, true)!;
    expect(sansPays.country).toBe("Gabon");
  });
});

describe("les chemins de lecture", () => {
  it("le geste du desk essaie l'annonce d'abord, retombe sur le générique, et garde les deux raisons d'un échec", () => {
    const l = lire("src/lib/intake/lecture.ts");
    expect(l).toMatch(/if \(input\.kind === "pdf"\)[\s\S]*lireUneAnnonce\(input\.base64/);
    expect(l).toMatch(/if \(!draft\) \{[\s\S]*extractOffer\(input/);
    expect(l).toMatch(/ennuis\.join\(" ; "\)/);
  });

  it("le dépôt (soixante secondes) passe un PDF par l'annonce seule", () => {
    const i = lire("src/lib/intake/ingest.ts");
    expect(i).toMatch(/lireUneAnnonce\(extraction!\.base64, \{ delaiMs: 40_000/);
  });

  it("le lecteur des avis garde son appel du calendrier : sans option, le client du SDK par défaut", () => {
    const n = lire("src/lib/market/notice-extract.ts");
    expect(n).toMatch(/options\.delaiMs \? new Anthropic\(\{ timeout: options\.delaiMs, maxRetries: 0 \}\) : new Anthropic\(\)/);
    expect(n).toMatch(/zodOutputFormat\(options\.avecDates \? LectureAvecDates : Lecture\)/);
  });
});
