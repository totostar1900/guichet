import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { INTENT_LABEL } from "@/lib/domain/intent";
import { aCouvrirPour, seSigneAuPlafond } from "@/lib/domain/plafond";
import { fmtDateTime } from "@/lib/format";
import { masquerLAdresse } from "@/lib/kyc/canal";
import { getT } from "@/i18n/server";
import { Glissement } from "@/components/mobile/Glissement";
import { EnTete } from "@/components/EnTete";
import { BarreCollante } from "@/components/mobile/BarreDEtape";
import barre from "@/components/mobile/BarreDEtape.module.css";
import { PourFinir } from "../PourFinir";
import styles from "../page.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Ordre signé") };
}

/**
 * LA PAGE QUI S'OUVRE UNE FOIS L'ORDRE SIGNÉ (17 novembre 2026, planche « Signer et suivre », 4A).
 *
 * Avant, l'ordre se rechargeait sur lui-même et le message de confirmation disparaissait avec le formulaire qui le portait : on lisait « Ordre signé le… par code » et rien sur l'e-mail.
 * Ici : une page, un message, une sortie. L'exemplaire est parti par e-mail (ou il attend dans Mes documents, et la page le dit), puis « Pour finir » (le virement et son motif, ou « rien à
 * virer »), puis une phrase sur la suite. L'étape 3 de la procédure : relire, code, signé.
 */
export default async function OrdreSignePage({ params }: { params: Promise<{ id: string }> }) {
  const t = await getT();
  const { id } = await params;
  const s = await requireSession(`/moi/ordres/${id}/signe`);
  const r = repo();
  const intent = (await r.listIntents()).find((x) => x.id === id);
  if (!intent || intent.clientId !== s.userId) notFound();
  /* Pas signé : il n'y a rien à confirmer, la page de l'ordre le dit. */
  if (!intent.signedAt) redirect(`/moi/ordres/${id}`);
  const offer = await r.getOffer(intent.offerId);
  if (!offer) notFound();

  const rachat = intent.type === "rachat";
  const titre = seSigneAuPlafond(intent.type);
  const aRegler = aCouvrirPour(intent, offer);
  const couvert = Boolean(intent.coveredAt);
  /* L'E-MAIL SE LIT DE CE QUI EST PARTI, pas de ce qu'on espérait : l'envoi est enregistré à la signature, et l'écran dit l'un ou l'autre. */
  const parti = (await r.listNotifications(500)).find((n) => n.intentId === intent.id && n.kind === "document" && n.channel === "email" && n.status !== "skipped" && n.status !== "failed");
  const suite = couvert ? t("Votre provision a couvert l'ordre : le desk le transmet. Vous le suivez dans Mes ordres.") : rachat ? t("Le desk exécute à la prochaine valeur liquidative de rachat, puis le produit est viré sur votre compte. Vous le suivez dans Mes ordres.") : t("Le desk constate votre règlement, puis transmet l'ordre. Vous le suivez dans Mes ordres.");
  const exemplaire = intent.orderDocId ? `/moi/documents/${intent.orderDocId}?de=${encodeURIComponent(`/moi/ordres/${id}/signe`)}` : "/moi/documents/signes";

  return (
    <Glissement>
      <div className={styles.wrap}>
        <div className={styles.pas} aria-label={t("Signé")}>
          <i className={styles.pasOn} />
          <i className={styles.pasOn} />
          <i className={styles.pasOn} />
          <span>{t("Signé")}</span>
        </div>
        <EnTete surTitre={t(INTENT_LABEL[intent.type])} titre={t("Ordre signé")} phrase={`${intent.ref} · ${fmtDateTime(intent.signedAt)}`} />
        <div className={styles.signe} role="status">
          {parti ? t("Votre exemplaire est parti par e-mail, à {a}. Il est aussi dans Mes documents.", { a: masquerLAdresse(parti.to) }) : t("Votre exemplaire n'a pas pu partir par e-mail : il vous attend dans Mes documents.")}
        </div>
        <PourFinir intent={intent} aRegler={aRegler} titre={titre} rachat={rachat} couvert={couvert} />
        <section className={styles.recap}>
          <div className={styles.recapH}>{t("Et ensuite")}</div>
          <p className={styles.fin} style={{ margin: 0 }}>
            {suite}
          </p>
        </section>
        <BarreCollante>
          <Link href={exemplaire} className={`btn ${barre.retour}`}>
            {t("Mon exemplaire")}
          </Link>
          <Link href="/moi/ordres" className={`btn primary ${barre.suivant}`}>
            {t("Mes ordres")}
          </Link>
        </BarreCollante>
      </div>
    </Glissement>
  );
}
