import { notFound } from "next/navigation";
import Link from "next/link";
import { DeskNav } from "@/components/DeskNav";
import { requireDesk } from "@/lib/auth";
import { repo } from "@/lib/data";
import { getT } from "@/i18n/server";
import { fmtDate, localIso } from "@/lib/format";
import { DEF_INDICATEUR, INDICATEURS, derniereRevue, etatParSlug, fraicheurDeLaSaisie, institutionParSlug, serie } from "@/lib/market/pays";
import { FaitForm } from "../FaitForm";
import { retirerFait } from "../actions";
import styles from "../page.module.css";

export const dynamic = "force-dynamic";

const GENRE: Record<string, string> = { notation: "Notation", chiffre: "Chiffre des comptes" };

export default async function PaysDeskFichePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const etat = etatParSlug(slug);
  const inst = institutionParSlug(slug);
  if (!etat && !inst) notFound();
  await requireDesk(`/desk/pays/${slug}`);
  const t = await getT();
  const entite = (etat?.entite ?? inst?.entite)!;
  const nom = etat ? `${t("Trésor public")} · ${t(etat.pays)}` : inst!.nom;
  const r = repo();
  const [indicateurs, faits] = await Promise.all([r.listPaysIndicateurs(), r.listEntiteFaits(entite)]);
  const revue = derniereRevue(faits, entite);
  const fr = fraicheurDeLaSaisie(revue, localIso(new Date()));

  return (
    <>
      <DeskNav current="/desk/pays" />
      <main className={styles.page}>
        <header className={styles.tete}>
          <h1>{nom}</h1>
          <p className={styles.sous}>
            {revue ? `${t("Dernière revue le")} ${fmtDate(revue)}` : t("Jamais saisie")} · {t(fr.etat === "a_jour" ? "à jour" : fr.etat === "a_verifier" ? "à vérifier" : "à saisir")} ·{" "}
            <Link href={`/pays/${slug}`}>{t("Voir la fiche publiée")} →</Link>
          </p>
        </header>

        {etat && (
          <section>
            <h2>{t("Ce que le robot a lu")}</h2>
            <div className={styles.tableau}>
              <table>
                <thead>
                  <tr>
                    <th>{t("Indicateur")}</th>
                    <th>{t("Dernière valeur")}</th>
                    <th>{t("Source")}</th>
                    <th>{t("Lue le")}</th>
                  </tr>
                </thead>
                <tbody>
                  {INDICATEURS.map((i) => {
                    const s = serie(indicateurs, etat.pays, i);
                    const d = s.at(-1);
                    return (
                      <tr key={i}>
                        <td>{t(DEF_INDICATEUR[i].libelle)} <small>({t(DEF_INDICATEUR[i].unite)})</small></td>
                        <td>{d ? `${String(d.valeur).replace(".", ",")} · ${d.annee}${d.estime ? ` (${t("estimation ou prévision")})` : ""}` : t("non publié par la source")}</td>
                        <td>{t(DEF_INDICATEUR[i].source)}</td>
                        <td>{d ? fmtDate(d.luLe.slice(0, 10)) : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section>
          <h2>{t("Ajouter un fait")}</h2>
          <FaitForm entite={entite} institution={Boolean(inst)} />
        </section>

        <section>
          <h2>{t("Les faits saisis")}</h2>
          {faits.length === 0 ? (
            <p className={styles.sous}>{t("Aucun fait saisi pour le moment.")}</p>
          ) : (
            <div className={styles.tableau}>
              <table>
                <thead>
                  <tr>
                    <th>{t("Date")}</th>
                    <th>{t("Nature")}</th>
                    <th>{t("Qui")}</th>
                    <th>{t("Valeur")}</th>
                    <th>{t("Pièce")}</th>
                    <th>{t("Saisi par")}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {faits.map((f) => (
                    <tr key={f.id}>
                      <td>{fmtDate(f.dateFait)}</td>
                      <td>{t(GENRE[f.genre])}</td>
                      <td>{f.organisme}</td>
                      <td>
                        {f.valeur}
                        {f.perspective ? ` · ${f.perspective}` : ""}
                        {f.unite ? ` ${f.unite}` : ""}
                      </td>
                      <td>
                        <a href={f.url} target="_blank" rel="noreferrer">
                          {t("ouvrir")}
                        </a>
                      </td>
                      <td>{f.saisiPar}</td>
                      <td>
                        <form action={retirerFait}>
                          <input type="hidden" name="id" value={f.id} />
                          <button className={styles.retirer} type="submit">
                            {t("Retirer")}
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
