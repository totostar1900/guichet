import { LEGAL, LEGAL_VERSION } from "@/data/legal";
import { ORDRE_DE_LA_PAGE, SERVICES_RISQUES_RELU_LE, type DocSection } from "@/data/services-risques";
import { BandeDeLaPage } from "./mentions/BandeDeLaPage";
import { getLang, getT } from "@/i18n/server";
import { fmtDate } from "@/lib/format";
import styles from "./mentions/page.module.css";
import { GuideBar } from "./GuideBar";
import { Glissement } from "@/components/mobile/Glissement";
import { EnTete } from "@/components/EnTete";

type Bloc = (typeof ORDRE_DE_LA_PAGE)[number];

/** Les blocs de l'ancienne page « Mentions légales », choisis par identifiant, dans l'ordre demandé : un texte par sujet (19 novembre 2026, planche « Compte, connexion et textes », 1A). */
export const choisir = (...ids: string[]): Bloc[] =>
  ids.map((id) => ORDRE_DE_LA_PAGE.find((e) => ("legal" in e ? e.legal === id : e.doc.id === id))).filter((e): e is Bloc => Boolean(e));

/** Les sections elles-mêmes : un texte de `legal.ts` (celui qu'on accepte) ou une fiche de documentation. Aucun mot n'est réécrit ici. */
export async function SectionsDeTexte({ blocs }: { blocs: Bloc[] }) {
  const lang = await getLang();
  return (
    <>
      {blocs.map((e) => {
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
    </>
  );
}

/**
 * UNE PAGE, UN DOCUMENT (19 novembre 2026). L'ancienne page « Mentions légales » portait douze sections de trois natures : l'identité de la maison, les règles du jeu, et une présentation des services (« le résumé du site »). Chaque document a maintenant sa page, sa version, sa phrase ; la bande de menu n'existe que là où il y a de quoi se repérer (trois sections ou plus).
 */
export async function PageDeTexte({ surTitre, titre, phrase, version, blocs, guide }: { surTitre: string; titre: string; phrase: string; /** la version datée du texte, quand c'est un texte qu'on accepte */ version?: boolean; blocs: Bloc[]; guide: string }) {
  const [t, lang] = await Promise.all([getT(), getLang()]);
  const avecDoc = blocs.some((e) => "doc" in e);
  return (
    <Glissement>
      <div className={styles.wrap}>
        <EnTete surTitre={t(surTitre)} titre={t(titre)} phrase={t(phrase)} />
        {version && <p className={styles.version}>{t("Version du {date}", { date: fmtDate(LEGAL_VERSION) })}</p>}
        {blocs.length >= 3 && (
          <BandeDeLaPage label={t("Dans cette page")} onglets={blocs.map((e) => ("doc" in e ? { id: e.doc.id, nom: e.doc.onglet[lang] } : { id: e.legal, nom: e.onglet[lang] }))} />
        )}
        <SectionsDeTexte blocs={blocs} />
        {avecDoc && <p className={styles.version}>{t("Documentation relue le {date}", { date: fmtDate(SERVICES_RISQUES_RELU_LE) })}</p>}
        <GuideBar pos={{ label: t(guide) }} />
      </div>
    </Glissement>
  );
}
