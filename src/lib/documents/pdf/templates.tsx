import { View } from "@react-pdf/renderer";
import { COMPANY, SETTLEMENT, SVT_BY_COUNTRY } from "@/lib/config";
import type { Intent, Offer } from "@/lib/domain/types";
import { fmt, fmtDate, fmtDateTime, fmtPct, localIso } from "@/lib/format";
import { positionFor, type Position } from "../position";
import { Addr, KV, Letter, Sig, Table, Text, s } from "./primitives";
import { passage } from "../passages-catalog";

/** Everything a client document needs. */
export interface ClientDocCtx {
  number: string;
  intent: Intent;
  offer: Offer;
  position: Position;
  now: Date;
  advisor?: string;
  /** Result documents: allocation ratio (1 = fully served) and served price. */
  allocation?: number;
  /** Nominative sub-account number at the SVT, once opened. */
  account?: string;
  /** Client's settlement account (RIB) : printed where money goes back to the client. */
  payout?: { bank?: string; account?: string; holder?: string };
  /** The desk's wording in force for this document type (passage key → text); the code's defaults otherwise. */
  texts?: Record<string, string>;
}
export const payoutLine = (p?: ClientDocCtx["payout"]) => (p?.account ? `${p.bank ? `${p.bank} · ` : ""}${p.account}${p.holder ? ` (${p.holder})` : ""}` : "RIB à communiquer au desk");

const isoDay = localIso;
const clientBlock = (i: Intent, account?: string): [string, string[]] => ["Donneur d'ordre", [i.clientName, i.clientSegment, `Sous-compte nominatif : ${account ?? "en cours d'ouverture"}`]];
const lineTitle = (o: Offer) => `${o.title}${o.operation === "abondement" ? " (réouverture)" : o.operation === "nouvelle_ligne" ? " (ligne nouvelle)" : ""}`;

