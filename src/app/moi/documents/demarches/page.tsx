import { requireSession } from "@/lib/auth";
import { getT } from "@/i18n/server";
import { Ligne } from "../Ligne";
import { chargerLesRayons } from "../rayons";
import { Rayon, titreDuRayon } from "../Rayon";

export const dynamic = "force-dynamic";
export const generateMetadata = () => titreDuRayon("demarches");

/** Ce qu'on ouvre quand quelque chose ne va pas : la porte d'une réclamation reste au bas du rayon, même sans démarche en cours. */
export default async function DemarchesPage() {
  const t = await getT();
  const s = await requireSession("/moi/documents/demarches");
  const { demarches } = await chargerLesRayons(s.userId, t);
  return (
    <Rayon cle="demarches">
      {demarches.map((d) => (
        <Ligne key={d.id} titre={d.titre} sous={d.sous} geste={d.geste} />
      ))}
      <Ligne
        titre={t("Déposer une réclamation")}
        sous={t("une réponse écrite, puis la médiation COSUMAF si rien ne va")}
        geste={{ label: t("Ouvrir une démarche"), href: "/moi/reclamation" }}
      />
    </Rayon>
  );
}
