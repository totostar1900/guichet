import { DeskNav } from "@/components/DeskNav";
import { Encaisser } from "./Encaisser";
import { requireDesk } from "@/lib/auth";
import { repo } from "@/lib/data";
import { positionsFrom } from "@/lib/positions";
import { bilan, suivre, type LigneTenue } from "@/lib/domain/encaissement";
import { getT } from "@/i18n/server";
import { fmt, fmtDate } from "@/lib/format";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Encaissements" };

/**
 * Ce que les émetteurs doivent, et qui n'est pas arrivé.
 *
 * L'application connaissait la date d'un coupon et jamais son encaissement.
 * Elle disait donc « échu » à ses clients, qui est vérifié, et jamais « reçu »,
 * qui ne l'était pas : ce mot prudent tenait lieu de comptabilité. Un client
 * lisait « 180 000 FCFA échus depuis le 14 mars » sans savoir si l'argent était
 * là, et personne au desk n'avait la liste de ce qui manquait.
 *
 * Cette page est cette liste. Elle ne devine rien : elle rapproche l'échéancier
 * des positions et le journal des espèces, et montre l'écart. Un opérateur voit
 * le crédit sur le compte de règlement et l'inscrit ; c'est le seul geste, et
 * il n'appartient qu'à une personne.
 *
 * Le retard est la colonne qui décide. Trois jours est un délai de place ;
 * soixante jours est un incident dont quelqu'un doit être informé, et une file
 * rangée par retard décroissant le met en haut sans qu'on ait à le chercher.
 */
