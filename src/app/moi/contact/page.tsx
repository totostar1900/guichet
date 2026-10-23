import Link from "next/link";
import { Glissement, LienRetour } from "@/components/mobile/Glissement";
import { requireSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { contexteDuClient } from "@/lib/domain/contexte-client";
import { getT } from "@/i18n/server";
import { ConseillerCard } from "./ConseillerCard";
import feuillet from "@/components/Feuillet.module.css";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nous contacter" };

/**
 * NOUS JOINDRE, SUR UNE PAGE ET NON AU BAS D'UNE AUTRE.
 *
 * La carte du conseiller vivait au pied de « Trade », sous les neuf services :
 * on y tombait en descendant une page qu'on était venu lire pour AGIR. Deux
 * intentions sur un même écran, et la seconde ne se trouve que par accident —
 * personne ne descend une page de services pour chercher un numéro.
 *
 * Elle a donc sa page, et le rail y mène. C'est la même règle qui a sorti les
 * leçons de « Trade » le même jour : une page qui fait agir ne fait que cela,
 * et ce qui se lit a sa porte.
 *
 * LA PAGE NOMME LES TROIS CHEMINS DANS L'ORDRE DE CE QU'ILS COÛTENT au client,
 * et non de ce qu'ils coûtent à la maison : écrire à la personne qui vous
 * suit, chercher la réponse tout seul, ou ouvrir une réclamation quand ce qui
 * s'est passé ne va pas. La réclamation est nommée et non cachée : une maison
 * qui n'écrit pas le mot oblige son client à l'inventer.
 */
export default async function ContactPage() {
  const s = await requireSession("/moi/contact");
  const t = await getT();
  const r = repo();

  const [ctx, intents, advisor, dossier] = await Promise.all([
    contexteDuClient(s.userId),
    r.listIntents(),
    r.findAdvisor(s.userId).catch(() => undefined),
    r.getClientFileByUser(s.userId).catch(() => undefined),
  ]);

  /* La dernière intention par la date, pas par l'ordre de la table : le
     message préparé la cite, et citer la mauvaise ferait perdre du temps aux
     deux bouts. */
  const derniere = [...intents.filter((i) => i.clientId === s.userId)].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]?.ref;

  return (
    <Glissement>
      <div className={feuillet.page}>
        {/* LE RETOUR EST UN LIEN, ET IL DIT SA DIRECTION. Le bouton du
            téléphone remonte l'historique sans jouer d'animation : celui-ci
            remonte la HIÉRARCHIE, et le glissement vers la droite dit qu'on
            sort d'un cran. */}
        <nav className={feuillet.fil}>
          <LienRetour href="/aide">{t("Aide")}</LienRetour>
        </nav>
      <header className={feuillet.tete}>
        <h1>{t("Nous contacter")}</h1>
        <p>{t("Une personne suit votre compte. Écrivez-lui : le message part avec ce qu'il faut pour qu'on n'ait pas à vous demander qui vous êtes.")}</p>
      </header>

      <ConseillerCard anchor="conseiller" advisor={advisor} client={{ nom: s.name, compte: dossier?.review.custodianAccount, lignes: ctx.lignes, derniere }} />

      <section className={styles.autres}>
        <p>
          {t("La réponse est souvent déjà écrite : le guide répond aux questions courantes, et les éclairages expliquent ce qui se passe derrière un ordre.")}{" "}
          <Link href="/info">{t("Le guide")}</Link>
        </p>
        {/* LA RÉCLAMATION SE NOMME. Une maison qui n'écrit pas le mot oblige
            son client à l'inventer, et c'est précisément quand il va mal
            qu'il ne doit pas avoir à chercher ses mots. */}
        <p>
          {t("Si quelque chose s'est mal passé et qu'un message ne suffit pas, déposez une réclamation : elle est enregistrée, datée, et vous en suivez le traitement.")}{" "}
          <Link href="/moi/reclamation">{t("Déposer une réclamation")}</Link>
        </p>
      </section>
      </div>
    </Glissement>
  );
}
