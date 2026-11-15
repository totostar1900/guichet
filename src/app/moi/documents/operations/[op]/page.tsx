import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { getT } from "@/i18n/server";
import { chargerLesRayons } from "../../rayons";
import { groupesDesOperations, HORS_OPERATION } from "../groupes";
import { Ligne } from "../../Ligne";
import styles from "../../page.module.css";
import { Glissement } from "@/components/mobile/Glissement";
import { EnTete } from "@/components/EnTete";

export const dynamic = "force-dynamic";

/**
 * LES PAPIERS D'UNE OPÉRATION, sur leur page (décision du 15 novembre 2026, « même geste partout ») : ils se dépliaient sur place sous un chevron.
 * Du plus ancien au plus récent, dans l'ordre où ils sont tombés. Le retour est la liste des opérations (nav-parent retire le dernier segment).
 */
export default async function OperationPage({ params }: { params: Promise<{ op: string }> }) {
  const { op: id } = await params;
  const t = await getT();
  const s = await requireSession(`/moi/documents/operations/${id}`);
  const { desOperations, ops } = await chargerLesRayons(s.userId, t);
  const { groupes, orphelins } = groupesDesOperations(desOperations, ops);
  const hors = id === HORS_OPERATION;
  const groupe = groupes.find((g) => g.op.id === id);
  if (!hors && !groupe) notFound();
  if (hors && !orphelins.length) notFound();
  const rows = hors ? orphelins : groupe!.rows;
  return (
    <Glissement>
      <div className={styles.page}>
        <EnTete
          surTitre={t("Mes papiers")}
          titre={hors ? t("Hors opération") : groupe!.op.titre}
          phrase={hors ? t("des papiers dont l'opération n'est plus au catalogue") : groupe!.op.sous}
        />
        <div>
          {rows.map((d) => (
            <Ligne key={d.id} titre={d.titre} sous={d.sous} etat={d.etat} ton={d.ton} geste={d.geste} />
          ))}
        </div>
      </div>
    </Glissement>
  );
}
