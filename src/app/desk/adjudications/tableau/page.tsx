import Link from "next/link";
import { DeskNav } from "@/components/DeskNav";
import { FiltreAuto } from "./FiltreAuto";
import { TallTable } from "@/components/desk/TallTable";
import { requireDesk } from "@/lib/auth";
import { repo } from "@/lib/data";
import { getT } from "@/i18n/server";
import { fmt, fmtDate } from "@/lib/format";
import { compteDansLesResultats, etatSeance } from "@/lib/market/auction-results";
import { applyFilter, distinct, estUnPoint, sortRows, summarise, toRow, type SortKey, type TableFilter } from "@/lib/market/auction-table";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
/* Sans titre, et sans h1 : sur téléphone la barre lit document.title, et
   cette page s'y annonçait par un tiret. */
export const metadata = { title: "Résultats des adjudications" };

const KEYS: SortKey[] = ["date", "pays", "instrument", "duree", "chiffre", "rendement", "couverture", "soumis", "servi", "etat"];
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
  // La commande seule : son titre est l'en-tête au-dessus d'elle.
  const filtre = (name: string, options: (string | [string, string])[], tout = "tout") => (
    <select name={name} defaultValue={sp[name] ?? "tout"} aria-label={t(name)}>
      <option value="tout">{t(tout)}</option>
      {options.map((o) => {
        const [v, l] = Array.isArray(o) ? o : [o, o];
        return (
          <option key={v} value={v}>
            {t(l)}
          </option>
        );
      })}
    </select>
  );

  return (
    <>
      <DeskNav current="/desk/adjudications/tableau" badges={{ "/desk/adjudications": all.filter((x) => compteDansLesResultats(x) && !x.confirmedBy).length }} />

      <div className={styles.page}>
        <header className={styles.head}>
          <div>
            <h1>{t("Résultats des adjudications de la zone")}</h1>
            <p className="muted">
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
          {/* LA PÉRIODE SUR DEUX LIGNES, début au-dessus, fin au-dessous.
              « 2019-08-21 → 2026-09-15 » sur une ligne est deux fois plus
              long que les six autres valeurs de la bande : il se repliait
              où il pouvait, la flèche restant seule en bout de ligne. Et les
              dates s'écrivent comme partout ailleurs, pas en ISO. */}
          <div>
            <span>{t("Période")}</span>
            {s.du ? (
              <b className={styles.periode}>
                <span>{fmtDate(s.du)}</span>
                <span>{fmtDate(s.au!)}</span>
              </b>
            ) : (
              <b>—</b>
            )}
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

        {/* LA TABLE RESTE MÊME VIDE, PARCE QU'ELLE PORTE SES PROPRES
            COMMANDES. Zéro ligne remplaçait tout le bloc par un « aucune
            séance » : les quatre filtres partaient avec, et le seul moyen de
            défaire celui qui venait de tout exclure était de retaper
            l'adresse. Une commande ne détruit pas la commande qui l'annule. */}
        <TallTable total={rows.length}>
            <form method="get" id="filtrage" className={styles.filtrage}>
              <FiltreAuto formId="filtrage" />
              <input type="hidden" name="tri" value={tri} />
              <table className={styles.table}>
                <thead>
                  <tr>
                  {th("date", "Séance")}
                  {th("pays", "Trésor")}
                  {th("instrument", "Instr.")}
                  {th("duree", "Durée")}
                  {/* QUATRE LECTURES, ET PLUS UNE COLONNE A DEUX UNITES.
                      Mesure du 14 octobre 2026 : aucun des 168 bons ne publie
                      de prix, aucune des 76 obligations ne publie de taux. Les
                      deux familles etaient donc fondues dans une colonne
                      « Taux / prix » que l on pouvait trier, ce qui rangeait un
                      escompte de 6,75 a cote d un prix de 90,00. */}
                  {th("chiffre", "Prix", true)}
                  <th className={styles.r}>{t("Coupon / taux")}</th>
                  {/* Le rendement est la seule colonne qui compare les deux
                      instruments : ni le prix ni le taux ne le font, un bon a
                      92,92 sur 52 semaines et un autre a 96,59 sur 26 ne se
                      classant pas par leur prix. */}
                  {th("rendement", "Rendement", true)}
                  {/* La fourchette publiee, dans son unite d origine. */}
                  <th className={styles.r}>{t("Min / max")}</th>
                  {th("couverture", "Couverture", true)}
                  {th("soumis", "Soumis.", true)}
                  {th("servi", "Servi", true)}
                  {th("etat", "État")}
                  </tr>
                  {/* Chaque commande sous la colonne qu'elle resserre.
                      SANS BOUTON « FILTRER » : chaque commande part en
                      changeant, le bouton ne faisait que répéter un geste
                      déjà fait, et sa cellule à cheval sur six colonnes
                      laissait une bande vide de 521 px au milieu de la
                      rangée. Il reste dans un <noscript>, pour le cas où le
                      script n'a pas tourné. */}
                  <tr className={styles.filters}>
                    <th>
                      <div className={styles.bornes}>
                        <input type="date" name="du" defaultValue={sp.du ?? ""} aria-label={t("Du")} />
                        <input type="date" name="au" defaultValue={sp.au ?? ""} aria-label={t("Au")} />
                      </div>
                    </th>
                    <th>{filtre("pays", distinct(all, (x) => x.country), "tous")}</th>
                    <th>{filtre("instrument", distinct(all, (x) => x.instrument), "tous")}</th>
                    <th>{filtre("duree", distinct(all, (x) => x.tenor), "toutes")}</th>
                    <th colSpan={6}>
                      <noscript>
                        <button className="btn sm" type="submit">
                          {t("Filtrer")}
                        </button>
                      </noscript>
                    </th>
                    <th>
                      {filtre("etat", [
                        ["a-lire", "À lire"],
                        ["a-relire", "À relire"],
                        ["relues", "Relues"],
                      ], "tous")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={11} className={styles.rienDuTout}>
                      {t("Aucune séance ne répond à ces filtres.")}{" "}
                      <Link href="/desk/adjudications/tableau">{t("Tout afficher")}</Link>
                    </td>
                  </tr>
                )}
                {rows.map(({ r: x, prix, taux, plage, couverture, mince, rendement }) => (
                  <tr key={x.id} className={x.confirmedBy ? undefined : styles.draft}>
                    <td>
                      <Link href={`/desk/adjudications?s=${x.id}`}>{fmtDate(x.sessionOn)}</Link>
                    </td>
                    <td>{x.country}</td>
                    <td>{x.instrument}</td>
                    <td>{x.tenor}</td>
                    {/* LE PRIX, MEME UNITE POUR LES DEUX INSTRUMENTS. Celui du
                        bon est calcule depuis son escompte, et il le dit :
                        un chiffre calcule qui ne se dit pas calcule finit par
                        etre cite comme une publication. */}
                    <td className={styles.r}>
                      {prix ? (
                        <span
                          className={prix.calcule ? styles.plage : undefined}
                          title={
                            prix.calcule
                              ? t("Prix calculé depuis l'escompte servi, en exact/360. Le Trésor ne publie jamais le prix d'un bon.")
                              : t("Prix publié par le Trésor.")
                          }
                        >
                          {estUnPoint(prix) ? pct(prix.lo) : `${pct(prix.lo)} – ${pct(prix.hi)}`}
                        </span>
                      ) : (
                        "—"
                      )}
                      {mince && prix ? <em title={t("Séance mince : peu de soumissions")}> ·</em> : null}
                    </td>
                    {/* UNE SEULE COLONNE POUR DEUX POURCENTAGES ANNUELS.
                        L escompte d un bon et le coupon d une obligation sont
                        de meme unite et rigoureusement disjoints : 168 bons
                        portent un taux et aucun coupon, 74 obligations
                        l inverse. Les separer laissait 244 cases « sans
                        objet » pour aucune information.

                        LE DORE DIT LEQUEL DES DEUX, parce qu ils ne sont pas
                        le meme objet economique : l escompte d un bon EST
                        a peu pres son rendement, le coupon d une obligation
                        ne l est pas, une obligation a 90 rendant dix pour
                        cent avec un coupon de six. La comparaison honnete
                        reste donc dans la colonne Rendement. */}
                    <td className={`${styles.r} ${taux ? styles.gold : ""}`} title={taux ? t("Taux d'escompte servi : un bon s'adjuge à un taux.") : x.couponRate != null ? t("Coupon facial : une obligation s'adjuge à un prix et porte un coupon.") : undefined}>
                      {taux ? (estUnPoint(taux) ? pct(taux.lo) : `${pct(taux.lo)} – ${pct(taux.hi)}`) : x.couponRate != null ? pct(x.couponRate) : "—"}
                    </td>
                    <td className={styles.r} title={rendement ? t("Origine : {o}. Calculé sur {v} an(s) restants, d'après {d}.", { o: rendement.origine, v: rendement.vie ? rendement.vie.toFixed(2) : "?", d: rendement.vieDe ?? "?" }) : undefined}>
                      {rendement ? pct(rendement.pct) : "—"}
                    </td>
                    <td className={`${styles.r} ${styles.plage}`}>{plage ? `${pct(plage.lo)} – ${pct(plage.hi)}` : "—"}</td>
                    <td className={styles.r}>{pct(couverture, 0)}</td>
                    <td className={styles.r}>{x.bidders ?? "—"}</td>
                    <td className={styles.r}>{x.served == null ? "—" : `${fmt(Math.round(x.served / 1_000_000))} M`}</td>
                    <td>
                      {(() => {
                        const e = etatSeance(x);
                        return e === "relue" ? <span className={styles.ok}>{t("relue")}</span> : e === "a_relire" ? <span className={styles.todo}>{t("à relire")}</span> : <span className={styles.vide}>{t("à lire")}</span>;
                      })()}
                    </td>
                  </tr>
                ))}
                </tbody>
              </table>
            </form>
        </TallTable>
      </div>
    </>
  );
}
