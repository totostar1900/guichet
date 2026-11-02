import { TitreDeBloc } from "@/components/TitreDeBloc";
import styles from "./BlocPlat.module.css";

/**
 * UN BLOC À PLAT : LE TITRE AU-DESSUS DE LA CARTE, JAMAIS DANS LA CARTE (2 novembre 2026).
 *
 * C'est le geste de « Titres » et « Fonds », étendu à tout l'Accueil : un titre en
 * étiquette (qui est un lien vers la liste quand il y en a une), puis UNE carte qui ne
 * porte que des rangées. Le titre n'est pas dans la carte, et la carte n'est pas un
 * lien : chaque rangée est le sien.
 */
export async function BlocPlat({ id, titre, href, tout, etiquette, children }: { id: string; titre: string; href?: string; tout?: string; etiquette?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className={styles.bloc} aria-labelledby={id}>
      <TitreDeBloc id={id} titre={titre} href={href} tout={tout} etiquette={etiquette} />
      <div className={styles.carte}>{children}</div>
    </section>
  );
}
