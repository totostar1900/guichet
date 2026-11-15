import { StandingForm } from "@/components/Standing";
import { requireSession } from "@/lib/auth";
import { getT } from "@/i18n/server";
import { lireLEpargne } from "../donnees";
import styles from "../page.module.css";
import { Glissement } from "@/components/mobile/Glissement";
import { EnTete } from "@/components/EnTete";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mettre une épargne en place" };

/**
 * METTRE UNE ÉPARGNE EN PLACE : le formulaire, seul sur sa page. La fiche d'un fonds renvoie ici avec le sien déjà choisi (« ?fonds= »), et une fois
 * l'épargne posée on atterrit sur la liste de ce qui est en place.
 */
export default async function NouvellePage({ searchParams }: { searchParams: Promise<{ fonds?: string }> }) {
  const s = await requireSession("/moi/epargne/nouvelle");
  const t = await getT();
  const sp = await searchParams;
  const { fonds, aujourdHui } = await lireLEpargne(s.userId);
  const choisi = fonds.find((f) => f.id === sp.fonds) ?? fonds[0];
  return (
    <Glissement>
      <div className={styles.page}>
        <EnTete titre={t("Mettre une épargne en place")} phrase={t("Le fonds, la somme et le jour se choisissent ici.")} />
        {fonds.length ? (
          <StandingForm fonds={fonds} fondsInitial={choisi?.id} minimum={choisi?.min ?? 0} aujourdhui={aujourdHui} apres="/moi/epargne/en-place" />
        ) : (
          <p className="muted">{t("Aucun fonds n'est ouvert à la souscription en ce moment : l'épargne se programmera dès qu'il y en aura un.")}</p>
        )}
      </div>
    </Glissement>
  );
}
