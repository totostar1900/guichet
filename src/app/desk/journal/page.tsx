import Link from "next/link";
import { DeskNav } from "@/components/DeskNav";
import { diffRecords, FIELD_FR } from "@/lib/audit";
import { requireDesk } from "@/lib/auth";
import { repo } from "@/lib/data";
import { fmtDateTime } from "@/lib/format";
import styles from "./page.module.css";
import { getT } from "@/i18n/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Journal d'audit" };

const ACTION_FR: Record<string, string> = {
  "offer.publish": "Publication",
  "offer.quote": "Cours saisi",
  "offer.fund_terms": "Conditions du fonds",
  "offer.visibility": "Visibilité",
  "offer.restore": "Restauration",
  "intent.transition": "Intention",
  "reference.upsert": "Référentiel",
  "reference.delete": "Référentiel (retrait)",
  "staff.role": "Équipe",
  "mfa.enrol": "Second facteur",
  "approval.request": "Approbation demandée",
  "approval.decide": "Approbation décidée",
  "policy.update": "Fenêtre déléguée",
};
const ENTITIES: [string, string][] = [
  ["", "Tout"],
  ["offer", "Lignes"],
  ["intent", "Intentions"],
  ["reference", "Référentiel"],
  ["profile", "Équipe"],
  ["approval", "Approbations"],
];
const short = (v: unknown): string => (v == null ? "—" : typeof v === "object" ? JSON.stringify(v).slice(0, 60) : String(v));

/** The structured audit trail: every business action with who / what / before → after / why / from where. */
export default async function JournalPage({ searchParams }: { searchParams: Promise<{ entite?: string }> }) {
  const t = await getT();
  await requireDesk("/desk/journal");
  const { entite = "" } = await searchParams;
  const rows = await repo().listAudit({ entity: entite || undefined, limit: 200 });
  const broken = rows.length > 1 && rows.some((a, i) => i < rows.length - 1 && a.prevHash !== rows[i + 1].hash);
  return (
    <>
      <DeskNav current="/desk/journal" />
      <div className={styles.head}>
        <div>
          <h1>Journal d&apos;audit</h1>
          <p className="muted">
            Chaque action métier laisse une ligne immuable : qui, quoi, l&apos;enregistrement avant et après, le motif, l&apos;adresse d&apos;origine. Les lignes sont chaînées par empreinte : une ligne modifiée ou retirée casserait la chaîne.
          </p>
        </div>
        <span className={`${styles.chain} ${broken ? styles.bad : styles.good}`}>{broken ? "Chaîne rompue — à signaler" : "Chaîne intègre"}</span>
      </div>
      <nav className={styles.tabs} aria-label={t("Filtre")}>
        {ENTITIES.map(([k, label]) => (
          <Link key={k} href={k ? `/desk/journal?entite=${k}` : "/desk/journal"} aria-current={k === entite ? "page" : undefined}>
            {label}
          </Link>
        ))}
      </nav>
      <div className="panel">
        <table className={`tbl ${styles.tbl}`}>
          <thead>
            <tr>
              <th>{t("Quand")}</th>
              <th>{t("Qui")}</th>
              <th>{t("Action")}</th>
              <th>{t("Objet")}</th>
              <th>{t("Changements")}</th>
              <th>{t("Origine")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => {
              const diffs = diffRecords(a.before, a.after, ["version", "pricedAt"]).slice(0, 5);
              return (
                <tr key={a.id}>
                  <td className="mono">{fmtDateTime(a.at)}</td>
                  <td>{a.actor}</td>
                  <td>
                    <b>{ACTION_FR[a.action] ?? a.action}</b>
                    {a.reason && (
                      <>
                        <br />
                        <small className="muted">{a.reason}</small>
                      </>
                    )}
                  </td>
                  <td>{a.entity === "offer" ? <Link href={`/desk/lignes/${a.entityId}`}>{a.entityId}</Link> : <span className="mono">{a.entityId}</span>}</td>
                  <td className={styles.changes}>
                    {diffs.map((d) => (
                      <div key={d.key}>
                        <span>{FIELD_FR[d.key] ?? d.key}</span> <s>{short(d.before)}</s> → <b>{short(d.after)}</b>
                      </div>
                    ))}
                    {diffs.length === 0 && a.after != null && <small className="muted">{short(a.after)}</small>}
                  </td>
                  <td>
                    <small className="mono">{a.ip ?? "—"}</small>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="muted">
                  {t("Aucune action tracée.")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
