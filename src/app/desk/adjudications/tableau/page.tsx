import Link from "next/link";
import { DeskNav } from "@/components/DeskNav";
import { TallTable } from "@/components/desk/TallTable";
import { requireDesk } from "@/lib/auth";
import { repo } from "@/lib/data";
import { getT } from "@/i18n/server";
import { fmt, fmtDate } from "@/lib/format";
import { applyFilter, distinct, sortRows, summarise, toRow, type SortKey, type TableFilter } from "@/lib/market/auction-table";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

const KEYS: SortKey[] = ["date", "pays", "instrument", "duree", "chiffre", "couverture", "soumis", "servi", "etat"];
const isKey = (v: string): v is SortKey => (KEYS as string[]).includes(v);
const pct = (v: number | null | undefined, d = 2) => (v == null ? "—" : `${v.toFixed(d).replace(".", ",")} %`);

/**
 * Toutes les séances, en une table.
 *
 * L'écran de relecture prend une séance à la fois, ce qui est juste pour lire un
 * communiqué et mauvais pour voir. Un taux recopié 70 % au lieu de 7,00 % ne se
 * remarque pas dans un formulaire ; trié par taux, il est le premier de la
 * colonne. La table est donc d'abord le contrôle de la relecture, et ensuite la
 * matière des analyses.
 *
 * Elle regarde la zone entière par défaut. Un Trésor ne se lit pas seul : le
 * Cameroun à 26 semaines veut dire quelque chose à côté du Tchad et du Congo à
 * la même date, et rien du tout isolé. Les filtres resserrent après coup.
 */
