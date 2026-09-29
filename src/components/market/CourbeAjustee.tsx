"use client";

import { useMemo, useRef, useState } from "react";
import { CEMAC_COLOR, COUNTRY_COLOR } from "@/lib/market/couleurs";
import { derniereParDuree, poids, type Minces } from "@/lib/market/lecture-b";
import { depouiller } from "@/lib/market/zero-coupon";
import { abouti, ajuster, tauxCourt, type Ajustement, type Refus } from "@/lib/market/nelson-siegel";
import { useT } from "@/i18n/client";
import type { CourbePays, Fenetre } from "./CourbeInteractive";
import styles from "./CourbeAjustee.module.css";

/**
 * La courbe ajustée : un taux à n'importe quelle durée, et ce qu'il vaut.
 *
 * La figure d'à côté trace ce qui a été observé, et relie les points par des
 * segments. Entre six mois et trois ans, un segment affirme une droite là où la
 * théorie et l'observation donnent une courbe ; et à quatre ans, où personne
 * n'a adjugé, elle ne dit rien du tout. C'est le service qu'on attend d'une
 * courbe des taux et que la précédente ne rend pas.
 *
 * Elle s'ajoute et ne remplace pas. Une courbe ajustée est un modèle : ce qui
 * la contrôle est l'écart entre elle et les points observés, et on ne peut pas
 * contrôler ce qu'on ne voit plus.
 *
 * Quatre réglages, et chacun est une décision de méthode rendue visible :
 *
 *   - la LECTURE B, imposée : un point par Trésor et par durée, le plus récent.
 *     Sans elle, dix-huit séances gabonaises à trois mois pèsent dix-huit fois
 *     dans l'ajustement, et la courbe s'accroche au court terme.
 *   - la PONDÉRATION par l'âge, réglée par sa demi-vie : une séance de dix-huit
 *     mois ne dit pas le coût de l'argent d'aujourd'hui.
 *   - les SÉANCES MINCES, dont le chiffre est vrai et non représentatif : les
 *     sous-pondérer dit cela, les exclure prétendrait qu'elles n'ont pas eu lieu.
 *   - la DÉCROISSANCE λ, calibrée par Trésor ou empruntée à la zone. C'est le
 *     cœur de la méthode en marché mince : un Trésor à six durées n'a pas de
 *     quoi trouver où se place sa courbure, mais il a de quoi se placer sur une
 *     courbure que la zone a trouvée.
 */

const W = 900;
const H = 340;
const P = { l: 56, r: 104, t: 18, b: 46 };

/** Les durées auxquelles un desk demande un taux, qu'elles aient été adjugées ou non. */
const USUELS = [0.25, 0.5, 1, 2, 3, 5, 7, 10];

/** Une date en clair, dans la langue du lecteur, sans passer par le serveur. */
const fmtJour = (iso: string) => new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });

/** L'âge d'un mois arrêté, en jours : c'est lui qui décide de la péremption. */
const jours = (mois: string) => Math.max(0, Math.round((Date.now() - Date.parse(`${mois}-01`)) / 86_400_000));

type Choix = "tous" | "cemac" | string;

interface Serie {
  nom: string;
  couleur: string;
  obs: { annees: number; pct: number; ytmPct: number; ecartPb: number; mot: string; age?: number; mince?: boolean; poids: number }[];
  fit?: Ajustement;
  /** Pourquoi il n'y a pas d'ajustement : un écran qui ne le dit pas a l'air en panne. */
  refus?: Refus;
}

/** Le relevé de la BEAC, tel que la page le donne. */
export interface ReleveBeacVu {
  numero: number;
  mois: string;
  source: string;
  releveLe: string;
  series: { pays: string; points: { annees: number; pct: number }[] }[];
}

