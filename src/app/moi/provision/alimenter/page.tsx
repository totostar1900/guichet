import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { SETTLEMENT } from "@/lib/config";
import { referenceDeProvision } from "@/lib/domain/cash";
import { prochaineEcheance, PREAVIS_JOURS } from "@/lib/domain/prelevement";
import { getT } from "@/i18n/server";
import { fmt, fmtDate, localIso } from "@/lib/format";
import { Copier } from "../Copier";
import styles from "../page.module.css";
import { Glissement } from "@/components/mobile/Glissement";
import { EnTete } from "@/components/EnTete";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Approvisionner votre compte") };
}

/**
 * APPROVISIONNER VOTRE COMPTE : LES DEUX CHEMINS, ET RIEN D'AUTRE.
 *
 * Ce bloc était le premier de quatre gestes empilés sur la page de la
 * provision : le motif, le bénéficiaire, la banque, le RIB, quatre boutons
 * « copier », puis le chemin du prélèvement — et, cinq cents pixels plus bas,
 * un champ de montant pour placer et un second pour se faire virer. Garnir un
 * compte, souscrire un fonds et demander un virement n'ont en commun que le
 * solde qu'ils déplacent : trois gestes sans rapport sur un écran.
 *
 * LE NOM DE LA PAGE, LE 25 OCTOBRE 2026. « L'alimenter » est le mot de la
 * maison pour ce qu'elle fait d'une provision ; « approvisionner son compte »
 * est celui du client, et c'est le client qui cherche la page. Les deux ronds
 * qui y mènent ont suivi le verbe : une pastille qui dit « Alimenter » et une
 * page qui répond « Approvisionner » coûtent un essai, et un essai sur un
 * geste d'argent coûte la confiance.
 *
 * CE QUI SÉPARE LES DEUX CHEMINS N'EST PAS LEUR RYTHME, C'EST QUI AGIT.
 * « une fois » contre « chaque mois » laissait lire deux réglages du même
 * geste. Un virement part de la banque DU CLIENT, à son initiative, et la
 * maison ne fait que le reconnaître à son arrivée ; un prélèvement part de LA
 * MAISON, sur une autorisation que le client a signée. C'est la seule chose
 * qu'il faut avoir comprise avant de choisir, et elle est désormais écrite
 * sous chaque titre.
 *
 * LE MOTIF EST DESCENDU DANS LA LISTE, EN DERNIER. Il était seul dans un
 * encadré doré, au-dessus du bénéficiaire et du RIB : la place de ce qui
 * compte le plus, mais pas celle où l'on s'en sert. Un formulaire de banque
 * demande le bénéficiaire, puis la banque, puis le RIB, puis le motif ; les
 * quatre lignes se recopient maintenant dans cet ordre. Il garde sa teinte et
 * sa marque d'obligatoire sur sa ligne, parce qu'un virement qui arrive sans
 * lui arrive sans nom, et qu'il faut alors le retrouver à la main.
 *
 * LE PRÉLÈVEMENT SE MONTRE MÊME SANS MANDAT : une porte qui n'apparaît qu'à
 * ceux qui l'ont déjà franchie n'ouvre sur personne. Il se CHANGE là où il
 * vit, à /moi/prelevements : ce qu'on lit ici est un écho, pas un second
 * domicile.
 */
