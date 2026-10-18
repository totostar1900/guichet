"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useT } from "@/i18n/client";
import { COLONNE_CLIENT, COLONNE_DESK, COLONNE_VISITEUR, estParcoursFerme, estRouteLarge, groupeDe, pageDe, type GroupeColonne } from "@/lib/nav-colonne";
import styles from "./Colonne.module.css";

/**
 * LA NAVIGATION PASSE À GAUCHE, EN COLONNE, ET LE HAUT EST RENDU À LA PAGE.
 *
 * Deux rangées d'onglets gelaient le haut de chaque page du desk : soixante-deux
 * pixels d'enseigne, cent vingt de la barre à six groupes, quarante-deux de
 * creux. Deux cent vingt-quatre pixels que personne ne lisait deux fois, en
 * haut de l'écran, là où commence la page.
 *
 * TROIS CHOSES QUE LA COLONNE PEUT ET QUE LA BARRE NE POUVAIT PAS.
 *
 *   ELLE TIENT LES TRENTE-HUIT ONGLETS. Une barre a un budget de largeur, une
 *   colonne un budget de longueur. Cinq pages du desk n'avaient aucun onglet
 *   faute de place, et l'on n'y arrivait qu'en tapant l'adresse.
 *
 *   ELLE DIT LE NOM ENTIER. « Allocations et règlement » mangeait la place de
 *   deux onglets dans la barre.
 *
 *   ELLE RÉPOND « QUE DOIS-JE FAIRE » AVANT « OÙ ALLER ». Les compteurs
 *   existaient déjà sur les onglets ; en tête de colonne, ils font un ordre du
 *   jour. Le bloc ne paraît que s'il porte un chiffre : un compteur à zéro se
 *   tait.
 *
 * ELLE S'OUVRE REPLIÉE, et c'est l'essai qui l'a dit, pas le calcul. Déployée,
 * la page ouverte du desk tombe dans le troisième groupe, donc sous la ligne de
 * flottaison : la liste fait mille quatre cent cinquante-deux pixels pour cinq
 * cent onze visibles, et l'on ne voit pas où l'on est. Une carte qui cache
 * votre position n'est pas une carte. Repliée, les six noms de groupe tiennent
 * avec le seul groupe courant ouvert, et rien ne défile.
 *
 * UN PLI NE CACHE JAMAIS UN CHIFFRE. Une étiquette repliée porte le nombre de
 * ses pages et la somme de ses pastilles. C'est la règle des contrôles du
 * desk : acquitter n'est pas se taire. Un groupe qui avalerait ses alertes
 * rendrait le repli dangereux, et plus personne ne replierait rien.
 *
 * PAS D'ICÔNES. La maison en a vingt-deux, écrites pour LES TUILES, et sa
 * propre note dit pourquoi : « sans dessin, une grille de noms courts serait
 * moins lisible, c'est la silhouette qu'on reconnaît avant de lire ». Une
 * grille se balaie, une colonne se lit au mot. Les trente-huit onglets du desk
 * n'en ont aucune, et il faudrait en inventer trente-huit distinctes pour
 * poser une puce devant chaque nom.
 *
 * ELLE NE PARAÎT QU'AU-DELÀ DE 1040 PIXELS. En dessous, rien ne change : le
 * téléphone garde son dock et son « ⋮ », et la barre du haut sert les écrans
 * intermédiaires. Une mise en page d'écran large ne se négocie pas sur un
 * téléphone.
 */
export type EtatColonne = "repliee" | "deployee" | "escamotee";

const CLEF_PLIS = "guichet:colonne:plis";
const CLEF_ETAT = "guichet:colonne:etat";

