import Link from "next/link";
import { DeskNav } from "@/components/DeskNav";
import { getSession } from "@/lib/auth";
import { isResponsable } from "@/lib/auth/types";
import { repo } from "@/lib/data";
import type { DocumentType, TemplateText } from "@/lib/domain/types";
import { DOC_LABEL, docsForTransition } from "@/lib/documents/registry";
import { PASSAGES, SENSITIVITY_LABEL } from "@/lib/documents/passages";
import { previewLine } from "@/lib/documents/generate";
import { fmtDateTime } from "@/lib/format";
import { getT } from "@/i18n/server";
import { ActivateVersion, PassageEditor } from "./PassageEditor";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Modèles" };

const WHEN: Partial<Record<DocumentType, string>> = {
  bulletin: "à la confirmation d'une intention (souscription, achat, vente)",
  fonds: "à la confirmation, avec le bulletin",
  cession: "à la confirmation d'une cession ou d'un rachat",
  allocation: "quand la ligne est servie (ou non servie)",
  opere: "au règlement",
  releve: "à la demande du client ou du desk",
  attestation: "à la demande du client",
  convention: "à l'ouverture du compte-titres ; le modèle vierge se lit avant l'acceptation",
};

/**
 * The templates registry: every document model, when the lifecycle
 * produces it, a preview on demonstration data, and its passages the desk
 * may reword, each with its version in force, its history and its rule for
 * coming into force. What is not listed here is code.
 */
export default async function ModelesPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const [t, sp, session, rows] = await Promise.all([getT(), searchParams, getSession(), repo().listTemplateTexts().catch(() => [] as TemplateText[])]);
  const responsable = isResponsable(session);
  const me = session?.name ?? "";
  const types = Object.keys(PASSAGES) as DocumentType[];
  const open = (sp.type && types.includes(sp.type as DocumentType) ? sp.type : types[0]) as DocumentType;
  const defs = PASSAGES[open] ?? [];
  const byPassage = (key: string) => rows.filter((r) => r.docType === open && r.passage === key).sort((a, b) => b.version - a.version);
  const pendingAll = rows.filter((r) => r.status === "pending").length;
  void docsForTransition;
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
          {types.map((k) => {
            const n = rows.filter((r) => r.docType === k && r.status === "pending").length;
            return (
              <Link key={k} href={`/desk/referentiel/modeles?type=${k}`} aria-current={k === open ? "page" : undefined}>
                <b>{t(DOC_LABEL[k])}</b>
                <small>
                  {(PASSAGES[k] ?? []).length} {t("passages")}
                  {n ? ` · ${n} ${t("en attente")}` : ""}
                </small>
              </Link>
            );
          })}
        </nav>

        <div className={styles.model}>
          <div className={styles.modelHead}>
            <div>
              <h2>{t(DOC_LABEL[open])}</h2>
              <small>{t("Produit")} : {t(WHEN[open] ?? "à la demande")}</small>
            </div>
            <a className="btn sm primary" href={`/desk/referentiel/modeles/preview?type=${open}`} target="_blank" rel="noreferrer">
              {t("Aperçu PDF · texte en vigueur")}
            </a>
          </div>

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
        </div>
      </div>
    </>
  );
}
