import { Accueil } from "./Accueil";
import { Console } from "./Console";
import { Dossier } from "./Dossier";
import { getSession } from "@/lib/auth";
import { surSonDossier } from "@/lib/auth/types";
import { Vu } from "@/components/Vu";

export const dynamic = "force-dynamic";

/**
 * La racine, et ce qu'elle devient selon qui regarde.
 *
 * Elle portait la liste des titres. C'était le défaut de fond de la
 * plateforme : rangée par instrument, elle sert l'acquisition, et un visiteur
 * y tombait sur un catalogue sans savoir chez qui il était. Un client, lui, ne
 * vient pas parcourir : il vient agir, et neuf services construits n'avaient
 * aucune surface qui les porte.
 *
 * Déconnecté : la présentation, qui mène par les services et par le marché.
 * Connecté : la console, qui mène par ce qui attend une décision.
 *
 * ET ENTRE LES DEUX, L'ÉTAT QU'ON AVAIT OUBLIÉ. Un compte créé dont le dossier
 * n'est pas passé n'est ni un visiteur ni un client. Il recevait pourtant la
 * console : un portefeuille à zéro, un relevé de rien, et une pastille grise
 * au milieu. Il a maintenant son écran, qui dit où en est son dossier, ce qui
 * est déjà ouvert, et ce qui ne l'est pas encore.
 */
export default async function RacinePage() {
  const session = await getSession();
  if (!session) return <Accueil />;
  if (surSonDossier(session)) return <Dossier session={session} />;
  return (
    <>
      {/* Le passage du client, une ligne par jour : c'est ce qui sépare un
          compte actif d'un compte dormant, et rien d'autre ne le dit. */}
      <Vu geste="vu.portefeuille" objet="portefeuille" />
      <Console session={session} />
    </>
  );
}
