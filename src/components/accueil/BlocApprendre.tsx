import { TitreDeBloc } from "@/components/TitreDeBloc";
import { getT } from "@/i18n/server";
import { loadLessons } from "@/lib/reference";
import { ListeApprendre } from "./ListeApprendre";

/**
 * « APPRENDRE » SUR L'ACCUEIL (14 novembre 2026, planche 3A) : TROIS ÉCLAIRAGES PAS ENCORE LUS, EN PLUS DE CE QUI Y EST.
 *
 * Le Guide existait (huit éclairages courts, un parcours de 29, le glossaire) mais aucun bloc de l'Accueil n'y menait : on le trouvait par
 * l'onglet « Aide » ou le menu. Ce bloc n'en remplace aucune porte, il en ajoute une, à l'endroit où le lecteur lit déjà.
 *
 * ILS SONT CEUX DE « LIRE UNE LIGNE » (les huit premiers, dans leur ordre), JAMAIS UN CLASSEMENT « POUR VOUS » : le reste du Guide s'ouvre par « Tout voir ».
 * QUELS ÉCLAIRAGES SONT LUS, SEUL L'APPAREIL LE SAIT (la clé est dans son stockage) : la rangée se décide donc dans le navigateur, et la pièce
 * entière — titre compris — se tait quand les huit sont lus. Aucun chiffre, aucune consigne : une phrase et une durée par éclairage.
 */
export async function BlocApprendre() {
  const t = await getT();
  const toutes = await loadLessons();
  const lessons = toutes.filter((l) => !l.section).sort((a, b) => a.order - b.order);
  if (!lessons.length) return null;
  return (
    <ListeApprendre
      entete={<TitreDeBloc id="apprendre" titre="Apprendre" href="/info/eclairages" tout="Tout voir" />}
      lessons={lessons.map((l) => ({ key: l.key, order: l.order, titre: t(l.title), phrase: t(l.intro), minutes: l.minutes }))}
      min={t("min")}
    />
  );
}
