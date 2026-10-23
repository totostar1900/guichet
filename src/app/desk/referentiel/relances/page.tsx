import Link from "next/link";
import { DeskNav } from "@/components/DeskNav";
import { requireResponsable } from "@/lib/auth";
import { repo } from "@/lib/data";
import { getT } from "@/i18n/server";
import { loadRelance } from "@/lib/policy";
import { NOM_DU_SUJET, pourquoiPasRelancer, prochainRappel, SUJETS } from "@/lib/domain/relance";
import { localIso } from "@/lib/format";
import { RelancesForm, type FileParSujet } from "./Form";
import { Ecartes, FileVivante } from "./Ecartes";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Rappels des procédures" };

/**
 * LES RAPPELS D'UNE PROCÉDURE LAISSÉE EN ROUTE, ET LE SEUL ENDROIT OÙ ILS SE
 * RÈGLENT.
 *
 * Un client ouvre son bulletin, lit le montant, va chercher son téléphone
 * pour le code, et ne revient pas. L'ordre existe, le desk l'a préparé,
 * l'argent n'est pas engagé, et plus personne n'en parle. La pastille le
 * savait déjà — mais la pastille ne se voit que si l'on revient, et le propre
 * de celui qui a abandonné est qu'il ne revient pas.
 *
 * POURQUOI CETTE PAGE EST PLUS BAVARDE QUE LES AUTRES RÉGLAGES. Le délai de
 * souffrance colore une colonne : une erreur s'y corrige le lendemain. Ici,
 * une case cochée de trop envoie cinq messages à chaque personne de la file,
 * et un message parti ne se rattrape pas. Le réglage montre donc ce qu'il
 * produira — la file sujet par sujet, le plafond de messages, et la phrase
 * telle que le client la lira — avant d'être enregistré.
 *
 * DEUX RÈGLES NE SONT PAS RÉGLABLES ICI, et c'est volontaire.
 *
 *   UN SEUL MESSAGE PAR JOUR ET PAR CLIENT. Un dossier chargé — une
 *   convention, deux bulletins, un mandat — ne produit pas quatre messages
 *   le même matin. Le sujet le plus bloquant parle, les autres attendent.
 *
 *   L'ÉCART DU CLIENT NE SE DISCUTE PAS. Un bouton dans son espace, et les
 *   rappels cessent pour ce devoir-là, sans motif et sans délai. C'est la
 *   contrepartie du droit de relancer, et une maison qui pourrait la
 *   reprendre d'un réglage ne la donnerait pas vraiment.
 */
