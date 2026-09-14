import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { DOC_LABEL } from "@/lib/documents/registry";
import { INTENT_LABEL, INTENT_STATE_LABEL } from "@/lib/domain/intent";
import { fmt, fmtDateTime } from "@/lib/format";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mon espace" };

/** What a client can see of their own relationship: intents, states, documents. */
export default async function MyPage() {
  const s = await requireSession("/moi");
  const r = repo();
  const [intents, offers, docs] = await Promise.all([r.listIntents(), r.listOffers(), r.listDocuments()]);
  const mine = intents.filter((i) => i.clientId === s.userId);
  const byOffer = new Map(offers.map((o) => [o.id, o]));
  const myDocs = docs.filter((d) => d.intentId && mine.some((i) => i.id === d.intentId));

  const NEXT: Record<string, string> = {
    recue: "Un conseiller vous rappelle avant la clôture.",
    confirmee: "Signez le bulletin et effectuez le virement indiqué sur l'appel de fonds.",
    transmise: "Ordre transmis au SVT — résultats attendus le jour de l'adjudication.",
    servie: "Servi. Règlement à la date indiquée, puis avis d'opéré.",
    non_servie: "Non servi. Fonds restitués sous deux jours ouvrés.",
    reglee: "Titres inscrits à votre nom. Prochain coupon selon l'échéancier de l'avis d'opéré.",
    annulee: "Annulée.",
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <div>
          <div className="eyebrow">Mon espace</div>
          <h1 className="display">{s.name}</h1>
          <div className="muted" style={{ fontSize: ".85rem" }}>
            {s.segment} · niveau {s.tier} {s.tier < 2 ? "— compte-titres à ouvrir pour les prises fermes (prochaine étape)" : "— compte-titres actif"}
          </div>
        </div>
        <Link href="/" className="btn">
          Voir les offres
        </Link>
      </div>

      <div className="panel">
        <div className="panel-h">
          <h2>Mes intentions</h2>
        </div>
        <div className="scroll-x">
          <table className="tbl">
            <thead>
              <tr>
                <th>Réf.</th>
                <th>Ligne</th>
                <th>Type</th>
                <th className="r">Montant</th>
                <th>État</th>
                <th>Et maintenant</th>
              </tr>
            </thead>
            <tbody>
              {mine.map((i) => {
                const o = byOffer.get(i.offerId);
                return (
                  <tr key={i.id}>
                    <td className="mono">{i.ref}</td>
                    <td>{o ? <Link href={`/offres/${o.id}`}>{o.title}</Link> : i.offerId}</td>
                    <td>
                      <span className={`st ${i.type}`}>{INTENT_LABEL[i.type]}</span>
                    </td>
                    <td className="r num">{i.amount ? `${fmt(i.amount)} ${o?.kind === "RACHAT" ? "titres" : "FCFA"}` : "—"}</td>
                    <td>
                      <span className={`st ${i.state}`}>{INTENT_STATE_LABEL[i.state]}</span>
                    </td>
                    <td className="muted" style={{ fontSize: ".8rem" }}>
                      {NEXT[i.state]}
                    </td>
                  </tr>
                );
              })}
              {mine.length === 0 && (
                <tr>
                  <td colSpan={6} className="muted">
                    Aucune intention pour l&apos;instant — choisissez une offre dans le Guichet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <div className="panel-h">
          <h2>Mes documents</h2>
        </div>
        <div className="scroll-x">
          <table className="tbl">
            <thead>
              <tr>
                <th>N°</th>
                <th>Document</th>
                <th>Émis le</th>
                <th>État</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {myDocs.map((d) => (
                <tr key={d.id}>
                  <td className="mono">{d.number}</td>
                  <td>{DOC_LABEL[d.type]}</td>
                  <td className="num">{fmtDateTime(d.createdAt)}</td>
                  <td>{d.status === "signe" ? "Signé" : d.status === "envoye" ? "Envoyé" : "Disponible"}</td>
                  <td>
                    <a className="btn sm" href={`/desk/documents/pdf/${d.id}`} target="_blank" rel="noreferrer">
                      Ouvrir le PDF
                    </a>
                  </td>
                </tr>
              ))}
              {myDocs.length === 0 && (
                <tr>
                  <td colSpan={5} className="muted">
                    Vos bulletins, appels de fonds et avis apparaîtront ici.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
