import Link from "next/link";
import { DeskNav } from "@/components/DeskNav";
import { repo } from "@/lib/data";
import type { GeneratedDocument } from "@/lib/domain/types";
import { fmt, fmtDate, fmtDateTime, fmtPct, money } from "@/lib/format";
import { indexNoteFor, indexNoteMonths } from "@/lib/documents/generate";
import { getT } from "@/i18n/server";
import { requireDesk } from "@/lib/auth";
import { publishNoteAction } from "./actions";
import { Publish } from "./Publish";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Note sur l'indice" };

const signed = (v?: number, d = 2) => (v == null ? "—" : `${v > 0 ? "+" : ""}${fmtPct(v, d)}`);
const pts = (v: number) => `${v > 0 ? "+" : ""}${fmtPct(v, 2).replace(" %", " pt")}`;

/**
 * The monthly index note, as the desk sees it before it goes out: the figures
 * of the month, the sentences the note leads with, the sessions left to clear,
 * a PDF preview, and the button that publishes the month.
 */
export default async function NoteIndicePage({ searchParams }: { searchParams: Promise<{ mois?: string; ok?: string }> }) {
  await requireDesk("/desk/indice");
  const [t, sp, months] = await Promise.all([getT(), searchParams, indexNoteMonths()]);
  const month = sp.mois && months.some((m) => m.key === sp.mois) ? sp.mois : months[0]?.key;
  const [note, docs] = await Promise.all([indexNoteFor(month), repo().listDocuments().catch(() => [] as GeneratedDocument[])]);
  const published = docs.filter((d) => d.type === "note_indice").sort((a, b) => b.number.localeCompare(a.number));
  const already = note ? published.find((d) => d.number === note.number) : undefined;

  return (
    <>
      <DeskNav current="/desk/indice" />
      <div className={styles.head}>
        <div>
          <div className="eyebrow">{t("Marché · Indice")}</div>
          <h1 className="display">{t("Note mensuelle sur l'indice")}</h1>
          <p className="muted">{t("Écrite seule à partir des bulletins lus, relue et publiée par le desk. Le robot la prépare au début du mois suivant ; rien ne part à un client sans qu'une personne l'ait lue.")}</p>
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
            <div className={styles.tableWrap}>
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
              <div className={styles.tableWrap}>
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
