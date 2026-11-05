import { ticksPropres } from "@/lib/ui/axes";
import styles from "./GrapheComptes.module.css";

/**
 * UN GRAPHE ANNUEL À DEUX AXES (fiche d'une action, onglet Émetteur, 9 novembre 2026, planche 5A).
 *
 * Des barres sur l'axe de gauche, des courbes sur l'axe de droite (un axe SECONDAIRE, dans la couleur de sa courbe, avec son unité) : le chiffre d'affaires ne
 * « écrase » plus le résultat net, et deux grandeurs d'échelles différentes ne se lisent plus comme une comparaison de hauteur. Des courbes seules sur l'axe de
 * gauche servent aux rapports en % (marge, rentabilité). Une année sans valeur n'a ni barre ni point : un tiret, jamais un zéro inventé.
 * Dessin pur, rendu côté serveur ; la phrase `resume` dit les valeurs à qui ne voit pas le dessin.
 */
export interface SerieAnnuelle {
  nom: string;
  valeurs: (number | null)[];
  teinte: "or" | "or-doux" | "bleu";
}

const classe = (t: SerieAnnuelle["teinte"]) => (t === "bleu" ? styles.bleu : t === "or-doux" ? styles.orDoux : styles.or);
const fond = (t: SerieAnnuelle["teinte"]) => (t === "bleu" ? styles.fondBleu : t === "or-doux" ? styles.fondOrDoux : styles.fondOr);
const nombre = (v: number) => v.toLocaleString("fr-FR", { maximumFractionDigits: 2 });

export function GrapheComptes({
  annees,
  unite,
  barres = [],
  lignes = [],
  droit,
  resume,
}: {
  annees: string[];
  /** L'unité de l'axe de gauche (« Md FCFA », « % », « FCFA »). */
  unite: string;
  barres?: SerieAnnuelle[];
  lignes?: SerieAnnuelle[];
  /** L'axe secondaire : des courbes dans une autre unité. */
  droit?: { unite: string; lignes: SerieAnnuelle[] };
  resume: string;
}) {
  const W = 320;
  const H = 172;
  const gauche = 44;
  const marge = droit ? 44 : 8;
  const haut = 16;
  const bas = 140;
  const n = annees.length;
  const fente = (W - gauche - marge) / n;
  const valeursG = [...barres, ...lignes].flatMap((s) => s.valeurs.filter((v): v is number => v != null));
  const valeursD = (droit?.lignes ?? []).flatMap((s) => s.valeurs.filter((v): v is number => v != null));
  const bornesG = (vals: number[], zero: boolean) => {
    const min = zero ? Math.min(0, ...vals) : Math.min(...vals);
    return ticksPropres(min, Math.max(...vals, 0.0001), 4);
  };
  const tG = bornesG(valeursG.length ? valeursG : [0], true);
  const tD = droit ? bornesG(valeursD.length ? valeursD : [0], true) : [];
  const echelle = (ticks: number[]) => {
    const a = ticks[0];
    const b = ticks[ticks.length - 1] === a ? a + 1 : ticks[ticks.length - 1];
    return (v: number) => bas - ((v - a) / (b - a)) * (bas - haut);
  };
  const yG = echelle(tG);
  const yD = echelle(tD.length ? tD : [0, 1]);
  const cx = (j: number) => gauche + j * fente + fente / 2;
  const largeur = Math.min(24, (fente * 0.8) / Math.max(1, barres.length));
  const trace = (s: SerieAnnuelle, y: (v: number) => number) => {
    let d = "";
    s.valeurs.forEach((v, j) => {
      if (v == null) return;
      d += `${d === "" || s.valeurs[j - 1] == null ? "M" : "L"}${cx(j).toFixed(1)} ${y(v).toFixed(1)} `;
    });
    return d.trim();
  };
  const toutes = [...barres.map((s) => ({ s, axe: "g" as const })), ...lignes.map((s) => ({ s, axe: "g" as const })), ...(droit?.lignes ?? []).map((s) => ({ s, axe: "d" as const }))];
  return (
    <div className={styles.bloc}>
      <svg viewBox={`0 0 ${W} ${H}`} className={styles.dessin} role="img" aria-label={resume}>
        <text x={2} y={9} className={`${styles.unite} ${barres[0] ? classe(barres[0].teinte) : lignes[0] ? classe(lignes[0].teinte) : ""}`} style={{ fill: "currentColor" }}>
          {unite}
        </text>
        {tG.map((v) => (
          <g key={v}>
            <line x1={gauche} x2={W - marge} y1={yG(v)} y2={yG(v)} className={styles.grille} />
            <text x={gauche - 4} y={yG(v) + 2.5} textAnchor="end" className={styles.graduation}>
              {nombre(v)}
            </text>
          </g>
        ))}
        {droit && (
          <>
            <text x={W - 2} y={9} textAnchor="end" className={styles.uniteDroite}>
              {droit.unite}
            </text>
            {tD.map((v) => (
              <text key={v} x={W - marge + 4} y={yD(v) + 2.5} className={styles.graduationDroite}>
                {nombre(v)}
              </text>
            ))}
          </>
        )}
        {barres.map((s, k) =>
          s.valeurs.map((v, j) => {
            const x0 = cx(j) - (barres.length * largeur) / 2 + k * largeur;
            if (v == null) return k === 0 ? (
              <text key={`${s.nom}${j}`} x={cx(j)} y={bas - 4} textAnchor="middle" className={styles.graduation}>
                —
              </text>
            ) : null;
            return <rect key={`${s.nom}${j}`} x={x0} y={Math.min(yG(v), yG(0))} width={largeur - 2} height={Math.max(2, Math.abs(yG(0) - yG(v)))} rx={2} className={classe(s.teinte)} />;
          }),
        )}
        {lignes.map((s) => (
          <g key={s.nom}>
            <path d={trace(s, yG)} className={`${styles.ligne} ${classe(s.teinte)}`} />
            {s.valeurs.map((v, j) => (v == null ? null : <circle key={j} cx={cx(j)} cy={yG(v)} r={2.8} className={classe(s.teinte)} />))}
          </g>
        ))}
        {(droit?.lignes ?? []).map((s) => (
          <g key={s.nom}>
            <path d={trace(s, yD)} className={`${styles.ligne} ${classe(s.teinte)}`} />
            {s.valeurs.map((v, j) => (v == null ? null : <circle key={j} cx={cx(j)} cy={yD(v)} r={3} className={classe(s.teinte)} />))}
          </g>
        ))}
        {annees.map((a, j) => (
          <text key={a} x={cx(j)} y={H - 6} textAnchor="middle" className={styles.graduation}>
            {a}
          </text>
        ))}
      </svg>
      <p className={styles.legende}>
        {toutes.map(({ s, axe }) => (
          <span key={s.nom}>
            <i className={fond(s.teinte)} />
            {s.nom}
            {droit ? ` · ${axe === "d" ? "axe droit" : "axe gauche"}` : ""}
          </span>
        ))}
      </p>
    </div>
  );
}
