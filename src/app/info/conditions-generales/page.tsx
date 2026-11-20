import Link from "next/link";
import { ARTICLES_DES_CG, CONDITIONS_GENERALES_INTRO, CONDITIONS_GENERALES_VERSION, PIECES_DEMANDEES } from "@/data/conditions-generales";
import { fmtDate } from "@/lib/format";
import { getT } from "@/i18n/server";
import styles from "./page.module.css";
import { Glissement } from "@/components/mobile/Glissement";
import { EnTete } from "@/components/EnTete";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Conditions générales") };
}

/**
 * LES CONDITIONS GÉNÉRALES, EN LECTURE SEULE (20 novembre 2026, le client : « publie les conditions générales »).
 *
 * Le texte vit dans `src/data/conditions-generales.ts` (il y dit d'où il vient et ce qu'on en a omis). Cette page ne change pas la version des mentions légales : elle n'est pas à accepter. Elle est écrite en français, qui fait foi, quelle que soit la langue de l'écran ; la page le dit en tête.
 * Aucun tarif, aucune destination des frais : le client lit une seule ligne, les frais totaux à payer.
 */
export default async function ConditionsGeneralesPage() {
  const t = await getT();
  return (
    <Glissement>
      <div className={styles.page}>
        <EnTete surTitre={t("Textes et conditions")} titre={t("Conditions générales")} phrase={t("Les règles du Guichet et du compte-titres : ce que nous faisons, ce que nous vous demandons, ce que vous pouvez attendre de nous.")} />
        <p className={styles.version}>{t("Version du {date}", { date: fmtDate(CONDITIONS_GENERALES_VERSION) })}</p>
        <p className={styles.langue}>{t("Ce texte est publié en français ; la version française fait foi.")}</p>
        <p className={styles.intro}>{CONDITIONS_GENERALES_INTRO}</p>

        <div className={styles.articles}>
          {ARTICLES_DES_CG.map((a) => (
            <section key={a.id} id={a.id}>
              <h2>{a.titre}</h2>
              {a.blocs.map((b, i) =>
                typeof b === "string" ? (
                  <p key={i}>{b}</p>
                ) : (
                  <ul key={i}>
                    {b.liste.map((l) => (
                      <li key={l}>{l}</li>
                    ))}
                  </ul>
                ),
              )}
            </section>
          ))}
          <section id="annexe">
            <h2>Annexe · Pièces demandées, selon la catégorie</h2>
            <dl className={styles.pieces}>
              {PIECES_DEMANDEES.map((p) => (
                <div key={p.categorie}>
                  <dt>{p.categorie}</dt>
                  <dd>{p.pieces}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>

        <p className={styles.pied}>
          <Link href="/info/textes">{t("Tous les textes et conditions")}</Link>
        </p>
      </div>
    </Glissement>
  );
}
