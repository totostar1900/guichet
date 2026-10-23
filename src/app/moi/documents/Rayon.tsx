import { getT } from "@/i18n/server";
import { Glissement } from "@/components/mobile/Glissement";
import { EnTete } from "@/components/EnTete";
import { RAYONS_DES_PAPIERS, type CleDeRayon } from "./nav";
import styles from "./page.module.css";

/**
 * LA COQUILLE D'UN RAYON, pour que les quatre pages aient le même en-tête.
 *
 * L'étalon le dit en quatre créneaux et dans cet ordre : le retour, le
 * sur-titre qui dit où l'on est, le titre, la phrase. Écrit quatre fois, cet
 * en-tête aurait dérivé à la première page retouchée — c'est exactement ce que
 * le relevé des treize pages avait trouvé ailleurs dans la maison, trois
 * grammaires pour un même créneau.
 *
 * Le nom et la phrase viennent de la table des rayons, celle-là même que le
 * sommaire lit : la page et la bande qui y mène ne peuvent donc pas se
 * contredire.
 */
export async function Rayon({ cle, children }: { cle: CleDeRayon; children: React.ReactNode }) {
  const t = await getT();
  const rayon = RAYONS_DES_PAPIERS.find((r) => r.cle === cle);
  if (!rayon) throw new Error(`rayon inconnu : ${cle}`);
  return (
    <Glissement>
      <div className={styles.page}>
        <EnTete retour={{ href: "/moi/documents", mot: t("Mes documents") }} surTitre={t("Vos papiers")} titre={t(rayon.nom)} phrase={t(rayon.quoi)} />
        {children}
      </div>
    </Glissement>
  );
}

/** Le titre de l'onglet, du même mot que la page et que la bande qui y mène. */
export async function titreDuRayon(cle: CleDeRayon) {
  const t = await getT();
  return { title: t(RAYONS_DES_PAPIERS.find((r) => r.cle === cle)?.nom ?? "Mes documents") };
}
