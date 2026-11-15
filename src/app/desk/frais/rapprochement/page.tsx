import { DeskNav } from "@/components/DeskNav";
import { RecuForm } from "./Formulaire";
import { requireDesk } from "@/lib/auth";
import { repo } from "@/lib/data";
import { loadRegistry } from "@/lib/reference";
import { loadBaremeDeFrais, loadHistoriqueDeFrais } from "@/lib/policy";
import { servedUnits } from "@/lib/positions";
import { sensDeLIntention } from "@/lib/domain/intent";
import { ordreExecute } from "@/lib/frais-ordres";
import { suiviDesFrais } from "@/lib/domain/frais-suivi";
import { regleALaDate, retrocessionDuMois } from "@/lib/domain/frais";
import { RECU_KIND, cleDuRecu, encoursMoyenDuMois, finDuMois, rapprocherLeRecu, type MouvementDeParts, type RecuDeTiers } from "@/lib/domain/retrocession";
import { getT } from "@/i18n/server";
import { fmt, fmtDate, localIso } from "@/lib/format";
import { jourDesParts } from "@/lib/domain/intent";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Rapprochement des frais de tiers" };

/**
 * LE RAPPROCHEMENT DE CE QUE LA MAISON REÇOIT DE TIERS (planche 4A, tiroir C ; 15 novembre 2026).
 *
 * Pour chaque source (un fonds, les adjudications, les titres) et chaque mois : ce qui était ATTENDU (la part de chaque ordre du mois, plus
 * la rétrocession sur l'encours moyen), ce qui est ARRIVÉ (saisi par le desk), et l'écart. Un écart se voit ; il ne se corrige pas en silence.
 * Rien de cette page n'est lu par le client.
 */
