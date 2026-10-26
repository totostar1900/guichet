import { DeskNav } from "@/components/DeskNav";
import { getT } from "@/i18n/server";
import { requireDesk } from "@/lib/auth";
import { repo } from "@/lib/data";
import { SEUIL_CLIENTS, SEUIL_MONTANT, consensus, motDuNiveau, mur, prete } from "@/lib/domain/sondage";
import { fmt, fmtDate, fmtPct } from "@/lib/format";
import { Pourquoi } from "@/components/Pourquoi";
import { PoserUneQuestion, Statuer } from "./Formulaires";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sondage" };

/**
 * CE QUE LE DESK REÇOIT, ET CE QUE LE ROBOT EN PROPOSE.
 *
 * CE QUE LE DIRIGEANT A DEMANDÉ : « Le desk recevra les lignes avec toutes
 * leurs caractéristiques (OTA, BTA, pays, maturité, coupon, prix, date…) et un
 * robot consolidera et proposera un consensus. »
 *
 * LE CONSENSUS SE CALCULE À LA LECTURE, ET C'EST UN CHOIX. Il est une fonction
 * pure des lignes : le faire écrire par un robot dans une table créerait un
 * chiffre qui vieillit — le desk lirait un consensus de la veille pendant qu'une
 * réponse de ce matin l'a déjà déplacé, et personne ne verrait l'écart. Ce que
 * le robot fait, lui, est ce qu'une lecture ne peut pas faire : clore ce dont la
 * date est passée, et PRÉVENIR quand un consensus franchit le seuil. Voir
 * « lib/sondage/tour ».
 *
 * L'ORDRE DE LA PAGE SUIT CELUI DE LA DÉCISION : d'abord ce qui est mûr — une
 * ligne qu'on peut porter à un Trésor aujourd'hui —, puis ce qui s'accumule,
 * puis les questions ouvertes, puis la question qu'on pose. Un desk qui ouvre
 * cette page le matin veut savoir en une seconde s'il a un coup de fil à passer.
 */