/* ---------------- Bulletin d'ordre ---------------- */
export function Bulletin({ number, intent, offer, position: p, now, advisor, account, texts }: ClientDocCtx) {
  const isBond = offer.kind === "OTA" || offer.kind === "APE" || (offer.kind === "MARCHE" && offer.instrument === "obligation");
  const market = offer.kind === "MARCHE";
  const sell = intent.type === "vente";
  return (
    <Letter heading={`Bulletin d'ordre · ${number}`}>
      <Text style={s.h1}>{market ? `Ordre de bourse : ${sell ? "vente" : "achat"} · ${offer.market}` : `Ordre de souscription : ${offer.issuer}`}</Text>
      <Text style={s.ref}>
        {number} · établi le {fmtDate(isoDay(now))} · intention {intent.ref} · offre v{offer.version} (prix publié le {offer.pricedAt ? fmtDateTime(offer.pricedAt) : "—"})
      </Text>
      <Addr
        blocks={[
          clientBlock(intent, account),
          ["Intermédiaire", market ? [COMPANY.legalName, `Exécution sur ${offer.market}`, `Règlement T+${offer.settlementDays ?? 3}`] : [COMPANY.legalName, `Transmission via ${SVT_BY_COUNTRY[offer.country]?.name ?? "SVT partenaire"}`, `Dépôt des offres : ${fmtDateTime(offer.deadlineAt)}`]],
        ]}
      />
      <Table
        cols={[{ label: "Ligne", flex: 3 }, { label: "Code", flex: 1.4, mono: true }, { label: p.unitWord, right: true }, { label: "Prix", right: true }, { label: "Nominal (FCFA)", flex: 1.3, right: true }]}
        rows={[[lineTitle(offer), offer.isin, fmt(p.units), market ? (intent.limitPrice != null ? `limite ${p.priceLabel}` : `au marché (réf. ${p.priceLabel})`) : p.priceLabel, fmt(p.nominalAmount)]]}
      />
      <KV
        rows={[
          [`Prix des ${p.unitWord} (${fmt(p.units)} × ${fmt(p.principal / Math.max(p.units, 1))})`, fmt(p.principal)],
          ...(isBond ? ([[`Coupon couru${p.accruedDays ? ` du ${offer.lastCouponOn ? fmtDate(offer.lastCouponOn, false) : "—"} au ${fmtDate(offer.settleOn, false)} (${p.accruedDays} jours)` : " (ligne nouvelle)"}`, p.accruedDays ? fmt(p.accrued) : "néant"]] as [string, string][]) : []),
          ...(offer.commissionPct > 0 ? ([[`Commission d'intermédiation ${fmtPct(offer.commissionPct, 2)}`, fmt(p.commission)]] as [string, string][]) : []),
        ]}
        total={market ? [sell ? `Produit net estimé, règlement T+${offer.settlementDays ?? 3}` : `Montant total estimé, règlement T+${offer.settlementDays ?? 3}`, `${fmt(Math.abs(p.total))} FCFA`] : [`Montant total à régler, valeur ${fmtDate(offer.settleOn)}`, `${fmt(p.total)} FCFA`]}
      />
      {p.irr != null && (
        <View style={s.box}>
          <Text>
            Rendement actuariel annuel brut si l&apos;ordre est servi à {p.priceLabel} : <Text style={s.b}>{fmtPct(p.irr, 2)}</Text>.
            {p.schedule.length > 0 && ` Premier flux le ${fmtDate(isoDay(p.schedule[0].date))} : ${fmt(p.schedule[0].amount)} FCFA${p.accruedDays ? " (dont récupération du coupon couru)" : ""}.`}
            {offer.maturityOn && ` Remboursement à 100 % le ${fmtDate(offer.maturityOn)}.`}
          </Text>
        </View>
      )}
      <Text style={s.p}>
        {market
          ? passage("bulletin", "ordre_marche", texts, { societe: COMPANY.legalName, marche: offer.market ?? "", prix_limite: intent.limitPrice != null ? `au prix limite de ${p.priceLabel}` : "au prix du marché" })
          : passage("bulletin", "ordre_primaire", texts, { societe: COMPANY.legalName, date_adjudication: fmtDate(offer.deadlineAt) })}{" "}
        {passage("bulletin", "irrevocable", texts)}
      </Text>
      <Sig left={passage("bulletin", "signature_client", texts)} right={passage("bulletin", "signature_societe", texts, { societe: COMPANY.legalName, conseiller: advisor ? ` · ${advisor}` : "" })} />
    </Letter>
  );
}

/* ---------------- Appel de fonds ---------------- */
export function AppelDeFonds({ number, intent, offer, position: p, now, texts }: ClientDocCtx) {
  const dayBefore = new Date(`${offer.settleOn}T15:00:00`);
  dayBefore.setDate(dayBefore.getDate() - 1);
  return (
    <Letter heading={`Appel de fonds · ${number}`}>
      <Text style={s.h1}>Appel de fonds : instruction de règlement</Text>
      <Text style={s.ref}>
        {number} · émis le {fmtDate(isoDay(now))} · à créditer avant le {fmtDateTime(dayBefore.toISOString())}
      </Text>
      <Addr blocks={[["Client", [intent.clientName, intent.clientSegment]], ["Ordre", [intent.ref, lineTitle(offer), `${p.label} à ${p.priceLabel}`]]]} />
      <KV
        rows={[
          ["Bénéficiaire", SETTLEMENT.beneficiary],
          ["Banque", SETTLEMENT.bank],
          ["RIB / IBAN", SETTLEMENT.iban],
          ["Motif du virement (obligatoire)", `${intent.ref} ${intent.clientName}`],
        ]}
        total={["Montant à virer", `${fmt(p.total)} FCFA`]}
      />
      <Text style={s.p}>{passage("fonds", "provenance", texts)}</Text>
      <Text style={s.small}>{passage("fonds", "segregation", texts, { societe: COMPANY.legalName })}</Text>
    </Letter>
  );
}

