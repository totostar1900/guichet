import { notFound } from "next/navigation";
import { DocBlockList } from "@/components/docs/DocBlocks";
import { CoachMarks } from "@/components/mobile/CoachMarks";
import { PUBLIC_DOCS } from "@/data/docs";
import { getLang, getT } from "@/i18n/server";
import { COMPANY } from "@/lib/config";
import { aideRows } from "@/lib/guide-index";
import styles from "@/components/docs/Document.module.css";
import aide from "../aide.module.css";
import { ChapitreBrowser } from "../ChapitreBrowser";
import { EnTete } from "@/components/EnTete";
import { GuideBar } from "../../GuideBar";
import { Glissement } from "@/components/mobile/Glissement";

/** Les huit chapitres sont connus à l'avance : ils se rendent au build. */
export function generateStaticParams() {
  const doc = PUBLIC_DOCS[0];
  return doc ? doc.chapters.map((c) => ({ chapitre: c.id })) : [];
}

export async function generateMetadata({ params }: { params: Promise<{ chapitre: string }> }) {
  const { chapitre } = await params;
  const lang = await getLang();
  const c = PUBLIC_DOCS[0]?.chapters.find((x) => x.id === chapitre);
  return { title: c ? c.title[lang] : "Aide" };
}

/**
 * UN CHAPITRE DE L'AIDE, À SON ADRESSE.
 *
 * Les huit chapitres vivaient en accordéons sous les tuiles de « /info/aide » :
 * la tuile sautait à une ancre deux écrans plus bas, qu'il fallait encore
 * déplier, et une réponse n'avait pas d'adresse à elle. Les quarante et une
 * réponses de l'index pointaient donc toutes vers la même page.
 */
export default async function ChapitrePage({ params }: { params: Promise<{ chapitre: string }> }) {
  const { chapitre } = await params;
  const [t, lang] = await Promise.all([getT(), getLang()]);
  const doc = PUBLIC_DOCS[0];
  const c = doc?.chapters.find((x) => x.id === chapitre);
  if (!doc || !c) notFound();
  const rows = aideRows(lang).filter((r) => r.chapter === c.id);
  const wa = `https://wa.me/${COMPANY.phone.replace(/\D/g, "")}?text=${encodeURIComponent(t("Bonjour, j'ai une question sur Guichet…"))}`;
  return (
    <Glissement>
      <article className={styles.doc}>
        <EnTete
          retour={{ href: "/info/aide", mot: t("Questions courantes") }}
          surTitre={t("Aide")}
          titre={c.title[lang]}
          phrase={c.promesse?.[lang]}
        />
        <div className={aide.intro}>
          <DocBlockList blocks={c.blocks.filter((b) => b.type !== "table")} lang={lang} />
        </div>
        {rows.length > 0 && <ChapitreBrowser id={c.id} rows={rows} wa={wa} />}
        <div className={aide.stuck}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 20l1.3-3.9A8 8 0 1 1 8 19.1L4 20z" />
          </svg>
          <span>
            <b>{t("Toujours bloqué ?")}</b>
            <small>{t("un conseiller répond sur WhatsApp, ou au {phone}", { phone: COMPANY.phone })}</small>
          </span>
          <a href={wa} target="_blank" rel="noopener">
            {t("Écrire")}
          </a>
        </div>
        <GuideBar pos={{ label: `${t("Aide")} · ${c.title[lang]}` }} />
        <CoachMarks
          id={`aide-${c.id}`}
          replayLabel={t("Comment lire ce chapitre ?")}
          stops={[{ target: "aide-chapitre", title: t("Une réponse, une adresse"), text: t("Ouvrez une question : son adresse s'écrit dans la barre, elle se partage et se met en favori. La recherche y mène directement.") }]}
        />
      </article>
    </Glissement>
  );
}
