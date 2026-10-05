import type { Offer } from "./types";
import type { OfferSummary } from "./summary";
import { displayYield } from "./status";

/**
 * LES REPÈRES DU TOUR DE LA FICHE : ce que la page dit d'elle-même, en cinq
 * arrêts, avec les chiffres de CETTE ligne.
 *
 * Ils vivaient dans le composant de page, construits sur place. C'était
 * commode et c'était une zone non gardée : les phrases se composent autour du
 * chiffre principal, donc elles traversent t() sous forme de variable, donc le
 * scanner de clefs ne les voit pas. Elles pouvaient repasser en français sans
 * que rien ne le dise, et un repère ajouté plus tard l'aurait fait en silence.
 *
 * Ici, un cliquet peut les composer pour chaque nature de ligne et vérifier que
 * le dictionnaire les connaît. C'est la seule raison du déplacement : la page
 * ne fait rien d'autre qu'appeler cette fonction et traduire ce qu'elle rend.
 */
export interface CoachStop {
  target: string;
  title: string;
  text: string;
}

/**
 * Le premier arrêt dépend de ce qu'est le chiffre principal, et ces quatre
 * phrases ne sont pas interchangeables : une valeur liquidative n'est pas un
 * rendement, et un taux au pair n'est pas un rendement servi à un prix.
 */
function heroText(o: Offer, s: OfferSummary): string {
  const h = s.hero;
  if (o.kind === "FONDS") return `${h} ${s.heroUnit ?? ""}: la dernière valeur liquidative connue. Une souscription s'exécute à la prochaine, pas à celle-ci.`;
  if (o.kind === "ACTIONS" || (o.kind === "MARCHE" && o.instrument === "action")) return `${h} : ce que le dividende rapporte au prix du jour, s'il est maintenu. Le cours, lui, peut monter ou descendre.`;
  if (displayYield(o).atPar) return `${h} : le taux nominal, parce que la ligne est au pair. Brut, avant impôt, si vous gardez le titre jusqu'à l'échéance.`;
  return `${h} : ce que rapporte la ligne chaque année si vous êtes servi au prix affiché et gardez le titre jusqu'à l'échéance. Brut, avant impôt.`;
}

export function ficheStops(o: Offer, s: OfferSummary, opts: { hasNews?: boolean } = {}): CoachStop[] {
  return [
    { target: "hero", title: "Le chiffre qui compte", text: heroText(o, s) },
    {
      target: "kpis",
      title: "Chaque chiffre s'explique",
      text: "Touchez une carte : d'où vient le chiffre, ligne par ligne, avec l'éclairage de deux minutes qui va avec. Les bulles « i » de la page font pareil pour chaque mot ; tout est réuni sous Info, avec un simulateur et la page Aide.",
    },
    {
      target: "status",
      title: "Où en est la ligne",
      // Une clôture proche se dit en temps restant ; sinon le statut parle de
      // ce qui est possible, et non de ce qui ne l'est pas.
      text: s.countdown
        ? `Clôture dans ${s.countdown} : après cette limite, plus de soumission possible. Une intention se déclare avant.`
        : `${s.status}. Le statut dit ce que vous pouvez faire : souscrire, passer un ordre, ou seulement poser une question.`,
    },
    ...(opts.hasNews
      ? [
          {
            target: "news",
            title: "Ce qui s'est dit sur cette ligne",
            text: "Communiqués, bulletins, avis : le desk relie ici les publications qui concernent cette ligne, avec deux lignes sur ce que cela change. L'original est à un clic.",
          },
        ]
      : []),
    { target: "action", title: "Agir en trois étapes", text: "Montant, coordonnées, récapitulatif. Le desk vous rappelle avant de transmettre : rien n'est débité sans votre confirmation." },
  ];
}
