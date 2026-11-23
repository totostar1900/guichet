import { getT } from "@/i18n/server";
import { fmt, fmtDate, fmtDateTime } from "@/lib/format";
import { rapporteAuLieuDeCouter, seSigneAuPlafond } from "@/lib/domain/plafond";
import type { Intent, Offer } from "@/lib/domain/types";
import pageStyles from "./page.module.css";
import styles from "./EtapesSuivantes.module.css";

/**
 * « CE QUI SE PASSE MAINTENANT » : LES ÉTAPES D'UN ORDRE SIGNÉ (23 novembre 2026, planche « Signer tous les ordres », 3B).
 *
 * Deux familles, deux pistes. Un FONDS enchaîne seul : signé, transmis, exécuté, parts inscrites (ou produit viré). Un TITRE signé n'est pas exécuté pour autant : il reste la couverture, la transmission
 * au marché, le service, le règlement. Chaque étape dit ce qui se passe, QUI agit (vous, nous, le marché, le fonds) et QUAND, mais seulement quand on le sait : une date n'est écrite que si la ligne la
 * porte (l'adjudication a une date ; une valeur liquidative a son heure limite), jamais inventée. L'étape en cours est la première qui n'est pas faite, lue de l'état de l'ordre.
 *
 * Une seule écriture pour la page de confirmation et pour la page de l'ordre signé : deux copies auraient divergé.
 */
export async function EtapesSuivantes({ intent, offer, aRegler, couvert }: { intent: Intent; offer: Offer; aRegler: number; couvert: boolean }) {
  const t = await getT();
  const fonds = intent.type === "souscription" || intent.type === "rachat";
  const reduit = rapporteAuLieuDeCouter(intent.type);
  const plafond = seSigneAuPlafond(intent.type);
  /* Combien d'étapes de la vie de l'ordre sont derrière lui : transmis, puis servi, puis réglé. « Non servi » ferme la piste au deuxième. */
  const faits = intent.state === "reglee" ? 3 : intent.state === "servie" || intent.state === "non_servie" ? 2 : intent.state === "transmise" ? 1 : 0;
  const nonServi = intent.state === "non_servie";
  const j = offer.fund?.settlementDays ?? offer.settlementDays;
  const jours = j ? ` · ${t("règlement J+{n}", { n: String(j) })}` : "";

  type Etape = { cle: string; nom: string; dit: string; qui: string; fait: boolean };
  const etapes: Etape[] = [
    { cle: "signe", nom: t("Signé"), dit: `${fmtDateTime(intent.signedAt ?? intent.createdAt)} · ${t("exemplaire envoyé par e-mail et sur WhatsApp")}`, qui: t("vous"), fait: true },
  ];
  /* L'argent d'abord, quand l'ordre en demande : mis de côté sur la provision, ou à virer. Une vente, une cession et un rachat n'en demandent pas. */
  if (!reduit && aRegler > 0) {
    const regle = couvert || faits > 0;
    etapes.push({
      cle: "fonds",
      nom: regle ? t("Fonds mis de côté") : t("Fonds à virer"),
      dit: regle
        ? t("{m} FCFA sur votre provision.", { m: fmt(couvert ? intent.coveredAmount ?? aRegler : aRegler) })
        : plafond
          ? t("Virez au plus {m} FCFA, motif {r}.", { m: fmt(aRegler), r: intent.ref })
          : t("Virez {m} FCFA, motif {r}.", { m: fmt(aRegler), r: intent.ref }),
      qui: t("vous"),
      fait: regle,
    });
  }
  const attendLesFonds = !fonds && !reduit && !couvert && faits === 0 ? ` ${t("Dès que les fonds sont là.")}` : "";
  etapes.push({
    cle: "transmis",
    nom: fonds ? t("Transmis") : t("Transmis au marché"),
    dit: fonds
      ? offer.fund?.cutoff
        ? t("Centralisé à la prochaine valeur liquidative, {c}.", { c: offer.fund.cutoff })
        : t("Centralisé à la prochaine valeur liquidative.")
      : (offer.deadlineAt ? t("À l'adjudication du {d}.", { d: fmtDate(offer.deadlineAt, false) }) : t("À la prochaine séance.")) + attendLesFonds,
    qui: t("nous"),
    fait: faits >= 1,
  });
  etapes.push({
    cle: "servi",
    nom: nonServi ? t("Non servi") : fonds ? t("Exécuté") : t("Servi"),
    dit: nonServi
      ? t("Rien n'a été débité : ce qui était mis de côté vous revient.")
      : fonds
        ? t(intent.type === "rachat" ? "Produit connu, avis d'opéré envoyé." : "Nombre de parts connu, avis d'opéré envoyé.")
        : t("Vous êtes averti du prix et de la quantité, sur WhatsApp et par e-mail."),
    qui: fonds ? t("fonds") : t("marché"),
    fait: faits >= 2,
  });
  if (!nonServi) {
    etapes.push({
      cle: "regle",
      nom: intent.type === "souscription" ? t("Parts inscrites") : reduit ? t("Produit viré") : t("Réglé"),
      dit: (intent.type === "souscription" ? t("Au registre du fonds, à votre nom.") : reduit ? t("Sur votre compte de règlement.") : t("Titres inscrits à votre nom.")) + jours,
      qui: t("nous"),
      fait: faits >= 3,
    });
  }
  const courante = etapes.findIndex((e) => !e.fait);

  return (
    <section className={pageStyles.recap} aria-label={t("Ce qui se passe maintenant")}>
      <div className={pageStyles.recapH}>{t("Ce qui se passe maintenant")}</div>
      <ol className={styles.liste}>
        {etapes.map((e, i) => (
          <li key={e.cle} className={`${styles.etape} ${e.fait ? styles.fait : ""} ${i === courante ? styles.cours : ""}`} aria-current={i === courante ? "step" : undefined}>
            <span className={styles.rond} aria-hidden="true">
              {e.fait ? "✓" : ""}
            </span>
            <span>
              <b className={styles.nom}>{e.nom}</b>
              <span className={styles.dit}>{e.dit}</span>
            </span>
            <span className={styles.qui}>{e.qui}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
