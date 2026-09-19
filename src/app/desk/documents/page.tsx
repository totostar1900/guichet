import { DeskNav } from "@/components/DeskNav";
import { repo } from "@/lib/data";
import { auctionLines } from "@/lib/documents/generate";
import { DOC_LABEL, docsAvailable } from "@/lib/documents/registry";
import { INTENT_LABEL, INTENT_STATE_LABEL } from "@/lib/domain/intent";
import { displayStatus, isActionable } from "@/lib/domain/status";
import type { GeneratedDocument } from "@/lib/domain/types";
import { parseDate } from "@/lib/finance";
import { fmt, fmtDateTime, fmtMillions } from "@/lib/format";
import { BordereauButton, GenerateButton } from "./Buttons";
import { markDocumentAction } from "./actions";
import styles from "./page.module.css";
import { getT } from "@/i18n/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Documents" };

const STATUS: Record<GeneratedDocument["status"], [string, string]> = { genere: ["new", "Généré"], envoye: ["sent", "Envoyé"], signe: ["ok", "Signé"] };

/** The paperwork chain for one auction, computed from the rows. */
const CHAIN: [string, string, string, string][] = [
  ["Annonce", "Message d'offre, teaser, note", "Clients du segment", "Publication par le desk"],
  ["Intention", "Accusé de réception (référence)", "Le client", "Automatique à l'enregistrement"],
  ["Prise ferme", "Bulletin d'ordre à signer + appel de fonds", "Le client", "Confirmation par le conseiller"],
  ["Soumission", "Bordereau de soumission groupée + annexe par client", "SVT", "Clôture du carnet"],
  ["Résultats", "Avis de résultat et d'allocation / de non-allocation", "Chaque client", "Résultats saisis (servie / non servie)"],
  ["Règlement", "Avis d'opéré", "Le client", "Règlement-livraison confirmé (réglée)"],
  ["Vie du titre", "Avis de coupon, relevé de position", "Porteurs", "Programmé : étape suivante"],
];