export default async function TableauPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireDesk("/desk/adjudications/tableau");
  const t = await getT();
  const sp = await searchParams;
  const r = repo();
  const all = await r.listAuctionResults({ limit: 1000 });

  const f: TableFilter = { pays: sp.pays, instrument: sp.instrument, duree: sp.duree, etat: sp.etat, du: sp.du, au: sp.au };
  const tri = sp.tri ?? "date";
  const rev = tri.endsWith("-");
  const key: SortKey = isKey(tri.replace(/-$/, "")) ? (tri.replace(/-$/, "") as SortKey) : "date";
  const rows = sortRows(applyFilter(all, f).map(toRow), key, rev);
  const s = summarise(rows);

  const href = (patch: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...sp, ...patch })) if (v && v !== "tout") q.set(k, v);
    return `/desk/adjudications/tableau?${q}`;
  };
  // Une fonction, pas un composant : un composant déclaré dans le rendu reperd
  // son état à chaque passage.
  const th = (k: SortKey, label: string, right?: boolean) => {
    const on = key === k;
    return (
      <th className={right ? styles.r : undefined} aria-sort={on ? (rev ? "ascending" : "descending") : "none"}>
        <Link href={href({ tri: on && !rev ? `${k}-` : k })} className={`${styles.sortTh} ${on ? styles.sortOn : ""}`} title={on ? t("Inverser l'ordre") : t("Trier par cette colonne")}>
          {t(label)}
          <i aria-hidden="true">{on ? (rev ? "▲" : "▼") : "↕"}</i>
        </Link>
      </th>
    );
  };
  const filtre = (name: string, label: string, options: (string | [string, string])[]) => (
    <label className={styles.filter}>
      <span>{t(label)}</span>
      <select name={name} defaultValue={sp[name] ?? "tout"}>
        <option value="tout">{t("tout")}</option>
        {options.map((o) => {
          const [v, l] = Array.isArray(o) ? o : [o, o];
          return (
            <option key={v} value={v}>
              {t(l)}
            </option>
          );
        })}
      </select>
    </label>
  );

  return (
    <>
      <DeskNav current="/desk/adjudications" badges={{ "/desk/adjudications": all.filter((x) => !x.confirmedBy).length }} />

      <div className={styles.page}>
        <header className={styles.head}>
          <div>
            <h1>{t("Adjudications de la zone")}</h1>
            <p className="muted">
              {t("Toute la CEMAC par défaut : un Trésor se lit contre les cinq autres. Les filtres resserrent ensuite.")}{" "}
              <Link href="/desk/adjudications">{t("Revenir à la relecture")} →</Link>
            </p>
          </div>
          <a className="btn sm ghost" href={`/desk/adjudications/export?${new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][])}`}>
            {t("Exporter en CSV")}
          </a>
        </header>

        {/* Ce que la tranche affichée vaut, avant qu'on en tire une conclusion. */}
        <div className={styles.band}>
          <div>
            <span>{t("Séances")}</span>
            <b>{fmt(s.total)}</b>
          </div>
          <div>
            <span>{t("Relues")}</span>
            <b className={s.relues === 0 ? styles.none : undefined}>{fmt(s.relues)}</b>
          </div>
          <div>
            <span>{t("Dont minces")}</span>
            <b>{fmt(s.minces)}</b>
          </div>
          <div>
            <span>{t("Trésors")}</span>
            <b>{fmt(s.pays)}</b>
          </div>
          <div>
            <span>{t("Période")}</span>
            <b>{s.du ? `${s.du} → ${s.au}` : "—"}</b>
          </div>
          <div>
            <span>{t("Taux moyen, relus")}</span>
            <b>{pct(s.moyenneTaux)}</b>
          </div>
          <div>
            <span>{t("Prix moyen, relus")}</span>
            <b>{pct(s.moyennePrix)}</b>
          </div>
        </div>
        {s.relues < 5 && s.total > 0 && (
          <p className={styles.warn}>
            {t("Trop peu de séances relues pour fonder une analyse : les moyennes ci-dessus ne portent que sur ce qui a déjà été lu.")}
          </p>
        )}

        <form className={styles.filters} method="get">
          {filtre("pays", "Trésor", distinct(all, (x) => x.country))}
          {filtre("instrument", "Instrument", distinct(all, (x) => x.instrument))}
          {filtre("duree", "Durée", distinct(all, (x) => x.tenor))}
          {filtre("etat", "État", [
            ["a-relire", "À relire"],
            ["relues", "Relues"],
          ])}
          <label className={styles.filter}>
            <span>{t("Du")}</span>
            <input type="date" name="du" defaultValue={sp.du ?? ""} />
          </label>
          <label className={styles.filter}>
            <span>{t("Au")}</span>
            <input type="date" name="au" defaultValue={sp.au ?? ""} />
          </label>
          <input type="hidden" name="tri" value={tri} />
          <button className="btn sm" type="submit">
            {t("Filtrer")}
          </button>
          <Link className="btn sm ghost" href="/desk/adjudications/tableau">
            {t("Tout")}
          </Link>
        </form>

        {rows.length === 0 ? (
          <div className="empty">{t("Aucune séance ne répond à ces filtres.")}</div>
        ) : (
          <TallTable total={rows.length}>
            <table className={styles.table}>
              <thead>
                <tr>
                  {th("date", "Séance")}
                  {th("pays", "Trésor")}
                  {th("instrument", "Instr.")}
                  {th("duree", "Durée")}
                  {th("chiffre", "Taux / prix", true)}
                  {th("couverture", "Couverture", true)}
                  {th("soumis", "Soumis.", true)}
                  {th("servi", "Servi", true)}
                  {th("etat", "État")}
                </tr>
              </thead>
              <tbody>
                {rows.map(({ r: x, chiffre, unite, couverture, mince }) => (
                  <tr key={x.id} className={x.confirmedBy ? undefined : styles.draft}>
                    <td>
                      <Link href={`/desk/adjudications?s=${x.id}`}>{fmtDate(x.sessionOn)}</Link>
                    </td>
                    <td>{x.country}</td>
                    <td>{x.instrument}</td>
                    <td>{x.tenor}</td>
                    <td className={`${styles.r} ${unite === "taux" ? styles.gold : ""}`}>
                      {chiffre == null ? "—" : pct(chiffre)}
                      {mince && chiffre != null ? <em title={t("Séance mince : peu de soumissions")}> ·</em> : null}
                    </td>
                    <td className={styles.r}>{pct(couverture, 0)}</td>
                    <td className={styles.r}>{x.bidders ?? "—"}</td>
                    <td className={styles.r}>{x.served == null ? "—" : `${fmt(Math.round(x.served / 1_000_000))} M`}</td>
                    <td>{x.confirmedBy ? <span className={styles.ok}>{t("relue")}</span> : <span className={styles.todo}>{t("à relire")}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TallTable>
        )}
      </div>
    </>
  );
}
