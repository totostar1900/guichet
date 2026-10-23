import { requireSession } from "@/lib/auth";
import { getLang, getT } from "@/i18n/server";
import { buildGuideIndex, aideRows } from "@/lib/guide-index";
import { TOP_QUESTIONS } from "@/lib/guide-index-shared";
import { InfoSearch } from "@/app/info/InfoSearch";
import { Rubriques } from "@/components/mobile/Rubriques";
import styles from "@/components/Feuillet.module.css";
import { Glissement } from "@/components/mobile/Glissement";

export const dynamic = "force-dynamic";
/** The tab and the phone header read this title: in the reader's language. */
export async function generateMetadata() {
  const t = await getT();
  return { title: t("Rechercher") };
}

/**
 * LA RECHERCHE A UNE PAGE, ET LA FEUILLE DU COMPTE N'A PLUS DE LOCATAIRE.
 *
 * Elle était la dernière chose derrière l'initiale. Le compte est devenu cinq
 * pages le 24 octobre 2026 ; la recherche est restée dans une feuille parce
 * qu'elle se fait LÀ OÙ L'ON EST, et qu'une page semblait demander de quitter
 * la sienne pour y revenir.
 *
 * C'ÉTAIT VRAI D'UNE FEUILLE QUI NE MONTRE QUE SIX RÉSULTATS. Sur une page,
 * on gagne ce qu'une feuille de trois cent vingt-cinq pixels ne peut pas
 * porter : tous les résultats au lieu des six premiers, le type de chacun
 * (définition, éclairage, outil, page), la phrase où le mot apparaît, les
 * flèches du clavier, et les trois questions les plus posées tant qu'on n'a
 * rien tapé. Le retour, lui, est celui du téléphone, qui ramène exactement
 * d'où l'on vient.
 *
 * ET C'EST LE MÊME CHAMP QUE LE GUIDE. Il en existait deux : celui du Guide,
 * complet, et une version réduite écrite pour la feuille — six résultats, pas
 * de type, pas de phrase, pas de clavier. Deux recherches sur le même index
 * divergent, et c'est la plus pauvre qui servait le téléphone.
 *
 * ELLE RESTE DERRIÈRE LA PORTE. Le guide public a la sienne, à `/info` : un
 * visiteur n'a donc rien perdu. Celle-ci cherche aussi dans les pages de
 * l'application, et une liste de portes fermées n'est pas une réponse.
 */
export default async function RecherchePage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireSession("/recherche");
  /* LA QUESTION ARRIVE DÉJÀ TAPÉE depuis la colonne de l'écran large : on y
     cherchait un nom de page, on n'a rien trouvé, et retaper le mot sur la
     page suivante serait exactement le détour qu'un pont doit éviter. */
  const { q: depart } = await searchParams;
  const [t, lang] = await Promise.all([getT(), getLang()]);
  const { entries } = await buildGuideIndex(t, lang, { app: true });
  /* Les trois questions les plus posées, dans l'ordre de la table qui les
     nomme : elles répondent avant qu'on ait tapé, et c'est tout l'intérêt
     d'un état vide qui ne reste pas vide. */
  const rows = aideRows(lang);
  const top = TOP_QUESTIONS.map((slug) => rows.find((r) => r.slug === slug)).filter((r): r is NonNullable<typeof r> => Boolean(r));

  return (
    <Glissement>
        <div className={styles.page}>
          <header className={styles.tete}>
            <h1>{t("Rechercher")}</h1>
            <p>{t("L'aide, le glossaire, les éclairages et les pages de l'application, en un seul champ. Une question entière marche aussi bien qu'un mot.")}</p>
          </header>

          <InfoSearch
            entries={entries}
            auto
            depart={depart}
            vide={
              top.length > 0 ? (
                /* LA CLEF N'EST PAS DÉCORATIVE. Un élément fabriqué par une page
                   serveur et passé en PROP à un composant client traverse la
                   frontière dans la charge RSC, où il compte comme un enfant de
                   liste : sans clef, React avertit en console à chaque
                   chargement. Mesuré le 24 octobre 2026, et c'est le seul
                   avertissement de la page. */
                <section key="souvent" className={styles.bloc}>
                  <h2>{t("On nous demande souvent")}</h2>
                  <Rubriques items={top.map((r) => ({ href: `/info/aide#q-${r.slug}`, nom: r.q, quoi: r.chapterTitle }))} />
                </section>
              ) : undefined
            }
          />
        </div>
    </Glissement>
  );
}
