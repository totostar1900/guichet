import { requireSession } from "@/lib/auth";
import { getT } from "@/i18n/server";
import { Glissement } from "@/components/mobile/Glissement";
import { Rubriques } from "@/components/mobile/Rubriques";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Aide" };

/**
 * LE CINQUIÈME SIÈGE : DEMANDER, ET TROUVER SOI-MÊME.
 *
 * Les deux vivaient au bas de « Trade » — la carte du conseiller sous les
 * neuf services, un rayon « comprendre » sous elle — et l'on y tombait en
 * descendant une page qu'on était venu lire pour agir. Ils ont chacun leur
 * page depuis ce matin ; il leur manquait une porte au dock du téléphone, où
 * quatre onglets menaient à ce qu'on possède, ce qu'on achète, ce qu'on fait
 * et ce qu'on lit du marché, et aucun à la maison elle-même.
 *
 * POURQUOI « AIDE » ET PAS AUTRE CHOSE. Le siège couvre deux gestes de nature
 * différente : poser une question à quelqu'un, et chercher la réponse tout
 * seul. « Apprendre » ne dit que le second, « Contact » que le premier, et
 * « Ressources » ne dit rien du tout. « Aide » est le mot le plus court qui
 * les couvre tous les deux, et c'est déjà le nom du groupe au rail de
 * l'écran large : deux surfaces qui nomment la même chose doivent la nommer
 * pareil.
 *
 * ELLE NE REDIT RIEN. Chaque rubrique mène à la page qui existe, et le siège
 * ne fait que les rassembler : une page d'accueil qui résumerait ses enfants
 * ferait un troisième endroit où la même phrase se corrige.
 */
export default async function AidePage() {
  await requireSession("/aide");
  const t = await getT();

  return (
    <Glissement>
      <div className={styles.page}>
        <header className={styles.tete}>
          <h1>{t("Aide")}</h1>
          <p>{t("Poser une question à la personne qui suit votre compte, ou trouver la réponse vous-même.")}</p>
        </header>

        <Rubriques
          items={[
            { href: "/moi/contact", nom: t("Nous contacter"), quoi: t("Votre conseiller, le message déjà écrit, et le dépôt d'une réclamation.") },
            { href: "/info", nom: t("Le guide"), quoi: t("Les éclairages, le parcours du marché, le simulateur et le glossaire.") },
            { href: "/info/aide", nom: t("Questions courantes"), quoi: t("Ce qu'on nous demande le plus souvent, répondu une fois pour toutes.") },
            { href: "/info/risques", nom: t("Risques et limites"), quoi: t("Ce que la maison ne promet pas, et ce qu'elle ne fait pas.") },
            { href: "/info/mentions", nom: t("Mentions légales"), quoi: t("Qui est Purpose Capital, sous quel agrément, et qui le contrôle.") },
          ]}
        />
      </div>
    </Glissement>
  );
}
