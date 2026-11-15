import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { getT } from "@/i18n/server";
import { fmt } from "@/lib/format";
import { lireLesMandats } from "./donnees";
import styles from "./page.module.css";
import { Glissement } from "@/components/mobile/Glissement";
import { EnTete } from "@/components/EnTete";
import { EnBref } from "@/components/EnBref";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Autoriser un prélèvement") };
}

/**
 * AUTORISER UN PRÉLÈVEMENT EST UN SOMMAIRE (décision du 15 novembre 2026, option A : « même geste partout »).
 *
 * La page mêlait quatre métiers sur 1 449 px : signer un mandat en attente, lire ceux qui sont en place, en ajouter un, relire l'historique. Elle les range : une tuile par
 * mandat, qui dit où il en est, une tuile pour en mettre un en place (la provision, par le même parcours que l'épargne), et une pour l'historique. Chaque mandat a sa page,
 * avec le seul geste qu'il attend. Une tuile qui attend un geste le porte sur elle.
 *
 * Les anciennes adresses restent valables : « ?instruction= » mène au mandat de cette épargne, « ?de=argent » à la mise en place d'une provision.
 */
export default async function PrelevementsPage({ searchParams }: { searchParams: Promise<{ instruction?: string; de?: string }> }) {
  const sp = await searchParams;
  const t = await getT();
  const s = await requireSession("/moi/prelevements");
  const { mandats, vus, provisionLibre } = await lireLesMandats(s.userId);

  const demande = sp.instruction ? mandats.find((m) => m.standingId === sp.instruction && m.state !== "revoque") : undefined;
  if (demande) redirect(`/moi/prelevements/${demande.id}`);
  if ((sp.de === "argent" || sp.de === "alimenter") && provisionLibre) redirect("/moi/prelevements/nouveau");

  const ETAT: Record<string, string> = {
    a_signer: t("à signer"),
    copie_attendue: t("copie attendue"),
    en_verification: t("en vérification"),
    copie_refusee: t("copie refusée"),
  };
  const vivants = vus.filter((m) => m.etat !== "revoque");
  const tuiles: { href: string; nom: string; dit: string; attend?: string }[] = vivants.map((m) => ({
    href: `/moi/prelevements/${m.id}`,
    nom: m.objet === "provision" ? t("Ma provision") : m.fonds ? t("Mon épargne vers {f}", { f: m.fonds }) : t("Mon épargne programmée"),
    dit: `${fmt(m.montant)} FCFA${m.jour != null ? ` · ${t("le {j} de chaque mois", { j: String(m.jour) })}` : ""}${m.etat === "suspendu" ? ` · ${t("arrêté")}` : m.etape === "actif" ? ` · ${t("actif")}` : ""}`,
    attend: m.etape !== "actif" ? ETAT[m.etape] : undefined,
  }));
  if (provisionLibre) {
    tuiles.push({ href: "/moi/prelevements/nouveau", nom: t("Mettre un prélèvement en place"), dit: t("Alimenter votre provision chaque mois, par prélèvement sur votre compte bancaire."), attend: vivants.length === 0 ? t("rien en place") : undefined });
  }
  tuiles.push({ href: "/moi/prelevements/historique", nom: t("Mes prélèvements"), dit: t("Ce qui est passé, et les mandats révoqués.") });

  return (
    <Glissement>
      <div className={styles.wrap}>
        <EnTete
          surTitre={t("Payer sans y penser")}
          titre={t("Autoriser un prélèvement")}
          phrase={t("Vous nous autorisez à prélever une somme sur votre compte bancaire, à une date fixe du mois. Chaque prélèvement est annoncé avant de partir, et vous révoquez votre autorisation à tout moment, sans motif.")}
          aCote={<EnBref brief="prelevement" />}
        />
        <div className={styles.tuiles}>
          {tuiles.map((x) => (
            <Link key={x.href} href={x.href} className={styles.tuile}>
              <span>
                <b>{x.nom}</b>
                <small>{x.dit}</small>
              </span>
              {x.attend && <em className={styles.attend}>{x.attend}</em>}
              <i aria-hidden="true">›</i>
            </Link>
          ))}
        </div>
      </div>
    </Glissement>
  );
}