/* ---------------- Ordre de cession ---------------- */
export function OrdreDeCession({ number, intent, offer, position: p, now, advisor, payout, texts }: ClientDocCtx) {
  return (
    <Letter heading={`Ordre de cession · ${number}`}>
      <Text style={s.h1}>Ordre de cession : rachat par l&apos;émetteur</Text>
      <Text style={s.ref}>
        {number} · établi le {fmtDate(isoDay(now))} · intention {intent.ref}
      </Text>
      <Addr blocks={[["Cédant", [intent.clientName, intent.clientSegment]], ["Intermédiaire", [COMPANY.legalName, `Via ${SVT_BY_COUNTRY[offer.country]?.name ?? "SVT partenaire"}`]]]} />
      <Table
        cols={[{ label: "Ligne", flex: 3 }, { label: "Code", flex: 1.4, mono: true }, { label: "Titres cédés", right: true }, { label: "Prix", right: true }, { label: "Nominal", flex: 1.2, right: true }, { label: `Com. ${fmtPct(offer.commissionPct, 2)}`, right: true }, { label: "Net attendu", flex: 1.2, right: true }]}
        rows={[[lineTitle(offer), offer.isin, fmt(p.units), p.priceLabel, fmt(p.nominalAmount), fmt(p.commission), fmt(-p.total)]]}
      />
      <Text style={s.p}>
        {passage("cession", "attestation", texts, { date_reglement: fmtDate(offer.settleOn), compte: payoutLine(payout) })}
      </Text>
      <Sig left={passage("cession", "signature_cedant", texts)} right={passage("bulletin", "signature_societe", texts, { societe: COMPANY.legalName, conseiller: advisor ? ` · ${advisor}` : "" })} />
    </Letter>
  );
}

/* ---------------- Avis de résultat / non-allocation ---------------- */
export function AvisResultat({ number, intent, offer, position: p, now, allocation = 1, texts }: ClientDocCtx) {
  const served = allocation > 0;
  const servedPos = served ? positionFor(intent, offer, { pricePct: offer.servedPricePct, unitsOverride: Math.floor(p.units * allocation) }) : undefined;
  return (
    <Letter heading={`Avis de résultat · ${number}`}>
      <Text style={s.h1}>{served ? "Avis de résultat et d'allocation" : "Avis de non-allocation"}</Text>
      <Text style={s.ref}>
        {number} · {offer.issuer} · adjudication du {fmtDate(offer.deadlineAt)} · avis émis le {fmtDateTime(now.toISOString())}
      </Text>
      <Addr blocks={[["Client", [intent.clientName, intent.clientSegment]], ["Ordre", [intent.ref, lineTitle(offer), `${p.label} à ${p.priceLabel}`]]]} />
      <View style={s.box}>
        {served ? (
          <Text>
            <Text style={s.b}>Votre ordre est servi à {fmtPct(allocation * 100, 0)}.</Text> Prix retenu par l&apos;émetteur sur la ligne {offer.isin} : {offer.servedPricePct != null ? fmtPct(offer.servedPricePct, 3) : p.priceLabel}.
          </Text>
        ) : (
          <Text>
            <Text style={s.b}>Votre ordre n&apos;a pas été servi.</Text> Les prix retenus par l&apos;émetteur n&apos;ont pas atteint le vôtre. Les fonds reçus sont restitués sous deux jours ouvrés sur le compte d&apos;origine, sans frais.
          </Text>
        )}
      </View>
      {servedPos && (
        <KV
          rows={[
            [`${servedPos.unitWord.charAt(0).toUpperCase() + servedPos.unitWord.slice(1)} alloués`, fmt(servedPos.units)],
            ["Prix servi", servedPos.priceLabel],
            [`Montant définitif (titres + coupon couru${offer.commissionPct > 0 ? " + commission" : ""})`, `${fmt(servedPos.total)} FCFA`],
            ["Fonds reçus", `${fmt(p.total)} FCFA`],
          ]}
          total={["Solde à restituer / à compléter", `${fmt(p.total - servedPos.total)} FCFA`]}
        />
      )}
      {servedPos?.irr != null && (
        <Text style={s.p}>{passage("allocation", "reglement", texts, { date_reglement: fmtDate(offer.settleOn), rendement: fmtPct(servedPos.irr, 2) })}</Text>
      )}
    </Letter>
  );
}

