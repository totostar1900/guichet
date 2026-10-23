import { PageOutline } from "./PageOutline";
import type { SectionItem } from "./SectionLine";
import styles from "./Sommaire.module.css";

/**
 * UNE PAGE À SECTIONS, ET SON SOMMAIRE À LA PLACE QUE LA MAISON LUI DONNE.
 *
 * Le sommaire lui-même (`PageOutline`) savait déjà de quoi il avait l'air ;
 * ce qu'il ne savait pas, c'est OÙ il se pose — chaque page le décidait, et
 * sept pages avaient décidé cinq fois différemment. Cette pièce-ci porte la
 * grille, le seuil et la largeur, et les pages n'ont plus à les connaître :
 * elles disent leurs sections et leur contenu.
 *
 * `sous` : ce que la page ajoute SOUS le sommaire, dans la même colonne — un
 * bouton de téléchargement, les autres trimestres. Il est posé À CÔTÉ du
 * sommaire et non dedans, et ce n'est pas un détail de balisage : un « nav »
 * nommé « Sommaire » dont la moitié des liens mène à d'autres pages cesse
 * d'être la carte de celle-ci. Sous le seuil, ce bloc redescend simplement
 * après l'article, où il se lit très bien.
 */
export function Sommaire({ sections, label, meta, foot, sous, children }: { sections: SectionItem[]; label: string; meta?: React.ReactNode; foot?: React.ReactNode; sous?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className={styles.avec}>
      <div className={styles.corps}>{children}</div>
      <PageOutline sections={sections} label={label} meta={meta} foot={foot} />
      {sous && <div className={styles.sous}>{sous}</div>}
    </div>
  );
}
