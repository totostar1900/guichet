import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { cadence, lirePlan, prochainTour, ROBOTS, etatDesRobots, robotsAVoir, type TourVu } from "@/lib/domain/robots";

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

/**
 * LA CADENCE N'ÉTAIT NULLE PART.
 *
 * La page Santé disait « muet depuis 30 heures » sans dire que le robot passe
 * tous les matins : le chiffre ne se jugeait pas. Et un desk qui attend un
 * tour ne savait pas s'il fallait attendre dix minutes ou trois mois.
 *
 * Ce que ces cliquets tiennent : l'expression recopiée dans `ROBOTS` est celle
 * que l'ordonnanceur exécute, au caractère. Une expression qui dériverait
 * ferait annoncer au desk une heure à laquelle plus rien ne part, ce qui est
 * pire que de ne rien annoncer du tout.
 */
describe("l'expression de chaque robot est celle de l'ordonnanceur", () => {
  const programme = (): Map<string, string> => {
    const j = JSON.parse(readFileSync("C:/dev/guichet/vercel.json", "utf8")) as { crons: { path: string; schedule: string }[] };
    return new Map(j.crons.map((c) => [c.path.split("/").pop()!, c.schedule]));
  };

  it("au caractère, dans les deux sens", () => {
    const p = programme();
    const ecarts = ROBOTS.filter((r) => p.get(r.cle) !== r.cron).map((r) => `${r.cle} : tableau « ${r.cron} », ordonnanceur « ${p.get(r.cle)} »`);
    expect(ecarts).toEqual([]);
  });

  it("et chacune se lit", () => {
    // Une expression que le lecteur ne sait pas lire lèverait au rendu de la page.
    for (const r of ROBOTS) expect(cadence(r.cron).quand, r.cle).not.toBe("autre");
  });
});

describe("la cadence lue de l'expression", () => {
  it("nomme les cinq formes que nous employons", () => {
    expect(cadence("0 7 * * *")).toEqual({ quand: "quotidien", heure: "7 h" });
    expect(cadence("30 18 * * 1-5")).toEqual({ quand: "ouvre", heure: "18 h 30" });
    expect(cadence("0 16 * * 5")).toEqual({ quand: "hebdo", jour: 5, heure: "16 h" });
    expect(cadence("40 6 3 * *")).toEqual({ quand: "mensuel", jourDuMois: 3, heure: "6 h 40" });
    expect(cadence("0 7 5 1,4,7,10 *")).toEqual({ quand: "trimestriel", jourDuMois: 5, heure: "7 h" });
  });

  it("avoue quand elle ne sait pas, au lieu d'inventer", () => {
    // Montrer l'expression telle quelle vaut mieux qu'une phrase fausse.
    expect(cadence("0 7 * * 1,3").quand).toBe("autre");
  });

  it("range dimanche avec lui-même, qu'il s'écrive 0 ou 7", () => {
    expect(lirePlan("0 7 * * 7").semaine).toEqual([0]);
    expect(cadence("0 7 * * 0")).toEqual({ quand: "hebdo", jour: 0, heure: "7 h" });
  });

  it("refuse ce qu'elle ne sait pas lire", () => {
    // Une expression à quatre champs, ou à deux heures, s'afficherait de travers.
    expect(() => lirePlan("0 7 * *")).toThrow();
    expect(() => lirePlan("0 7,19 * * *")).toThrow();
    expect(() => lirePlan("0 */2 * * *")).toThrow();
  });
});

describe("le prochain tour", () => {
  // Mercredi 7 octobre 2026, 10 h UTC.
  const NOW_UTC = new Date("2026-10-07T10:00:00.000Z");
  const iso = (cron: string, now = NOW_UTC) => prochainTour(cron, now).toISOString();

  it("saute le tour du jour déjà passé", () => {
    /* Le piège : prendre le premier jour retenu et y poser l'heure donnerait
       un prochain tour dans le passé pendant tout l'après-midi. */
    expect(iso("0 7 * * *")).toBe("2026-10-08T07:00:00.000Z");
    expect(iso("0 16 * * 3")).toBe("2026-10-07T16:00:00.000Z");
  });

  it("passe le week-end pour un robot de jours ouvrés", () => {
    // Vendredi 9 octobre à 18 h 30, puis lundi 12 : pas samedi.
    expect(iso("30 18 * * 1-5", new Date("2026-10-09T19:00:00.000Z"))).toBe("2026-10-12T18:30:00.000Z");
  });

  it("attend le mois suivant quand le jour du mois est passé", () => {
    expect(iso("40 6 3 * *")).toBe("2026-11-03T06:40:00.000Z");
  });

  it("attend le trimestre suivant", () => {
    // Le 5 octobre est passé : janvier 2027, et non novembre.
    expect(iso("0 7 5 1,4,7,10 *")).toBe("2027-01-05T07:00:00.000Z");
  });

  it("fait un OU quand le jour du mois et le jour de semaine sont tous deux donnés", () => {
    /* Aucun de nos robots n'est dans ce cas ; cron, lui, fait un OU, et un
       lecteur qui ferait un ET annoncerait des tours qui n'existent pas. */
    expect(iso("0 7 15 * 1")).toBe("2026-10-12T07:00:00.000Z"); // le lundi 12 avant le 15
  });

  it("se range avant le seuil de silence de son robot", () => {
    /* Non vacuité qui vaut plus que la somme : si un robot attendait plus
       longtemps que sa propre tolérance, la page le déclarerait muet à chaque
       passage, et une alerte qui crie toujours cesse d'être lue. */
    const dort = ROBOTS.filter((r) => (prochainTour(r.cron, NOW_UTC).getTime() - NOW_UTC.getTime()) / 3_600_000 > r.heures).map((r) => r.cle);
    expect(dort).toEqual([]);
  });
});
