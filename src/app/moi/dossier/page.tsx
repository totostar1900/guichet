import { requireSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { getT } from "@/i18n/server";
import { Rubriques } from "@/components/mobile/Rubriques";
import { COMPTE_PAGES } from "@/lib/nav-groups";
import { STATUS_LABEL } from "@/lib/kyc/checklist";
import styles from "@/components/Feuillet.module.css";
import { Glissement } from "@/components/mobile/Glissement";
import { EnTete } from "@/components/EnTete";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const t = await getT();
  return { title: t("Mon dossier") };
}

/**
 * MON DOSSIER : LES PIÈCES ET LE PROFIL D'INVESTISSEUR, AU MÊME ENDROIT (19 novembre 2026, planche « Compte, connexion et textes », 3A).
 * Le dossier d'ouverture et le questionnaire d'adéquation sont les deux choses que la maison tient « sur vous » pour vous servir : elles avaient chacune leur rubrique au sommaire du compte. Elles se rangent ici, lues dans la même table que le sommaire (`COMPTE_PAGES`, entrées « sousDe: dossier »).
 */
export default async function DossierPage() {
  const s = await requireSession("/moi/dossier");
  const t = await getT();
  const fiche = await repo().getClientFileByUser(s.userId).catch(() => undefined);
  const etat: Record<string, string | undefined> = { pieces: fiche ? t(STATUS_LABEL[fiche.status]) : undefined };
  return (
    <Glissement>
      <div className={styles.page}>
        <EnTete surTitre={t("Vous")} titre={t("Mon dossier")} phrase={t("Vos pièces d'ouverture, et votre profil d'investisseur.")} />
        <Rubriques
          items={COMPTE_PAGES.filter((p) => p.sousDe === "dossier").map((p) => ({
            href: p.href,
            nom: t(p.label),
            quoi: t(p.hint),
            etiquette: etat[p.key],
          }))}
        />
      </div>
    </Glissement>
  );
}
