import { COMPANY, SETTLEMENT } from "@/lib/config";
import type { FundTerms, Intent, Offer } from "@/lib/domain/types";
import { fmt, fmtDate, fmtDateTime, fmtPct } from "@/lib/format";
import type { Position } from "../position";
import { payoutLine, type ClientDocCtx } from "./templates";
import { Addr, KV, Letter, Sig, Table, Text, s } from "./primitives";
import { prettyName } from "@/lib/market/names";
import { passage } from "../passages-catalog";

/**
 * OPCVM documents. Purpose Capital is the distributor: the order goes to the
 * manager's centralising agent, the units are registered at the depositary in
 * the client's name, at the next NAV : never a price known in advance.
 */

const units3 = (u: number) => u.toLocaleString("fr-FR", { maximumFractionDigits: 3 });
const fundOf = (o: Offer): FundTerms => o.fund ?? { key: o.id, manager: o.issuer, depositary: "—", category: "?", frequency: "?", nav: o.lastPrice ?? 0, navDate: o.lastPriceOn ?? "", navOrigin: 0, inceptionDate: "", perfSinceInceptionPct: 0, distributed: false, entryFeePct: 0, exitFeePct: 0, minAmount: 0 };
const clientBlock = (i: Intent): [string, string[]] => ["Souscripteur", [i.clientName, i.clientSegment, "Parts inscrites à son nom au registre du dépositaire"]];

/* ---------------- Bulletin de souscription ---------------- */
export function BulletinSouscriptionOpcvm({ number, intent, offer, position: p, now, advisor }: ClientDocCtx) {
  const f = fundOf(offer);
  return (
    <Letter heading={`Bulletin de souscription · ${number}`}>
      <Text style={s.h1}>Bulletin de souscription : {offer.title}</Text>
      <Text style={s.ref}>
        {number} · établi le {fmtDate(now.toISOString().slice(0, 10))} · intention {intent.ref} · dernière VL connue {fmt(f.nav)} FCFA au {fmtDate(f.navDate)}
      </Text>
      <Addr blocks={[clientBlock(intent), ["Fonds", [offer.title, `Société de gestion : ${prettyName(f.manager)}`, `Dépositaire : ${prettyName(f.depositary)}`, f.agreementRef ? `Distribution : ${COMPANY.legalName}, convention ${f.agreementRef}` : `Distribution : ${COMPANY.legalName}`]]]} />
      <KV
        rows={[
          ["Montant de la souscription", `${fmt(intent.amount ?? 0)} FCFA`],
          ...(f.entryFeePct > 0 ? ([[`Frais du fonds à l'entrée ${fmtPct(f.entryFeePct, 2)} (acquis au fonds / à la société de gestion)`, fmt(p.commission)]] as [string, string][]) : []),
          ["Montant net investi", fmt(p.principal)],
          [`Parts estimées à la dernière VL (${fmt(f.nav)} FCFA)`, `≈ ${units3(p.units)}`],
        ]}
        total={["Montant total à régler", `${fmt(intent.amount ?? 0)} FCFA`]}
      />
      <Text style={s.p}>
        Le souscripteur demande à {COMPANY.legalName}, distributeur, de transmettre cet ordre à {prettyName(f.manager)} pour exécution à la <Text style={s.b}>prochaine valeur liquidative</Text> suivant la centralisation
        {f.cutoff ? ` (${f.cutoff})` : ""}. Le nombre de parts est arrêté par la société de gestion à cette VL et confirmé par avis ; il peut différer de l&apos;estimation ci-dessus. Les parts sont inscrites au nom du souscripteur au registre tenu par le dépositaire. Le souscripteur reconnaît avoir reçu le document d&apos;information clé du fonds et accepte le règlement du fonds ; il a été informé que la valeur liquidative peut baisser et que les performances passées ne préjugent pas des performances futures.
      </Text>
      <Sig left="Le souscripteur : « lu et approuvé », date et signature" right={`${COMPANY.legalName} : confirmation du conseiller${advisor ? ` · ${advisor}` : ""}`} />
    </Letter>
  );
}

