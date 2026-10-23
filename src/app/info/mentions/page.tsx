import { LEGAL, LEGAL_VERSION } from "@/data/legal";
import { getLang, getT } from "@/i18n/server";
import { fmtDate } from "@/lib/format";
import styles from "./page.module.css";
import { GuideBar } from "../GuideBar";

/** The tab and the phone header read this title: in the reader's language. */
export async function generateMetadata() {
  const t = await getT();
  return { title: t("Mentions légales") };
}

/** The legal text, public: the same one a client accepts at sign-in. */
export default async function MentionsPage() {
  const [t, lang] = await Promise.all([getT(), getLang()]);
  return (
    <div className={styles.wrap}>
      <div className="eyebrow">{t("Mentions légales")}</div>
      {/* LA PAGE CONTREDISAIT SON PROPRE INDEX. La recherche publie depuis
          toujours cette page sous « Mentions légales », avec « Ce que vous
          acceptez en utilisant Guichet » pour PHRASE (lib/guide-index) ; la
          page, elle, prenait la phrase pour titre. Le nom revient en tête, la
          phrase sous lui. Voir ETALON.md. */}
      <h1 className="display">{t("Mentions légales")}</h1>
      <p className={styles.chapo}>{t("Ce que vous acceptez en utilisant Guichet")}</p>
      <p className={styles.version}>{t("Version du {date}", { date: fmtDate(LEGAL_VERSION) })}</p>
      {LEGAL.map((s) => (
        <section key={s.id} id={s.id} className={styles.section}>
          <h2>{s.title[lang]}</h2>
          {s.body[lang].map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </section>
      ))}
      <GuideBar pos={{ label: t("Le Guide · mentions") }} />
    </div>
  );
}
