import { getT } from "@/i18n/server";
import { fmtDate } from "@/lib/format";
import type { AuctionResult } from "@/lib/market/auction-results";
import { CHAMPS, LIBELLE_CHAMP, champsEnEcart, ecartsOuverts, egal, etatSource, origineDuChamp, sourcesDe, type Champ } from "@/lib/market/sources-seance";
import { exclureSourceAction, trancherEcartAction } from "./oja-actions";
import styles from "./SourcesSeance.module.css";

/**
 * D'OÙ VIENT CHAQUE CHIFFRE DE LA SÉANCE (6 novembre 2026, planche 4A).
 *
 * Les deux jeux de valeurs côte à côte (communiqué et export OJA), la source retenue par champ, les écarts à trancher, et de quoi EXCLURE une source, même déjà chargée : le
 * desk le demande pour sortir une source des rapports sans rien effacer. Une séance garde toujours au moins une source.
 */

const fmt = (c: Champ, v?: number): string => {
  if (v == null) return "—";
  if (c === "announced" || c === "bid" || c === "served") return `${(v / 1e6).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M`;
  if (c === "bidders") return String(v);
  return `${v.toLocaleString("fr-FR", { maximumFractionDigits: 4 })} %`;
};

export async function SourcesDeLaSeance({ r }: { r: AuctionResult }) {
  const t = await getT();
  const s = sourcesDe(r);
  const e = etatSource(r);
  const lignes = CHAMPS.filter((c) => s.pdf?.[c] != null || s.excel?.[c] != null);
  const ouverts = new Set(ecartsOuverts(s));
  const enEcart = new Set(champsEnEcart(s));
  const tranches = new Map((s.ecarts ?? []).map((x) => [x.champ, x]));
  const exclues = s.exclues ?? [];
  const peutExclure = (src: "pdf" | "excel") => Boolean(s[src]) && (exclues.includes(src) || (["pdf", "excel"] as const).filter((x) => s[x] && !exclues.includes(x)).length > 1);

  return (
    <section className={styles.bloc} aria-label={t("Sources des chiffres")}>
      <div className={styles.tete}>
        <h3>{t("Sources des chiffres")}</h3>
        <span className={`${styles.pastille} ${e.libelle === "Excel" ? styles.excel : e.libelle === "PDF" ? styles.pdf : styles.deux}`}>{e.libelle}{e.ecartsOuverts ? ` · ${e.ecartsOuverts}` : e.concordantes ? " ✓" : ""}</span>
      </div>

      {s.excel && (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t("Chiffre")}</th>
              <th>PDF</th>
              <th>Excel</th>
              <th>{t("Retenu")}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {lignes.map((c) => {
              const ecart = enEcart.has(c);
              const tr = tranches.get(c);
              return (
                <tr key={c} className={ouverts.has(c) ? styles.ouvert : undefined}>
                  <td>{t(LIBELLE_CHAMP[c])}</td>
                  <td className={exclues.includes("pdf") ? styles.barre : undefined}>{fmt(c, s.pdf?.[c])}</td>
                  <td className={exclues.includes("excel") ? styles.barre : undefined}>{fmt(c, s.excel?.[c])}</td>
                  <td>
                    <span className={styles.puce}>{origineDuChamp(r, c) ?? "—"}</span>
                    {tr && <small className={styles.motif} title={`${tr.motif} · ${tr.par} · ${fmtDate(tr.le)}`}>{t("tranché")}</small>}
                  </td>
                  <td>
                    {ecart && !exclues.length && (
                      <form action={trancherEcartAction} className={styles.choix}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="champ" value={c} />
                        <button type="submit" name="source" value="pdf" className="btn sm" disabled={tr?.retenu === "pdf"}>{t("Garder le PDF")}</button>
                        <button type="submit" name="source" value="excel" className="btn sm" disabled={tr?.retenu === "excel"}>{t("Garder l'Excel")}</button>
                      </form>
                    )}
                    {!ecart && s.pdf?.[c] != null && s.excel?.[c] != null && egal(c, s.pdf[c]!, s.excel[c]!) && <small className={styles.ok}>✓</small>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {s.carnet && (
        <p className={styles.aide}>
          {t("Carnet OJA : {n} offres", { n: s.carnet.nbOffres ?? 0 })}
          {s.carnet.rejeteAuPrix != null ? ` · ${t("rejeté au prix")} ${fmt("announced", s.carnet.rejeteAuPrix)}` : ""} · {s.fiabilite === "a_confirmer" ? t("avant le 1er février 2023 : état des offres ambigu, à confirmer sur la pièce") : t("règle exacte (séance depuis le 1er février 2023)")}
        </p>
      )}

      <div className={styles.exclure}>
        {(["pdf", "excel"] as const).filter((x) => s[x]).map((src) => (
          <form key={src} action={exclureSourceAction}>
            <input type="hidden" name="id" value={r.id} />
            <input type="hidden" name="source" value={src} />
            <input type="hidden" name="exclure" value={exclues.includes(src) ? "0" : "1"} />
            <button type="submit" className="btn sm" disabled={!peutExclure(src)}>
              {exclues.includes(src) ? t("Rétablir {s}", { s: src === "pdf" ? "le PDF" : "l'Excel" }) : t("Exclure {s}", { s: src === "pdf" ? "le PDF" : "l'Excel" })}
            </button>
          </form>
        ))}
        <span className={styles.aide}>{t("Une source exclue ne compte plus pour les valeurs retenues ni les rapports ; elle n'est pas effacée.")}</span>
      </div>
    </section>
  );
}
