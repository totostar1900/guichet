import { requireSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { getT } from "@/i18n/server";
import { JOUR_MAX, JOUR_MIN } from "@/lib/domain/mandat";
import { MOTIFS } from "@/lib/domain/prelevement";
import { fmt, fmtDate } from "@/lib/format";
import { aucunCanalPossible, canalDuCode } from "@/lib/kyc/canal";
import { MesMandats } from "./MesMandats";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Vos prélèvements") };
}

/**
 * LE DOMICILE DES MANDATS DE PRÉLÈVEMENT.
 *
 * Tout le reste de la plateforme va dans un sens : le client signe, puis il
 * vire. Ici la maison tire, sur une autorisation donnée une fois. Une page à
 * part, et non une case au fond d'un formulaire : on ne glisse pas une
 * autorisation de débit dans un écran qui parle d'autre chose.
 *
 * Deux décisions de la maison s'y lisent sans être expliquées : un mandat par
 * usage, et un calendrier, jamais un tirage à la demande.
 */
export default async function PrelevementsPage({ searchParams }: { searchParams: Promise<{ instruction?: string }> }) {
  /* On arrive parfois d'une épargne programmée qu'on vient de signer, en ayant
     choisi « prélevez-moi » : le formulaire s'ouvre sur elle, au lieu de la
     faire retrouver dans une liste. */
  const demandee = (await searchParams).instruction;
  const t = await getT();
  const s = await requireSession("/moi/prelevements");
  const r = repo();
  const [mandats, standing, fiche, tirages] = await Promise.all([
    r.listMandats(s.userId),
    r.listStandingOrders(s.userId).catch(() => []),
    r.getClientFileByUser(s.userId),
    r.listTirages({ userId: s.userId }).catch(() => []),
  ]);
  const canal = fiche ? await canalDuCode(s.userId, fiche) : undefined;
  /* Injoignable : un mandat signé ici ne tirerait jamais rien, puisque rien ne
     part sans que son préavis soit parti. La page le dit avant, et non après
     un code demandé pour rien. */
  const injoignable = aucunCanalPossible(canal);
  const instructions = standing.filter((x) => x.state === "active" && x.source === "virement").map((x) => ({ id: x.id, ref: x.ref, montant: x.amount, jour: x.dayOfMonth }));

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <div className="eyebrow">{t("Payer sans y penser")}</div>
        <h1 className="display">{t("Vos prélèvements")}</h1>
        <p className={styles.lead}>
          {t(
            "Vous pouvez nous autoriser à prélever une somme sur votre compte bancaire, à une date fixe du mois. C'est vous qui fixez le plafond, et nous ne le dépassons jamais. Chaque prélèvement est annoncé avant de partir, et vous pouvez révoquer votre autorisation à tout moment, sans motif.",
          )}
        </p>
      </div>

      {/* LE COMPTE DÉBITÉ EST CELUI DU CLIENT, et la page le redit là où il va
          le saisir : c'est la règle de la convention sur l'origine des fonds,
          et c'est elle qui empêche la plateforme de servir à déplacer
          l'argent d'un compte vers un autre. */}
      <MesMandats
        instructionDemandee={demandee}
        mandats={mandats.map((m) => ({
          id: m.id,
          ref: m.ref,
          objet: m.objet,
          titulaire: m.accountHolder,
          banque: m.bankName,
          compte: m.bankAccount,
          plafond: m.maxAmount,
          montant: m.amount,
          jour: m.dayOfMonth,
          etat: m.state,
          signeLe: m.signedAt,
          codeEnvoyeA: m.pendingCodeTo,
          codeEnvoyeLe: m.pendingCodeAt,
          revoqueLe: m.revokedAt,
        }))}
        instructions={instructions}
        titulaireParDefaut={fiche?.identity.name ?? s.name}
        banqueParDefaut={fiche?.funds.bankName ?? ""}
        compteParDefaut={fiche?.funds.bankAccount ?? ""}
        canal={canal ? { to: canal.to, parMail: canal.channel === "email" } : undefined}
        dossier={Boolean(fiche)}
        injoignable={injoignable}
        jourMin={JOUR_MIN}
        jourMax={JOUR_MAX}
      />

      {/* CE QUI EST ANNONCÉ, ET CE QUI EST ARRIVÉ.
          La page promettait « chaque prélèvement est annoncé avant de partir »
          et ne montrait aucun prélèvement : la promesse vivait dans un message
          que le client reçoit une fois et qu'il perd. Un rejet, surtout, doit
          se relire ici : sa banque le lui a peut-être facturé, et deviner
          pourquoi n'est pas à lui de le faire. */}
      {tirages.length > 0 && (
        <section className={styles.bloc}>
          <h2>{t("Vos prélèvements")}</h2>
          <ul className={styles.tirages}>
            {tirages.slice(0, 12).map((x) => {
              const m = mandats.find((y) => y.id === x.mandatId);
              return (
                <li key={x.id}>
                  <span className={styles.tQuand}>{fmtDate(x.dueOn)}</span>
                  <b className={styles.tMontant}>{t("{m} FCFA", { m: fmt(x.amount) })}</b>
                  <span className={styles.tQuoi}>{m?.objet === "instruction" ? t("Épargne programmée") : t("Provision")}</span>
                  <span className={x.state === "rejete" ? styles.tRejet : x.state === "encaisse" ? styles.tOk : styles.tAttente}>
                    {x.state === "encaisse"
                      ? t("reçu")
                      : x.state === "rejete"
                        ? t(MOTIFS[x.rejectCode ?? "autre"].auClient)
                        : x.state === "remis"
                          ? t("présenté à votre banque")
                          : x.announcedAt
                            ? t("annoncé, à venir")
                            : t("à venir")}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