export default async function EncaissementsPage() {
  await requireDesk("/desk/encaissements");
  const t = await getT();
  const r = repo();
  const [intents, offers] = await Promise.all([r.listIntents(), r.listOffers()]);

  /* Les clients qui tiennent quelque chose : eux seuls ont des échéances. */
  const clients = [...new Set(intents.filter((i) => i.clientId).map((i) => i.clientId!))];
  const journaux = await Promise.all(clients.map((id) => r.listCash(id).catch(() => [])));

  const parClient = clients.map((clientId, i) => {
    const siens = intents.filter((x) => x.clientId === clientId);
    const positions = positionsFrom(siens, offers);
    const lignes: LigneTenue[] = positions.map((p) => ({
      intentId: p.intent.id,
      titre: p.offer.title,
      echus: p.echus,
      aVenir: p.flows,
    }));
    const suivis = suivre(lignes, journaux[i]);
    return { clientId, nom: siens[0]?.clientName ?? clientId, suivis, bilan: bilan(suivis), journal: journaux[i] };
  });

  /* Les écarts : ce qui est arrivé pour autre chose que ce qui était dû. Un
     encaissement partiel est une comptabilité juste et une créance vivante, et
     sans cette file la créance disparaîtrait au moment même de son inscription. */
  const ecarts = parClient
    .flatMap((c) => c.journal.filter((e) => e.expected != null && Math.round(e.expected) !== Math.round(e.amount)).map((e) => ({ ...e, nom: c.nom, manque: Math.round(e.expected!) - Math.round(e.amount) })))
    .sort((a, b) => b.manque - a.manque || b.at.localeCompare(a.at));

  /* Rangés par le retard le plus long : c'est ce qui appelle quelqu'un. */
  const enRetard = parClient.filter((c) => c.bilan.nbAttendus > 0).sort((a, b) => b.bilan.retardMax - a.bilan.retardMax);
  const total = parClient.reduce(
    (s, c) => ({ attendu: s.attendu + c.bilan.attendu, encaisse: s.encaisse + c.bilan.encaisse, aVenir: s.aVenir + c.bilan.aVenir, nb: s.nb + c.bilan.nbAttendus }),
    { attendu: 0, encaisse: 0, aVenir: 0, nb: 0 },
  );
  const pireRetard = parClient.reduce((m, c) => Math.max(m, c.bilan.retardMax), 0);

  return (
    <>
      <DeskNav current="/desk/encaissements" />
      <div className={styles.page}>
        <header className={styles.head}>
          <div>
            <h1>{t("Encaissements")}</h1>
            <p className="muted">
              {t(
                "Ce que les émetteurs devaient et qui n'est pas arrivé. Une échéance passée n'est pas un encaissement : tant que personne n'a constaté le crédit, le client lit « échu » et non « reçu ».",
              )}
            </p>
          </div>
        </header>

        <div className={styles.band}>
          <div>
            <span>{t("Échéances attendues")}</span>
            <b className={total.nb ? styles.warn : undefined}>{total.nb}</b>
          </div>
          <div>
            <span>{t("Montant attendu")}</span>
            <b className={total.attendu ? styles.warn : undefined}>{fmt(Math.round(total.attendu))}</b>
          </div>
          <div>
            <span>{t("Retard le plus long")}</span>
            <b className={pireRetard > 30 ? styles.crit : undefined}>{pireRetard ? t("{n} jours", { n: pireRetard }) : "—"}</b>
          </div>
          <div>
            <span>{t("Déjà encaissé")}</span>
            <b>{fmt(Math.round(total.encaisse))}</b>
          </div>
          <div>
            <span>{t("À venir")}</span>
            <b>{fmt(Math.round(total.aVenir))}</b>
          </div>
        </div>

        {!enRetard.length ? (
          <section className="panel">
            <div className="empty">
              {t("Aucune échéance en attente : tout ce qui est échu a été constaté au journal, et les clients peuvent lire « reçu ».")}
            </div>
          </section>
        ) : (
          enRetard.map((c) => (
            <section className="panel" key={c.clientId}>
              <div className="panel-h">
                <h2>{c.nom}</h2>
                <span className="muted">
                  {t("{n} échéances attendues", { n: c.bilan.nbAttendus })} · {fmt(Math.round(c.bilan.attendu))} FCFA
                </span>
              </div>
              <div className="scroll-x">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>{t("Échéance")}</th>
                      <th>{t("Ligne")}</th>
                      <th>{t("Nature")}</th>
                      <th className="r">{t("Montant")}</th>
                      <th className="r">{t("Retard")}</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {c.suivis
                      .filter((f) => f.etat === "attendu")
                      .sort((a, b) => (b.retardJours ?? 0) - (a.retardJours ?? 0))
                      .map((f) => (
                        <tr key={f.cle}>
                          <td>{fmtDate(f.date)}</td>
                          <td>{f.titre}</td>
                          <td>{t(f.label)}</td>
                          <td className="r">
                            <b>{fmt(Math.round(f.amount))}</b>
                          </td>
                          <td className="r">
                            {/* Au-delà d'un mois, ce n'est plus un délai de place. */}
                            <span className={(f.retardJours ?? 0) > 30 ? "st annulee" : "st transmise"}>{t("{n} jours", { n: f.retardJours ?? 0 })}</span>
                          </td>
                          <td>
                            <Encaisser userId={c.clientId} flux={{ cle: f.cle, amount: f.amount, label: f.label, date: f.date, titre: f.titre }} />
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))
        )}

        {ecarts.length > 0 && (
          <section className="panel">
            <div className="panel-h">
              <h2>{t("Écarts constatés")}</h2>
              <span className="muted">{t("Reçu pour un autre montant que ce qui était dû : la différence reste une créance sur l'émetteur.")}</span>
            </div>
            <div className="scroll-x">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>{t("Valeur")}</th>
                    <th>{t("Client")}</th>
                    <th>{t("Mouvement")}</th>
                    <th className="r">{t("Attendu")}</th>
                    <th className="r">{t("Reçu")}</th>
                    <th className="r">{t("Écart")}</th>
                    <th>{t("Pièce")}</th>
                  </tr>
                </thead>
                <tbody>
                  {ecarts.map((e) => (
                    <tr key={e.id}>
                      <td>{fmtDate(e.at)}</td>
                      <td>{e.nom}</td>
                      <td>{e.label}</td>
                      <td className="r">{fmt(Math.round(e.expected!))}</td>
                      <td className="r">
                        <b>{fmt(Math.round(e.amount))}</b>
                      </td>
                      <td className="r">
                        <span className={e.manque > 0 ? "st annulee" : "st transmise"}>
                          {e.manque > 0 ? "−" : "+"}
                          {fmt(Math.abs(e.manque))}
                        </span>
                      </td>
                      <td className="muted">{e.evidence ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section className="panel">
          <div className="panel-h">
            <h2>{t("Ce que ce geste engage")}</h2>
          </div>
          <div className={styles.pb}>
            <ol className={styles.steps}>
              <li>
                {t(
                  "Inscrire un encaissement, c'est constater un crédit sur le compte de règlement. Ce n'est pas dire qu'une échéance est passée : cela, l'échéancier le sait déjà et le client le lit déjà.",
                )}
              </li>
              <li>
                {t(
                  "La pièce est demandée, et c'est elle qui fait la différence : une ligne de relevé ou un numéro d'avis du teneur de compte transforme une présomption en constat. C'est aussi la première chose qu'un contrôleur demande.",
                )}
              </li>
              <li>
                {t(
                  "Le montant reçu n'est pas forcément celui qui était dû, et la date de valeur n'est pas celle de l'échéance. Les deux se saisissent : l'attendu est gardé à côté, sinon l'écart disparaîtrait au moment même de son inscription.",
                )}
              </li>
              <li>{t("Un mouvement s'ajoute et ne se corrige pas : une erreur se répare par un mouvement inverse, jamais par une réécriture.")}</li>
              <li>
                {t(
                  "L'argent inscrit n'attend aucune opération, et c'est voulu : soit une instruction de réinvestissement le réclame et le robot le place, soit il repart chez le client. Ce qu'il ne fait pas, c'est dormir sur la plateforme.",
                )}
              </li>
              <li>{t("La même échéance ne s'inscrit qu'une fois : la base le garantit, et deux clics ne créditent pas deux fois.")}</li>
            </ol>
          </div>
        </section>
      </div>
    </>
  );
}
