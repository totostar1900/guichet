import Link from "next/link";
import { DeskNav } from "@/components/DeskNav";
import { repo } from "@/lib/data";
import type { GeneratedDocument } from "@/lib/domain/types";
import { fmt, fmtDate, fmtDateTime, fmtPct, money } from "@/lib/format";
import { indexNoteFor, indexNoteMonths, indexQuarterFor, indexQuarters } from "@/lib/documents/generate";
import { getT } from "@/i18n/server";
import { requireDesk } from "@/lib/auth";
import { publishNoteAction, publishQuarterAction } from "./actions";
import { Publish } from "./Publish";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Notes sur l'indice" };

const signed = (v?: number, d = 2) => (v == null ? "—" : `${v > 0 ? "+" : ""}${fmtPct(v, d)}`);
const pts = (v: number) => `${v > 0 ? "+" : ""}${fmtPct(v, 2).replace(" %", " pt")}`;

/**
 * The monthly index note, as the desk sees it before it goes out: the figures
 * of the month, the sentences the note leads with, the sessions left to clear,
 * a PDF preview, and the button that publishes the month.
 */
export default async function NoteIndicePage({ searchParams }: { searchParams: Promise<{ mois?: string; trimestre?: string; ok?: string }> }) {
  await requireDesk("/desk/indice");
  const [t, sp, months, qs] = await Promise.all([getT(), searchParams, indexNoteMonths(), indexQuarters()]);
  const month = sp.mois && months.some((m) => m.key === sp.mois) ? sp.mois : months[0]?.key;
  const qKey = sp.trimestre && qs.some((q) => q.key === sp.trimestre) ? sp.trimestre : qs[0]?.key;
  const [note, quarter, docs] = await Promise.all([
    indexNoteFor(month),
    qKey ? indexQuarterFor(qKey) : Promise.resolve(undefined),
    repo().listDocuments().catch(() => [] as GeneratedDocument[]),
  ]);
  const published = docs.filter((d) => d.type === "note_indice").sort((a, b) => b.number.localeCompare(a.number));
  const already = note ? published.find((d) => d.number === note.number) : undefined;
  const qDoc = quarter ? published.find((d) => d.number === quarter.number) : undefined;

  return (
    <>
      <DeskNav current="/desk/indice" />
      <div className={styles.head}>
        <div>
          <div className="eyebrow">{t("Marché · Indice")}</div>
          <h1 className="display">{t("Les notes sur l'indice")}</h1>
          <p className="muted">{t("Deux notes écrites seules à partir des bulletins lus : la trimestrielle, publique, faite pour un client ; la mensuelle, gardée au desk, qui sert au contrôle. Le robot les prépare, une personne les relit et les publie.")}</p>
        </div>
        <div className={styles.headLinks}>
          <Link className="btn sm" href="/indice">
            {t("La page de l'indice")} →
          </Link>
          <Link className="btn sm ghost" href="/desk/documents?type=note_indice">
            {t("Les notes publiées")} →
          </Link>
        </div>
      </div>

      {sp.ok && <div className={styles.ok}>{t("Note publiée : elle est dans Documents, prête à être envoyée.")}</div>}

      {quarter && (
        <section className={`panel ${styles.pub}`}>
          <div className="panel-h">
            <h2>{t("Note trimestrielle, publique")}</h2>
            <span className="muted">{quarter.number} · {t(quarter.quarter.q === 1 ? "1er trimestre {y}" : "{n}e trimestre {y}", { n: quarter.quarter.q, y: quarter.quarter.year })}</span>
          </div>
          <div className={styles.months}>
            {qs.slice(0, 6).map((q) => (
              <Link key={q.key} href={`/desk/indice?trimestre=${q.key}`} className={`btn sm ${q.key === qKey ? "" : "ghost"}`}>
                {t(q.q === 1 ? "1er trimestre {y}" : "{n}e trimestre {y}", { n: q.q, y: q.year })}
                {published.some((d) => d.number === `PC-IDX-${q.key.replace("-", "")}`) ? " ✓" : ""}
              </Link>
            ))}
          </div>
          <p className={styles.lead2}>{quarter.headline.map((x) => t(x.key, x.vars)).join(" ")}</p>
          <div className={styles.publish}>
            <a className="btn sm primary" href={`/indice/note/${quarter.quarter.key.toLowerCase()}`} target="_blank" rel="noreferrer">
              {t("Lire la page publique")}
            </a>
            <a className="btn sm" href={`/indice/note/${quarter.quarter.key.toLowerCase()}/pdf`} target="_blank" rel="noreferrer">
              {t("Le PDF")}
            </a>
            {qDoc ? (
              <span className="muted">{t("publiée le {d} par {who}", { d: fmtDateTime(qDoc.createdAt), who: qDoc.createdBy ?? "—" })}</span>
            ) : (
              <Publish month={quarter.quarter.key} action={publishQuarterAction} label={t("Publier le {q}", { q: t(quarter.quarter.q === 1 ? "1er trimestre {y}" : "{n}e trimestre {y}", { n: quarter.quarter.q, y: quarter.quarter.year }) })} />
            )}
          </div>
          <p className={styles.p}>
            {t("La page et le PDF sont publics et se lisent sans compte. Publier fige le trimestre : le PDF part dans Documents avec son numéro, et la page porte sa date de publication.")}
            {quarter.methodOpen ? " " + t("Cette note dit en une ligne que la méthodologie de l'indice est en cours de confirmation auprès de la BVMAC.") : ""}
          </p>
        </section>
      )}

      <h2 className={styles.h2}>{t("Note mensuelle, pour le desk")}</h2>
      <div className={styles.months}>
        {months.slice(0, 14).map((m) => (
          <Link key={m.key} href={`/desk/indice?mois=${m.key}`} className={`btn sm ${m.key === month ? "" : "ghost"}`}>
            {m.label}
            {published.some((d) => d.number === `PC-IDX-${m.key.replace("-", "")}`) ? " ✓" : ""}
          </Link>
        ))}
      </div>

      {!note ? (
        <div className="empty">{t("Aucune séance lue sur ce mois : il n'y a pas de note à écrire.")}</div>
      ) : (
        <>
          <section className={styles.lead}>
            <p>{note.headline}</p>
            <p>{note.reading}</p>
            <p className={styles.caution}>{note.caution}</p>
          </section>

          <section className="panel">
            <div className="panel-h">
              <h2>{t("Le mois en chiffres")}</h2>
              <span className="muted">{t("du {a} au {b}", { a: fmtDate(note.month.from), b: fmtDate(note.month.to) })}</span>
            </div>
            <dl className={styles.figs}>
              <div>
                <dt>{t("Niveau")}</dt>
                <dd>{fmt(note.level)}</dd>
                <small>{t("fin du mois précédent")} : {fmt(note.levelBefore)}</small>
              </div>
              <div>
                <dt>{t("Le mois")}</dt>
                <dd className={note.ret > 0 ? styles.up : note.ret < 0 ? styles.down : ""}>{signed(note.ret)}</dd>
                <small>{t("depuis le 1er janvier")} {signed(note.ytd, 1)} · {t("douze mois")} {signed(note.year, 1)}</small>
              </div>
              <div>
                <dt>{t("Séances")}</dt>
                <dd>
                  {note.moved} / {note.sessions}
                </dd>
                <small>{note.up} {t("hausses")}, {note.down} {t("baisses")} · {note.missing} {t("jours sans bulletin")}</small>
              </div>
              <div>
                <dt>{t("Échangé")}</dt>
                <dd>{money(note.amount)}</dd>
                <small>FCFA · {note.trades} {t("transactions")} · {fmt(note.titles)} {t("titres")}</small>
              </div>
            </dl>
          </section>

          <section className="panel">
            <div className="panel-h">
              <h2>{t("Ce qui a fait le mouvement")}</h2>
              <span className="muted">{t("poids × variation du cours, en points d'indice")}</span>
            </div>
            <div className={`scroll-x ${styles.tableWrap}`}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>{t("Société")}</th>
                    <th className={styles.num}>{t("Poids")}</th>
                    <th className={styles.num}>{t("Cours du mois")}</th>
                    <th className={styles.num}>{t("Contribution")}</th>
                    <th className={styles.num}>{t("Échangé")}</th>
                    <th className={styles.num}>{t("Trans.")}</th>
                  </tr>
                </thead>
                <tbody>
                  {note.lines.map((l) => (
                    <tr key={l.mnemo}>
                      <td>
                        <Link href={`/societes/${l.mnemo.toLowerCase()}?depuis=indice`}>
                          <b>{l.mnemo}</b> · {l.name}
                        </Link>
                      </td>
                      <td className={styles.num}>{fmtPct(l.weight, 1)}</td>
                      <td className={`${styles.num} ${l.move > 0 ? styles.up : l.move < 0 ? styles.down : ""}`}>{signed(l.move, 1)}</td>
                      <td className={`${styles.num} ${l.points > 0 ? styles.up : l.points < 0 ? styles.down : ""}`}>{pts(l.points)}</td>
                      <td className={styles.num}>{l.amount ? money(l.amount) : "—"}</td>
                      <td className={styles.num}>{l.trades || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {note.unexplained.length > 0 && (
            <section className="panel">
              <div className="panel-h">
                <h2>{t("Séances à éclaircir")}</h2>
                <span className="muted">{t("la variation publiée ne se reconstitue pas avec les cours lus du même bulletin")}</span>
              </div>
              <div className={`scroll-x ${styles.tableWrap}`}>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>{t("Séance")}</th>
                      <th className={styles.num}>{t("Indice")}</th>
                      <th>{t("Cours modifiés dans nos lectures")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {note.unexplained.map((u) => (
                      <tr key={u.date}>
                        <td>{fmtDate(u.date)}</td>
                        <td className={`${styles.num} ${u.variationPct > 0 ? styles.up : styles.down}`}>{signed(u.variationPct)}</td>
                        <td>{u.movers}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className={styles.p}>{t("À relire avant publication : soit notre lecture du bulletin est incomplète, soit la méthode de l'indice diffère de celle que nous supposons. La note le dit telle quelle, sans conclure.")}</p>
            </section>
          )}

          <section className="panel">
            <div className="panel-h">
              <h2>{t("Publier")}</h2>
              <span className="muted">{note.number}</span>
            </div>
            <div className={styles.publish}>
              <a className="btn sm primary" href={`/desk/indice/pdf?mois=${note.month.key}`} target="_blank" rel="noreferrer">
                {t("Aperçu PDF")}
              </a>
              {already ? (
                <>
                  <a className="btn sm" href={`/desk/documents/pdf/${already.id}`} target="_blank" rel="noreferrer">
                    {t("La note publiée")}
                  </a>
                  <span className="muted">{t("publiée le {d} par {who}", { d: fmtDateTime(already.createdAt), who: already.createdBy ?? "—" })}</span>
                </>
              ) : (
                <Publish month={note.month.key} action={publishNoteAction} label={t("Publier la note de {m}", { m: note.month.label })} />
              )}
            </div>
            <p className={styles.p}>{t("La publication garde le PDF dans Documents, avec son numéro et la version de chaque passage. L'envoi aux clients se fait ensuite, comme pour les autres documents.")}</p>
          </section>
        </>
      )}
    </>
  );
}
