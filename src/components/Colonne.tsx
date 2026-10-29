"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useT } from "@/i18n/client";
import { Poignee } from "./Poignee";
import { useColonne } from "./ColonneStore";
import { COLONNE_CLIENT, COLONNE_DESK, COLONNE_VISITEUR, estRouteLarge, groupeDe, pageDe, type GroupeColonne } from "@/lib/nav-colonne";
import { loadGuideIndex } from "@/lib/guide-index-client";
import type { SearchEntry } from "@/app/info/InfoSearch";
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
const CLEF_EPINGLES = "guichet:colonne:epingles";

export function Colonne({
  mode,
  connecte,
  badges: badgesPasses,
  enseigne,
  pied,
}: {
  /** « desk » sert la console, « client » le guichet. */
  mode: "desk" | "client";
  connecte: boolean;
  /** Ce qui attend, par adresse. Omis, la colonne les lit au magasin, ce qui est le cas de l'application entière ; le passer sert à monter une colonne isolée. */
  badges?: Record<string, number>;
  enseigne: React.ReactNode;
  pied: React.ReactNode;
}) {
  /**
   * LES PASTILLES SE LISENT AU MAGASIN, ET PERSONNE NE LES Y LISAIT.
   *
   * `DeskNav` compte ce qui attend, page par page, et le déclare au magasin —
   * sa propre documentation dit « elle les déclare donc au magasin, et la
   * colonne les lit ». La colonne ne les lisait pas : elle attendait une
   * `prop`, que `layout.tsx` ne lui a jamais passée. `useColonne` n'avait donc
   * qu'un seul appelant dans tout le dépôt, et c'était l'ÉCRIVAIN.
   *
   * CE QUE ÇA ÉTEIGNAIT, SANS QUE RIEN N'ÉCHOUE : le bloc « En cours » ne
   * paraissait jamais (il se tait quand il n'a aucun chiffre, et il n'en avait
   * aucun) ; aucune pastille ne s'allumait dans le rail, ni dans les favoris,
   * ni dans les résultats de recherche ; et le compte d'alertes d'un groupe
   * replié valait toujours zéro, donc un groupe fermé ne disait jamais ce
   * qu'il cachait. Mesuré le 24 octobre 2026 : `/desk/a-valider` publiait 3,
   * `/desk/messages` 2, `/desk/clients` 1 — tous dans une barre que la feuille
   * de style masque au-delà de 1040 px, c'est-à-dire exactement là où la
   * colonne règne.
   */
  const { badges: duMagasin } = useColonne();
  const badges = badgesPasses ?? duMagasin;
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
      /* LE STOCKAGE NE SE LIT QU'APRÈS L'HYDRATATION, donc dans un effet. Le
         lire dans l'initialisateur d'un « useState » ferait rendre au serveur
         une colonne et au navigateur une autre : une discordance
         d'hydratation à chaque visiteur qui a déjà réglé son siège. Le rendu
         coûte un passage de plus, et c'est le prix de l'accord des deux
         côtés. */
      // eslint-disable-next-line react-hooks/set-state-in-effect
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

  /* LE COUP D'ŒIL AU BORD : un état de la session, jamais du stockage. Il ne
     survit ni à la page ni au rechargement, et c'est voulu — voir la note
     « SURVOLER N'EST PAS CHOISIR », plus bas. */
  const [lorgne, setLorgne] = useState(false);
  const entreeRef = useRef<number | undefined>(undefined);
  const sortieRef = useRef<number | undefined>(undefined);
  /* On suit un lien : la colonne se referme avec la page qu'on quitte, et les
     minuteries en cours s'éteignent avec elle. */
  useEffect(() => {
    /* La colonne ne se démonte pas en naviguant — la mise en page la garde —
       donc rien d'autre ne referme le coup d'œil. La remonter sur une clef de
       route le ferait, mais au prix de relire le stockage et de perdre le
       défilement à chaque lien suivi. */
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLorgne(false);
  }, [path]);
  useEffect(
    () => () => {
      window.clearTimeout(entreeRef.current);
      window.clearTimeout(sortieRef.current);
    },
    [],
  );

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
  /**
   * LES FAVORIS : LA COLONNE RANGE PAR SUJET, LE DESK TRAVAILLE PAR HABITUDE.
   *
   * Six groupes et quarante-trois pages disent où CHAQUE chose se trouve.
   * Mais une personne du desk en ouvre cinq ou six dans sa journée, toujours
   * les mêmes, et elles sont éparpillées dans quatre groupes : « À valider »,
   * « Bulletins », « Santé », « Journal ». La carte est juste, le chemin est
   * long.
   *
   * Une épingle met la page en tête, au-dessus des groupes. C'est un réglage
   * de siège, pas une donnée de la maison : il vit dans ce navigateur et ne
   * voyage pas, comme la largeur de la colonne.
   */
  const [epingles, setEpingles] = useState<string[]>([]);
  useEffect(() => {
    try {
      const e = localStorage.getItem(CLEF_EPINGLES);
      // Après l'hydratation, comme l'état de la colonne : voir la note plus haut.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (e) setEpingles(JSON.parse(e) as string[]);
    } catch {
      /* sans stockage, la colonne se passe de favoris */
    }
  }, []);
  const basculerEpingle = (href: string) => {
    const suite = epingles.includes(href) ? epingles.filter((h) => h !== href) : [...epingles, href];
    setEpingles(suite);
    try {
      localStorage.setItem(CLEF_EPINGLES, JSON.stringify(suite));
    } catch {
      /* le favori vaut pour cette visite */
    }
  };

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

  /* LES PARCOURS FERMÉS N'EXISTENT PLUS. La colonne disparaissait sur
     « /ouvrir-un-compte », sa convention, le désabonnement et la déclaration
     d'intention, au nom d'un tunnel qu'on ne quitte pas. Mesuré sur la
     production : la page de la convention n'avait donc AUCUNE sortie que la
     flèche du navigateur, et c'est une page où l'on signe — le moment où l'on
     veut le plus pouvoir aller relire autre chose. Un tunnel qu'on ne peut
     pas quitter n'est pas un tunnel, c'est une porte fermée à clef. */

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
    /* C'EST UNE ÉCRITURE, PAS UNE DÉRIVATION, et c'est voulu. Déduire
       « le groupe actif est toujours ouvert » enlèverait au lecteur le droit
       de le replier ensuite — exactement ce que la note ci-dessus garde. Le
       groupe s'ouvre donc une fois, à l'arrivée, et le choix suivant fait
       foi. */
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlies((p) => {
      if (!p.has(aOuvrirDoffice)) return p;
      const suite = new Set(p);
      suite.delete(aOuvrirDoffice);
      return suite;
    });
  }, [aOuvrirDoffice]);

  const ouvert = (label: string) => !plies.has(label);
  const toutDeplie = groupes.every((g) => ouvert(g.label));

  /* Les deux minuteries du coup d'œil. Une seule à la fois : entrer annule la
     sortie en cours, et l'inverse. */
  const entrerAuBord = useCallback(() => {
    window.clearTimeout(sortieRef.current);
    window.clearTimeout(entreeRef.current);
    entreeRef.current = window.setTimeout(() => setLorgne(true), 200);
  }, []);
  const quitterLeBord = useCallback(() => {
    window.clearTimeout(entreeRef.current);
    window.clearTimeout(sortieRef.current);
    sortieRef.current = window.setTimeout(() => setLorgne(false), 400);
  }, []);

  /**
   * ESCAMOTÉE, ELLE SE MONTRE AU SURVOL DU BORD — ET TROIS RÈGLES LA TIENNENT.
   *
   * LA POIGNÉE RESTE. Le survol n'existe ni au doigt ni au clavier : en faire
   * le seul chemin rendrait la navigation inatteignable sur un téléphone et
   * pour qui tabule. Il s'ajoute, il ne remplace pas.
   *
   * UNE LISIÈRE ET UN DÉLAI, PAS UN BORD. Un bord de deux pixels déclenché à
   * l'instant s'ouvre quand on vise la barre de défilement ou qu'on revient
   * du bureau. Seize pixels, deux dixièmes de seconde pour entrer, quatre
   * pour sortir : le temps de traverser un coin sans que tout se referme.
   *
   * SURVOLER N'EST PAS CHOISIR. Ce coup d'œil ne retient rien : « retenir »
   * n'est pas appelé, et l'état escamoté reste celui que la personne a posé.
   * Seule la poignée le change. Sans cela, un geste involontaire réécrirait
   * une préférence — le défaut même que le 19 octobre avait corrigé sur le
   * pliage des groupes.
   */
  if (effectif === "escamotee" && !lorgne)
    return (
      <>
        <button type="button" className={styles.poignee} onClick={() => retenir("repliee")} aria-label={t("Ouvrir la navigation")} aria-expanded={false}>
          <Chevron className={styles.chOuvrir} />
        </button>
        <div className={styles.lisiere} aria-hidden="true" onMouseEnter={entrerAuBord} onMouseLeave={quitterLeBord} />
      </>
    );

  return (
    <nav
      className={`${styles.colonne} ${lorgne ? styles.lorgnee : ""}`}
      aria-label={t("Navigation")}
      data-pret={pret ? "oui" : undefined}
      data-coach="nav"
      onMouseEnter={lorgne ? entrerAuBord : undefined}
      onMouseLeave={lorgne ? quitterLeBord : undefined}
    >
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
      <Chercher groupes={groupes} badges={badges} auDesk={auDesk} connecte={connecte} />
      <div className={`${styles.corps} rail-y`}>
        <Epingles groupes={groupes} epingles={epingles} basculerEpingle={basculerEpingle} actifP={actifP} badges={badges} />
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
                {/* LE COMPTE DES PAGES EST RETIRÉ : savoir qu'un groupe en
                    porte onze n'aide personne à décider s'il faut l'ouvrir.
                    LA SOMME DES PASTILLES RESTE, parce qu'elle, elle dit s'il
                    y a quelque chose à y faire : un pli ne cache pas un
                    chiffre qui appelle. */}
                {!estOuvert && alertes > 0 && <span className={styles.alerte}>{alertes}</span>}
              </button>
              {estOuvert &&
                g.items.map((it) => (
                  <span key={it.href} className={styles.rangee}>
                    <Link href={it.href} className={styles.item} aria-current={it.href === actifP ? "page" : undefined}>
                      <span className={styles.nm}>{t(it.label)}</span>
                      {badges[it.href] ? <span className={styles.pt}>{badges[it.href]}</span> : null}
                    </Link>
                    <button
                      type="button"
                      className={styles.punaise}
                      onClick={() => basculerEpingle(it.href)}
                      aria-pressed={epingles.includes(it.href)}
                      aria-label={epingles.includes(it.href) ? t("Retirer des favoris") : t("Mettre en favori")}
                      title={epingles.includes(it.href) ? t("Retirer des favoris") : t("Mettre en favori")}
                    >
                      <Punaise pleine={epingles.includes(it.href)} />
                    </button>
                  </span>
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
 *
 * CE QU'IL NE SAIT PAS FAIRE, ET IL FAUT LE DIRE. Sa promesse est d'apprendre
 * « sept pièces à valider » SANS ouvrir le groupe qui les porte. Il ne la tient
 * qu'à moitié, et pas par un défaut d'ici : les chiffres sont déclarés par la
 * page OUVERTE, et retirés quand elle se ferme (`DeclarerBadges`, et c'est la
 * bonne règle — un compte qui survit à la page qui l'a produit est une panne
 * muette). Le bloc ne peut donc montrer que ce que la page courante publie :
 * sur `/desk/a-valider`, « À valider 3 », c'est-à-dire l'endroit où l'on est
 * déjà. Il n'est utile que lorsqu'une page compte POUR UNE AUTRE, comme le
 * tableau de bord qui compte les approbations.
 *
 * Le tenir entièrement demande une autre source : un compte calculé pour
 * toutes les pages à la fois, au rendu du gabarit, et non page par page. C'est
 * une décision de données, pas d'affichage, et elle n'est pas prise ici.
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

/**
 * LA RECHERCHE, ET CE QU'ELLE APPORTE QU'UNE LISTE NE PEUT PAS.
 *
 * Quarante-trois pages rangées en six groupes répondent à « où se trouve
 * X » quand on connaît le rangement. Elles ne répondent pas à « je veux
 * aller à X », qui est la question qu'on se pose vraiment, et qui demande
 * aujourd'hui de se rappeler SOUS QUEL GROUPE une page a été classée.
 * « Barème » est-il dans « La maison » ou dans « Le marché » ? On ouvre
 * deux groupes pour le savoir.
 *
 * TROIS CHOSES QU'ELLE SAIT FAIRE, ET AUCUNE N'INVENTE DE DONNÉE.
 *
 *   ELLE CHERCHE DANS LES NOMS, sans accent ni casse, par morceaux : « all
 *   reg » trouve « Allocations et règlement ». Chaque mot doit toucher,
 *   comme le chercheur de personnes du desk, parce que deux mots qui
 *   touchent chacun à moitié ne désignent rien.
 *
 *   ELLE DIT LE GROUPE de chaque résultat. On apprend le rangement en
 *   cherchant, au lieu de devoir le connaître avant.
 *
 *   ELLE RECONNAÎT CE QUI N'EST PAS UN NOM DE PAGE. Un code d'émission à
 *   douze caractères, une date de séance : ce ne sont pas des pages, mais
 *   ils désignent sans ambiguïté la page qui les porte. Taper
 *   « GA2J00000085 » mène aux résultats d'adjudication, « 2026-10-15 » aux
 *   bulletins de cette date. C'est là que « intelligente » a un sens : la
 *   barre reconnaît la FORME de ce qu'on tape.
 *
 * Elle ne cherche PAS dans les données : une barre qui interroge la base à
 * chaque frappe est une barre qui fait attendre, et le desk a déjà ses
 * pages de recherche pour cela.
 *
 * ELLE CHERCHE EN REVANCHE DANS L'AIDE, depuis le 29 octobre 2026, et c'est
 * la seule façon honnête d'avoir « la recherche au menu Aide ». La colonne
 * portait DÉJÀ ce champ, qui ne trouvait que des noms de pages : en ajouter
 * un second, scopé à l'aide, aurait mis deux promesses différentes à dix
 * pixels l'une de l'autre, et appris au lecteur à ne se fier à aucune des
 * deux. Un seul champ, donc, et il connaît les cent cinquante-cinq entrées du
 * guide : les soixante-six termes du glossaire, les quarante et une réponses,
 * les éclairages et les outils.
 *
 * L'INDEX ARRIVE APRÈS LA PREMIÈRE FRAPPE, pas au chargement de chaque page :
 * la colonne est sur toutes les pages, et payer un index à chaque ouverture
 * pour un champ qu'on ne touche pas serait le payer pour rien.
 */
const sansAccent = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

const CODE_CEMAC = /^[A-Za-z]{2}[0-9][0-9A-Za-z]\d{8}$/;
const DATE_ISO = /^\d{4}-\d{2}-\d{2}$/;

function Chercher({ groupes, badges, auDesk, connecte }: { groupes: GroupeColonne[]; badges: Record<string, number>; /** Les deux formes reconnues mènent à des pages du desk : hors du desk, elles n'ont rien à proposer. */ auDesk: boolean; /** La recherche entière est derrière la connexion ; un visiteur a le guide public. */ connecte: boolean }) {
  const t = useT();
  const [q, setQ] = useState("");
  const [guide, setGuide] = useState<SearchEntry[] | null>(null);
  const mots = sansAccent(q.trim()).split(/\s+/).filter(Boolean);

  /* L'index du guide, demandé à la première frappe et gardé pour la vie de la
     page. « loadGuideIndex » dédoublonne déjà l'appel avec la barre du Guide. */
  useEffect(() => {
    if (!q.trim() || guide) return;
    let vivant = true;
    loadGuideIndex()
      .then((i) => {
        if (vivant) setGuide(i.entries);
      })
      .catch(() => {
        /* Sans index, le champ reste ce qu'il était : des noms de pages. */
      });
    return () => {
      vivant = false;
    };
  }, [q, guide]);

  const toutes = groupes.flatMap((g) => g.items.map((it) => ({ ...it, groupe: g.label })));
  /* CHAQUE MOT DOIT TOUCHER : « all reg » trouve « Allocations et
     règlement », « reg all » aussi, et « allreg » rien, ce qui est juste. */
  const parLeNom = mots.length ? toutes.filter((it) => mots.every((m) => sansAccent(t(it.label)).includes(m) || sansAccent(it.label).includes(m))) : [];

  /* CE QUI N EST PAS UN NOM DE PAGE mais désigne une page sans ambiguïté.
     LES DEUX MÈNENT AU DESK, et la colonne du client les offrait quand même :
     mesuré le 24 octobre 2026, taper un code à douze caractères dans le
     guichet proposait « /desk/adjudications/tableau », une adresse qui
     n'existe pas sur l'hôte du client et qu'il n'aurait pas le droit
     d'ouvrir. Une barre qui reconnaît une forme doit aussi reconnaître à qui
     elle parle. */
  const brut = q.trim();
  const parLaForme: { href: string; label: string; groupe: string }[] = [];
  if (auDesk && CODE_CEMAC.test(brut)) parLaForme.push({ href: `/desk/adjudications/tableau?q=${encodeURIComponent(brut.toUpperCase())}`, label: t("Chercher le code {code}", { code: brut.toUpperCase() }), groupe: t("Résultats") });
  if (auDesk && DATE_ISO.test(brut)) parLaForme.push({ href: `/desk/bulletins?seance=${brut}`, label: t("Le bulletin du {date}", { date: brut }), groupe: t("Bulletins") });

  /* CE QUE LE GUIDE SAIT : un terme, une réponse, un éclairage. Il vient APRÈS
     les noms de pages, qui sont instantanés et que le lecteur vise le plus
     souvent, et son étiquette dit de quel genre il est — « Glossaire »,
     « Aide » — pour qu'on sache ce qu'on ouvre avant de cliquer. */
  const GENRE: Record<SearchEntry["kind"], string> = {
    terme: "Glossaire",
    lecon: "Éclairage",
    outil: "Outil",
    page: "Aide",
    service: "Trade",
    instrument: "Instrument",
  };
  const parLeGuide = mots.length && guide
    ? guide
        .filter((e) => mots.every((m) => sansAccent(e.title).includes(m) || sansAccent(e.text).includes(m) || sansAccent(e.extra ?? "").includes(m)))
        .map((e) => ({ href: e.href, label: e.title, groupe: t(GENRE[e.kind]) }))
    : [];

  const vus = new Set<string>();
  const resultats = [...parLaForme, ...parLeNom, ...parLeGuide].filter((r) => !vus.has(r.href) && vus.add(r.href)).slice(0, 8);

  return (
    /* Le repère du Guide qui montrait sa recherche vise ce champ : c'est ici
       que la recherche du guide vit depuis le 29 octobre 2026. */
    <div className={styles.chercher} data-coach="colonne-recherche">
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        /* Le mot tient dans la colonne : « une page, un mot, une réponse » y
           était coupé à « une rép ». Une promesse tronquée n'en est pas une. */
        placeholder={t("Chercher une page, une réponse")}
        aria-label={t("Chercher une page, une réponse")}
        className={styles.champ}
      />
      {mots.length > 0 && (
        <div className={styles.trouves}>
          {resultats.length === 0 ? (
            <span className={styles.rien}>{guide ? t("Rien de ce nom") : t("Un instant…")}</span>
          ) : (
            resultats.map((r) => (
              <Link key={r.href} href={r.href} className={styles.trouve} onClick={() => setQ("")}>
                <span className={styles.nm}>{t(r.label)}</span>
                <em>{t(r.groupe)}</em>
                {badges[r.href] ? <span className={styles.pt}>{badges[r.href]}</span> : null}
              </Link>
            ))
          )}
          {/* L'ISSUE, ET C'EST LA SEULE DU BUREAU.
              Cette barre cherche des NOMS DE PAGE, et c'est tout ce qu'elle
              doit faire : elle est locale, instantanée, elle dit le groupe et
              porte les pastilles. Mais « Aucune page de ce nom » était un
              cul-de-sac — mesuré le 24 octobre 2026 : « sécurité » n'y
              trouvait rien alors que la maison a une page « Sécurité » et cinq
              réponses d'aide sur le sujet, et au-dessus de 1040 px il n'existait
              AUCUN chemin vers la recherche entière : zéro lien, zéro loupe.
              La colonne gagne contre la loupe sur ce format, et elle ne menait
              nulle part. Elle y mène maintenant, avec la question déjà tapée. */}
          {/* NI AU DESK, pour la raison qui vaut dans l'autre sens : « /recherche »
              est une page du guichet, et la console a sa propre recherche. */}
          {connecte && !auDesk && (
            <Link className={styles.partout} href={`/recherche?q=${encodeURIComponent(q.trim())}`} onClick={() => setQ("")}>
              {t("Chercher « {q} » partout", { q: q.trim() })} →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

/** Les pages que le desk a épinglées, au-dessus des groupes. */
function Epingles({ groupes, epingles, basculerEpingle, actifP, badges }: { groupes: GroupeColonne[]; epingles: string[]; basculerEpingle: (h: string) => void; actifP?: string; badges: Record<string, number> }) {
  const t = useT();
  /**
   * ON FILTRE L'AFFICHAGE, ON NE PURGE PAS LE STOCKAGE, et c'est voulu.
   *
   * Une adresse épinglée qui n'est pas dans le rail courant ne s'affiche pas,
   * et reste enregistrée. Ça ressemble à une liste qui pourrit — j'ai
   * commencé par le lire ainsi — mais c'est l'inverse : les deux publics
   * partagent une seule clef, et le desk et le guichet n'ont pas les mêmes
   * pages. Purger à l'affichage effacerait les favoris du desk dès qu'un
   * opérateur ouvre le guichet, et réciproquement. Le silence est le prix de
   * cette mémoire, et il est moins cher que l'oubli.
   */
  const toutes = groupes.flatMap((g) => g.items);
  const choisies = epingles.map((h) => toutes.find((it) => it.href === h)).filter((it): it is { href: string; label: string } => Boolean(it));
  if (!choisies.length) return null;
  return (
    <div className={styles.epingles}>
      <span className={styles.el}>{t("Favoris")}</span>
      {choisies.map((it) => (
        <span key={it.href} className={styles.rangee}>
          <Link href={it.href} className={styles.item} aria-current={it.href === actifP ? "page" : undefined}>
            <span className={styles.nm}>{t(it.label)}</span>
            {badges[it.href] ? <span className={styles.pt}>{badges[it.href]}</span> : null}
          </Link>
          {/* « aria-pressed » N'EST PAS DÉCORATIF ICI : la feuille de style
              garde l'épingle visible au repos par « .punaise[aria-pressed=
              "true"] », et sa raison est écrite à côté — « une épingle qu'on
              ne voit qu'au survol ne se retire pas, parce qu'on ne sait plus
              qu'elle est là ». Cette liste-ci ne posait pas l'attribut : ses
              épingles, TOUTES posées par définition, étaient les seules
              invisibles au repos. Mesuré le 24 octobre 2026 : opacité 0 sous
              « Favoris », 1 pour la même page dans son groupe. L'attribut dit
              aussi l'état à qui écoute la page. */}
          <button type="button" className={styles.punaise} onClick={() => basculerEpingle(it.href)} aria-pressed aria-label={t("Retirer des favoris")} title={t("Retirer des favoris")}>
            <Punaise pleine />
          </button>
        </span>
      ))}
    </div>
  );
}

function Punaise({ pleine }: { pleine?: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill={pleine ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 1.6 9.9 5.5l4.3.6-3.1 3 .7 4.3L8 11.4 4.2 13.4l.7-4.3-3.1-3 4.3-.6z" />
    </svg>
  );
}

function Chevron({ className }: { className?: string }) {
  return (
    <svg className={className} width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M2.5 4.5 6 8l3.5-3.5" />
    </svg>
  );
}