export function CourbeAjustee({
  fenetres,
  ariaLabel,
  observeLe,
  choixDate,
  beacReleve,
}: {
  fenetres: Fenetre[];
  ariaLabel: string;
  observeLe?: string;
  choixDate?: React.ReactNode;
  /** Le relevé de la BEAC, posé en filigrane. Absent, la figure s'en passe. */
  beacReleve?: ReleveBeacVu;
}) {
  const t = useT();
  const [choisie, setChoisie] = useState<number | null>(null);
  const premiereGarnie = Math.max(0, fenetres.findIndex((f) => f.pays.length > 0));
  const profondeur = choisie ?? premiereGarnie;
  const pays = fenetres[profondeur]?.pays ?? [];

  const [voulu, setChoix] = useState<Choix>("tous");
  const choix: Choix = voulu === "tous" || voulu === "cemac" || pays.some((p) => p.pays === voulu) ? voulu : "tous";
  const [demiVie, setDemiVie] = useState<number>(180);
  const [minces, setMinces] = useState<Minces>("sous-ponderer");
  const [lambdaZone, setLambdaZone] = useState(true);
  const [zeroCoupon, setZeroCoupon] = useState(false);
  const [voirPoints, setVoirPoints] = useState(true);
  const [voirBande, setVoirBande] = useState(true);
  const [voirBeac, setVoirBeac] = useState(true);
  const boite = useRef<HTMLDivElement | null>(null);
  const [vise, setVise] = useState<number | null>(null);

  /**
   * La lecture B, le dépouillement s'il est demandé, puis les poids.
   *
   * Le dépouillement se fait ici, par Trésor, et jamais sur un mélange : un
   * taux zéro-coupon est propre à une signature, et actualiser les coupons
   * d'une obligation camerounaise sur une courbe qui mêle le Congo à quinze
   * pour cent n'aurait aucun sens.
   */
  const preparer = useMemo(
    () => (p: CourbePays) => {
      const gardes = derniereParDuree(p.points);
      const spots = zeroCoupon
        ? new Map(
            depouiller(gardes.map((q) => ({ annees: q.annees, ytmPct: q.pct, couponPct: q.coupon ?? 0 }))).map((s) => [s.annees, s]),
          )
        : undefined;
      return gardes.map((q) => {
        const s = spots?.get(q.annees);
        return {
          annees: q.annees,
          pct: s ? s.spotPct : q.pct,
          ytmPct: q.pct,
          ecartPb: s?.ecartPb ?? 0,
          mot: q.mot,
          age: q.age,
          mince: q.mince,
          poids: poids(q, { demiVieJours: demiVie || undefined, minces }),
        };
      });
    },
    [demiVie, minces, zeroCoupon],
  );

  /**
   * La courbe de zone se calcule toujours : c'est elle qui prête sa courbure.
   *
   * Elle rassemble les points de tous les Trésors, un par Trésor et par durée.
   * Ce n'est pas un taux auquel quiconque emprunte, c'est la forme commune du
   * coût du temps dans une zone à monnaie unique.
   */
  const zone = useMemo(() => {
    const obs = pays.flatMap(preparer);
    const r = ajuster(obs);
    return { obs, fit: abouti(r) ? r : undefined, refus: abouti(r) ? undefined : r.refus };
  }, [pays, preparer]);

  const series = useMemo((): Serie[] => {
    const impose = lambdaZone && zone.fit ? { lambda: zone.fit.lambda } : {};
    if (choix === "cemac") return [{ nom: t("CEMAC"), couleur: CEMAC_COLOR, obs: zone.obs, fit: zone.fit, refus: zone.refus }];
    return pays
      .filter((p) => choix === "tous" || choix === p.pays)
      .map((p) => {
        const obs = preparer(p);
        const r = ajuster(obs, impose);
        return { nom: p.pays, couleur: COUNTRY_COLOR[p.pays], obs, fit: abouti(r) ? r : undefined, refus: abouti(r) ? undefined : r.refus };
      });
  }, [choix, pays, preparer, zone, lambdaZone, t]);

  /**
   * Les courbes de la BEAC qui correspondent à ce qu'on regarde.
   *
   * En vue de zone il n'y en a pas : elle ne consolide pas, et inventer une
   * moyenne de ses trois Trésors pour la lui attribuer serait lui prêter un
   * chiffre qu'elle ne publie pas.
   */
  /**
   * Le filigrane ne paraît que devant un seul Trésor.
   *
   * Les deux courbes ne mesurent pas la même chose, et ce qu'on regarde en les
   * superposant est l'écart d'un Trésor avec lui-même. En vue d'ensemble il n'y
   * a pas de Trésor affiché, et six écarts à la fois ne se lisent pas.
   */
  const beac = useMemo(() => {
    if (!voirBeac || choix === "tous" || choix === "cemac") return [];
    const sien = (beacReleve?.series ?? []).find((s) => s.pays === choix);
    return sien ? [{ nom: sien.pays, couleur: COUNTRY_COLOR[sien.pays as keyof typeof COUNTRY_COLOR] ?? CEMAC_COLOR, pts: sien.points }] : [];
  }, [voirBeac, choix, beacReleve]);

  const tous = series.flatMap((s) => s.obs);
  const echelle = useMemo(() => {
    if (!tous.length) return null;
    /* Le filigrane est dans l'échelle parce qu'il est dans le dessin : la BEAC
       va jusqu'à quinze ans là où nous nous arrêtons à sept. */
    const xs = [...tous.map((o) => Math.log(o.annees)), ...beac.flatMap((b) => b.pts.map((q) => Math.log(q.annees)))];
    const ys = [
      ...tous.map((o) => o.pct),
      ...beac.flatMap((b) => b.pts.map((q) => q.pct)),
      ...series.flatMap((s) => (s.fit ? USUELS.filter((u) => u >= s.fit!.borne.court && u <= s.fit!.borne.long).map((u) => s.fit!.taux(u)) : [])),
    ];
    const marge = Math.max((Math.max(...ys) - Math.min(...ys)) * 0.16, 0.3);
    return { x0: Math.min(...xs), x1: Math.max(...xs), lo: Math.min(...ys) - marge, hi: Math.max(...ys) + marge };
  }, [tous, series, beac]);

  if (!echelle) {
    return (
      <div>
        <div className="empty">{t("Aucune séance relue à cette date : il n'y a rien à ajuster.")}</div>
      </div>
    );
  }

  const X = (a: number) => P.l + ((Math.log(a) - echelle.x0) / (echelle.x1 - echelle.x0 || 1)) * (W - P.l - P.r);
  const Y = (v: number) => H - P.b - ((v - echelle.lo) / (echelle.hi - echelle.lo || 1)) * (H - P.t - P.b);

  /** Les durées où l'on échantillonne la courbe : régulières en log, comme l'axe. */
  const grille = Array.from({ length: 140 }, (_, i) => Math.exp(echelle.x0 + ((echelle.x1 - echelle.x0) * i) / 139));
  const graduations: number[] = [];
  for (let v = Math.ceil(echelle.lo); v <= echelle.hi; v++) graduations.push(v);
  const usuelsVus = USUELS.filter((u) => Math.log(u) >= echelle.x0 - 1e-9 && Math.log(u) <= echelle.x1 + 1e-9);

  const mot = (a: number) => (a < 1 ? t("{n} mois", { n: Math.round(a * 12) }) : a === 1 ? t("1 an") : t("{n} ans", { n: Math.round(a * 10) / 10 }));
  const pc = (v: number) => v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const bouger = (e: React.PointerEvent) => {
    const r = boite.current?.getBoundingClientRect();
    if (!r) return;
    const x = ((e.clientX - r.left) / r.width) * W;
    if (x < P.l || x > W - P.r) return setVise(null);
    setVise(Math.exp(echelle.x0 + ((x - P.l) / (W - P.l - P.r)) * (echelle.x1 - echelle.x0)));
  };

  const ajustables = series.filter((s) => s.fit);

  /**
   * Les quatre chiffres qui décident si l'on peut se servir de la figure.
   *
   * Ils s'adaptent à la sélection : un seul Trésor donne les siens, plusieurs
   * donnent le compte de ceux qui s'ajustent et le meilleur écart. Une moyenne
   * de quatre Trésors ne voudrait rien dire.
   */
  const tousPoints = series.flatMap((se) => se.obs);
  const frais = tousPoints.length ? Math.min(...tousPoints.map((o) => o.age ?? 0)) : undefined;
  const durees = new Set(tousPoints.map((o) => o.mot)).size;
  const seul = series.length === 1 ? series[0] : undefined;
  const meilleur = ajustables.length ? ajustables.reduce((m, x) => (x.fit!.rmsePb < m.fit!.rmsePb ? x : m)) : undefined;

  const kpis: { mot: string; valeur: string; sous: string }[] = [
    seul?.fit
      ? { mot: "Taux court", valeur: `${pc(tauxCourt(seul.fit))} %`, sous: t("au jour le jour, implicite") }
      : { mot: "Trésors tracés", valeur: `${ajustables.length} / ${series.length}`, sous: t("ajustés sur ceux qu'on regarde") },
    { mot: "Point le plus frais", valeur: frais == null ? "—" : `${frais} ${t("jours")}`, sous: t("depuis la séance") },
    { mot: "Durées observées", valeur: String(durees), sous: t("durées distinctes, une séance chacune") },
    meilleur?.fit
      ? { mot: "Écart aux points", valeur: `${Math.round(meilleur.fit.rmsePb)} pb`, sous: seul ? t("sur {n} observations", { n: seul.obs.length }) : t("le meilleur, {p}", { p: meilleur.nom }) }
      : { mot: "Écart aux points", valeur: "—", sous: t("aucun ajustement") },
  ];

  /**
   * La phrase avant la figure.
   *
   * On lit une phrase en une seconde et une courbe en trente : la plupart du
   * temps la phrase suffit, et quand elle ne suffit pas elle dit au moins si la
   * courbe mérite les trente secondes.
   */
  const tete = (() => {
    if (seul?.fit) {
      const f = seul.fit;
      const court = f.taux(Math.max(0.25, f.borne.court));
      const longAns = Math.min(7, f.borne.long);
      return t("{p} paie {a} % à {d1} et {b} % à {d2}. Sa courbe s'ajuste à {e} points de base sur {n} durées, la plus récente datant de {j} jours.", {
        p: seul.nom,
        a: pc(court),
        d1: mot(Math.max(0.25, f.borne.court)),
        b: pc(f.taux(longAns)),
        d2: mot(longAns),
        e: Math.round(f.rmsePb),
        n: seul.obs.length,
        j: frais ?? 0,
      });
    }
    if (seul) return t("{p} n'a pas de courbe ici : {r}", { p: seul.nom, r: t(seul.refus ?? "pas d'ajustement") });
    if (!ajustables.length) return t("Aucun des {n} Trésors regardés ne porte assez de durées pour qu'une courbe existe.", { n: series.length });
    return t("{a} des {n} Trésors regardés s'ajustent, le mieux étant {p} à {e} points de base sur {d} durées distinctes.", {
      a: ajustables.length,
      n: series.length,
      p: meilleur!.nom,
      e: Math.round(meilleur!.fit!.rmsePb),
      d: durees,
    });
  })();

  return (
    <div>
      <div className={styles.filtres}>
        <div className={styles.grp}>
          <span className={styles.etiq} id="aj-tresor">
            {t("Trésor")}
          </span>
          <div className={styles.seg} role="group" aria-labelledby="aj-tresor">
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
          </div>
        </div>

        {choixDate}

        <div className={styles.grp}>
          <span className={styles.etiq} id="aj-profondeur">
            {t("Profondeur")}
          </span>
          <div className={styles.seg} role="group" aria-labelledby="aj-profondeur">
            {fenetres.map((f, i) => (
              <button key={f.jours} type="button" aria-pressed={profondeur === i} onClick={() => setChoisie(i)}>
                {f.mot}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.grp}>
          <span className={styles.etiq} id="aj-demivie">
            {t("Une séance compte pour moitié après")}
          </span>
          <div className={styles.seg} role="group" aria-labelledby="aj-demivie">
            {[
              { j: 0, mot: t("jamais") },
              { j: 90, mot: t("90 j") },
              { j: 180, mot: t("180 j") },
              { j: 365, mot: t("1 an") },
            ].map((o) => (
              <button key={o.j} type="button" aria-pressed={demiVie === o.j} onClick={() => setDemiVie(o.j)}>
                {o.mot}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.grp}>
          <span className={styles.etiq} id="aj-minces">
            {t("Séances minces")}
          </span>
          <div className={styles.seg} role="group" aria-labelledby="aj-minces">
            {(
              [
                ["inclure", t("à part entière")],
                ["sous-ponderer", t("sous-pondérées")],
                ["exclure", t("écartées")],
              ] as [Minces, string][]
            ).map(([v, m]) => (
              <button key={v} type="button" aria-pressed={minces === v} onClick={() => setMinces(v)}>
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.grp}>
          <span className={styles.etiq} id="aj-lambda">
            {t("Courbure λ")}
          </span>
          <div className={styles.seg} role="group" aria-labelledby="aj-lambda">
            <button type="button" aria-pressed={lambdaZone} onClick={() => setLambdaZone(true)} title={t("Un Trésor à six durées n'a pas de quoi trouver où se place sa courbure, mais il a de quoi se placer sur celle de la zone.")}>
              {t("celle de la zone")}
            </button>
            <button type="button" aria-pressed={!lambdaZone} onClick={() => setLambdaZone(false)}>
              {t("propre à chacun")}
            </button>
          </div>
        </div>

        <div className={styles.grp}>
          <span className={styles.etiq} id="aj-mesure">
            {t("Ce qu'on ajuste")}
          </span>
          <div className={styles.seg} role="group" aria-labelledby="aj-mesure">
            <button type="button" aria-pressed={!zeroCoupon} onClick={() => setZeroCoupon(false)} title={t("Le rendement à l'échéance dépend du coupon du titre : deux titres de même échéance et de coupons différents n'ont pas le même.")}>
              {t("le rendement actuariel")}
            </button>
            <button type="button" aria-pressed={zeroCoupon} onClick={() => setZeroCoupon(true)} title={t("Le taux auquel un franc reçu à cette durée s'actualise. Il ne dépend que de la durée, et c'est lui qu'on appelle une courbe des taux.")}>
              {t("le taux zéro-coupon")}
            </button>
          </div>
        </div>

        <div className={styles.grp}>
          <span className={styles.etiq} id="aj-voir">
            {t("Afficher")}
          </span>
          <div className={styles.seg} role="group" aria-labelledby="aj-voir">
            <button type="button" aria-pressed={voirPoints} onClick={() => setVoirPoints((v) => !v)}>
              {t("les points observés")}
            </button>
            <button type="button" aria-pressed={voirBande} onClick={() => setVoirBande((v) => !v)}>
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
          </div>
        </div>
      </div>

      {/* Quatre faits en langue courante avant qu'on touche au graphique. */}
      <p className={styles.tete}>{tete}</p>
      <dl className={styles.kpis}>
        {kpis.map((k) => (
          <div key={k.mot}>
            <dt>{t(k.mot)}</dt>
            <dd>{k.valeur}</dd>
            <span>{k.sous}</span>
          </div>
        ))}
      </dl>

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
          {/* L'axe porte les durées usuelles, y compris celles que personne n'a adjugées :
              c'est là que la courbe ajustée sert à quelque chose. */}
          {usuelsVus.map((u) => (
            <g key={u}>
              <line x1={X(u)} y1={P.t} x2={X(u)} y2={H - P.b} className={styles.grilleV} />
              <text x={X(u)} y={H - P.b + 18} textAnchor="middle" className={styles.tick}>
                {mot(u)}
              </text>
            </g>
          ))}
          <path d={`M${P.l} ${P.t}V${H - P.b}H${W - P.r}`} className={styles.axe} />

          {/* Le filigrane de la BEAC, derrière : ce n'est pas une mesure de la
              même chose, et il ne doit jamais couvrir la nôtre. */}
          {/* La couleur du Trésor n'appartient qu'à nos chiffres : la BEAC passe
              au gris et porte son nom, sans quoi trois pointillés de la même
              teinte disent trois choses différentes sans les distinguer. */}
          {beac.map((b) => {
            const bout = b.pts[b.pts.length - 1];
            return (
              <g key={`beac-${b.nom}`}>
                <polyline
                  points={b.pts.map((q) => `${X(q.annees).toFixed(1)},${Y(q.pct).toFixed(1)}`).join(" ")}
                  fill="none"
                  stroke="var(--ink-3)"
                  strokeWidth={1.5}
                  strokeDasharray="1 4"
                  strokeLinecap="round"
                />
                {bout && (
                  <text x={X(bout.annees) + 6} y={Y(bout.pct) + 4} className={styles.beacBout}>
                    {t("BEAC")}
                  </text>
                )}
              </g>
            );
          })}

          {series.map((se) => {
            if (!se.fit) return null;
            const f = se.fit;
            const dedans = grille.filter((a) => a >= f.borne.court && a <= f.borne.long);
            const trace = (l: number[]) => l.map((a) => `${X(a).toFixed(1)},${Y(f.taux(a)).toFixed(1)}`).join(" ");
            return (
              <g key={`fit-${se.nom}`}>
                {voirBande && dedans.length > 1 && (
                  <polygon
                    points={`${dedans.map((a) => `${X(a).toFixed(1)},${Y(f.taux(a) + f.bande(a)).toFixed(1)}`).join(" ")} ${[...dedans]
                      .reverse()
                      .map((a) => `${X(a).toFixed(1)},${Y(f.taux(a) - f.bande(a)).toFixed(1)}`)
                      .join(" ")}`}
                    fill={se.couleur}
                    opacity={0.12}
                  />
                )}
                {/* Hors des durées observées, le trait se met en pointillé : au delà,
                    ce n'est plus de l'interpolation, c'est une extrapolation. */}
                {grille.filter((a) => a < f.borne.court).length > 1 && (
                  <polyline points={trace([...grille.filter((a) => a < f.borne.court), f.borne.court])} fill="none" stroke={se.couleur} strokeWidth={1.5} strokeDasharray="4 4" opacity={0.6} />
                )}
                {grille.filter((a) => a > f.borne.long).length > 1 && (
                  <polyline points={trace([f.borne.long, ...grille.filter((a) => a > f.borne.long)])} fill="none" stroke={se.couleur} strokeWidth={1.5} strokeDasharray="4 4" opacity={0.6} />
                )}
                {dedans.length > 1 && <polyline points={trace(dedans)} fill="none" stroke={se.couleur} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />}
              </g>
            );
          })}

          {voirPoints &&
            series.map((se) => (
              <g key={`obs-${se.nom}`}>
                {se.obs.map((o, i) => (
                  <g key={`${o.mot}-${i}`}>
                    {/* Le résidu, tracé : c'est lui qui contrôle l'ajustement. */}
                    {se.fit && <line x1={X(o.annees)} y1={Y(o.pct)} x2={X(o.annees)} y2={Y(se.fit.taux(o.annees))} stroke={se.couleur} strokeWidth={1} opacity={0.4} />}
                    <circle
                      cx={X(o.annees)}
                      cy={Y(o.pct)}
                      r={3.6}
                      fill={o.mince ? "var(--surface)" : se.couleur}
                      stroke={se.couleur}
                      strokeWidth={2}
                      opacity={Math.max(0.35, o.poids)}
                    />
                  </g>
                ))}
              </g>
            ))}

          {vise != null && (
            <line x1={X(vise)} y1={P.t} x2={X(vise)} y2={H - P.b} className={styles.suivi} />
          )}

          {ajustables.map((se) => {
            const f = se.fit!;
            const a = Math.min(f.borne.long, Math.exp(echelle.x1));
            return (
              <text key={`nom-${se.nom}`} x={X(a) + 6} y={Y(f.taux(a)) + 4} className={styles.nom} fill={se.couleur}>
                {se.nom}
              </text>
            );
          })}
        </svg>

        {vise != null && ajustables.length > 0 && (
          <div
            className={styles.bulle}
            style={
              (X(vise) / W) * 100 < 62 ? { left: `${(X(vise) / W) * 100 + 2.5}%`, top: "6%" } : { right: `${100 - (X(vise) / W) * 100 + 2.5}%`, top: "6%" }
            }
          >
            <div className={styles.bulleTitre}>{mot(vise)}</div>
            {ajustables.map((se) => {
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
            })}
          </div>
        )}
      </div>

      {/* Quatre traits, quatre sens : sans dictionnaire, on croit voir deux fois
          la même chose. */}
      {series.length > 0 && (
        <div className={styles.legende}>
          {ajustables.length > 0 && (
            <span>
              <i className={styles.trPlein} style={{ background: ajustables.length === 1 ? ajustables[0].couleur : "var(--ink-2)" }} aria-hidden="true" />
              {t("notre courbe, sur les durées observées")}
            </span>
          )}
          {ajustables.some((se) => se.fit!.borne.long < Math.exp(echelle.x1) || se.fit!.borne.court > Math.exp(echelle.x0)) && (
            <span>
              <i className={styles.trTirets} style={{ borderTopColor: ajustables.length === 1 ? ajustables[0].couleur : "var(--ink-2)" }} aria-hidden="true" />
              {t("la nôtre encore, extrapolée : aucune séance à ces durées")}
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

      {beac.length > 0 && beacReleve && (
        <p className={`${styles.beacNote} ${jours(beacReleve.mois) > 100 ? styles.beacVieux : ""}`}>
          <i aria-hidden="true" />
          {t(
            "En pointillé, la courbe que la BEAC publie dans ses statistiques mensuelles n° {n}, arrêtée en {d} et relevée le {r} dans le tracé de son PDF, faute de table publiée.",
            { n: beacReleve.numero, d: beacReleve.mois, r: fmtJour(beacReleve.releveLe) },
          )}{" "}
          {/* La péremption se dit : elle paraît une fois par mois avec environ
              deux mois de retard, au delà ce n'est plus un repère sur aujourd'hui. */}
          {jours(beacReleve.mois) > 100 && <b>{t("Ce relevé a {n} jours : ce n'est plus un repère sur aujourd'hui.", { n: jours(beacReleve.mois) })}</b>}{" "}
          <b>
            {t(
              "Son abscisse est la durée d'émission, la nôtre la vie restante : chez elle une obligation émise à sept ans reste posée à « 7 ans » toute sa vie, chez nous elle glisse vers la gauche en approchant de son terme.",
            )}
          </b>{" "}
          {t(
            "Et son univers est l'encours quand le nôtre est la dernière séance adjugée : elle dit ce que la dette vivante coûte en moyenne, nous ce que le marché a facturé. Les deux sont justes et ne répondent pas à la même question.",
          )}{" "}
          <a href={beacReleve.source} target="_blank" rel="noreferrer">
            {t("sa pièce")}
          </a>
        </p>
      )}

      {zeroCoupon && (
        <p className={styles.note}>
          {t(
            "Les taux tracés sont dépouillés : chaque obligation à coupon est ramenée au taux zéro-coupon de son échéance, ses coupons intermédiaires étant actualisés sur la courbe du même Trésor. Un bon passe tel quel, il est zéro-coupon par construction.",
          )}{" "}
          {(() => {
            const bouges = series.flatMap((s) => s.obs).filter((o) => o.ecartPb !== 0);
            if (!bouges.length) return t("Aucun titre affiché n'a plus d'un flux à venir : le dépouillement ne déplace rien ici.");
            const pire = bouges.reduce((m, o) => (Math.abs(o.ecartPb) > Math.abs(m.ecartPb) ? o : m));
            return t("{n} titres déplacés, au plus de {p} points de base, à {d}.", { n: bouges.length, p: pire.ecartPb, d: pire.mot });
          })()}
        </p>
      )}

      {/* Les paramètres, en clair : une courbe ajustée qui ne montre pas ses
          coefficients demande une confiance qu'elle n'a pas méritée. */}
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
              <th className="r">{t("taux court")}</th>
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

      {/* Le tableau des durées usuelles : la raison d'être de l'ajustement. */}
      {ajustables.length > 0 && (
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
    </div>
  );
}
