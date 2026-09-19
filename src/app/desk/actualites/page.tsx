import Link from "next/link";
import { DeskNav } from "@/components/DeskNav";
import { getT } from "@/i18n/server";
import { fmtDateTime } from "@/lib/format";
import { loadNews } from "@/lib/news";
import { linkCandidates } from "@/lib/news/links";
import { isVisible, RUBRIC_LABEL, type NewsItem } from "@/lib/news/model";
import { watchedFeeds } from "@/lib/news/watch";
import { newsStateAction } from "./actions";
import { NewsForm } from "./Forms";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Actualités · Desk" };

type Filter = "" | "publiee" | "brouillon" | "expiree" | "ecartee";
const FILTERS: [Filter, string][] = [
  ["", "Toutes"],
  ["publiee", "Publiées"],
  ["brouillon", "Brouillons"],
  ["expiree", "Expirées"],
  ["ecartee", "Écartées"],
];

function StateButton({ id, what, label, ghost }: { id: string; what: string; label: string; ghost?: boolean }) {
  return (
    <form action={newsStateAction} style={{ display: "inline" }}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="what" value={what} />
      <button className={`btn sm ${ghost ? "ghost" : ""}`} type="submit">
        {label}
      </button>
    </form>
  );
}

export default async function DeskNewsPage({ searchParams }: { searchParams: Promise<{ cle?: string; etat?: string }> }) {
  const t = await getT();
  const sp = await searchParams;
  const now = new Date();
  const [all, cands] = await Promise.all([loadNews(), linkCandidates()]);
  const editing = sp.cle ? all.find((n) => n.id === sp.cle) : undefined;
  const filter = (FILTERS.find(([f]) => f === sp.etat)?.[0] ?? "") as Filter;
  const received = all.filter((n) => n.status === "recu");
  const featured = all.find((n) => n.featured && n.status === "publiee");
  const rows = all.filter((n) => n.status !== "recu").filter((n) => {
    if (filter === "") return true;
    if (filter === "expiree") return n.status === "publiee" && !isVisible(n, now);
    if (filter === "publiee") return n.status === "publiee" && isVisible(n, now);
    return n.status === filter;
  });
  const counts: Record<string, number> = {
    "": all.filter((n) => n.status !== "recu").length,
    publiee: all.filter((n) => n.status === "publiee" && isVisible(n, now)).length,
    brouillon: all.filter((n) => n.status === "brouillon").length,
    expiree: all.filter((n) => n.status === "publiee" && !isVisible(n, now)).length,
    ecartee: all.filter((n) => n.status === "ecartee").length,
  };
  const stateOf = (n: NewsItem): { cls: string; label: string } => {
    if (n.status === "publiee" && !isVisible(n, now)) return { cls: styles.off, label: `${t("Expirée")} · ${n.visibleUntil ?? ""}` };
    if (n.status === "publiee" && n.featured) return { cls: styles.une, label: t("À la une") };
    if (n.status === "publiee") return { cls: styles.pub, label: t("Publiée") };
    if (n.status === "brouillon") return { cls: styles.draft, label: t("Brouillon") };
    return { cls: styles.off, label: t("Écartée") };
  };
  const candidates = cands.map((c) => ({ label: c.label, hint: c.kind === "offer" ? t("ligne") : c.kind === "company" ? t("société") : c.kind === "issuer" ? t("émetteur") : t("terme") }));

  return (
    <>
      <DeskNav current="/desk/actualites" badges={{ "/desk/actualites": received.length }} />
      <div className={styles.head}>
        <div>
          <h1>{t("Actualités")}</h1>
          <p className="muted">{t("Des liens vers ce que d'autres publient, Trésors, BVMAC, COSUMAF, presse, sociétés cotées, sociétés de gestion, avec deux lignes du desk sur ce que cela change pour les lignes du Guichet. Jamais l'article lui-même : le lecteur est renvoyé à l'original.")}</p>
        </div>
        <small className="muted">
          {t("Veille")} : {watchedFeeds().length} {t("flux")} · {t("liens vérifiés chaque nuit")}
        </small>
      </div>

      <div className={styles.grid}>
        <div className="panel" data-coach="news-form">
          <NewsForm key={editing?.id ?? "new"} item={editing} candidates={candidates} featuredTitle={featured?.title} />
          {editing && (
            <div style={{ padding: "0 16px 14px" }}>
              <Link href="/desk/actualites" className="btn sm ghost">
                {t("Nouvelle publication")}
              </Link>
            </div>
          )}
        </div>

        <div>
          <div className="panel" data-coach="news-inbox">
            <div className="panel-h">
              <div>
                <h2>{t("Liens reçus · à trier")}</h2>
                <small className="muted">{t("Envoyés au robot WhatsApp du desk, par e-mail, ou repérés par la veille des sources suivies.")}</small>
              </div>
              <span className="right muted">{received.length ? `${received.length} ${t("en attente")}` : t("rien à trier")}</span>
            </div>
            {received.map((n) => (
              <div key={n.id} className={styles.inbox}>
                <small>
                  {t(n.receivedFrom ?? "Reçu")}
                  <br />
                  {fmtDateTime(n.createdAt)}
                </small>
                <span>
                  <b>{n.domain}</b> : {n.title}
                  {n.note && <span className={styles.note}> « {n.note.slice(0, 120)} »</span>}
                </span>
                <small>{t(n.format ?? "page")}</small>
                <span className={styles.btns}>
                  <Link className="btn sm" href={`/desk/actualites?cle=${n.id}`}>
                    {t("Préparer")}
                  </Link>
                  <StateButton id={n.id} what="ecarter" label={t("Écarter")} ghost />
                </span>
              </div>
            ))}
          </div>

          <div className="panel" data-coach="news-list">
            <div className="panel-h">
              <h2>{t("Publications")}</h2>
              <nav className={`${styles.filters} right`} aria-label={t("État")}>
                {FILTERS.map(([f, label]) => (
                  <Link key={f} href={f ? `/desk/actualites?etat=${f}` : "/desk/actualites"} aria-current={f === filter ? "page" : undefined}>
                    {t(label)} · {counts[f]}
                  </Link>
                ))}
              </nav>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table className={`tbl ${styles.table}`}>
                <thead>
                  <tr>
                    <th>{t("Date")}</th>
                    <th>{t("Source")}</th>
                    <th>{t("Titre")}</th>
                    <th>{t("Rubrique")}</th>
                    <th>{t("Liens")}</th>
                    <th>{t("État")}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="muted">
                        {t("Aucune publication dans cet état.")}
                      </td>
                    </tr>
                  )}
                  {rows.map((n) => {
                    const s = stateOf(n);
                    return (
                      <tr key={n.id}>
                        <td className="num" style={{ whiteSpace: "nowrap" }}>
                          {fmtDateTime(n.publishedAt)}
                        </td>
                        <td>{n.source}</td>
                        <td>
                          <Link href={`/desk/actualites?cle=${n.id}`}>{n.title}</Link>
                          {n.linkOk === false && (
                            <>
                              {" "}
                              <span className={styles.dead}>{t("lien mort")}</span>
                            </>
                          )}
                          <br />
                          <small className="muted">
                            {n.domain} · v{n.version} · {n.updatedBy}
                          </small>
                        </td>
                        <td>{t(RUBRIC_LABEL[n.rubric])}</td>
                        <td className="muted">{n.links.map((l) => l.label).join(" · ") || "—"}</td>
                        <td>
                          <span className={`${styles.status} ${s.cls}`}>{s.label}</span>
                          <span className={styles.rowBtns}>
                            {n.status === "publiee" && <StateButton id={n.id} what="retirer" label={t("Retirer")} ghost />}
                            {(n.status === "brouillon" || n.status === "ecartee") && n.why && <StateButton id={n.id} what="republier" label={t("Publier")} ghost />}
                            <StateButton id={n.id} what="supprimer" label={t("Supprimer")} ghost />
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <p className={styles.tiny}>{t("Une publication n'est jamais modifiée sans trace : chaque changement de titre, de lecture ou de lien crée une version dans le journal, comme pour une offre. Un lien mort est détecté par la vérification de nuit et signalé sur Santé.")}</p>
        </div>
      </div>
    </>
  );
}

