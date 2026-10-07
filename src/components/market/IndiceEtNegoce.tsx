"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type React from "react";
import { BarreDePlage } from "@/components/charts/BarreDePlage";
import { TrackBand, type Lu } from "@/components/charts/tracker";
import { useT } from "@/i18n/client";
import { fmt, fmtDate, money } from "@/lib/format";
import { gouttiere } from "@/components/charts/gouttiere";
import styles from "./IndiceEtNegoce.module.css";

/**
 * LE NIVEAU DE L'INDICE, ET LE NÉGOCE QUI EST DESSOUS.
 *
 * Le panneau donnait déjà le niveau et le nombre de lignes qui avaient traité.
 * Il manquait le MONTANT, qui était calculé depuis toujours et n'était tracé
 * nulle part : sans lui, une séance à trois lignes et cinquante-quatre millions
 * ne se distingue pas d'une séance à trois lignes et deux millions. Mesuré sur
 * le dépôt, le 1ᵉʳ octobre 2026 : 54 M de FCFA sur trois lignes, indice
 * inchangé. Un gros montant qui ne bouge pas l'indice est un bloc négocié au
 * même cours, c'est-à-dire de l'activité sans réévaluation — et le compte de
 * lignes seul ne pouvait pas le dire.
 *
 * TROIS ÉTAGES, UN SEUL AXE DU TEMPS. Un niveau, des francs et un compte n'ont
 * aucun rapport d'échelle : les mettre dans un même cadre demanderait deux axes
 * verticaux, et l'un des trois mentirait. Ils partagent donc l'abscisse et rien
 * d'autre, et un seul survol les lit tous les trois.
 *
 * LES TROIS ÉCHELLES SE PRENNENT DANS LA PLAGE AFFICHÉE, jamais dans
 * l'historique entier : le pic du 1ᵉʳ octobre écrase les onze autres mois, dont
 * la plupart des séances tiennent sous cinq millions et se réduisent à un
 * trait. Resserrer sur un mois calme fait réapparaître ses propres séances.
 *
 * SA PLAGE EST LA SIENNE. La page porte déjà une date d'observation et une
 * profondeur, qui servent à la courbe : celles-là regardent des adjudications,
 * celle-ci regarde la cote, et ce ne sont pas les mêmes séances.
 */

export interface SeanceNegoce {
  on: string;
  /** Le niveau publié de l'indice ce jour-là. */
  niveau: number;
  /** Combien de lignes de la cote ont traité. */
  lignes: number;
  /** Le montant échangé sur toute la cote, en francs. */
  montant: number;
}

const H_NIVEAU = 176;
const H_MONTANT = 112;
const H_LIGNES = 96;
const PAD_T = 8;
const PAD_R = 10;
const PAD_B = 18;

