import { DeskNav } from "@/components/DeskNav";
import { Fait } from "@/components/desk/Fait";
import { getT } from "@/i18n/server";
import { requireDesk } from "@/lib/auth";
import { repo } from "@/lib/data";
import { displayStatus, isActionable, statusLabel } from "@/lib/domain/status";
import { lignesRetenues, messageDe, STATUTS_MAX, type StatutLigne } from "@/lib/domain/statuts";
import { fmtDate } from "@/lib/format";
import { listerStatuts } from "@/lib/statuts";
import { AjouterUneLigne, FormulaireMessage, GestesDeLaLigne } from "./Gestion";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Statuts" };

/**
 * « STATUTS » : LA RANGÉE DE RONDS DE L'ACCUEIL, CHOISIE PAR LE DESK (17 novembre 2026).
 *
 * Le desk décide quelles lignes y passent (huit au plus), dans quel ordre, et écrit le message de la première page. Le client touche un rond : le message, puis une page
 * par ligne avec « Voir la fiche » et « Passer un ordre ». Jamais un conseil ni une urgence ; chaque geste est écrit à l'audit, avec avant et après.
 */
export default async function StatutsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const t = await getT();
  const sp = await searchParams;
  const un = (k: string) => (Array.isArray(sp[k]) ? (sp[k] as string[])[0] : (sp[k] as string | undefined));
  await requireDesk("/desk/statuts");
  const now = new Date();
  const [offers, rows] = await Promise.all([repo().listOffers(), listerStatuts()]);
  const parId = new Map(offers.map((o) => [o.id, o]));
  const retenues = lignesRetenues(rows);
  const dejaLa = new Set(retenues.map((l) => l.offerId));
  const candidates = offers
    .filter((o) => !o.hidden && o.status !== "withdrawn" && isActionable(displayStatus(o, now)) && !dejaLa.has(o.id))
    .map((o) => ({ id: o.id, titre: `${o.title} · ${o.issuer || o.countryName}` }));
  const retirees = rows.filter((r): r is StatutLigne => r.kind === "ligne" && Boolean(r.retireeLe)).sort((a, b) => (b.retireeLe ?? "").localeCompare(a.retireeLe ?? "")).slice(0, 5);
  const nom = (l: StatutLigne) => parId.get(l.offerId)?.title ?? l.offerId;

  return (
    <>
      <DeskNav current="/desk/statuts" />
      <main className={styles.page}>
        <header className={styles.tete}>
          <h1>{t("Statuts")}</h1>
          <p className="muted">{t("La rangée de ronds du Guichet : huit lignes au plus, dans l'ordre que vous donnez, avec un message sur la première page. Jamais un conseil, jamais une urgence.")}</p>
        </header>
        {un("mise") && (
          <Fait fermer="/desk/statuts" libelle={t("Fermer")}>
            {t("« {l} » est dans les statuts.", { l: un("mise") ?? "" })}
          </Fait>
        )}
        {un("retiree") && (
          <Fait fermer="/desk/statuts" libelle={t("Fermer")}>
            {t("La ligne n'est plus dans les statuts.")}
          </Fait>
        )}
        {un("message") && (
          <Fait fermer="/desk/statuts" libelle={t("Fermer")}>
            {t("Le message de la première page est enregistré.")}
          </Fait>
        )}
        {un("refus") && (
          <Fait fermer="/desk/statuts" libelle={t("Fermer")}>
            {un("refus") === "plein" ? t("Huit lignes au plus : retirez-en une avant d'en ajouter.") : t("Cette ligne n'est pas visible des clients : elle ne peut pas entrer dans les statuts.")}
          </Fait>
        )}

        <section className={styles.carte} aria-labelledby="retenues">
          <h2 id="retenues">
            {t("Dans les statuts")} · {retenues.length} / {STATUTS_MAX}
          </h2>
          {retenues.length === 0 ? (
            <p className="muted">{t("Aucune ligne : la rangée ne paraît pas chez les clients.")}</p>
          ) : (
            <ol className={styles.lignes}>
              {retenues.map((l, i) => {
                const o = parId.get(l.offerId);
                const etat = o ? statusLabel(o, displayStatus(o, now)) : t("hors catalogue");
                return (
                  <li key={l.id}>
                    <span className={styles.rang}>{i + 1}</span>
                    <span className={styles.quoi}>
                      <b>{nom(l)}</b>
                      <small>
                        {etat} · {t("ajoutée le {d} par {p}", { d: fmtDate(l.ajouteeLe), p: l.ajouteePar })}
                      </small>
                    </span>
                    <GestesDeLaLigne offerId={l.offerId} titre={nom(l)} premiere={i === 0} derniere={i === retenues.length - 1} />
                  </li>
                );
              })}
            </ol>
          )}
          <AjouterUneLigne candidates={candidates} plein={retenues.length >= STATUTS_MAX} />
        </section>

        <section className={styles.carte} aria-labelledby="message">
          <h2 id="message">{t("Première page")}</h2>
          <p className="muted">{t("Le message s'affiche sur le logo, avant les lignes.")}</p>
          <FormulaireMessage actuel={messageDe(rows)} />
        </section>

        {retirees.length > 0 && (
          <section className={styles.carte} aria-labelledby="retirees">
            <h2 id="retirees">{t("Les dernières retirées")}</h2>
            <ul className={styles.passees}>
              {retirees.map((l) => (
                <li key={`${l.id}-${l.retireeLe}`}>
                  <span>{nom(l)}</span>
                  <small>
                    {t("retirée le {d} par {p}", { d: fmtDate(l.retireeLe ?? ""), p: l.retireePar ?? "" })}
                  </small>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </>
  );
}
