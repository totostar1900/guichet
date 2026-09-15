import { View } from "@react-pdf/renderer";
import { COMPANY, SETTLEMENT, SVT_BY_COUNTRY } from "@/lib/config";
import type { Intent, Offer } from "@/lib/domain/types";
import { fmt, fmtDate, fmtDateTime, fmtPct, localIso } from "@/lib/format";
import { positionFor, type Position } from "../position";
import { Addr, KV, Letter, Sig, Table, Text, s } from "./primitives";

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
  /** Client's settlement account (RIB) — printed where money goes back to the client. */
  payout?: { bank?: string; account?: string; holder?: string };
}
export const payoutLine = (p?: ClientDocCtx["payout"]) => (p?.account ? `${p.bank ? `${p.bank} · ` : ""}${p.account}${p.holder ? ` (${p.holder})` : ""}` : "RIB à communiquer au desk");

const isoDay = localIso;
const clientBlock = (i: Intent, account?: string): [string, string[]] => ["Donneur d'ordre", [i.clientName, i.clientSegment, `Sous-compte nominatif : ${account ?? "en cours d'ouverture"}`]];
const lineTitle = (o: Offer) => `${o.title}${o.operation === "abondement" ? " (réouverture)" : o.operation === "nouvelle_ligne" ? " (ligne nouvelle)" : ""}`;

/* ---------------- Bulletin d'ordre ---------------- */
export function Bulletin({ number, intent, offer, position: p, now, advisor, account }: ClientDocCtx) {
  const isBond = offer.kind === "OTA" || offer.kind === "APE" || (offer.kind === "MARCHE" && offer.instrument === "obligation");
  const market = offer.kind === "MARCHE";
  const sell = intent.type === "vente";
  return (
    <Letter heading={`Bulletin d'ordre · ${number}`}>
      <Text style={s.h1}>{market ? `Ordre de bourse — ${sell ? "vente" : "achat"} · ${offer.market}` : `Ordre de souscription — ${offer.issuer}`}</Text>
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
            Rendement actuariel brut si l&apos;ordre est servi à {p.priceLabel} : <Text style={s.b}>{fmtPct(p.irr, 2)}</Text>.
            {p.schedule.length > 0 && ` Premier flux le ${fmtDate(isoDay(p.schedule[0].date))} : ${fmt(p.schedule[0].amount)} FCFA${p.accruedDays ? " (dont récupération du coupon couru)" : ""}.`}
            {offer.maturityOn && ` Remboursement à 100 % le ${fmtDate(offer.maturityOn)}.`}
          </Text>
        </View>
      )}
      <Text style={s.p}>
        {market
          ? `Le donneur d'ordre demande à ${COMPANY.legalName} de présenter cet ordre sur ${offer.market}${intent.limitPrice != null ? ` au prix limite de ${p.priceLabel}` : " au prix du marché"}, valable jusqu'à révocation ou exécution. Exécution totale ou partielle selon la contrepartie disponible ; les montants ci-dessus sont estimés au cours de référence et sont arrêtés à l'exécution.`
          : `Le donneur d'ordre demande à ${COMPANY.legalName} de présenter cet ordre à l'adjudication du ${fmtDate(offer.deadlineAt)}, au prix ci-dessus.`}
        {market ? "" : " "} L&apos;ordre est irrévocable dès sa transmission au SVT. En cas d&apos;allocation partielle, les montants sont ajustés au prorata ; en cas de non-allocation, les fonds sont restitués sous deux jours ouvrés, sans frais.
      </Text>
      <Sig left="Le donneur d'ordre — « lu et approuvé », date et signature" right={`${COMPANY.legalName} — confirmation du conseiller${advisor ? ` · ${advisor}` : ""}`} />
    </Letter>
  );
}

