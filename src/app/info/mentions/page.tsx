import { LEGAL, LEGAL_VERSION } from "@/data/legal";
import { getLang, getT } from "@/i18n/server";
import { fmtDate } from "@/lib/format";
import styles from "./page.module.css";

export const metadata = { title: "Mentions et responsabilités" };

/** The legal text, public: the same one a client accepts at sign-in. */
export default async function MentionsPage() {
  const [t, lang] = await Promise.all([getT(), getLang()]);
  return (
    <div className={styles.wrap}>
      <div className="eyebrow">{t("Mentions et responsabilités")}</div>
      <h1 className="display">{t("Ce que vous acceptez en utilisant le Guichet")}</h1>
      <p className={styles.version}>{t("Version du {date}", { date: fmtDate(LEGAL_VERSION) })}</p>
      {LEGAL.map((s) => (
        <section key={s.id} id={s.id} className={styles.section}>
          <h2>{s.title[lang]}</h2>
          {s.body[lang].map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </section>
      ))}
    </div>
  );
}
