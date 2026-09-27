import type { Country } from "@/lib/domain/types";
import type { Curve } from "./curve";
import type { Freshness, Liquidity } from "./liquidity";
import type { PressureYear } from "./auction-stats";
import { YIELD_ORIGIN_LABEL } from "./yield";

/**
 * Le brouillon d'une note, tiré de ce qui est publiable.
 *
 * Le dossier d'analyses marque chaque panneau « publiable » ou « interne », et
 * s'arrêtait là : la mention disait ce qu'on avait le droit de sortir, sans
 * rien donner à sortir. Entre la page et la note il restait une recopie à la
 * main, c'est-à-dire l'endroit exact où un chiffre se déforme et où une date
 * d'observation se perd.
 *
 * Ce module écrit le brouillon. Pas la note : une note se signe, se date, se
 * relit, et cela appartient à Publications. Ce qu'il produit est la matière,
 * avec ses réserves attachées à chaque chiffre plutôt qu'en bas de page, parce
 * qu'une réserve qui voyage séparément du chiffre ne voyage pas.
 *
 * Rien de ce qui est « interne » n'y entre, et c'est le seul filtre : un
 * brouillon qui contiendrait l'exécution du programme d'émission ferait sortir
 * du desk une mesure calculée sur notre échantillon, présentée comme le
 * programme d'un Trésor.
 */

export interface Brief {
  /** Le jour d'observation, qui se recopie tel quel dans la note. */
  on: string;
  paragraphes: { titre: string; texte: string }[];
  /** Ce qui n'est pas entré, et pourquoi : le rédacteur doit le savoir avant qu'on le lui demande. */
  ecartes: { titre: string; raison: string }[];
}

const pct = (v: number, d = 2) => `${v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d })} %`;
const jour = (iso: string) => {
  const [a, m, j] = iso.split("-");
  return `${j}/${m}/${a}`;
};

