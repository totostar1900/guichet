import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { DOC_LABEL } from "@/lib/documents/registry";
import { INTENT_LABEL, INTENT_STATE_LABEL } from "@/lib/domain/intent";
import { fmt } from "@/lib/format";
import type { Intent } from "@/lib/domain/types";
import { getT } from "@/i18n/server";
import { MyDocuments } from "../MyDocuments";
import { StatementButtons } from "../StatementButtons";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Mes documents") };
}

/**
 * Les documents du client, sur une page à eux.
 *
 * ILS ÉTAIENT DANS UN PLI du tableau de bord, et un pli pose au lecteur la
 * question « y a-t-il quelque chose là-dedans » à chaque ouverture. Un document
 * se cherche : on vient ici en sachant ce qu'on veut, et une page se met en
 * signet quand un pli ne le peut pas.
 *
 * LE RELEVÉ SE FABRIQUE, LES AUTRES ARRIVENT, et c'est la seule vraie
 * différence entre ces papiers. Elle mérite sa bande en haut : un relevé se
 * demande à la date qu'on veut, tout le reste est tombé d'une opération et ne
 * se commande pas. Le bouton quitte donc le pli des positions, où il n'avait
 * rien à faire, pour la seule page qui parle de documents.
 *
 * LES DEUX LECTURES EXISTAIENT DÉJÀ, par opération et par date, serrées dans le
 * pli : la page leur donne la place.
 */
export default async function DocumentsPage() {
  const t = await getT();
  const s = await requireSession("/moi/documents");
  const r = repo();
  const [intents, offers, docs, myFile] = await Promise.all([r.listIntents(), r.listOffers(), r.listDocuments(), r.getClientFileByUser(s.userId)]);
  const mine = intents.filter((i) => i.clientId === s.userId);
  const byOffer = new Map(offers.map((o) => [o.id, o]));
  /* Une ligne qui n'est plus au catalogue existe encore : ses documents gardent
     son nom. Sans ce rattrapage, un avis d'opéré se retrouverait sous un
     identifiant nu. */
  const manquantes = [...new Set(mine.map((i) => i.offerId).filter((id) => !byOffer.has(id)))];
  for (const o of await Promise.all(manquantes.map((id) => r.getOffer(id).catch(() => undefined)))) if (o) byOffer.set(o.id, o);

  const miens = docs.filter((d) => d.type !== "dossier_svt" && ((d.intentId && mine.some((i) => i.id === d.intentId)) || (myFile && d.clientFileId === myFile.id) || d.clientId === s.userId));
  const montant = (i: Intent, kind?: string) => (i.amount ? (i.type === "rachat" ? `${i.amount.toLocaleString("fr-FR", { maximumFractionDigits: 3 })} parts` : `${fmt(i.amount)} ${kind === "RACHAT" ? "titres" : "FCFA"}`) : "");

  return (
    <div className={styles.page}>
      <Link href="/" className={styles.back}>
        ← {t("Portefeuille")}
      </Link>
      <h1 className="display">{t("Mes documents")}</h1>
      <p className={styles.lead}>{t("Vos relevés, et tout ce qui est tombé de vos opérations : avis d'opéré, bulletins, appels de fonds.")}</p>

      {/* LE RELEVÉ SE FABRIQUE : c'est le seul document qu'on demande, et il a
          donc sa bande, séparée de ceux qui sont arrivés tout seuls. */}
      <section className={styles.editer}>
        <div>
          <b>{t("Éditer un relevé")}</b>
          <small>{t("Il se fabrique à la demande, à la date que vous choisissez.")}</small>
        </div>
        <StatementButtons />
      </section>

      <MyDocuments
        docs={miens.map((d) => ({ id: d.id, number: d.number, label: t(DOC_LABEL[d.type]), createdAt: d.createdAt, status: d.status, href: `/desk/documents/pdf/${d.id}`, intentId: d.intentId }))}
        ops={mine
          .slice()
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .map((i) => {
            const o = byOffer.get(i.offerId);
            return { id: i.id, title: o?.title ?? i.offerId, about: `${t(INTENT_LABEL[i.type])}${i.amount ? ` · ${montant(i, o?.kind)}` : ""} · ${t("réf.")} ${i.ref}`, state: t(INTENT_STATE_LABEL[i.state]), stateKey: i.state, href: o ? `/offres/${o.id}` : undefined };
          })}
      />

      <p className={styles.pied}>
        <Link className="btn sm ghost" href="/moi/reclamation">
          {t("Déposer une réclamation")}
        </Link>
      </p>
    </div>
  );
}