/* ---------------- Avis d'opéré ---------------- */
export function AvisOpere({ number, intent, offer, position: p, now, allocation = 1, payout, texts }: ClientDocCtx) {
  const paysClient = intent.type === "vente" || intent.type === "cession";
  const pos = positionFor(intent, offer, { pricePct: offer.servedPricePct, unitsOverride: Math.floor(p.units * allocation) });
  return (
    <Letter heading={`Avis d'opéré · ${number}`}>
      <Text style={s.h1}>Avis d&apos;opéré</Text>
      <Text style={s.ref}>
        {number} · opération du {fmtDate(offer.settleOn)} · émis le {fmtDateTime(now.toISOString())}
      </Text>
      <Addr blocks={[["Titulaire", [intent.clientName, intent.clientSegment]], ["Opération", [offer.kind === "MARCHE" ? `${intent.type === "vente" ? "Vente" : "Achat"} sur ${offer.market} : ${offer.issuer}` : `${intent.type === "cession" ? "Cession" : "Achat"} sur le marché primaire : ${offer.issuer}`, `Intermédiaire : ${COMPANY.legalName} via ${SVT_BY_COUNTRY[offer.country]?.name ?? "SVT partenaire"}`]]]} />
      <Table
        cols={[{ label: "Titre", flex: 2.4 }, { label: "Code", flex: 1.3, mono: true }, { label: "Quantité", right: true }, { label: "Cours", right: true }, { label: "Brut", flex: 1.2, right: true }, { label: "Coupon couru", flex: 1.1, right: true }, { label: "Commission", right: true }, { label: "Net", flex: 1.2, right: true }]}
        rows={[[offer.title, offer.isin, fmt(pos.units), pos.priceLabel, fmt(pos.principal), fmt(pos.accrued), fmt(pos.commission), fmt(Math.abs(pos.total))]]}
      />
      {pos.schedule.length > 0 && (
        <>
          <Text style={[s.p, s.b]}>Échéancier de votre position</Text>
          <Table
            cols={[{ label: "Date", flex: 1.2 }, { label: "Nature", flex: 3 }, { label: "Montant brut (FCFA)", flex: 1.4, right: true }]}
            rows={pos.schedule.map((f) => [fmtDate(isoDay(f.date)), f.label === "Coupon" ? `Coupon ${fmtPct(offer.couponRate ?? 0, 2)} sur ${fmt(pos.nominalAmount)}` : f.label === "Coupon + capital" ? "Coupon + remboursement du nominal" : "Remboursement du nominal", fmt(f.amount)])}
          />
        </>
      )}
      <Text style={s.p}>{passage("opere", "confirmation", texts, { date_reglement: fmtDate(offer.settleOn), livraison: paysClient ? `Produit net viré sur votre compte de règlement (${payoutLine(payout)}).` : "Titres dématérialisés, inscrits à votre nom." })}</Text>
    </Letter>
  );
}

/* ---------------- Bordereau de soumission SVT ---------------- */
export interface BordereauCtx {
  number: string;
  country: string;
  issuer: string;
  deadlineAt: string;
  settleOn: string;
  sourceRef?: string;
  lines: { offer: Offer; intents: { intent: Intent; position: Position }[] }[];
  now: Date;
  /** clientId → nominative sub-account number at the SVT. */
  accounts?: Map<string, string | undefined>;
  texts?: Record<string, string>;
}

