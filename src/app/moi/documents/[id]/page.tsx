import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { peutLireLeDocument } from "@/lib/documents/acces";
import { DOC_LABEL } from "@/lib/documents/registry";
import { INTENT_LABEL } from "@/lib/domain/intent";
import { fmt, fmtDateTime } from "@/lib/format";
import { getT } from "@/i18n/server";
import { SourceViewer } from "@/components/SourceViewer";
import { SortiesDuDocument } from "./Sorties";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const t = await getT();
  const doc = await repo()
    .getDocument((await params).id)
    .catch(() => undefined);
  return { title: doc ? `${doc.number} · ${t("Mes documents")}` : t("Mes documents") };
}

/** Une adresse de retour n'est acceptée que si elle est interne : un « de » venu d'ailleurs renverrait le lecteur hors de chez lui. */
const retourSur = (de?: string) => (de && de.startsWith("/") && !de.startsWith("//") ? de : "/moi/documents");

/**
 * UN DOCUMENT SE LIT SANS QUITTER L'APP, ET SANS PERDRE SON CHEMIN.
 *
 * Les liens menaient droit au PDF. Dans l'app installée, qui tourne en
 * « standalone », il n'y a ni barre d'adresse ni bouton de retour : le PDF
 * remplaçait la vue et le lecteur restait coincé dedans. Le document vit donc
 * dans une page de l'app, et SourceViewer peint le PDF lui-même (pdf.js, sur
 * un canevas) : rien ne sort de la page, donc rien ne peut s'y perdre.
 *
 * TROIS MANQUES RÉPARÉS LE 10 OCTOBRE 2026.
 *
 * LE RETOUR REVENAIT TOUJOURS À LA LISTE, même quand on arrivait de la page
 * d'un ordre ou de la provision. Il suit maintenant « de », et le nomme.
 *
 * L'EN-TÊTE NE DISAIT PAS DE QUOI IL S'AGIT : un numéro et une date. Il dit
 * ce que la pièce PROUVE (la ligne, le montant, l'opération), parce que c'est
 * ce qu'on vérifie en l'ouvrant.
 *
 * ON NE POUVAIT PAS LIRE DEUX PIÈCES DE SUITE : trois avis d'opéré d'une même
 * opération coûtaient trois allers-retours. « Précédent / suivant » parcourt
 * l'ensemble auquel la pièce appartient, et le nomme.
 */
export default async function DocumentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ de?: string }> }) {
  const t = await getT();
  const { id } = await params;
  const { de } = await searchParams;
  const s = await requireSession(`/moi/documents/${id}`);
  const r = repo();
  const doc = await r.getDocument(id);
  if (!doc || !(await peutLireLeDocument(s, doc))) notFound();
  const fichier = `/api/documents/${doc.id}`;
  const retour = retourSur(de);

  /* CE QUE LA PIÈCE PROUVE, et l'ensemble où elle vit : son opération quand
     elle en a une, sinon votre dossier. Les deux se lisent d'une seule
     lecture des documents du client. */
  const [tous, intents, offers] = await Promise.all([r.listDocuments(), doc.intentId ? r.listIntents() : Promise.resolve([]), doc.intentId ? r.listOffers() : Promise.resolve([])]);
  const intent = doc.intentId ? intents.find((i) => i.id === doc.intentId) : undefined;
  const offre = intent ? offers.find((o) => o.id === intent.offerId) : undefined;
  const ensemble = tous
    .filter((d) => (doc.intentId ? d.intentId === doc.intentId : !d.intentId && d.clientFileId === doc.clientFileId && Boolean(doc.clientFileId)))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const rang = ensemble.findIndex((d) => d.id === doc.id);
  const avant = rang > 0 ? ensemble[rang - 1] : undefined;
  const apres = rang >= 0 && rang < ensemble.length - 1 ? ensemble[rang + 1] : undefined;
  const voisin = (autre: string) => `/moi/documents/${autre}?de=${encodeURIComponent(retour)}`;

  const quantite = intent?.amount ? (intent.type === "rachat" ? `${intent.amount.toLocaleString("fr-FR", { maximumFractionDigits: 3 })} parts` : `${fmt(intent.amount)} FCFA`) : undefined;

  return (
    <div className={styles.wrap}>
      <Link href={retour} className={styles.back}>
        ← {retour === "/moi/documents" ? t("Mes documents") : intent ? t("Votre ordre {r}", { r: intent.ref }) : t("Retour")}
      </Link>
      <div className={styles.head}>
        <div>
          <div className="eyebrow">{t(DOC_LABEL[doc.type])}</div>
          <h1 className="display mono">{doc.number}</h1>
          <p className={styles.lead}>
            {intent && offre ? (
              <>
                {t("Il porte votre {op} de {m} sur", { op: t(INTENT_LABEL[intent.type]).toLowerCase(), m: quantite ?? "" })} <Link href={`/offres/${offre.id}`}>{offre.title}</Link>
                {t(", référence {r}. Établi le {d}.", { r: intent.ref, d: fmtDateTime(doc.createdAt) })}
              </>
            ) : (
              t("Établi le {d}.", { d: fmtDateTime(doc.createdAt) })
            )}
          </p>
        </div>
        <SortiesDuDocument fichier={fichier} nom={doc.number} />
      </div>

      {/* LIRE DEUX PIÈCES DE SUITE : l'ensemble est nommé, pour qu'on sache
          dans quoi on avance. */}
      {ensemble.length > 1 && (
        <nav className={styles.voisins} aria-label={t("Les pièces de cet ensemble")}>
          {avant ? (
            <Link href={voisin(avant.id)}>← {t("Précédent")}</Link>
          ) : (
            <span className={styles.vide}>← {t("Précédent")}</span>
          )}
          <span className={styles.rang}>
            <b>{t("pièce {n} sur {total}", { n: String(rang + 1), total: String(ensemble.length) })}</b>
            {intent ? ` · ${t("documents de l'opération {r}", { r: intent.ref })}` : ` · ${t("pièces de votre dossier")}`}
          </span>
          {apres ? (
            <Link href={voisin(apres.id)}>{t("Suivant")} →</Link>
          ) : (
            <span className={styles.vide}>{t("Suivant")} →</span>
          )}
        </nav>
      )}

      {/* LA PAGE EST PEINTE ICI, ET C'EST LA SEULE FAÇON QUI TIENNE.
          « object » et « iframe » s'en remettent à la visionneuse du système :
          sur un téléphone elle n'existe pas, et dans l'app installée, qui
          tourne en standalone, l'ouvrir emporte l'app. Mesuré le 8 octobre
          2026 : cadre vide, « ouvrir à part » faisait disparaître l'app, et le
          téléchargement ne donnait aucune notification. Trois issues, trois
          impasses. */}
      <div className={styles.visionneuse}>
        <SourceViewer src={fichier} title={`${t(DOC_LABEL[doc.type])} ${doc.number}`} fill />
      </div>

      {/* Les sorties de la pièce : tout ce qui n'avait pas sa place sur la
          ligne de la liste, qui n'en porte qu'une. */}
      <div className={styles.sorties}>
        {offre && (
          <Link className="btn sm" href={`/offres/${offre.id}`}>
            {t("Voir la ligne")}
          </Link>
        )}
        {intent && (
          <Link className="btn sm" href={`/moi/ordres/${intent.id}`}>
            {t("Voir l'opération")}
          </Link>
        )}
        <Link className="btn sm" href="/moi/reclamation">
          {t("Contester cette pièce")}
        </Link>
      </div>
    </div>
  );
}