export default async function DocumentsPage() {
  const t = await getT();
  const r = repo();
  const [offers, intents, docs] = await Promise.all([r.listOffers(), r.listIntents(), r.listDocuments()]);
  const now = new Date();
  const byOffer = new Map(offers.map((o) => [o.id, o]));

  // Auctions: one per (country, deadline) among non-equity offers, open or recently closed.
  const auctions = new Map<string, { country: string; deadlineAt: string; issuer: string; n: number }>();
  offers
    .filter((o) => o.kind !== "ACTIONS" && o.kind !== "MARCHE" && o.kind !== "FONDS" && (isActionable(displayStatus(o, now)) || now.getTime() - parseDate(o.deadlineAt).getTime() < 7 * 86400e3))
    .forEach((o) => {
      const key = `${o.country}|${o.deadlineAt}`;
      const a = auctions.get(key) ?? { country: o.country, deadlineAt: o.deadlineAt, issuer: o.issuer, n: 0 };
      a.n += 1;
      auctions.set(key, a);
    });
  const auctionRows = await Promise.all(
    Array.from(auctions.values()).map(async (a) => {
      const { lines } = await auctionLines(a.country, a.deadlineAt);
      const orders = lines.reduce((s, l) => s + l.intents.length, 0);
      const amount = lines.reduce((s, l) => s + l.intents.reduce((t, x) => t + Math.abs(x.position.total), 0), 0);
      const pending = lines.reduce((s, l) => s + l.intents.filter((x) => x.intent.state === "confirmee").length, 0);
      const existing = docs.filter((d) => d.type === "bordereau" && d.auctionKey === `${a.country}|${a.deadlineAt}`);
      return { ...a, orders, amount, pending, existing };
    }),
  );

  const candidates = intents.filter((i) => docsAvailable(i).length > 0);

  return (
    <>
      <DeskNav current="/desk/documents" />

      <div className="panel">
        <div className="panel-h">
          <h2>{t("Soumissions SVT : par adjudication")}</h2>
          <span className="muted" style={{ fontSize: ".8rem" }}>
            {t("Le bordereau regroupe les ordres confirmés de toutes les lignes d'une adjudication et les passe en « transmise »")}
          </span>
        </div>
        <div className="scroll-x">
          <table className="tbl">
            <thead>
              <tr>
                <th>{t("Émetteur")}</th>
                <th>{t("Dépôt des offres")}</th>
                <th className="r">{t("Lignes")}</th>
                <th className="r">{t("Ordres fermes")}</th>
                <th className="r">{t("Montant")}</th>
                <th>{t("Bordereaux émis")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {auctionRows.map((a) => (
                <tr key={`${a.country}|${a.deadlineAt}`}>
                  <td>
                    <b>{t(a.issuer)}</b>
                  </td>
                  <td>{fmtDateTime(a.deadlineAt)}</td>
                  <td className="r">{a.n}</td>
                  <td className="r">
                    {a.orders}
                    {a.pending ? <span className="muted">{t(`· ${a.pending} à transmettre`)}</span> : null}
                  </td>
                  <td className="r num">{fmtMillions(a.amount)}</td>
                  <td>
                    {a.existing.map((d) => (
                      <a key={d.id} href={`/desk/documents/pdf/${d.id}`} target="_blank" rel="noreferrer" className="mono" style={{ marginRight: 8 }}>
                        {d.number}
                      </a>
                    ))}
                    {!a.existing.length && <span className="muted">—</span>}
                  </td>
                  <td className={styles.right}>
                    <BordereauButton country={a.country} deadlineAt={a.deadlineAt} disabled={a.orders === 0} label={a.pending ? t("Préparer la soumission ({n})", { n: a.pending }) : t("Régénérer le bordereau")} />
                  </td>
                </tr>
              ))}
              {auctionRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="muted">
                    {t("Aucune adjudication en cours.")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <div className="panel-h">
          <h2>{t("Documents clients : générer")}</h2>
          <span className="muted" style={{ fontSize: ".8rem" }}>
            {t("Les transitions du carnet génèrent automatiquement ; ici on régénère ou on émet à la main")}
          </span>
        </div>
        <div className="scroll-x">
          <table className="tbl">
            <thead>
              <tr>
                <th>{t("Réf.")}</th>
                <th>{t("Client")}</th>
                <th>{t("Ligne")}</th>
                <th>{t("Type")}</th>
                <th>{t("État")}</th>
                <th className="r">{t("Montant")}</th>
                <th>{t("Documents disponibles")}</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((i) => {
                const o = byOffer.get(i.offerId);
                return (
                  <tr key={i.id}>
                    <td className="mono">{i.ref}</td>
                    <td className="who">
                      {i.clientName}
                      <small>{i.clientSegment}</small>
                    </td>
                    <td>{o?.title ?? i.offerId}</td>
                    <td>
                      <span className={`st ${i.type}`}>{t(INTENT_LABEL[i.type])}</span>
                    </td>
                    <td>
                      <span className={`st ${i.state}`}>{t(INTENT_STATE_LABEL[i.state])}</span>
                    </td>
                    <td className="r num">{i.amount ? fmt(i.amount) : "—"}</td>
                    <td>
                      <div className={styles.gen}>
                        {docsAvailable(i).map((t) => (
                          <GenerateButton key={t} type={t} intentId={i.id} label={DOC_LABEL[t]} withAllocation={t === "allocation" || t === "opere"} />
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {candidates.length === 0 && (
                <tr>
                  <td colSpan={7} className="muted">
                    {t("Aucune intention confirmée : confirmez une prise ferme dans le carnet pour produire son bulletin.")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <div className="panel-h">
          <h2>{t("Documents émis")}</h2>
          <span className="muted" style={{ fontSize: ".8rem" }}>
            {docs.length} document{docs.length > 1 ? "s" : ""} · originaux conservés
          </span>
        </div>
        <div className="scroll-x">
          <table className="tbl">
            <thead>
              <tr>
                <th>N°</th>
                <th>{t("Document")}</th>
                <th>{t("Client")}</th>
                <th>{t("Généré")}</th>
                <th>{t("État")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => {
                const [cls, label] = STATUS[d.status];
                return (
                  <tr key={d.id}>
                    <td className="mono">
                      <a href={`/desk/documents/pdf/${d.id}`} target="_blank" rel="noreferrer">
                        {d.number}
                      </a>
                    </td>
                    <td>{t(DOC_LABEL[d.type])}</td>
                    <td>{d.clientName ?? <span className="muted">SVT</span>}</td>
                    <td className="num">
                      {fmtDateTime(d.createdAt)}
                      {d.createdBy ? <small className="muted"> · {d.createdBy}</small> : null}
                    </td>
                    <td>
                      <span className={`${styles.st} ${styles[`st_${cls}`]}`}>{label}</span>
                      {d.sentVia?.length ? <small className="muted"> · {d.sentVia.join(", ")}</small> : null}
                    </td>
                    <td>
                      <div className={styles.right}>
                        <a className="btn sm" href={`/desk/documents/pdf/${d.id}`} target="_blank" rel="noreferrer">
                          {t("Ouvrir")}
                        </a>
                        {d.type !== "bordereau" &&
                          ["WhatsApp", "E-mail"].map((c) => (
                            <form key={c} action={markDocumentAction}>
                              <input type="hidden" name="docId" value={d.id} />
                              <input type="hidden" name="mark" value={c} />
                              <button className="btn sm ghost" type="submit">
                                Envoyé · {c}
                              </button>
                            </form>
                          ))}
                        {(d.type === "bulletin" || d.type === "cession" || d.type === "bordereau") && d.status !== "signe" && (
                          <form action={markDocumentAction}>
                            <input type="hidden" name="docId" value={d.id} />
                            <input type="hidden" name="mark" value="signe" />
                            <button className="btn sm" type="submit">
                              {t("Signé reçu")}
                            </button>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {docs.length === 0 && (
                <tr>
                  <td colSpan={6} className="muted">
                    {t("Aucun document encore émis.")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <div className="panel-h">
          <h2>{t("Chaîne documentaire")}</h2>
          <span className="muted" style={{ fontSize: ".8rem" }}>
            {t("Chaque document est une vue des mêmes lignes, produite au moment où l'étape se produit")}
          </span>
        </div>
        <div className="scroll-x">
          <table className="tbl">
            <thead>
              <tr>
                <th>{t("Étape")}</th>
                <th>{t("Document")}</th>
                <th>{t("Destinataire")}</th>
                <th>{t("Déclencheur")}</th>
              </tr>
            </thead>
            <tbody>
              {CHAIN.map((row) => (
                <tr key={row[0]}>
                  <td>
                    <b>{t(row[0])}</b>
                  </td>
                  <td>{t(row[1])}</td>
                  <td>{t(row[2])}</td>
                  <td className="muted">{t(row[3])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
