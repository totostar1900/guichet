"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useT } from "@/i18n/client";
import { Poignee } from "./Poignee";
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
  /**
   * LA COLONNE SUIT L'ADRESSE, PAS SEULEMENT LE RÔLE.
   *
   * Elle choisissait ses groupes d'après la session : un compte du desk
   * voyait donc les six groupes du desk JUSQUE SUR « /marche », où aucune
   * page de la liste ne correspond. Résultat mesuré : rien n'était marqué
   * actif, et la colonne ne répondait plus à « où suis-je ».
   *
   * Hors du desk, on sert donc les groupes du client, et l'on ajoute
   * l'entrée « Desk » pour revenir : c'est ce que l'ancienne barre faisait,
   * avec son onglet Desk à côté des sièges du client.
   */
  const auDesk = path === "/desk" || path.startsWith("/desk/");
  const groupes: GroupeColonne[] = auDesk
    ? COLONNE_DESK
    : connecte
      ? mode === "desk"
        ? [...COLONNE_CLIENT, { label: "La console", items: [{ href: "/desk", label: "Desk" }] }]
        : COLONNE_CLIENT
      : COLONNE_VISITEUR;
  const actifG = groupeDe(groupes, path);
  const actifP = pageDe(groupes, path);
  /* Figés au premier rendu : l'effet de montage s'en sert pour poser le repli
     de départ, et il ne doit pas se rejouer à chaque navigation. */
  const [groupesInitiaux] = useState(() => groupes.map((g) => g.label));
  const [groupeInitialActif] = useState(() => actifG ?? groupes[0]?.label);

  /* L'état est celui que la personne a laissé. À défaut, la route décide :
     une page large s'ouvre sans colonne, les autres repliées. */
  const [etat, setEtat] = useState<EtatColonne | null>(null);
  const [plies, setPlies] = useState<Set<string>>(new Set());
  const [pret, setPret] = useState(false);

  useEffect(() => {
    let deja = false;
    try {
      const e = sessionStorage.getItem(CLEF_ETAT);
      if (e === "repliee" || e === "deployee" || e === "escamotee") setEtat(e);
      const p = localStorage.getItem(CLEF_PLIS);
      if (p) {
        setPlies(new Set(JSON.parse(p) as string[]));
        deja = true;
      }
    } catch {
      /* Un navigateur qui refuse son stockage rend la colonne telle qu'elle naît. */
    }
    /**
     * À LA PREMIÈRE VISITE, ELLE S'OUVRE REPLIÉE, et j'avais défait cela sans
     * le voir en unifiant l'état du pliage.
     *
     * Mesuré sur la production : rien n'était rangé, donc la liste des pliés
     * était vide, donc les six groupes s'ouvraient et la colonne défilait de
     * six cent soixante-huit pixels. C'est très exactement le défaut que
     * l'essai du 19 octobre avait nommé : une carte qui cache votre position
     * n'est pas une carte.
     *
     * Le repli de départ se pose donc ICI, une fois, et seulement quand le
     * lecteur n'a encore rien choisi : son choix, lui, fait toujours foi.
     */
    if (!deja) setPlies(new Set(groupesInitiaux.filter((l) => l !== groupeInitialActif)));
    setPret(true);
    // Au montage seulement : ce que le lecteur fera ensuite ne doit pas être écrasé.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  /**
   * UN SEUL ÉTAT DÉCIDE DE CE QUI EST OUVERT : la liste des groupes pliés.
   *
   * Il y en avait deux, et ils se contredisaient. « Replier » et « Tout
   * déplier » écrivaient un mode global, le chevron d'un groupe écrivait sa
   * propre liste, et le chevron forçait le mode à « déployée » : ouvrir UN
   * groupe les ouvrait donc TOUS. Rapporté comme « plier et déplier ne se
   * comportent pas bien », et c'était exactement cela.
   *
   * Deux sources de vérité pour une même question finissent toujours par
   * répondre deux choses. Il n'en reste qu'une : « Tout déplier » vide la
   * liste, « Replier » y met tout sauf le groupe de la page ouverte, et un
   * chevron n'agit que sur son groupe.
   */
  const ecrirePlis = (suite: Set<string>) => {
    setPlies(suite);
    try {
      localStorage.setItem(CLEF_PLIS, JSON.stringify([...suite]));
    } catch {
      /* le pli vaut pour cette visite */
    }
  };

  const basculer = (label: string) => {
    const suite = new Set(plies);
    if (suite.has(label)) suite.delete(label);
    else suite.add(label);
    ecrirePlis(suite);
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

  /* À L'ARRIVÉE SUR UNE PAGE, SON GROUPE S'OUVRE. C'est ce qui remplace le
     verrou : on ne perd jamais sa position en naviguant, et l'on garde le
     droit de replier ensuite. */
  useEffect(() => {
    if (!aOuvrirDoffice) return;
    setPlies((p) => {
      if (!p.has(aOuvrirDoffice)) return p;
      const suite = new Set(p);
      suite.delete(aOuvrirDoffice);
      return suite;
    });
  }, [aOuvrirDoffice]);

  const ouvert = (label: string) => !plies.has(label);
  const toutDeplie = groupes.every((g) => ouvert(g.label));

  if (effectif === "escamotee")
    return (
      <button type="button" className={styles.poignee} onClick={() => retenir("repliee")} aria-label={t("Ouvrir la navigation")} aria-expanded={false}>
        <Chevron className={styles.chOuvrir} />
      </button>
    );

  return (
    <nav className={styles.colonne} aria-label={t("Navigation")} data-pret={pret ? "oui" : undefined} data-coach="nav">
      {/* LES DEUX COMMANDES MONTENT EN HAUT À DROITE, au ras de l'enseigne.
          Elles étaient au pied, sous le nom de la personne, c'est-à-dire à
          l'endroit où l'on ne regarde pas et le plus loin des chevrons
          qu'elles commandent. */}
      <div className={styles.enseigne}>
        {enseigne}
        <div className={styles.commandes}>
          <button
            type="button"
            className={styles.plier}
            onClick={() => ecrirePlis(toutDeplie ? new Set(groupes.map((g) => g.label).filter((l) => l !== aOuvrirDoffice)) : new Set())}
            aria-label={toutDeplie ? t("Replier les groupes") : t("Déplier les groupes")}
            title={toutDeplie ? t("Replier les groupes") : t("Déplier les groupes")}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
              {toutDeplie ? <path d="M4 6.5 8 3l4 3.5M4 9.5 8 13l4-3.5" /> : <path d="M4 4 8 7.5 12 4M4 8.5 8 12l4-3.5" />}
            </svg>
          </button>
          {/* L'ICÔNE PLUTÔT QUE LE MOT « MASQUER » : un panneau qui se referme
              est un geste connu, et le mot prenait la place d'un nom de page. */}
          <button type="button" className={styles.plier} onClick={() => retenir("escamotee")} aria-label={t("Masquer la navigation")} title={t("Masquer la navigation")}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="1.8" y="2.8" width="12.4" height="10.4" rx="0" />
              <path d="M6.4 2.8v10.4" />
              <path d="M11.4 6.2 9.6 8l1.8 1.8" />
            </svg>
          </button>
        </div>
      </div>
      <div className={`${styles.corps} rail-y`}>
        <Encours badges={badges} />
        {groupes.map((g) => {
          const estOuvert = ouvert(g.label);
          const alertes = g.items.reduce((a, it) => a + (badges[it.href] ?? 0), 0);
          return (
            <div key={g.label} className={styles.groupe}>
              <button
                type="button"
                className={styles.gl}
                aria-expanded={estOuvert}
                onClick={() => basculer(g.label)}
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
      {/* LA LARGEUR SE RÈGLE, parce qu'elle ne se décide pas ici. « Allocations
          et règlement » veut de la place, une table à treize colonnes n'en
          veut pas, et c'est le même écran. La poignée écrit « --colonne-w »
          sur la racine, donc la colonne ET le pied de page suivent d'un coup. */}
      <Poignee variable="--colonne-w" min={180} max={420} memoire="colonne" porte="html" libelle={t("Régler la largeur de la navigation")} className={styles.tirette} />
      <div className={styles.pied}>{pied}</div>
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
