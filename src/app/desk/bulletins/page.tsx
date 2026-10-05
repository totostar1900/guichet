import Link from "next/link";
import { DeskNav } from "@/components/DeskNav";
import { Reread } from "@/components/desk/Reread";
import { TallTable } from "@/components/desk/TallTable";
import { repo } from "@/lib/data";
import { ARRIERE_PAR_TOUR, bulletinsToReread, REREAD_BATCH } from "@/lib/health";
import { lancerArriereAction, rereadAction } from "./actions";
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
  const [tous, arriere] = await Promise.all([repo().listBulletins(2000), bulletinsToReread()]);

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

      {/* LA RELECTURE EST ICI, et non sur la page Santé où elle a vécu faute
          d'une page des bulletins. Santé détecte, le domicile répare : son
          contrôle « Bulletins à relire » compte les séances et mène ici. */}
      {arriere.length > 0 && (
        <section className="panel" id="relire">
          <div className="panel-h">
            {/* LE TITRE NOMME SA SOURCE. « Bulletins » tout court laissait
                trois lectures possibles sur cette page : le bulletin de la cote,
                les avis d'emission de la BEAC, les rapports hebdomadaires. */}
            <h2>{t("Bulletins de la BVMAC à relire")}</h2>
            <span className="muted">
              {t("{n} séances du bulletin officiel de la cote (BOC) lues à moitié : le lecteur les a marquées au moment même, elles attendent une relecture.", { n: arriere.length })}
            </span>
          </div>
          <p className={styles.p}>
            {t("« Relire » reprend le PDF de la séance à l'adresse gardée avec elle et le repasse au lecteur d'aujourd'hui. Chaque cotation retrouvée écrase celle de la même ligne pour la même séance ; celles qu'il ne retrouve pas restent en place, donc une relecture ajoute ou corrige et ne retire jamais. Le geste se répète sans risque : une séance ne gagne des cours que le jour où le lecteur progresse. Une séance sans cours d'action fausse la lecture de l'indice, c'est elle qu'il faut reprendre en premier.")}
          </p>
          {/* POURQUOI SIX, ET NON TOUT. La question se pose devant le bouton, donc
              la reponse vit a cote de lui. Quatre secondes par bulletin, mesurees :
              une action de page doit repondre dans le delai de la fonction, et la
              serie entiere se compte en dizaines de minutes. */}
          <p className={styles.p}>
            {t("Une passe reprend {n} séances, les moins récemment reprises de la liste : la file tourne, et une séance qui ne s'améliore pas ne bloque plus les autres. {n} et non toutes, parce qu'un bulletin demande environ quatre secondes et qu'un bouton de page doit répondre avant le délai de la fonction.", { n: String(REREAD_BATCH) })}
          </p>
          {/* DEUX GESTES, ET ILS NE SE RESSEMBLENT PAS. Le premier travaille
              devant vous et dit ce qu'il a changé ; le second part et ne revient
              pas, c'est le compte en attente qui répondra. */}
          <p className={styles.p}>
            {t("« Confier au robot » ne fait pas le travail ici : il envoie la liste au robot de lecture, qui dispose de trois cents secondes par tour là où un bouton de page n'en a que quelques-unes. Il part avec {k} séances et rend la main aussitôt, sans rien afficher de plus. Revenez sur cette page dans quelques minutes : c'est le nombre de séances en attente, en tête de ce cadre, qui dira où il en est. Le tour s'inscrit au registre des robots comme un tour lancé à la main, donc il n'éteint aucune alarme.", { k: String(ARRIERE_PAR_TOUR) })}
          </p>
          {/* DEUX MOTS QUI NE SE DEVINENT PAS. Ils sortent du lecteur et
              designent deux pannes qui ne se reparent pas pareil : l'une laisse
              la seance a moitie en base, l'autre n'y laisse rien. */}
          <p className={styles.p}>
            {t("« partiel » : le bulletin a été lu, et le contrôle a relevé quelque chose. Une section plus courte que la veille, un cours hors de ses seuils, une ligne présente hier et absente aujourd'hui. Ce qui a été lu est en base, le reste manque.")}
            <br />
            {t("« échec » : l'en-tête du PDF n'a pas été reconnu, donc le numéro du bulletin non plus. Aucun cours de cette séance n'est entré : elle est entièrement à reprendre.")}
          </p>
          {/* CE QUE DEVIENT LA LIGNE. On regarde un tableau d'attente sans
              savoir ce qui fait sortir d'une file : la reponse tient en deux
              phrases, et sans elles on reclique sur la meme seance. */}
          <p className={styles.p}>
            {t("Après la passe, une séance qui repasse en « ok » quitte ce tableau : elle rejoint les bulletins ordinaires, ses cours alimentent l'indice et les fiches comme les autres. Une séance qui n'a rien gagné reste ici, et passe en queue de file : la liste tourne, et les suivantes sont servies avant qu'on ne revienne sur elle.")}
          </p>
          <div className={styles.actions}>
            <Reread action={rereadAction} label={t("Relire {n} séances", { n: String(REREAD_BATCH) })} primary />
            <Reread action={lancerArriereAction} label={t("Confier {k} séances au robot", { k: String(Math.min(ARRIERE_PAR_TOUR, arriere.length)) })} />
            <Link className="btn sm ghost" href="/desk/marche">
              {t("Marché")} →
            </Link>
          </div>
          <div className="scroll-x">
            <table className="tbl">
              <thead>
                <tr>
                  <th>{t("Séance")}</th>
                  <th>N°</th>
                  <th>{t("État")}</th>
                  <th className="r">{t("Actions")}</th>
                  <th>{t("Ce que le lecteur a dit")}</th>
                  <th>{t("Source")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {arriere.slice(0, 30).map((b) => (
                  <tr key={b.id}>
                    <td className="mono">{b.sessionDate}</td>
                    <td className="mono">{b.number}</td>
                    <td>
                      <span className={`st ${b.status === "partiel" ? "recue" : "annulee"}`}>{t(b.status)}</span>
                    </td>
                    <td className="r num">{b.counts?.equities ?? 0}</td>
                    <td className="muted">{(b.anomalies[0] ?? b.warnings[0] ?? "—").slice(0, 90)}</td>
                    {/* Le document que le lecteur a lu : sans lui, verifier une
                        anomalie voulait dire retrouver la seance a la main sur
                        le site de la bourse. */}
                    <td>
                      {b.sourceUrl?.startsWith("http") ? (
                        <a href={b.sourceUrl} target="_blank" rel="noreferrer">
                          {t("PDF")}
                        </a>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td className="r">
                      <Reread action={rereadAction} label={t("Relire")} date={b.sessionDate} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {arriere.length > 30 && (
            <p className="muted">{t("… et {n} autres, reprises {k} par {k}.", { n: arriere.length - 30, k: String(REREAD_BATCH) })}</p>
          )}
        </section>
      )}

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
