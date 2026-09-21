import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { INTENT_LABEL } from "@/lib/domain/intent";
import { fmtDate } from "@/lib/format";
import { getT } from "@/i18n/server";
import { ComplaintForm } from "./ComplaintForm";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Réclamation" };

/**
 * The client's complaint, in three steps: the facts and the request in
 * their words (the operation proposed from their history), a signature by
 * code on the proven phone (or the signed-in e-mail), the numbered document
 * in Mes documents. Purpose acknowledges within two business days and
 * answers within thirty days; COSUMAF is the recourse.
 */
export default async function ComplaintPage() {
  const s = await requireSession("/moi/reclamation");
  const t = await getT();
  const r = repo();
  const [intents, offers, channels, docs] = await Promise.all([r.listIntents(), r.listOffers(), r.getChannelStatus(s.userId).catch(() => undefined), r.listDocuments().catch(() => [])]);
  const byOffer = new Map(offers.map((o) => [o.id, o]));
  const ops = intents
    .filter((i) => i.clientId === s.userId && i.state !== "annulee")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 20)
    .map((i) => ({ ref: i.ref, label: `${i.ref} · ${byOffer.get(i.offerId)?.title ?? ""} · ${t(INTENT_LABEL[i.type])} · ${fmtDate(i.createdAt)}` }));
  const mine = docs.filter((d) => d.type === "reclamation" && d.clientId === s.userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <div>
          <div className="eyebrow">
            <Link href="/moi">{t("Mon espace")}</Link> › {t("Réclamation")}
          </div>
          <h1 className="display">{t("Déposer une réclamation")}</h1>
          <p className={styles.lead}>{t("Dites ce qui s'est passé et ce que vous demandez, avec vos mots. Purpose Capital accuse réception sous deux jours ouvrés et répond sous trente jours ; sans réponse satisfaisante, la COSUMAF peut être saisie.")}</p>
        </div>
      </div>
      <ComplaintForm ops={ops} phoneProven={Boolean(channels?.phoneVerifiedAt)} phone={channels?.phone ?? s.phone} email={s.email} />
      {mine.length > 0 && (
        <section className="panel">
          <div className="panel-h">
            <h2>{t("Vos réclamations")}</h2>
          </div>
          <ul className={styles.list}>
            {mine.map((d) => (
              <li key={d.id}>
                <span className="mono">{d.number}</span> · {fmtDate(d.createdAt)} ·{" "}
                <a href={`/desk/documents/pdf/${d.id}`} target="_blank" rel="noreferrer">
                  PDF
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
