import { displayStatus } from "@/lib/domain/status";
import { suiteDonnee } from "@/lib/domain/tenue";
import type { ActionClient } from "@/lib/domain/journal-client";
import type { CashEntry } from "@/lib/domain/cash";
import type { ClientFile } from "@/lib/domain/kyc";
import type { Contact, Intent, Notification, Offer } from "@/lib/domain/types";

/**
 * L'ACTIVITÉ D'UN CLIENT : SON INTENSITÉ, EN UN NOMBRE QUI DIT SES RAISONS.
 *
 * La tenue est un cran nommé parce qu'elle juge ; l'activité est un nombre
 * parce qu'elle ne fait qu'ordonner une liste. Cinq ingrédients, leurs poids
 * affichés à l'écran PARCE QU'ILS SONT ARBITRAIRES : ainsi la discussion
 * porte sur le poids, jamais sur le chiffre.
 *
 * UN SCORE NE SE COMPARE QU'À BARÈME ÉGAL. Les poids se règlent au
 * référentiel, donc ils bougent ; un barème porte un numéro et une date, et
 * tout score affiché dit duquel il sort. Sans cela, « 56 en octobre, 71 en
 * novembre » ne voudrait rien dire.
 *
 * UNE CONSULTATION NE PÈSE RIEN ICI. Elle nourrit la cadence et le fil des
 * gestes, pas le score : sinon regarder vaudrait acheter, et le classement de
 * la maison deviendrait un classement des curieux.
 */
export const INGREDIENTS = ["presence", "volume", "suite", "regularite", "dossier"] as const;
export type Ingredient = (typeof INGREDIENTS)[number];

export const INGREDIENT_LABEL: Record<Ingredient, string> = {
  presence: "Présence aux séances ouvertes",
  volume: "Volume réglé, à l'échelle de son palier",
  suite: "Suite donnée à ses appétits",
  regularite: "Mois où il a agi, sur douze",
  dossier: "Dossier à jour, canaux prouvés",
};

export interface Bareme {
  /** Monte de un à chaque publication : un score cite le sien. */
  version: number;
  poids: Record<Ingredient, number>;
  publieLe?: string;
  publiePar?: string;
  /** Ce qui a changé depuis le précédent, en une phrase écrite par le desk. */
  quoi?: string;
}

/**
 * Le barème d'origine : équilibré entre ce que le client apporte (volume) et
 * ce qu'il fait (présence). Un petit client régulier peut dépasser un gros
 * client absent, et c'est voulu.
 */
export const BAREME_DEFAUT: Bareme = { version: 1, poids: { presence: 30, volume: 30, suite: 20, regularite: 10, dossier: 10 } };
export const BAREME_KEY = "activite";

export const sommeDesPoids = (b: Bareme): number => INGREDIENTS.reduce((s, k) => s + (b.poids[k] ?? 0), 0);

/** Un barème dont la somme n'est pas cent rendrait des scores hors de cent. */
export const baremeValide = (b: Bareme): boolean => sommeDesPoids(b) === 100 && INGREDIENTS.every((k) => b.poids[k] >= 0 && b.poids[k] <= 100);

export interface Part {
  clef: Ingredient;
  /** Ce qu'on a mesuré, en clair : « 7 sur 12 », « 14,5 M ». */
  brut: string;
  /** Entre 0 et 1 : la part de son poids que le client obtient. */
  ratio: number;
  points: number;
  sur: number;
}

export interface Activite {
  score: number;
  bareme: number;
  parts: Part[];
}

export interface SourcesActivite {
  userId: string;
  tier: number;
  intents: Intent[];
  offers: Offer[];
  notifications: Notification[];
  cash: CashEntry[];
  gestes: ActionClient[];
  dossier?: ClientFile;
  /** Tous les clients, pour comparer un volume à son palier et non dans l'absolu. */
  contacts: Contact[];
  /** Le volume réglé de chacun, calculé une fois pour tout le monde. */
  volumes: Map<string, number>;
}

const AN = 365 * 86_400_000;

/** Les séances qui ont ouvert sur douze mois : le dénominateur de la présence. */
function seancesOuvertes(offers: Offer[], now: Date): Offer[] {
  const depuis = new Date(now.getTime() - AN).toISOString().slice(0, 10);
  return offers.filter((o) => {
    if (o.kind === "MARCHE" || o.kind === "FONDS") return false;
    const etat = displayStatus(o, now);
    if (etat === "upcoming" || etat === "open" || etat === "closing") return false;
    return (o.deadlineAt ?? "").slice(0, 10) >= depuis;
  });
}

const borne = (x: number) => Math.max(0, Math.min(1, x));

