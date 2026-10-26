import { Fragment } from "react";
import { requireSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { etatDeLAttente, motDuNiveau, prete } from "@/lib/domain/sondage";
import type { LigneSondee } from "@/lib/domain/types";
import { getT } from "@/i18n/server";
import { fmtDate, fmtPct, fmtPrice, fmtUnits } from "@/lib/format";
import { Glissement } from "@/components/mobile/Glissement";
import { EnTete } from "@/components/EnTete";
import { EnBref } from "@/components/EnBref";
import { Pourquoi } from "@/components/Pourquoi";
import { Repondre, ProposerMaLigne, Retirer } from "./Formulaires";
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
export default async function SondagePage() {
  const t = await getT();
  const s = await requireSession("/sondage");
  const r = repo();

  const [questions, miennes] = await Promise.all([r.listLignesSondees({ origine: "desk" }), r.listLignesSondees({ userId: s.userId })]);
  const ouvertes = questions.filter((q) => q.state !== "close");
  const repondu = new Map(miennes.filter((m) => m.repondA && m.state !== "close").map((m) => [m.repondA!, m]));
  const vivantes = miennes.filter((m) => m.state !== "close");
  const closes = miennes.filter((m) => m.state === "close");

  return (
    <Glissement>
      <main className={styles.page}>
        <EnTete
          surTitre={t("Investissez")}
          titre={t("Sondage")}
          phrase={
            <>
              {t("Dire ce que vous prendriez avant qu'une séance ouvre. Rien ici ne vous engage.")}
              <Pourquoi titre="À quoi sert un sondage" petit>
                <p>
                  {t(
                    "Les six Trésors de la CEMAC décident seuls de ce qu'ils émettent, et quand. Ce qu'ils achètent à une société de bourse, c'est le renseignement : à quel niveau la demande tient encore, et pour combien. Une ligne sondée ici n'annonce donc aucune séance : c'est la maison qui réunit les appétits, avant qu'il y ait quoi que ce soit à annoncer.",
                  )}
                </p>
                <p>
                  {t(
                    "Votre réponse entre dans ce renseignement. Ce n'est pas un ordre : il n'y a rien à signer et rien à provisionner, et vous la retirez quand vous voulez. Si une séance s'ouvre sur une ligne que vous avez demandée, le desk vous rappelle avant la clôture.",
                  )}
                </p>
              </Pourquoi>
            </>
          }
          aCote={<EnBref cles={["sondage"]} titre="Le sondage en bref" />}
        />

        {/* CE QUE LA MAISON DEMANDE. Une question close ne paraît pas : elle
            n'attend plus de réponse, et la montrer barrée ferait chercher un
            bouton qui n'existe plus. */}
        <section className={styles.bloc}>
          <h2 className={styles.titre}>{t("Ce que la maison demande")}</h2>
          {ouvertes.length === 0 ? (
            <p className={styles.vide}>{t("Rien n'est sondé en ce moment. Proposez la vôtre plus bas : c'est de là que partent la plupart des séances que nous obtenons.")}</p>
          ) : (
            <ul className={styles.liste}>
              {ouvertes.map((q) => {
                const mienne = repondu.get(q.id);
                const d = mienne && prete(mienne);
                return (
                  <li key={q.id} className={styles.question}>
                    <div className={styles.entete}>
                      <b className={styles.ligne}>
                        {q.instrument} · {t(q.country)}
                      </b>
                      <span className={`mono ${styles.ref}`}>{q.ref}</span>
                    </div>
                    <Faits l={q} role="question" t={t} />
                    {q.note && <p className={styles.note}>{q.note}</p>}
                    {mienne ? (
                      <p className={styles.deja}>
                        {t("Vous avez répondu {m}, à partir du {d}", { m: fmtUnits(mienne.montant, true), d: d ? fmtDate(d, false) : "—" })}{" "}
                        <span className={styles.second}>{t("Répondre à nouveau remplace cette réponse.")}</span>
                      </p>
                    ) : null}
                    <Repondre question={{ id: q.id, instrument: q.instrument, mot: motDuNiveau(q.instrument) }} />
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* CE QU'IL A DÉJÀ DIT. C'est la demande du dirigeant — « l'attente du
            client est gardée sur sa page » — et c'est aussi ce qui rend le
            service crédible : une attente qu'on ne retrouve pas est une attente
            qu'on n'a jamais eu l'impression de donner. */}
        <section className={styles.bloc} id="mes-attentes">
          <h2 className={styles.titre}>{t("Ce que vous avez dit")}</h2>
          {vivantes.length === 0 && closes.length === 0 ? (
            <p className={styles.vide}>{t("Rien encore. Répondre à une ligne ci-dessus prend deux chiffres.")}</p>
          ) : (
            <ul className={styles.attentes}>
              {[...vivantes, ...closes].map((m) => {
                const e = etatDeLAttente(m);
                return (
                  <li key={m.id} className={styles.attente} data-etat={e.etat}>
                    <div className={styles.entete}>
                      <span className={styles.pastille} data-etat={e.etat}>
                        {t(e.mot)}
                      </span>
                      <b className={styles.ligne}>
                        {m.instrument} · {t(m.country)}
                      </b>
                      {/* L'ÉTAT PASSE DERRIÈRE LE POINT : il est vrai en
                          permanence et identique d'une attente à l'autre, donc
                          il se replie. La page le répétait quatre fois, trois
                          lignes chacune. Le MOTIF d'une clôture, lui, reste à
                          l'écran : il change d'une ligne à l'autre. */}
                      <Pourquoi titre={e.etat === "close" ? "Une attente close" : e.etat === "consolidee" ? "Une attente portée au Trésor" : "Une attente reçue"} petit>
                        <p>{t(e.phrase)}</p>
                      </Pourquoi>
                      <span className={`mono ${styles.ref}`}>{m.ref}</span>
                    </div>
                    <Faits l={m} role="attente" t={t} />
                    {m.closedReason && <p className={styles.motif}>{m.closedReason}</p>}
                    {m.state !== "close" && <Retirer id={m.id} ref_={m.ref} />}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* LE CHAPÔ DE TROIS LIGNES PASSE DERRIÈRE LE POINT : il explique un
            geste qu'on ne fait qu'une fois, et il séparait le titre du bouton
            qui le suit. Ce qui reste est le titre, et le bouton. */}
        <section className={styles.bloc}>
          <h2 className={styles.titre}>
            {t("Proposer votre ligne")}
            <Pourquoi titre="Proposer sa propre ligne" petit>
              <p>
                {t(
                  "Si ce que vous cherchez n'est pas sondé, dites-le : le desk réunit les demandes qui se ressemblent et les porte au Trésor concerné. Une ligne se porte quand plusieurs clients la demandent, donc votre réponse compte même seule.",
                )}
              </p>
              <p>{t("Six champs : le compartiment, le Trésor, la durée, le niveau, le montant, et la date à partir de laquelle vous seriez prêt.")}</p>
            </Pourquoi>
          </h2>
          <ProposerMaLigne />
        </section>
      </main>
    </Glissement>
  );
}

/**
 * LA BANDE DE FAITS, ÉCRITE UNE FOIS POUR LES DEUX TUILES.
 *
 * CE QUE LE DIRIGEANT A DEMANDÉ, le 26 octobre 2026 : « harmoniser les tuiles
 * du sondage — montant court, maturité, coupon pour une OTA, taux pour un
 * bon ». Les deux tuiles de cette page portent la même chose et la disaient
 * autrement : la question de la maison annonçait « 500 000 000 FCFA · autour de
 * 6,25 % · séance visée le 9 nov. », l'attente du client « 250 000 000 FCFA ·
 * au coupon d'au moins 6,10 % · à partir du 3 nov. ». Trois écarts pour une
 * seule information : la durée était en haut d'un côté et absente de l'autre,
 * le montant était écrit au franc, et la date promettait une séance.
 *
 * ELLE EST DONC UNE FONCTION, ET NON DEUX GABARITS. Deux listes qui décrivent
 * la même chose divergent au premier changement — celle qu'on retouche, et
 * celle qu'on oublie. Le `role` ne change QUE le sens du niveau, qui n'est pas
 * le même : la maison dit un niveau INDICATIF, le client dit un PLANCHER.
 * Confondre les deux ferait porter au Trésor un chiffre que personne n'a dit.
 *
 * LE MONTANT EST COURT — « 500 M FCFA », « 1,2 Md FCFA » — parce qu'une tuile
 * se compare d'un coup d'œil : neuf chiffres se comptent, un ordre de grandeur
 * se voit. Le franc exact reste au desk, où l'on porte la demande.
 *
 * ET LA DATE NE PROMET PLUS DE SÉANCE. « Séance visée le 9 nov. » disait ce que
 * la maison ne peut pas dire : elle n'adjuge pas, et le sondage ne suit aucun
 * calendrier annoncé — c'est elle qui réunit les appétits, avant qu'il y ait
 * quoi que ce soit à annoncer. « À partir du » dit la même date sans la
 * promesse, et c'est le même mot dans les deux rôles.
 */
function Faits({ l, role, t }: { l: LigneSondee; role: "question" | "attente"; t: (s: string, v?: Record<string, string>) => string }) {
  /* LE NIVEAU EST LE TAUX, sur les deux compartiments : un coupon sur une OTA,
     un taux précompté sur un bon — même sens, deux mots, voir « motDuNiveau ».
     Le prix d'une OTA suit quand le client en a donné un : il est hors de
     l'échelle et hors de la moyenne, mais c'est un chiffre qu'il a écrit, et
     une attente qu'on ne se relit pas est une attente qu'on redit. */
  const mot = motDuNiveau(l.instrument);
  /* TOUJOURS UNE DATE, et jamais le délai tel qu'il a été écrit : « dans
     21 jours » posé le 19 se lit « le 16 novembre » quand la ligne dit le 9.
     C'est `prete` qui compte depuis la création, pour les deux rôles. */
  const j = prete(l);
  const suite: string[] = [l.tenor];
  if (l.rate != null) {
    const r = fmtPct(l.rate, 2);
    suite.push(
      role === "question"
        ? t(mot === "taux" ? "taux indicatif {r}" : "coupon indicatif {r}", { r })
        : t(mot === "taux" ? "taux {r} au moins" : "coupon {r} au moins", { r }),
    );
  }
  if (l.pricePct != null) suite.push(t("prix {p} au plus", { p: fmtPrice(l.pricePct) }));
  if (j) suite.push(t("à partir du {d}", { d: fmtDate(j, false) }));
  return (
    <p className={styles.faits}>
      {/* LE MONTANT PORTE LE DEGRÉ DU CHIFFRE — c'est lui qu'on cherche : la
          ligne est-elle à notre taille ? — et le reste suit en encre atténuée,
          dans la même phrase, parce qu'on le lit d'un trait. */}
      <b>{fmtUnits(l.montant, true)}</b>
      {/* CHAQUE FAIT TIENT SUR UNE LIGNE, séparateur compris, et L'ESPACE QUI
          LES SÉPARE RESTE DEHORS.

          Relevé à 412 px, deux fois de suite. D'abord la bande se cassait sur
          « à / partir du 18 nov. » : un fait coupé en deux se relit deux fois.
          Puis, l'espace mis DANS le morceau insécable, la bande n'avait plus
          une seule occasion de passer à la ligne — quatre faits en un seul mot
          de quatre-vingts signes, et la fin de la ligne du Congo disparaissait
          hors du cadre. C'est l'espace qui porte la coupure : dedans, il n'y a
          plus de coupure nulle part. */}
      {suite.map((p) => (
        <Fragment key={p}>
          {" "}
          <span className={styles.fait}>{`· ${p}`}</span>
        </Fragment>
      ))}
    </p>
  );
}
