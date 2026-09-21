import { View } from "@react-pdf/renderer";
import { passage } from "../passages-catalog";
import { COMPANY } from "@/lib/config";
import type { ClientFile, Closure, Mandate } from "@/lib/domain/kyc";
import type { Contact } from "@/lib/domain/types";
import { fmt, fmtDate, fmtDateTime, localIso } from "@/lib/format";
import { KIND_LABEL } from "@/lib/kyc/checklist";
import type { Position } from "@/lib/positions";
import { Addr, Letter, Sig, Table, Text, s } from "./primitives";

/**
 * The four acts and notices around the life of a relationship: the mandate a
 * client gives, the coupon or redemption notice, the complaint, the transfer
 * / closure order. Same letterhead, numbering and foot as the rest; the
 * wording the desk may edit comes from the passages catalogue.
 */

const who = (file: ClientFile) => [file.identity.name, KIND_LABEL[file.kind], [file.identity.address, file.identity.city, file.identity.country].filter(Boolean).join(", "), file.identity.phone ?? "", file.identity.email ?? ""];

export function scopeText(m: Mandate): string {
  const parts = [m.scope.orders ? (m.scope.fundsOnly ? "passer des ordres sur les fonds OPCVM seulement" : "passer des ordres sur tous instruments") : "", m.scope.notices ? "recevoir les avis et relevés" : ""].filter(Boolean);
  return parts.join(" · ") || "aucune (mandat à compléter)";
}

export function MandatPdf({ number, file, mandate, now, texts }: { number: string; file: ClientFile; mandate: Mandate; now: Date; texts?: Record<string, string> }) {
  const p = (key: string, vars: Record<string, string | undefined> = {}) => passage("mandat", key, texts, vars);
  const compte = file.review.custodianAccount ?? "(en cours d'ouverture)";
  return (
    <Letter heading={`Mandat · ${number}`}>
      <Text style={s.h1}>Mandat de gestion des ordres</Text>
      <Text style={s.ref}>
        {number} · établi le {fmtDate(localIso(now))} · compte-titres {compte}
      </Text>
      <Addr blocks={[["Le Mandant", who(file)], ["Le Mandataire", [mandate.personName, mandate.idNumber ? `Pièce : ${mandate.idNumber}` : "", mandate.relation ? `Lien : ${mandate.relation}` : ""].filter(Boolean)]]} />
      <Table cols={[{ label: "Étendue du mandat", flex: 3 }, { label: "Jusqu'au", flex: 1.2 }]} rows={[[scopeText(mandate), mandate.until ? fmtDate(mandate.until) : "révocation"]]} />
      <View style={{ marginBottom: 6 }}>
        <Text style={s.b}>1. Objet</Text>
        <Text style={s.p}>{p("objet", { mandant: file.identity.name, mandataire: mandate.personName, societe: COMPANY.legalName, compte, etendue: scopeText(mandate) })}</Text>
      </View>
      <View style={{ marginBottom: 6 }}>
        <Text style={s.b}>2. Responsabilité</Text>
        <Text style={s.p}>{p("responsabilite", { societe: COMPANY.legalName })}</Text>
      </View>
      <View style={{ marginBottom: 6 }}>
        <Text style={s.b}>3. Durée et révocation</Text>
        <Text style={s.p}>{p("duree", { fin: mandate.until ? fmtDate(mandate.until) : "sa révocation" })}</Text>
      </View>
      <Text style={s.small}>{p("signatures")}</Text>
      <Sig left="Le Mandant : « bon pour mandat », date et signature" right="Le Mandataire : « bon pour acceptation », date et signature" />
      <Text style={s.small}>
        {COMPANY.legalName} · {COMPANY.licence} · Ce mandat est joint au dossier du client ; les fonds ne sortent que vers son compte de règlement.
      </Text>
    </Letter>
  );
}

export interface CouponNoticeCtx {
  number: string;
  contact: Contact;
  position: Position;
  flow: { date: string; amount: number; label: string };
  paidOn?: string;
  note?: string;
  bank?: { name?: string; ribEnd?: string };
  next?: { date: string; amount: number; label: string };
  now: Date;
  texts?: Record<string, string>;
}

export function AvisCouponPdf({ number, contact, position, flow, paidOn, note, bank, next, now, texts }: CouponNoticeCtx) {
  const redemption = /rembours/i.test(flow.label);
  const o = position.offer;
  const rate = o.couponRate != null ? `${o.couponRate.toLocaleString("fr-FR")} %` : "";
  return (
    <Letter heading={`${redemption ? "Avis de remboursement" : "Avis de coupon"} · ${number}`}>
      <Text style={s.h1}>{redemption ? "Avis de remboursement" : "Avis de paiement de coupon"}</Text>
      <Text style={s.ref}>
        {number} · émis le {fmtDateTime(now.toISOString())}
      </Text>
      <Addr blocks={[["Titulaire", [contact.name, contact.segment, contact.phone ?? "", contact.email ?? ""]], ["Ligne", [o.title, o.isin, o.issuer]]]} />
      <Table
        cols={[{ label: "Nature", flex: 1.4 }, { label: "Date", flex: 1.1 }, { label: "Quantité", right: true }, { label: "Nominal (FCFA)", flex: 1.3, right: true }, { label: "Taux", flex: 1 }, { label: "Montant brut (FCFA)", flex: 1.4, right: true }]}
        rows={[[flow.label, fmtDate(flow.date), `${fmt(position.units)} ${position.unitWord}`, fmt(position.nominalAmount), rate || "—", fmt(flow.amount)]]}
      />
      {paidOn && <Text style={s.p}>Payé le {fmtDate(paidOn)}.</Text>}
      {note && <Text style={s.p}>{note}</Text>}
      <Text style={s.p}>{passage("coupon", "paiement", texts, { banque: bank?.name ?? "votre banque", rib: bank?.ribEnd ?? "…", prochain: next ? `${next.label} du ${fmtDate(next.date)} (${fmt(next.amount)} FCFA)` : "aucun, ligne soldée" })}</Text>
      <Text style={s.small}>{passage("coupon", "reserve", texts)}</Text>
    </Letter>
  );
}