export function brief(input: {
  on: string;
  curve: Curve;
  minPoints: number;
  pression: PressureYear[];
  liq?: Liquidity;
  frais?: Freshness;
  indice?: { niveau: number; le: string; depuis?: { niveau: number; le: string } };
}): Brief {
  const { on, curve, minPoints, pression, liq, frais, indice } = input;
  const paragraphes: Brief["paragraphes"] = [];
  const ecartes: Brief["ecartes"] = [];

  /* La courbe : deux Trésors au moins, deux durées chacun. */
  const traces = curve.countries.filter((c) => c.points.length >= minPoints);
  if (traces.length >= 2) {
    const dit = (pays: Country) => {
      const c = traces.find((x) => x.country === pays)!;
      return `${pays} : ${c.points.map((p) => `${p.tenor} ${pct(p.yield.pct)}`).join(", ")}`;
    };
    const origines = new Map<string, number>();
    for (const c of traces) for (const p of c.points) origines.set(p.yield.origin, (origines.get(p.yield.origin) ?? 0) + 1);
    paragraphes.push({
      titre: "La courbe souveraine",
      texte:
        `Au ${jour(on)}, sur les séances relues des douze derniers mois. ${traces.map((c) => dit(c.country)).join(". ")}. ` +
        `Le point le plus ancien retenu date de ${Math.max(...traces.map((c) => c.oldestDays))} jours. ` +
        `Origine des rendements : ${[...origines.entries()].map(([o, n]) => `${n} ${YIELD_ORIGIN_LABEL[o as keyof typeof YIELD_ORIGIN_LABEL]}`).join(", ")}. ` +
        `Aucune moyenne n'est faite entre deux Trésors.`,
    });
  } else {
    ecartes.push({ titre: "La courbe souveraine", raison: "moins de deux Trésors portent deux durées relues sur la fenêtre" });
  }

  /* La pression : cinq séances relues dans l'année, au moins. */
  const annees = pression.filter((p) => p.n >= 5);
  if (annees.length >= 2) {
    const a = annees[0];
    const z = annees[annees.length - 1];
    paragraphes.push({
      titre: "La pression de la demande",
      texte:
        `La couverture moyenne des adjudications passe de ${a.coverage.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} fois en ${a.year} ` +
        `à ${z.coverage.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} fois en ${z.year}, ` +
        `pendant que la part servie des soumissions monte de ${pct(a.allotment ?? 0, 0)} à ${pct(z.allotment ?? 0, 0)}. ` +
        `Calculée sur ${a.n} séances relues en ${a.year} et ${z.n} en ${z.year}.`,
    });
  } else {
    ecartes.push({ titre: "La pression de la demande", raison: "moins de deux années portent cinq séances relues" });
  }

  /* La liquidité : elle ne repose sur aucune hypothèse, elle sort toujours. */
  if (liq) {
    const obl = liq.lines.filter((l) => l.instrument === "obligation");
    paragraphes.push({
      titre: "La liquidité du marché secondaire",
      texte:
        `Sur ${liq.sessions} séances de cotation, ${liq.traded.toLocaleString("fr-FR")} couples ligne-séance ont donné lieu à une transaction sur ${liq.lineSessions.toLocaleString("fr-FR")}, soit ${pct(liq.share, 1)}. ` +
        `${liq.mute} séances n'ont vu aucun échange sur l'ensemble de la cote. ` +
        (obl.length ? `${obl.filter((l) => l.traded === 0).length} obligations sur ${obl.length} n'ont connu aucune transaction sur la période : leur cours affiché est un prix de référence reporté. ` : "") +
        `Mesure tirée des bulletins, sans hypothèse.`,
    });
  }

  /* La fraîcheur : jamais séparée du niveau qu'elle qualifie. */
  if (frais && indice) {
    const evol = indice.depuis ? ` (${pct(((indice.niveau - indice.depuis.niveau) / indice.depuis.niveau) * 100, 1)} depuis le ${jour(indice.depuis.le)})` : "";
    paragraphes.push({
      titre: "L'indice et sa fraîcheur",
      texte:
        `Niveau de ${indice.niveau.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} au ${jour(indice.le)}${evol}. ` +
        `Sur ${frais.total} composantes, ${frais.tradedLast} ont traité à cette séance, et ${frais.tradedPerSession.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} en moyenne sur les ${frais.window} dernières. ` +
        (frais.stale.length
          ? `${frais.stale.map((s) => `${s.mnemo} (${s.staleDays ?? "—"} jours)`).join(", ")} n'avaient pas traité depuis plus de ${frais.seuilDays} jours : l'indice reprend leur dernier cours tel quel. `
          : `Toutes ont traité dans la semaine. `) +
        `Le compte se fait en nombre de composantes et non en capitalisation, faute d'une pondération publiée par la bourse.`,
    });
  }

  ecartes.push({ titre: "L'exécution du programme d'émission", raison: "calculée sur les séances relevées, qui ne sont pas le programme annuel d'un Trésor" });
  ecartes.push({ titre: "Le pont primaire / secondaire", raison: "coupons et maturités diffèrent des deux côtés : l'écart en points de prix se commente, il ne se publie pas seul" });

  return { on, paragraphes, ecartes };
}

/** Le brouillon en texte, prêt à coller dans une note. */
export function briefTexte(b: Brief): string {
  const l: string[] = [`Brouillon de note · observations au ${jour(b.on)}`, ""];
  for (const p of b.paragraphes) l.push(`## ${p.titre}`, "", p.texte, "");
  l.push("---", "", "Non repris, et pourquoi :", "");
  for (const e of b.ecartes) l.push(`- ${e.titre} : ${e.raison}.`);
  l.push(
    "",
    "Chaque chiffre porte sa date d'observation et son nombre de séances. Un rendement calculé se présente comme calculé.",
    "Ce texte est une matière, pas une note : une note se signe, se date et se relit, ce qui appartient à Publications.",
  );
  return l.join("\n");
}
