import Link from "next/link";
import { DeskNav } from "@/components/DeskNav";
import { TallTable } from "@/components/desk/TallTable";
import { repo } from "@/lib/data";
import { fmtDateTime } from "@/lib/format";
import { getT } from "@/i18n/server";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Bulletins de la BVMAC" };

/**
 * LE DÉPÔT DES BULLETINS : les huit cents séances, et le document de chacune.
 *
 * Le desk ne voyait que le dernier bulletin, sur la page Marché, avec son lien
 * vers le PDF. Pour en retrouver un autre il fallait aller sur le site de la
 * bourse et y chercher la séance à la main, alors que chaque séance porte en
 * base l'adresse exacte de son document depuis le premier jour.
 *
 * DEUX COLONNES POUR UN MÊME DOCUMENT, et elles ne disent pas la même chose.
 * « PDF » est notre copie, servie par nous, qui ne dépend de personne ; « lien »
 * est l'adresse chez la bourse, qui vit sa vie. Trente-quatre séances ont les
 * deux, les autres n'ont que le lien : le rattrapage de l'historique a gardé
 * les cours et jeté les documents. C'est un choix de place, et il se voit ici
 * plutôt que de se découvrir le jour où le site de la bourse se réorganise.
 */
const ANNEES_VISIBLES = 6;

export default async function BulletinsPage({ searchParams }: { searchParams: Promise<{ an?: string; etat?: string }> }) {
  const t = await getT();
  const { an, etat } = await searchParams;
  const tous = await repo().listBulletins(2000);

  const annees = [...new Set(tous.map((b) => b.sessionDate.slice(0, 4)))].sort().reverse().slice(0, ANNEES_VISIBLES);
  const etats = ["ok", "partiel", "echec"] as const;
  const anChoisi = an && annees.includes(an) ? an : undefined;
  const etatChoisi = etat && (etats as readonly string[]).includes(etat) ? etat : undefined;

  const liste = tous
    .filter((b) => (anChoisi ? b.sessionDate.startsWith(anChoisi) : true))
    .filter((b) => (etatChoisi ? b.status === etatChoisi : true))
    .sort((a, b) => b.sessionDate.localeCompare(a.sessionDate));

  const avecPdf = liste.filter((b) => b.fileKey).length;
  const lien = (params: { an?: string; etat?: string }) => {
    const q = new URLSearchParams();
    if (params.an) q.set("an", params.an);
    if (params.etat) q.set("etat", params.etat);
    return `/desk/bulletins${q.toString() ? `?${q}` : ""}`;
  };

  return (
    <>
      <DeskNav current="/desk/bulletins" />

      <div className={styles.head}>
        <div>
          <h1>{t("Bulletins de la BVMAC")}</h1>
          <p className="muted">
            {t("Le bulletin officiel de la cote, séance par séance, depuis la première lue. Chaque ligne mène à son document : notre copie quand nous l'avons gardée, et l'adresse d'origine dans tous les cas.")}
          </p>
        </div>
        <Link className="btn sm" href="/desk/sante#relire">
          {t("Séances à relire")} →
        </Link>
      </div>

      <section className="panel">
        <div className="panel-h">
          <h2>{t("{n} séances", { n: liste.length })}</h2>
          <span className="muted">
            {/* La copie archivée est rare, et il vaut mieux le lire que le
                deviner en parcourant la colonne. */}
            {t("{n} avec notre copie du PDF ; les autres n'ont que l'adresse d'origine.", { n: avecPdf })}
          </span>
        </div>

        <div className={styles.filtres}>
          <span className={styles.titreFiltre}>{t("Année")}</span>
          <Link href={lien({ etat: etatChoisi })} className={anChoisi ? undefined : styles.on}>
            {t("toutes")}
          </Link>
          {annees.map((a) => (
            <Link key={a} href={lien({ an: a, etat: etatChoisi })} className={anChoisi === a ? styles.on : undefined}>
              {a}
            </Link>
          ))}
        </div>
        <div className={styles.filtres}>
          <span className={styles.titreFiltre}>{t("État")}</span>
          <Link href={lien({ an: anChoisi })} className={etatChoisi ? undefined : styles.on}>
            {t("tous")}
          </Link>
          {etats.map((e) => (
            <Link key={e} href={lien({ an: anChoisi, etat: e })} className={etatChoisi === e ? styles.on : undefined}>
              {t(e)}
            </Link>
          ))}
        </div>

        <TallTable total={liste.length}>
          <table className="tbl">
            <thead>
              <tr>
                <th>{t("Séance")}</th>
                <th>N°</th>
                <th>{t("État")}</th>
                <th className="r">{t("Actions")}</th>
                <th className="r">{t("Oblig.")}</th>
                <th className="r">{t("OPCVM")}</th>
                <th>{t("Lu le")}</th>
                <th>{t("Document")}</th>
              </tr>
            </thead>
            <tbody>
              {liste.map((b) => (
                <tr key={b.id}>
                  <td className="mono">{b.sessionDate}</td>
                  <td className="mono">{b.number || "—"}</td>
                  <td>
                    <span className={`st ${b.status === "ok" ? "confirmee" : b.status === "partiel" ? "recue" : "annulee"}`}>{t(b.status)}</span>
                  </td>
                  <td className="r num">{b.counts?.equities ?? 0}</td>
                  <td className="r num">{b.counts?.bonds ?? 0}</td>
                  <td className="r num">{b.counts?.funds ?? 0}</td>
                  <td className="muted">
                    {fmtDateTime(b.ingestedAt)} · {b.ingestedBy}
                  </td>
                  {/* « PDF » est notre copie, « lien » celle de la bourse : le mot
                      court garde la colonne étroite sur huit cents lignes. */}
                  <td className={styles.doc}>
                    {b.fileKey ? (
                      <a href={`/desk/bulletins/pdf/${b.sessionDate}`} target="_blank" rel="noreferrer">
                        {t("PDF")}
                      </a>
                    ) : null}
                    {b.sourceUrl?.startsWith("http") ? (
                      <a href={b.sourceUrl} target="_blank" rel="noreferrer">
                        {t("lien")}
                      </a>
                    ) : null}
                    {!b.fileKey && !b.sourceUrl?.startsWith("http") ? <span className="muted">—</span> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TallTable>
      </section>
    </>
  );
}
