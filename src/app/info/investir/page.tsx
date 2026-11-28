import { COMPRENDRE, COMPRENDRE_RELU_LE } from "@/data/comprendre-investir";
import { AnatomieDeCarte } from "@/components/LireUneCarte";
import { EnTete } from "@/components/EnTete";
import { Glissement } from "@/components/mobile/Glissement";
import { getLang, getT } from "@/i18n/server";
import { fmtDate } from "@/lib/format";
import styles from "./page.module.css";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Comprendre l'investissement") };
}

/**
 * « COMPRENDRE L'INVESTISSEMENT » (28 novembre 2026, le client : « B » : le bandeau « Nouveau sur Investir ? » mène à une page de l'application).
 *
 * La présentation « Investir avec Guichet », condensée en dix sections (`data/comprendre-investir.ts`), dans l'ordre des trois questions du novice : que puis-je acheter, que puis-je gagner et risquer,
 * comment ça se passe. Une page de lecture : une pile, dix sections séparées par l'écart des chapitres, un titre à plat par section, aucun cadre. Les exemples sont illustratifs.
 */
export default async function ComprendreInvestirPage() {
  const [t, lang] = await Promise.all([getT(), getLang()]);
  return (
    <Glissement>
      <div className={styles.page}>
        <EnTete surTitre={t("Guide")} titre={t("Comprendre l'investissement")} phrase={t("Ce que l'on peut acheter, comment lire la page Investir, et comment se passe un ordre. Les chiffres sont des exemples.")} />
        <div className={styles.sections}>
          {COMPRENDRE.map((s) => (
            <section key={s.id} id={s.id} className={styles.section}>
              <h2>{s.titre[lang]}</h2>
              {s.intro && <p>{s.intro[lang]}</p>}
              {s.id === "carte" && <AnatomieDeCarte />}
              {s.lignes && (
                <dl className={styles.lignes}>
                  {s.lignes.map((l) => (
                    <div key={l.terme.fr}>
                      <dt>{l.terme[lang]}</dt>
                      <dd>{l.texte[lang]}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {s.fin && <p className={styles.fin}>{s.fin[lang]}</p>}
            </section>
          ))}
        </div>
        <p className={styles.date}>{t("Page relue le {d}. Information pédagogique : elle ne remplace ni les mentions légales, ni le conseil d'un professionnel.", { d: fmtDate(COMPRENDRE_RELU_LE) })}</p>
      </div>
    </Glissement>
  );
}
