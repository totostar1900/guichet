import { requireSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { etatDeLAttente, motDuNiveau, prete } from "@/lib/domain/sondage";
import { getT } from "@/i18n/server";
import { fmt, fmtDate, fmtPct } from "@/lib/format";
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

  /* LE NIVEAU EST LE TAUX, sur les deux compartiments : un coupon sur une OTA,
     un taux précompté sur un bon. Le prix d'une OTA ne paraît pas ici — il
     n'entre ni dans l'échelle ni dans la moyenne, voir « domain/sondage ». */
  const niveau = (l: { rate?: number }) => (l.rate != null ? fmtPct(l.rate, 2) : null);
  /**
   * QUAND : TOUJOURS UNE DATE, et jamais le délai tel qu'il a été écrit.
   *
   * RELEVÉ À L'ÉCRAN le 26 octobre 2026. La première écriture rendait
   * « dans 21 jours » pour une question posée le 19 : lu le 26, cela se
   * comprend « le 16 novembre », alors que la ligne dit le 9. Le délai est la
   * façon dont son auteur l'a écrit ; la date est ce qu'il voulait dire, et
   * c'est la seule chose qu'un lecteur puisse vérifier. C'est le même défaut
   * que celui de `prete`, du côté de l'affichage, et c'est la même fonction
   * qui le ferme.
   */
  const quand = (l: { seanceLe?: string; dansJours?: number; createdAt: string }) => {
    const j = prete(l);
    return j ? fmtDate(j, false) : null;
  };

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
                    "Les six Trésors de la CEMAC décident seuls de ce qu'ils émettent, et quand. Ce qu'ils achètent à une société de bourse, c'est le renseignement : à quel niveau la demande tient encore, et pour combien.",
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
                const n = niveau(q);
                const d = quand(q);
                const mienne = repondu.get(q.id);
                return (
                  <li key={q.id} className={styles.question}>
                    <div className={styles.entete}>
                      <b className={styles.ligne}>
                        {q.instrument} · {t(q.country)} · {q.tenor}
                      </b>
                      <span className={`mono ${styles.ref}`}>{q.ref}</span>
                    </div>
                    {/* LES FAITS EN UNE PHRASE, et non en trois colonnes
                        d'étiquettes en capitales : on les lit d'un trait, et
                        seul le montant est mis en avant — c'est lui qui dit si
                        la ligne est à notre taille. */}
                    <p className={styles.faits}>
                      <b>{fmt(q.montant)} FCFA</b>
                      {n ? ` · ${t("autour de {r}", { r: n })}` : ""}
                      {d ? ` · ${t("séance visée le {d}", { d })}` : ""}
                    </p>
                    {q.note && <p className={styles.note}>{q.note}</p>}
                    {mienne ? (
                      <p className={styles.deja}>
                        {t("Vous avez répondu {m} FCFA, à partir du {d}", { m: fmt(mienne.montant), d: quand(mienne) ?? "—" })}{" "}
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
                const n = niveau(m);
                const d = quand(m);
                return (
                  <li key={m.id} className={styles.attente} data-etat={e.etat}>
                    <div className={styles.entete}>
                      <span className={styles.pastille} data-etat={e.etat}>
                        {t(e.mot)}
                      </span>
                      <b className={styles.ligne}>
                        {m.instrument} · {t(m.country)} · {m.tenor}
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
                    <p className={styles.faits}>
                      <b>{fmt(m.montant)} FCFA</b>
                      {n ? ` · ${t(motDuNiveau(m.instrument) === "taux" ? "au taux d'au moins {r}" : "au coupon d'au moins {r}", { r: n })}` : ""}
                      {d ? ` · ${t("à partir du {d}", { d })}` : ""}
                    </p>
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
