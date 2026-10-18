import Link from "next/link";
import { DeskNav } from "@/components/DeskNav";
import { requireResponsable } from "@/lib/auth";
import { getT } from "@/i18n/server";
import { loadSouffrance } from "@/lib/policy";
import { attentesDesOrdres, SANS_SEUIL } from "@/lib/desk/souffrance-data";
import { DelaiForm } from "./Form";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Délai de souffrance" };

/**
 * LE DÉLAI AU-DELÀ DUQUEL UN ORDRE EST EN SOUFFRANCE.
 *
 * Il était lu au référentiel sans que personne ne puisse l'y écrire : le code
 * allait chercher la valeur, n'en trouvait aucune, retombait sur son défaut,
 * et « modifiable sans déployer » restait une promesse à moitié tenue. Cette
 * page est la moitié qui manquait.
 *
 * ELLE MONTRE CE QUE LE SEUIL ATTRAPE, et c'est tout son objet. « Sept jours »
 * ne dit rien dans l'abstrait ; « sept jours, soit deux ordres sur trois » dit
 * tout, et se corrige avant d'enregistrer. C'est le geste du barème de
 * l'activité, qui se publie en voyant qui bouge.
 *
 * POURQUOI AUCUN SEUIL N'EST MESURÉ. Cinq ordres en base le 18 octobre 2026,
 * tous sur des comptes d'essai : la distribution des attentes n'existe pas
 * encore. Le défaut de sept jours est donc posé et non déduit, et il le reste
 * jusqu'à ce que la file ait vécu. C'est exactement pour cela qu'il est ici et
 * non dans le code.
 */
export default async function SouffrancePage() {
  await requireResponsable("/desk/referentiel/souffrance");
  const t = await getT();

  const delai = await loadSouffrance();
  /* Un seuil impossible à atteindre : cette page veut l'âge NU de chaque
     ordre, pour montrer ce qu'un AUTRE seuil attraperait. */
  const brutes = await attentesDesOrdres(SANS_SEUIL);
  const attentes = [...brutes.values()]
    .map((a) => ({ ref: a.intent.ref, jours: a.souffrance.jours, avantCloture: a.souffrance.avantCloture }))
    .sort((x, y) => y.jours - x.jours);

  return (
    <>
      <DeskNav current="/desk/referentiel" />
      <div className={styles.page}>
        <header className={styles.tete}>
          <h1>{t("Délai de souffrance")}</h1>
          <p className="muted">
            {t(
              "Au-delà de ce délai sans mouvement, un ordre ouvert est marqué dans le carnet. Il ne déclenche aucun envoi et ne change aucun état : il colore une colonne et remplit une pastille.",
            )}
          </p>
        </header>

        <section className="panel">
          <div className="panel-h">
            <h2>{t("Les deux horloges")}</h2>
          </div>
          <div className={styles.corps}>
            <p>
              {t(
                "La clôture de la ligne prime, et même sur un ordre tout frais : ce qui presse n'est pas que nous ayons tardé, c'est que la porte se ferme. Le délai sans mouvement sert partout ailleurs, et notamment sur les fonds et le secondaire, qui se traitent en continu et n'ont pas de clôture.",
              )}
            </p>
            <DelaiForm delai={delai} attentes={attentes} />
          </div>
        </section>

        <section className="panel">
          <div className="panel-h">
            <h2>{t("Pourquoi ce chiffre est posé et non mesuré")}</h2>
          </div>
          <div className={styles.corps}>
            <p>
              {t(
                "Aucun seuil ne peut se tirer des données tant que la file n'a pas vécu : cinq ordres en base le 18 octobre 2026, tous sur des comptes d'essai. Le défaut de sept jours est donc une décision, pas une déduction, et c'est précisément pour cela qu'il vit ici plutôt que dans le code.",
              )}
            </p>
            <p className="muted">
              {t("Le jour où la file comptera assez d'ordres, c'est la distribution des attentes qui dira s'il faut le bouger.")}{" "}
              <Link href="/desk#intentions">{t("Voir le carnet")}</Link>
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
