import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { INTENT_LABEL, INTENT_STATE_LABEL, ordreSignable, retirableParLeClient } from "@/lib/domain/intent";
import { fmt, fmtDate, fmtPct } from "@/lib/format";
import type { Intent, Offer } from "@/lib/domain/types";
import { CounterAnswer } from "../CounterAnswer";
import { CarteOrdre } from "./Carte";
import { getT } from "@/i18n/server";
import { Glissement } from "@/components/mobile/Glissement";
import { EnTete } from "@/components/EnTete";
import styles from "../page.module.css";
import detail from "./Carte.module.css";

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
   pas reculé : l'ordre est là, il attend une réponse.
   ILS SE NOMMENT SOUS LES SEGMENTS depuis le 1er novembre 2026. La piste
   montrait cinq barres anonymes et la légende était écrite une fois, en tête
   de section, à quatre cents pixels de la carte la plus basse. */
const STOPS: Intent["state"][] = ["recue", "confirmee", "transmise", "servie", "reglee"];
const ARRET_NOM: Record<string, string> = { recue: "reçue", confirmee: "confirmée", transmise: "transmise", servie: "servie", reglee: "réglée" };
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

  /**
   * LE DÉTAIL DE L'OPÉRATION, RENDU PAR LE SERVEUR.
   *
   * CE QUI NE SE LISAIT NULLE PART, et que la donnée portait depuis toujours :
   * la date de l'ordre, le prix limite posé par le client, le prix auquel il a
   * été exécuté, la part servie et les titres reçus, le canal par lequel il
   * est arrivé. La carte disait « Prise ferme · 1 500 000 FCFA · réf. … », ce
   * qui est l'intention et non l'opération.
   *
   * IL EST RENDU ICI ET PASSÉ EN ÉLÉMENT, plutôt que de voyager en chaînes
   * jusqu'au composant client. Les montants et les dates se formatent avec
   * `fmt` et `fmtDate`, qui lisent la langue du lecteur : les laisser au
   * navigateur ferait rendre une valeur au serveur et une autre au client,
   * c'est-à-dire la discordance d'hydratation que la maison a corrigée cinq
   * fois en octobre.
   */
  const detailsDe = (i: Intent, o?: Offer) => {
    const lignes: [string, string][] = [
      [t("Passé le"), fmtDate(i.createdAt)],
      [t("Référence"), i.ref],
    ];
    if (i.limitPrice != null) lignes.push([t("Votre limite"), `${fmt(i.limitPrice)} FCFA`]);
    if (i.executedPrice != null) lignes.push([t("Prix exécuté"), `${fmt(i.executedPrice)} FCFA`]);
    if (i.allocationPct != null) lignes.push([t("Part servie"), fmtPct(i.allocationPct, 0)]);
    if (i.servedUnits != null) lignes.push([t("Titres servis"), fmt(i.servedUnits)]);
    if (i.signedAt) lignes.push([t("Signé le"), fmtDate(i.signedAt)]);
    if (o) lignes.push([t("La ligne"), t(o.title)]);
    if (i.closedReason) lignes.push([t("Motif"), t(i.closedReason)]);
    return (
      <dl className={detail.lignes}>
        {lignes.map(([quoi, valeur]) => (
          <div key={quoi}>
            <dt>{quoi}</dt>
            <dd>{valeur}</dd>
          </div>
        ))}
      </dl>
    );
  };

  /**
   * LE GESTE ATTENDU DU CLIENT, QUAND IL Y EN A UN.
   *
   * C'est la réparation la plus coûteuse de cet écran. La carte disait
   * « Signez le bulletin et effectuez le virement » et ne menait nulle part :
   * l'écran où l'on signe — « /moi/ordres/{id} », avec sa signature par code —
   * existe depuis des semaines, les ordres CLOS y mènent, et les ordres en
   * cours n'y menaient pas. Le seul ordre qui avait quelque chose à faire
   * était le seul sans porte.
   *
   * RIEN LÀ OÙ RIEN N'EST ATTENDU. Un ordre transmis au SVT n'attend pas le
   * client : lui poser un bouton serait lui demander de faire ce que personne
   * n'attend de lui, et c'est exactement ce que la flèche dorée faisait.
   */
  const gesteDe = (i: Intent) => {
    if (ordreSignable(i)) return { mot: t("Signer et payer"), href: `/moi/ordres/${i.id}` };
    /* UNE CONTRE-PROPOSITION SANS SES TERMES. Quand le desk a changé l'état
       sans poser les conditions, « CounterAnswer » rend null et la carte
       retombe sur sa phrase : « votre réponse est attendue ». C'était un
       devoir sans moyen — le défaut même que cet écran vient de réparer
       ailleurs — et l'écran de l'ordre ne sait pas répondre non plus, il ne
       connaît que la signature. Le seul geste vrai est alors de nous écrire,
       et c'est celui qu'on offre. */
    if (i.state === "contre_proposee" && !i.counter) return { mot: t("Nous écrire"), href: "/moi/contact" };
    return undefined;
  };

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
            {/* LA LÉGENDE A QUITTÉ L'EN-TÊTE DE SECTION : chaque piste porte
                maintenant ses arrêts sous ses segments, et une légende qui
                répète cinq mots à quatre cents pixels de la carte la plus
                basse ne sert personne. Reste ce que la section dit d'elle. */}
            <span className="muted">{t("ce qui attend quelque chose de quelqu'un")}</span>
          </div>
          <div className="panel">
            {ouvertes.length === 0 && <div className="empty">{t("Aucune intention en cours : choisissez une ligne dans Guichet.")}</div>}
            {ouvertes.length > 0 && (
              <div className={styles.cards}>
                {ouvertes.map((i) => {
                  const o = byOffer.get(i.offerId);
                  /* Une contre-proposition se décide sur la carte : c'est le oui
                     du client qui change l'ordre. « i.counter » est dans la
                     condition et pas seulement dans le composant : sans les
                     termes, celui-ci rend null, et la carte n'afficherait alors
                     RIEN à la place de sa phrase de suite — un ordre qui attend
                     une réponse sans dire laquelle. */
                  const counter = i.state === "contre_proposee" && o && i.counter ? <CounterAnswer intent={i} offer={o} now={new Date()} /> : undefined;
                  return (
                    <CarteOrdre
                      key={i.id}
                      id={i.id}
                      etat={i.state}
                      etatLabel={t(INTENT_STATE_LABEL[i.state])}
                      titre={o ? t(o.title) : i.offerId}
                      ligneHref={`/offres/${i.offerId}`}
                      /* LA DATE SANS SON ARTICLE : « Prise ferme · 1 500 000 FCFA · 20 oct. ».
                         Les points médians font déjà la liste, et « le » y ajoutait une
                         clef à trous de six caractères — la maison en borne le nombre,
                         parce qu'une clef trop courte se retrouve dans dix contextes et
                         ne se traduit juste dans aucun. Le dépli, lui, dit « Passé le ». */
                      resume={`${t(INTENT_LABEL[i.type])}${i.amount ? ` · ${montant(i, o?.kind)}` : ""} · ${fmtDate(i.createdAt, false)}`}
                      etape={stopIndex(i.state)}
                      arrets={STOPS.map((st) => t(ARRET_NOM[st]))}
                      suite={t((o?.kind === "FONDS" ? NEXT_FUND : NEXT)[i.state])}
                      geste={gesteDe(i)}
                      counter={counter}
                      details={detailsDe(i, o)}
                      retirable={retirableParLeClient(i)}
                      raisonNonRetrait={
                        retirableParLeClient(i)
                          ? undefined
                          : t(
                              i.state === "transmise" || i.state === "servie" || i.state === "non_servie" || i.state === "reglee"
                                ? "L'ordre est parti au marché : il ne se retire plus, ni par vous ni par nous."
                                : "Vous avez signé cet ordre : appelez-nous pour le retirer.",
                            )
                      }
                      refOrdre={i.ref}
                    />
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
