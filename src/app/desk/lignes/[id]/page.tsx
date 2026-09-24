import Link from "next/link";
import { notFound } from "next/navigation";
import { DeskNav } from "@/components/DeskNav";
import { LineIdentity } from "@/components/LineIdentity";
import { diffRecords, FIELD_FR } from "@/lib/audit";
import { requireDesk } from "@/lib/auth";
import { repo } from "@/lib/data";
import { summarize } from "@/lib/domain/summary";
import { fmtDateTime } from "@/lib/format";
import { FicheReading, loadFiche } from "@/app/offres/[id]/FicheReading";
import { FichePanes } from "@/components/mobile/FichePanes";
import { LifecycleForm } from "./LifecycleForm";
import { DocumentsForm } from "./DocumentsForm";
import { RestoreForm } from "./RestoreForm";
import styles from "./page.module.css";
import { getT } from "@/i18n/server";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const o = await repo().getOffer((await params).id);
  return { title: o ? `${o.title} : historique` : "Historique" };
}

const short = (v: unknown): string => (v == null ? "—" : typeof v === "object" ? JSON.stringify(v).slice(0, 80) : String(v));

/** Every published version of a line, what changed between them, who touched it and why; rollback by restoring a snapshot. */
export default async function LigneHistoriquePage({ params }: Props) {
  const t = await getT();
  await requireDesk("/desk");
  const { id } = await params;
  const r = repo();
  const o = await r.getOffer(id);
  if (!o) notFound();
  const [versions, trail, fiche] = await Promise.all([r.listOfferVersions(id), r.listAudit({ entity: "offer", entityId: id, limit: 100 }), loadFiche(o)]);
  const s = summarize(o, new Date());

  return (
    <>
      <DeskNav current="/desk" />
      <div className={styles.head}>
        <div>
          <div className="eyebrow">{t(`Historique et contrôle · v${o.version}`)}</div>
          <LineIdentity o={o} s={s} size="lg" as="h1" />
        </div>
        <div className={styles.headBtns}>
          {/* Le seul lien qui sorte encore du desk, et il est voulu : voir la
              page telle que le client la voit, avec son formulaire. Tout le
              reste se lit ici. */}
          <Link className="btn sm" href={`/offres/${o.id}`} target="_blank" rel="noreferrer">
            {t("Fiche client")} ↗
          </Link>
          <Link className="btn sm" href="/desk/journal">
            {t("Journal complet")}
          </Link>
        </div>
      </div>

      {/* Ce que le client lit de cette ligne, rendu par le même composant que
          sa fiche : deux pages qui liraient les mêmes chiffres chacune à sa
          façon finiraient par ne plus dire la même chose. Lecture seule : le
          desk enregistre un ordre par ses propres écrans, pas d'ici. */}
      <div className={`panel ${styles.read}`}>
        <div className="panel-h">
          <h2>{t("La ligne, telle que le client la lit")}</h2>
          <span className="muted" style={{ fontSize: ".8rem" }}>
            {t("mêmes chiffres, même instant, sans le formulaire d'intention")}
          </span>
        </div>
        <div className={styles.readBody}>
          <FichePanes>
            <FicheReading o={o} data={fiche} mode="desk" />
          </FichePanes>
        </div>
      </div>

      <div className={`panel ${styles.life}`}>
        <div className="panel-h">
          <h2>{t("Cycle de vie")}</h2>
          <span className="muted">{t("brouillon → en revue → publié → clôturé / résultats → en vie → échu · retiré à tout moment, jamais supprimé")}</span>
        </div>
        <div className={styles.lifeBody}>
          <span className={`pill ${o.status === "withdrawn" ? "annulee" : "confirmee"}`}>{o.status === "withdrawn" ? "Retirée du Guichet" : `Statut : ${o.status}`}</span>
          <LifecycleForm offerId={o.id} current={o.version} withdrawn={o.status === "withdrawn"} />
        </div>
      </div>

      <div className="panel">
        <div className="panel-h">
          <h2>{t("Documents de la ligne")} ({o.documents.length})</h2>
          <span className="muted">{t("ce que la fiche client propose en téléchargement : un fichier réel derrière chaque titre")}</span>
        </div>
        <DocumentsForm offerId={o.id} current={o.version} documents={o.documents} />
      </div>

      <div className={styles.cols}>
        <div className="panel">
          <div className="panel-h">
            <h2>{t("Versions")} ({versions.length})</h2>
            <span className="muted">{t("Chaque publication garde la fiche complète ; restaurer crée une nouvelle version, jamais un effacement.")}</span>
          </div>
          {versions.length === 0 && <div className="empty">{t("Aucune version enregistrée (ligne antérieure à l'historique ou reprise du bulletin).")}</div>}
          {versions.map((v, i) => {
            const prev = versions[i + 1];
            const diffs = prev?.snapshot && v.snapshot ? diffRecords(prev.snapshot, v.snapshot) : [];
            return (
              <div key={v.version} className={`${styles.version} ${v.version === o.version ? styles.current : ""}`}>
                <div className={styles.vHead}>
                  <b>v{v.version}</b>
                  <span>{fmtDateTime(v.publishedAt)}</span>
                  {v.publishedBy && <span>{t(`par ${v.publishedBy}`)}</span>}
                  {v.note && <span className={styles.note}>{v.note}</span>}
                  {v.version === o.version && <span className={styles.tag}>{t("en ligne")}</span>}
                </div>
                {diffs.length > 0 && (
                  <table className={styles.diff}>
                    <tbody>
                      {diffs.slice(0, 10).map((d) => (
                        <tr key={d.key}>
                          <td>{FIELD_FR[d.key] ?? d.key}</td>
                          <td className={styles.before}>{short(d.before)}</td>
                          <td className={styles.after}>{short(d.after)}</td>
                        </tr>
                      ))}
                      {diffs.length > 10 && (
                        <tr>
                          <td colSpan={3} className="muted">
                            … et {diffs.length - 10} autre(s) champ(s)
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
                {!prev && v.snapshot && <small className="muted">{t("Première version enregistrée.")}</small>}
                {v.version !== o.version && v.snapshot && <RestoreForm offerId={o.id} version={v.version} current={o.version} />}
              </div>
            );
          })}
        </div>

        <div className="panel">
          <div className="panel-h">
            <h2>{t("Piste d'audit")} ({trail.length})</h2>
            <span className="muted">{t("Qui, quoi, quand, d'où : chaîné, jamais modifié.")}</span>
          </div>
          {trail.length === 0 && <div className="empty">{t("Aucune action tracée sur cette ligne.")}</div>}
          <ul className={styles.trail}>
            {trail.map((a) => (
              <li key={a.id}>
                <span className="mono">{fmtDateTime(a.at)}</span>
                <b>{a.action}</b>
                <span>{a.actor}</span>
                {a.reason && <small>{a.reason}</small>}
                {a.ip && <small className="mono">{a.ip}</small>}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
