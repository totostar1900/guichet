import { DeskNav } from "@/components/DeskNav";
import { Fait } from "@/components/desk/Fait";
import { getT } from "@/i18n/server";
import { requireDesk } from "@/lib/auth";
import { listerAnnonces } from "@/lib/annonce";
import { ANNONCE_JOURS_MAX, annonceEnCours } from "@/lib/domain/annonce";
import { fmtDate } from "@/lib/format";
import { FormulaireAnnonce, RetirerAnnonce } from "./FormulaireAnnonce";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Annonce" };

const plusJours = (jour: string, n: number) => {
  const d = new Date(`${jour}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/**
 * « ANNONCE » : UNE PHRASE DE LA MAISON AU-DESSUS DES PAGES (14 novembre 2026, planche 4A).
 *
 * Une information de la maison sur la maison (une séance annoncée, une fermeture, un incident), pas une ligne mise en avant : « À la une » et les actualités restent où elles sont.
 * Une seule annonce à la fois, une date de fin, jamais un conseil ni une urgence ; publier ou retirer demande une seconde réponse, et les deux gestes sont écrits à l'audit.
 */
export default async function AnnoncePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const t = await getT();
  const sp = await searchParams;
  const un = (k: string) => (Array.isArray(sp[k]) ? (sp[k] as string[])[0] : (sp[k] as string | undefined));
  await requireDesk("/desk/annonce");
  const aujourdhui = new Date().toISOString().slice(0, 10);
  const toutes = await listerAnnonces();
  const enCours = annonceEnCours(toutes, aujourdhui);
  const passees = toutes.filter((a) => a.id !== enCours?.id).slice(0, 5);
  const etat = (a: (typeof toutes)[number]) => (a.retireeLe ? (a.motifDeRetrait === "remplacée" ? t("remplacée") : t("retirée")) : a.jusquAu < aujourdhui ? t("échue") : t("en cours"));

  return (
    <>
      <DeskNav current="/desk/annonce" />
      <main className={styles.page}>
        <header className={styles.tete}>
          <h1>{t("Annonce")}</h1>
          <p className="muted">{t("Une phrase de la maison au-dessus des pages : une séance annoncée, une fermeture, un incident. Une seule à la fois, une date de fin. Jamais un conseil.")}</p>
        </header>
        {un("publiee") && (
          <Fait fermer="/desk/annonce" libelle={t("Fermer")}>
            {t("L'annonce est publiée jusqu'au {d}.", { d: un("publiee") ?? "" })}
          </Fait>
        )}
        {un("retiree") && (
          <Fait fermer="/desk/annonce" libelle={t("Fermer")}>
            {t("L'annonce est retirée.")}
          </Fait>
        )}

        <section className={styles.carte} aria-labelledby="en-cours">
          <h2 id="en-cours">{t("En cours")}</h2>
          {enCours ? (
            <div className={styles.encours}>
              <p>{enCours.texte}</p>
              <small>{t("Jusqu'au {d} · publiée par {p}", { d: fmtDate(enCours.jusquAu), p: enCours.publieePar })}</small>
              <RetirerAnnonce id={enCours.id} texte={enCours.texte} />
            </div>
          ) : (
            <p className="muted">{t("Aucune annonce en cours : les clients ne voient rien au-dessus des pages.")}</p>
          )}
        </section>

        <section className={styles.carte} aria-labelledby="publier">
          <h2 id="publier">{t("Publier une annonce")}</h2>
          <FormulaireAnnonce aujourdhui={aujourdhui} defaut={plusJours(aujourdhui, 7)} max={plusJours(aujourdhui, ANNONCE_JOURS_MAX)} enCours={enCours?.texte} />
        </section>

        {passees.length > 0 && (
          <section className={styles.carte} aria-labelledby="passees">
            <h2 id="passees">{t("Les dernières")}</h2>
            <ul className={styles.passees}>
              {passees.map((a) => (
                <li key={a.id}>
                  <span>{a.texte}</span>
                  <small>
                    {etat(a)} · {t("jusqu'au {d}", { d: fmtDate(a.jusquAu) })} · {a.publieePar}
                  </small>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </>
  );
}
