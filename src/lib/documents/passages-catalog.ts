import type { DocumentType, PassageSensitivity } from "@/lib/domain/types";

/**
 * The passages of the document models the desk may reword: each one has a
 * key, a default text (the one the code shipped with), the placeholders it
 * may use, the ones it must keep, and a sensitivity that says how a new
 * version becomes current (at once, after a second reader, after a
 * responsable). Layout, figures, references and signatures stay in the
 * templates: the desk changes what is said, never what is computed.
 */
export interface PassageDef {
  key: string;
  label: string;
  hint: string;
  sensitivity: PassageSensitivity;
  placeholders: string[];
  required?: string[];
  fr: string;
  en: string;
}

export const PLACEHOLDER_LABEL: Record<string, string> = {
  societe: "dénomination de Purpose Capital",
  agrement: "agrément COSUMAF",
  email: "adresse e-mail de la société",
  marche: "nom du marché (BVMAC)",
  prix: "prix ou cours de référence",
  prix_limite: "« au prix limite de … » ou « au prix du marché »",
  date_adjudication: "date de l'adjudication",
  date_reglement: "date de règlement",
  delai: "délai de règlement (T+n)",
  compte: "compte de règlement du client",
  categorie: "catégorie du titulaire (professionnel ou non)",
  conseiller: "nom du conseiller",
  rendement: "rendement actuariel servi",
  livraison: "phrase de livraison (titres inscrits, ou produit viré sur le compte)",
};

const P = (key: string, label: string, hint: string, sensitivity: PassageSensitivity, placeholders: string[], fr: string, en: string, required: string[] = []): PassageDef => ({ key, label, hint, sensitivity, placeholders, required, fr, en });

