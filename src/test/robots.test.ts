import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ROBOTS, etatDesRobots, robotsAVoir, type TourVu } from "@/lib/domain/robots";

/**
 * UN ROBOT MUET RESSEMBLE À UN ROBOT MORT.
 *
 * Les robots n'écrivaient au journal que lorsqu'ils agissaient. Un tour qui ne
 * trouve rien à faire ne laissait donc aucune trace, et c'est la panne la plus
 * confortable : son silence ressemble exactement à son silence ordinaire.
 *
 * Mesuré le 3 octobre 2026. Pour dire si le robot de l'épargne avait tourné le
 * matin même, il a fallu prouver que l'ordonnanceur marchait par un AUTRE
 * robot, celui de la synthèse. Le robot interrogé, lui, n'avait rien à dire,
 * et rien ne distinguait « il a tourné sans travail » de « il est mort ».
 *
 * Ce que ce cliquet tient va au-delà de l'arithmétique : la liste des robats et
 * celle de `vercel.json` doivent se répondre. Un robot programmé qui manquerait
 * au tableau ne serait jamais surveillé ; un robot au tableau que personne ne
 * programme crierait tous les jours, et une alerte qui crie tous les jours
 * cesse d'être lue.
 */
const tour = (robot: string, o: Partial<TourVu> = {}): TourVu => ({ robot, startedAt: "2026-10-03T08:00:00.000Z", ok: true, ...o });
const NOW = new Date("2026-10-03T12:00:00.000Z");

describe("l'état des robots", () => {
  it("un robot sans aucun tour est muet", () => {
    // Le cas qui a motivé tout ceci : rien à dire, donc rien de visible.
    const vus = etatDesRobots([], NOW);
    expect(vus.every((r) => r.etat === "muet")).toBe(true);
    expect(vus[0].depuis).toBeUndefined();
  });

  it("un robot dont le dernier tour dépasse sa cadence est muet", () => {
    const vieux = tour("epargne", { startedAt: "2026-09-25T08:00:00.000Z" });
    const r = etatDesRobots([vieux], NOW).find((x) => x.cle === "epargne")!;
    expect(r.etat).toBe("muet");
    expect(Math.round(r.depuis!)).toBeGreaterThan(r.heures);
  });

  it("un tour récent suffit, même vide", () => {
    /* Le cœur du changement : un tour qui n'a rien fait compte autant qu'un
       tour qui a tout fait, parce que ce qu'on surveille est qu'il ait eu lieu. */
    const r = etatDesRobots([tour("epargne", { detail: { placed: 0, annonces: 0 } })], NOW).find((x) => x.cle === "epargne")!;
    expect(r.etat).toBe("va");
  });

  it("distingue un robot échoué d'un robot muet", () => {
    // Les deux pannes ne se réparent pas pareil : l'une est l'ordonnanceur, l'autre le code.
    const r = etatDesRobots([tour("beac", { ok: false, error: "BEAC 502" })], NOW).find((x) => x.cle === "beac")!;
    expect(r.etat).toBe("echoue");
    expect(r.dernier?.error).toBe("BEAC 502");
  });

  it("un tour lancé à la main n'éteint pas l'alarme", () => {
    /* Le trou que j'ai creusé en vérifiant mon propre registre : si
       l'ordonnanceur mourait et que quelqu'un lançait le robot pour voir, la
       page passerait au vert alors que plus rien n'est planifié. Un détecteur
       qui se laisse tromper par son opérateur ne détecte rien. */
    const r = etatDesRobots([tour("epargne", { par: "main" })], NOW).find((x) => x.cle === "epargne")!;
    expect(r.etat).toBe("muet");
    // Il se montre quand même : on veut savoir qu'il a tourné, et par qui.
    expect(r.dernier?.par).toBe("main");
    expect(r.depuis).toBeUndefined();
  });

  it("un tour de l'ordonnanceur l'éteint", () => {
    expect(etatDesRobots([tour("epargne", { par: "cron" })], NOW).find((x) => x.cle === "epargne")!.etat).toBe("va");
    // Sans mention, on suppose l'ordonnanceur : ce sont les lignes d'avant la colonne.
    expect(etatDesRobots([tour("epargne")], NOW).find((x) => x.cle === "epargne")!.etat).toBe("va");
  });

  it("garde le dernier tour, pas le premier venu", () => {
    const vus = etatDesRobots([tour("epargne", { startedAt: "2026-09-01T08:00:00.000Z" }), tour("epargne", { startedAt: "2026-10-03T08:00:00.000Z" })], NOW);
    expect(vus.find((x) => x.cle === "epargne")!.etat).toBe("va");
  });

  it("met le plus inquiétant en tête", () => {
    const tous = ROBOTS.map((r) => tour(r.cle));
    const avec = tous.map((t) => (t.robot === "beac" ? { ...t, ok: false } : t.robot === "coupons" ? { ...t, startedAt: "2026-08-01T08:00:00.000Z" } : t));
    const vus = etatDesRobots(avec, NOW);
    expect(vus[0].cle).toBe("coupons");
    expect(vus[1].cle).toBe("beac");
    expect(robotsAVoir(vus).map((r) => r.cle)).toEqual(["coupons", "beac"]);
  });
});

describe("le tableau des cadences et vercel.json se répondent", () => {
  const programmes = (): string[] => {
    const j = JSON.parse(readFileSync("C:/dev/guichet/vercel.json", "utf8")) as { crons: { path: string }[] };
    return j.crons.map((c) => c.path.split("/").pop()!);
  };

  it("chaque robot programmé est surveillé", () => {
    /* Sans cela, un robot pourrait mourir sans que la page Santé s'en aperçoive,
       ce qui est l'état d'avant. */
    const absents = programmes().filter((c) => !ROBOTS.some((r) => r.cle === c));
    expect(absents).toEqual([]);
  });

  it("aucun robot surveillé n'est absent de l'ordonnanceur", () => {
    /* L'inverse coûte autant : une ligne qui crie tous les jours pour un robot
       que personne ne programme apprend à ignorer la page. */
    const p = programmes();
    const fantomes = ROBOTS.filter((r) => !p.includes(r.cle)).map((r) => r.cle);
    expect(fantomes).toEqual([]);
  });

  it("regarde bien quelque chose", () => {
    // Non vacuité : un vercel.json vidé passerait au vert sur les deux sens.
    expect(programmes().length).toBeGreaterThan(8);
    expect(ROBOTS.length).toBe(programmes().length);
  });
});

describe("chaque route de robot passe par l'enveloppe", () => {
  it("aucune ne garde son propre contrôle du secret", () => {
    /* Douze robots écrivaient les mêmes six lignes de garde. Les rassembler évite
       qu'un treizième les écrive de travers, ce qui est la façon dont un robot
       finit par tourner sans secret ; et c'est l'enveloppe qui inscrit le tour,
       donc une route qui s'en passe redevient muette. */
    const R = "C:/dev/guichet/src/app/api/cron/";
    const fautifs: string[] = [];
    for (const d of readdirSync(R)) {
      let s: string;
      try {
        s = readFileSync(`${R}${d}/route.ts`, "utf8");
      } catch {
        continue;
      }
      if (!s.includes("routeDuRobot")) fautifs.push(`${d} : hors enveloppe`);
      if (/const secret = process\.env\.CRON_SECRET/.test(s)) fautifs.push(`${d} : garde recopiée`);
    }
    expect(fautifs).toEqual([]);
  });
});
