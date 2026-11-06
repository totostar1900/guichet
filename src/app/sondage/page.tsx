import { requireSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { etatDeLAttente, motDuNiveau, prete, rendementDeLaLigne } from "@/lib/domain/sondage";
import { gabaritDeSondage } from "@/lib/domain/gabarit";
import { choixDeLAdresse, comparatifDeLigne } from "@/lib/domain/sondage-comparatif";
import type { LigneSondee } from "@/lib/domain/types";
import { getT } from "@/i18n/server";
import { fmtDate, fmtPct, fmtUnits, localIso } from "@/lib/format";
import { Glissement } from "@/components/mobile/Glissement";
import { EnTete } from "@/components/EnTete";
import { EnBref } from "@/components/EnBref";
import { Repondre, ProposerMaLigne, Retirer } from "./Formulaires";
import { ComparatifDesSeances } from "./ComparatifDesSeances";
import { RangeeDeSondage } from "./RangeeDeSondage";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sondage" };

/**
 * LA PAGE DU SONDAGE, QUI N'EN AVAIT PAS.
 *
 * CE QUE LE DIRIGEANT A DEMANDÉ : « Le sondage demande une page à lui. Pour
 * l'instant il mène aux adjudications, où il n'a pas sa place. »
 *
 * ET IL AVAIT RAISON SUR LE FOND, pas seulement sur le rangement. La tuile
 * « Sondage » menait au calendrier des adjudications, c'est-à-dire à la liste
 * des séances DÉJÀ ANNONCÉES. Or le sondage sert précisément à l'inverse : dire
 * ce qu'on prendrait AVANT qu'une séance existe. Le client qui suivait la tuile
 * arrivait donc sur l'écran qui prouvait que le service ne servait à rien — il
 * n'y avait plus rien à sonder, tout était déjà là.
 *
 * ─── L'ORDRE DE LA PAGE, ET IL EST DÉLIBÉRÉ ────────────────────────────────
 *
 *   CE QUE LA MAISON DEMANDE, en premier. C'est la seule chose ici dont le
 *   client ne peut pas deviner l'existence, et c'est ce pour quoi il vient :
 *   répondre coûte un montant et une date, et vaut un rappel avant la clôture.
 *
 *   CE QU'IL A DÉJÀ DIT, ensuite. « L'attente du client est gardée sur sa
 *   page » : sans ce bloc, il redirait chaque mois la même chose, ou rien.
 *
 *   SA PROPRE LIGNE, en dernier et replié. C'est le geste le plus rare et le
 *   plus long — six champs — et le mettre en tête ferait croire qu'il faut
 *   inventer une ligne pour se servir de la page.
 *
 * CE QUE LA PAGE NE MONTRE PAS, et c'est un refus : le consensus. Savoir qui
 * prendrait combien est exactement ce qu'un concurrent voudrait lire, et un
 * client qui verrait la demande totale avant de répondre ajusterait son niveau
 * dessus — ce qui ferait du sondage un marché, et d'un renseignement une
 * enchère. Le consensus est au desk, et il n'en sort que porté à un Trésor.
 */
/**
 * CE QU'UNE INTENTION REND AU FORMULAIRE QUI LA ROUVRE.
 *
 * ELLE REND SES DEUX DATES, ET PLUS UN DÉLAI. Le champ demandait un nombre de
 * jours, la page répondait par une date, et le nombre rendu n'était même pas
 * celui qu'on avait tapé : c'était ce qui restait à courir, quatorze le 26
 * pour un « vingt et un » écrit le 19. Le client écrit maintenant le jour, et
 * c'est ce jour que la base garde.
 */
const modifiable = (l: LigneSondee) => ({
  id: l.id,
  montant: l.montant,
  rate: l.rate,
  pricePct: l.pricePct,
  pretLe: prete(l),
  jusquA: l.jusquA,
  note: l.note,
  instrument: l.instrument,
  country: l.country,
  tenor: l.tenor,
});

type Props = { searchParams: Promise<{ ligne?: string; pays?: string; duree?: string }> };

export default async function SondagePage({ searchParams }: Props) {
  const { ligne, pays, duree } = await searchParams;
  const t = await getT();
  const s = await requireSession("/sondage");
  const r = repo();
  const aujourdHui = localIso(new Date());

  const [questions, miennes] = await Promise.all([r.listLignesSondees({ origine: "desk" }), r.listLignesSondees({ userId: s.userId })]);
  const ouvertes = questions.filter((q) => q.state !== "close");
  const repondu = new Map(miennes.filter((m) => m.repondA && m.state !== "close").map((m) => [m.repondA!, m]));
  const vivantes = miennes.filter((m) => m.state !== "close");
  const closes = miennes.filter((m) => m.state === "close");

  /* « MODIFIER » ET « RETIRER » VIVENT DANS LE DÉTAIL (3 novembre 2026) : « Modifier » est le bouton
     principal de la page d'une intention, « Retirer » reste un lien — le geste définitif ne doit pas
     être le premier sous la main, et il demande toujours une seconde confirmation. */
  /* Le montant se dit une seule fois dans la page, et c'est celui des chiffres : le libellé de la confirmation le relit de là. */
  const montantDe = (m: LigneSondee) => chiffresDe(m, "attente", t).find((c) => c.fort)?.dit ?? "";
  const gestes = (m: LigneSondee) =>
    m.state !== "close" && (
      <div className={styles.gestes}>
        {m.repondA ? (
          <Repondre question={{ id: m.repondA, instrument: m.instrument, mot: motDuNiveau(m.instrument) }} existante={modifiable(m)} aujourdHui={aujourdHui} />
        ) : (
          <ProposerMaLigne existante={modifiable(m)} bouton aujourdHui={aujourdHui} />
        )}
        <Retirer id={m.id} ref_={m.ref} libelle={`${gabaritDeSondage(m)} · ${montantDe(m)}`} />
      </div>
    );

  const etatDe = (m: LigneSondee): { mot: string; ton: "bon" | "attention" | "neutre" } => {
    const e = etatDeLAttente(m);
    return { mot: e.mot, ton: e.etat === "consolidee" ? "bon" : "neutre" };
  };

  /* UNE LIGNE DU CLIENT, OU UNE QUESTION DU DESK : la page dédiée sert les deux (« les questions du
     desk aussi »). Sur une question, le niveau est celui que la maison indique. */
  const duDesk = ligne ? questions.find((q) => q.id === ligne) : undefined;
  const choisie = ligne ? (miennes.find((m) => m.id === ligne) ?? duDesk) : undefined;
  if (choisie) {
    const role = duDesk && choisie === duDesk ? "question" : "attente";
    const e = etatDeLAttente(choisie);
    const historique = await r.listAuctionResults({ instrument: choisie.instrument, confirmed: true, limit: 3000 });
    const cmp = comparatifDeLigne(choisie, historique, aujourdHui, choixDeLAdresse(choisie, pays, duree));
    return (
      <Glissement>
        <main className={styles.page}>
          <EnTete surTitre={t("Mon intention")} titre={gabaritDeSondage(choisie)} retour={{ href: "/sondage", mot: t("Sondage") }} />
          {/* TROIS BLOCS EMPILÉS : ce que le client a dit, ce que la place a servi, les gestes.
              Le chapitre de la place se tait quand aucune séance n'est comparable. */}
          <section className={styles.bloc}>
            <h2 className={styles.titre}>{t(role === "attente" ? "Ce que vous avez dit" : "Ce que la maison demande")}</h2>
            <p className={styles.etatLigne}>
              {role === "attente" ? (
                <span className={styles.pastille} data-etat={e.etat}>
                  {t(e.mot)}
                </span>
              ) : repondu.get(choisie.id) ? (
                <span className={styles.pastille}>{t("Répondu")}</span>
              ) : null}{" "}
              <span className={`mono ${styles.ref}`}>{choisie.ref}</span>
            </p>
            <dl className={styles.vosChiffres}>
              {chiffresDe(choisie, role, t).map((c) => (
                <div key={c.quoi} className={styles.tuileChiffre}>
                  <dt className={styles.etiquette}>{c.quoi}</dt>
                  <dd className={styles.grosChiffre}>{c.dit}</dd>
                </div>
              ))}
            </dl>
            {role === "question" && choisie.note && <p className={styles.note}>{choisie.note}</p>}
            {choisie.closedReason && <p className={styles.motif}>{choisie.closedReason}</p>}
          </section>
          {cmp && (
            <section className={styles.bloc}>
              <h2 className={styles.titre}>{t("Ce que la place a servi")}</h2>
              <ComparatifDesSeances c={cmp} rendementLimite={rendementDeLaLigne(choisie)} role={role} base={`/sondage?ligne=${choisie.id}`} t={t} />
            </section>
          )}
          {role === "attente" ? (
            gestes(choisie)
          ) : (
            <div className={styles.gestes}>
              <Repondre question={{ id: choisie.id, instrument: choisie.instrument, mot: motDuNiveau(choisie.instrument) }} existante={repondu.get(choisie.id) ? modifiable(repondu.get(choisie.id)!) : undefined} aujourdHui={aujourdHui} />
            </div>
          )}
        </main>
      </Glissement>
    );
  }

  return (
    <Glissement>
      <main className={styles.page}>
        <EnTete
          surTitre={t("Investissez")}
          titre={t("Sondage")}
          /**
           * UNE SEULE PORTE D'EXPLICATION, ET C'EST LA BULLE (29 octobre 2026) : l'explication du
           * service vit dans le « en bref », pas dans un accordéon à dix centimètres de la phrase.
           * DEUX SOUS-TEXTES, ET AUCUN NE NOMME LE VIDE : une page ne dit pas « il n'y a rien », elle
           * dit ce qu'on y fait. Le second remonte ce que le premier taisait — que pousser sa propre
           * ligne est ce qui fait naître les séances.
           */
          phrase={
            ouvertes.length === 0
              ? t("Dire ce que vous prendriez avant qu'une séance ouvre. Proposez la ligne que vous cherchez : la plupart des séances que nous obtenons en viennent, et rien ne vous engage.")
              : t("Dire ce que vous prendriez avant qu'une séance ouvre. Répondez à une ligne, ou proposez celle que vous cherchez : la plupart des séances que nous obtenons en viennent, et rien ne vous engage.")
          }
          aCote={<EnBref brief="sondage" />}
        />

        {/* LE TITRE POSE LA QUESTION : « Combien investiriez-vous ? » demande quelque chose, et c'est
            exactement ce que la page attend du client. Il est à plat au-dessus de sa carte, qui ne
            porte que des rangées : la grammaire de l'Accueil. Chaque rangée ouvre SA question ; la
            réponse rapide se déplie sous elle, sur place. Une question close ne paraît pas : elle
            n'attend plus de réponse. RIEN NE S'ÉCRIT QUAND RIEN N'EST SONDÉ : la phrase du haut vient
            de dire quoi faire, et le bouton « Proposer votre propre ligne » est juste dessous. */}
        {ouvertes.length > 0 && (
          <section className={styles.bloc}>
            <h2 className={styles.titre}>
              {t("Combien investiriez-vous ?")} <small className={styles.compte}>{ouvertes.length}</small>
            </h2>
            <ul className={styles.carte}>
              {ouvertes.map((q) => {
                const mienne = repondu.get(q.id);
                return (
                  <li key={q.id}>
                    <RangeeDeSondage l={q} role="question" etat={{ mot: mienne ? "Répondu" : "À répondre", ton: mienne ? "bon" : "attention" }} t={t} />
                    <div className={styles.rapide}>
                      <Repondre question={{ id: q.id, instrument: q.instrument, mot: motDuNiveau(q.instrument) }} existante={mienne ? modifiable(mienne) : undefined} forme="sobre" aujourdHui={aujourdHui} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* LE BOUTON A SA PROPRE BANDE, ENTRE LES DEUX LISTES (29 octobre 2026) : il est la suite de la
            question qu'on vient de lire — « et si ce que je cherche n'y était pas ? » — et la porte de
            ce qu'on va trouver en dessous. */}
        <ProposerMaLigne aujourdHui={aujourdHui} />

        <section className={styles.bloc} id="mes-attentes">
          <h2 className={styles.titre}>
            {t("Mes intentions")} {vivantes.length > 0 && <small className={styles.compte}>{vivantes.length}</small>}
          </h2>
          {vivantes.length === 0 && closes.length === 0 ? (
            <p className={styles.vide}>{t("Rien encore. Répondre à une ligne ci-dessus prend deux chiffres ; proposer la vôtre en prend six.")}</p>
          ) : (
            <>
              {vivantes.length > 0 && (
                <ul className={styles.carte}>
                  {vivantes.map((m) => (
                    <li key={m.id}>
                      <RangeeDeSondage l={m} role="attente" etat={etatDe(m)} t={t} />
                    </li>
                  ))}
                </ul>
              )}
              {/* CE QUI EST CLOS S'EFFACE SANS DISPARAÎTRE : replié sous la liste, on peut le retrouver —
                  « remplacée par votre nouvelle réponse » répond à une question qu'on se pose — sans qu'il
                  dispute la place à ce qui vit. */}
              {closes.length > 0 && (
                <details className={styles.closes}>
                  <summary>{t("Closes ({n})", { n: String(closes.length) })}</summary>
                  <ul className={styles.carte}>
                    {closes.map((m) => (
                      <li key={m.id}>
                        <RangeeDeSondage l={m} role="attente" etat={etatDe(m)} t={t} />
                        {m.closedReason && <p className={styles.motif}>{m.closedReason}</p>}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </>
          )}
        </section>
      </main>
    </Glissement>
  );
}

/**
 * LES CHIFFRES D'UNE LIGNE SONDÉE, ÉCRITS UNE FOIS pour la tuile de la liste et pour la page dédiée.
 *
 * LE PRIX EST DEDANS (3 novembre 2026) : « prix max », tel que le client l'a saisi : un plafond, car un acheteur plafonne ce qu'il paie
 * (le dirigeant a tranché le 3 novembre 2026 : « prix max partout »). Le rendement qui en découle
 * reste à côté, il compare.
 */
function chiffresDe(l: LigneSondee, role: "question" | "attente", t: (s: string, v?: Record<string, string>) => string): { quoi: string; dit: string; fort?: boolean }[] {
  /* Le niveau est un taux sur les deux compartiments — coupon sur une OTA, taux précompté sur un bon :
     même sens, deux mots, voir « motDuNiveau ». */
  const mot = motDuNiveau(l.instrument);
  /* « IND. » POUR LA MAISON, « MIN. » POUR LE CLIENT, et c'est la seule chose que le rôle change : la
     maison indique un niveau, le client pose un plancher. L'œil compare les chiffres, pas les mots. */
  const q = role === "question" ? "ind." : "min.";
  /* Toujours une date, jamais le délai tel qu'il a été écrit : « dans 21 jours » posé le 19 se relit
     « le 16 novembre » quand la ligne dit le 9. */
  const j = prete(l);
  /* LE RENDEMENT EST LE CHIFFRE QUI COMPARE : un coupon de 6,25 % acheté à 97 ne rend pas 6,25 %. Un
     bon n'en a pas — son taux EST son rendement. */
  const r = rendementDeLaLigne(l);
  return [
    role === "attente" ? { quoi: t("montant"), dit: fmtUnits(l.montant, true), fort: true } : null,
    l.rate != null ? { quoi: `${t(mot === "taux" ? "taux" : "coupon")} ${q}`, dit: fmtPct(l.rate, 2) } : null,
    l.pricePct != null ? { quoi: `${t("prix")} ${role === "question" ? "ind." : t("max")}`, dit: fmtPct(l.pricePct, Number.isInteger(l.pricePct) ? 0 : 2) } : null,
    r != null ? { quoi: `${t("rendement")} ${q}`, dit: fmtPct(r, 2) } : null,
    j ? { quoi: t("prête vers"), dit: fmtDate(j, false) } : null,
    l.jusquA ? { quoi: t("valable jusqu'au"), dit: fmtDate(l.jusquA, false) } : null,
  ].filter((x): x is { quoi: string; dit: string; fort?: boolean } => x !== null);
}
