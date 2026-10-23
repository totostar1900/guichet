import { DocBlockList } from "@/components/docs/DocBlocks";
import { Sommaire } from "@/components/Sommaire";
import { CoachMarks } from "@/components/mobile/CoachMarks";
import { PUBLIC_DOCS } from "@/data/docs";
import { getLang, getT } from "@/i18n/server";
import { COMPANY } from "@/lib/config";
import { fmtDate } from "@/lib/format";
import { aideRows } from "@/lib/guide-index";
import styles from "@/app/desk/docs/docs.module.css";
import { AideBrowser } from "./AideBrowser";
import { GuideBar } from "../GuideBar";

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
    intro: <DocBlockList blocks={c.blocks.filter((b) => b.type !== "table")} lang={lang} />,
    rows: rows.filter((r) => r.chapter === c.id),
  }));
  const wa = `https://wa.me/${COMPANY.phone.replace(/\D/g, "")}?text=${encodeURIComponent(t("Bonjour, j'ai une question sur Guichet…"))}`;
  return (
    <Sommaire
      label={t("Sujet")}
      sections={chapters.map((c) => ({ id: c.id, title: c.title }))}
      meta={`${t("Mis à jour le")} ${fmtDate(doc.checkedOn)}`}
    >
      <article className={styles.doc}>
        <AideBrowser chapters={chapters} wa={wa} />
        <GuideBar pos={{ label: t("Le Guide · aide") }} />
        <CoachMarks
          id="aide"
          replayLabel={t("Comment utiliser cette aide ?")}
          stops={[
            { target: "aide-page", title: t("La question d'abord"), text: t("Tapez un mot ou une phrase : seules les réponses qui le contiennent restent. Les trois questions les plus posées sont sous le champ.") },
            { target: "aide-nav", title: t("Ou un sujet"), text: t("Six sujets, chacun avec ses questions ; une réponse s'ouvre en place, avec le bouton qui va avec et une façon de nous dire si elle a aidé.") },
            { target: "aide-contact", title: t("Quand ça ne suffit pas"), text: t("Le bouton « Information » de chaque fiche ouvre WhatsApp ; un robot répond aux questions simples, un conseiller prend le relais. Pour une réclamation, écrivez-nous avec la référence concernée.") },
            { target: "aide-entretien", title: t("Comment Guichet est entretenu"), text: t("Qui écrit ce que vous lisez, d'où viennent les cours, ce qui se passe en cas de panne, où sont vos données : en clair, sans jargon. Un doute sur un chiffre ? Dites-le-nous, il est corrigé pour tout le monde.") },
          ]}
        />
      </article>
    </Sommaire>
  );
}