export function IndiceEtNegoce({ seances, cotees }: { seances: SeanceNegoce[]; cotees: number }) {
  const t = useT();
  const boite = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(760);
  useEffect(() => {
    const el = boite.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(Math.max(320, el.clientWidth)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const dates = useMemo(() => seances.map((s) => s.on), [seances]);
  const [zoom, setZoom] = useState<[number, number] | null>(null);
  const fenetre: [number, number] = useMemo(() => zoom ?? [0, Math.max(0, seances.length - 1)], [zoom, seances.length]);
  const pts = useMemo(() => seances.slice(fenetre[0], fenetre[1] + 1), [seances, fenetre]);
  const [vise, setVise] = useState<number | null>(null);

  /* Un resserrement peut laisser le doigt hors de la fenêtre : on ne garde
     pas une lecture qui désigne une séance qu'on n'affiche plus. */
  const k = vise != null && vise < pts.length ? vise : pts.length - 1;
  const lue = pts[k];

  if (pts.length < 2 || !lue) {
    return (
      <>
        <BarreDePlage dates={dates} fenetre={fenetre} surFenetre={setZoom} surTout={() => setZoom(null)} />
        <div className="empty">{t("Pas assez de séances lues sur cette plage.")}</div>
      </>
    );
  }

  const n = pts.length;
  const niveaux = pts.map((p) => p.niveau);
  let lo = Math.min(...niveaux);
  let hi = Math.max(...niveaux);
  const marge = (hi - lo || Math.max(1, lo * 0.01)) * 0.08;
  lo -= marge;
  hi += marge;
  const maxM = Math.max(1, ...pts.map((p) => p.montant));
  const maxL = Math.max(1, ...pts.map((p) => p.lignes));

  const niv = (v: number) => Math.round(v).toLocaleString("fr-FR");
  const padL = gouttiere([niv(lo), niv(hi), money(maxM)]);
  const x = (i: number) => padL + (n < 2 ? 0 : (i / (n - 1)) * (W - padL - PAD_R));
  const bw = Math.max(1.5, (W - padL - PAD_R) / n - 0.8);

  const yN = (v: number) => PAD_T + (1 - (v - lo) / (hi - lo)) * (H_NIVEAU - PAD_T - PAD_B);
  const basM = H_MONTANT - PAD_B;
  const basL = H_LIGNES - PAD_B;

  const viser = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    if (r.width < 1) return;
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.round(((px - padL) / Math.max(1, W - padL - PAD_R)) * (n - 1));
    setVise(Math.max(0, Math.min(n - 1, i)));
  };
  const suivi = { onPointerMove: viser, onPointerLeave: () => setVise(null) };

  /* Les quatre graduations du niveau tombent sur des valeurs que le tracé
     atteint, et les deux des étages du bas sur leur propre maximum. */
  const gradN = [0, 1, 2, 3].map((q) => lo + ((hi - lo) * q) / 3);
  const trace = pts.map((p, i) => `${x(i).toFixed(1)},${yN(p.niveau).toFixed(1)}`).join(" ");

  const sommeM = pts.reduce((s, p) => s + p.montant, 0);
  const sommeL = pts.reduce((s, p) => s + p.lignes, 0);
  const muettes = pts.filter((p) => p.lignes === 0).length;
  const ecart = ((pts[n - 1].niveau - pts[0].niveau) / pts[0].niveau) * 100;
  const signe = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(2).replace(".", ",")} %`;

  const lu: Lu = {
    quand: fmtDate(lue.on),
    dit: vise == null ? t("dernière de la plage") : t("séance lue"),
    valeur: lue.niveau.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    sous: t("niveau de l'indice"),
    droite: [
      <>{lue.montant === 0 ? t("aucun échange") : `${money(lue.montant)} FCFA`}</>,
      <>{lue.lignes === 0 ? t("aucune ligne, séance muette") : t("{n} lignes sur {m}", { n: String(lue.lignes), m: String(cotees) })}</>,
    ],
  };

  const curseur = (hauteur: number) => (
    <line x1={x(k)} x2={x(k)} y1={PAD_T - 4} y2={hauteur - PAD_B} className={styles.curseur} opacity={vise == null ? 0 : 1} />
  );

  return (
    <div ref={boite}>
      <BarreDePlage dates={dates} fenetre={fenetre} surFenetre={setZoom} surTout={() => setZoom(null)} />

      {/* CE QUE LA PLAGE VAUT, au-dessus du tracé et non en légende : les cinq
          chiffres changent en même temps qu'elle. */}
      <div className={styles.totaux}>
        <div>
          <span>{t("Sur la plage")}</span>
          <b>{t("{n} séances", { n: String(n) })}</b>
        </div>
        <div>
          <span>{t("Montant échangé")}</span>
          <b className={styles.or}>{money(sommeM)} FCFA</b>
        </div>
        <div>
          <span>{t("Lignes × séances")}</span>
          <b className={styles.bleu}>{fmt(sommeL)}</b>
        </div>
        <div>
          <span>{t("Séances muettes")}</span>
          <b className={muettes > 0 ? styles.rouge : undefined}>{`${muettes} / ${n}`}</b>
        </div>
        <div>
          <span>{t("L'indice y a fait")}</span>
          <b className={ecart > 0 ? styles.hausse : ecart < 0 ? styles.baisse : undefined}>{signe(ecart)}</b>
        </div>
      </div>

      <TrackBand lu={lu} />

      <p className={styles.etage}>
        {t("Niveau de l'indice")} <i>{`${niv(lo)} – ${niv(hi)}`}</i>
      </p>
      <svg viewBox={`0 0 ${W} ${H_NIVEAU}`} className={styles.svg} role="img" aria-label={t("Niveau de l'indice, séance par séance")} {...suivi}>
        {gradN.map((v) => (
          <g key={v}>
            <line x1={padL} x2={W - PAD_R} y1={yN(v)} y2={yN(v)} className={styles.grille} />
            <text x={padL - 6} y={yN(v) + 3} textAnchor="end" className={styles.tick}>
              {niv(v)}
            </text>
          </g>
        ))}
        <polyline points={trace} className={styles.ligne} />
        {curseur(H_NIVEAU)}
        {vise != null && <circle cx={x(k)} cy={yN(lue.niveau)} r={3.5} className={styles.point} />}
      </svg>

      <p className={styles.etage}>
        {t("Montant échangé")} <i>{t("plus haut sur la plage : {v} FCFA", { v: money(maxM) })}</i>
      </p>
      <svg viewBox={`0 0 ${W} ${H_MONTANT}`} className={styles.svg} role="img" aria-label={t("Montant échangé à chaque séance")} {...suivi}>
        <line x1={padL} x2={W - PAD_R} y1={basM} y2={basM} className={styles.grille} />
        <line x1={padL} x2={W - PAD_R} y1={PAD_T} y2={PAD_T} className={styles.grille} />
        <text x={padL - 6} y={PAD_T + 3} textAnchor="end" className={styles.tick}>
          {money(maxM)}
        </text>
        {pts.map((p, i) => {
          const h = p.montant === 0 ? 1.2 : Math.max(1.2, (p.montant / maxM) * (basM - PAD_T));
          return <rect key={p.on} x={x(i) - bw / 2} y={basM - h} width={bw} height={h} className={p.montant === 0 ? styles.barreVide : styles.barreOr} />;
        })}
        {curseur(H_MONTANT)}
      </svg>

      <p className={styles.etage}>
        {t("Lignes qui ont traité")} <i>{t("0 à {n} sur {m} cotées · rouge : séance muette", { n: String(maxL), m: String(cotees) })}</i>
      </p>
      <svg viewBox={`0 0 ${W} ${H_LIGNES}`} className={styles.svg} role="img" aria-label={t("Nombre de lignes ayant traité à chaque séance")} {...suivi}>
        <line x1={padL} x2={W - PAD_R} y1={basL} y2={basL} className={styles.grille} />
        <line x1={padL} x2={W - PAD_R} y1={PAD_T} y2={PAD_T} className={styles.grille} />
        <text x={padL - 6} y={PAD_T + 3} textAnchor="end" className={styles.tick}>
          {maxL}
        </text>
        {pts.map((p, i) => {
          const h = p.lignes === 0 ? 2 : Math.max(2, (p.lignes / maxL) * (basL - PAD_T));
          return <rect key={p.on} x={x(i) - bw / 2} y={basL - h} width={bw} height={h} className={p.lignes === 0 ? styles.barreMuette : styles.barreBleue} />;
        })}
        {curseur(H_LIGNES)}
        {moisDe(pts).map((m) => (
          <text key={m.i} x={x(m.i)} y={H_LIGNES - 4} textAnchor="middle" className={styles.tick}>
            {m.mot}
          </text>
        ))}
      </svg>

      <p className={styles.note}>
        {t(
          "Trois grandeurs sans rapport d'échelle : un niveau, des francs, un compte. Elles ne peuvent pas partager un cadre sans qu'une des trois mente, donc elles partagent l'axe du temps et rien d'autre, et un seul survol les lit toutes les trois. Les deux étages du bas prennent leur hauteur de la plage affichée : resserrer sur un mois calme fait réapparaître ses petites séances, qu'un gros montant d'un autre mois écrasait. Un montant élevé sans mouvement de l'indice est un bloc négocié au même cours, c'est-à-dire de l'activité sans réévaluation.",
        )}
      </p>
    </div>
  );
}

/** Une étiquette de mois à chaque changement de mois, et pas davantage. */
function moisDe(pts: SeanceNegoce[]): { i: number; mot: string }[] {
  const out: { i: number; mot: string }[] = [];
  let vu = "";
  pts.forEach((p, i) => {
    const cle = p.on.slice(0, 7);
    if (cle === vu) return;
    vu = cle;
    out.push({ i, mot: new Date(`${p.on}T12:00:00Z`).toLocaleDateString("fr-FR", { month: "short" }) });
  });
  return out;
}
