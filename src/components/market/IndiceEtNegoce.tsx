"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BarreDePlage } from "@/components/charts/BarreDePlage";
import { Select } from "@/components/ui/Select";
import { TrackBand, TrackMarks, togglePin, trackStyles, useTracker, type Lu } from "@/components/charts/tracker";
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
 *
 * TROIS ÉTAGES, TROIS AXES, UN SEUL AXE DU TEMPS. Un niveau, des francs et un
 * compte n'ont aucun rapport d'échelle : chacun garde le sien, gradué à zéro,
 * à la moitié et au maximum. Ils ne partagent que l'abscisse, et UN SEUL GESTE
 * les lit tous les trois : le suivi est posé sur le bloc, pas sur un tracé.
 *
 * LES ÉCHELLES SE PRENNENT DANS LA PLAGE AFFICHÉE, jamais dans l'historique
 * entier : un pic écrase onze mois de séances qui tiennent sous cinq millions.
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

/** Le négoce d'une seule valeur, pour le sélecteur de société. */
export interface NegoceSociete {
  mnemo: string;
  nom: string;
  points: { on: string; montant: number; transactions: number }[];
}

const H_NIVEAU = 176;
const H_VOL = 118;
const PAD_T = 10;
const PAD_R = 10;
const PAD_B = 20;
const BAS_VOL = H_VOL - PAD_B;

