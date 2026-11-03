import type { Comparatif, SeanceComparee } from "@/lib/domain/sondage-comparatif";
import { fmtDate, fmtPct } from "@/lib/format";
import { codeDuPays } from "@/lib/market/budget";
import styles from "./ComparatifDesSeances.module.css";

type T = (s: string, v?: Record<string, string>) => string;

/**
 * LE COMPARATIF DES SÉANCES PASSÉES, SOUS LES CHIFFRES DU CLIENT (3 novembre 2026).
 *
 * TROIS LECTURES D'UNE MÊME SÉRIE, et le client les a demandées toutes les trois : le tableau
 * (la séance, exacte), la frise (la fourchette servie, avec sa limite en repère) et la courbe (la
 * tendance du niveau moyen). Aucune ne remplace les autres : le tableau donne le chiffre, la frise
 * dit si la limite tombe dans la fourchette, la courbe dit où va le marché.
 *
 * ET LES AUTRES PAYS NE SE MÊLENT PAS AU PAYS DE LA LIGNE : ils sont repliés, avec leur pays écrit,
 * parce que le risque n'est pas le même — une séance gabonaise ne dit pas ce que paiera le Cameroun.
 *
 * UN CHIFFRE NON PUBLIÉ S'ÉCRIT « non publié », jamais un tiret seul : un tiret se lit comme zéro.
 */
export function ComparatifDesSeances({ c, rendementLimite, role = "attente", t }: { c: Comparatif; rendementLimite?: number; role?: "question" | "attente"; t: T }) {
  const nom = c.unite === "prix" ? t("Prix moy.") : t("Taux moy.");
  const np = <span className={styles.np}>{t("non publié")}</span>;
  const chrono = [...c.duPays].filter((s) => s.niveau != null).reverse();

  return (
    <div className={styles.comparatif}>
      {c.servies && (
        <p className={styles.phrase}>
          {t(c.unite === "prix" ? "Un prix de {l} ou moins a été servi à {n} séances sur {s}." : "Un taux de {l} ou plus a été servi à {n} séances sur {s}.", { l: fmtPct(c.limite!, 2), n: String(c.servies.n), s: String(c.servies.sur) })}{" "}
          <span className={styles.mention}>{t("Les séances passées ne préjugent pas de la prochaine.")}</span>
        </p>
      )}

      {c.duPays.length > 0 && (
        <Tableau c={c} lignes={c.duPays} nom={nom} np={np} rendementLimite={rendementLimite} role={role} t={t} />
      )}

      {c.duPays.some((s) => s.bas != null && s.haut != null) && <Frise c={c} role={role} t={t} />}
      {chrono.length >= 3 && <Courbe c={c} serie={chrono} t={t} />}

      {c.ailleurs.length > 0 && (
        <details className={styles.ailleurs}>
          <summary>{t("Autres pays, même durée")}</summary>
          <Tableau c={c} lignes={c.ailleurs} nom={nom} np={np} avecPays t={t} />
        </details>
      )}
    </div>
  );
}