export function Bordereau({ number, country, issuer, deadlineAt, settleOn, sourceRef, lines, now, accounts, texts }: BordereauCtx) {
  const svt = SVT_BY_COUNTRY[country] ?? { name: "SVT partenaire", address: "" };
  const rows = lines.map(({ offer, intents }) => {
    const units = intents.reduce((a, x) => a + x.position.units, 0);
    const nominal = intents.reduce((a, x) => a + x.position.nominalAmount, 0);
    const accrued = intents.reduce((a, x) => a + x.position.accrued, 0);
    // Settled with the SVT gross of our commission: buys = principal + accrued, cessions = nominal received.
    const cession = offer.kind === "RACHAT";
    const settle = cession ? -nominal : intents.reduce((a, x) => a + x.position.principal + x.position.accrued, 0);
    return { offer, units, nominal, accrued, settle, cession };
  });
  const net = rows.reduce((a, r) => a + r.settle, 0);
  return (
    <Letter heading={`Bordereau de soumission · ${number}`}>
      <Text style={s.h1}>Soumission groupée : adjudication du {fmtDate(deadlineAt)}</Text>
      <Text style={s.ref}>
        {number} · généré le {fmtDateTime(now.toISOString())} · dépôt avant {fmtDateTime(deadlineAt)}
      </Text>
      <Addr blocks={[["À l'attention de", [svt.name, "Spécialiste en Valeurs du Trésor", svt.address]], ["Objet", ["Offres de souscription et de cession pour compte de tiers", `Émetteur : ${issuer}`, sourceRef ?? ""]]]} />
      <Table
        cols={[{ label: "Ligne", flex: 2.2 }, { label: "Code", flex: 1.3, mono: true }, { label: "Nature", flex: 1.1 }, { label: "Titres", right: true }, { label: "Prix", right: true }, { label: "Nominal (FCFA)", flex: 1.3, right: true }, { label: "Coupon couru", flex: 1.1, right: true }, { label: "Règlement", flex: 1.3, right: true }]}
        rows={rows.map((r) => [r.offer.title, r.offer.isin, r.cession ? "Cession (rachat)" : "Souscription", fmt(r.units), r.cession ? "100,000" : r.offer.kind === "BTA" ? `${r.offer.precountRate ?? "—"} %` : (r.offer.pricePct ?? 0).toLocaleString("fr-FR", { minimumFractionDigits: 3 }), fmt(r.nominal), r.cession ? "selon émetteur" : fmt(r.accrued), r.cession ? `(${fmt(Math.abs(r.settle))})` : fmt(r.settle)])}
        total={["Net à régler par Purpose Capital", "", "", "", "", fmt(rows.reduce((a, r) => a + (r.cession ? -r.nominal : r.nominal), 0)), "", `${fmt(net)} FCFA`]}
      />
      <Text style={[s.p, s.b]}>Annexe : ventilation par client final (sous-comptes nominatifs ouverts dans vos livres sous le regroupement Purpose Capital)</Text>
      <Table
        cols={[{ label: "Client", flex: 2 }, { label: "Sous-compte", flex: 1.5, mono: true }, { label: "Ligne", flex: 1.5, mono: true }, { label: "Titres", right: true }, { label: "Réf. ordre", flex: 1.2, mono: true }, { label: "État" }]}
        rows={lines.flatMap(({ offer, intents }) => intents.map(({ intent, position }) => [intent.clientName, (intent.clientId && accounts?.get(intent.clientId)) || "à ouvrir", offer.isin, fmt(position.units), intent.ref, intent.state === "transmise" ? "transmis" : "confirmé"]))}
      />
      <Text style={s.p}>{passage("bordereau", "reglement_svt", texts, { date_reglement: fmtDate(settleOn), svt: svt.name })}</Text>
      <Sig left={`Pour ${COMPANY.legalName} : le Directeur Général, signature et cachet`} right={`Réception ${svt.name.split(" · ")[0]}, heure, visa`} />
    </Letter>
  );
}