/* ---------------- Appel de fonds ---------------- */
export function AppelDeFonds({ number, intent, offer, position: p, now }: ClientDocCtx) {
  const dayBefore = new Date(`${offer.settleOn}T15:00:00`);
  dayBefore.setDate(dayBefore.getDate() - 1);
  return (
    <Letter heading={`Appel de fonds · ${number}`}>
      <Text style={s.h1}>Appel de fonds — instruction de règlement</Text>
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
      <Text style={s.p}>
        Les fonds doivent provenir d&apos;un compte au nom du donneur d&apos;ordre et être disponibles la veille du règlement. À défaut, l&apos;ordre n&apos;est pas présenté et le client en est informé. En cas de non-allocation totale ou partielle, l&apos;excédent est restitué sous deux jours ouvrés sur le compte d&apos;origine.
      </Text>
      <Text style={s.small}>Le compte de règlement clients est ségrégué des fonds propres de {COMPANY.legalName} et ne sert qu&apos;au règlement-livraison des opérations de la clientèle.</Text>
    </Letter>
  );
}

/* ---------------- Ordre de cession ---------------- */
export function OrdreDeCession({ number, intent, offer, position: p, now, advisor, payout }: ClientDocCtx) {
  return (
    <Letter heading={`Ordre de cession · ${number}`}>
      <Text style={s.h1}>Ordre de cession — rachat par l&apos;émetteur</Text>
      <Text style={s.ref}>
        {number} · établi le {fmtDate(isoDay(now))} · intention {intent.ref}
      </Text>
      <Addr blocks={[["Cédant", [intent.clientName, intent.clientSegment]], ["Intermédiaire", [COMPANY.legalName, `Via ${SVT_BY_COUNTRY[offer.country]?.name ?? "SVT partenaire"}`]]]} />
      <Table
        cols={[{ label: "Ligne", flex: 3 }, { label: "Code", flex: 1.4, mono: true }, { label: "Titres cédés", right: true }, { label: "Prix", right: true }, { label: "Nominal", flex: 1.2, right: true }, { label: `Com. ${fmtPct(offer.commissionPct, 2)}`, right: true }, { label: "Net attendu", flex: 1.2, right: true }]}
        rows={[[lineTitle(offer), offer.isin, fmt(p.units), p.priceLabel, fmt(p.nominalAmount), fmt(p.commission), fmt(-p.total)]]}
      />
      <Text style={s.p}>
        Le coupon couru est réglé par l&apos;émetteur selon les modalités du rachat. Le cédant atteste détenir les titres libres de tout nantissement et autorise leur livraison contre paiement, valeur {fmtDate(offer.settleOn)}. Produit de cession crédité sous un jour ouvré après règlement sur le compte de règlement du cédant : {payoutLine(payout)}.
      </Text>
      <Sig left="Le cédant — date, signature et cachet" right={`${COMPANY.legalName} — confirmation du conseiller${advisor ? ` · ${advisor}` : ""}`} />
    </Letter>
  );
}

/* ---------------- Avis de résultat / non-allocation ---------------- */
export function AvisResultat({ number, intent, offer, position: p, now, allocation = 1 }: ClientDocCtx) {
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
        <Text style={s.p}>
          Le règlement-livraison intervient le {fmtDate(offer.settleOn)}. Vous recevrez l&apos;avis d&apos;opéré dès confirmation de l&apos;inscription des titres à votre nom. Rendement actuariel brut sur la base du prix servi : <Text style={s.b}>{fmtPct(servedPos.irr, 2)}</Text>.
        </Text>
      )}
    </Letter>
  );
}

