"use client";

import { useMemo, useRef, useState } from "react";
import { CEMAC_COLOR, COUNTRY_COLOR } from "@/lib/market/couleurs";
import { derniereParDuree, poids, type Minces } from "@/lib/market/lecture-b";
import { depouiller } from "@/lib/market/zero-coupon";
import { abouti, ajuster, tauxCourt, type Ajustement, type Refus } from "@/lib/market/nelson-siegel";
import { consolide } from "@/lib/market/zone";
import { LectureCourbe } from "./LectureCourbe";
import { AideReglage } from "./AideReglage";
import { useT } from "@/i18n/client";
import { coupeAu, serieBeacDe, type CourbePays, type Fenetre, type ReleveBeacVu } from "@/lib/market/courbe-vue";
import styles from "./CourbeFusion.module.css";

/**
 * Une figure, deux visions, et la distinction dite plutôt que supposée.
 *
 * Nous avons longtemps porté deux figures côte à côte, et le desk les lisait
 * toutes deux comme des courbes des taux. Elles n'en sont qu'une : la première
 * pose les séances à la place que leur vie restante leur donne et relie les
 * points, ce qui est une représentation de la donnée ; la seconde passe un
 * modèle à travers, ce qui est une déduction. Les fondre sans le dire ferait
 * passer l'une pour l'autre, et c'est précisément l'erreur qu'on veut éviter.
 *
 * Le choix de vision est donc la commande principale de la figure, pas une case
 * discrète, et la distinction se répète en quatre endroits : la phrase de tête
 * change de verbe, le sceau change de régime, la bande de chiffres change de
 * grandeurs, et le tracé change de nature.
 *
 * LES DONNÉES : toutes les séances retenues, plusieurs pouvant se poser sur la
 * même durée. Aucune pondération, aucun ajustement, rien à régler : les
 * commandes de méthode s'endorment à l'écran au lieu d'en disparaître, parce
 * que leur absence dirait qu'elles n'existent pas quand leur sommeil dit
 * qu'elles ne s'appliquent pas ici. Relier les points reste un interrupteur :
 * un segment entre deux points affirme déjà une droite là où le prix du temps
 * fait une courbe.
 *
 * LA COURBE : une séance par durée, pondérée par son âge, et une forme de
 * Nelson-Siegel passée à travers. Elle donne un taux à n'importe quelle durée,
 * y compris celles que personne n'a adjugées, et c'est le service qu'on attend
 * d'une courbe des taux.
 *
 * Un refus n'est pas une page blanche. Un Trésor qui n'a pas de quoi porter une
 * courbe garde ses observations, et l'encadré renvoie vers la vision qui les
 * montre : sans cela, la fusion lui retirerait la seule figure qu'il avait.
 */

const W = 900;
const H = 340;
const P = { l: 56, r: 104, t: 18, b: 46 };

/** Les durées auxquelles un desk demande un taux, qu'elles aient été adjugées ou non. */
const USUELS = [0.25, 0.5, 1, 2, 3, 5, 7, 10];

type Vision = "faits" | "modele";
type Choix = "tous" | "cemac" | string;

/** Un point posé sur la figure, d'où qu'il vienne. */
interface Pose {
  annees: number;
  mot: string;
  /** Le taux tracé : actuariel, ou dépouillé en zéro-coupon. */
  pct: number;
  /** Le taux tel qu'il a été lu, avant tout dépouillement. */
  ytmPct: number;
  ecartPb: number;
  age?: number;
  mince?: boolean;
  on?: string;
  echue?: boolean;
  poids: number;
}

interface Serie {
  nom: string;
  couleur: string;
  obs: Pose[];
  fit?: Ajustement;
  /** Pourquoi il n'y a pas d'ajustement : un écran qui ne le dit pas a l'air en panne. */
  refus?: Refus;
}

/** Une date en clair, dans la langue du lecteur, sans passer par le serveur. */
const fmtJour = (iso: string) => new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });

/**
 * Le mois d'arrêté en clair : « juillet 2026 », et non « 2026-07 ».
 *
 * C'est la date de valeur de la courbe posée en filigrane, et elle se lisait
 * en code machine au milieu d'une phrase. Une date qu'on ne lit pas est une
 * date qu'on ne vérifie pas.
 */
const fmtMois = (mois: string, court = false) =>
  new Date(`${mois}-01`).toLocaleDateString(undefined, { year: "numeric", month: court ? "short" : "long" });

/** L'âge d'un mois arrêté, en jours : c'est lui qui décide de la péremption. */
const jours = (mois: string) => Math.max(0, Math.round((Date.now() - Date.parse(`${mois}-01`)) / 86_400_000));

