import Link from "next/link";
import { DeskNav } from "@/components/DeskNav";
import { getSession } from "@/lib/auth";
import { isResponsable } from "@/lib/auth/types";
import { repo } from "@/lib/data";
import type { DocumentType, GeneratedDocument, TemplateText } from "@/lib/domain/types";
import { loadCompanies } from "@/lib/reference";
import { defaultPeriod } from "@/lib/reporting";
import { DOC_KIND, DOC_KIND_LABEL, DOC_KIND_RULE, DOC_LABEL, DOC_ORDER, DOC_WHEN, type DocumentKind } from "@/lib/documents/registry";
import { PASSAGES, SENSITIVITY_LABEL } from "@/lib/documents/passages";
import { previewLine } from "@/lib/documents/generate";
import { fmtDateTime } from "@/lib/format";
import { getT } from "@/i18n/server";
import { ActivateVersion, PassageEditor } from "./PassageEditor";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Modèles" };


/**
 * The templates registry: every document model, when the lifecycle
 * produces it, a preview on demonstration data, and its passages the desk
 * may reword, each with its version in force, its history and its rule for
 * coming into force. What is not listed here is code.
 */
export default async function ModelesPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const [t, sp, session, rows, docs, offers, companies] = await Promise.all([
    getT(),
    searchParams,
    getSession(),
    repo().listTemplateTexts().catch(() => [] as TemplateText[]),
    repo().listDocuments().catch(() => [] as GeneratedDocument[]),
    repo().listOffers().catch(() => []),
    loadCompanies().catch(() => []),
  ]);
  const responsable = isResponsable(session);
  const me = session?.name ?? "";
  const types = DOC_ORDER;
  const open = (sp.type && types.includes(sp.type as DocumentType) ? sp.type : types[0]) as DocumentType;
  const kinds: DocumentKind[] = ["signe", "envoye", "interne"];
  const defs = PASSAGES[open] ?? [];
  const byPassage = (key: string) => rows.filter((r) => r.docType === open && r.passage === key).sort((a, b) => b.version - a.version);
  const pendingAll = rows.filter((r) => r.status === "pending").length;
  const issued = docs.filter((d) => d.type === open).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const last = issued[0];
  // the editions the desk produces on demand, previewed on a real line, company or period : not stored, no passages
  const sample = offers.find((o) => !o.hidden && o.kind !== "MARCHE") ?? offers[0];
  const company = companies[0];
  const period = defaultPeriod();
  const editions: { key: string; label: string; when: string; href?: string }[] = [
    { key: "fiche", label: "Fiche PDF d'une ligne", when: "à la demande, depuis la fiche d'une ligne du Guichet (« Fiche PDF ») ; les données de la ligne, l'indice et l'échéancier", href: sample ? `/offres/${sample.id}/fiche` : undefined },
    { key: "societe", label: "Rapport société", when: "à la demande, depuis la page d'une société cotée ; cours, dividendes, ratios et commentaire de période", href: company ? `/societes/${company.mnemo}/rapport?p=ytd` : undefined },
    { key: "activite", label: "Rapport d'activité", when: "à la demande, depuis Reporting ; ordres, clients, documents et flux sur la période", href: `/desk/reporting/pdf?from=${period.from}&to=${period.to}` },
  ];
  return (
    <>
      <DeskNav current="/desk/referentiel" />
      <div className={styles.head}>
        <div>
          <div className="eyebrow">{t("Référentiel · Modèles")}</div>
          <h1 className="display">{t("Modèles de documents")}</h1>
          <p className="muted">{t("Ce que disent les documents que le Guichet produit. Chaque passage a une version en vigueur, son historique, et sa règle pour entrer en vigueur ; la mise en page, les chiffres et les références restent dans le code. Un document généré garde la version de chaque passage qu'il portait.")}</p>
        </div>
        <div className={styles.headLinks}>
          {pendingAll > 0 && <span className={styles.pending}>{t("{n} version(s) en attente", { n: String(pendingAll) })}</span>}
          <Link className="btn sm" href="/desk/depot">
            {t("Dépôt")} →
          </Link>
          <Link className="btn sm" href="/desk/docs/sources#depot">
            {t("Documentation")} →
          </Link>
        </div>
      </div>

      <div className={styles.layout}>
        <nav className={styles.types} aria-label={t("Modèles")}>
          {kinds.map((kind) => (
            <div key={kind} className={styles.group}>
              <div className={`${styles.groupHead} ${styles[kind]}`} title={t(DOC_KIND_RULE[kind])}>
                <b>{t(DOC_KIND_LABEL[kind])}</b>
                <small>{t(DOC_KIND_RULE[kind]).split(" : ")[0]}</small>
              </div>
              {types
                .filter((k) => DOC_KIND[k] === kind)
                .map((k) => {
                  const n = rows.filter((r) => r.docType === k && r.status === "pending").length;
                  const np = (PASSAGES[k] ?? []).length;
                  return (
                    <Link key={k} href={`/desk/referentiel/modeles?type=${k}`} aria-current={k === open ? "page" : undefined}>
                      <b>{t(DOC_LABEL[k])}</b>
                      <small>
                        {np ? `${np} ${t("passages")}` : t("mise en page seulement")}
                        {n ? ` · ${n} ${t("en attente")}` : ""}
                      </small>
                    </Link>
                  );
                })}
            </div>
          ))}
        </nav>

        <div className={styles.model}>
          <div className={styles.modelHead}>
            <div>
              <h2>{t(DOC_LABEL[open])}</h2>
              <small>
                <span className={`${styles.kindTag} ${styles[DOC_KIND[open]]}`}>{t(DOC_KIND_LABEL[DOC_KIND[open]])}</span> {t("Produit")} : {t(DOC_WHEN[open])}
              </small>
            </div>
            <div className={styles.previews}>
              <a className="btn sm primary" href={`/desk/referentiel/modeles/preview?type=${open}`} target="_blank" rel="noreferrer">
                {open === "bordereau" ? t("Aperçu PDF · bordereau SVT") : t("Aperçu PDF · texte en vigueur")}
              </a>
              {open === "bordereau" && (
                <a className="btn sm" href="/desk/referentiel/modeles/preview?type=bordereau&variante=opcvm" target="_blank" rel="noreferrer">
                  {t("Aperçu PDF · bordereau OPCVM")}
                </a>
              )}
            </div>
          </div>
          <p className={styles.last}>
            {last ? (
              <>
                {t("Dernier émis")} : <span className="mono">{last.number}</span> · {fmtDateTime(last.createdAt)}
                {last.clientName ? ` · ${last.clientName}` : ""} ·{" "}
                <a href={`/desk/documents/pdf/${last.id}`} target="_blank" rel="noreferrer">
                  PDF
                </a>{" "}
                · <Link href={`/desk/documents?type=${open}`}>{t("{n} émis", { n: String(issued.length) })}</Link>
              </>
            ) : (
              t("Aucun document de ce modèle n'a encore été émis : l'aperçu montre le modèle sur des données de démonstration.")
            )}
          </p>

          {defs.length === 0 && <p className={styles.none}>{t("Ce modèle se consulte par l'aperçu : ses mentions sont fixées par le code et ses données viennent du dossier, de l'intention ou des positions. Une modification de texte se demande à l'équipe technique.")}</p>}
          {defs.map((d) => {
            const versions = byPassage(d.key);
            const current = versions.find((v) => v.status === "current");
            const pending = versions.filter((v) => v.status === "pending");
            return (
              <section key={d.key} className={styles.passage} id={d.key}>
                <div className={styles.passageHead}>
                  <div>
                    <h3>{t(d.label)}</h3>
                    {d.hint && <small>{t(d.hint)}</small>}
                  </div>
                  <span className={`${styles.sens} ${styles[d.sensitivity]}`} title={t(SENSITIVITY_LABEL[d.sensitivity])}>
                    {t(d.sensitivity)}
                  </span>
                </div>
                <div className={styles.inForce}>
                  <span>
                    {t("En vigueur")} : {current ? `v${current.version} · ${current.by} · ${fmtDateTime(current.at)}` : t("texte d'origine (code)")}
                  </span>
                  <p>{previewLine(open, d.key, current?.fr ?? d.fr)}</p>
                  {current?.en || d.en ? <p className={styles.en}>{previewLine(open, d.key, current?.en || d.en)}</p> : null}
                </div>
                {pending.length > 0 && (
                  <ul className={styles.pendingList}>
                    {pending.map((v) => (
                      <li key={v.id}>
                        <div>
                          <b>
                            v{v.version} · {t("proposée par")} {v.by} · {fmtDateTime(v.at)}
                          </b>
                          {v.note && <small> · {v.note}</small>}
                          <p>{previewLine(open, d.key, v.fr)}</p>
                        </div>
                        <ActivateVersion id={v.id} can={d.sensitivity === "libre" || (d.sensitivity === "relu" && (v.by !== me || responsable)) || (d.sensitivity === "reglementaire" && responsable)} label={t(d.sensitivity === "reglementaire" ? "Approuver et mettre en vigueur" : "Relu : mettre en vigueur")} previewHref={`/desk/referentiel/modeles/preview?type=${open}&v=${v.id}`} />
                      </li>
                    ))}
                  </ul>
                )}
                <PassageEditor docType={open} def={d} current={current} versions={versions.filter((v) => v.status === "superseded")} responsable={responsable} me={me} />
              </section>
            );
          })}

          <section className={styles.editions} id="editions">
            <h3>{t("Autres éditions")}</h3>
            <p className="muted">{t("Produites à la demande, non numérotées dans Documents, sans passage modifiable : le modèle se consulte sur une ligne, une société ou une période réelles.")}</p>
            <ul>
              {editions.map((e) => (
                <li key={e.key}>
                  <div>
                    <b>{t(e.label)}</b>
                    <small>{t(e.when)}</small>
                  </div>
                  {e.href ? (
                    <a className="btn sm" href={e.href} target="_blank" rel="noreferrer">
                      {t("Aperçu PDF")}
                    </a>
                  ) : (
                    <span className="muted">{t("aucune donnée à montrer")}</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}
