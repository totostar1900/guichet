import { chemin, repere, type OptionsRepere, type Serie } from "@/lib/market/trace";
import styles from "./Trace.module.css";

/**
 * UN GRAPHIQUE DU DESK, RENDU PAR LE SERVEUR.
 *
 * Pas de script : le repère est calculé dans `trace.ts`, qui est testé, et ce
 * composant ne fait que poser les formes. Un graphique qui a besoin de
 * JavaScript pour exister ne s'imprime pas, ne se copie pas dans un courriel
 * et disparaît quand un paquet tombe.
 *
 * UNE PLANCHE VIDE DIT POURQUOI ELLE EST VIDE. Un cadre blanc se lit comme une
 * panne, et le desk perd son temps à chercher la panne.
 */
export function Trace({
  series,
  options,
  vide,
  titre,
}: {
  series: Serie[];
  options?: OptionsRepere;
  vide: string;
  titre: string;
}) {
  const r = repere(series, options);
  if (!r) return <p className={styles.vide}>{vide}</p>;
  return (
    <div className={styles.cadre}>
      <svg viewBox={`0 0 ${r.largeur} ${r.hauteur}`} role="img" aria-label={titre} preserveAspectRatio="xMidYMid meet">
        {r.graduations.map((g) => (
          <g key={g.v}>
            <line className={g.zero ? styles.zero : styles.ligne} x1={r.marges.gauche} y1={g.y} x2={r.largeur - r.marges.droite} y2={g.y} />
            <text className={styles.texte} x={r.marges.gauche - 6} y={g.y + 3.2} textAnchor="end">
              {g.texte}
            </text>
          </g>
        ))}
        {r.etiquettes.map((e, i) => (
          <text key={`${e.l}-${i}`} className={styles.texte} x={e.x} y={r.hauteur - 7} textAnchor={e.ancre}>
            {e.l}
          </text>
        ))}
        {series.map((s, i) => {
          if (s.barres) {
            const w = r.largeurBarre(s.pts.length, s.largeur);
            return (
              <g key={i}>
                {s.pts.map((p, j) => {
                  const y = r.py(p.y);
                  return (
                    <rect key={j} className={styles.barre} fill={s.couleur} x={r.px(p.x) - w / 2} y={Math.min(y, r.base)} width={w} height={Math.max(1, Math.abs(r.base - y))}>
                      {p.titre ? <title>{p.titre}</title> : null}
                    </rect>
                  );
                })}
              </g>
            );
          }
          return (
            <g key={i}>
              {s.pts.length > 1 ? <path className={styles.serie} stroke={s.couleur} d={chemin(r, s.pts)} /> : null}
              {s.ronds
                ? s.pts.map((p, j) => (
                    <circle key={j} className={styles.point} fill={s.couleur} cx={r.px(p.x)} cy={r.py(p.y)} r={s.rayon ?? 3.4}>
                      {p.titre ? <title>{p.titre}</title> : null}
                    </circle>
                  ))
                : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** La légende d'une planche : une pastille carrée et un nom, rien d'autre. */
export function Legende({ items }: { items: { couleur: string; texte: string; trait?: boolean }[] }) {
  if (!items.length) return null;
  return (
    <p className={styles.legende}>
      {items.map((i) => (
        <span key={i.texte}>
          <i className={i.trait ? styles.trait : styles.pave} style={{ background: i.couleur }} />
          {i.texte}
        </span>
      ))}
    </p>
  );
}