function Tableau({ c, lignes, nom, np, avecPays, rendementLimite, role, t }: { c: Comparatif; lignes: SeanceComparee[]; nom: string; np: React.ReactNode; avecPays?: boolean; rendementLimite?: number; role?: "question" | "attente"; t: T }) {
  return (
    <div className={styles.defile}>
      <table className={styles.tableau}>
        <thead>
          <tr>
            <th>{t("Séance")}</th>
            {avecPays && <th>{t("Pays")}</th>}
            <th>{nom}</th>
            <th>{t("Rdt")}</th>
            <th>{t("Couv.")}</th>
          </tr>
        </thead>
        <tbody>
          {!avecPays && c.limite != null && (
            <tr className={styles.vous}>
              <td>{t(role === "question" ? "Niveau indicatif" : "Votre limite")}</td>
              <td>
                {c.unite === "prix" ? "≤" : "≥"} {fmtPct(c.limite, 2)}
              </td>
              <td>{rendementLimite != null ? `≥ ${fmtPct(rendementLimite, 2)}` : ""}</td>
              <td />
            </tr>
          )}
          {lignes.map((s) => (
            <tr key={s.id}>
              <td>{fmtDate(s.le)}</td>
              {avecPays && <td>{codeDuPays(s.pays)}</td>}
              <td>{s.niveau != null ? fmtPct(s.niveau, 2) : np}</td>
              <td>{s.rendement != null ? fmtPct(s.rendement, 2) : np}</td>
              <td>{s.couverture != null ? `${Math.round(s.couverture)} %` : np}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** La frise : la fourchette servie de chaque séance, et le trait de la limite du client. */
function Frise({ c, role, t }: { c: Comparatif; role?: "question" | "attente"; t: T }) {
  const lignes = c.duPays.filter((s) => s.bas != null && s.haut != null);
  const tous = [...lignes.flatMap((s) => [s.bas!, s.haut!]), ...(c.limite != null ? [c.limite] : [])];
  const lo = Math.min(...tous);
  const hi = Math.max(...tous);
  const pos = (v: number) => (hi === lo ? 50 : ((v - lo) / (hi - lo)) * 100);
  return (
    <div className={styles.bloc}>
      <h3 className={styles.sous}>{t(c.unite === "prix" ? "Fourchette des prix servis" : "Fourchette des taux servis")}</h3>
      {lignes.map((s) => (
        <div key={s.id} className={styles.frise}>
          <span className={styles.frDate}>{fmtDate(s.le)}</span>
          <span className={styles.frVal}>
            {fmtPct(s.bas!, 2)} – {fmtPct(s.haut!, 2)}
          </span>
          <span className={styles.piste}>
            <b className={styles.plage} style={{ "--a": pos(s.bas!), "--b": pos(s.haut!) } as React.CSSProperties} />
            {c.limite != null && <i className={styles.limite} style={{ "--a": pos(c.limite) } as React.CSSProperties} />}
          </span>
        </div>
      ))}
      {c.limite != null && <p className={styles.legende}>{t(role === "question" ? "Le trait or est le niveau indicatif." : "Le trait or est votre limite.")}</p>}
    </div>
  );
}

/** La courbe du niveau moyen servi, du plus ancien au plus récent, et la ligne de la limite. */
function Courbe({ c, serie, t }: { c: Comparatif; serie: SeanceComparee[]; t: T }) {
  const W = 300;
  const H = 110;
  const vals = [...serie.map((s) => s.niveau!), ...(c.limite != null ? [c.limite] : [])];
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const t0 = Date.parse(serie[0].le);
  const t1 = Date.parse(serie[serie.length - 1].le);
  const x = (iso: string) => 8 + (t1 === t0 ? 0 : ((Date.parse(iso) - t0) / (t1 - t0)) * (W - 16));
  const y = (v: number) => 8 + (hi === lo ? 0.5 : 1 - (v - lo) / (hi - lo)) * (H - 16);
  return (
    <div className={styles.bloc}>
      <h3 className={styles.sous}>{t(c.unite === "prix" ? "Prix moyen servi" : "Taux moyen servi")}</h3>
      <svg viewBox={`0 0 ${W} ${H}`} className={styles.courbe} role="img" aria-label={t("Courbe du niveau moyen servi")}>
        {c.limite != null && <line x1="0" x2={W} y1={y(c.limite)} y2={y(c.limite)} className={styles.trait} />}
        <polyline fill="none" className={styles.ligne} points={serie.map((s) => `${x(s.le)},${y(s.niveau!)}`).join(" ")} />
        {serie.map((s) => (
          <circle key={s.id} cx={x(s.le)} cy={y(s.niveau!)} r="3" className={styles.point} />
        ))}
      </svg>
      <div className={styles.axe}>
        <span>{fmtDate(serie[0].le)}</span>
        <span>{fmtDate(serie[serie.length - 1].le)}</span>
      </div>
    </div>
  );
}
