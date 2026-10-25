import { requireSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { getT } from "@/i18n/server";
import { JOUR_MAX, JOUR_MIN } from "@/lib/domain/mandat";
import { MOTIFS } from "@/lib/domain/prelevement";
import { fmt, fmtDate } from "@/lib/format";
import { aucunCanalPossible, canalDuCode } from "@/lib/kyc/canal";
import { MesMandats } from "./MesMandats";
import styles from "./page.module.css";
import { Glissement } from "@/components/mobile/Glissement";
import { EnTete } from "@/components/EnTete";

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
    <Glissement>
      <div className={styles.wrap}>
        <EnTete
          surTitre={t("Payer sans y penser")}
          titre={t("Vos prélèvements")}
          /* LE PLAFOND EST PARTI DE LA PHRASE D'OUVERTURE, le 25 octobre 2026.
             Il se disait trois fois sur un même écran — ici, sous le champ du
             montant (« ce montant est aussi votre plafond »), et sur chaque
             carte d'autorisation (« plafond par échéance »). Pour la provision,
             le plafond VAUT le montant que le client écrit : l'annoncer comme
             un réglage à part faisait chercher un second champ qui n'existe
             pas. Ce qui reste en tête, ce sont les deux promesses qui ne se
             lisent nulle part ailleurs : on annonce avant, et on s'arrête sur
             demande. */
          phrase={t(
            "Vous pouvez nous autoriser à prélever une somme sur votre compte bancaire, à une date fixe du mois. Chaque prélèvement est annoncé avant de partir, et vous pouvez révoquer votre autorisation à tout moment, sans motif.",
          )}
        />

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
            montant: m.amount,
            jour: m.dayOfMonth,
            etat: m.state,
            signeLe: m.signedAt,
            /* L'EXEMPLAIRE, PAR SON ADRESSE. La carte promettait « votre
               exemplaire est dans vos documents » sans y mener : le client
               devait traverser trois écrans pour trouver la pièce que sa
               banque lui demande. */
            piece: m.docId,
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
    </Glissement>
  );
}
