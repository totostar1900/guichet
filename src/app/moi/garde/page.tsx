import { requireSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { AvisGardeList } from "@/components/AvisGardeList";
import { getT } from "@/i18n/server";
import { Glissement } from "@/components/mobile/Glissement";
import { EnTete } from "@/components/EnTete";
import { EnBref } from "@/components/EnBref";
import styles from "../page.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Vos droits de garde") };
}

/**
 * CE QUE LA CONSERVATION A COÛTÉ, AVIS PAR AVIS.
 *
 * Un frais qu'on ne voit qu'au relevé bancaire est un frais qu'on subit ;
 * celui dont on lit le détail est un frais qu'on vérifie. C'est pour cela que
 * les avis s'ouvrent ligne à ligne, et qu'un avis à zéro paraît comme les
 * autres : son absence se lirait comme un oubli.
 *
 * Ils se développaient au bas de la page d'accueil, entre la valorisation et
 * les intentions. Ni l'un ni l'autre ne pose la même question, et une page
 * d'accueil qui déplie trois sujets n'en sert aucun.
 *
 * LE TARIF N'EST PAS ICI, et c'est délibéré : l'annexe tarifaire dit ce que la
 * garde COÛTERA, cette page dit ce qu'elle a coûté. Le lien va donc dans ce
 * sens-là, et une seule fois.
 *
 * ET C'EST ICI QUE LE BRIEF DE LA CONSERVATION SE POSE, le 26 octobre 2026,
 * avec les sept autres. La tuile du service mène à « /moi », qui renvoie à la
 * racine : la racine est un tableau de bord qui ouvre sur « Bonjour », pas une
 * page de service, et un « En bref » accroché à une salutation ne se
 * rattacherait à rien. Cette page-ci porte le nom du service et son en-tête
 * commun ; c'est la seule de l'application qui ne parle que de garde.
 */
export default async function GardePage() {
  const t = await getT();
  const s = await requireSession("/moi/garde");
  const avis = await repo()
    .listCustodyNotices({ userId: s.userId })
    .catch(() => []);

  return (
    <Glissement>
      <main className={styles.wrap}>
        <EnTete
          retour={{ href: "/", mot: t("Tableau de bord") }}
          surTitre={t("Votre dossier")}
          titre={t("Vos droits de garde")}
          phrase={t("Ce que la conservation de vos titres a coûté. Chaque avis s'ouvre ligne à ligne : c'est ce qui permet de le vérifier plutôt que de le subir.")}
          aCote={<EnBref cles={["garde"]} titre="La conservation en bref" />}
        />

        <div className="panel">
          {avis.length === 0 ? <div className="empty">{t("Aucun avis de droits de garde pour l'instant.")}</div> : <AvisGardeList avis={avis} />}
        </div>

        <p className={styles.reportLink}>
          <a href="/moi/tarifs">{t("Ce que la garde coûtera : l'annexe tarifaire")}</a>
        </p>
      </main>
    </Glissement>
  );
}
