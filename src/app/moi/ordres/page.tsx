import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { INTENT_LABEL, INTENT_STATE_LABEL } from "@/lib/domain/intent";
import { fmt, fmtDate } from "@/lib/format";
import type { Intent } from "@/lib/domain/types";
import { CounterAnswer } from "../CounterAnswer";
import { OrdreMenu } from "../OrdreMenu";
import { getT } from "@/i18n/server";
import { Glissement } from "@/components/mobile/Glissement";
import { EnTete } from "@/components/EnTete";
import styles from "../page.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Vos intentions") };
}

/**
 * VOS INTENTIONS, EN COURS ET PASSÉES.
 *
 * Elles se développaient sur la page d'accueil : cinq crans de piste, un menu
 * de gestes et une phrase de suite par carte, à deux mille pixels du titre.
 * Une page d'accueil répond à « qu'est-ce que j'ai » ; suivre un ordre est une
 * autre question, et une question qui a sa page ne se déplie pas sur une
 * autre.
 *
 * DEUX TROUS QUE CETTE PAGE BOUCHE, et le second se lisait depuis le 24
 * octobre 2026 :
 *
 *   UNE CONTRE-PROPOSITION N'APPARAISSAIT NULLE PART. Le relevé filtrait
 *   « reçue, confirmée, transmise » et rien d'autre : l'état qui attend
 *   justement une réponse du client tombait entre les deux listes, et la carte
 *   capable de l'afficher — celle qui monte « CounterAnswer » — ne pouvait
 *   donc jamais paraître. Elle est ici, dans les en cours, où elle est due.
 *
 *   IL N'EXISTAIT AUCUNE LISTE DES ORDRES PASSÉS. Le point 11 l'avait relevé
 *   sans pouvoir le réparer : une tuile promettait « Vos ordres passés » et
 *   ouvrait le journal des espèces, qui compte autre chose. La tuile a été
 *   renommée d'après sa destination réelle ; la liste manquante est là.
 *
 * CE QUI EST EN COURS SE DÉPLOIE, CE QUI EST CLOS SE RANGE. Un ordre en cours
 * attend quelque chose de quelqu'un : il porte sa phrase de suite et ses
 * gestes. Un ordre réglé n'attend plus rien, et une carte de cent pixels pour
 * dire « réglée » ferait de l'archive un mur.
 */

/* Les cinq arrêts par lesquels passe tout ordre. Une contre-proposition n'a
   pas reculé : l'ordre est là, il attend une réponse. */
const STOPS: Intent["state"][] = ["recue", "confirmee", "transmise", "servie", "reglee"];
const stopIndex = (st: Intent["state"]) => (st === "non_servie" ? 3 : st === "annulee" ? -1 : st === "contre_proposee" ? 0 : STOPS.indexOf(st));

const EN_COURS: Intent["state"][] = ["recue", "contre_proposee", "confirmee", "transmise"];

const NEXT: Record<string, string> = {
  recue: "Un conseiller vous rappelle avant la clôture.",
  contre_proposee: "Nous vous proposons d’autres conditions : votre réponse est attendue.",
  confirmee: "Signez le bulletin et effectuez le virement indiqué sur l'appel de fonds.",
  transmise: "Ordre transmis au SVT : résultats attendus le jour de l'adjudication.",
  servie: "Servi. Règlement à la date indiquée, puis avis d'opéré.",
  non_servie: "Non servi. Fonds restitués sous deux jours ouvrés.",
  reglee: "Titres inscrits à votre nom. Prochain coupon selon l'échéancier de l'avis d'opéré.",
  annulee: "Annulée.",
};
const NEXT_FUND: Record<string, string> = {
  recue: "Un conseiller vous rappelle pour confirmer.",
  contre_proposee: "Nous vous proposons d’autres conditions : votre réponse est attendue.",
  confirmee: "Signez le bulletin de souscription et effectuez le virement indiqué sur l'appel de fonds.",
  transmise: "Ordre transmis à la société de gestion : exécution à la prochaine valeur liquidative.",
  servie: "Exécuté à la VL retenue. Inscription des parts au registre, puis avis d'opération.",
  non_servie: "Non exécuté. Fonds restitués sous deux jours ouvrés.",
  reglee: "Parts inscrites à votre nom au registre du dépositaire ; valeur suivant la VL publiée.",
  annulee: "Annulée.",
};

