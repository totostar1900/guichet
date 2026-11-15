import { redirect } from "next/navigation";
import { EpargneParcours } from "@/components/EpargneParcours";
import { requireSession } from "@/lib/auth";
import { getT } from "@/i18n/server";
import { aucunCanalPossible, canalDuCode } from "@/lib/kyc/canal";
import { localIso } from "@/lib/format";
import { lireLesMandats } from "../donnees";
import styles from "../page.module.css";
import { Glissement } from "@/components/mobile/Glissement";
import { EnTete } from "@/components/EnTete";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Mettre un prélèvement en place") };
}

/**
 * METTRE UN PRÉLÈVEMENT EN PLACE : la provision, par le même parcours que l'épargne (15 novembre 2026, option A · 1 : oui) : la somme et le jour, le compte, le code,
 * la signature, puis l'exemplaire signé à la main. Un mandat par usage : si la provision est déjà couverte, on atterrit sur le sommaire.
 */
export default async function NouveauPrelevementPage() {
  const t = await getT();
  const s = await requireSession("/moi/prelevements/nouveau");
  const { fiche, provisionLibre } = await lireLesMandats(s.userId);
  if (!provisionLibre) redirect("/moi/prelevements");
  const canal = fiche ? await canalDuCode(s.userId, fiche) : undefined;
  const empeche = !fiche ? "dossier" : aucunCanalPossible(canal) ? "adresse" : undefined;
  return (
    <Glissement>
      <div className={styles.wrap}>
        <EnTete titre={t("Mettre un prélèvement en place")} phrase={t("La somme et le jour se choisissent ici. Elle alimentera votre provision, chaque mois.")} />
        <EpargneParcours
          usage="provision"
          fonds={[]}
          aujourdhui={localIso(new Date())}
          titulaire={fiche?.identity.name ?? s.name}
          banque={fiche?.funds.bankName ?? ""}
          compte={fiche?.funds.bankAccount ?? ""}
          apres="/moi/prelevements"
          empeche={empeche}
        />
      </div>
    </Glissement>
  );
}
