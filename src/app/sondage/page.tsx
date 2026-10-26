import { requireSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { etatDeLAttente, motDuNiveau, prete } from "@/lib/domain/sondage";
import { getT } from "@/i18n/server";
import { fmt, fmtDate, fmtPct } from "@/lib/format";
import { Glissement } from "@/components/mobile/Glissement";
import { EnTete } from "@/components/EnTete";
import { EnBref } from "@/components/EnBref";
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
    return j ? fmtDate(j, false) : "—";
  };

  return (
    <Glissement>
      <main className={styles.page}>
        <EnTete
          surTitre={t("Investissez")}
          titre={t("Sondage")}
          phrase={t(
            "Dire ce que vous prendriez avant qu'une séance ouvre. Rien ici ne vous engage : c'est un renseignement que la maison porte au Trésor, et c'est lui qui décide s'il emprunte.",
          )}
          aCote={<EnBref cles={["sondage"]} titre="Le sondage en bref" />}
        />

        {/* CE QUE LA MAISON DEMANDE. Une question close ne paraît pas : elle
            n'attend plus de réponse, et la montrer barrée ferait chercher un
            bouton qui n'existe plus. */}
        <section className={styles.bloc}>
          <h2 className={styles.titre}>{t("Ce que la maison demande en ce moment")}</h2>
          {ouvertes.length === 0 ? (
            <div className="empty">
              {t("Aucune ligne sondée en ce moment. Vous pouvez tout de même proposer la vôtre plus bas : c'est de là que partent la plupart des séances que nous obtenons.")}
            </div>
          ) : (
            <ul className={styles.liste}>
              {ouvertes.map((q) => {
                const n = niveau(q);
                const mienne = repondu.get(q.id);
                return (
                  <li key={q.id} className={styles.question}>
                    <div className={styles.entete}>
                      <b>
                        {q.instrument} · {t(q.country)} · {q.tenor}
                      </b>
                      <span className="mono">{q.ref}</span>
                    </div>
                    <dl className={styles.faits}>
                      <div>
                        <dt>{t("Ce que la maison cherche")}</dt>
                        <dd>{fmt(q.montant)} FCFA</dd>
                      </div>
                      <div>
                        <dt>{t(motDuNiveau(q.instrument) === "taux" ? "Taux indiqué" : "Coupon indiqué")}</dt>
                        <dd>{n ?? t("à dire")}</dd>
                      </div>
                      <div>
                        <dt>{t("Séance visée")}</dt>
                        <dd>{quand(q)}</dd>
                      </div>
                    </dl>
                    {q.note && <p className={styles.note}>{q.note}</p>}
                    {mienne ? (
                      <p className={styles.deja}>
                        {t("Vous avez répondu : {m} FCFA, {d}.", { m: fmt(mienne.montant), d: quand(mienne) })}{" "}
                        <span className={styles.second}>{t("Répondre de nouveau remplace cette réponse.")}</span>
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
            <div className="empty">{t("Vous n'avez encore rien dit. Répondre à une ligne ci-dessus prend deux chiffres.")}</div>
          ) : (
            <ul className={styles.liste}>
              {[...vivantes, ...closes].map((m) => {
                const e = etatDeLAttente(m);
                return (
                  <li key={m.id} className={styles.attente}>
                    <div className={styles.entete}>
                      <span className={styles.pastille} data-etat={e.etat}>
                        {t(e.mot)}
                      </span>
                      <b>
                        {m.instrument} · {t(m.country)} · {m.tenor}
                      </b>
                      <span className="mono">{m.ref}</span>
                    </div>
                    <dl className={styles.faits}>
                      <div>
                        <dt>{t("Ce que vous prendriez")}</dt>
                        <dd>{fmt(m.montant)} FCFA</dd>
                      </div>
                      {niveau(m) && (
                        <div>
                          <dt>{t(motDuNiveau(m.instrument) === "taux" ? "Au taux d'au moins" : "Au coupon d'au moins")}</dt>
                          <dd>{niveau(m)}</dd>
                        </div>
                      )}
                      <div>
                        <dt>{t("Prêt à partir du")}</dt>
                        <dd>{quand(m)}</dd>
                      </div>
                    </dl>
                    <p className={styles.dit}>{t(e.phrase)}</p>
                    {m.closedReason && <p className={styles.motif}>{m.closedReason}</p>}
                    {m.state !== "close" && <Retirer id={m.id} ref_={m.ref} />}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className={styles.bloc}>
          <h2 className={styles.titre}>{t("Proposer votre propre ligne")}</h2>
          <p className={styles.chapo}>
            {t(
              "Si ce que vous cherchez n'est pas sondé, dites-le : le desk réunit les demandes qui se ressemblent et les porte au Trésor concerné. Une ligne se porte quand plusieurs clients la demandent, donc votre réponse compte même seule.",
            )}
          </p>
          <ProposerMaLigne />
        </section>
      </main>
    </Glissement>
  );
}