export default async function RelancesPage() {
  await requireResponsable("/desk/referentiel/relances");
  const t = await getT();
  const p = await loadRelance();
  const r = repo();
  const aujourdHui = localIso(new Date());

  const toutes = await r.listRelances().catch(() => []);
  const contacts = await r.listContacts().catch(() => []);
  const nomDe = (userId: string) => contacts.find((c) => c.id === userId)?.name ?? userId.slice(0, 12);

  const file: FileParSujet[] = SUJETS.map((s) => {
    const siennes = toutes.filter((x) => x.sujet === s);
    return {
      sujet: s,
      enCours: siennes.filter((x) => x.state === "en_cours" && x.envois < p.rappels).length,
      ecartees: siennes.filter((x) => x.state === "ecartee").length,
      epuisees: siennes.filter((x) => x.state === "en_cours" && x.envois >= p.rappels).length,
    };
  });

  /* Ce que le prochain tour fera, ligne par ligne : la page du robot dit s'il
     a tourné, celle-ci dit ce qu'il trouvera. */
  const vivantes = toutes
    .filter((x) => x.state === "en_cours")
    .map((x) => ({
      id: x.id,
      qui: nomDe(x.userId),
      sujet: NOM_DU_SUJET[x.sujet],
      envois: x.envois,
      refus: pourquoiPasRelancer(x, p, aujourdHui),
      prochain: prochainRappel(x, p),
      depuis: x.ouvertLe,
    }))
    .sort((a, b) => a.depuis.localeCompare(b.depuis))
    .slice(0, 40);

  const ecartes = toutes
    .filter((x) => x.state === "ecartee")
    .map((x) => ({ id: x.id, qui: nomDe(x.userId), sujet: NOM_DU_SUJET[x.sujet], envois: x.envois, motif: x.motif, le: x.closLe?.slice(0, 10) ?? x.ouvertLe }))
    .sort((a, b) => b.le.localeCompare(a.le))
    .slice(0, 30);

  const RAISON: Record<string, string> = {
    inactive: "rappels désactivés",
    sujet_decoche: "sujet décoché",
    sans_canal: "aucun canal",
    epuisee: "série épuisée",
    trop_tot: "pas encore",
    deja_aujourdhui: "déjà parti aujourd'hui",
    week_end: "week-end",
  };

  return (
    <>
      <DeskNav current="/desk/referentiel" />
      <div className={styles.page}>
        <header className={styles.tete}>
          <h1>{t("Rappels des procédures")}</h1>
          <p className="muted">
            {t(
              "Quand un client commence une démarche qui engage une décision — une convention, un bulletin, un mandat — et ne la termine pas, la maison le lui rappelle. Ce qui suit règle combien de fois, à partir de quand, par quel canal et avec quels mots.",
            )}
          </p>
        </header>

        <section className="panel">
          <div className="panel-h">
            <h2>{t("Ce qui déclenche un rappel")}</h2>
          </div>
          <div className={styles.corps}>
            <p>
              {t(
                "Un devoir écrit, jamais une hésitation. Un bulletin émis, un mandat créé, une convention approuvée, des pièces demandées : ces quatre-là existent en base parce que le client a cliqué. Un formulaire rempli et non envoyé n'existe pas, et il ne doit pas exister — écrire « vous étiez sur le point de placer 250 000 FCFA » à quelqu'un qui a justement renoncé n'est pas un service.",
              )}
            </p>
            <p>
              {t(
                "Le client n'a que deux chemins, et tous deux mènent à sa décision : finir, ou vider son panier — retirer l'ordre, supprimer le mandat. L'un et l'autre éteignent le rappel d'eux-mêmes, parce que le devoir disparaît. Il n'a pas de bouton pour faire taire un rappel sans décider : ce serait garder le panier plein, et un ordre qui dort finit par peser sur sa tenue.",
              )}
            </p>
          </div>
        </section>

        <section className="panel">
          <div className="panel-h">
            <h2>{t("Le réglage")}</h2>
          </div>
          <div className={styles.corps}>
            <RelancesForm politique={p} file={file} exemple={{ prenom: t("Awa"), quoi: "FCP Obligations CEMAC", lien: "https://guichet.purposecapital.africa/moi/ordres/…" }} />
          </div>
        </section>

        <section className="panel">
          <div className="panel-h">
            <h2>{t("Ce que le prochain tour fera")}</h2>
            <span className="muted">{t("tous les jours à 9 h 20")}</span>
          </div>
          <div className={styles.corps}>
            <FileVivante rows={vivantes} plafond={p.rappels} raisons={RAISON} />
          </div>
        </section>

        <section className="panel">
          <div className="panel-h">
            <h2>{t("Ceux qui ont demandé qu'on se taise")}</h2>
          </div>
          <div className={styles.corps}>
            <p>
              {t(
                "Interrompre et reprendre se font l'un comme l'autre à la demande du client, et le motif est gardé : ces deux gestes ne nous appartiennent pas, et ils se reliront dans six mois sans que personne se souvienne de l'appel. La démarche, elle, reste ouverte et visible dans leur espace — se taire n'annule rien.",
              )}
            </p>
            <Ecartes rows={ecartes} />
          </div>
        </section>

        <section className="panel">
          <div className="panel-h">
            <h2>{t("Où cela se voit ailleurs")}</h2>
          </div>
          <div className={styles.corps}>
            <p className="muted">
              {t("Les messages partis figurent au journal des notifications, et les tours du robot à la page Santé.")} <Link href="/desk/messages">{t("Messages")}</Link> ·{" "}
              <Link href="/desk/sante">{t("Santé")}</Link> · <Link href="/desk/robot">{t("Robot")}</Link>
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
