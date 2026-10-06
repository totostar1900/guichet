"use client";

import Link from "next/link";
import { useMemo, useRef } from "react";
import { useT } from "@/i18n/client";
import { useLineHref } from "@/components/DeskView";
import { fmtPct } from "@/lib/format";
import styles from "./bande.module.css";

/**
 * LA BANDE À POINTS : UN POINT PAR FONDS SUR L'AXE DE PERFORMANCE.
 *
 * Pourquoi pas un histogramme, qui était la première idée. Mesuré le
 * 6 octobre 2026 sur la fenêtre d'un an : 38 fonds mesurables, de −1,14 % à
 * +16,89 %, et VINGT-HUIT D'ENTRE EUX entre +5 % et +10 %. En classes de cinq
 * points cela donne 1 / 6 / 28 / 1 / 2, c'est-à-dire une barre et quatre
 * moignons ; en classes d'un point, dix-neuf classes de zéro à trois fonds,
 * c'est-à-dire du bruit. Trente-huit valeurs, c'est trop peu pour une
 * distribution.
 *
 * Et surtout UN HISTOGRAMME JETTE L'IDENTITÉ, qui est exactement ce qu'on
 * vient chercher en comparant des fonds : il apprend que la plupart rendent
 * 5 à 10 % et ne permet de retrouver aucun fonds. La bande garde les deux :
 * l'amas se voit, les queues se nomment, et chaque point est un fonds qu'on
 * peut ouvrir.
 *
 * LE POINT EST LE FONDS, DONC IL Y MÈNE. C'est un lien, pas un ornement :
 * voir qu'une valeur se détache et ne pas pouvoir l'ouvrir ferait de la
 * bande une image.
 *
 * DEUX FAÇONS DE RESSERRER, ET ELLES ÉCRIVENT LA MÊME PLAGE. La barre à deux
 * poignées se voit, se touche, se prend au clavier : c'est le contrôle qu'on
 * trouve sans qu'on l'explique. Tirer à même la bande est le geste rapide de
 * qui a déjà compris. Chacun déplace l'autre, et la plage se range dans
 * l'adresse comme les autres filtres.
 *
 * LE TIRÉ ET LE POINT PARTAGENT LA MÊME SURFACE, donc il faut les départager :
 * un déplacement de plus de quatre pixels est un tiré, et il annule le lien
 * qu'on allait suivre. Sans cela, resserrer en partant d'un point ouvrirait
 * ce fonds en arrivant.
 */

export interface PointFonds {
  id: string;
  titre: string;
  valeur: number;
}

/** La place d'un point entre les deux bornes, en pour cent de la largeur. */
const placer = (v: number, min: number, max: number) => (max === min ? 50 : ((v - min) / (max - min)) * 100);
const arrondi = (v: number) => Math.round(v * 10) / 10;

