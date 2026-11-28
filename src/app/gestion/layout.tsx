import { EnteteGestion } from "@/components/gestion/EnteteGestion";
import { requireGestionnaire } from "@/lib/gestionnaire-donnees";

/** Chaque page de l'espace gestionnaire demande une session et un accès actif posé par la direction. */
export default async function GestionLayout({ children }: { children: React.ReactNode }) {
  const { acces } = await requireGestionnaire();
  return (
    <>
      <EnteteGestion nom={acces.nom} />
      {children}
    </>
  );
}