export function CourbeFusion({
  fenetres,
  ariaLabel,
  observeLe,
  choixDate,
  beacReleve,
  visionParDefaut = "faits",
  tresorParDefaut = "tous",
}: {
  fenetres: Fenetre[];
  ariaLabel: string;
  observeLe?: string;
  choixDate?: React.ReactNode;
  beacReleve?: ReleveBeacVu;
  /**
   * La vision à l'ouverture, et le Trésor affiché.
   *
   * La page ouvre sur les données, qui ne demandent rien à croire. Ces deux
   * réglages existent parce qu'un rendu statique ne clique pas : la figure ne
   * quitterait jamais son état initial, et c'est exactement le cas qui a
   * échappé à trois relectures sur le filigrane de la BEAC. Ce qu'un test ne
   * peut pas atteindre, il ne l'éprouve pas.
   */
  visionParDefaut?: Vision;
  tresorParDefaut?: Choix;
}) {
  const t = useT();
  const [vision, setVision] = useState<Vision>(visionParDefaut);
  const [choisie, setChoisie] = useState<number | null>(null);
  const premiereGarnie = Math.max(0, fenetres.findIndex((f) => f.pays.length > 0));
  const profondeur = choisie ?? premiereGarnie;
  const fenetre = fenetres[profondeur];
  const pays = fenetre?.pays ?? [];

  /* Un choix rangé dans un état survit aux données qu'il désigne : il se dérive
     plutôt qu'il ne se lit, et retombe sur la vue d'ensemble s'il ne vaut plus. */
  const [voulu, setChoix] = useState<Choix>(tresorParDefaut);
  const choix: Choix = voulu === "tous" || voulu === "cemac" || pays.some((p) => p.pays === voulu) ? voulu : "tous";

  const [relier, setRelier] = useState(true);
  const [demiVie, setDemiVie] = useState(180);
  const [minces, setMinces] = useState<Minces>("sous-ponderer");
  const [lambdaZone, setLambdaZone] = useState(true);
  const [zeroCoupon, setZeroCoupon] = useState(false);
  const [voirPoints, setVoirPoints] = useState(true);
  const [voirBande, setVoirBande] = useState(true);
  const [voirBeac, setVoirBeac] = useState(true);
  const boite = useRef<HTMLDivElement | null>(null);
  const [vise, setVise] = useState<number | null>(null);

  const modele = vision === "modele";

  /**
   * Les poses d'un Trésor, selon la vision.
   *
   * La vision des données garde toutes les séances : deux abondements posés sur
   * la même durée sont deux faits, et les empiler est justement ce qu'elle
   * montre. La vision de la courbe n'en garde qu'une par durée, sans quoi
   * dix-huit séances gabonaises à trois mois pèsent dix-huit fois.
   *
   * Le dépouillement se fait par Trésor et jamais sur un mélange : un taux
   * zéro-coupon est propre à une signature.
   */
  const preparer = useMemo(
    () => (p: CourbePays): Pose[] => {
      const gardes = modele ? derniereParDuree(p.points) : p.points;
      const spots =
        modele && zeroCoupon
          ? new Map(depouiller(gardes.map((q) => ({ annees: q.annees, ytmPct: q.pct, couponPct: q.coupon ?? 0 }))).map((s) => [s.annees, s]))
          : undefined;
      return gardes
        .map((q) => {
          const s = spots?.get(q.annees);
          return {
            annees: q.annees,
            mot: q.mot,
            pct: s ? s.spotPct : q.pct,
            ytmPct: q.pct,
            ecartPb: s?.ecartPb ?? 0,
            age: q.age,
            mince: q.mince,
            on: q.on,
            echue: q.echue,
            poids: modele ? poids(q, { demiVieJours: demiVie || undefined, minces }) : 1,
          };
        })
        .sort((a, b) => a.annees - b.annees);
    },
    [modele, demiVie, minces, zeroCoupon],
  );

  /**
   * La zone : une moyenne des Trésors présents à chaque horizon pour les
   * données, un ajustement sur tous leurs points pour la courbe.
   *
   * Les deux répondent à des questions différentes et c'est assumé. La moyenne
   * dit le niveau de la zone à un horizon donné ; l'ajustement dit la forme
   * commune du coût du temps dans une monnaie unique, et c'est lui qui prête sa
   * courbure aux Trésors trop maigres pour trouver la leur.
   */
  const zone = useMemo(() => {
    const obs = pays.flatMap(preparer);
    const r = ajuster(obs.map((o) => ({ annees: o.annees, pct: o.pct, poids: o.poids })));
    const moyenne: Pose[] = consolide(
      pays.map((p) => ({ pays: p.pays, points: preparer(p).map((q) => ({ annees: q.annees, mot: q.mot, pct: q.pct, age: q.age ?? 0 })) })),
    ).map((q) => ({ annees: q.annees, mot: q.mot, pct: q.pct, ytmPct: q.pct, ecartPb: 0, age: q.age, poids: 1 }));
    return { obs, moyenne, fit: abouti(r) ? r : undefined, refus: abouti(r) ? undefined : r.refus };
  }, [pays, preparer]);

  const series = useMemo((): Serie[] => {
    const impose = lambdaZone && zone.fit ? { lambda: zone.fit.lambda } : {};
    if (choix === "cemac") {
      /* Pour les données, la zone est la moyenne par horizon ; pour la courbe,
         l'ajustement sur tous les points. Une moyenne ajustée serait un modèle
         posé sur un modèle. */
      return [{ nom: t("CEMAC"), couleur: CEMAC_COLOR, obs: modele ? zone.obs : zone.moyenne, fit: zone.fit, refus: zone.refus }];
    }
    return pays
      .filter((p) => choix === "tous" || choix === p.pays)
      .map((p) => {
        const obs = preparer(p);
        const r = ajuster(obs.map((o) => ({ annees: o.annees, pct: o.pct, poids: o.poids })), impose);
        return { nom: p.pays, couleur: COUNTRY_COLOR[p.pays], obs, fit: abouti(r) ? r : undefined, refus: abouti(r) ? undefined : r.refus };
      });
  }, [choix, pays, preparer, zone, lambdaZone, modele, t]);

  /** Le filigrane de la BEAC ne paraît que devant un seul Trésor. */
  const beac = useMemo(() => {
    if (!voirBeac) return [];
    const sien = serieBeacDe(choix, beacReleve);
    return sien ? [{ nom: sien.pays, pts: sien.points }] : [];
  }, [voirBeac, choix, beacReleve]);

  const tous = series.flatMap((s) => s.obs);
  const echelle = useMemo(() => {
    if (!tous.length) return null;
    /* C'est notre figure qui commande le cadre, puisque c'est la nôtre qu'on
       publie. La BEAC y est invitée et s'y coupe : elle va jusqu'à quinze ans
       quand nous nous arrêtons à sept. */
    const xs = tous.map((o) => Math.log(o.annees));
    const borneHaute = Math.max(...tous.map((o) => o.annees));
    const ys = [
      ...tous.map((o) => o.pct),
      ...beac.flatMap((b) => coupeAu(b.pts, borneHaute).map((q) => q.pct)),
      ...(modele ? series.flatMap((s) => (s.fit ? USUELS.filter((u) => u >= s.fit!.borne.court && u <= s.fit!.borne.long).map((u) => s.fit!.taux(u)) : [])) : []),
    ];
    const marge = Math.max((Math.max(...ys) - Math.min(...ys)) * 0.16, 0.3);
    return { x0: Math.min(...xs), x1: Math.max(...xs), lo: Math.min(...ys) - marge, hi: Math.max(...ys) + marge };
  }, [tous, series, beac, modele]);

  const mot = (a: number) => (a < 1 ? t("{n} mois", { n: Math.round(a * 12) }) : a === 1 ? t("1 an") : t("{n} ans", { n: Math.round(a * 10) / 10 }));
  const pc = (v: number) => v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const ajustables = series.filter((s) => s.fit);
  const seul = series.length === 1 ? series[0] : undefined;
  const frais = tous.length ? Math.min(...tous.map((o) => o.age ?? 0)) : undefined;
  const durees = new Set(tous.map((o) => o.mot)).size;
  const meilleur = ajustables.length ? ajustables.reduce((m, x) => (x.fit!.rmsePb < m.fit!.rmsePb ? x : m)) : undefined;

  /**
   * La phrase de tête, et c'est elle qui porte la distinction.
   *
   * On lit une phrase en une seconde et une courbe en trente. Son verbe change
   * avec la vision : les données disent ce qui a été payé, la courbe dit ce
   * qu'un modèle en déduit. Le reste de la figure le répète, mais c'est ici
   * qu'on le lit d'abord.
   */
  const tete = (() => {
    if (!tous.length) return t("Aucune séance relue à cette date et dans cette profondeur.");
    if (!modele) {
      const bas = tous.reduce((a, b) => (a.pct < b.pct ? a : b));
      const haut = tous.reduce((a, b) => (a.pct > b.pct ? a : b));
      if (seul)
        return t("Voici ce que {p} a payé : {n} séances relues sur {d} durées, de {a} % à {d1} à {b} % à {d2}. La plus récente a {j} jours, et aucun modèle n'intervient.", {
          p: seul.nom,
          n: tous.length,
          d: durees,
          a: pc(bas.pct),
          d1: bas.mot,
          b: pc(haut.pct),
          d2: haut.mot,
          j: frais ?? 0,
        });
      return t("Voici ce que les {n} Trésors regardés ont payé : {s} séances relues sur {d} durées, de {a} % à {b} %. La plus récente a {j} jours, et aucun modèle n'intervient.", {
        n: series.length,
        s: tous.length,
        d: durees,
        a: pc(bas.pct),
        b: pc(haut.pct),
        j: frais ?? 0,
      });
    }
    if (seul?.fit) {
      const f = seul.fit;
      const longAns = Math.min(7, f.borne.long);
      return t("Voici ce que le modèle déduit pour {p} : {a} % à {d1} et {b} % à {d2}. Il s'écarte de {e} points de base des {n} observations retenues.", {
        p: seul.nom,
        a: pc(f.taux(f.borne.court)),
        d1: mot(f.borne.court),
        b: pc(f.taux(longAns)),
        d2: mot(longAns),
        e: Math.round(f.rmsePb),
        n: seul.obs.length,
      });
    }
    if (seul) return t("Le modèle ne déduit rien pour {p} : {r}. Ses observations, elles, sont là.", { p: seul.nom, r: t(seul.refus ?? "pas d'ajustement") });
    if (!ajustables.length) return t("Aucun des {n} Trésors regardés ne porte assez de durées pour qu'un modèle en déduise une courbe.", { n: series.length });
    return t("Le modèle déduit une courbe pour {a} des {n} Trésors regardés, le mieux ajusté étant {p} à {e} points de base sur {d} durées distinctes.", {
      a: ajustables.length,
      n: series.length,
      p: meilleur!.nom,
      e: Math.round(meilleur!.fit!.rmsePb),
      d: durees,
    });
  })();

  /**
   * Les quatre chiffres qui décident si l'on peut se servir de la figure.
   *
   * Ils changent de grandeurs avec la vision, parce qu'ils ne répondent pas à
   * la même question : les données se jugent à leur nombre et à leur fraîcheur,
   * un modèle à son écart et à l'étendue qu'il tient.
   */
  const empiles = tous.length - durees;
  const kpis: { mot: string; valeur: string; sous: string }[] = modele
    ? [
        seul?.fit
          ? /* Le taux instantané, β₀ + β₁, se lit à durée nulle : c'est une
               extrapolation sous la plus courte séance, et elle s'emballe dès que
               celle-ci recule. La bande porte la courbe là où elle est tenue, et
               le chiffre instantané reste au tableau des coefficients. */
            { mot: "Le plus court tenu", valeur: `${pc(seul.fit.taux(seul.fit.borne.court))} %`, sous: t("à {d}, la plus courte séance", { d: mot(seul.fit.borne.court) }) }
          : { mot: "Trésors déduits", valeur: `${ajustables.length} / ${series.length}`, sous: t("ajustés sur ceux qu'on regarde") },
        meilleur?.fit
          ? { mot: "Écart aux points", valeur: `${Math.round(meilleur.fit.rmsePb)} pb`, sous: seul ? t("sur {n} observations", { n: seul.obs.length }) : t("le meilleur, {p}", { p: meilleur.nom }) }
          : { mot: "Écart aux points", valeur: "—", sous: t("aucun ajustement") },
        { mot: "Durées retenues", valeur: String(durees), sous: t("une séance par durée") },
        { mot: "Point le plus frais", valeur: frais == null ? "—" : `${frais} ${t("jours")}`, sous: t("depuis la séance") },
      ]
    : [
        { mot: "Séances relues", valeur: String(tous.length), sous: t("dans la profondeur retenue") },
        { mot: "Durées distinctes", valeur: String(durees), sous: empiles > 0 ? t("{n} séances s'empilent", { n: empiles }) : t("une séance par durée") },
        { mot: "Point le plus frais", valeur: frais == null ? "—" : `${frais} ${t("jours")}`, sous: t("depuis la séance") },
        { mot: "Séances minces", valeur: String(tous.filter((o) => o.mince).length), sous: t("vraies, non représentatives") },
      ];

  /**
   * LES DEUX PROJECTIONS ARRONDISSENT, ET C'EST « Math.log » QUI L'EXIGE.
   *
   * Le rendu serveur écrivait x1 = 662,686260951308 et le navigateur
   * recalculait 662,6862609513081 : deux flottants différents au treizième
   * chiffre, donc deux chaînes différentes dans l'attribut, donc une
   * hydratation ratée et TOUTE LA PAGE refaite côté client. La cause n'est
   * pas l'arithmétique, qui est déterministe : la norme n'oblige pas
   * « Math.log » à être correctement arrondie, et le V8 de Node et celui de
   * Chrome ne donnent pas le même dernier ulp.
   *
   * On arrondit donc ici plutôt qu'à chaque appel : il y en a une vingtaine,
   * et un seul oubli ramène le défaut. Deux décimales valent très au-delà du
   * pixel, et aucun écart d'un ulp ne leur survit.
   */
  const auCent = (v: number) => Math.round(v * 100) / 100;
  const X = (a: number) => (echelle ? auCent(P.l + ((Math.log(a) - echelle.x0) / (echelle.x1 - echelle.x0 || 1)) * (W - P.l - P.r)) : 0);
  const Y = (v: number) => (echelle ? auCent(H - P.b - ((v - echelle.lo) / (echelle.hi - echelle.lo || 1)) * (H - P.t - P.b)) : 0);

  /**
   * Le suivi : un taux à n'importe quelle durée pour la courbe, la durée
   * observée la plus proche pour les données.
   *
   * La différence n'est pas un détail d'ergonomie. Une bulle qui donnerait un
   * chiffre entre deux points observés inventerait ce que la vision des données
   * s'interdit précisément de produire.
   */
  const bouger = (e: React.PointerEvent) => {
    const r = boite.current?.getBoundingClientRect();
    if (!r || !echelle) return;
    const x = ((e.clientX - r.left) / r.width) * W;
    if (x < P.l || x > W - P.r) return setVise(null);
    const a = Math.exp(echelle.x0 + ((x - P.l) / (W - P.l - P.r)) * (echelle.x1 - echelle.x0));
    if (modele) return setVise(a);
    if (!tous.length) return setVise(null);
    setVise(tous.reduce((m, o) => (Math.abs(Math.log(o.annees) - Math.log(a)) < Math.abs(Math.log(m.annees) - Math.log(a)) ? o : m)).annees);
  };

  const grille = echelle ? Array.from({ length: 140 }, (_, i) => Math.exp(echelle.x0 + ((echelle.x1 - echelle.x0) * i) / 139)) : [];
  const graduations: number[] = [];
  if (echelle) for (let v = Math.ceil(echelle.lo); v <= echelle.hi; v++) graduations.push(v);
  const usuelsVus = echelle ? USUELS.filter((u) => Math.log(u) >= echelle.x0 - 1e-9 && Math.log(u) <= echelle.x1 + 1e-9) : [];

  const visions: { cle: Vision; titre: string; quoi: string }[] = [
    {
      cle: "faits",
      titre: t("Les données"),
      quoi: t("Ce qui a été payé, séance par séance. Aucun modèle : chaque point est une adjudication relue, posée à la vie restante de sa ligne. Plusieurs séances peuvent occuper la même durée."),
    },
    {
      cle: "modele",
      titre: t("La courbe"),
      quoi: t("Ce que le modèle en déduit. Une séance par durée, pondérée par son âge, et une forme de Nelson-Siegel passée à travers. Elle donne un taux à n'importe quelle durée, y compris celles que personne n'a adjugées."),
    },
  ];

  /**
   * Un groupe de commandes, endormi quand il ne commande rien dans cette vision.
   *
   * CHAQUE RÉGLAGE DIT CE QU'IL CHANGE, SUR LE GRAPHIQUE MÊME. Les six
   * explications existaient dans la lettre de méthode, c'est-à-dire ailleurs,
   * et pour deux d'entre elles dans un « title » que le doigt n'atteint pas.
   * Un réglage dont on ne sait pas ce qu'il fait ne se touche pas, ou se
   * touche à l'aveugle, ce qui est pire sur une courbe qui sert à décider.
   * Le « ? » ouvre la phrase à sa place, sans quitter la page.
   */
  const groupe = (id: string, etiq: string, dort: boolean, enfants: React.ReactNode, aide?: string) => (
    <div className={`${styles.grp} ${dort ? styles.dort : ""}`}>
      <div className={styles.tete}>
        <span className={styles.etiq} id={id}>
          {etiq}
        </span>
        {aide && <AideReglage texte={aide} />}
      </div>
      <div className={styles.seg} role="group" aria-labelledby={id}>
        {enfants}
      </div>
    </div>
  );

  return (
    <div>
      {/* Le choix de vision est la commande principale : deux cartes, deux
          phrases, et non une case qu'on coche sans savoir ce qu'elle change. */}
      <div className={styles.vision}>
        {visions.map((v) => (
          <button key={v.cle} type="button" data-v={v.cle} aria-pressed={vision === v.cle} onClick={() => setVision(v.cle)}>
            <b>{v.titre}</b>
            <span>{v.quoi}</span>
          </button>
        ))}
      </div>

      <div className={styles.filtres}>
        {groupe(
          "fu-tresor",
          t("Trésor"),
          false,
          <>
            <button type="button" aria-pressed={choix === "tous"} onClick={() => setChoix("tous")}>
              {t("Tous")}
            </button>
            <button type="button" aria-pressed={choix === "cemac"} onClick={() => setChoix("cemac")}>
              <i style={{ background: CEMAC_COLOR }} aria-hidden="true" />
              {t("CEMAC")}
            </button>
            {pays.map((p) => (
              <button key={p.pays} type="button" aria-pressed={choix === p.pays} onClick={() => setChoix(p.pays)}>
                <i style={{ background: COUNTRY_COLOR[p.pays] }} aria-hidden="true" />
                {p.pays}
              </button>
            ))}
          </>,
        )}

        {/* UN ÉLÉMENT REÇU EN PROPRIÉTÉ N'EST JAMAIS « VALIDÉ » PAR JSX.
            React marque les enfants écrits en JSX au moment où il les crée,
            et vérifie les clefs des autres au moment de les réconcilier.
            « choixDate » est fabriqué par la page comme VALEUR D'UNE
            PROPRIÉTÉ, donc personne ne le marque ; rendu ici au milieu de
            sept frères, le réconciliateur le découvre sans clef et réclame.
            L'envelopper dans un fragment le replace en enfant unique d'un
            élément écrit ici : il est validé à la création, et le fragment,
            lui, est un enfant statique. Zéro nœud de plus dans le DOM. */}
        <>{choixDate}</>

        {groupe(
          "fu-profondeur",
          t("Profondeur"),
          false,
          fenetres.map((f, i) => (
            <button key={f.jours} type="button" aria-pressed={profondeur === i} onClick={() => setChoisie(i)}>
              {f.mot}
            </button>
          )),
          t(
            "Jusqu'où on remonte pour ramasser des séances. Plus la fenêtre est profonde, plus il y a de points, et plus les anciens pèsent sur la forme. Mesuré sur nos données : une vingtaine de points à trois mois comme à un an, une trentaine à deux ans, une soixantaine à cinq, dont les deux tiers gabonais. Un Trésor qui n'apporte pas deux durées distinctes n'est pas tracé du tout.",
          ),
        )}

        {/* Relier deux points affirme une droite : le pouvoir de les délier est
            ce qui rend la vision des données honnête. */}
        {groupe(
          "fu-relier",
          t("Relier les points"),
          modele,
          <>
            <button type="button" aria-pressed={relier} onClick={() => setRelier(true)} disabled={modele}>
              {t("oui")}
            </button>
            <button type="button" aria-pressed={!relier} onClick={() => setRelier(false)} disabled={modele}>
              {t("non")}
            </button>
          </>,
        )}

        {groupe(
          "fu-demivie",
          t("Une séance compte pour moitié après"),
          !modele,
          [
            { j: 0, m: t("jamais") },
            { j: 90, m: t("90 j") },
            { j: 180, m: t("180 j") },
            { j: 365, m: t("1 an") },
          ].map((o) => (
            <button key={o.j} type="button" aria-pressed={demiVie === o.j} onClick={() => setDemiVie(o.j)} disabled={!modele}>
              {o.m}
            </button>
          )),
          t(
            "Le poids d'une séance décroît avec son âge : poids = 0,5 puissance (âge ÷ demi-vie). À 180 jours, une séance d'il y a six mois pèse moitié moins qu'une d'aujourd'hui, et une d'il y a un an quatre fois moins. « Jamais » les met toutes à égalité, et une adjudication de 2019 compte alors autant que celle de la semaine dernière. Cela ne déplace aucun point : cela ne change que la courbe ajustée, qui s'approche davantage des séances récentes. L'opacité d'un point montre le poids qu'il a reçu.",
          ),
        )}

        {groupe(
          "fu-minces",
          t("Séances minces"),
          !modele,
          (
            [
              ["inclure", t("à part entière")],
              ["sous-ponderer", t("sous-pondérées")],
              ["exclure", t("écartées")],
            ] as [Minces, string][]
          ).map(([v, m]) => (
            <button key={v} type="button" aria-pressed={minces === v} onClick={() => setMinces(v)} disabled={!modele}>
              {m}
            </button>
          )),
          t(
            "Une séance est dite mince quand elle n'a qu'un soumissionnaire, ou quand la demande n'a pas couvert le montant offert. Le taux qui en sort est le prix d'une négociation à deux, pas celui d'un marché, et il tire la courbe autant qu'un vrai. Trois traitements : à part entière, sous-pondérée au tiers environ, ou écartée, c'est-à-dire de poids nul. Les points minces se dessinent en cercles creux, quel que soit le traitement, pour qu'on voie toujours lesquels ils sont.",
          ),
        )}

        {groupe(
          "fu-lambda",
          t("Courbure λ"),
          !modele,
          <>
            <button
              type="button"
              aria-pressed={lambdaZone}
              onClick={() => setLambdaZone(true)}
              disabled={!modele}
              title={t("Un Trésor à six durées n'a pas de quoi trouver où se place sa courbure, mais il a de quoi se placer sur celle de la zone.")}
            >
              {t("celle de la zone")}
            </button>
            <button type="button" aria-pressed={!lambdaZone} onClick={() => setLambdaZone(false)} disabled={!modele}>
              {t("propre à chacun")}
            </button>
          </>,
          t(
            "La courbe ajustée est un Nelson-Siegel : taux(durée) = niveau long + pente × f1 + courbure × f2, où λ, en années, dit OÙ la courbe se creuse ou se bombe — la bosse tombe vers 1,79 λ. À λ fixé le modèle est linéaire en ses trois coefficients, donc il se résout d'un coup, sans optimiseur : seul λ se cherche, par balayage. Un Trésor qui n'apporte que six durées n'a pas de quoi trouver la sienne ; « celle de la zone » lui impose le λ ajusté sur tous les Trésors et n'estime que ses trois coefficients. Le piège que cela évite : un λ qui placerait la bosse hors des durées observées rend les deux facteurs presque identiques, et le modèle part en vrille sans que la courbe bouge — mesuré chez nous, un niveau long de moins six cent vingt-huit pour cent sur le Gabon.",
          ),
        )}

        {groupe(
          "fu-mesure",
          t("Ce qu'on ajuste"),
          !modele,
          <>
            <button
              type="button"
              aria-pressed={!zeroCoupon}
              onClick={() => setZeroCoupon(false)}
              disabled={!modele}
              title={t("Le rendement à l'échéance dépend du coupon du titre : deux titres de même échéance et de coupons différents n'ont pas le même.")}
            >
              {t("le rendement actuariel")}
            </button>
            <button
              type="button"
              aria-pressed={zeroCoupon}
              onClick={() => setZeroCoupon(true)}
              disabled={!modele}
              title={t("Le taux auquel un franc reçu à cette durée s'actualise. Il ne dépend que de la durée, et c'est lui qu'on appelle une courbe des taux.")}
            >
              {t("le taux zéro-coupon")}
            </button>
          </>,
          t(
            "Ce que la courbe représente. Le rendement actuariel dépend du coupon du titre : deux obligations de même échéance mais de coupons différents n'ont pas le même, et les mettre sur une même courbe revient à mélanger deux choses. Le taux zéro-coupon est celui auquel un franc reçu à cette durée s'actualise, et il ne dépend que de la durée : c'est lui qu'on appelle proprement une courbe des taux. On l'obtient en retirant de chaque obligation la valeur de ses coupons intermédiaires, actualisés sur la courbe du même Trésor, et en recommençant jusqu'à ce que la courbe ne bouge plus. Les bons, qui n'ont pas de coupon, ne bougent pas ; le pied du graphique dit combien de titres ont bougé et de combien.",
          ),
        )}

        {groupe(
          "fu-voir",
          t("Afficher"),
          false,
          <>
            <button type="button" aria-pressed={voirPoints} onClick={() => setVoirPoints((v) => !v)}>
              {t("les points observés")}
            </button>
            <button type="button" aria-pressed={voirBande && modele} onClick={() => setVoirBande((v) => !v)} disabled={!modele}>
              {t("l'intervalle à 95 %")}
            </button>
            <button
              type="button"
              aria-pressed={voirBeac && beac.length > 0}
              onClick={() => setVoirBeac((v) => !v)}
              disabled={choix === "tous" || choix === "cemac" || !beacReleve}
              title={
                choix === "tous" || choix === "cemac"
                  ? t("La BEAC ne se compare qu'à un Trésor à la fois : les deux courbes ne mesurent pas la même chose, et ce qu'on regarde en les superposant est l'écart d'un Trésor avec lui-même.")
                  : undefined
              }
            >
              {t("la courbe de la BEAC")}
            </button>
          </>,
        )}
      </div>

      {/* Le commentaire dynamique a sa place à lui : c'est la première chose
          qu'on lit, il change de verbe avec la vision, et il porte le régime de
          sortie et les quatre chiffres qui décident si la figure est utilisable. */}
      <section className={`${styles.chapeau} ${modele ? styles.chModele : styles.chFaits}`} aria-live="polite">
        <div className={styles.chTete}>
          <span className={styles.chQuoi}>{modele ? t("La courbe") : t("Les données")}</span>
          {modele ? (
            <span className="st transmise" title={t("Un chiffre produit par un modèle ne sort pas du desk sans la lettre de méthodologie qui le décrit.")}>
              {t("produit par un modèle · interne")}
            </span>
          ) : (
            <span className="st reglee">{t("observations relues · publiable")}</span>
          )}
        </div>
        <p className={styles.phrase}>{tete}</p>
        <dl className={styles.kpis}>
          {kpis.map((k) => (
            <div key={k.mot}>
              <dt>{t(k.mot)}</dt>
              <dd>{k.valeur}</dd>
              <span>{k.sous}</span>
            </div>
          ))}
        </dl>
      </section>

      {/* Un refus n'est pas une page blanche : les observations existent, et la
          fusion ne doit pas retirer au Trésor maigre la seule figure qu'il avait. */}
      {modele && seul && !seul.fit && tous.length > 0 && (
        <p className={styles.refus}>
          <b>{t("Pourquoi il n'y a pas de courbe ici")}</b>{" "}
          {t("Trois coefficients demandent au moins quatre durées distinctes, et davantage pour tenir. Ce n'est pas une page manquante : les observations sont là, c'est le modèle qui refuse.")}{" "}
          <button type="button" className={styles.bascule} onClick={() => setVision("faits")}>
            {t("Voir les données")}
          </button>
        </p>
      )}

      {!echelle ? (
        <div className="empty">{t("Aucune séance relue à cette date : il n'y a rien à tracer.")}</div>
      ) : (
        <div className={styles.fig} ref={boite} onPointerMove={bouger} onPointerLeave={() => setVise(null)}>
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel} className={styles.svg}>
            {graduations.map((v) => (
              <g key={v}>
                <line x1={P.l} y1={Y(v)} x2={W - P.r} y2={Y(v)} className={styles.grille} />
                <text x={P.l - 9} y={Y(v) + 4} textAnchor="end" className={styles.tick}>
                  {v.toLocaleString("fr-FR")} %
                </text>
              </g>
            ))}
            {usuelsVus.map((u) => (
              <g key={u}>
                <line x1={X(u)} y1={P.t} x2={X(u)} y2={H - P.b} className={styles.grilleV} />
                <text x={X(u)} y={H - P.b + 18} textAnchor="middle" className={styles.tick}>
                  {mot(u)}
                </text>
              </g>
            ))}
            <path d={`M${P.l} ${P.t}V${H - P.b}H${W - P.r}`} className={styles.axe} />

            {/* Le filigrane de la BEAC, derrière et au gris : une mesure d'un
                autre ne se déguise pas en la nôtre. */}
            {beac.map((b) => {
              const dedans = coupeAu(b.pts, Math.exp(echelle.x1));
              const bout = dedans[dedans.length - 1];
              return (
                <g key={`beac-${b.nom}`}>
                  <polyline
                    points={dedans.map((q) => `${X(q.annees).toFixed(1)},${Y(q.pct).toFixed(1)}`).join(" ")}
                    fill="none"
                    stroke="var(--ink-3)"
                    strokeWidth={1.5}
                    strokeDasharray="1 4"
                    strokeLinecap="round"
                  />
                  {/* Le nom, et la date de valeur sous lui : une courbe posée
                      derrière la nôtre sans sa date affirme sur aujourd'hui. */}
                  {bout && beacReleve && (
                    <text x={X(bout.annees) + 6} y={Y(bout.pct)} className={styles.beacBout}>
                      <tspan x={X(bout.annees) + 6} dy={0}>
                        {t("BEAC")}
                      </tspan>
                      <tspan x={X(bout.annees) + 6} dy={11} className={styles.beacDate}>
                        {fmtMois(beacReleve.mois, true)}
                      </tspan>
                    </text>
                  )}
                </g>
              );
            })}

            {/* La courbe déduite, et sa bande. */}
            {modele &&
              series.map((se) => {
                if (!se.fit) return null;
                const f = se.fit;
                const dedans = grille.filter((a) => a >= f.borne.court && a <= f.borne.long);
                if (dedans.length < 2) return null;
                return (
                  <g key={`fit-${se.nom}`}>
                    {voirBande && (
                      <polygon
                        points={`${dedans.map((a) => `${X(a).toFixed(1)},${Y(f.taux(a) + f.bande(a)).toFixed(1)}`).join(" ")} ${[...dedans]
                          .reverse()
                          .map((a) => `${X(a).toFixed(1)},${Y(f.taux(a) - f.bande(a)).toFixed(1)}`)
                          .join(" ")}`}
                        fill={se.couleur}
                        opacity={0.12}
                      />
                    )}
                    <polyline
                      points={dedans.map((a) => `${X(a).toFixed(1)},${Y(f.taux(a)).toFixed(1)}`).join(" ")}
                      fill="none"
                      stroke={se.couleur}
                      strokeWidth={2.5}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                  </g>
                );
              })}

            {/* Les segments de la vision des données : un trait plus fin que
                celui d'une courbe ajustée, parce qu'il affirme moins. */}
            {!modele &&
              relier &&
              series.map((se) =>
                se.obs.length > 1 ? (
                  <polyline
                    key={`seg-${se.nom}`}
                    points={se.obs.map((o) => `${X(o.annees).toFixed(1)},${Y(o.pct).toFixed(1)}`).join(" ")}
                    fill="none"
                    stroke={se.couleur}
                    strokeWidth={1.6}
                    strokeLinejoin="round"
                    opacity={0.75}
                  />
                ) : null,
              )}

            {voirPoints &&
              series.map((se) => (
                <g key={`obs-${se.nom}`}>
                  {se.obs.map((o, i) => (
                    <g key={`${o.mot}-${i}`}>
                      {/* Le résidu, tracé : c'est lui qui contrôle l'ajustement. */}
                      {modele && se.fit && <line x1={X(o.annees)} y1={Y(o.pct)} x2={X(o.annees)} y2={Y(se.fit.taux(o.annees))} stroke={se.couleur} strokeWidth={1} opacity={0.4} />}
                      <circle
                        cx={X(o.annees)}
                        cy={Y(o.pct)}
                        r={3.6}
                        fill={o.mince ? "var(--surface)" : se.couleur}
                        stroke={se.couleur}
                        strokeWidth={2}
                        opacity={modele ? Math.max(0.35, o.poids) : 0.9}
                      />
                    </g>
                  ))}
                </g>
              ))}

            {vise != null && <line x1={X(vise)} y1={P.t} x2={X(vise)} y2={H - P.b} className={styles.suivi} />}

            {modele &&
              ajustables.map((se) => {
                const f = se.fit!;
                const a = Math.min(f.borne.long, Math.exp(echelle.x1));
                return (
                  <text key={`nom-${se.nom}`} x={X(a) + 6} y={Y(f.taux(a)) + 4} className={styles.nom} fill={se.couleur}>
                    {se.nom}
                  </text>
                );
              })}
            {!modele &&
              series.map((se) => {
                const bout = se.obs[se.obs.length - 1];
                return bout ? (
                  <text key={`nomf-${se.nom}`} x={X(bout.annees) + 6} y={Y(bout.pct) + 4} className={styles.nom} fill={se.couleur}>
                    {se.nom}
                  </text>
                ) : null;
              })}
          </svg>

          {vise != null && (
            <div
              className={styles.bulle}
              style={(X(vise) / W) * 100 < 62 ? { left: `${(X(vise) / W) * 100 + 2.5}%`, top: "6%" } : { right: `${100 - (X(vise) / W) * 100 + 2.5}%`, top: "6%" }}
            >
              <div className={styles.bulleTitre}>{mot(vise)}</div>
              {modele
                ? ajustables.map((se) => {
                    const f = se.fit!;
                    const hors = vise < f.borne.court || vise > f.borne.long;
                    return (
                      <div key={se.nom} className={styles.bulleLigne}>
                        <span>
                          <i style={{ background: se.couleur }} aria-hidden="true" />
                          {se.nom}
                          {hors && <em className={styles.extra}>{t("extrapolé")}</em>}
                        </span>
                        <b>
                          {pc(f.taux(vise))} % <span className={styles.pm}>± {Math.round(f.bande(vise) * 100)} pb</span>
                        </b>
                      </div>
                    );
                  })
                : /* La bulle des données ne donne que des séances : entre deux
                     points elle n'a rien à dire, et c'est le sujet. */
                  series.flatMap((se) =>
                    se.obs
                      .filter((o) => Math.abs(o.annees - vise) < 1e-9)
                      .map((o, i) => (
                        <div key={`${se.nom}-${i}`} className={styles.bulleLigne}>
                          <span>
                            <i style={{ background: se.couleur }} aria-hidden="true" />
                            {se.nom}
                            {o.on && <em className={styles.bulleDate}>{o.on}</em>}
                          </span>
                          <b>{pc(o.pct)} %</b>
                        </div>
                      )),
                  )}
              {!modele && <div className={styles.bulleNote}>{t("une séance, pas une valeur de courbe")}</div>}
            </div>
          )}
        </div>
      )}

      {/* Quatre traits, quatre sens : sans dictionnaire, on croit voir deux fois
          la même chose. */}
      {series.length > 0 && (
        <div className={styles.legende}>
          {modele && ajustables.length > 0 && (
            <span>
              <i className={styles.trPlein} style={{ background: ajustables.length === 1 ? ajustables[0].couleur : "var(--ink-2)" }} aria-hidden="true" />
              {t("la courbe déduite, sur les durées observées")}
            </span>
          )}
          {modele && voirBande && ajustables.length > 0 && (
            <span>
              <i className={styles.trBande} style={{ background: ajustables.length === 1 ? ajustables[0].couleur : "var(--ink-2)" }} aria-hidden="true" />
              {t("l'intervalle à 95 %")}
            </span>
          )}
          {!modele && relier && (
            <span>
              <i className={styles.trFin} style={{ background: series.length === 1 ? series[0].couleur : "var(--ink-2)" }} aria-hidden="true" />
              {t("des segments entre les points, sans modèle")}
            </span>
          )}
          {voirPoints && (
            <span>
              <i className={styles.trRond} style={{ borderColor: series.length === 1 ? series[0].couleur : "var(--ink-2)" }} aria-hidden="true" />
              {t("une séance relue ; creuse, une séance mince")}
            </span>
          )}
          {beac.length > 0 && (
            <span>
              <i className={styles.trBeac} aria-hidden="true" />
              {t("la BEAC, par durée d'émission")}
            </span>
          )}
        </div>
      )}

      {/* La phrase qui empêche la confusion de revenir par la porte du graphique. */}
      <p className={styles.note}>
        {modele
          ? t("Chaque réglage ci-dessus change le sens du chiffre, et pas seulement son allure. La vision des données les ignore : elle n'a rien à pondérer, puisqu'elle ne déduit rien.")
          : t("Cette figure n'est pas une courbe des taux : c'est la donnée, posée. Un segment entre deux points affirme déjà une droite là où le prix du temps fait une courbe, et c'est pourquoi on peut les délier.")}
      </p>

      {beac.length > 0 && beacReleve && (
        <p className={`${styles.beacNote} ${jours(beacReleve.mois) > 100 ? styles.beacVieux : ""}`}>
          <i aria-hidden="true" />
          {t("En pointillé, la courbe que la BEAC publie dans ses statistiques mensuelles n° {n}, arrêtée en {d} et relevée le {r} dans le tracé de son PDF, faute de table publiée.", {
            n: beacReleve.numero,
            d: fmtMois(beacReleve.mois),
            r: fmtJour(beacReleve.releveLe),
          })}{" "}
          {jours(beacReleve.mois) > 100 && <b>{t("Ce relevé a {n} jours : ce n'est plus un repère sur aujourd'hui.", { n: jours(beacReleve.mois) })}</b>}{" "}
          <b>
            {t(
              "Son abscisse est la durée d'émission, la nôtre la vie restante : chez elle une obligation émise à sept ans reste posée à « 7 ans » toute sa vie, chez nous elle glisse vers la gauche en approchant de son terme.",
            )}
          </b>{" "}
          <a href={beacReleve.source} target="_blank" rel="noreferrer">
            {t("sa pièce")}
          </a>
        </p>
      )}

      {modele && zeroCoupon && (
        <p className={styles.note}>
          {t(
            "Les taux tracés sont dépouillés : chaque obligation à coupon est ramenée au taux zéro-coupon de son échéance, ses coupons intermédiaires étant actualisés sur la courbe du même Trésor. Un bon passe tel quel, il est zéro-coupon par construction.",
          )}{" "}
          {(() => {
            const bouges = tous.filter((o) => o.ecartPb !== 0);
            if (!bouges.length) return t("Aucun titre affiché n'a plus d'un flux à venir : le dépouillement ne déplace rien ici.");
            const pire = bouges.reduce((m, o) => (Math.abs(o.ecartPb) > Math.abs(m.ecartPb) ? o : m));
            return t("{n} titres déplacés, au plus de {p} points de base, à {d}.", { n: bouges.length, p: pire.ecartPb, d: pire.mot });
          })()}
        </p>
      )}

      {/* Les coefficients, en clair : une courbe déduite qui ne montre pas ses
          paramètres demande une confiance qu'elle n'a pas méritée. */}
      {modele && (
        <div className={styles.params}>
          <table>
            <thead>
              <tr>
                <th>{t("Trésor")}</th>
                <th className="r">{t("durées")}</th>
                <th className="r" title={t("Le niveau long : ce vers quoi la courbe tend.")}>
                  {t("niveau β₀")}
                </th>
                <th className="r" title={t("La pente : négative, la courbe monte avec la durée.")}>
                  {t("pente β₁")}
                </th>
                <th className="r" title={t("La courbure : le creux ou la bosse du milieu.")}>
                  {t("courbure β₂")}
                </th>
                <th className="r" title={t("Où se place la courbure, en années.")}>
                  λ
                </th>
                <th className="r" title={t("Le taux à durée nulle : il se lit sous la plus courte séance, et c'est donc une extrapolation.")}>
                  {t("taux instantané")}
                </th>
                <th className="r" title={t("L'écart type des résidus : ce dont la courbe s'écarte des points observés.")}>
                  {t("écart")}
                </th>
              </tr>
            </thead>
            <tbody>
              {series.map((se) => (
                <tr key={se.nom}>
                  <td>
                    <span className={styles.dot} style={{ background: se.couleur }} aria-hidden="true" /> {se.nom}
                  </td>
                  <td className="r">{new Set(se.obs.map((o) => o.mot)).size}</td>
                  {se.fit ? (
                    <>
                      <td className="r">{pc(se.fit.b0)}</td>
                      <td className="r">{pc(se.fit.b1)}</td>
                      <td className="r">{pc(se.fit.b2)}</td>
                      <td className="r">{se.fit.lambda.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}</td>
                      <td className="r">{pc(tauxCourt(se.fit))} %</td>
                      <td className="r">{Math.round(se.fit.rmsePb)} pb</td>
                    </>
                  ) : (
                    <td className="r" colSpan={6}>
                      <span className="muted">{se.refus ? t(se.refus) : t("pas d'ajustement")}</span>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Le tableau des données : même forme que celui des durées usuelles, et
          des grandeurs qui ne se confondent pas avec les siennes. Une durée que
          personne n'a adjugée n'y a pas de ligne, là où la courbe en produirait
          une : c'est la différence entre les deux visions, mise en colonnes.
          Quand plusieurs séances occupent une durée, la fourchette le dit, et
          le taux affiché est celui de la plus récente. */}
      {!modele && tous.length > 0 && (
        <div className={styles.usuels}>
          <table>
            <thead>
              <tr>
                <th>{t("Durée restante")}</th>
                {series.map((se) => (
                  <th key={se.nom} className="r">
                    <span className={styles.dot} style={{ background: se.couleur }} aria-hidden="true" /> {se.nom}
                  </th>
                ))}
                <th className="r">{t("Séance")}</th>
              </tr>
            </thead>
            <tbody>
              {[...new Map(tous.map((o) => [o.mot, o.annees])).entries()]
                .sort((a, b) => a[1] - b[1])
                .map(([motDuree]) => {
                  const ici = tous.filter((o) => o.mot === motDuree);
                  const recent = ici.reduce((m, o) => ((o.age ?? 0) < (m.age ?? 0) ? o : m));
                  return (
                    <tr key={motDuree}>
                      <td>{motDuree}</td>
                      {series.map((se) => {
                        const siens = se.obs.filter((o) => o.mot === motDuree);
                        if (!siens.length)
                          return (
                            <td key={se.nom} className={`r ${styles.hors}`} title={t("Aucune séance de ce Trésor à cette durée : la vision des données n'en invente pas.")}>
                              —
                            </td>
                          );
                        const frais = siens.reduce((m, o) => ((o.age ?? 0) < (m.age ?? 0) ? o : m));
                        const bas = Math.min(...siens.map((o) => o.pct));
                        const haut = Math.max(...siens.map((o) => o.pct));
                        return (
                          <td key={se.nom} className="r">
                            <b>
                              {pc(frais.pct)} %{frais.mince && <span className={styles.pm}> {t("mince")}</span>}
                            </b>
                            {siens.length > 1 && <span className={styles.pm}> · {t("{n} séances, de {a} à {b} %", { n: siens.length, a: pc(bas), b: pc(haut) })}</span>}
                          </td>
                        );
                      })}
                      <td className="r">
                        <span className={styles.pm}>{recent.on ?? "—"}</span>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
          <p className={styles.note}>
            {t(
              "Le taux affiché est celui de la séance la plus récente à cette durée ; quand plusieurs s'y empilent, la fourchette de toutes les séances retenues suit. Un tiret n'est pas une valeur manquante : ce Trésor n'a rien adjugé à cette durée, et aucun chiffre n'est produit pour combler la case.",
            )}
            {observeLe ? ` ${t("Observée le {d}.", { d: observeLe })}` : ""}
          </p>
        </div>
      )}

      {/* Le tableau des durées usuelles : la raison d'être de la déduction. */}
      {modele && ajustables.length > 0 && (
        <div className={styles.usuels}>
          <table>
            <thead>
              <tr>
                <th>{t("Durée")}</th>
                {ajustables.map((se) => (
                  <th key={se.nom} className="r">
                    <span className={styles.dot} style={{ background: se.couleur }} aria-hidden="true" /> {se.nom}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {USUELS.map((u) => (
                <tr key={u}>
                  <td>{mot(u)}</td>
                  {ajustables.map((se) => {
                    const f = se.fit!;
                    const hors = u < f.borne.court || u > f.borne.long;
                    return (
                      <td key={se.nom} className={`r ${hors ? styles.hors : ""}`} title={hors ? t("Aucune séance à cette durée : le chiffre est extrapolé.") : undefined}>
                        <b>{pc(f.taux(u))} %</b>
                        <span className={styles.pm}> ± {Math.round(f.bande(u) * 100)} pb</span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p className={styles.note}>
            {t("Une valeur grisée est extrapolée : aucune séance n'a été adjugée à cette durée dans la fenêtre retenue, et l'intervalle le dit.")}
            {observeLe ? ` ${t("Observée le {d}.", { d: observeLe })}` : ""}
          </p>
        </div>
      )}

      {/* Ce que vous regardez, compté : la lecture n'énonce que ce que le compte
          des points à l'écran permet d'énoncer. */}
      <LectureCourbe
        points={tous.map((o) => ({ annees: o.annees, mot: o.mot, age: o.age ?? 0, on: o.on, echue: o.echue, mince: o.mince }))}
        fenetreMot={fenetre?.mot ?? ""}
        observeLe={observeLe}
        vue={choix === "tous" ? t("Tous") : choix === "cemac" ? t("CEMAC") : choix}
        zone={choix === "cemac"}
      />
    </div>
  );
}