export default async function OrdresPage() {
  const t = await getT();
  const s = await requireSession("/moi/ordres");
  const r = repo();
  const [intents, offers] = await Promise.all([r.listIntents(), r.listOffers()]);
  const mine = intents.filter((i) => i.clientId === s.userId);
  const byOffer = new Map(offers.map((o) => [o.id, o]));
  /* Une ligne qui n'est plus listée — repassée au brouillon, retirée — existe
     toujours : l'historique garde son nom et sa fiche. */
  const missing = [...new Set(mine.map((i) => i.offerId).filter((id) => !byOffer.has(id)))];
  for (const o of await Promise.all(missing.map((id) => r.getOffer(id).catch(() => undefined)))) if (o) byOffer.set(o.id, o);

  const recent = (a: Intent, b: Intent) => b.createdAt.localeCompare(a.createdAt);
  const ouvertes = mine.filter((i) => EN_COURS.includes(i.state)).sort(recent);
  const closes = mine.filter((i) => !EN_COURS.includes(i.state)).sort(recent);

  const montant = (i: Intent, kind?: string) => (i.amount ? (i.type === "rachat" ? `${i.amount.toLocaleString("fr-FR", { maximumFractionDigits: 3 })} parts` : `${fmt(i.amount)} ${kind === "RACHAT" ? "titres" : "FCFA"}`) : "");

  return (
    <Glissement>
      <main className={styles.wrap}>
        <EnTete
          retour={{ href: "/", mot: t("Tableau de bord") }}
          surTitre={t("Votre dossier")}
          titre={t("Vos intentions")}
          phrase={t("Chaque ordre que vous avez dit, et où il en est. Un ordre en cours dit ce qu'il attend ; un ordre clos garde sa date et sa référence.")}
        />

        <section className={styles.sec}>
          <div className={styles.secTete}>
            <h2>{t("En cours")}</h2>
            <span className="muted">{t("reçue → confirmée → transmise → servie → réglée")}</span>
          </div>
          <div className="panel">
            {ouvertes.length === 0 && <div className="empty">{t("Aucune intention en cours : choisissez une ligne dans Guichet.")}</div>}
            {ouvertes.length > 0 && (
              <div className={styles.cards}>
                {ouvertes.map((i) => {
                  const o = byOffer.get(i.offerId);
                  const k = stopIndex(i.state);
                  return (
                    <div key={i.id} className={styles.card}>
                      <div className={styles.cardTop}>
                        <div>
                          <b>{o ? <Link href={`/offres/${o.id}`}>{t(o.title)}</Link> : i.offerId}</b>
                          <small>
                            {t(INTENT_LABEL[i.type])}
                            {i.amount ? ` · ${montant(i, o?.kind)}` : ""} · {t("réf.")} {i.ref}
                          </small>
                        </div>
                        <span className={`st ${i.state}`}>{t(INTENT_STATE_LABEL[i.state])}</span>
                        <OrdreMenu intentId={i.id} offerId={i.offerId} etat={i.state} ref_={i.ref} signe={Boolean(i.signedAt)} />
                      </div>
                      {/* Une contre-proposition se décide ici : c’est le oui du client qui change l’ordre.
                          « i.counter » est dans la condition et pas seulement
                          dans le composant : sans les termes, celui-ci rend
                          null, et la carte n'affichait alors RIEN entre son
                          titre et sa piste — un ordre qui attend une réponse
                          sans dire laquelle. La phrase de suite prend le
                          relais, et elle le dit. */}
                      {i.state === "contre_proposee" && o && i.counter ? <CounterAnswer intent={i} offer={o} now={new Date()} /> : <div className={styles.next}>{t((o?.kind === "FONDS" ? NEXT_FUND : NEXT)[i.state])}</div>}
                      <div className={styles.track} aria-label={t("Étape {n} sur 5", { n: k + 1 })}>
                        {STOPS.map((st, n) => (
                          <i key={st} className={n <= k ? styles.done : undefined} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* CE QUI EST CLOS SE RANGE EN LIGNES. L'état suffit : un ordre réglé
            n'attend rien de personne, et sa fiche dit le reste. */}
        <section className={styles.sec}>
          <div className={styles.secTete}>
            <h2>{t("Passées")}</h2>
            <Link href="/moi/performance#operations">{t("Vos opérations")} →</Link>
          </div>
          <div className="panel">
            {closes.length === 0 && <div className="empty">{t("Rien de clos pour l'instant.")}</div>}
            {closes.length > 0 && (
              <ul className={styles.ordres}>
                {closes.map((i) => {
                  const o = byOffer.get(i.offerId);
                  return (
                    <li key={i.id}>
                      <Link href={`/moi/ordres/${i.id}`}>
                        <span className={styles.quoiOrdre}>
                          <b>{o ? t(o.title) : i.offerId}</b>
                          <small>
                            {t(INTENT_LABEL[i.type])}
                            {i.amount ? ` · ${montant(i, o?.kind)}` : ""} · {t("réf.")} {i.ref}
                          </small>
                        </span>
                        <span className={`st ${i.state}`}>{t(INTENT_STATE_LABEL[i.state])}</span>
                        <span className={styles.quandOrdre}>{fmtDate(i.createdAt, false)}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      </main>
    </Glissement>
  );
}