export function activite(s: SourcesActivite, bareme: Bareme, now = new Date()): Activite {
  const siens = s.intents.filter((i) => i.clientId === s.userId);
  const depuis = new Date(now.getTime() - AN).toISOString();

  /* 1. Présence : les séances où il a déposé quelque chose, sur celles qui
        ont ouvert. Une maison sans séance ouverte ne reproche rien. */
  const ouvertes = seancesOuvertes(s.offers, now);
  const suivies = new Set(siens.filter((i) => i.createdAt >= depuis).map((i) => i.offerId));
  const presentes = ouvertes.filter((o) => suivies.has(o.id)).length;
  const presence: Part = {
    clef: "presence",
    brut: `${presentes} / ${ouvertes.length}`,
    ratio: ouvertes.length ? borne(presentes / ouvertes.length) : 0,
    points: 0,
    sur: bareme.poids.presence,
  };

  /* 2. Volume, COMPARÉ À SON PALIER et jamais en valeur absolue : sans cela
        trois institutionnels occuperaient tout le haut de la liste et la
        colonne ne dirait plus rien des autres. */
  const sien = s.volumes.get(s.userId) ?? 0;
  const memePalier = s.contacts.filter((c) => (c.tier ?? 1) === s.tier && !c.demo).map((c) => s.volumes.get(c.id) ?? 0);
  const plusHaut = Math.max(...memePalier, 0);
  const volume: Part = {
    clef: "volume",
    brut: sien ? sien.toLocaleString("fr-FR") : "—",
    ratio: plusHaut > 0 ? borne(sien / plusHaut) : 0,
    points: 0,
    sur: bareme.poids.volume,
  };

  /* 3. Suite donnée aux appétits, avec les trois exclusions de la tenue : une
        ligne qui n'a pas ouvert, un silence sans relance et une ligne retirée
        ne comptent pas. Sans appétit, l'ingrédient est plein : on ne punit
        pas quelqu'un de ne rien avoir annoncé. */
  const sd = suiteDonnee(s.userId, s.intents, s.offers, s.notifications, now);
  const suite: Part = {
    clef: "suite",
    brut: sd.ouverts ? `${sd.suivis} / ${sd.ouverts}` : "—",
    ratio: sd.ouverts ? borne(sd.suivis / sd.ouverts) : 1,
    points: 0,
    sur: bareme.poids.suite,
  };

  /* 4. Régularité : les mois où quelque chose s'est passé, sur douze. Les
        trois sources comptent, parce que le registre des gestes est jeune et
        qu'un client d'avant son ouverture n'a pas à paraître absent. */
  const mois = new Set<string>();
  for (const i of siens) if (i.createdAt >= depuis) mois.add(i.createdAt.slice(0, 7));
  for (const c of s.cash) if (c.at >= depuis) mois.add(c.at.slice(0, 7));
  for (const g of s.gestes) if (g.at >= depuis) mois.add(g.at.slice(0, 7));
  const regularite: Part = {
    clef: "regularite",
    brut: `${mois.size} / 12`,
    ratio: borne(mois.size / 12),
    points: 0,
    sur: bareme.poids.regularite,
  };

  /* 5. Ce qui nous évite de lui redemander ce qu'il a déjà donné. */
  const f = s.dossier;
  const aJour = f?.status === "approuve" ? 1 : f?.status === "soumis" || f?.status === "en_revue" ? 0.5 : 0;
  const canaux = (f?.consents?.whatsappAt ? 0.5 : 0) + (f?.consents?.dataAt ? 0.5 : 0);
  const dossier: Part = {
    clef: "dossier",
    brut: f ? (aJour === 1 ? "à jour" : "en cours") : "aucun dossier",
    ratio: borne(aJour * 0.6 + canaux * 0.4),
    points: 0,
    sur: bareme.poids.dossier,
  };

  const parts = [presence, volume, suite, regularite, dossier].map((p) => ({ ...p, points: Math.round(p.ratio * p.sur) }));
  return { score: parts.reduce((n, p) => n + p.points, 0), bareme: bareme.version, parts };
}

/** Le volume réglé de chaque client sur douze mois : une passe pour tout le monde. */
export function volumesRegles(intents: Intent[], now = new Date()): Map<string, number> {
  const depuis = new Date(now.getTime() - AN).toISOString();
  const out = new Map<string, number>();
  for (const i of intents) {
    if (!i.clientId || i.state !== "reglee" || i.updatedAt < depuis) continue;
    out.set(i.clientId, (out.get(i.clientId) ?? 0) + (i.amount ?? 0));
  }
  return out;
}
