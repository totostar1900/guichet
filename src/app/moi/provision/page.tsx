import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { SETTLEMENT } from "@/lib/config";
import { cashPosition, referenceDeProvision } from "@/lib/domain/cash";
import { getT } from "@/i18n/server";
import { fmt, fmtDate } from "@/lib/format";
import { DemanderVersement } from "@/app/DemanderVersement";
import { PlacerLaProvision } from "./PlacerLaProvision";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Votre provision") };
}

/**
 * LE DOMICILE DU SOLDE, ET IL N'EN AVAIT PAS.
 *
 * Le disponible se lisait en trois endroits : un chiffre dans la console, un
 * compteur dans Trader, une ligne sur la page du réinvestissement. Trois
 * lectures, aucune adresse : rien ne disait comment l'alimenter, ce qui était
 * mis de côté et pour quel ordre, ni combien de temps un versement demandé
 * mettrait à partir. Un solde qu'on voit sans pouvoir agir dessus n'est pas
 * un service, c'est un chiffre.
 *
 * LA PAGE DIT LES TROIS ÉTATS DE L'ARGENT, parce qu'ils ne se confondent pas :
 * ce qui est disponible, ce qui est mis de côté par un ordre signé, et ce qui
 * est placé en parts de fonds. Le total est à lui seul la réponse à « combien
 * la maison me doit ».
 */
export default async function ProvisionPage() {
  const t = await getT();
  const s = await requireSession("/moi/provision");
  const r = repo();
  const [cash, intents, offers, payouts] = await Promise.all([
    r.listCash(s.userId).catch(() => []),
    r.listIntents(),
    r.listOffers(),
    r.listPayouts({ userId: s.userId }).catch(() => []),
  ]);
  const mine = intents.filter((i) => i.clientId === s.userId);
  const poche = cashPosition(cash, mine);
  const reserves = mine
    .filter((i) => i.coveredAt && i.state !== "reglee" && i.state !== "annulee" && i.state !== "non_servie")
    .map((i) => ({ i, titre: offers.find((o) => o.id === i.offerId)?.title ?? i.offerId }));
  const derniereDemande = payouts.find((p) => p.state === "demandee") ?? [...payouts].sort((x, y) => y.askedAt.localeCompare(x.askedAt))[0];
  /* Le fonds monétaire où placer : le plus court du catalogue ouvert. La page
     ne choisit pas pour le client, elle lui montre ce qui existe. */
  const monetaires = offers.filter((o) => o.kind === "FONDS" && !o.hidden && o.fund?.distributed && /mon(é|e)taire|trésorerie/i.test(`${o.title} ${o.fund?.category ?? ""}`));
  const reference = referenceDeProvision(s.userId);

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <div className="eyebrow">{t("Votre argent chez nous")}</div>
        <h1 className="display">{t("Votre provision")}</h1>
        <p className={styles.lead}>
          {t(
            "Ce que vous laissez ici règle vos ordres sans attendre un virement. Elle n'est jamais obligatoire : vous pouvez payer chaque ordre au coup par coup. Elle reste votre argent, sur un compte séparé de celui de la maison.",
          )}
        </p>
      </div>

      <section className={styles.etats}>
        <div className={styles.etat}>
          <span className={styles.etiquette}>{t("Disponible")}</span>
          <b className={styles.grand}>{fmt(Math.round(poche.idle))}</b>
          <small>{t("FCFA, pour votre prochain ordre")}</small>
        </div>
        <div className={styles.etat}>
          <span className={styles.etiquette}>{t("Mis de côté")}</span>
          <b className={styles.grand}>{fmt(Math.round(poche.reserve))}</b>
          <small>{t("par vos ordres signés")}</small>
        </div>
        <div className={styles.etat}>
          <span className={styles.etiquette}>{t("Total")}</span>
          <b className={styles.grand}>{fmt(Math.round(poche.balance))}</b>
          <small>{t("ce que la maison vous doit")}</small>
        </div>
      </section>

      {reserves.length > 0 && (
        <section className={styles.bloc}>
          <h2>{t("Ce qui est mis de côté, et pour quoi")}</h2>
          {/* UN MONTANT RÉSERVÉ SANS SON ORDRE EST UNE RETENUE INEXPLIQUÉE.
              C'est le seul endroit où le client peut vérifier que son argent
              n'est pas immobilisé par une opération qu'il a oubliée. */}
          <ul className={styles.liste}>
            {reserves.map(({ i, titre }) => (
              <li key={i.id}>
                <Link href={`/moi/ordres/${i.id}`}>
                  <span>
                    <b>{titre}</b>
                    <small>
                      {t("Ordre")} <span className="mono">{i.ref}</span> · {t("signé le {d}", { d: fmtDate(i.signedAt ?? i.coveredAt!) })}
                    </small>
                  </span>
                  <b className={styles.montant}>{fmt(Math.round(i.coveredAmount ?? 0))} FCFA</b>
                </Link>
              </li>
            ))}
          </ul>
          <p className={styles.note}>{t("Cette somme reste sur votre solde : elle n'en sort qu'au règlement de l'opération, et ce qui n'est pas consommé y revient.")}</p>
        </section>
      )}

      <section className={styles.bloc}>
        <h2>{t("L'alimenter")}</h2>
        <p className={styles.note}>{t("Virez depuis un compte à votre nom, en portant ce motif. C'est lui qui rattache votre virement à votre compte : sans lui, il arrive sans nom.")}</p>
        <dl className={styles.coord}>
          <div>
            <dt>{t("Motif du virement")}</dt>
            <dd>
              <b className="mono">{reference}</b>
            </dd>
          </div>
          <div>
            <dt>{t("Bénéficiaire")}</dt>
            <dd>{SETTLEMENT.beneficiary}</dd>
          </div>
          <div>
            {/* PAS « Banque » TOUT COURT : cette clef est déjà le secteur d une
                société cotée, traduit « Banking ». Un mot seul fait une clef
                fragile, et la maison s est deja fait prendre. */}
            <dt>{t("Banque du bénéficiaire")}</dt>
            <dd>{SETTLEMENT.bank}</dd>
          </div>
          <div>
            <dt>{t("RIB / IBAN")}</dt>
            <dd className="mono">{SETTLEMENT.iban}</dd>
          </div>
        </dl>
      </section>

      <PlacerLaProvision disponible={Math.round(poche.idle)} fonds={monetaires.map((o) => ({ id: o.id, titre: o.title, gestionnaire: o.fund?.manager ?? o.issuer }))} />

      <section className={styles.bloc}>
        <h2>{t("Le reprendre")}</h2>
        <p className={styles.note}>
          {t("Votre solde disponible vous est versé sur demande, sur le compte bancaire déclaré à l'ouverture et sur lui seul. Il part dans les soixante-douze heures ouvrables qui suivent votre demande.")}
        </p>
        <DemanderVersement montant={poche.idle} demande={derniereDemande} />
      </section>
    </div>
  );
}
