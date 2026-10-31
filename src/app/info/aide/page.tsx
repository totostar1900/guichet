import { CoachMarks } from "@/components/mobile/CoachMarks";
import { PUBLIC_DOCS } from "@/data/docs";
import { getLang, getT } from "@/i18n/server";
import { COMPANY } from "@/lib/config";
import { fmtDate } from "@/lib/format";
import { aideRows } from "@/lib/guide-index";
import styles from "@/components/docs/Document.module.css";
import { EnTete } from "@/components/EnTete";
import { AideBrowser } from "./AideBrowser";
import { GuideBar } from "../GuideBar";
import { Glissement } from "@/components/mobile/Glissement";

/** The tab and the phone header read this title: in the reader's language. */
export async function generateMetadata() {
  const t = await getT();
  return { title: t("Aide") };
}

/**
 * The client help page: the only documentation page rendered outside the desk
 * (`visibility: "public"`, written for clients alone, checked by a test for
 * internal details). Its questions open in place; the rest of each chapter
 * (a lead, a list, a flow) stays above them.
 */
export default async function AidePage() {
  const [t, lang] = await Promise.all([getT(), getLang()]);
  const doc = PUBLIC_DOCS[0];
  if (!doc) return null;
  const rows = aideRows(lang);
  const chapters = doc.chapters.map((c) => ({
    id: c.id,
    title: c.title[lang],
    promesse: c.promesse?.[lang],
    rows: rows.filter((r) => r.chapter === c.id),
  }));
  const wa = `https://wa.me/${COMPANY.phone.replace(/\D/g, "")}?text=${encodeURIComponent(t("Bonjour, j'ai une question sur Guichet…"))}`;
  return (
    <Glissement>
      {/* LE SOMMAIRE A PERDU SA RAISON D'ÊTRE : il listait huit ancres d'une
          même page, et les huit sont devenues des pages. Les tuiles sont le
          sommaire, et elles mènent où elles disent. */}
      <article className={styles.doc}>
        {/* PAS DE PHRASE SOUS CE TITRE, depuis le 31 octobre 2026. Elle récitait
            six des huit titres de tuiles — « se connecter, ouvrir un compte,
            lire une ligne, déclarer une intention, régler, recevoir ses
            documents, nous joindre » — à cent pixels au-dessus des tuiles qui
            les portent, et n'apprenait rien qu'elles ne montrent déjà. Le
            champ juste dessous dit quoi faire (« Une question ? Tapez-la, ou
            choisissez un sujet. ») ; une seconde phrase pour le dire serait la
            troisième du même siège.
            Elle reste dans l'index de recherche (« guide-index »), où elle sert
            de texte à trouver : c'est là que « se connecter » ramène cette
            page, et ce n'est pas un endroit où on la lit. */}
        <EnTete surTitre={t("Aide")} titre={t("Vos questions, nos réponses")} />
        <p className={styles.source}>{`${t("Mis à jour le")} ${fmtDate(doc.checkedOn)}`}</p>
        <AideBrowser chapters={chapters} wa={wa} />
        <GuideBar pos={{ label: t("Aide") }} />
        <CoachMarks
          id="aide"
          replayLabel={t("Comment utiliser cette aide ?")}
          stops={[
            { target: "aide-page", title: t("La question d'abord"), text: t("Tapez un mot ou une phrase : seules les réponses qui le contiennent restent, et chacune mène à sa page. Les trois questions les plus posées sont sous le champ.") },
            { target: "aide-nav", title: t("Ou un sujet"), text: t("Huit sujets, chacun sur sa page : une réponse s'y ouvre en place, avec le bouton qui va avec et une façon de nous dire si elle a aidé.") },
            { target: "aide-contact", title: t("Quand ça ne suffit pas"), text: t("Le bouton « Information » de chaque fiche ouvre WhatsApp ; un robot répond aux questions simples, un conseiller prend le relais. Pour une réclamation, écrivez-nous avec la référence concernée.") },
            /* L'ARRÊT SUR L'ENTRETIEN RESTE, et il vise maintenant la tuile :
               il visait le chapitre déplié, qui est parti sur sa page. */
            { target: "aide-entretien", title: t("Comment Guichet est entretenu"), text: t("Qui écrit ce que vous lisez, d'où viennent les cours, ce qui se passe en cas de panne, où sont vos données : en clair, sans jargon. Un doute sur un chiffre ? Dites-le-nous, il est corrigé pour tout le monde.") },
          ]}
        />
      </article>
    </Glissement>
  );
}