export default async function AlimenterPage() {
  const t = await getT();
  const s = await requireSession("/moi/provision/alimenter");
  const mandats = await repo()
    .listMandats(s.userId)
    .catch(() => []);
  const reference = referenceDeProvision(s.userId);
  const mandat = mandats.find((m) => m.objet === "provision" && m.state !== "revoque" && m.signedAt);
  const prochainTirage = mandat?.dayOfMonth ? prochaineEcheance(mandat.dayOfMonth, localIso(new Date())) : undefined;

  return (
    <Glissement>
      <div className={styles.wrap}>
        <EnTete
          retour={{ href: "/moi/provision", mot: t("Votre provision") }}
          /* Le retour dit « Votre provision » : le sur-titre dit la famille,
             pas le même mot — c'est celui que porte la page du solde. */
          surTitre={t("Votre argent chez nous")}
          titre={t("Approvisionner votre compte")}
          phrase={t("Deux chemins. Un virement quand vous voulez, ou une somme fixe chaque mois, sans y penser.")}
          aCote={mandat ? <span className={`${styles.etiq} ${styles.etiqOn}`}>{t("Prélèvement actif")}</span> : undefined}
        />

        <div className={styles.chemins}>
          <div className={styles.chemin}>
            <h2>
              {t("Par virement")} <span>{t("une fois")}</span>
            </h2>
            {/* QUI AGIT, et non à quel rythme : c'est la seule chose à avoir
                comprise avant de choisir entre les deux chemins. */}
            <p className={styles.qui}>{t("C'est vous qui l'envoyez, depuis votre banque, quand vous voulez. Nous le reconnaissons à son arrivée.")}</p>
            <dl className={styles.coord}>
              <div>
                <dt>{t("Bénéficiaire")}</dt>
                <dd>
                  <span>{SETTLEMENT.beneficiary}</span>
                  <Copier valeur={SETTLEMENT.beneficiary} quoi={t("le bénéficiaire")} />
                </dd>
              </div>
              <div>
                {/* PAS « Banque » TOUT COURT : cette clef est déjà le secteur
                    d'une société cotée, traduit « Banking ». Un mot seul fait
                    une clef fragile, et la maison s'est déjà fait prendre. */}
                <dt>{t("Banque du bénéficiaire")}</dt>
                <dd>
                  <span>{SETTLEMENT.bank}</span>
                  <Copier valeur={SETTLEMENT.bank} quoi={t("la banque")} />
                </dd>
              </div>
              <div>
                <dt>{t("RIB / IBAN")}</dt>
                <dd>
                  <span className="mono">{SETTLEMENT.iban}</span>
                  <Copier valeur={SETTLEMENT.iban} quoi={t("le RIB")} />
                </dd>
              </div>
              {/* LE MOTIF EN DERNIER : c'est son rang dans le formulaire de la
                  banque. Et marqué, parce que c'est la seule des quatre lignes
                  qu'on ne peut pas omettre. */}
              <div className={styles.ligneMotif}>
                <dt>
                  {t("Motif du virement")} <span>{t("obligatoire")}</span>
                </dt>
                <dd>
                  <b className="mono">{reference}</b>
                  <Copier valeur={reference} quoi={t("le motif du virement")} />
                </dd>
              </div>
            </dl>
            <p className={styles.avert}>
              {t("Les quatre lignes se recopient dans cet ordre dans le formulaire de votre banque.")} {t("Le motif rattache votre virement à votre compte : sans lui, il arrive sans nom. Le compte émetteur doit être au vôtre.")}
            </p>
          </div>

          <div className={styles.chemin}>
            <h2>
              {t("Par prélèvement")} <span>{t("chaque mois")}</span>
            </h2>
            <p className={styles.qui}>{t("C'est nous qui le prenons, sur votre compte en banque, sur une autorisation que vous avez signée.")}</p>
            {mandat ? (
              <>
                <div className={styles.encadre}>
                  <b>{mandat.amount ? t("{m} FCFA le {j} de chaque mois", { m: fmt(mandat.amount), j: String(mandat.dayOfMonth ?? "") }) : t("Mandat signé")}</b>
                  <br />
                  {t("Mandat")} <span className="mono">{mandat.ref}</span>
                  {mandat.signedAt ? `, ${t("signé le {d}", { d: fmtDate(mandat.signedAt, false) })}` : ""}
                  {prochainTirage ? ` · ${t("prochain prélèvement le {d}, annoncé {n} jours avant", { d: fmtDate(prochainTirage, false), n: String(PREAVIS_JOURS) })}` : ""}
                  {mandat.state === "suspendu" ? ` · ${t("suspendu après deux rejets : votre banque a refusé le prélèvement")}` : ""}
                </div>
                <div className={styles.gestesDeLEtat}>
                  <Link href="/moi/prelevements">{t("Changer le montant")}</Link>
                  <Link href="/moi/prelevements">{t("Révoquer le mandat")}</Link>
                </div>
                <p className={styles.avert}>{t("Chaque prélèvement est annoncé avant de partir, et nous ne prélevons jamais plus que le montant que vous avez signé.")}</p>
              </>
            ) : (
              <>
                <p className={styles.avert}>
                  {t("Faites venir une somme fixe chaque mois, sans y penser. Vous signez l'autorisation une fois ; chaque prélèvement vous est annoncé cinq jours avant, et jamais au-delà du montant signé.")}
                </p>
                <div className={styles.rangee}>
                  <Link className="btn sm" href="/moi/prelevements">
                    {t("Mettre en place un prélèvement")}
                  </Link>
                </div>
                <p className={styles.avert}>{t("Vous fixez le montant et le jour, et vous l'arrêtez quand vous voulez.")}</p>
              </>
            )}
          </div>
        </div>
      </div>
    </Glissement>
  );
}