export default async function RapprochementPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  await requireDesk("/desk/frais/rapprochement");
  await loadRegistry();
  const t = await getT();
  const sp = await searchParams;
  const r = repo();
  const [intents, offres, bareme, historique, recusRows] = await Promise.all([r.listIntents(), r.listOffers(), loadBaremeDeFrais(), loadHistoriqueDeFrais(), r.listPrive(RECU_KIND)]);

  const aujourdHui = new Date();
  const mois = Array.from({ length: 4 }, (_, k) => new Date(Date.UTC(aujourdHui.getUTCFullYear(), aujourdHui.getUTCMonth() - k, 1)).toISOString().slice(0, 7));
  const choisi = sp.m && /^\d{4}-\d{2}$/.test(sp.m) ? sp.m : mois[0];
  const fin = finDuMois(choisi);
  const jourSaisie = localIso(aujourdHui);
  const recus = new Map(recusRows.map((x) => [x.key, x.data as RecuDeTiers]));
  const parId = new Map(offres.map((o) => [o.id, o]));

  const ordres = intents
    .filter((i) => (i.state === "servie" || i.state === "reglee") && localIso(new Date(i.createdAt)).startsWith(choisi))
    .flatMap((i) => {
      const o = parId.get(i.offerId);
      const x = o ? ordreExecute(i, o) : undefined;
      return x ? [x] : [];
    });
  const suivi = suiviDesFrais(ordres, bareme, historique);
  const attenduDesOrdres = (garde: (l: (typeof suivi.lignes)[number]) => boolean) => suivi.lignes.filter(garde).reduce((s, l) => s + l.recetteDeTiers, 0);

  /* LA RÉTROCESSION : l'encours moyen de nos clients dans chaque fonds, avec la règle « souscription » du dernier jour du mois. */
  const regleDeRetro = regleALaDate(bareme, historique, "fonds.souscription", fin);
  const lignes: { source: string; libelle: string; surOrdres: number; retrocession: number; encours: number }[] = [];
  for (const o of offres.filter((x) => x.kind === "FONDS" && x.fund)) {
    const mouvements: MouvementDeParts[] = intents
      .filter((i) => i.offerId === o.id && i.state === "reglee")
      .map((i) => ({ jour: jourDesParts(i), units: (sensDeLIntention(i.type) === "reduit" ? -1 : 1) * servedUnits(i, o) }));
    /* Sans historique de VL, la seule VL connue de la ligne (la dernière) : les jours d'avant sa date ne sont pas valorisés. */
    const historiqueDesVl = mouvements.length ? await r.listFundNavs(o.fund!.key, 500) : [];
    const navs = historiqueDesVl.length || !mouvements.length ? historiqueDesVl : [{ navDate: o.fund!.navDate, nav: o.fund!.nav }];
    const encours = encoursMoyenDuMois(mouvements, navs, choisi);
    const surOrdres = attenduDesOrdres((l) => l.ordre.offerId === o.id);
    lignes.push({ source: o.id, libelle: o.title, surOrdres, retrocession: retrocessionDuMois(regleDeRetro, encours, fin), encours });
  }
  for (const [source, libelle, famille] of [["adjudication", "Adjudications · émetteur", "adjudication"], ["titres", "Titres cotés", "titres"]] as const) {
    lignes.push({ source, libelle, surOrdres: attenduDesOrdres((l) => l.ordre.famille === famille), retrocession: 0, encours: 0 });
  }
  const visibles = lignes.filter((l) => l.surOrdres + l.retrocession > 0 || recus.has(cleDuRecu(l.source, choisi)));
  const totalAttendu = visibles.reduce((s, l) => s + l.surOrdres + l.retrocession, 0);
  const totalRecu = visibles.reduce((s, l) => s + (recus.get(cleDuRecu(l.source, choisi))?.montant ?? 0), 0);

  return (
    <>
      <DeskNav current="/desk/frais/rapprochement" />
      <div className={styles.page}>
        <header className={styles.head}>
          <h1>{t("Rapprochement des frais de tiers")}</h1>
          <p className="muted">{t("Ce que la maison attendait d'un partenaire ou d'un émetteur pour le mois, ce qui est arrivé, et l'écart. Rien de cette page n'est lu par le client.")}</p>
        </header>

        <div className={styles.onglets}>
          {mois.map((m) => (
            <a key={m} href={`/desk/frais/rapprochement?m=${m}`} className={m === choisi ? styles.actif : undefined}>
              {m}
            </a>
          ))}
        </div>

        <div className={styles.band}>
          <div>
            <span>{t("Attendu")}</span>
            <b>{fmt(totalAttendu)}</b>
            <small>{t("opérations du mois et rétrocession sur l'encours")}</small>
          </div>
          <div>
            <span>{t("Reçu")}</span>
            <b>{fmt(totalRecu)}</b>
            <small>{t("saisi par le desk")}</small>
          </div>
          <div>
            <span>{t("Reste")}</span>
            <b>{fmt(totalAttendu - totalRecu)}</b>
            <small>{t("attendu moins reçu")}</small>
          </div>
        </div>

        {visibles.length === 0 && <p className="muted">{t("Rien n'est attendu de tiers ce mois-ci : aucune règle de tiers n'est en vigueur sur les ordres du mois.")}</p>}

        {visibles.map((l) => {
          const recu = recus.get(cleDuRecu(l.source, choisi));
          const attendu = l.surOrdres + l.retrocession;
          const rap = rapprocherLeRecu(attendu, recu);
          return (
            <section key={l.source} className="panel">
              <div className="panel-h">
                <h2>{t(l.libelle)}</h2>
                <span className={rap.etat === "juste" ? "st reglee" : rap.etat === "ecart" ? "st annulee" : "st transmise"}>
                  {rap.etat === "juste" ? t("rapproché") : rap.etat === "ecart" ? t("écart {e}", { e: `${rap.ecart > 0 ? "+" : ""}${fmt(rap.ecart)}` }) : t("sans reçu")}
                </span>
              </div>
              <div className={styles.pb}>
                <div className={styles.large}>
                  <table className={styles.tableau}>
                    <tbody>
                      <tr>
                        <td>{t("Part des opérations du mois")}</td>
                        <td className={styles.r}>{fmt(l.surOrdres)}</td>
                      </tr>
                      {l.encours > 0 && (
                        <tr>
                          <td>{t("Rétrocession sur l'encours moyen de {e} FCFA", { e: fmt(l.encours) })}</td>
                          <td className={styles.r}>{fmt(l.retrocession)}</td>
                        </tr>
                      )}
                      <tr>
                        <th>{t("Attendu")}</th>
                        <th className={styles.r}>{fmt(attendu)}</th>
                      </tr>
                      <tr>
                        <td>{t("Reçu")}</td>
                        <td className={styles.r}>{recu ? `${fmt(recu.montant)} · ${fmtDate(recu.le)}` : "—"}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <RecuForm source={l.source} mois={choisi} montant={recu?.montant} le={recu?.le} aujourdHui={jourSaisie} />
              </div>
            </section>
          );
        })}

        <p className={styles.note}>{t("L'encours moyen est celui de nos clients, jour par jour : les parts détenues ce jour-là, réglées à la date de leur règlement, par la dernière VL connue. Un jour sans VL ne compte pas.")}</p>
      </div>
    </>
  );
}