export function IndiceEtNegoce({ seances, societes = [], avecBarre = true, societe }: { seances: SeanceNegoce[]; societes?: NegoceSociete[]; avecBarre?: boolean; /** La société choisie par l'écran qui nous accueille ; sans elle, la nôtre. */ societe?: string }) {
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
  const [sien, setSien] = useState("");
  /* Commandée du dehors quand l'écran porte déjà sa commande de société :
     deux listes pour une seule question, c'est la question qu'on perd. */
  const pilote = societe !== undefined;
  const qui = pilote ? societe : sien;
  const [pins, setPins] = useState<string[]>([]);
  const fenetre: [number, number] = useMemo(() => zoom ?? [0, Math.max(0, seances.length - 1)], [zoom, seances.length]);
  const fenetrees = useMemo(() => (avecBarre ? seances.slice(fenetre[0], fenetre[1] + 1) : seances), [seances, fenetre, avecBarre]);

  /**
   * LE NÉGOCE D'UNE SEULE VALEUR, quand on en choisit une.
   *
   * Le niveau reste celui de l'indice : il n'y a pas d'indice d'une société.
   * Seuls les deux étages du bas changent de source, et les deux axes se
   * recadrent sur ce que cette valeur fait, sans quoi une petite ligne
   * disparaîtrait sous l'échelle de la cote entière.
   */
  const sel = societes.find((s) => s.mnemo === qui);
  const pts = useMemo(() => {
    if (!sel) return fenetrees;
    const par = new Map(sel.points.map((p) => [p.on, p]));
    return fenetrees.map((s) => ({ ...s, montant: par.get(s.on)?.montant ?? 0, transactions: par.get(s.on)?.transactions ?? 0 }));
  }, [fenetrees, sel]);

  const n = pts.length;
  const niveaux = pts.map((p) => p.niveau);
  const lo0 = n ? Math.min(...niveaux) : 0;
  const hi0 = n ? Math.max(...niveaux) : 1;
  const marge = (hi0 - lo0 || Math.max(1, lo0 * 0.01)) * 0.08;
  const lo = lo0 - marge;
  const hi = hi0 + marge;
  const maxM = Math.max(1, ...pts.map((p) => p.montant));
  const maxT = Math.max(1, ...pts.map((p) => p.transactions));
  const niv = (v: number) => Math.round(v).toLocaleString("fr-FR");
  const padL = gouttiere([niv(lo), niv(hi), money(maxM), String(maxT)]);
  const x = (i: number) => padL + (n < 2 ? 0 : (i / (n - 1)) * (W - padL - PAD_R));
  const iDe = (jour: string) => Math.max(0, pts.findIndex((p) => p.on === jour));

  /* LE SUIVI EST CELUI DE LA MAISON : le doigt lit, le second toucher sur le
     même point épingle, un appui long tire une plage. Il est posé sur le bloc
     des trois étages et non sur un seul tracé, pour qu'un geste n'importe où
     désigne la même séance partout. */
  const track = useTracker<HTMLDivElement>({
    keys: pts.map((p) => p.on),
    x: (i) => x(i),
    W,
    pins,
    onPin: (d) => setPins((cur) => togglePin(cur, d)),
    onRange: (a, b) => setPins(a === b ? [a] : [a, b]),
  });

  const barre = avecBarre ? <BarreDePlage dates={dates} fenetre={fenetre} surFenetre={setZoom} surTout={() => setZoom(null)} /> : null;
  const choixSociete =
    societes.length > 0 && !pilote ? (
      <div className={styles.quoi}>
        <Select
          compact
          cherchable={false}
          label={t("Volumes de")}
          value={qui}
          onChange={setSien}
          options={[{ value: "", label: t("toute la cote") }, ...societes.map((s) => ({ value: s.mnemo, label: s.mnemo, hint: s.nom }))]}
        />
      </div>
    ) : null;

  if (n < 2) {
    return (
      <div ref={boite}>
        {barre}
        {choixSociete}
        <div className="empty">{t("Pas assez de séances lues sur cette plage.")}</div>
      </div>
    );
  }

  const vu = track.hover != null && track.hover < n ? track.hover : null;
  const a = track.pinA ? pts[iDe(track.pinA)] : undefined;
  const b = track.pinB ? pts[iDe(track.pinB)] : undefined;
  const k = vu ?? (a && !b ? iDe(a.on) : n - 1);
  const lue = pts[k];

  const yN = (v: number) => PAD_T + (1 - (v - lo) / (hi - lo)) * (H_NIVEAU - PAD_T - PAD_B);
  const yV = (v: number, max: number) => BAS_VOL - (v / max) * (BAS_VOL - PAD_T);
  const bw = Math.max(1.5, (W - padL - PAD_R) / n - 0.8);
  const trace = pts.map((p, i) => `${x(i).toFixed(1)},${yN(p.niveau).toFixed(1)}`).join(" ");
  const gradN = [0, 1, 2, 3].map((q) => lo + ((hi - lo) * q) / 3);

  const sommeM = pts.reduce((s, p) => s + p.montant, 0);
  const sommeT = pts.reduce((s, p) => s + p.transactions, 0);
  const muettes = pts.filter((p) => p.transactions === 0).length;
  const ecart = ((pts[n - 1].niveau - pts[0].niveau) / pts[0].niveau) * 100;
  const prec = k > 0 ? pts[k - 1] : undefined;
  const dv = prec && prec.niveau ? ((lue.niveau - prec.niveau) / prec.niveau) * 100 : 0;
  const signe = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(2).replace(".", ",")} %`;
  const ou = sel ? sel.mnemo : t("toute la cote");

  /* Deux épingles ne valent quelque chose qu'ensemble : tant qu'il n'y en a
     qu'une, il n'y a pas d'écart à lire, et le bandeau lit sa séance. */
  const entre = a && b ? pts.filter((p) => p.on > a.on && p.on <= b.on) : [];
  const lu: Lu =
    vu == null && a && b
      ? {
          quand: fmtDate(a.on),
          dit: t("au {d}", { d: fmtDate(b.on) }),
          valeur: <em className={b.niveau >= a.niveau ? styles.hausse : styles.baisse}>{signe(((b.niveau - a.niveau) / a.niveau) * 100)}</em>,
          sous: t("{n} séances", { n: String(entre.length) }),
          droite: [
            <>{`${money(entre.reduce((s, p) => s + p.montant, 0))} FCFA`}</>,
            <>{t("{n} transactions", { n: String(entre.reduce((s, p) => s + p.transactions, 0)) })}</>,
          ],
        }
      : {
          quand: fmtDate(lue.on),
          dit: vu != null ? t("séance lue") : a ? t("épinglée") : t("dernière de la plage"),
          valeur: (
            <>
              {lue.niveau.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <em className={dv > 0 ? styles.hausse : dv < 0 ? styles.baisse : undefined}>{signe(dv)}</em>
            </>
          ),
          sous: t("niveau de l'indice"),
          droite: [
            <>{lue.montant === 0 ? t("aucun échange") : `${money(lue.montant)} FCFA`}</>,
            <>{lue.transactions === 0 ? t("aucune transaction, séance muette") : t("{n} transactions", { n: String(lue.transactions) })}</>,
          ],
        };

  /** Les marques d'un étage de volume : la plage épinglée, les deux épingles, le doigt. */
  const marques = (hauteur: number) => (
    <>
      {a && b && <rect x={x(iDe(a.on))} y={PAD_T - 6} width={Math.max(0, x(iDe(b.on)) - x(iDe(a.on)))} height={hauteur - PAD_B - PAD_T + 6} className={trackStyles.range} />}
      {[a, b].filter((p): p is SeanceNegoce => Boolean(p)).map((p) => (
        <line key={p.on} x1={x(iDe(p.on))} x2={x(iDe(p.on))} y1={PAD_T - 6} y2={hauteur - PAD_B} className={styles.epingle} />
      ))}
      {vu != null && <line x1={x(k)} x2={x(k)} y1={PAD_T - 6} y2={hauteur - PAD_B} className={styles.curseur} />}
    </>
  );
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
      {choixSociete}

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

      <TrackBand lu={lu} onClear={a ? () => setPins([]) : undefined} clearLabel={t("effacer")} />

      <div className={trackStyles.track} {...track.handlers}>
        <p className={styles.etage}>{t("Niveau de l'indice")}</p>
        <svg viewBox={`0 0 ${W} ${H_NIVEAU}`} className={styles.svg} role="img" aria-label={t("Niveau de l'indice, séance par séance")}>
          {gradN.map((v) => (
            <g key={v}>
              <line x1={padL} x2={W - PAD_R} y1={yN(v)} y2={yN(v)} className={styles.grille} />
              <text x={padL - 6} y={yN(v) + 3} textAnchor="end" className={styles.tick}>
                {niv(v)}
              </text>
            </g>
          ))}
          <polyline points={trace} className={styles.ligne} />
          <TrackMarks
            x={(d) => x(iDe(d))}
            y={(d) => yN(pts[iDe(d)]?.niveau ?? lo)}
            hover={vu != null ? pts[k].on : undefined}
            pinA={track.pinA}
            pinB={track.pinB}
            padT={PAD_T}
            padB={PAD_B}
            H={H_NIVEAU}
          />
        </svg>

        <p className={styles.etage}>{sel ? t("Montant échangé par {m}, en FCFA", { m: ou }) : t("Montant échangé, en FCFA")}</p>
        <svg viewBox={`0 0 ${W} ${H_VOL}`} className={styles.svg} role="img" aria-label={t("Montant échangé à chaque séance")}>
          {axeVol(maxM, (v) => money(v))}
          {pts.map((p, i) => {
            const h = p.montant === 0 ? 1.2 : Math.max(1.2, (p.montant / maxM) * (BAS_VOL - PAD_T));
            return <rect key={p.on} x={x(i) - bw / 2} y={BAS_VOL - h} width={bw} height={h} className={p.montant === 0 ? styles.barreVide : styles.barreOr} />;
          })}
          {marques(H_VOL)}
        </svg>

        <p className={styles.etage}>{sel ? t("Transactions de {m}", { m: ou }) : t("Transactions")}</p>
        <svg viewBox={`0 0 ${W} ${H_VOL}`} className={styles.svg} role="img" aria-label={t("Nombre de transactions à chaque séance")}>
          {axeVol(maxT, (v) => String(Math.round(v)))}
          {pts.map((p, i) => {
            const h = p.transactions === 0 ? 2 : Math.max(2, (p.transactions / maxT) * (BAS_VOL - PAD_T));
            return <rect key={p.on} x={x(i) - bw / 2} y={BAS_VOL - h} width={bw} height={h} className={p.transactions === 0 ? styles.barreMuette : styles.barreBleue} />;
          })}
          {marques(H_VOL)}
          {moisDe(pts).map((m) => (
            <text key={m.i} x={x(m.i)} y={H_VOL - 5} textAnchor="middle" className={styles.tick}>
              {m.mot}
            </text>
          ))}
        </svg>
      </div>

      <p className={styles.note}>
        {t(
          "Trois grandeurs sans rapport d'échelle : un niveau, des francs, un compte. Chacune garde son axe ; elles ne partagent que le temps, et un seul geste les lit toutes les trois. Les deux axes du bas se cadrent sur la plage affichée et non sur l'historique : resserrer sur un mois calme fait réapparaître ses petites séances. Un gros montant sur peu de transactions est un bloc négocié au même cours, beaucoup de transactions pour un petit montant est une nuée de menus échanges, et ni l'un ni l'autre ne se lit sur une seule des deux mesures.",
        )}{" "}
        {t("Touchez une séance pour la lire, une seconde fois pour l'épingler ; deux épingles donnent ce qui s'est passé entre elles.")}
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
