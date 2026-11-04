import { LEGAL, LEGAL_VERSION } from "@/data/legal";
import { ORDRE_DE_LA_PAGE, SERVICES_RISQUES_RELU_LE, type DocSection } from "@/data/services-risques";
import { BandeDeLaPage } from "./BandeDeLaPage";
import { getLang, getT } from "@/i18n/server";
import { fmtDate } from "@/lib/format";
import styles from "./page.module.css";
import { GuideBar } from "../GuideBar";
import { Glissement } from "@/components/mobile/Glissement";
import { EnTete } from "@/components/EnTete";

/** The tab and the phone header read this title: in the reader's language. */
export async function generateMetadata() {
  const t = await getT();
  return { title: t("Mentions légales") };
}

/** The legal text, public: the same one a client accepts at sign-in. */
export default async function MentionsPage() {
  const [t, lang] = await Promise.all([getT(), getLang()]);
  return (
    <Glissement>
      <div className={styles.wrap}>
        {/* LA PAGE CONTREDISAIT SON PROPRE INDEX. La recherche publie depuis
            toujours cette page sous « Mentions légales », avec « Ce que vous
            acceptez en utilisant Guichet » pour PHRASE (lib/guide-index) ; la
            page, elle, prenait la phrase pour titre. Le nom revient en tête, la
            phrase sous lui. Voir ETALON.md.

            ET LE SUR-TITRE RÉPÉTAIT LE TITRE, mot pour mot : « Mentions
            légales » au-dessus de « Mentions légales ». Un créneau qui redit
            celui d'en dessous n'apprend rien ; celui-ci dit OÙ l'on est, et
            c'est le guide — le même mot que porte la barre au pied de page. */}
        <EnTete surTitre={t("Le Guide")} titre={t("Mentions légales")} phrase={t("Ce que vous acceptez en utilisant Guichet")} />
        <p className={styles.version}>{t("Version du {date}", { date: fmtDate(LEGAL_VERSION) })}</p>
        {/* LA BANDE DE MENU DE LA PAGE (7 novembre 2026) : un mot par section, collée sous la barre. */}
        <BandeDeLaPage
          label={t("Dans cette page")}
          onglets={ORDRE_DE_LA_PAGE.map((e) => ("doc" in e ? { id: e.doc.id, nom: e.doc.onglet[lang] } : { id: e.legal, nom: e.onglet[lang] }))}
        />
        {ORDRE_DE_LA_PAGE.map((e) => {
          if ("legal" in e) {
            const s = LEGAL.find((x) => x.id === e.legal);
            if (!s) return null;
            return (
              <section key={s.id} id={s.id} className={styles.section}>
                <h2>{s.title[lang]}</h2>
                {s.body[lang].map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </section>
            );
          }
          const d: DocSection = e.doc;
          return (
            <section key={d.id} id={d.id} className={styles.section}>
              <h2>{d.title[lang]}</h2>
              {d.intro && <p>{d.intro[lang]}</p>}
              {d.lignes && (
                <dl className={styles.lignes}>
                  {d.lignes.map((l) => (
                    <div key={l.terme.fr}>
                      <dt>{l.terme[lang]}</dt>
                      <dd>{l.texte[lang]}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {d.fin && <p>{d.fin[lang]}</p>}
            </section>
          );
        })}
        <p className={styles.version}>{t("Documentation relue le {date}", { date: fmtDate(SERVICES_RISQUES_RELU_LE) })}</p>
        <GuideBar pos={{ label: t("Le Guide · mentions") }} />
      </div>
    </Glissement>
  );
}