/* ---------------- Appel de fonds (souscription) ---------------- */
export function AppelDeFondsOpcvm({ number, intent, offer, now }: ClientDocCtx) {
  const f = fundOf(offer);
  return (
    <Letter heading={`Appel de fonds · ${number}`}>
      <Text style={s.h1}>Appel de fonds : souscription {offer.title}</Text>
      <Text style={s.ref}>
        {number} · émis le {fmtDate(now.toISOString().slice(0, 10))} · à créditer avant la centralisation{f.cutoff ? ` (${f.cutoff})` : ""}
      </Text>
      <Addr blocks={[["Client", [intent.clientName, intent.clientSegment]], ["Ordre", [intent.ref, offer.title, `Souscription de ${fmt(intent.amount ?? 0)} FCFA`]]]} />
      <KV
        rows={[
          ["Bénéficiaire", SETTLEMENT.beneficiary],
          ["Banque", SETTLEMENT.bank],
          ["RIB / IBAN", SETTLEMENT.iban],
          ["Motif du virement (obligatoire)", `${intent.ref} ${intent.clientName}`],
        ]}
        total={["Montant à virer", `${fmt(intent.amount ?? 0)} FCFA`]}
      />
      <Text style={s.p}>
        Les fonds doivent provenir d&apos;un compte au nom du souscripteur. À réception, {COMPANY.legalName} règle la souscription auprès du dépositaire du fonds ({prettyName(f.depositary)}) pour la valeur liquidative retenue ; en l&apos;absence de fonds à la centralisation, l&apos;ordre est reporté à la VL suivante.
      </Text>
      <Text style={s.small}>Le compte de règlement clients est ségrégué des fonds propres de {COMPANY.legalName} et ne sert qu&apos;au règlement des opérations de la clientèle.</Text>
    </Letter>
  );
}

/* ---------------- Demande de rachat ---------------- */
export function DemandeRachatOpcvm({ number, intent, offer, position: p, now, advisor, payout }: ClientDocCtx) {
  const f = fundOf(offer);
  return (
    <Letter heading={`Demande de rachat · ${number}`}>
      <Text style={s.h1}>Demande de rachat de parts : {offer.title}</Text>
      <Text style={s.ref}>
        {number} · établie le {fmtDate(now.toISOString().slice(0, 10))} · intention {intent.ref} · dernière VL connue {fmt(f.nav)} FCFA au {fmtDate(f.navDate)}
      </Text>
      <Addr blocks={[["Porteur", [intent.clientName, intent.clientSegment]], ["Fonds", [offer.title, `Société de gestion : ${prettyName(f.manager)}`, `Dépositaire : ${prettyName(f.depositary)}`]]]} />
      <KV
        rows={[
          ["Parts à racheter", units3(p.units)],
          [`Valeur estimée à la dernière VL (${fmt(f.nav)} FCFA)`, fmt(p.principal)],
          ...(f.exitFeePct > 0 ? ([[`Frais du fonds à la sortie ${fmtPct(f.exitFeePct, 2)}`, fmt(p.commission)]] as [string, string][]) : []),
          ["Compte de règlement du porteur (virement du produit)", payoutLine(payout)],
        ]}
        total={["Produit net estimé", `${fmt(Math.abs(p.total))} FCFA`]}
      />
      <Text style={s.p}>
        Le porteur demande à {COMPANY.legalName} de transmettre cette demande à {prettyName(f.manager)} pour exécution à la prochaine valeur liquidative de rachat. Le produit, arrêté à cette VL, est viré sur le compte de règlement ci-dessus, ouvert au nom du porteur, dans le délai prévu par le règlement du fonds{f.settlementDays != null ? ` (J+${f.settlementDays} après la VL)` : ""}.
      </Text>
      <Sig left="Le porteur : date et signature" right={`${COMPANY.legalName} : confirmation du conseiller${advisor ? ` · ${advisor}` : ""}`} />
    </Letter>
  );
}

/* ---------------- Avis d'opération (exécution / règlement) ---------------- */
export function AvisOperationOpcvm({ number, intent, offer, position: p, now, payout }: ClientDocCtx) {
  const f = fundOf(offer);
  const redemption = intent.type === "rachat";
  const nav = intent.executedPrice ?? f.nav;
  return (
    <Letter heading={`Avis d'opération · ${number}`}>
      <Text style={s.h1}>Avis d&apos;opération sur parts d&apos;OPCVM</Text>
      <Text style={s.ref}>
        {number} · émis le {fmtDateTime(now.toISOString())} · {redemption ? "rachat" : "souscription"} exécuté(e) à la VL de {fmt(nav)} FCFA
      </Text>
      <Addr blocks={[["Porteur", [intent.clientName, intent.clientSegment]], ["Fonds", [offer.title, `Société de gestion : ${prettyName(f.manager)} · dépositaire : ${prettyName(f.depositary)}`, `Distributeur : ${COMPANY.legalName}`]]]} />
      <Table
        cols={[{ label: "Fonds", flex: 2.6 }, { label: "Nature", flex: 1.2 }, { label: "Parts", right: true }, { label: "VL retenue", right: true }, { label: "Brut", flex: 1.2, right: true }, { label: redemption ? "Droits de sortie" : "Droits d'entrée", flex: 1.1, right: true }, { label: "Net", flex: 1.2, right: true }]}
        rows={[[offer.title, redemption ? "Rachat" : "Souscription", units3(p.units), fmt(nav), fmt(p.principal), fmt(p.commission), fmt(Math.abs(p.total))]]}
      />
      <Text style={s.p}>
        {redemption ? `Les parts rachetées sont retirées de votre compte au registre du dépositaire ; le produit net est viré sur votre compte de règlement (${payoutLine(payout)}).` : "Les parts sont inscrites à votre nom au registre tenu par le dépositaire du fonds."} Cet avis reprend la confirmation de la société de gestion et tient lieu de confirmation d&apos;exécution ; votre relevé de position est disponible dans votre espace Guichet.
      </Text>
    </Letter>
  );
}