export default async function SondageDeskPage() {
  const t = await getT();
  await requireDesk("/desk/sondage");
  const r = repo();
    const lignes = await r.listLignesSondees();
  const groupes = consensus(lignes);
  const murs = groupes.filter(mur);
  const jeunes = groupes.filter((c) => !mur(c));
  const questions = lignes.filter((l) => l.origine === "desk" && l.state !== "close");
  const parId = new Map(lignes.map((l) => [l.id, l]));

  /* UN SEUL NIVEAU, UNE SEULE UNITÉ : le taux. Mêler des prix à des taux dans
     la même colonne — 99,00 % à côté de 6,30 % — était illisible, et c'est ce
     que la capture du 26 octobre 2026 a montré. */
  const niveau = (c: (typeof groupes)[number]) => (c.niveau == null ? t("sans condition") : fmtPct(c.niveau, 2));

  /** Une ligne du groupe, telle qu'elle est arrivée : toutes ses caractéristiques. */
  const demandesDe = (cle: string) =>
    lignes.filter((l) => {
      if (l.origine === "desk" || l.state === "close") return false;
      const sur = l.repondA ? parId.get(l.repondA) : undefined;
      return sur ? `desk:${sur.id}` === cle : `${l.instrument}|${l.country}|${l.tenor.trim().toLowerCase()}` === cle;
    });

  return (
    <main className={styles.page}>
      <DeskNav current="/desk/sondage" badges={{ "/desk/sondage": murs.length }} />
      <header className={styles.tete}>
        <span className="eyebrow">{t("Marché primaire")}</span>
        <h1 className="display">{t("Sondage d'avant séance")}</h1>
        <p className={styles.phrase}>
          {t("Ce que la place prendrait, avant qu'un Trésor annonce quoi que ce soit.")}
          <Pourquoi titre="Comment ce consensus est calculé" petit>
            <p>
              {t(
                "Il se recalcule à CHAQUE LECTURE de cette page : il n'y a pas de chiffre d'hier ici. Un consensus rangé chaque soir dans une table vieillirait entre deux lectures, et rien ne dirait l'écart.",
              )}
            </p>
            <p>
              {t("Le niveau est la moyenne des taux PONDÉRÉE PAR LES MONTANTS : dix clients à un million ne pèsent pas comme un à cent millions devant un Trésor. L'échelle, elle, dit où la demande s'arrête vraiment.")}
            </p>
            <p>
              {t("La date est le PLUS TARD des « à partir de » : une séance tenue avant elle trouverait sans fonds un client compté dans la demande.")}
            </p>
            <p>
              {t("Une demande se porte à partir de {m} FCFA ET de {n} clients. Cent millions d'un seul client ne sont pas une demande de la place, c'est un ordre, et il a sa propre porte.", {
                m: fmt(SEUIL_MONTANT),
                n: String(SEUIL_CLIENTS),
              })}
            </p>
          </Pourquoi>
        </p>
      </header>

      {/* CE QUI EST MÛR. En tête parce que c'est la seule chose de cette page
          qui demande un geste aujourd'hui : un coup de fil au Trésor concerné. */}
      <section className={styles.bloc}>
        <h2 className={styles.titre}>{t("À porter au Trésor")}</h2>
        {murs.length === 0 ? (
          <div className="empty">{t("Aucune demande n'atteint encore le seuil. Ce n'est pas une panne : une ligne se porte quand elle pèse, et la page du dessous montre ce qui s'accumule.")}</div>
        ) : (
          murs.map((c) => (
            <article key={c.cle} className={styles.mur}>
              <div className={styles.entete}>
                <b>
                  {c.instrument} · {t(c.country)} · {c.tenor}
                </b>
                {c.surLigne && <span className="mono">{parId.get(c.surLigne)?.ref}</span>}
              </div>
              {/* LA PHRASE QU'ON PORTE, et c'est elle le livrable : une liste de
                  vingt lignes ne se porte pas à un Trésor, une phrase se porte. */}
              <p className={styles.consensus}>
                {t("{m} FCFA de {n} clients, autour de {r}, tous prêts à partir du {d}", {
                  m: fmt(c.montant),
                  n: String(c.clients),
                  r: niveau(c),
                  d: c.auPlusTot ? fmtDate(c.auPlusTot, false) : "—",
                })}
              </p>
              <Echelle c={c} t={t} />
              <Detail lignes={demandesDe(c.cle)} t={t} />
              {c.surLigne && <Statuer id={c.surLigne} ref_={parId.get(c.surLigne)?.ref ?? ""} />}
            </article>
          ))
        )}
      </section>

      {/* CE QUI S'ACCUMULE. Sous le seuil, et ce n'est pas un rebut : c'est la
          matière des séances du trimestre prochain. Un desk qui ne voit que ce
          qui est mûr ne sait jamais ce qui vient. */}
      <section className={styles.bloc}>
        <h2 className={styles.titre}>{t("Ce qui s'accumule")}</h2>
        {jeunes.length === 0 ? (
          <div className="empty">{t("Rien d'autre en attente.")}</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t("Ligne")}</th>
                <th>{t("Clients")}</th>
                <th>{t("Demande")}</th>
                <th>{t("Taux")}</th>
                <th>{t("Au plus tôt")}</th>
              </tr>
            </thead>
            <tbody>
              {jeunes.map((c) => (
                <tr key={c.cle}>
                  <td>
                    {c.instrument} · {t(c.country)} · {c.tenor}
                  </td>
                  <td className={styles.n}>{c.clients}</td>
                  <td className={styles.n}>{fmt(c.montant)}</td>
                  <td className={styles.n}>{niveau(c)}</td>
                  <td>{c.auPlusTot ? fmtDate(c.auPlusTot, false) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className={styles.bloc}>
        <h2 className={styles.titre}>{t("Les questions ouvertes")}</h2>
        {questions.length === 0 ? (
          <div className="empty">{t("Aucune question posée en ce moment.")}</div>
        ) : (
          <ul className={styles.questions}>
            {questions.map((q) => {
              const reponses = lignes.filter((l) => l.repondA === q.id && l.state !== "close");
              /* LA CIBLE EN REGARD DE CE QUI RÉPOND, et c'est la seule page qui
                 a le droit de l'écrire : le montant cherché ne paraît plus sur
                 la tuile du client, parce qu'il y donnait la réponse avant la
                 question. Ici il est la mesure du chemin restant. */
              const recu = reponses.reduce((s, l) => s + l.montant, 0);
              return (
                <li key={q.id}>
                  <div className={styles.entete}>
                    <b>
                      {q.instrument} · {t(q.country)} · {q.tenor}
                    </b>
                    <span className={`mono ${styles.ref}`}>{q.ref}</span>
                  </div>
                  <p className={styles.faits}>
                    {reponses.length === 0 ? (
                      <>
                        <b>{fmt(q.montant)} FCFA</b> {t("cherchés")} · <em className={styles.muet}>{t("aucune réponse encore")}</em>
                      </>
                    ) : (
                      <>
                        <b>{fmt(recu)} FCFA</b>{" "}
                        {t("reçus sur {m} cherchés, de {n} réponse(s)", { m: fmt(q.montant), n: String(reponses.length) })}
                      </>
                    )}
                  </p>
                  <Statuer id={q.id} ref_={q.ref} />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className={styles.bloc}>
        <h2 className={styles.titre}>{t("Poser une question à la place")}</h2>
        <PoserUneQuestion />
      </section>
    </main>
  );
}

/**
 * L'ÉCHELLE : OÙ LA DEMANDE S'ARRÊTE.
 *
 * C'est le renseignement que le Trésor achète, et la moyenne pondérée ne le
 * donne pas : « quatre cent vingt millions autour de 6,42 % » laisse croire
 * que tout tient à 6,42. L'échelle dit la vérité — à 6,10, deux cent
 * cinquante ; à 6,75, la totalité. C'est la même échelle que celle du sondage
 * d'une séance annoncée, et c'est la même fonction : voir « domain/survey ».
 */
function Echelle({ c, t }: { c: ReturnType<typeof consensus>[number]; t: (s: string, v?: Record<string, string>) => string }) {
  if (c.echelle.rows.length === 0) return null;
  return (
    <table className={styles.echelle}>
      <thead>
        <tr>
          <th>{t("À ce taux ou mieux")}</th>
          <th>{t("Demande tenue")}</th>
          <th>{t("Clients")}</th>
        </tr>
      </thead>
      <tbody>
        {c.echelle.rows.map((row) => (
          <tr key={String(row.limit)}>
            <td>{row.limit == null ? t("sans condition") : fmtPct(row.limit, 2)}</td>
            <td className={styles.n}>{fmt(row.soft + row.firm)}</td>
            <td className={styles.n}>{row.orders}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * LE DÉTAIL, LIGNE PAR LIGNE, AVEC TOUTES LES CARACTÉRISTIQUES.
 *
 * Le dirigeant l'a demandé mot pour mot : « le desk recevra les lignes avec
 * toutes leurs caractéristiques ». Le consensus est ce qu'on porte ; ceci est
 * ce qu'on vérifie avant de le porter, et ce qu'on rappelle quand une séance
 * s'ouvre — c'est de là que viennent les coups de fil avant la clôture.
 */
function Detail({ lignes, t }: { lignes: Awaited<ReturnType<ReturnType<typeof repo>["listLignesSondees"]>>; t: (s: string, v?: Record<string, string>) => string }) {
  if (lignes.length === 0) return null;
  return (
    <details className={styles.detail}>
      <summary>{t("Les {n} demandes, une par une", { n: String(lignes.length) })}</summary>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>{t("Client")}</th>
            <th>{t("Montant")}</th>
            <th>{t("Coupon")}</th>
            <th>{t("Prix")}</th>
            <th>{t("Prêt le")}</th>
            <th>{t("Référence")}</th>
          </tr>
        </thead>
        <tbody>
          {lignes.map((l) => (
            <tr key={l.id}>
              <td>{l.clientName ?? "—"}</td>
              <td className={styles.n}>{fmt(l.montant)}</td>
              <td className={styles.n}>{l.rate != null ? fmtPct(l.rate, 2) : "—"}</td>
              <td className={styles.n}>{l.pricePct != null ? `${l.pricePct.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} %` : motDuNiveau(l.instrument) === "taux" ? t("précompté") : "—"}</td>
              <td>{prete(l) ? fmtDate(prete(l)!, false) : "—"}</td>
              <td className="mono">{l.ref}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