export function Colonne({
  mode,
  connecte,
  badges = {},
  enseigne,
  pied,
}: {
  /** « desk » sert la console, « client » le guichet. */
  mode: "desk" | "client";
  connecte: boolean;
  /** Ce qui attend, par adresse. Les mêmes chiffres que portaient les onglets. */
  badges?: Record<string, number>;
  enseigne: React.ReactNode;
  pied: React.ReactNode;
}) {
  const path = usePathname();
  const t = useT();
  const groupes: GroupeColonne[] = mode === "desk" ? COLONNE_DESK : connecte ? COLONNE_CLIENT : COLONNE_VISITEUR;
  const actifG = groupeDe(groupes, path);
  const actifP = pageDe(groupes, path);

  /* L'état est celui que la personne a laissé. À défaut, la route décide :
     une page large s'ouvre sans colonne, les autres repliées. */
  const [etat, setEtat] = useState<EtatColonne | null>(null);
  const [plies, setPlies] = useState<Set<string>>(new Set());
  const [pret, setPret] = useState(false);

  useEffect(() => {
    try {
      const e = sessionStorage.getItem(CLEF_ETAT);
      if (e === "repliee" || e === "deployee" || e === "escamotee") setEtat(e);
      const p = localStorage.getItem(CLEF_PLIS);
      if (p) setPlies(new Set(JSON.parse(p) as string[]));
    } catch {
      /* Un navigateur qui refuse son stockage rend la colonne telle qu'elle naît. */
    }
    setPret(true);
  }, []);

  const retenir = useCallback((e: EtatColonne) => {
    setEtat(e);
    try {
      sessionStorage.setItem(CLEF_ETAT, e);
    } catch {
      /* rien : le choix vaut pour cette page */
    }
  }, []);

  const effectif: EtatColonne = etat ?? (estRouteLarge(path) ? "escamotee" : "repliee");

  const basculer = (label: string) => {
    /* ON NE REPLIE PAS LÀ OÙ L'ON EST : le groupe courant reste ouvert, sans
       quoi la colonne cacherait la seule chose qu'on y cherche toujours. */
    if (label === actifG) return;
    const suite = new Set(plies);
    if (suite.has(label)) suite.delete(label);
    else suite.add(label);
    setPlies(suite);
    if (effectif !== "deployee") retenir("deployee");
    try {
      localStorage.setItem(CLEF_PLIS, JSON.stringify([...suite]));
    } catch {
      /* le pli vaut pour cette visite */
    }
  };

  if (estParcoursFerme(path)) return null;

  /**
   * QUAND AUCUN GROUPE N'EST ACTIF, LE PREMIER S'OUVRE.
   *
   * Vu sur la page d'accueil : son adresse n'appartient à aucun groupe du
   * visiteur, donc rien n'était actif, donc tout restait replié. Le visiteur
   * arrivait devant deux étiquettes fermées et pas un seul lien. Une colonne
   * qui ne montre aucune destination sur la page d'entrée est pire que pas de
   * colonne du tout.
   */
  const aOuvrirDoffice = actifG ?? groupes[0]?.label;
  const ouvert = (label: string) => label === aOuvrirDoffice || (effectif === "deployee" ? !plies.has(label) : false);

  if (effectif === "escamotee")
    return (
      <button type="button" className={styles.poignee} onClick={() => retenir("repliee")} aria-label={t("Ouvrir la navigation")} aria-expanded={false}>
        <Chevron className={styles.chOuvrir} />
      </button>
    );

  return (
    <nav className={styles.colonne} aria-label={t("Navigation")} data-pret={pret ? "oui" : undefined} data-coach="nav">
      <div className={styles.enseigne}>{enseigne}</div>
      <div className={`${styles.corps} rail-y`}>
        <Encours badges={badges} />
        {groupes.map((g) => {
          const estOuvert = ouvert(g.label);
          const alertes = g.items.reduce((a, it) => a + (badges[it.href] ?? 0), 0);
          return (
            <div key={g.label}>
              <button
                type="button"
                className={styles.gl}
                aria-expanded={estOuvert}
                onClick={() => basculer(g.label)}
                /* Le groupe courant ne se replie pas : le dire plutôt que de
                   laisser un bouton qui ne répond pas. */
                disabled={g.label === actifG}
                title={g.label === actifG ? t("Le groupe de la page ouverte reste déplié") : undefined}
              >
                <Chevron className={styles.ch} />
                <span className={styles.nm}>{t(g.label)}</span>
                {!estOuvert && <span className={styles.combien}>{g.items.length}</span>}
                {!estOuvert && alertes > 0 && <span className={styles.alerte}>{alertes}</span>}
              </button>
              {estOuvert &&
                g.items.map((it) => (
                  <Link key={it.href} href={it.href} className={styles.item} aria-current={it.href === actifP ? "page" : undefined}>
                    <span className={styles.nm}>{t(it.label)}</span>
                    {badges[it.href] ? <span className={styles.pt}>{badges[it.href]}</span> : null}
                  </Link>
                ))}
            </div>
          );
        })}
      </div>
      <div className={styles.pied}>
        {pied}
        <div className={styles.reglages}>
          <button type="button" onClick={() => retenir(effectif === "deployee" ? "repliee" : "deployee")}>
            {effectif === "deployee" ? t("Replier") : t("Tout déplier")}
          </button>
          <button type="button" onClick={() => retenir("escamotee")} aria-label={t("Masquer la navigation")}>
            {t("Masquer")}
          </button>
        </div>
      </div>
    </nav>
  );
}

/**
 * CE QUI ATTEND, AVANT OÙ ALLER.
 *
 * Les chiffres sont ceux des pastilles, qui existaient déjà. Ce bloc ne les
 * invente pas, il les remonte : du haut de la colonne on apprend qu'il y a sept
 * pièces à valider sans avoir ouvert le groupe qui les porte.
 *
 * IL NE PARAÎT QUE S'IL PORTE UN CHIFFRE. Un ordre du jour vide est une rangée
 * de plus à lire pour apprendre qu'il n'y a rien, et la maison a écrit la règle
 * ailleurs : un contrôle mesure ou se tait.
 */
function Encours({ badges }: { badges: Record<string, number> }) {
  const t = useT();
  const groupes = [...COLONNE_DESK, ...COLONNE_CLIENT];
  const vus = new Set<string>();
  const lignes: { href: string; label: string; n: number }[] = [];
  for (const g of groupes)
    for (const it of g.items) {
      const n = badges[it.href] ?? 0;
      if (n <= 0 || vus.has(it.href)) continue;
      vus.add(it.href);
      lignes.push({ ...it, n });
    }
  if (!lignes.length) return null;
  lignes.sort((a, b) => b.n - a.n);
  return (
    <div className={styles.encours}>
      <span className={styles.el}>{t("En cours")}</span>
      {lignes.slice(0, 4).map((l) => (
        <Link key={l.href} href={l.href}>
          <span className={styles.nm}>{t(l.label)}</span>
          <b>{l.n}</b>
        </Link>
      ))}
    </div>
  );
}

function Chevron({ className }: { className?: string }) {
  return (
    <svg className={className} width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M2.5 4.5 6 8l3.5-3.5" />
    </svg>
  );
}
