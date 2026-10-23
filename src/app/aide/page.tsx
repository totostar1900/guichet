import { requireSession } from "@/lib/auth";
import { getT } from "@/i18n/server";
import { Rubriques } from "@/components/mobile/Rubriques";
import { MenuRejouables } from "@/components/menu/Pieces";
import { AIDE_PAGES } from "@/lib/nav-groups";
import styles from "@/components/Feuillet.module.css";
import { Glissement } from "@/components/mobile/Glissement";
import { EnTete } from "@/components/EnTete";

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
 *
 * ET ELLE LIT LA TABLE, PLUS SA PROPRE LISTE. Les quatre rubriques étaient
 * écrites ici à la main alors que le rail de l'écran large les lisait dans
 * `AIDE_PAGES` : deux listes de la même chose, qui ont divergé le jour même —
 * la page portait « Questions courantes » et « Risques », le rail non. Elles
 * lisent maintenant la même table, dans le même ordre.
 *
 * « REVOIR » EST UNE SECTION ET NON UNE RUBRIQUE. Les deux rejouables — la
 * présentation de trente secondes et les six écrans des premiers pas — vivaient
 * au fond de la feuille du compte. Ils ne sont pas des destinations : il n'y a
 * pas de page des présentations, il y a un bouton qui les rejoue par-dessus
 * celle qu'on regarde. Une ligne de sommaire avec un chevron aurait promis une
 * page qui n'existe pas.
 */
export default async function AidePage() {
  await requireSession("/aide");
  const t = await getT();

  return (
    <Glissement>
        <div className={styles.page}>
          <EnTete titre={t("Aide")} phrase={t("Poser une question à la personne qui suit votre compte, ou trouver la réponse vous-même.")} />

          <Rubriques
            items={[
              ...AIDE_PAGES.map((p) => ({ href: p.href, nom: t(p.label), quoi: t(p.hint) })),
              /* LES MENTIONS NE SONT PAS DANS LA TABLE DU RAIL, et c'est voulu :
                 elles se lisent une fois, à l'ouverture du compte, et un rail
                 qu'on parcourt chaque jour n'a pas à les porter. Elles vivent au
                 pied de chaque page ; cette ligne-ci est pour qui les CHERCHE,
                 et le siège « Aide » est le premier endroit où l'on regarde. */
              { href: "/info/mentions", nom: t("Mentions légales"), quoi: t("Qui est Purpose Capital, sous quel agrément, et qui le contrôle.") },
            ]}
          />

          <section className={styles.bloc}>
            <h2>{t("Revoir")}</h2>
            <p className={styles.note}>{t("Les deux présentations se rejouent par-dessus la page que vous regardez, et se ferment d'un geste.")}</p>
            <MenuRejouables />
          </section>
        </div>
    </Glissement>
  );
}