export const PASSAGES: Partial<Record<DocumentType, PassageDef[]>> = {
  bulletin: [
    P("ordre_primaire", "Demande d'ordre (marché primaire)", "la phrase qui dit ce que le client demande, sur une adjudication", "reglementaire", ["societe", "date_adjudication"], "Le donneur d'ordre demande à {societe} de présenter cet ordre à l'adjudication du {date_adjudication}, au prix ci-dessus.", "The principal asks {societe} to present this order at the auction of {date_adjudication}, at the price above.", ["societe", "date_adjudication"]),
    P("ordre_marche", "Demande d'ordre (marché secondaire)", "la phrase qui dit ce que le client demande, sur une ligne cotée", "reglementaire", ["societe", "marche", "prix_limite"], "Le donneur d'ordre demande à {societe} de présenter cet ordre sur {marche} {prix_limite}, valable jusqu'à révocation ou exécution. Exécution totale ou partielle selon la contrepartie disponible ; les montants ci-dessus sont estimés au cours de référence et sont arrêtés à l'exécution.", "The principal asks {societe} to present this order on {marche} {prix_limite}, valid until revoked or executed. Full or partial execution depending on the counterparty available; the amounts above are estimated at the reference price and fixed at execution.", ["societe", "marche"]),
    P("irrevocable", "Irrévocabilité et allocation", "ce qui se passe une fois l'ordre transmis", "reglementaire", [], "L'ordre est irrévocable dès sa transmission au SVT. En cas d'allocation partielle, les montants sont ajustés au prorata ; en cas de non-allocation, les fonds sont restitués sous deux jours ouvrés, sans frais.", "The order is irrevocable once transmitted to the primary dealer. In case of partial allocation the amounts are adjusted pro rata; in case of non-allocation the funds are returned within two business days, free of charge."),
    P("signature_client", "Ligne de signature du client", "sous la case de gauche", "libre", [], "Le donneur d'ordre : « lu et approuvé », date et signature", "The principal: “read and approved”, date and signature"),
    P("signature_societe", "Ligne de signature de la société", "sous la case de droite", "libre", ["societe", "conseiller"], "{societe} : confirmation du conseiller{conseiller}", "{societe}: adviser's confirmation{conseiller}", ["societe"]),
  ],
  fonds: [
    P("provenance", "Provenance et disponibilité des fonds", "le paragraphe sous le RIB", "reglementaire", [], "Les fonds doivent provenir d'un compte au nom du donneur d'ordre et être disponibles la veille du règlement. À défaut, l'ordre n'est pas présenté et le client en est informé. En cas de non-allocation totale ou partielle, l'excédent est restitué sous deux jours ouvrés sur le compte d'origine.", "Funds must come from an account in the principal's name and be available the day before settlement. Otherwise the order is not presented and the client is informed. In case of total or partial non-allocation the excess is returned within two business days to the originating account."),
    P("segregation", "Compte de règlement ségrégué", "la ligne en petit au pied", "reglementaire", ["societe"], "Le compte de règlement clients est ségrégué des fonds propres de {societe} et ne sert qu'au règlement-livraison des opérations de la clientèle.", "The client settlement account is segregated from {societe}'s own funds and serves only the settlement of client operations.", ["societe"]),
  ],
  cession: [
    P("attestation", "Attestation du cédant", "coupon couru, titres libres, produit de cession", "reglementaire", ["date_reglement", "compte"], "Le coupon couru est réglé par l'émetteur selon les modalités du rachat. Le cédant atteste détenir les titres libres de tout nantissement et autorise leur livraison contre paiement, valeur {date_reglement}. Produit de cession crédité sous un jour ouvré après règlement sur le compte de règlement du cédant : {compte}.", "The accrued coupon is paid by the issuer under the buyback terms. The seller attests holding the securities free of any pledge and authorises their delivery against payment, value {date_reglement}. Sale proceeds credited within one business day after settlement to the seller's settlement account: {compte}.", ["date_reglement"]),
    P("signature_cedant", "Ligne de signature du cédant", "sous la case de gauche", "libre", [], "Le cédant : date, signature et cachet", "The seller: date, signature and stamp"),
  ],
  allocation: [
    P("reglement", "Règlement-livraison et avis d'opéré", "le paragraphe après le résultat", "relu", ["date_reglement", "rendement"], "Le règlement-livraison intervient le {date_reglement}. Vous recevrez l'avis d'opéré dès confirmation de l'inscription des titres à votre nom. Rendement actuariel annuel brut sur la base du prix servi : {rendement}.", "Settlement takes place on {date_reglement}. You will receive the execution notice once the registration of the securities in your name is confirmed. Gross annual actuarial yield on the served price: {rendement}.", ["date_reglement", "rendement"]),
  ],
  opere: [
    P("confirmation", "Valeur, livraison, confirmation", "le paragraphe de fin", "relu", ["date_reglement", "livraison"], "Date de valeur : {date_reglement}. {livraison} Cet avis tient lieu de confirmation d'exécution ; votre relevé de position est disponible dans votre espace Guichet.", "Value date: {date_reglement}. {livraison} This notice serves as confirmation of execution; your position statement is available in your Guichet space.", ["date_reglement", "livraison"]),
  ],
  releve: [
    P("valeurs", "Valeurs indicatives et réclamations", "la note au pied du relevé", "reglementaire", ["societe"], "Valeurs indicatives : dernier cours de clôture publié par la BVMAC ou dernière valeur liquidative publiée par la société de gestion ; lignes du marché primaire non cotées valorisées au nominal. Ce relevé reflète les ordres réglés enregistrés par {societe}. Les coupons et remboursements sont payés par l'émetteur aux dates indiquées, sur le compte de règlement du titulaire. Toute réclamation dans les trente jours.", "Indicative values: last closing price published by the BVMAC or last net asset value published by the management company; unlisted primary-market lines valued at nominal. This statement reflects the settled orders recorded by {societe}. Coupons and redemptions are paid by the issuer on the dates shown, to the holder's settlement account. Any claim within thirty days.", ["societe"]),
    P("vide", "Relevé sans position", "quand le client ne détient rien", "libre", [], "Aucune position en portefeuille à cette date.", "No position in the portfolio at this date."),
  ],
  attestation: [
    P("valoir", "Portée de l'attestation", "la phrase de fin", "reglementaire", [], "La présente attestation est délivrée à la demande du titulaire pour servir et valoir ce que de droit. Elle ne vaut ni évaluation ni engagement de rachat.", "This certificate is issued at the holder's request for all legal purposes. It is neither a valuation nor a buyback commitment."),
  ],
  convention: [
    P("art_objet", "Article 1 · Objet", "", "reglementaire", ["societe", "agrement"], "{societe} (« l'Intermédiaire »), {agrement}, ouvre au Titulaire un compte-titres destiné à recevoir les instruments financiers acquis par son intermédiaire sur le marché monétaire de la CEMAC (bons et obligations du Trésor), à la BVMAC (actions, obligations, parts d'OPCVM) et sur toute opération d'appel public à l'épargne qu'il présente.", "{societe} (“the Intermediary”), {agrement}, opens for the Holder a securities account meant to receive the financial instruments acquired through it on the CEMAC money market (Treasury bills and bonds), on the BVMAC (shares, bonds, fund units) and in any public offering it presents.", ["societe", "agrement"]),
    P("art_conservation", "Article 2 · Conservation", "", "reglementaire", [], "Les titres sont dématérialisés et inscrits au nom du Titulaire sur un sous-compte nominatif ouvert à son nom, sous le regroupement de l'Intermédiaire, dans les livres du dépositaire désigné (établissement agréé Spécialiste en Valeurs du Trésor pour les titres publics ; dépositaire central pour les titres cotés). L'Intermédiaire n'a pas la garde des espèces du Titulaire.", "The securities are dematerialised and registered in the Holder's name in a nominative sub-account opened in their name, under the Intermediary's grouping, in the books of the designated custodian (an institution licensed as Primary Dealer for public securities; the central depository for listed securities). The Intermediary does not hold the Holder's cash."),
    P("art_especes", "Article 3 · Espèces", "", "reglementaire", [], "Les espèces nécessaires aux opérations transitent par un compte de règlement ségrégué des fonds propres de l'Intermédiaire. Les fonds doivent provenir d'un compte bancaire ouvert au nom du Titulaire ; tout versement d'un tiers est refusé et restitué.", "The cash needed for operations passes through a settlement account segregated from the Intermediary's own funds. Funds must come from a bank account in the Holder's name; any payment from a third party is refused and returned."),
    P("art_ordres", "Article 4 · Ordres", "", "reglementaire", [], "Une intention transmise par le Guichet, WhatsApp ou tout autre canal n'est pas un ordre. Un ordre naît de la confirmation par l'Intermédiaire et de l'acceptation d'un bulletin d'ordre par le Titulaire. L'ordre est irrévocable dès sa transmission au SVT ou au marché ; il est exécuté aux conditions de l'adjudication ou du marché, totalement ou partiellement, ou non exécuté, sans que la responsabilité de l'Intermédiaire soit engagée.", "An intention sent through Guichet, WhatsApp or any other channel is not an order. An order arises from the Intermediary's confirmation and the Holder's acceptance of an order form. The order is irrevocable once transmitted to the primary dealer or the market; it is executed under the conditions of the auction or the market, fully or partly, or not executed, without the Intermediary's liability being engaged."),
    P("art_information", "Article 5 · Information et catégorisation", "", "reglementaire", ["categorie"], "Le Titulaire est catégorisé « {categorie} ». Il reconnaît avoir reçu l'information sur les risques (crédit, prix, liquidité, allocation) et sur le fonctionnement du marché, et pouvoir la consulter à tout moment dans le Guide du Guichet.", "The Holder is categorised as “{categorie}”. They acknowledge having received information on the risks (credit, price, liquidity, allocation) and on how the market works, and being able to consult it at any time in the Guichet Guide.", ["categorie"]),
    P("art_tarifs", "Article 6 · Tarifs", "", "reglementaire", [], "Les conditions tarifaires applicables sont celles de l'annexe tarifaire remise par le conseiller ; aucun frais d'ouverture. Toute modification tarifaire est notifiée trente jours avant application.", "The applicable fees are those of the fee schedule handed over by the adviser; no opening fee. Any change of fees is notified thirty days before it applies."),
    P("art_communications", "Article 7 · Communications", "", "reglementaire", [], "Le Titulaire accepte de recevoir avis, relevés et documents par voie électronique (espace Guichet, e-mail, WhatsApp s'il y a consenti). Il peut retirer son consentement WhatsApp à tout moment (mot-clé STOP).", "The Holder agrees to receive notices, statements and documents electronically (Guichet space, e-mail, WhatsApp if consented). They may withdraw their WhatsApp consent at any time (keyword STOP)."),
    P("art_donnees", "Article 8 · Données personnelles et LBC/FT", "", "reglementaire", [], "Les données et pièces recueillies servent à l'identification du Titulaire, à la tenue du compte et aux obligations réglementaires. Elles sont conservées dix ans après la fin de la relation. L'Intermédiaire peut demander toute pièce complémentaire et suspendre le compte en cas de doute sur l'origine des fonds.", "The data and documents collected serve the Holder's identification, the keeping of the account and regulatory duties. They are kept for ten years after the relationship ends. The Intermediary may request any further document and suspend the account in case of doubt about the origin of funds."),
    P("art_procurations", "Article 9 · Procurations et succession", "", "reglementaire", [], "Le Titulaire peut désigner un mandataire par acte écrit. En cas de décès, la position est conservée jusqu'à instruction des ayants droit dûment justifiés.", "The Holder may appoint a representative by written deed. In case of death, the position is kept until instructed by the duly evidenced heirs."),
    P("art_reclamations", "Article 10 · Réclamations, durée, résiliation", "", "reglementaire", ["email"], "Réclamations à {email} ; à défaut de réponse satisfaisante, médiation de la COSUMAF. La convention est conclue pour une durée indéterminée ; chaque partie peut la résilier moyennant un préavis de trente jours, les opérations en cours étant menées à leur terme.", "Complaints to {email}; failing a satisfactory answer, COSUMAF mediation. The agreement is concluded for an indefinite term; each party may terminate it with thirty days' notice, ongoing operations being completed.", ["email"]),
  ],
};

