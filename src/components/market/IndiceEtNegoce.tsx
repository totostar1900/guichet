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
 * UN SEUL COMPOSANT POUR LES DEUX ÉCRANS, la page publique de l'indice et le
 * panneau de fraîcheur du desk. Ils montraient la même chose de deux façons
 * incomplètes : l'un un sélecteur à trois positions, donc UNE grandeur à la
 * fois ; l'autre deux étages mais sans axe. Deux moitiés ne font pas un
 * graphique, et deux copies d'une figure dérivent.
 *
 * MONTANT ET TRANSACTIONS ENSEMBLE, parce qu'aucun des deux ne suffit. Mesuré
 * sur le dépôt : le 4 mars 2026, 20 M de FCFA pour CENT QUATRE transactions,
 * c'est-à-dire une nuée de très petits échanges ; le 1ᵉʳ octobre, 54 M pour
 * HUIT, c'est-à-dire quelques blocs, et l'indice n'a pas bougé ce jour-là.
 * Deux journées actives au premier coup d'œil, deux marchés opposés. Il y a
 * même des séances à zéro million pour vingt et une transactions, des
 * échanges si petits qu'ils s'arrondissent à rien.
 *
 * TROIS ÉTAGES, TROIS AXES, UN SEUL AXE DU TEMPS. Un niveau, des francs et un
 * compte n'ont aucun rapport d'échelle : les loger dans un même cadre
 * demanderait deux axes verticaux, et l'un des trois mentirait. Chacun garde
 * le sien, gradué à zéro, à la moitié et au maximum ; ils ne partagent que
 * l'abscisse, et un seul survol les lit tous les trois.
 *
 * LES ÉCHELLES SE PRENNENT DANS LA PLAGE AFFICHÉE, jamais dans l'historique
 * entier : un pic écrase onze mois de séances qui tiennent sous cinq
 * millions. Resserrer sur un mois calme fait réapparaître les siennes.
 */

export interface SeanceNegoce {
  on: string;
  /** Le niveau publié de l'indice ce jour-là. */
  niveau: number;
  /** Le montant échangé sur toute la cote, en francs. */
  montant: number;
  /** Le nombre de transactions de la séance. */
  transactions: number;
}

const H_NIVEAU = 176;
const H_VOL = 118;
const PAD_T = 10;
const PAD_R = 10;
const PAD_B = 20;
/** Le bas des deux étages de volume : au-dessus des étiquettes de mois. */
const BAS_VOL = H_VOL - PAD_B;

