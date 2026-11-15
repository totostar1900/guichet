import { DeskNav } from "@/components/DeskNav";
import { CodesForm, ReleveForm } from "./Formulaires";
import { requireDesk } from "@/lib/auth";
import { repo } from "@/lib/data";
import { loadRegistry } from "@/lib/reference";
import { positionsFrom } from "@/lib/positions";
import { CODES_KIND, RELEVES_KIND, rapprochement, registreDesParts, type Releve } from "@/lib/domain/registre-des-parts";
import { getT } from "@/i18n/server";
import { fmtDate } from "@/lib/format";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Registre des parts" };

const parts = (n: number): string => n.toLocaleString("fr-FR", { maximumFractionDigits: 3 });

/**
 * LE REGISTRE INTERNE DES PARTS (planche 1B, 14 novembre 2026).
 *
 * Le gestionnaire d'un fonds ne voit qu'un compte global au nom de la maison. Ici : à qui appartient chaque part (déduit des ordres réglés),
 * le CODE PORTEUR anonyme de chaque client, le relevé du gestionnaire, et l'écart. Les noms ne sortent pas de cette page : le fichier
 * pour le gestionnaire ne porte que des codes et des parts.
 */
export default async function RegistrePage() {
  await requireDesk("/desk/registre");
  await loadRegistry();
  const t = await getT();
  const r = repo();
  const [intents, offers, codesRows, relevesRows] = await Promise.all([r.listIntents(), r.listOffers(), r.listPrive(CODES_KIND), r.listPrive(RELEVES_KIND)]);

  const codes = new Map(codesRows.flatMap((x) => ((x.data as { code?: string } | null)?.code ? [[x.key, (x.data as { code: string }).code] as [string, string]] : [])));
  const releves = new Map(relevesRows.map((x) => [x.key, x.data as Releve]));
  const noms = new Map<string, string>();
  for (const i of [...intents].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) if (i.clientId) noms.set(i.clientId, i.clientName);

  const fonds = offers.filter((o) => o.kind === "FONDS");
  const detenues = positionsFrom(intents, offers).filter((p) => p.offer.kind === "FONDS" && p.intent.clientId).map((p) => ({ clientId: p.intent.clientId as string, offerId: p.offer.id, units: p.units }));
  const registre = registreDesParts(detenues, fonds.map((o) => ({ id: o.id, title: o.title, isin: o.isin ?? "" })), noms, codes).filter((f) => f.porteurs.length > 0 || releves.has(f.offerId));
  const sansCode = new Set(registre.flatMap((f) => f.porteurs.filter((p) => !p.code).map((p) => p.clientId))).size;
  const aujourdHui = new Date().toISOString().slice(0, 10);

  return (
    <>
      <DeskNav current="/desk/registre" />
      <div className={styles.page}>
        <header className={styles.head}>
          <h1>{t("Registre des parts")}</h1>
          <p className="muted">
            {t("À qui appartient chaque part, déduit des ordres réglés. Le gestionnaire ne voit qu'un compte global : il ne reçoit que des codes porteur et des parts, jamais un nom. Le registre se rapproche de son relevé.")}
          </p>
        </header>

        <section className="panel">
          <div className="panel-h">
            <h2>{t("Codes porteur")}</h2>
            <span className="muted">{sansCode === 0 ? t("tous attribués") : t("{n} porteur(s) sans code", { n: String(sansCode) })}</span>
          </div>
          <div className={styles.pb}>
            <p className={styles.note}>{t("Un code est tiré au hasard, rangé dans la table du desk, et ne change plus : il n'a aucun lien lisible avec l'identité du client.")}</p>
            <CodesForm sansCode={sansCode} />
          </div>
        </section>

        {registre.length === 0 && <p className="muted">{t("Aucun client ne détient de parts de fonds pour l'instant.")}</p>}

        {registre.map((f) => {
          const releve = releves.get(f.offerId);
          const rap = rapprochement(f.total, releve);
          return (
            <section key={f.offerId} className="panel">
              <div className="panel-h">
                <h2>{f.titre}</h2>
                <span className={rap.etat === "juste" ? "st reglee" : rap.etat === "ecart" ? "st annulee" : "st transmise"}>
                  {rap.etat === "juste" ? t("rapproché") : rap.etat === "ecart" ? t("écart {e}", { e: `${rap.ecart > 0 ? "+" : ""}${parts(rap.ecart)}` }) : t("sans relevé")}
                </span>
              </div>
              <div className={styles.pb}>
                <div className={styles.band}>
                  <div>
                    <span>{t("Parts de nos clients")}</span>
                    <b>{parts(f.total)}</b>
                  </div>
                  <div>
                    <span>{t("Relevé du gestionnaire")}</span>
                    <b>{releve ? parts(releve.parts) : "—"}</b>
                    {releve && <small>{t("au {d}", { d: fmtDate(releve.au) })}</small>}
                  </div>
                </div>
                <ReleveForm offerId={f.offerId} parts={releve?.parts} au={releve?.au} aujourdHui={aujourdHui} />
                <div className={styles.large}>
                  <table className={styles.tableau}>
                    <thead>
                      <tr>
                        <th>{t("Code porteur")}</th>
                        <th>{t("Client · desk seulement")}</th>
                        <th className={styles.r}>{t("Parts")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {f.porteurs.map((p) => (
                        <tr key={p.clientId}>
                          <td className="mono">{p.code ?? <span className="muted">{t("sans code")}</span>}</td>
                          <td>{p.nom}</td>
                          <td className={styles.r}>{parts(p.parts)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className={styles.note}>
                  <a href={`/desk/registre/export?fonds=${encodeURIComponent(f.offerId)}`}>{t("Fichier pour le gestionnaire")}</a> · {t("codes et parts seulement, sans aucun nom")}
                </p>
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
