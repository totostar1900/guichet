import { EpargneParcours } from "@/components/EpargneParcours";
import { requireSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { getT } from "@/i18n/server";
import { aucunCanalPossible, canalDuCode } from "@/lib/kyc/canal";
import { lireLEpargne } from "../donnees";
import styles from "../page.module.css";
import { Glissement } from "@/components/mobile/Glissement";
import { EnTete } from "@/components/EnTete";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mettre une épargne en place" };

/**
 * METTRE UNE ÉPARGNE EN PLACE : le parcours en quatre pages, seul sur sa page. La fiche d'un fonds renvoie ici avec le sien déjà choisi (« ?fonds= »), et une fois
 * le mandat signé on atterrit sur la liste de ce qui est en place. Par prélèvement seul : sans dossier ni adresse où recevoir le code, la page le dit avant de faire remplir.
 */
export default async function NouvellePage({ searchParams }: { searchParams: Promise<{ fonds?: string }> }) {
  const s = await requireSession("/moi/epargne/nouvelle");
  const t = await getT();
  const sp = await searchParams;
  const { fonds, aujourdHui } = await lireLEpargne(s.userId);
  const fiche = await repo().getClientFileByUser(s.userId);
  const canal = fiche ? await canalDuCode(s.userId, fiche) : undefined;
  const empeche = !fiche ? "dossier" : aucunCanalPossible(canal) ? "adresse" : undefined;
  const choisi = fonds.find((f) => f.id === sp.fonds) ?? fonds[0];
  return (
    <Glissement>
      <div className={styles.page}>
        <EnTete titre={t("Mettre une épargne en place")} phrase={t("Le fonds, la somme et le jour se choisissent ici.")} />
        {fonds.length ? (
          <EpargneParcours
            fonds={fonds}
            fondsInitial={choisi?.id}
            aujourdhui={aujourdHui}
            titulaire={fiche?.identity.name ?? s.name}
            banque={fiche?.funds.bankName ?? ""}
            compte={fiche?.funds.bankAccount ?? ""}
            apres="/moi/epargne"
            empeche={empeche}
          />
        ) : (
          <p className="muted">{t("Aucun fonds n'est ouvert à la souscription en ce moment : l'épargne se programmera dès qu'il y en aura un.")}</p>
        )}
      </div>
    </Glissement>
  );
}
