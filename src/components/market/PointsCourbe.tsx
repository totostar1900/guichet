"use client";

import { useMemo, useState } from "react";
import { COUNTRY_COLOR } from "@/lib/market/couleurs";
import { useT } from "@/i18n/client";
import type { CourbePays } from "@/lib/market/courbe-vue";
import styles from "./PointsCourbe.module.css";

/**
 * Chaque point de la courbe, et d'où il vient.
 *
 * Un point imprimé par le Trésor et un point calculé par nous ont exactement la
 * même allure sur un graphique, et la différence entre les deux est précisément
 * ce qu'un lecteur doit pouvoir mettre en doute. Cette table est l'endroit où
 * elle se voit : l'origine du chiffre, et les hypothèses qu'il a fallu faire.
 *
 * Elle se trie et se filtre parce qu'on l'interroge, on ne la lit pas de haut en
 * bas : « montre-moi les abondements », « montre-moi ce qui est calculé ». Sans
 * cela il faut parcourir vingt lignes à l'œil pour répondre à une question que
 * la table pourrait trancher.
 */
type Colonne = "pays" | "annees" | "pct" | "origine" | "on";
type Origine = "toutes" | string;
type Abondements = "inclus" | "seuls" | "exclus";

export function PointsCourbe({ pays }: { pays: CourbePays[] }) {
  const t = useT();
  const [tri, setTri] = useState<{ col: Colonne; rev: boolean }>({ col: "annees", rev: false });
  const [origineVoulue, setOrigine] = useState<Origine>("toutes");
  const [abond, setAbond] = useState<Abondements>("inclus");
  const [q, setQ] = useState("");

  const tous = useMemo(() => pays.flatMap((p) => p.points.map((x) => ({ ...x, pays: p.pays }))), [pays]);
  const origines = useMemo(() => [...new Set(tous.map((p) => p.origine))], [tous]);
  /**
   * L'origine choisie doit figurer parmi celles qu'on propose.
   *
   * La liste dépend de la date d'observation, le choix non : après un recul,
   * l'origine retenue pouvait avoir disparu. Le menu s'affichait alors vide et
   * la table annonçait qu'aucun point ne répond à cette recherche.
   */
  const origine: Origine = origineVoulue === "toutes" || origines.includes(origineVoulue) ? origineVoulue : "toutes";

  const vues = useMemo(() => {
    const mots = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const gardees = tous
      .filter((p) => origine === "toutes" || p.origine === origine)
      .filter((p) => (abond === "inclus" ? true : abond === "seuls" ? p.abondement : !p.abondement))
      // Chaque mot doit se retrouver quelque part : c'est le filtre de la maison,
      // et il rend « congo 3 ans » utile là où un « ou » rendrait tout.
      .filter((p) => mots.every((m) => `${p.pays} ${p.mot} ${p.etiquette} ${p.origine} ${p.code ?? ""} ${p.on}`.toLowerCase().includes(m)));
    const sens = tri.rev ? -1 : 1;
    return [...gardees].sort((a, b) => {
      const x = a[tri.col];
      const y = b[tri.col];
      return (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y))) * sens;
    });
  }, [tous, origine, abond, q, tri]);

  const th = (col: Colonne, mot: string, droite?: boolean) => (
    <th
      className={droite ? "r" : undefined}
      aria-sort={tri.col === col ? (tri.rev ? "descending" : "ascending") : "none"}
      onClick={() => setTri((v) => (v.col === col ? { col, rev: !v.rev } : { col, rev: false }))}
    >
      {t(mot)} <i aria-hidden="true">{tri.col === col ? (tri.rev ? "▼" : "▲") : "↕"}</i>
    </th>
  );

  return (
    <div>
      <div className={styles.filtres}>
        <div className={styles.grp}>
          <label htmlFor="pc-origine">{t("Origine du chiffre")}</label>
          <select id="pc-origine" value={origine} onChange={(e) => setOrigine(e.target.value)}>
            <option value="toutes">{t("Toutes")}</option>
            {origines.map((o) => (
              <option key={o} value={o}>
                {t(o)}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.grp}>
          <label htmlFor="pc-abond">{t("Abondements")}</label>
          <select id="pc-abond" value={abond} onChange={(e) => setAbond(e.target.value as Abondements)}>
            <option value="inclus">{t("Inclus")}</option>
            <option value="seuls">{t("Seuls")}</option>
            <option value="exclus">{t("Exclus")}</option>
          </select>
        </div>
        <div className={styles.grp}>
          <label htmlFor="pc-q">{t("Chercher")}</label>
          <input id="pc-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Trésor, code, durée…")} autoComplete="off" />
        </div>
      </div>

      <div className={styles.corps}>
        <table className={styles.table}>
          <thead>
            <tr>
              {th("pays", "Trésor")}
              {th("annees", "Horizon")}
              <th>{t("Étiquette")}</th>
              {th("pct", "Rendement", true)}
              {th("origine", "Origine")}
              {th("on", "Séance")}
              <th>{t("Code")}</th>
            </tr>
          </thead>
          <tbody>
            {vues.map((p) => (
              <tr key={p.id}>
                <td>
                  <span className={styles.dot} style={{ background: COUNTRY_COLOR[p.pays] }} aria-hidden="true" /> {p.pays}
                </td>
                <td>{p.mot}</td>
                <td>
                  {p.etiquette}
                  {p.abondement && <span className={styles.chip}>{t("abondement")}</span>}
                </td>
                <td className="r">
                  <b>{p.pct.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %</b>
                </td>
                {/* Les hypothèses vivent dans l'infobulle : la colonne dit d'où vient
                    le chiffre, le survol dit ce qu'il a fallu supposer. */}
                <td title={p.hypotheses.join(" · ")}>
                  {t(p.origine)}
                  {p.hypotheses.length > 0 && <i className={styles.sup} aria-hidden="true"> ⃰</i>}
                </td>
                <td>{p.on}</td>
                <td>{p.code ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {vues.length === 0 && <p className={styles.vide}>{t("Aucun point ne répond à cette recherche.")}</p>}
      </div>
    </div>
  );
}