export function BandeFonds({
  points,
  nomFenetre,
  plage,
  surPlage,
}: {
  points: PointFonds[];
  nomFenetre: string;
  /** La plage retenue, ou rien quand on les regarde tous. */
  plage?: [number, number];
  surPlage: (p: [number, number] | undefined) => void;
}) {
  const t = useT();
  const href = useLineHref();
  /** Le tiré en cours : son origine, et s'il a bougé assez pour en être un. */
  const tirage = useRef<{ x0: number; largeur: number; gauche: number; aBouge: boolean } | null>(null);
  /** Vrai le temps du clic qui suit un tiré, pour que le lien ne parte pas. */
  const aGlisse = useRef(false);

  const vue = useMemo(() => {
    if (points.length < 2) return undefined;
    const vals = points.map((p) => p.valeur);
    const bas = Math.min(...vals);
    const haut = Math.max(...vals);
    /* Les bornes des curseurs sont arrondies au dixième VERS L'EXTÉRIEUR :
       sinon le fonds extrême tombe pile sur la poignée et disparaît au
       premier mouvement. */
    const min = Math.floor(bas * 10) / 10;
    const max = Math.ceil(haut * 10) / 10;
    const tri = [...vals].sort((a, b) => a - b);
    const mediane = tri.length % 2 ? tri[(tri.length - 1) / 2] : (tri[tri.length / 2 - 1] + tri[tri.length / 2]) / 2;

    /* L'EMPILEMENT : deux fonds trop proches ne doivent pas se cacher l'un
       l'autre. On range du plus faible au plus fort et on monte d'un étage
       tant que le voisin de gauche est à moins de trois pour cent de la
       largeur, ce qui vaut un diamètre de point sur une bande ordinaire. */
    const ranges = [...points].sort((a, b) => a.valeur - b.valeur);
    const occupe: number[] = [];
    const places = ranges.map((p) => {
      const x = placer(p.valeur, min, max);
      let etage = 0;
      while (occupe[etage] != null && x - occupe[etage] < 3) etage += 1;
      occupe[etage] = x;
      return { ...p, x, etage };
    });
    const etages = Math.max(...places.map((p) => p.etage)) + 1;
    /* Les deux extrêmes se nomment : c'est ce qu'un histogramme ne sait pas
       faire, et c'est la première chose qu'on cherche. */
    const extremes = new Set([places[0]?.id, places[places.length - 1]?.id]);
    return { min, max, mediane, places, etages, extremes };
  }, [points]);

  if (!vue) return null;
  const { min, max, mediane, places, etages, extremes } = vue;
  const [pMin, pMax] = plage ?? [min, max];
  const dedans = (v: number) => v >= pMin - 0.001 && v <= pMax + 0.001;
  const retenus = points.filter((p) => dedans(p.valeur)).length;

  const bouger = (quoi: "min" | "max", brut: number) => {
    const v = arrondi(brut);
    const next: [number, number] = quoi === "min" ? [Math.min(v, pMax), pMax] : [pMin, Math.max(v, pMin)];
    surPlage(next[0] <= min && next[1] >= max ? undefined : next);
  };

  /* Le tiré, à même la bande. Quatre pixels séparent un clic d'un geste :
     en deçà on laisse passer le lien du point, au-delà on resserre. */
  const SEUIL = 4;
  const valeurEnX = (clientX: number, gauche: number, largeur: number) =>
    arrondi(min + Math.min(1, Math.max(0, (clientX - gauche) / largeur)) * (max - min));

  const debutTire = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    tirage.current = { x0: e.clientX, largeur: r.width, gauche: r.left, aBouge: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const pendantTire = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = tirage.current;
    if (!d) return;
    if (!d.aBouge && Math.abs(e.clientX - d.x0) < SEUIL) return;
    d.aBouge = true;
    aGlisse.current = true;
    const a = valeurEnX(d.x0, d.gauche, d.largeur);
    const b = valeurEnX(e.clientX, d.gauche, d.largeur);
    surPlage([Math.min(a, b), Math.max(a, b)]);
  };
  const finTire = (e: React.PointerEvent<HTMLDivElement>) => {
    if (tirage.current?.aBouge) {
      /* Le clic arrive après le relâchement : on ne rend la main au lien
         qu'une fois celui-ci passé. */
      window.setTimeout(() => {
        aGlisse.current = false;
      }, 0);
    }
    tirage.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
    <section className={styles.bloc} aria-label={t("Où se tient chaque fonds sur {f}", { f: nomFenetre })}>
      <div className={styles.tete}>
        <h2>{t("Où se tient chaque fonds")}</h2>
        <p>
          {t("{n} fonds mesurables sur {f} · de {bas} à {haut} · médiane {med}", {
            n: points.length,
            f: nomFenetre,
            bas: fmtPct(min, 1),
            haut: fmtPct(max, 1),
            med: fmtPct(mediane, 1),
          })}
        </p>
      </div>

      {/* La hauteur suit le nombre d'étages : une bande fixe écraserait les
          points quand la fenêtre resserre l'amas. */}
      <div
        className={styles.bande}
        style={{ height: `${Math.max(etages, 3) * 13 + 30}px` }}
        onPointerDown={debutTire}
        onPointerMove={pendantTire}
        onPointerUp={finTire}
        onPointerCancel={finTire}
      >
        <span className={styles.mediane} style={{ left: `${placer(mediane, min, max)}%` }} aria-hidden="true" />
        {plage ? (
          <span
            className={styles.zone}
            style={{ left: `${placer(pMin, min, max)}%`, width: `${placer(pMax, min, max) - placer(pMin, min, max)}%` }}
            aria-hidden="true"
          />
        ) : null}
        {places.map((p) => (
          <Link
            key={p.id}
            href={href(p.id)}
            className={`${styles.point} ${p.valeur < 0 ? styles.pointNeg : ""} ${dedans(p.valeur) ? "" : styles.pointHors}`}
            style={{ left: `${p.x}%`, bottom: `${22 + p.etage * 13}px` }}
            title={`${p.titre} · ${fmtPct(p.valeur, 2)}`}
            /* LE NOM PASSE PAR « aria-label » ET NON PAR UN TEXTE CACHÉ. La
               première version posait un « sr-only » dans chaque point : la
               maison n'a pas cette classe, et les trente-six noms se sont
               affichés en clair par-dessus la bande. Un lien sans texte a
               besoin d'un nom, pas d'un texte qu'on espère invisible. */
            aria-label={`${p.titre} · ${fmtPct(p.valeur, 2)}`}
            onClick={(e) => {
              if (aGlisse.current) e.preventDefault();
            }}
          />
        ))}
        {places
          .filter((p) => extremes.has(p.id))
          .map((p) => (
            <span
              key={`e-${p.id}`}
              className={styles.extreme}
              style={{ left: `${p.x}%`, transform: p.x > 50 ? "translateX(-100%)" : "none" }}
              aria-hidden="true"
            >
              {p.titre.replace(/^(FCPE?|SICAV)\s+/i, "").split(" ").slice(0, 2).join(" ")}
            </span>
          ))}
        <span className={styles.axe} aria-hidden="true" />
        <span className={styles.borne} style={{ left: 0 }} aria-hidden="true">
          {fmtPct(min, 1)}
        </span>
        <span className={`${styles.borne} ${styles.borneD}`} style={{ right: 0 }} aria-hidden="true">
          {fmtPct(max, 1)}
        </span>
      </div>

      {/* LA BARRE À DEUX POIGNÉES. Deux curseurs natifs superposés : seules
          les poignées prennent le doigt, la piste reste au curseur du bas,
          sans quoi le second couvrirait le premier sur toute sa longueur. */}
      <div className={styles.barre}>
        <span className={styles.piste} aria-hidden="true" />
        <span
          className={styles.pisteOn}
          style={{ left: `${placer(pMin, min, max)}%`, right: `${100 - placer(pMax, min, max)}%` }}
          aria-hidden="true"
        />
        <input
          id="fonds-perf-min"
          type="range"
          min={min}
          max={max}
          step={0.1}
          value={pMin}
          aria-label={t("Performance minimale")}
          onChange={(e) => bouger("min", Number(e.target.value))}
        />
        <input
          id="fonds-perf-max"
          type="range"
          min={min}
          max={max}
          step={0.1}
          value={pMax}
          aria-label={t("Performance maximale")}
          onChange={(e) => bouger("max", Number(e.target.value))}
        />
      </div>

      <p className={styles.etat}>
        {plage ? (
          <>
            {t("{n} fonds entre {bas} et {haut}", { n: retenus, bas: fmtPct(pMin, 1), haut: fmtPct(pMax, 1) })}{" "}
            <button type="button" className={styles.vider} onClick={() => surPlage(undefined)}>
              {t("Tout revoir")}
            </button>
          </>
        ) : (
          t("Resserrez la barre, ou tirez à même la bande, pour ne garder qu'une plage de performance. Un point mène au fonds.")
        )}
      </p>
    </section>
  );
}
