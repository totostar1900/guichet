import Link from "next/link";
import { DeskNav } from "@/components/DeskNav";
import { requireDesk } from "@/lib/auth";
import { repo } from "@/lib/data";
import { getT } from "@/i18n/server";
import { fmtDate, localIso } from "@/lib/format";
import { ETATS, INSTITUTIONS, derniereRevue, fraicheurDeLaSaisie } from "@/lib/market/pays";
import { Rafraichir } from "./Rafraichir";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Fiches pays" };

/**
 * LES FICHES PAYS : CE QUE LE ROBOT A LU, ET CE QUE LE DESK A SAISI (7 novembre 2026).
 *
 * Chaque fiche a deux fraîcheurs. Les indicateurs du FMI et de la Banque mondiale se relisent chaque mois par un robot. Les notations, l'évaluation du FMI et les chiffres de
 * comptes des comptes se saisissent chaque trimestre par le responsable ou un opérateur ; passé un trimestre sans saisie, le bloc se lit « à vérifier ».
 * La fiche ne montre que des faits, avec leur pièce : aucun champ de commentaire n'existe ici.
 */
export default async function PaysDeskPage() {
  await requireDesk("/desk/pays");
  const t = await getT();
  const r = repo();
  const [indicateurs, faits] = await Promise.all([r.listPaysIndicateurs(), r.listEntiteFaits()]);
  const aujourdhui = localIso(new Date());
  const lignes = [
    ...ETATS.map((e) => ({ slug: e.slug, entite: e.entite, nom: `${t("Trésor public")} · ${t(e.pays)}`, pays: e.pays as string | undefined })),
    ...INSTITUTIONS.map((i) => ({ slug: i.slug, entite: i.entite, nom: i.nom, pays: undefined as string | undefined })),
  ].map((l) => {
    const lus = l.pays ? indicateurs.filter((x) => x.pays === l.pays) : [];
    const lu = lus.map((x) => x.luLe.slice(0, 10)).sort().at(-1);
    const f = faits.filter((x) => x.entite === l.entite);
    return { ...l, lus: lus.length, lu, faits: f.length, revue: derniereRevue(faits, l.entite), fraicheur: fraicheurDeLaSaisie(derniereRevue(faits, l.entite), aujourdhui) };
  });

  return (
    <>
      <DeskNav current="/desk/pays" />
      <main className={styles.page}>
        <header className={styles.tete}>
          <h1>{t("Fiches pays")}</h1>
          <p className={styles.sous}>{t("La santé économique et financière de chaque émetteur, en faits seuls : indicateurs du FMI et de la Banque mondiale lus par un robot, notations saisies chaque trimestre, chacun avec sa pièce.")}</p>
        </header>
        <Rafraichir />
        <ul className={styles.liste}>
          {lignes.map((l) => (
            <li key={l.slug}>
              <Link className={styles.ligne} href={`/desk/pays/${l.slug}`}>
                <span>
                  <b>{l.nom}</b>
                  <small>/pays/{l.slug}</small>
                </span>
                <span>
                  <b>{l.pays ? `${l.lus} ${t("valeurs lues")}` : "—"}</b>
                  <small>{l.pays ? (l.lu ? `${t("lues le")} ${fmtDate(l.lu)}` : t("jamais lues")) : t("pas d'indicateur automatique")}</small>
                </span>
                <span>
                  <b>{l.faits} {t("faits saisis")}</b>
                  <small>{l.revue ? `${t("dernière revue le")} ${fmtDate(l.revue)}` : t("jamais saisis")}</small>
                </span>
                <span>
                  <span className={`${styles.pastille} ${l.fraicheur.etat === "a_jour" ? styles.bon : l.fraicheur.etat === "a_verifier" ? styles.attention : styles.neutre}`}>
                    {t(l.fraicheur.etat === "a_jour" ? "à jour" : l.fraicheur.etat === "a_verifier" ? "à vérifier" : "à saisir")}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
