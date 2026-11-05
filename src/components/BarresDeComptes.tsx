import styles from "./BarresDeComptes.module.css";

/**
 * LES BARRES D'UNE SÉRIE ANNUELLE (fiche d'une action, 9 novembre 2026) : une ou deux séries par exercice, une même échelle, l'année dessous. Dessin pur, rendu côté
 * serveur ; les valeurs sont dites en toutes lettres dans la description accessible, et la légende dit la teinte de chaque série.
 */
export interface SerieDeBarres {
  nom: string;
  valeurs: (number | null)[];
  teinte: "or" | "bleu";
}

export function BarresDeComptes({ annees, series, resume }: { annees: string[]; series: SerieDeBarres[]; /** La phrase que lit un lecteur d'écran (les valeurs, dans l'unité). */ resume: string }) {
  const W = 320;
  const H = 120;
  const bas = H - 16;
  const haut = 6;
  const max = Math.max(1, ...series.flatMap((s) => s.valeurs.map((v) => (v == null ? 0 : v))));
  const fente = W / annees.length;
  const larg = Math.min(26, (fente * 0.8) / series.length);
  return (
    <div className={styles.bloc}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={resume} className={styles.dessin}>
        <line x1="0" x2={W} y1={bas} y2={bas} className={styles.axe} />
        {annees.map((a, j) => {
          const x0 = j * fente + fente / 2 - (series.length * larg) / 2;
          return (
            <g key={a}>
              {series.map((s, k) => {
                const v = s.valeurs[j];
                if (v == null || v <= 0) return null;
                const h = Math.max(2, (v / max) * (bas - haut));
                return <rect key={s.nom} x={x0 + k * larg} y={bas - h} width={larg - 2} height={h} rx="2" className={s.teinte === "or" ? styles.or : styles.bleu} />;
              })}
              <text x={j * fente + fente / 2} y={H - 3} textAnchor="middle" className={styles.annee}>
                {a}
              </text>
            </g>
          );
        })}
      </svg>
      {series.length > 1 && (
        <p className={styles.legende}>
          {series.map((s) => (
            <span key={s.nom}>
              <i className={s.teinte === "or" ? styles.fondOr : styles.fondBleu} />
              {s.nom}
            </span>
          ))}
        </p>
      )}
    </div>
  );
}