export const SENSITIVITY_LABEL: Record<PassageSensitivity, string> = { libre: "libre : en vigueur dès l'enregistrement", relu: "relu : en vigueur quand un autre membre du desk l'a relu", reglementaire: "réglementaire : en vigueur quand un responsable l'a approuvé" };

/** Placeholders written in a text: {societe}, {date_reglement}… */
export const placeholdersIn = (text: string): string[] => [...new Set([...text.matchAll(/\{([a-z_]+)\}/g)].map((m) => m[1]))];

/** Replaces the placeholders; an unknown one stays visible so a wrong template shows rather than hides. */
export function fill(text: string, vars: Record<string, string | undefined>): string {
  return text.replace(/\{([a-z_]+)\}/g, (m, k: string) => (vars[k] !== undefined ? vars[k]! : m));
}

/** What is wrong with a proposed text for a passage, or nothing. */
export function checkPassage(def: PassageDef, fr: string, en: string): string | undefined {
  if (!fr.trim()) return "Le texte français est vide.";
  if (!en.trim()) return "Le texte anglais est vide : les deux langues s'enregistrent ensemble.";
  for (const t of [fr, en]) {
    const used = placeholdersIn(t);
    const unknown = used.filter((k) => !def.placeholders.includes(k));
    if (unknown.length) return `Champ inconnu : {${unknown[0]}}. Ce passage connaît : ${def.placeholders.map((k) => `{${k}}`).join(", ") || "aucun champ"}.`;
    const missing = (def.required ?? []).filter((k) => !used.includes(k));
    if (missing.length) return `Le champ {${missing[0]}} doit rester dans ce passage.`;
  }
  if (/\bmeilleur|recommand|garanti/i.test(fr) || /\bbest\b|recommend|guarantee/i.test(en)) return "Un document ne conseille pas : pas de « meilleur », « recommandé », « garanti ».";
  return undefined;
}

/** In a template: the passage's text in force (from `texts`) or the code's default, filled with the document's values. */
export function passage(docType: DocumentType, key: string, texts: Record<string, string> | undefined, vars: Record<string, string | undefined> = {}): string {
  const def = (PASSAGES[docType] ?? []).find((d) => d.key === key);
  return fill(texts?.[key] ?? def?.fr ?? "", vars);
}
