"use client";

import { useMemo, useState } from "react";
import { useT } from "@/i18n/client";
import { fmtPct } from "@/lib/format";
import styles from "./bande.module.css";

/**
 * LA BANDE À POINTS : UN POINT PAR FONDS SUR L'AXE DE RENTABILITÉ.
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
 * vient chercher en comparant des fonds. La bande garde les deux : l'amas se
 * voit, les queues se nomment, et chaque point est un fonds qu'on peut ouvrir.
 *
 * LE POINT EST LE FONDS, DONC IL Y MÈNE. C'est un lien, pas un ornement.
 *
 * LE TIRÉ À MÊME LA BANDE EST PARTI, et c'est un choix du 7 octobre 2026. Il
 * cohabitait avec la barre à deux poignées, les deux écrivant la même plage,
 * et il fallait quatre pixels de garde pour qu'un geste commencé sur un point
 * n'ouvre pas ce fonds en arrivant. Une surface qui sert à deux choses se
 * défend par une règle qu'on ne voit pas : la barre suffit, et le point
 * redevient un lien franc.
 *
 * LE BANDEAU DE SUIVI, au-dessus du tracé, de hauteur fixe. C'est la règle de
 * la maison depuis le 5 octobre 2026 : une valeur qui suit un geste ne se met
 * pas dans une bulle qui apparaît et disparaît, elle se met dans une bande
 * qui est toujours là. Rien ne saute quand on prend une poignée.
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
  epingles,
  surEpingle,
}: {
  points: PointFonds[];
  nomFenetre: string;
  /** La plage retenue, ou rien quand on les regarde tous. */
  plage?: [number, number];
  surPlage: (p: [number, number] | undefined) => void;
  /** Les fonds épinglés, et la bascule : un point les pose et les retire. */
  epingles: string[];
  surEpingle: (id: string) => void;
}) {
  const t = useT();

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
    return { min, max, mediane, places, etages };
  }, [points]);

  /**
   * LA PLAGE EN COURS DE RÉGLAGE VIT ICI, ET L'ADRESSE N'EST ÉCRITE QU'AU
   * RELÂCHEMENT.
   *
   * La page est rendue sur le serveur à chaque changement d'adresse : écrire
   * à chaque pixel du curseur, c'était un aller-retour par pixel, et la page
   * traînait de plusieurs secondes derrière le doigt. C'est déjà la règle de
   * la jauge des durées des adjudications, qui l'avait rencontrée avant.
   */
  /* LE RÉGLAGE SE DÉRIVE, IL NE SE SYNCHRONISE PAS. Un effet qui remettait
     l'état local à zéro quand l'adresse changeait déclenchait un rendu en
     cascade, et le linteur a raison de le refuser. Le réglage porte donc la
     plage dont il est né : quand elle change — un retour arrière, un lien
     ouvert — il ne se rapporte plus à rien et l'adresse reprend la main,
     sans un seul effet. */
  const [reglage, setReglage] = useState<{ pour: string; v: [number, number] } | null>(null);
  const clef = `${plage?.[0] ?? ""}:${plage?.[1] ?? ""}`;

  if (!vue) return null;
  const { min, max, mediane, places, etages } = vue;
  const courant = (reglage?.pour === clef ? reglage.v : undefined) ?? plage ?? [min, max];
  const [pMin, pMax] = courant;
  const dedans = (v: number) => v >= pMin - 0.001 && v <= pMax + 0.001;
  const retenus = points.filter((p) => dedans(p.valeur)).length;
  const posee = Boolean(plage) || reglage?.pour === clef;

  const bouger = (quoi: "min" | "max", brut: number) => {
    const v = arrondi(brut);
    setReglage({ pour: clef, v: quoi === "min" ? [Math.min(v, pMax), pMax] : [pMin, Math.max(v, pMin)] });
  };
  const poser = () => {
    if (reglage?.pour !== clef) return;
    const [a, b] = reglage.v;
    surPlage(a <= min && b >= max ? undefined : [a, b]);
  };

  /**
   * LES GRADUATIONS PORTENT DES VALEURS, et c'est une correction. L'axe ne
   * montrait que ses deux bornes et, sous les points, le nom des deux fonds
   * extrêmes : on lisait « qui », jamais « combien ». Un axe se lit en
   * chiffres, et les noms se trouvent au survol de leur point.
   */
  const pas = max - min > 24 ? 5 : max - min > 9 ? 2 : max - min > 4 ? 1 : 0.5;
  const ticks: number[] = [];
  for (let v = Math.ceil(min / pas) * pas; v <= max + 1e-9; v += pas) ticks.push(Math.round(v * 100) / 100);

  return (
    <section className={styles.bloc} aria-label={t("Où se tient chaque fonds sur {f}", { f: nomFenetre })}>
      {/* LE BANDEAU DE SUIVI : trois zones, une hauteur fixe, toujours là.
          Ce qu'on règle à gauche, ce qu'il reste au milieu, la médiane à
          droite — et rien ne saute quand la main prend une poignée. */}
      <div className={styles.suivi}>
        <span className={styles.suiviPlage}>
          <b>{fmtPct(pMin, 1)}</b>
          <i aria-hidden="true">→</i>
          <b>{fmtPct(pMax, 1)}</b>
        </span>
        <span className={styles.suiviQuoi}>
          {posee ? t("{n} fonds sur {m}", { n: retenus, m: points.length }) : t("{n} fonds mesurables sur {f}", { n: points.length, f: nomFenetre })}
        </span>
        <span className={styles.suiviMed}>{t("médiane {v}", { v: fmtPct(mediane, 1) })}</span>
      </div>

      <div className={styles.bande} style={{ height: `${Math.max(etages, 3) * 13 + 34}px` }}>
        <span className={styles.mediane} style={{ left: `${placer(mediane, min, max)}%` }} aria-hidden="true" />
        {plage || reglage?.pour === clef ? (
          <span
            className={styles.zone}
            style={{ left: `${placer(pMin, min, max)}%`, width: `${placer(pMax, min, max) - placer(pMin, min, max)}%` }}
            aria-hidden="true"
          />
        ) : null}
        {/* LE POINT ÉPINGLE SON FONDS, IL NE L'OUVRE PLUS. Ouvrir, c'était
            quitter la bande pour lire trois chiffres, puis revenir ; or ce
            qu'on veut en pointant un point, c'est le lire SANS perdre la
            distribution. « Voir la fiche » reste au bout de sa rangée. */}
        {places.map((p) => {
          const pose = epingles.includes(p.id);
          return (
            <button
              key={p.id}
              type="button"
              aria-pressed={pose}
              className={`${styles.point} ${p.valeur < 0 ? styles.pointNeg : ""} ${dedans(p.valeur) ? "" : styles.pointHors} ${pose ? styles.pointPose : ""}`}
              style={{ left: `${p.x}%`, bottom: `${26 + p.etage * 13}px` }}
              title={`${p.titre} · ${fmtPct(p.valeur, 2)}`}
              aria-label={`${p.titre} · ${fmtPct(p.valeur, 2)} — ${pose ? t("détacher") : t("épingler")}`}
              onClick={() => surEpingle(p.id)}
            />
          );
        })}
        <span className={styles.axe} aria-hidden="true" />
        {ticks.map((v) => (
          <span key={v} className={styles.tick} style={{ left: `${placer(v, min, max)}%` }} aria-hidden="true">
            {fmtPct(v, pas < 1 ? 1 : 0)}
          </span>
        ))}
      </div>

      {/* LA BARRE À DEUX POIGNÉES. Deux curseurs natifs superposés : seules
          les poignées prennent le doigt, sans quoi le second couvrirait le
          premier sur toute sa longueur. */}
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
          aria-label={t("Rentabilité minimale")}
          onChange={(e) => bouger("min", Number(e.target.value))}
          onPointerUp={poser}
          onKeyUp={poser}
          onBlur={poser}
        />
        <input
          id="fonds-perf-max"
          type="range"
          min={min}
          max={max}
          step={0.1}
          value={pMax}
          aria-label={t("Rentabilité maximale")}
          onChange={(e) => bouger("max", Number(e.target.value))}
          onPointerUp={poser}
          onKeyUp={poser}
          onBlur={poser}
        />
      </div>

      <p className={styles.etat}>
        {plage ? (
          <button type="button" className={styles.vider} onClick={() => surPlage(undefined)}>
            {t("Tout revoir")}
          </button>
        ) : (
          <span className={styles.muet}>{t("Resserrez la barre pour ne garder qu'une plage. Un point mène au fonds.")}</span>
        )}
      </p>
    </section>
  );
}