export function IndiceEtNegoce({ seances, avecBarre = true }: { seances: SeanceNegoce[]; avecBarre?: boolean }) {
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
  /* Sans barre, la plage est déjà posée par l'écran qui nous accueille. */
  const pts = useMemo(() => (avecBarre ? seances.slice(fenetre[0], fenetre[1] + 1) : seances), [seances, fenetre, avecBarre]);
  const [vise, setVise] = useState<number | null>(null);

  const barre = avecBarre ? <BarreDePlage dates={dates} fenetre={fenetre} surFenetre={setZoom} surTout={() => setZoom(null)} /> : null;

  /* Un resserrement peut laisser le doigt hors de la fenêtre : on ne garde pas
     une lecture qui désigne une séance qu'on n'affiche plus. */
  const k = vise != null && vise < pts.length ? vise : pts.length - 1;
  const lue = pts[k];

  if (pts.length < 2 || !lue) {
    return (
      <div ref={boite}>
        {barre}
        <div className="empty">{t("Pas assez de séances lues sur cette plage.")}</div>
      </div>
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
  const maxT = Math.max(1, ...pts.map((p) => p.transactions));

  const niv = (v: number) => Math.round(v).toLocaleString("fr-FR");
  const padL = gouttiere([niv(lo), niv(hi), money(maxM), String(maxT)]);
  const x = (i: number) => padL + (n < 2 ? 0 : (i / (n - 1)) * (W - padL - PAD_R));
  const bw = Math.max(1.5, (W - padL - PAD_R) / n - 0.8);

  const yN = (v: number) => PAD_T + (1 - (v - lo) / (hi - lo)) * (H_NIVEAU - PAD_T - PAD_B);
  const yV = (v: number, max: number) => BAS_VOL - (v / max) * (BAS_VOL - PAD_T);

  const viser = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    if (r.width < 1) return;
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.round(((px - padL) / Math.max(1, W - padL - PAD_R)) * (n - 1));
    setVise(Math.max(0, Math.min(n - 1, i)));
  };
  const suivi = { onPointerMove: viser, onPointerLeave: () => setVise(null) };

  const trace = pts.map((p, i) => `${x(i).toFixed(1)},${yN(p.niveau).toFixed(1)}`).join(" ");
  const gradN = [0, 1, 2, 3].map((q) => lo + ((hi - lo) * q) / 3);

  const sommeM = pts.reduce((s, p) => s + p.montant, 0);
  const sommeT = pts.reduce((s, p) => s + p.transactions, 0);
  const muettes = pts.filter((p) => p.transactions === 0).length;
  const ecart = ((pts[n - 1].niveau - pts[0].niveau) / pts[0].niveau) * 100;
  const prec = k > 0 ? pts[k - 1] : undefined;
  const dv = prec && prec.niveau ? ((lue.niveau - prec.niveau) / prec.niveau) * 100 : 0;
  const signe = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(2).replace(".", ",")} %`;

  const lu: Lu = {
    quand: fmtDate(lue.on),
    dit: vise == null ? t("dernière de la plage") : t("séance lue"),
    valeur: (
      <>
        {lue.niveau.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
        <em className={dv > 0 ? styles.hausse : dv < 0 ? styles.baisse : undefined}>{signe(dv)}</em>
      </>
    ),
    sous: t("niveau de l'indice"),
    droite: [
      <>{lue.montant === 0 ? t("aucun échange") : `${money(lue.montant)} FCFA`}</>,
      <>{lue.transactions === 0 ? t("aucune transaction, séance muette") : t("{n} transactions", { n: String(lue.transactions) })}</>,
    ],
  };

  /** Le curseur d'un étage : il tombe à la même abscisse sur les trois. */
  const curseur = (hauteur: number) => <line x1={x(k)} x2={x(k)} y1={PAD_T - 6} y2={hauteur - PAD_B} className={styles.curseur} opacity={vise == null ? 0 : 1} />;
  /** Un axe de volume : zéro, la moitié, le maximum de ce qu'on affiche. */
  const axeVol = (max: number, mot: (v: number) => string) =>
    [0, 0.5, 1].map((f) => {
      const v = max * f;
      return (
        <g key={f}>
          <line x1={padL} x2={W - PAD_R} y1={yV(v, max)} y2={yV(v, max)} className={styles.grille} />
          <text x={padL - 6} y={yV(v, max) + 3} textAnchor="end" className={styles.tick}>
            {f === 0 ? "0" : mot(v)}
          </text>
        </g>
      );
    });

  return (
    <div ref={boite}>
      {barre}

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
          <span>{t("Transactions")}</span>
          <b className={styles.bleu}>{fmt(sommeT)}</b>
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

      <p className={styles.etage}>{t("Niveau de l'indice")}</p>
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

      <p className={styles.etage}>{t("Montant échangé, en FCFA")}</p>
      <svg viewBox={`0 0 ${W} ${H_VOL}`} className={styles.svg} role="img" aria-label={t("Montant échangé à chaque séance")} {...suivi}>
        {axeVol(maxM, (v) => money(v))}
        {pts.map((p, i) => {
          const h = p.montant === 0 ? 1.2 : Math.max(1.2, (p.montant / maxM) * (BAS_VOL - PAD_T));
          return <rect key={p.on} x={x(i) - bw / 2} y={BAS_VOL - h} width={bw} height={h} className={p.montant === 0 ? styles.barreVide : styles.barreOr} />;
        })}
        {curseur(H_VOL)}
      </svg>

      <p className={styles.etage}>{t("Transactions")}</p>
      <svg viewBox={`0 0 ${W} ${H_VOL}`} className={styles.svg} role="img" aria-label={t("Nombre de transactions à chaque séance")} {...suivi}>
        {axeVol(maxT, (v) => String(Math.round(v)))}
        {pts.map((p, i) => {
          const h = p.transactions === 0 ? 2 : Math.max(2, (p.transactions / maxT) * (BAS_VOL - PAD_T));
          return <rect key={p.on} x={x(i) - bw / 2} y={BAS_VOL - h} width={bw} height={h} className={p.transactions === 0 ? styles.barreMuette : styles.barreBleue} />;
        })}
        {curseur(H_VOL)}
        {moisDe(pts).map((m) => (
          <text key={m.i} x={x(m.i)} y={H_VOL - 5} textAnchor="middle" className={styles.tick}>
            {m.mot}
          </text>
        ))}
      </svg>

      <p className={styles.note}>
        {t(
          "Trois grandeurs sans rapport d'échelle : un niveau, des francs, un compte. Chacune garde son axe ; elles ne partagent que le temps, et un seul survol les lit toutes les trois. Les deux axes du bas se cadrent sur la plage affichée et non sur l'historique : resserrer sur un mois calme fait réapparaître ses petites séances. Un gros montant sur peu de transactions est un bloc négocié au même cours, beaucoup de transactions pour un petit montant est une nuée de menus échanges, et ni l'un ni l'autre ne se lit sur une seule des deux mesures.",
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