/* ---------------- Avis d'opéré ---------------- */
export function AvisOpere({ number, intent, offer, position: p, now, allocation = 1, payout }: ClientDocCtx) {
  const paysClient = intent.type === "vente" || intent.type === "cession";
  const pos = positionFor(intent, offer, { pricePct: offer.servedPricePct, unitsOverride: Math.floor(p.units * allocation) });
  return (
    <Letter heading={`Avis d'opéré · ${number}`}>
      <Text style={s.h1}>Avis d&apos;opéré</Text>
      <Text style={s.ref}>
        {number} · opération du {fmtDate(offer.settleOn)} · émis le {fmtDateTime(now.toISOString())}
      </Text>
      <Addr blocks={[["Titulaire", [intent.clientName, intent.clientSegment]], ["Opération", [offer.kind === "MARCHE" ? `${intent.type === "vente" ? "Vente" : "Achat"} sur ${offer.market} — ${offer.issuer}` : `${intent.type === "cession" ? "Cession" : "Achat"} sur le marché primaire — ${offer.issuer}`, `Intermédiaire : ${COMPANY.legalName} via ${SVT_BY_COUNTRY[offer.country]?.name ?? "SVT partenaire"}`]]]} />
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
      <Text style={s.p}>
        Date de valeur : {fmtDate(offer.settleOn)}. {paysClient ? `Produit net viré sur votre compte de règlement (${payoutLine(payout)}).` : "Titres dématérialisés, inscrits à votre nom."} Cet avis tient lieu de confirmation d&apos;exécution ; votre relevé de position est disponible dans votre espace Guichet.
      </Text>
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
}

export function Bordereau({ number, country, issuer, deadlineAt, settleOn, sourceRef, lines, now, accounts }: BordereauCtx) {
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
      <Text style={s.h1}>Soumission groupée — adjudication du {fmtDate(deadlineAt)}</Text>
      <Text style={s.ref}>
        {number} · généré le {fmtDateTime(now.toISOString())} · dépôt avant {fmtDateTime(deadlineAt)}
      </Text>
      <Addr blocks={[["À l'attention de", [svt.name, "Spécialiste en Valeurs du Trésor", svt.address]], ["Objet", ["Offres de souscription et de cession pour compte de tiers", `Émetteur : ${issuer}`, sourceRef ?? ""]]]} />
      <Table
        cols={[{ label: "Ligne", flex: 2.2 }, { label: "Code", flex: 1.3, mono: true }, { label: "Nature", flex: 1.1 }, { label: "Titres", right: true }, { label: "Prix", right: true }, { label: "Nominal (FCFA)", flex: 1.3, right: true }, { label: "Coupon couru", flex: 1.1, right: true }, { label: "Règlement", flex: 1.3, right: true }]}
        rows={rows.map((r) => [r.offer.title, r.offer.isin, r.cession ? "Cession (rachat)" : "Souscription", fmt(r.units), r.cession ? "100,000" : r.offer.kind === "BTA" ? `${r.offer.precountRate ?? "—"} %` : (r.offer.pricePct ?? 0).toLocaleString("fr-FR", { minimumFractionDigits: 3 }), fmt(r.nominal), r.cession ? "selon émetteur" : fmt(r.accrued), r.cession ? `(${fmt(Math.abs(r.settle))})` : fmt(r.settle)])}
        total={["Net à régler par Purpose Capital", "", "", "", "", fmt(rows.reduce((a, r) => a + (r.cession ? -r.nominal : r.nominal), 0)), "", `${fmt(net)} FCFA`]}
      />
      <Text style={[s.p, s.b]}>Annexe — ventilation par client final (sous-comptes nominatifs ouverts dans vos livres sous le regroupement Purpose Capital)</Text>
      <Table
        cols={[{ label: "Client", flex: 2 }, { label: "Sous-compte", flex: 1.5, mono: true }, { label: "Ligne", flex: 1.5, mono: true }, { label: "Titres", right: true }, { label: "Réf. ordre", flex: 1.2, mono: true }, { label: "État" }]}
        rows={lines.flatMap(({ offer, intents }) => intents.map(({ intent, position }) => [intent.clientName, (intent.clientId && accounts?.get(intent.clientId)) || "à ouvrir", offer.isin, fmt(position.units), intent.ref, intent.state === "transmise" ? "transmis" : "confirmé"]))}
      />
      <Text style={s.p}>
        Règlement-livraison : débit de notre compte espèces ouvert dans vos livres, valeur {fmtDate(settleOn)} ; livraison des titres sur les sous-comptes nominatifs des clients listés (ouverture préalable pour ceux marqués « à ouvrir », dossiers transmis). Merci de nous confirmer la réception avant l&apos;heure limite et de nous transmettre les résultats dès publication.
      </Text>
      <Sig left={`Pour ${COMPANY.legalName} — le Directeur Général, signature et cachet`} right={`Réception ${svt.name.split(" — ")[0]} — heure, visa`} />
    </Letter>
  );
}
