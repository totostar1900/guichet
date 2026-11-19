import Link from "next/link";
import { getSession } from "@/lib/auth";
import { COMPANY } from "@/lib/config";
import { CONVENTION_VERSION } from "@/data/legal";
import { PASSAGES, passage, resolvePassages } from "@/lib/documents/passages";
import { fmtDate } from "@/lib/format";
import { getLang, getT } from "@/i18n/server";
import styles from "./page.module.css";
import { Glissement } from "@/components/mobile/Glissement";
import { EnTete } from "@/components/EnTete";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Convention de compte-titres") };
}

/**
 * LA CONVENTION, EN LECTURE SEULE (19 novembre 2026, le client : « publier la convention, article 6 compris »).
 *
 * Elle se lisait derrière la connexion ; un prospect ne pouvait pas lire le contrat qu'on lui demandera de signer. Revolut publie les siens (conditions du compte, conditions de courtage), avec renvoi à la page des frais : l'article 6 fait de même, il ne contient aucune grille, il renvoie à l'annexe tarifaire remise par le conseiller. Il est publié tel quel, comme les neuf autres : AUCUN ARTICLE N'EST CACHÉ, car un exemplaire de lecture qui en tairait un serait un faux.
 *
 * LES MÊMES ARTICLES QUE CEUX DE LA SIGNATURE (le registre « PASSAGES », le texte en vigueur du desk, la langue du lecteur) : la page de signature et celle-ci ne peuvent pas dire deux choses. Seule la catégorie de client change : elle n'est connue qu'avec le dossier, l'exemplaire de lecture le dit.
 * CET EXEMPLAIRE NE SE SIGNE PAS : une page publique n'a pas d'identité. La convention se signe après l'approbation du dossier, sur sa propre page ; un client connecté y est renvoyé en tête. Le PDF du texte signé, lui, reste rangé dans ses documents.
 * Aucune grille, aucun tarif : l'annexe tarifaire n'est pas publique (le client, le 19 novembre).
 */
export default async function ConventionPubliquePage() {
  const [t, lang, s] = await Promise.all([getT(), getLang(), getSession().catch(() => null)]);
  const { text } = await resolvePassages("convention", lang);
  /* Les mêmes variables que l'exemplaire à signer, sauf la catégorie, qui dépend du dossier. */
  const vars = {
    societe: COMPANY.legalName,
    agrement: COMPANY.licence,
    email: COMPANY.email,
    categorie: t("professionnel ou non professionnel, selon votre dossier"),
  };
  const articles = (PASSAGES.convention ?? []).map((d) => ({ key: d.key, label: t(d.label), body: passage("convention", d.key, text, vars) }));

  return (
    <Glissement>
      <div className={styles.page}>
        <EnTete surTitre={t("Textes et conditions")} titre={t("Convention de compte-titres")} phrase={t("Le contrat entre vous et Purpose Capital : ce que vous nous confiez, ce que nous vous devons.")} />
        <p className={styles.version}>{t("Version du {date}", { date: fmtDate(CONVENTION_VERSION) })}</p>

        <aside className={styles.exemplaire} aria-label={t("Exemplaire de lecture")}>
          <b>{t("Exemplaire de lecture")}</b>
          <span>{t("Ce texte ne se signe pas ici. La convention se signe après l'approbation de votre dossier, sur sa propre page.")}</span>
          {s && s.role === "client" && (
            <Link className="btn sm" href="/ouvrir-un-compte/convention">
              {t("Ma convention")}
            </Link>
          )}
        </aside>

        <div className={styles.articles}>
          {articles.map((a) => (
            <section key={a.key} id={a.key}>
              <h2>{a.label}</h2>
              {a.body.split("\n").map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </section>
          ))}
        </div>

        <p className={styles.pied}>
          <Link href="/info/textes">{t("Tous les textes et conditions")}</Link>
        </p>
      </div>
    </Glissement>
  );
}
