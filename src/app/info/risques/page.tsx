import { RISQUES, RISQUES_VERSION } from "@/data/risques";
import { COMPANY } from "@/lib/config";
import { getLang, getT } from "@/i18n/server";
import { fmtDate } from "@/lib/format";
import { GuideBar } from "../GuideBar";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

/** The tab and the phone header read this title: in the reader's language. */
export async function generateMetadata() {
  const t = await getT();
  return { title: t("Risques et limites") };
}

/**
 * Risques et limites, publique.
 *
 * C'est ici qu'a déménagé la règle « chaque geste porte sa limite, dite sans
 * s'excuser ». Elle vivait sur la page d'accueil, sous chacun des neuf
 * services : neuf raisons d'hésiter sur la seule page qui doit donner envie.
 * Une information lue au moment où l'on décide vaut mieux qu'une information
 * survolée sur une brochure, et c'est aussi la meilleure position de
 * conformité.
 *
 * Le texte est rangé PAR OPÉRATION et jamais par service : les neuf services
 * ne se nomment plus avant connexion, et une page publique qui les listerait
 * rouvrirait par la fenêtre ce que la porte a fermé.
 *
 * La forme est celle de la page Analyses du desk, rail de lecture à gauche et
 * texte à droite : c'est la convention de la maison pour un document long.
 */
export default async function RisquesPage() {
  const [t, lang] = await Promise.all([getT(), getLang()]);

  return (
    <div className={styles.page}>

      <header className={styles.tete}>
        <div>
          <div className="eyebrow">{t("Information réglementaire")}</div>
          <h1 className="display">{t("Risques et limites")}</h1>
        </div>
        <div className={styles.chapeau}>
          <p>{t("Cette page dit ce que chaque opération engage, ce qu'elle laisse ouvert, et quels risques elle porte. Elle se lit avant d'ouvrir un compte, et elle reste accessible à tout moment.")}</p>
          <span>{t("Version du {date}", { date: fmtDate(RISQUES_VERSION) })}</span>
        </div>
      </header>

      <div className={styles.corps}>
        {/* Le rail : il nomme les cinq étages, et rien d'autre. */}
        <nav className={styles.rail} aria-label={t("Les sections de cette page")}>
          {RISQUES.map((s) => (
            <a key={s.id} href={`#${s.id}`}>
              {s.titre[lang]}
            </a>
          ))}
        </nav>

        <div className={styles.texte}>
          {RISQUES.map((s) => (
            <section key={s.id} id={s.id} className={styles.section}>
              <h2>{s.titre[lang]}</h2>
              {s.corps.map((p) => (
                <p key={p.fr}>{p[lang]}</p>
              ))}

              {s.retenir && (
                <div className={styles.retenir}>
                  <span>{t("Ce qu'il faut retenir")}</span>
                  <p>{s.retenir[lang]}</p>
                </div>
              )}

              {s.lignes && (
                <div className={styles.lignes}>
                  {s.lignes.map((l) => (
                    <div key={l.quoi.fr}>
                      <b>{l.quoi[lang]}</b>
                      <p>{l.dit[lang]}</p>
                    </div>
                  ))}
                </div>
              )}

              {s.partage && (
                <div className={styles.partage}>
                  <div className={styles.vous}>
                    <span>{t("Ce qui relève de vous")}</span>
                    {s.partage.vous.map((x) => (
                      <em key={x.fr}>{x[lang]}</em>
                    ))}
                  </div>
                  <div className={styles.nous}>
                    <span>{t("Ce qui relève de nous")}</span>
                    {s.partage.nous.map((x) => (
                      <em key={x.fr}>{x[lang]}</em>
                    ))}
                  </div>
                </div>
              )}

              {s.fin?.map((p) => (
                <p key={p.fr} className={styles.apres}>
                  {p[lang]}
                </p>
              ))}

              {s.id === "recours" && (
                <div className={styles.ecrire}>
                  <span>{t("Pour nous écrire")}</span>
                  <b>{COMPANY.legalName}</b>
                  <small>
                    {COMPANY.address}
                    <br />
                    {COMPANY.phone} · {COMPANY.email}
                  </small>
                </div>
              )}
            </section>
          ))}
        </div>
      </div>

      <GuideBar pos={{ label: t("Le Guide · risques et limites") }} />
    </div>
  );
}
