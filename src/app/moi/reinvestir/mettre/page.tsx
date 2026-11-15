import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { getT } from "@/i18n/server";
import { lireLeReinvestissement } from "../donnees";
import { ReinvestForm } from "../ReinvestForm";
import styles from "../page.module.css";
import { Glissement } from "@/components/mobile/Glissement";
import { EnTete } from "@/components/EnTete";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mettre le réinvestissement en place" };

/**
 * LE SEUL GESTE DU RÉINVESTISSEMENT, seul sur sa page. Un usage déjà couvert n'est plus proposé : avec une instruction active, on atterrit sur elle
 * (deux instructions sur la même poche se disputeraient le même encaissement). Une fois posée, on atterrit sur la liste.
 */
export default async function MettrePage() {
  const s = await requireSession("/moi/reinvestir/mettre");
  const t = await getT();
  const { active, fonds } = await lireLeReinvestissement(s.userId);
  if (active) redirect("/moi/reinvestir/instruction");
  return (
    <Glissement>
      <div className={styles.page}>
        <EnTete titre={t("Mettre le réinvestissement en place")} phrase={t("La ligne se choisit maintenant ; le montant sera celui du coupon.")} />
        <ReinvestForm fonds={fonds} apres="/moi/reinvestir/instruction" />
      </div>
    </Glissement>
  );
}