/* ---------------- Bordereau de centralisation (SGO) ---------------- */
export interface FundBordereauCtx {
  number: string;
  manager: string;
  now: Date;
  lines: { offer: Offer; intents: { intent: Intent; position: Position }[] }[];
  /** clientId → register / account reference at the depositary, when known. */
  accounts?: Map<string, string | undefined>;
  /** clientId → bank + RIB where redemption proceeds are paid. */
  payouts?: Map<string, string | undefined>;
  texts?: Record<string, string>;
}

export function BordereauSgo({ number, manager, now, lines, accounts, payouts, texts }: FundBordereauCtx) {
  const subs = lines.flatMap((l) => l.intents.filter((x) => x.intent.type === "souscription").map((x) => ({ ...x, offer: l.offer })));
  const reds = lines.flatMap((l) => l.intents.filter((x) => x.intent.type === "rachat").map((x) => ({ ...x, offer: l.offer })));
  const cash = subs.reduce((a, x) => a + (x.intent.amount ?? 0), 0);
  return (
    <Letter heading={`Bordereau de centralisation · ${number}`}>
      <Text style={s.h1}>Ordres de souscription et de rachat pour compte de tiers</Text>
      <Text style={s.ref}>
        {number} · généré le {fmtDateTime(now.toISOString())} · {subs.length} souscription{subs.length > 1 ? "s" : ""} · {reds.length} rachat{reds.length > 1 ? "s" : ""}
      </Text>
      <Addr blocks={[["À l'attention de", [prettyName(manager), "Service centralisation / registre des porteurs"]], ["Distributeur", [COMPANY.legalName, COMPANY.licence, COMPANY.email]]]} />
      <Table
        cols={[{ label: "Fonds", flex: 2.2 }, { label: "Nature", flex: 1.1 }, { label: "Porteur", flex: 2 }, { label: "Registre", flex: 1.3, mono: true }, { label: "Montant (FCFA)", flex: 1.3, right: true }, { label: "Parts", flex: 1, right: true }, { label: "Réf.", flex: 1.4, mono: true }]}
        rows={[
          ...subs.map((x) => [x.offer.title, "Souscription", x.intent.clientName, (x.intent.clientId && accounts?.get(x.intent.clientId)) || "à créer", fmt(x.intent.amount ?? 0), "à la VL", x.intent.ref]),
          ...reds.map((x) => [x.offer.title, "Rachat", x.intent.clientName, (x.intent.clientId && accounts?.get(x.intent.clientId)) || "—", "à la VL", units3(x.position.units), x.intent.ref]),
        ]}
        total={["Espèces de souscription réglées par Purpose Capital", "", "", "", `${fmt(cash)} FCFA`, "", ""]}
      />
      {reds.length > 0 && (
        <>
          <Text style={[s.p, s.b]}>Comptes de règlement des porteurs pour les rachats</Text>
          <Table
            cols={[{ label: "Porteur", flex: 2 }, { label: "Réf.", flex: 1, mono: true }, { label: "Banque · RIB / IBAN (au nom du porteur)", flex: 3.5, mono: true }]}
            rows={reds.map((x) => [x.intent.clientName, x.intent.ref, (x.intent.clientId && payouts?.get(x.intent.clientId)) || "RIB à communiquer"])}
          />
        </>
      )}
      <Text style={s.p}>{passage("bordereau", "execution_opcvm", texts, { gestion: manager })}</Text>
      <Sig left={`Pour ${COMPANY.legalName} : le Directeur Général, signature et cachet`} right={`Réception ${prettyName(manager)} : date, heure, visa`} />
    </Letter>
  );
}