export interface ComplaintCtx {
  number: string;
  contact: Contact;
  operation?: string;
  facts: string;
  ask: string;
  receivedVia: string;
  signedBy?: string; // "code 4471 sur WhatsApp" or "signature papier" or the desk
  ackBy: string; // date limit of the acknowledgement
  answerBy: string;
  now: Date;
  texts?: Record<string, string>;
}

export function ReclamationPdf({ number, contact, operation, facts, ask, receivedVia, signedBy, ackBy, answerBy, now, texts }: ComplaintCtx) {
  return (
    <Letter heading={`Réclamation · ${number}`}>
      <Text style={s.h1}>Réclamation</Text>
      <Text style={s.ref}>
        {number} · déposée le {fmtDateTime(now.toISOString())} · reçue par {receivedVia}
      </Text>
      <Addr blocks={[["Le réclamant", [contact.name, contact.segment, contact.phone ?? "", contact.email ?? ""]], ["Destinataire", [COMPANY.legalName, COMPANY.licence, COMPANY.email]]]} />
      {operation && (
        <View style={{ marginBottom: 6 }}>
          <Text style={s.b}>Opération concernée</Text>
          <Text style={s.p}>{operation}</Text>
        </View>
      )}
      <View style={{ marginBottom: 6 }}>
        <Text style={s.b}>Les faits</Text>
        <Text style={s.p}>{facts}</Text>
      </View>
      <View style={{ marginBottom: 6 }}>
        <Text style={s.b}>La demande</Text>
        <Text style={s.p}>{ask}</Text>
      </View>
      <View style={s.box}>
        <Text>
          <Text style={s.b}>Engagement.</Text> {passage("reclamation", "engagement", texts, { societe: COMPANY.legalName, delai_accuse: "deux jours ouvrés", delai_reponse: "trente jours" })} Accusé de réception au plus tard le {fmtDate(ackBy)} ; réponse au plus tard le {fmtDate(answerBy)}.
        </Text>
      </View>
      <Text style={s.p}>{passage("reclamation", "recours", texts)}</Text>
      {signedBy ? <Text style={s.p}>Signature : {signedBy}.</Text> : <Sig left={passage("reclamation", "signature", texts, { canal: "votre canal prouvé" })} right={`${COMPANY.legalName} : accusé de réception, date`} />}
    </Letter>
  );
}

export function TransfertPdf({ number, file, closure, positions, now, texts }: { number: string; file: ClientFile; closure: Closure; positions: Position[]; now: Date; texts?: Record<string, string> }) {
  const rows = positions.filter((p) => !closure.isins || closure.isins.includes(p.offer.isin));
  const dest = [closure.destination, closure.destinationAccount ? `compte ${closure.destinationAccount}` : ""].filter(Boolean).join(" · ") || "(à préciser)";
  const scope = closure.scope === "tout" ? "toutes les positions, puis clôture du compte" : closure.scope === "partiel" ? "les positions ci-dessous ; le compte reste ouvert" : "clôture d'un compte sans position";
  return (
    <Letter heading={`Transfert · ${number}`}>
      <Text style={s.h1}>{closure.scope === "partiel" ? "Ordre de transfert de titres" : "Ordre de transfert de titres et de clôture de compte"}</Text>
      <Text style={s.ref}>
        {number} · établi le {fmtDate(localIso(now))} · compte-titres {file.review.custodianAccount ?? "—"}
      </Text>
      <Addr blocks={[["Le Titulaire", who(file)], ["Vers", [dest]]]} />
      <Text style={s.p}>Portée : {scope}.</Text>
      {rows.length > 0 && (
        <Table
          cols={[{ label: "Ligne", flex: 2.4 }, { label: "Code", flex: 1.4, mono: true }, { label: "Quantité", right: true }, { label: "Nominal (FCFA)", flex: 1.3, right: true }]}
          rows={rows.map((p) => [p.offer.title, p.offer.isin, `${fmt(p.units)} ${p.unitWord}`, fmt(p.nominalAmount)])}
          total={["Total", "", "", fmt(rows.reduce((a, p) => a + p.nominalAmount, 0))]}
        />
      )}
      <Text style={s.p}>{passage("transfert", "instruction", texts, { etablissement: dest })}</Text>
      <Text style={s.p}>{passage("transfert", "coupons_frais", texts)}</Text>
      {closure.reason && <Text style={s.small}>Motif indiqué : {closure.reason}</Text>}
      <Sig left={passage("transfert", "signature", texts)} right={`${COMPANY.legalName} : accusé de réception, date`} />
      <Text style={s.small}>Le dossier passe « en clôture » à la signature et « clos » à la confirmation du dépositaire ; le relevé final est joint.</Text>
    </Letter>
  );
}
