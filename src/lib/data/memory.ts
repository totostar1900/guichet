import type { ActionClient } from "@/lib/domain/journal-client";
import type { FinancialProfile } from "@/data/profile";
import { SEED_CONTACTS, SEED_INTAKE, SEED_INTENTS, SEED_OFFERS } from "@/data/seed";
import { REF_AUCTIONS, REF_OFFERS, semisDense } from "@/data/reference";
import { SEED_NEWS } from "@/data/news-seed";
import { coteDEssai } from "@/data/cote-seed";
import type { NewsItem } from "@/lib/news/model";
import { createHash } from "node:crypto";
import { ConflictError, type Approval, type AuditEntry, type ChannelCode, type ChannelStatus, type ClientPrefs, type Contact, type TemplateText, type EventLog, type GeneratedDocument, type IntakeItem, type Intent, type Notification, type Offer, type OfferVersion, type PushSubscription, type ReferenceRow, type StaffMember, type TrustedDevice, type Watch, type InboundMessage, type DeskThread, type DeskExchange } from "@/lib/domain/types";
import type { CashEntry, CashPayout } from "@/lib/domain/cash";
import type { AccesCompte } from "@/lib/domain/acces-nomme";
import type { Rapprochement } from "@/lib/domain/rapprochement";
import type { Preavis } from "@/lib/domain/preavis";
import type { TourVu } from "@/lib/domain/robots";
import type { Temoignage } from "@/lib/domain/temoignage";
import type { StandingOrder } from "@/lib/domain/standing";
import type { AvisGarde } from "@/lib/domain/garde";
import { CONVENTION_VERSION } from "@/data/legal";
import { emptyClientFile, type ClientFile } from "@/lib/domain/kyc";
import type { FundNav, IssuerDocument, MarketBulletin, Quote, QuoteActivity } from "@/lib/domain/market";
import type { AuctionResult, NewAuctionResult } from "@/lib/market/auction-results";
import type { EmissionNotice, EmissionNoticePatch, NewEmissionNotice } from "@/lib/market/emission-notices";
import type { BeacCurveRow } from "./repository";
import { receivedLabel } from "@/lib/domain/intent";
import { fmt } from "@/lib/format";
import { makeMandatRef, makeOrderNo, makeRef, makeTirageRef, type Repository } from "./repository";
import type { MandatPrelevement } from "@/lib/domain/mandat";
import type { VirementRecu } from "@/lib/domain/virement";
import type { RemiseDePrelevement, Tirage } from "@/lib/domain/prelevement";
import { fundCurveFrom, type FundCurve } from "@/lib/domain/fund-curve";
import { cleDEchange } from "@/lib/domain/echange";

/** A few inbound messages so the desk inbox has something to answer in demo mode. */
function seedInbound(): InboundMessage[] {
  const ago = (min: number) => new Date(Date.now() - min * 60e3).toISOString();
  return [
    { id: "in-1", channel: "whatsapp", from: "+237600000017", name: "J.-P. O.", body: "Bonjour, ma prise ferme de 10 M sur l'OTA 6,25 % est bien enregistrée ? Je peux régler le 16 au plus tôt.", receivedAt: ago(35) },
    { id: "in-2", channel: "whatsapp", from: "+237600000012", name: "Tontine Espoir", body: "Est-ce que le groupement peut aller jusqu'à 30 M sur la ligne de septembre ?", receivedAt: ago(140) },
    { id: "in-3", channel: "email", from: "tresorerie@avc.example.com", name: "Assur-Vie Centrale", subject: "Appétit 200 M : OTA 6,50 %", body: "Bonjour,\nMerci de nous confirmer le prix retenu et la date de règlement pour notre appétit de 200 M FCFA.\nCordialement,\nLa trésorerie", receivedAt: ago(400), handledAt: ago(300), handledBy: "Georges" },
  ];
}

/** Two example files so the desk's client review is not empty in demo mode: one submitted, one approved. */
/**
 * UN MANDAT SIGNÉ DANS LE JEU D'ESSAI, et pourquoi son jour suit l'horloge.
 *
 * Sans lui, /desk/prelevements est une page vide qu'on ne peut ni montrer ni
 * vérifier : l'échéance du jour n'existe que s'il y a un mandat qui tombe ce
 * jour-là, et un jour écrit en dur ne tomberait qu'une fois par mois. Le jour
 * est donc celui d'aujourd'hui, borné à 28 comme tous les mandats.
 */
function seedMandats(): MandatPrelevement[] {
  const now = new Date();
  const iso = now.toISOString();
  return [
    {
      id: "mp-seed-jpo",
      ref: "MP-2610-DEMO",
      userId: "c-jpo",
      objet: "provision",
      bankName: "Afriland First Bank",
      bankAccount: "CM21 10005 00001 12345678901 23",
      accountHolder: "Jean-Paul Onana",
      maxAmount: 100_000,
      dayOfMonth: Math.min(28, now.getDate()),
      amount: 50_000,
      state: "actif",
      signedAt: iso,
      signedMethod: "code à usage unique",
      pendingCodeTries: 0,
      rejects: 0,
      createdAt: iso,
      updatedAt: iso,
    },
  ];
}

/**
 * LE CLIENT DE DÉMONSTRATION A UN DOSSIER, ET IL EST APPROUVÉ.
 *
 * Sans lui, la moitié de l'application est inatteignable en local : un ordre
 * ne se signe pas, une provision ne s'alimente pas, un mandat ne se signe
 * pas. Deux fonctionnalités livrées le 9 octobre 2026 n'ont pas pu être
 * jouées à l'écran pour cette seule raison, et une fonctionnalité qu'on ne
 * peut pas essayer est une fonctionnalité qu'on livre sur la foi des tests.
 *
 * IL SE CRÉE À LA PREMIÈRE LECTURE, et non dans le semis, parce que
 * l'identifiant dépend du nom tapé à l'écran de connexion
 * (« dev-client-<nom> ») : un dossier écrit d'avance ne vaudrait que pour un
 * seul nom. Il entre ensuite dans le magasin, donc le desk le voit comme les
 * autres.
 *
 * LE PRÉFIXE EST LA GARDE. Seul `devLogin` fabrique des identifiants qui
 * commencent par « dev-client- » ; une session Supabase porte un UUID. Ce
 * dossier ne peut donc pas naître en production.
 */
function dossierDeDemonstration(userId: string): ClientFile | undefined {
  if (!userId.startsWith("dev-client-")) return undefined;
  const nom =
    userId
      .slice("dev-client-".length)
      .split("-")
      .filter(Boolean)
      .map((m) => m.charAt(0).toUpperCase() + m.slice(1))
      .join(" ") || "Client de démonstration";
  const now = nowIso();
  const row: ClientFile = {
    ...emptyClientFile(userId, "physique", nom, { phone: "+237600000099", email: "demo@example.cm" }),
    id: `kyc-${userId}`,
    status: "approuve",
    identity: { name: nom, phone: "+237600000099", email: "demo@example.cm", country: "Cameroun", city: "Yaoundé", birthDate: "1986-05-04", nationality: "Camerounaise", profession: "Cadre", idType: "CNI", idNumber: "987654321", idExpiresOn: "2030-01-31", address: "Bastos, Yaoundé" },
    funds: { pep: false, source: "Salaire", expectedAmount: "10 à 50 M FCFA", bankName: "Afriland First Bank", bankAccount: "CM21 10005 00001 98765432109 87", bankHolder: nom },
    profile: { category: "non_professionnel", objectives: "Épargne à moyen terme", horizon: "3 à 5 ans", experience: "Quelques placements", riskTolerance: "moyenne", lossCapacity: "moins de 20 %" },
    /* La convention porte la VERSION EN VIGUEUR : semée avec une version
       ancienne, elle enverrait le client de démonstration signer une reprise
       à chaque connexion, et on croirait à un défaut. */
    consents: { dataAt: now, whatsappAt: now, conventionAt: now, conventionMethod: "code à usage unique", conventionVersion: CONVENTION_VERSION },
    /* Le sous-compte est ce qui fait passer le palier à 2, donc ce qui rend
       un ordre sur TITRE signable. Sans lui, seules les parts d'OPCVM se
       signent, et la moitié des écrans reste hors d'atteinte. */
    review: { custodianAccount: "CT-DEMO-0001", reviewedBy: "Georges", reviewedAt: now },
    createdAt: now,
    updatedAt: now,
  };
  store().clientFiles.push(row);
  return row;
}

function seedClientFiles(): ClientFile[] {
  const day = (d: number) => new Date(Date.now() - d * 86400e3).toISOString();
  const jpo = emptyClientFile("c-jpo", "physique", "J.-P. Onana", { phone: "+237600000017", email: "jp.onana@example.cm" });
  const am = emptyClientFile("c-am", "physique", "A. M.", { phone: "+237600000011", email: "a.m@example.com" });
  const tontine = emptyClientFile("c-tontine", "groupement", "Tontine Essos Solidarité", { phone: "+237600000055", email: "tontine.essos@example.cm" });
  return [
    {
      ...jpo,
      id: "kyc-jpo",
      status: "soumis",
      identity: { ...jpo.identity, city: "Yaoundé", birthDate: "1984-03-12", nationality: "Camerounaise", profession: "Ingénieur", idType: "CNI", idNumber: "123456789", idExpiresOn: "2029-06-30", address: "Bastos, Yaoundé" },
      documents: [
        { kind: "piece_identite_recto", fileKey: "demo/jpo-cni-recto.jpg", fileName: "cni-recto.jpg", mimeType: "image/jpeg", uploadedAt: day(2) },
        { kind: "piece_identite_verso", fileKey: "demo/jpo-cni-verso.jpg", fileName: "cni-verso.jpg", mimeType: "image/jpeg", uploadedAt: day(2) },
        { kind: "selfie", fileKey: "demo/jpo-selfie.jpg", fileName: "selfie.jpg", mimeType: "image/jpeg", uploadedAt: day(2) },
      ],
      funds: { pep: false, source: "Salaire", expectedAmount: "10 à 50 M FCFA", bankName: "Afriland First Bank", bankAccount: "CM21 10005 00001 12345678901 23", bankHolder: "Jean-Paul Onana" },
      profile: { category: "non_professionnel", objectives: "Épargne à moyen terme", horizon: "3 à 5 ans", experience: "Quelques placements", riskTolerance: "faible", lossCapacity: "moins de 10 %" },
      // Dossier soumis, pas encore approuvé : la convention ne se signe qu'après la décision, elle n'est donc pas là.
      consents: { dataAt: day(2), whatsappAt: day(2) },
      submittedAt: day(2),
      createdAt: day(3),
      updatedAt: day(2),
    },
    {
      ...am,
      id: "kyc-am",
      status: "approuve",
      identity: { ...am.identity, city: "Douala", birthDate: "1979-11-02", nationality: "Camerounaise", profession: "Commerçante", idType: "Passeport", idNumber: "P0456789", idExpiresOn: "2030-01-15", taxId: "M017900001234A" },
      documents: [
        { kind: "piece_identite_recto", fileKey: "demo/am-passeport.jpg", fileName: "passeport.jpg", mimeType: "image/jpeg", uploadedAt: day(40), verified: true },
        { kind: "selfie", fileKey: "demo/am-selfie.jpg", fileName: "selfie.jpg", mimeType: "image/jpeg", uploadedAt: day(40), verified: true },
        { kind: "justificatif_domicile", fileKey: "demo/am-domicile.pdf", fileName: "facture-eneo.pdf", mimeType: "application/pdf", uploadedAt: day(40), verified: true },
      ],
      funds: { pep: false, source: "Revenus d'activité", expectedAmount: "50 à 100 M FCFA", bankName: "SGC", bankAccount: "CM21 10003 00002 98765432109 87", bankHolder: "A. M." },
      profile: { category: "non_professionnel", objectives: "Revenus réguliers", horizon: "plus de 5 ans", experience: "Habituée des OTA", riskTolerance: "moyenne", lossCapacity: "10 à 20 %" },
      consents: { dataAt: day(41), whatsappAt: day(41), conventionAt: day(40), conventionMethod: "code WhatsApp" },
      review: { risk: "faible", notes: "Dossier complet, pièces vérifiées.", reviewedBy: "Georges", reviewedAt: day(38), nextReviewOn: new Date(Date.now() + 5 * 365 * 86400e3).toISOString().slice(0, 10), custodianAccount: "ECB-CT-2026-00087" },
      screening: { attestedBy: "Georges", attestedAt: day(38), lists: "ONU, UE, OFAC ; PPE : recherche presse", outcome: "aucun" },
      submittedAt: day(40),
      createdAt: day(41),
      updatedAt: day(38),
    },
    /* UN COMPTE À PLUSIEURS MAINS, parce que le jeu d'essai n'en avait aucun.
       Une tontine en indivision : deux cotitulaires désignés par l'assemblée,
       une règle de décision, et un compte approuvé. Sans lui, l'accès nommé
       ne peut pas s'exercer en local, et on ne voit pas ce qu'on construit. */
    {
      ...tontine,
      id: "kyc-tontine",
      status: "approuve",
      identity: {
        ...tontine.identity,
        city: "Yaoundé",
        country: "Cameroun",
        legalForm: "indivision de mandataires",
        decisionRule: "Double signature au-delà de 5 M FCFA par ordre",
        plafondParOrdre: 5_000_000,
      },
      persons: [
        { role: "cotitulaire", name: "Esther Mballa", birthDate: "1981-07-19", idNumber: "551234987" },
        { role: "cotitulaire", name: "Pascal Nkodo", birthDate: "1976-02-04", idNumber: "448877213" },
      ],
      documents: [
        { kind: "recepisse", fileKey: "demo/tontine-recepisse.pdf", fileName: "recepisse.pdf", mimeType: "application/pdf", uploadedAt: day(30), verified: true },
        { kind: "pv_mandataires", fileKey: "demo/tontine-pv.pdf", fileName: "pv-assemblee.pdf", mimeType: "application/pdf", uploadedAt: day(30), verified: true },
        { kind: "piece_identite_recto", fileKey: "demo/tontine-cni.jpg", fileName: "cni-mballa.jpg", mimeType: "image/jpeg", uploadedAt: day(30), verified: true },
        { kind: "rib", fileKey: "demo/tontine-rib.pdf", fileName: "rib.pdf", mimeType: "application/pdf", uploadedAt: day(30), verified: true },
        { kind: "liste_membres", fileKey: "demo/tontine-membres.pdf", fileName: "membres.pdf", mimeType: "application/pdf", uploadedAt: day(30), verified: true },
      ],
      funds: { pep: false, source: "Cotisations des membres", expectedAmount: "10 à 50 M FCFA", bankName: "Afriland First Bank", bankAccount: "CM21 10005 00009 55512345678 01", bankHolder: "Tontine Essos Solidarité" },
      profile: { category: "non_professionnel", objectives: "Faire fructifier la caisse", horizon: "3 à 5 ans", experience: "Première opération de marché", riskTolerance: "faible", lossCapacity: "moins de 10 %" },
      consents: { dataAt: day(31), whatsappAt: day(31), conventionAt: day(29), conventionMethod: "code WhatsApp" },
      review: { risk: "moyen", notes: "PV de l'assemblée vérifié, deux cotitulaires désignés.", reviewedBy: "Georges", reviewedAt: day(28), nextReviewOn: new Date(Date.now() + 3 * 365 * 86400e3).toISOString().slice(0, 10), custodianAccount: "ECB-CT-2026-00091" },
      screening: { attestedBy: "Georges", attestedAt: day(28), lists: "ONU, UE, OFAC ; PPE : recherche presse", outcome: "aucun" },
      submittedAt: day(30),
      createdAt: day(31),
      updatedAt: day(28),
    },
  ] as ClientFile[];
}

/**
 * In-memory repository backed by the seed. Survives hot reloads via globalThis
 * so the desk sees what the client submitted during a dev session.
 * Not for production : data resets on restart.
 */
interface Store {
  offers: Offer[];
  intents: Intent[];
  events: EventLog[];
  intake: IntakeItem[];
  documents: GeneratedDocument[];
  contacts: Contact[];
  channels: Map<string, ChannelStatus>;
  consents: Map<string, { version: string; at: string }>;
  profiles: Map<string, FinancialProfile>;
  /** Le conseiller rattaché, par client. */
  advisors: Map<string, string>;
  prefs: Map<string, ClientPrefs>;
  templateTexts: TemplateText[];
  codes: ChannelCode[];
  devices: TrustedDevice[];
  notifications: Notification[];
  inbound: InboundMessage[];
  deskThreads: DeskThread[];
  deskExchanges: DeskExchange[];
  watches: Watch[];
  cash: CashEntry[];
  mandats: MandatPrelevement[];
  virements: VirementRecu[];
  remises: RemiseDePrelevement[];
  tirages: Tirage[];
  payouts: CashPayout[];
  rapprochements: Rapprochement[];
  temoignages: Temoignage[];
  preavis: Preavis[];
  tours: (TourVu & { id: string })[];
  standing: StandingOrder[];
  /** Les avis de droits de garde emis : ils ne se recalculent pas, ils se gardent. */
  avisGarde: AvisGarde[];
  reference: ReferenceRow[];
  staff: StaffMember[];
  versions: OfferVersion[];
  audit: AuditEntry[];
  /** Les gestes des clients ; la clef du jour reste en memoire pour refuser un doublon. */
  gestes: (ActionClient & { clefDuJour?: string })[];
  /** Ce qui reste des gestes purges : un compteur par client, mois et famille. */
  gestesMensuel: Record<string, number>;
  approvals: Approval[];
  push: PushSubscription[];
  clientFiles: ClientFile[];
  /** Qui agit sur le compte d une personne morale, d une association ou d une indivision. */
  acces: AccesCompte[];
  bulletins: MarketBulletin[];
  quotes: Quote[];
  fundNavs: FundNav[];
  issuerDocs: IssuerDocument[];
  auctionResults: AuctionResult[];
  /** Les avis d annonce : les modalites de l emprunt, que le communique de resultats ne porte pas. */
  emissionNotices: EmissionNotice[];
  beacCurves: BeacCurveRow[];
  news: NewsItem[];
  seq: number;
}

const g = globalThis as unknown as { __guichetStore?: Store };

function store(): Store {
  if (!g.__guichetStore) {
    g.__guichetStore = {
      /**
       * Les lignes de la production S'AJOUTENT au jeu de démonstration, elles
       * ne le remplacent pas.
       *
       * Les remplacer a vidé le portefeuille du client de démonstration d'un
       * coup : ses intentions citent les identifiants du jeu de départ, et sans
       * les lignes correspondantes elles ne se rattachent plus à rien.
       * L'environnement d'essai montrait alors cent une lignes au catalogue et
       * un portefeuille vide, ce qui est exactement l'écran qu'on ne voulait
       * pas juger. Le jeu de démonstration passe donc en premier et garde la
       * main sur les identifiants qu'il porte.
       */
      offers: structuredClone(REF_OFFERS.length ? [...SEED_OFFERS, ...REF_OFFERS.filter((o) => !SEED_OFFERS.some((s) => s.id === o.id))] : SEED_OFFERS),
      intents: structuredClone(SEED_INTENTS),
      events: [
        { id: "e1", at: "2026-09-14T09:18:00", kind: "intent", html: "<b>Prise ferme</b> reçue de J.-P. O. sur OTA 6,25 % · 16 sept. 2028 · 10 000 000 FCFA · réf. PF-0914-017" },
        { id: "e2", at: "2026-09-14T09:05:00", kind: "desk", html: "Desk : prix publiés sur les trois lignes RCA (94 / 93 / 92 %) : clients notifiés" },
        { id: "e3", at: "2026-09-14T09:02:00", kind: "intent", html: "<b>Cession</b> reçue de Groupe Mbaïki SARL sur Rachat OTA 3 ans · 300 titres · réf. CS-0914-016" },
        { id: "e4", at: "2026-09-14T08:41:00", kind: "intent", html: "<b>Appétit</b> reçu d'Assur-Vie Centrale sur OTA 6,50 % · 12 août 2029 · 200 000 000 FCFA · réf. AP-0914-014" },
      ],
      intake: structuredClone(SEED_INTAKE),
      documents: [],
      contacts: structuredClone(SEED_CONTACTS),
      channels: new Map(),
      consents: new Map(),
      profiles: new Map(),
      advisors: new Map(),
      prefs: new Map(),
      templateTexts: [],
      codes: [],
      devices: [],
      notifications: [],
      inbound: seedInbound(),
      deskThreads: [],
      deskExchanges: [],
      watches: [],
      cash: [],
      mandats: seedMandats(),
      virements: [],
      remises: [],
      tirages: [],
      payouts: [],
      acces: [],
      rapprochements: [],
      temoignages: [],
      preavis: [],
      tours: [],
      reference: [],
      news: structuredClone(SEED_NEWS),
      versions: [],
      audit: [],
      gestes: [],
      gestesMensuel: {},
      approvals: [],
      push: [],
      staff: [
        { id: "desk-georges", name: "Georges", email: "georges@purposecapital.africa", role: "responsable", mfaEnrolledAt: "2026-09-01T08:00:00Z" },
        { id: "desk-aline", name: "Aline", email: "aline@purposecapital.africa", role: "desk" },
      ],
      clientFiles: seedClientFiles(),
      standing: [],
      avisGarde: [],
      /* LA COTE SUIT LA MÊME RÈGLE QUE LES OFFRES : elle ne paraît que dans le
         semis dense. Le socle d'une suite de tests ne se déplace pas parce
         qu'on voulait un environnement local plus fourni, et le lecteur de
         bulletins l'a dit aussitôt : son contrôle d'écart a comparé le PDF du
         test à des cours inventés. */
      ...cote(),
      issuerDocs: [],
      auctionResults: structuredClone(REF_AUCTIONS),
      emissionNotices: [],
      beacCurves: [],
      seq: 17,
    };
  }
  // Dev hot-reload can keep an older store shape around.
  if (!g.__guichetStore.intake) g.__guichetStore.intake = structuredClone(SEED_INTAKE);
  if (!g.__guichetStore.documents) g.__guichetStore.documents = [];
  if (!g.__guichetStore.contacts) g.__guichetStore.contacts = structuredClone(SEED_CONTACTS);
  if (!g.__guichetStore.inbound) g.__guichetStore.inbound = seedInbound();
  if (!g.__guichetStore.notifications) g.__guichetStore.notifications = [];
  if (!g.__guichetStore.clientFiles) g.__guichetStore.clientFiles = seedClientFiles();
  // Un store déjà en mémoire d'une version d'avant la table : sans ce garde, toute lecture de mandats tomberait sur undefined.
  if (!g.__guichetStore.mandats) g.__guichetStore.mandats = [];
  if (!g.__guichetStore.virements) g.__guichetStore.virements = [];
  if (!g.__guichetStore.remises) g.__guichetStore.remises = [];
  if (!g.__guichetStore.tirages) g.__guichetStore.tirages = [];
  if (!g.__guichetStore.standing) g.__guichetStore.standing = [];
  if (!g.__guichetStore.staff) g.__guichetStore.staff = [{ id: "desk-georges", name: "Georges", email: "georges@purposecapital.africa", role: "responsable", mfaEnrolledAt: "2026-09-01T08:00:00Z" }];
  if (!g.__guichetStore.reference) g.__guichetStore.reference = [];
  if (!g.__guichetStore.versions) g.__guichetStore.versions = [];
  if (!g.__guichetStore.audit) g.__guichetStore.audit = [];
  if (!g.__guichetStore.gestes) g.__guichetStore.gestes = [];
  if (!g.__guichetStore.gestesMensuel) g.__guichetStore.gestesMensuel = {};
  if (!g.__guichetStore.approvals) g.__guichetStore.approvals = [];
  if (!g.__guichetStore.push) g.__guichetStore.push = [];
  /* Le rechargement à chaud peut garder un magasin d'une forme plus ancienne.
     La condition porte sur la CLEF ABSENTE, et non sur un tableau vide : une
     cote volontairement vide doit le rester. */
  if (!g.__guichetStore.bulletins || !g.__guichetStore.quotes || !g.__guichetStore.fundNavs) Object.assign(g.__guichetStore, cote());
  if (!g.__guichetStore.fundNavs) g.__guichetStore.fundNavs = [];
  if (!g.__guichetStore.issuerDocs) g.__guichetStore.issuerDocs = [];
  if (!g.__guichetStore.auctionResults) g.__guichetStore.auctionResults = [];
  if (!g.__guichetStore.emissionNotices) g.__guichetStore.emissionNotices = [];
  if (!g.__guichetStore.news) g.__guichetStore.news = structuredClone(SEED_NEWS);
  return g.__guichetStore;
}

/** La cote de démonstration, ou rien : voir « data/reference » pour la règle. */
const cote = (): { bulletins: MarketBulletin[]; quotes: Quote[]; fundNavs: FundNav[] } => {
  if (!semisDense()) return { bulletins: [], quotes: [], fundNavs: [] };
  const c = coteDEssai();
  return { bulletins: c.bulletins, quotes: c.quotes, fundNavs: c.navs };
};

const nowIso = () => new Date().toISOString();
const uid = () => Math.random().toString(36).slice(2, 10);

/** Les voisins que la règle demande, cherchés dans le magasin en mémoire. */
function cleIci(tous: InboundMessage[], m: Omit<InboundMessage, "id">): string | undefined {
  if (m.channel !== "whatsapp" && m.channel !== "email") return undefined;
  const parent = m.inReplyTo ? tous.find((x) => x.messageId === m.inReplyTo) : undefined;
  const dernier = [...tous].filter((x) => x.channel === m.channel && x.from === m.from).sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))[0];
  return cleDEchange(
    { channel: m.channel, from: m.from, subject: m.subject, receivedAt: m.receivedAt, inReplyTo: m.inReplyTo },
    { cleDuParent: parent?.convKey, dernier: dernier ? { receivedAt: dernier.receivedAt, convKey: dernier.convKey } : undefined },
  ).cle;
}

export const memoryRepository: Repository = {
  async listOffers() {
    return structuredClone(store().offers);
  },
  async getOffer(id) {
    const o = store().offers.find((x) => x.id === id);
    return o ? structuredClone(o) : undefined;
  },
  async publishOffer(id, patch) {
    const s = store();
    const i = s.offers.findIndex((x) => x.id === id);
    if (i < 0) throw new Error(`Offer ${id} not found`);
    const next: Offer = { ...s.offers[i], ...patch, status: "published", version: s.offers[i].version + 1, pricedAt: nowIso() };
    delete next.priceNote;
    delete next.rateNote;
    s.offers[i] = next;
    return structuredClone(next);
  },

  async listIntents() {
    return structuredClone(store().intents);
  },
  async createIntent(input) {
    const s = store();
    const offer = s.offers.find((x) => x.id === input.offerId);
    if (!offer) throw new Error(`Offer ${input.offerId} not found`);
    s.seq += 1;
    const at = nowIso();
    const intent: Intent = {
      id: uid(),
      ref: makeRef(input.type),
      registerNo: makeOrderNo(s.seq),
      offerId: offer.id,
      offerVersion: offer.version,
      clientName: input.clientName,
      clientSegment: input.clientSegment,
      clientId: input.clientId,
      type: input.type,
      amount: input.amount ?? null,
      limitPrice: input.limitPrice ?? null,
      channel: input.channel,
      contactPhone: input.contactPhone,
      contactEmail: input.contactEmail,
      message: input.message?.trim() || undefined,
      state: "recue",
      phoneVerified: input.phoneVerified,
      emailVerified: input.emailVerified,
      profileFlag: input.profileFlag,
      switchToOfferId: input.switchToOfferId,
      switchFromIntentId: input.switchFromIntentId,
      standingId: input.standingId,
      createdAt: at,
      updatedAt: at,
    };
    s.intents.unshift(intent);
    const unit = offer.kind === "RACHAT" ? "titres" : "FCFA";
    await memoryRepository.logEvent({
      kind: "intent",
      intentId: intent.id,
      offerId: offer.id,
      html: `<b>${receivedLabel(intent.type)}</b> de ${intent.clientName} sur ${offer.title}${intent.amount ? ` · ${fmt(intent.amount)} ${unit}` : ""} · réf. ${intent.ref}`,
    });
    return structuredClone(intent);
  },
  async updateIntent(id, patch) {
    const s = store();
    const it = s.intents.find((x) => x.id === id);
    if (!it) throw new Error(`Intent ${id} not found`);
    Object.assign(it, patch, { updatedAt: nowIso() });
    return structuredClone(it);
  },
  async setIntentState(id, state, closedReason) {
    const s = store();
    const it = s.intents.find((x) => x.id === id);
    if (!it) throw new Error(`Intent ${id} not found`);
    it.state = state;
    if (closedReason) it.closedReason = closedReason;
    it.updatedAt = nowIso();
    return structuredClone(it);
  },

  async listEvents(limit = 50) {
    return structuredClone(store().events.slice(0, limit));
  },
  async logEvent(e) {
    const ev: EventLog = { id: uid(), at: nowIso(), ...e };
    store().events.unshift(ev);
    return ev;
  },

  async listIntake() {
    return structuredClone(store().intake);
  },
  async getIntake(id) {
    const it = store().intake.find((x) => x.id === id);
    return it ? structuredClone(it) : undefined;
  },
  async createIntake(item) {
    const it: IntakeItem = { id: uid(), ...item };
    store().intake.unshift(it);
    return structuredClone(it);
  },
  async updateIntake(id, patch) {
    const s = store();
    const i = s.intake.findIndex((x) => x.id === id);
    if (i < 0) throw new Error(`Intake ${id} not found`);
    s.intake[i] = { ...s.intake[i], ...patch };
    return structuredClone(s.intake[i]);
  },
  async upsertOffer(offer, opts = {}) {
    const s = store();
    const i = s.offers.findIndex((x) => x.id === offer.id);
    if (opts.expectedVersion != null && i >= 0 && s.offers[i].version !== opts.expectedVersion) throw new ConflictError("offer", offer.id, opts.expectedVersion, s.offers[i].version);
    if (i < 0) s.offers.push(structuredClone(offer));
    else s.offers[i] = structuredClone(offer);
    const v: OfferVersion = { offerId: offer.id, version: offer.version, publishedAt: nowIso(), publishedBy: opts.by, note: opts.note, snapshot: structuredClone(offer) };
    const j = s.versions.findIndex((x) => x.offerId === offer.id && x.version === offer.version);
    if (j >= 0) s.versions[j] = v;
    else s.versions.push(v);
    return structuredClone(offer);
  },
  async listOfferVersions(offerId) {
    return structuredClone(store().versions.filter((v) => v.offerId === offerId).sort((a, b) => b.version - a.version));
  },
  async logAudit(e) {
    const s = store();
    const prev = s.audit[s.audit.length - 1];
    const at = nowIso();
    const hash = createHash("sha256").update((prev?.hash ?? "") + JSON.stringify({ at, ...e })).digest("hex");
    const row: AuditEntry = { id: String(++s.seq), at, ...e, prevHash: prev?.hash, hash };
    s.audit.push(row);
    return structuredClone(row);
  },
  async listAudit(filter = {}) {
    const rows = store().audit.filter((a) => (!filter.entity || a.entity === filter.entity) && (!filter.entityId || a.entityId === filter.entityId));
    return structuredClone(rows.slice(-(filter.limit ?? 100)).reverse());
  },
  async logClientAction(e) {
    const s = store();
    /* La clef du jour refuse le doublon, comme l'index unique en base : une
       fiche ouverte dix fois dans l'après-midi n'écrit qu'une ligne. */
    if (e.clefDuJour && s.gestes.some((g) => g.clefDuJour === e.clefDuJour)) return;
    const { clefDuJour, ...reste } = e;
    s.gestes.push({ ...reste, clefDuJour, id: `ac-${++s.seq}`, at: nowIso() });
  },
  async listClientActions(filter = {}) {
    const rows = store()
      .gestes.filter(
        (g) =>
          (!filter.userId || g.userId === filter.userId) &&
          (!filter.genre || g.genre === filter.genre) &&
          (!filter.from || g.at.slice(0, 10) >= filter.from) &&
          (!filter.to || g.at.slice(0, 10) <= filter.to),
      )
      .sort((a, b) => b.at.localeCompare(a.at));
    return structuredClone(rows.slice(0, filter.limit ?? 200).map(({ clefDuJour: _c, ...r }) => r));
  },
  async purgerGestes(avant) {
    const st = store();
    const limite = avant.toISOString();
    const partis = st.gestes.filter((g) => g.at < limite);
    for (const g of partis) {
      const clef = g.userId + "|" + g.at.slice(0, 7) + "|" + g.genre;
      st.gestesMensuel[clef] = (st.gestesMensuel[clef] ?? 0) + 1;
    }
    st.gestes = st.gestes.filter((g) => g.at >= limite);
    return partis.length;
  },
  async listPushSubscriptions(userIds) {
    return structuredClone(store().push.filter((p) => !userIds || userIds.includes(p.userId)));
  },
  async savePushSubscription(s) {
    const list = store().push;
    const i = list.findIndex((p) => p.endpoint === s.endpoint);
    const row: PushSubscription = { ...s, id: i >= 0 ? list[i].id : `ps-${++store().seq}`, createdAt: i >= 0 ? list[i].createdAt : nowIso(), failures: 0 };
    if (i >= 0) list[i] = row;
    else list.push(row);
  },
  async removePushSubscription(endpoint) {
    store().push = store().push.filter((p) => p.endpoint !== endpoint);
  },
  async markPushFailure(endpoint, gone) {
    const p = store().push.find((x) => x.endpoint === endpoint);
    if (!p) return;
    if (gone || ++p.failures >= 5) store().push = store().push.filter((x) => x.endpoint !== endpoint);
  },
  async listApprovals(open = true) {
    return structuredClone(store().approvals.filter((a) => (open ? !a.decidedAt : Boolean(a.decidedAt))).sort((a, b) => b.requestedAt.localeCompare(a.requestedAt)));
  },
  async createApproval(a) {
    const row: Approval = { ...structuredClone(a), id: `ap-${++store().seq}`, requestedAt: nowIso() };
    store().approvals.push(row);
    return structuredClone(row);
  },
  async decideApproval(id, decision, by, note) {
    const a = store().approvals.find((x) => x.id === id);
    if (!a) throw new Error("Approbation introuvable.");
    Object.assign(a, { decision, decidedBy: by, decidedAt: nowIso(), note });
    return structuredClone(a);
  },

  async listDocuments() {
    return structuredClone(store().documents);
  },
  async getDocument(id) {
    const d = store().documents.find((x) => x.id === id);
    return d ? structuredClone(d) : undefined;
  },
  async createDocument(doc) {
    const d: GeneratedDocument = { id: uid(), ...doc };
    store().documents.unshift(d);
    return structuredClone(d);
  },
  async updateDocument(id, patch) {
    const s = store();
    const i = s.documents.findIndex((x) => x.id === id);
    if (i < 0) throw new Error(`Document ${id} not found`);
    s.documents[i] = { ...s.documents[i], ...patch };
    return structuredClone(s.documents[i]);
  },

  async listContacts() {
    return structuredClone(store().contacts);
  },
  async getContact(id) {
    const c = store().contacts.find((x) => x.id === id);
    return c ? structuredClone(c) : undefined;
  },
  async setEmailOptIn(id, optIn) {
    const c = store().contacts.find((x) => x.id === id);
    if (c) c.emailOptIn = optIn;
  },
  async setMesure(userId, mes) {
    const c = store().contacts.find((x) => x.id === userId);
    if (c) c.mesure = structuredClone(mes);
  },

  /* ---------------- Accès nommés ---------------- */
  async listAccesDuCompte(compteUserId) {
    return store().acces.filter((a) => a.compteUserId === compteUserId).map((a) => structuredClone(a));
  },
  async accesParCanal(canalValeur) {
    const a = store().acces.find((x) => x.canalValeur === canalValeur && !x.revoqueLe);
    return a ? structuredClone(a) : undefined;
  },
  async accesDeLaPersonne(personneUserId) {
    const a = store().acces.find((x) => x.personneUserId === personneUserId && !x.revoqueLe);
    return a ? structuredClone(a) : undefined;
  },
  async accorderAcces(a) {
    const row = { ...structuredClone(a), id: `acc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, accordeLe: new Date().toISOString() };
    store().acces.push(row);
    return structuredClone(row);
  },
  async lierAcces(id, personneUserId) {
    const a = store().acces.find((x) => x.id === id);
    if (a) {
      a.personneUserId = personneUserId;
      a.premiereConnexionLe = new Date().toISOString();
    }
  },
  async fixerPlafondAcces(id, plafond) {
    const a = store().acces.find((x) => x.id === id);
    if (a) a.plafondParOrdre = plafond;
  },
  async revoquerAcces(id, par, motif) {
    const a = store().acces.find((x) => x.id === id);
    if (a) {
      a.revoqueLe = new Date().toISOString();
      a.revoquePar = par;
      a.revoqueMotif = motif;
    }
  },
  async setContactOptIn(id, optIn) {
    const c = store().contacts.find((x) => x.id === id);
    if (c) c.whatsappOptIn = optIn;
    const f = store().clientFiles.find((x) => x.userId === id);
    if (f) f.consents.whatsappAt = optIn ? (f.consents.whatsappAt ?? nowIso()) : undefined;
  },
  async listStaff() {
    return structuredClone(store().staff);
  },
  async findProfileByEmail(email) {
    const s = store().staff.find((x) => x.email?.toLowerCase() === email.toLowerCase());
    if (s) return structuredClone(s);
    const c = store().contacts.find((x) => x.email?.toLowerCase() === email.toLowerCase());
    return c ? { id: c.id, name: c.name, email: c.email, phone: c.phone, role: "desk" } : undefined;
  },
  async findAdvisor(userId) {
    const id = (store().advisors ??= new Map()).get(userId); // un sac vivant depuis un rechargement peut précéder la carte
    if (!id) return undefined;
    const s = store().staff.find((x) => x.id === id);
    return s ? structuredClone(s) : undefined;
  },
  async setAdvisor(userId, advisorId) {
    const m = (store().advisors ??= new Map());
    if (advisorId) m.set(userId, advisorId);
    else m.delete(userId);
  },
  async setProfileName(userId, name) {
    /* Le personnel, pas les profils financiers : « profiles » porte les seconds. */
    const s = store().staff.find((x) => x.id === userId);
    if (s) s.name = name;
    const c = store().contacts.find((x) => x.id === userId);
    if (c) c.name = name;
  },
  async setRole(userId, role, by) {
    const st = store();
    const i = st.staff.findIndex((x) => x.id === userId);
    if (role === "client") {
      if (i >= 0) st.staff.splice(i, 1);
      return;
    }
    const base = i >= 0 ? st.staff[i] : { id: userId, name: st.contacts.find((c) => c.id === userId)?.name ?? userId, email: st.contacts.find((c) => c.id === userId)?.email };
    const row: StaffMember = { ...base, role, roleSetBy: by, roleSetAt: nowIso() };
    if (i >= 0) st.staff[i] = row;
    else st.staff.push(row);
  },
  async markMfaEnrolled(userId) {
    const s = store().staff.find((x) => x.id === userId);
    if (s) s.mfaEnrolledAt = nowIso();
  },
  async listReference(kind) {
    return structuredClone(store().reference.filter((r) => r.kind === kind));
  },
  async upsertReference(kind, key, data, by) {
    const rows = store().reference;
    const i = rows.findIndex((r) => r.kind === kind && r.key === key);
    const row: ReferenceRow = { kind, key, data: structuredClone(data), updatedAt: nowIso(), updatedBy: by };
    if (i >= 0) rows[i] = row;
    else rows.push(row);
  },
  async deleteReference(kind, key) {
    store().reference = store().reference.filter((r) => !(r.kind === kind && r.key === key));
  },
  async saveReferenceDraft(kind, key, draft, by) {
    const rows = store().reference;
    const i = rows.findIndex((r) => r.kind === kind && r.key === key);
    const d = { draft: structuredClone(draft), draftBy: by, draftAt: nowIso() };
    if (i >= 0) rows[i] = { ...rows[i], ...d };
    else rows.push({ kind, key, data: null, updatedAt: nowIso(), ...d });
  },
  async publishReference(kind, keys) {
    const done: string[] = [];
    store().reference = store()
      .reference.map((r) => {
        if (r.kind !== kind || !r.draft || (keys && !keys.includes(r.key))) return r;
        done.push(r.key);
        if (r.draft.op === "reset") return null;
        return { kind, key: r.key, data: r.draft.data, updatedAt: nowIso(), updatedBy: r.draftBy };
      })
      .filter((r): r is ReferenceRow => r !== null);
    return done;
  },
  async discardReference(kind, keys) {
    const done: string[] = [];
    store().reference = store()
      .reference.map((r) => {
        if (r.kind !== kind || !r.draft || (keys && !keys.includes(r.key))) return r;
        done.push(r.key);
        if (r.data == null) return null;
        return { kind, key: r.key, data: r.data, updatedAt: r.updatedAt, updatedBy: r.updatedBy };
      })
      .filter((r): r is ReferenceRow => r !== null);
    return done;
  },
  async listStandingOrders(userId) {
    const s = store();
    const all = s.standing ?? [];
    return structuredClone(userId ? all.filter((x) => x.userId === userId) : all);
  },
  async createStandingOrder(input) {
    const s = store();
    s.standing ??= [];
    const at = nowIso();
    const tail = Array.from({ length: 4 }, () => "ACDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 31)]).join("");
    const d = new Date();
    const ref = `EP-${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}-${tail}`;
    /* Une instruction sans source vient d'un virement : c'était la seule façon
       d'alimenter avant que le réinvestissement existe. */
    const it: StandingOrder = { id: uid(), ref, state: "active", createdAt: at, updatedAt: at, ...input, source: input.source ?? "virement", minAmount: input.minAmount ?? 0 };
    s.standing.unshift(it);
    return structuredClone(it);
  },
  async listCustodyNotices(q) {
    const s = store();
    s.avisGarde ??= [];
    const out = s.avisGarde.filter((a) => (!q?.userId || a.userId === q.userId) && (!q?.period || a.period === q.period));
    return structuredClone(out.sort((a, b) => b.period.localeCompare(a.period)));
  },
  async createCustodyNotice(input) {
    const s = store();
    s.avisGarde ??= [];
    // Un avis par client et par période : la base le garantit, la mémoire aussi.
    if (s.avisGarde.some((a) => a.userId === input.userId && a.period === input.period)) throw new Error("Avis déjà émis pour cette période");
    const d = new Date();
    const tail = Array.from({ length: 4 }, () => "ACDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 31)]).join("");
    const it: AvisGarde = { id: uid(), ref: `DG-${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}-${tail}`, issuedAt: nowIso(), ...input };
    s.avisGarde.unshift(it);
    return structuredClone(it);
  },
  async updateStandingOrder(id, patch) {
    const s = store();
    const it = (s.standing ?? []).find((x) => x.id === id);
    if (!it) throw new Error(`Standing order ${id} not found`);
    Object.assign(it, patch, { updatedAt: nowIso() });
    return structuredClone(it);
  },
  async remplacerStandingOrder(id, input) {
    const row = store().standing.find((x) => x.id === id);
    if (!row) throw new Error(`standing_orders ${id} introuvable`);
    if (row.state !== "active") throw new Error("standing_orders : cette instruction ne court plus");
    Object.assign(row, { state: "remplacee", stopReason: "remplacée par une nouvelle version", updatedAt: nowIso() });
    return this.createStandingOrder({ ...input, supersedes: id });
  },
  async listMandats(userId) {
    const all = store().mandats.filter((m) => !userId || m.userId === userId);
    return structuredClone(all.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  },
  async createMandat(input) {
    const now = nowIso();
    const row: MandatPrelevement = { id: `mp-${store().mandats.length + 1}`, ref: makeMandatRef(), state: "actif", pendingCodeTries: 0, rejects: 0, createdAt: now, updatedAt: now, ...input };
    store().mandats.unshift(row);
    return structuredClone(row);
  },
  async updateMandat(id, patch) {
    const row = store().mandats.find((m) => m.id === id);
    if (!row) throw new Error(`direct_debit_mandates ${id} introuvable`);
    Object.assign(row, patch, { updatedAt: nowIso() });
    return structuredClone(row);
  },
  async listVirements(q) {
    const all = store().virements.filter((v) => (!q?.state || v.state === q.state) && (!q?.userId || v.userId === q.userId));
    /* Par date de valeur décroissante : le relevé du jour se lit en premier,
       et la file des sans-nom se range par ancienneté sur la page. */
    return structuredClone(all.sort((a, b) => b.at.localeCompare(a.at) || b.createdAt.localeCompare(a.createdAt)));
  },
  async addVirement(input) {
    /* L'empreinte unique, à la main : en base c'est une contrainte, ici c'est
       ce garde. Sans lui, le mode mémoire laisserait passer un double crédit et
       l'essai à blanc ne dirait pas ce que la production fait. */
    if (store().virements.some((v) => v.fingerprint === input.fingerprint)) throw new Error(`incoming_transfers ${input.fingerprint} déjà lu`);
    const row: VirementRecu = { id: `vir-${store().virements.length + 1}`, state: "recu", createdAt: nowIso(), ...input };
    store().virements.unshift(row);
    return structuredClone(row);
  },
  async listRemises(limit = 60) {
    return structuredClone([...store().remises].sort((a, b) => b.dueOn.localeCompare(a.dueOn)).slice(0, limit));
  },
  async creerRemise(p) {
    /* Une seule remise par échéance : en base c'est une contrainte, ici ce
       garde. Deux fichiers pour le même jour sont un double prélèvement chez
       chaque client de la liste. */
    if (store().remises.some((r) => r.dueOn === p.dueOn)) throw new Error(`debit_batches ${p.dueOn} existe déjà`);
    const row: RemiseDePrelevement = { id: `rp-${store().remises.length + 1}`, ref: p.ref, dueOn: p.dueOn, state: "preparee", createdAt: nowIso(), createdBy: p.createdBy };
    store().remises.unshift(row);
    return structuredClone(row);
  },
  async remettreRemise(id, p) {
    const row = store().remises.find((r) => r.id === id);
    if (!row) throw new Error(`debit_batches ${id} introuvable`);
    Object.assign(row, { state: "remise", handedAt: nowIso(), handedBy: p.handedBy });
    return structuredClone(row);
  },
  async listTirages(q) {
    const all = store().tirages.filter((t) => (!q?.dueOn || t.dueOn === q.dueOn) && (!q?.userId || t.userId === q.userId) && (!q?.state || t.state === q.state) && (!q?.batchId || t.remiseId === q.batchId));
    return structuredClone(all.sort((a, b) => b.dueOn.localeCompare(a.dueOn) || a.createdAt.localeCompare(b.createdAt)));
  },
  async creerTirage(input) {
    if (store().tirages.some((t) => t.mandatId === input.mandatId && t.dueOn === input.dueOn)) throw new Error(`debit_draws ${input.mandatId}/${input.dueOn} existe déjà`);
    const row: Tirage = { id: `tp-${store().tirages.length + 1}`, ref: makeTirageRef(), state: "prepare", noticeSent: false, createdAt: nowIso(), ...input };
    store().tirages.push(row);
    return structuredClone(row);
  },
  async updateTirage(id, patch) {
    const row = store().tirages.find((t) => t.id === id);
    if (!row) throw new Error(`debit_draws ${id} introuvable`);
    Object.assign(row, patch);
    return structuredClone(row);
  },
  async closeVirement(id, p) {
    const row = store().virements.find((v) => v.id === id);
    if (!row) throw new Error(`incoming_transfers ${id} introuvable`);
    if (row.state !== "recu") throw new Error(`incoming_transfers ${id} déjà ${row.state}`);
    Object.assign(row, { state: p.state, userId: p.userId ?? row.userId, cashEntry: p.cashEntry, closedAt: nowIso(), closedBy: p.closedBy, closedReason: p.closedReason, note: p.note ?? row.note });
    return structuredClone(row);
  },
  async listCash(userId) {
    return structuredClone(store().cash.filter((c) => c.userId === userId).sort((a, b) => a.at.localeCompare(b.at)));
  },
  async addCash(entry) {
    /* flowKey et feePeriod se perdaient ici : en mémoire, un encaissement
       n'était donc jamais rapproché, le flux restait « attendu » pour toujours
       et la garde contre le double clic ne mordait pas. */
    const row: CashEntry = { id: `cash-${store().cash.length + 1}`, at: entry.at ?? new Date().toISOString(), userId: entry.userId, amount: entry.amount, kind: entry.kind, label: entry.label, intentId: entry.intentId, dueBy: entry.dueBy, flowKey: entry.flowKey, feePeriod: entry.feePeriod, evidence: entry.evidence, expected: entry.expected };
    store().cash.push(row);
    return structuredClone(row);
  },
  async listTours(limit = 200) {
    return structuredClone([...store().tours].sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, limit));
  },
  async ouvrirTour(robot, par) {
    const s2 = store();
    const row: TourVu & { id: string } = { id: `tour-${s2.tours.length + 1}`, robot, par, startedAt: nowIso() };
    s2.tours.push(row);
    return { id: row.id };
  },
  async fermerTour(id, p) {
    const row = store().tours.find((x) => (x as { id?: string }).id === id);
    if (!row) return;
    Object.assign(row, { finishedAt: nowIso(), ok: p.ok, detail: p.detail, error: p.error });
  },

  async listPreavis(q) {
    const rows = store().preavis.filter((x) => (!q?.userId || x.userId === q.userId) && (!q?.standingId || x.standingId === q.standingId) && (!q?.state || x.state === q.state));
    return structuredClone([...rows].sort((a, b) => a.dueOn.localeCompare(b.dueOn)));
  },
  async annoncerPreavis(p) {
    /* La base porte l'unicité d'une occurrence par instruction et par jour ; en
       mémoire on la tient à la main, sans quoi un test passerait sur un
       comportement que la production refuse. */
    const s2 = store();
    if (s2.preavis.some((x) => x.standingId === p.standingId && x.dueOn === p.dueOn)) throw new Error("standing_runs : cette occurrence est deja annoncee");
    const row: Preavis = { id: `preavis-${s2.preavis.length + 1}`, standingId: p.standingId, userId: p.userId, dueOn: p.dueOn, amount: p.amount, announcedAt: nowIso(), noticeSent: false, state: "annoncee" };
    s2.preavis.push(row);
    return structuredClone(row);
  },
  async cloturerPreavis(id, p) {
    const row = store().preavis.find((x) => x.id === id);
    if (!row) throw new Error(`standing_runs ${id} introuvable`);
    if (p.state && row.state !== "annoncee") throw new Error("standing_runs : cette occurrence est deja close");
    if (p.state) Object.assign(row, { state: p.state, closedAt: nowIso() });
    for (const k of ["noticeSent", "noticeError", "stopReason", "intentId", "intents", "paidAmount"] as const) if (p[k] !== undefined) Object.assign(row, { [k]: p[k] });
    return structuredClone(row);
  },

  async listTemoignages(q) {
    const rows = store().temoignages.filter((x) => !q?.userId || x.userId === q.userId);
    return structuredClone([...rows].sort((a, b) => b.at.localeCompare(a.at)));
  },
  async direLeFlux(t) {
    /* Une seule déclaration vivante par échéance : la nouvelle remplace, comme
       l'index d'unicité le fait en base. */
    const s2 = store();
    const i = s2.temoignages.findIndex((x) => x.userId === t.userId && x.flowKey === t.flowKey);
    const row: Temoignage = { ...structuredClone(t), id: i >= 0 ? s2.temoignages[i].id : `temoin-${s2.temoignages.length + 1}`, at: nowIso() };
    if (i >= 0) s2.temoignages[i] = row;
    else s2.temoignages.push(row);
    return structuredClone(row);
  },

  async listRapprochements(limit = 40) {
    return structuredClone([...store().rapprochements].sort((a, b) => b.onDate.localeCompare(a.onDate)).slice(0, limit));
  },
  async addRapprochement(r) {
    const s2 = store();
    const row: Rapprochement = { ...structuredClone(r), id: `rappro-${s2.rapprochements.length + 1}`, createdAt: nowIso() };
    s2.rapprochements.push(row);
    return structuredClone(row);
  },

  async listPayouts(q) {
    const rows = store().payouts.filter((x) => (!q?.userId || x.userId === q.userId) && (!q?.state || x.state === q.state));
    return structuredClone([...rows].sort((a, b) => a.askedAt.localeCompare(b.askedAt)));
  },
  async askPayout(p) {
    /* La base porte l'unicite d'une demande ouverte ; en memoire on la tient a
       la main, sans quoi un test passerait sur un comportement que la
       production refuse. */
    const s2 = store();
    if (s2.payouts.some((x) => x.userId === p.userId && x.state === "demandee")) throw new Error("cash_payouts : une demande est deja ouverte");
    const row: CashPayout = { id: `payout-${s2.payouts.length + 1}`, userId: p.userId, askedAt: nowIso(), askedAmount: p.askedAmount, note: p.note, state: "demandee" };
    s2.payouts.push(row);
    return structuredClone(row);
  },
  async closePayout(id, p) {
    const row = store().payouts.find((x) => x.id === id);
    if (!row) throw new Error(`cash_payouts ${id} introuvable`);
    if (row.state !== "demandee") throw new Error("cash_payouts : cette demande est deja fermee");
    Object.assign(row, { state: p.state, closedAt: nowIso(), closedBy: p.closedBy, closedReason: p.closedReason, paidAmount: p.paidAmount, cashEntry: p.cashEntry });
    return structuredClone(row);
  },
  async listWatches(userId) {
    return structuredClone(store().watches.filter((w) => !userId || w.userId === userId));
  },
  async addWatch(userId, offerId, snapshot, mode) {
    const existing = store().watches.find((w) => w.userId === userId && w.offerId === offerId);
    if (existing) return structuredClone(existing);
    const w: Watch = { id: uid(), userId, offerId, lastHero: snapshot.hero, lastStatus: snapshot.status, mode: mode ?? "evenement", createdAt: nowIso() };
    store().watches.push(w);
    return structuredClone(w);
  },
  async removeWatch(userId, offerId) {
    store().watches = store().watches.filter((w) => !(w.userId === userId && w.offerId === offerId));
  },
  async updateWatch(id, patch) {
    const w = store().watches.find((x) => x.id === id);
    if (w) Object.assign(w, patch);
  },
  async getFinancialProfile(userId) {
    return (store().profiles ??= new Map()).get(userId); // a store kept alive across a code reload may predate the map
  },
  async setFinancialProfile(userId, p) {
    (store().profiles ??= new Map()).set(userId, p);
  },
  async getPrefs(userId) {
    return (store().prefs ??= new Map()).get(userId) ?? {};
  },
  async setPrefs(userId, p) {
    (store().prefs ??= new Map()).set(userId, { ...(await this.getPrefs(userId)), ...p });
  },
  async listTemplateTexts(docType) {
    const all = (store().templateTexts ??= []);
    return all.filter((t) => !docType || t.docType === docType).sort((a, b) => a.docType.localeCompare(b.docType) || a.passage.localeCompare(b.passage) || b.version - a.version);
  },
  async addTemplateText(t) {
    const all = (store().templateTexts ??= []);
    const version = Math.max(0, ...all.filter((x) => x.docType === t.docType && x.passage === t.passage).map((x) => x.version)) + 1;
    const row: TemplateText = { ...t, id: crypto.randomUUID(), version, at: new Date().toISOString() };
    if (row.status === "current") for (const x of all) if (x.docType === t.docType && x.passage === t.passage && x.status === "current") x.status = "superseded";
    all.push(row);
    return row;
  },
  async setTemplateTextStatus(id, status, approvedBy) {
    const all = (store().templateTexts ??= []);
    const row = all.find((x) => x.id === id);
    if (!row) return;
    if (status === "current") for (const x of all) if (x.docType === row.docType && x.passage === row.passage && x.status === "current") x.status = "superseded";
    Object.assign(row, { status, approvedBy: status === "current" ? approvedBy : row.approvedBy, approvedAt: status === "current" ? new Date().toISOString() : row.approvedAt });
  },
  async getConsent(userId) {
    return store().consents.get(userId) ?? {};
  },
  async setConsent(userId, version) {
    store().consents.set(userId, { version, at: nowIso() });
  },
  async getChannelStatus(userId) {
    const c = store().contacts.find((x) => x.id === userId);
    const st = store().channels.get(userId) ?? {};
    return { phone: st.phone ?? c?.phone, phoneVerifiedAt: st.phoneVerifiedAt, email: st.email ?? c?.email, emailVerifiedAt: st.emailVerifiedAt };
  },
  async markChannelVerified(userId, channel, target) {
    const st = store().channels.get(userId) ?? {};
    if (channel === "phone") Object.assign(st, { phone: target, phoneVerifiedAt: nowIso() });
    else Object.assign(st, { email: target, emailVerifiedAt: nowIso() });
    store().channels.set(userId, st);
    await this.updateContact(userId, channel === "phone" ? { phone: target } : { email: target });
  },
  async createChannelCode(c) {
    const code: ChannelCode = { ...c, id: uid(), attempts: 0, createdAt: nowIso() };
    store().codes = store().codes.filter((x) => !(x.channel === c.channel && x.target === c.target && !x.verifiedAt));
    store().codes.push(code);
    return structuredClone(code);
  },
  async findChannelCode(channel, target) {
    const c = [...store().codes].reverse().find((x) => x.channel === channel && x.target === target && !x.verifiedAt);
    return c ? structuredClone(c) : undefined;
  },
  async updateChannelCode(id, patch) {
    const c = store().codes.find((x) => x.id === id);
    if (c) Object.assign(c, patch);
  },
  async listDevices(userId) {
    return structuredClone(store().devices.filter((d) => d.userId === userId));
  },
  async findDevice(by) {
    const d = store().devices.find((x) => (by.id && x.id === by.id) || (by.credentialId && x.credentialId === by.credentialId));
    return d ? structuredClone(d) : undefined;
  },
  async addDevice(d) {
    const dev: TrustedDevice = { ...d, id: uid(), failures: 0, createdAt: nowIso() };
    store().devices.push(dev);
    return structuredClone(dev);
  },
  async updateDevice(id, patch) {
    const d = store().devices.find((x) => x.id === id);
    if (d) Object.assign(d, patch);
  },
  async removeDevice(id, userId) {
    store().devices = store().devices.filter((d) => !(d.id === id && (!userId || d.userId === userId)));
  },
  async removeDevices(userId, kind) {
    store().devices = store().devices.filter((d) => !(d.userId === userId && (!kind || d.kind === kind)));
  },
  async updateContact(id, patch) {
    let c = store().contacts.find((x) => x.id === id);
    if (!c) {
      // First contact from this client: create the record (Supabase has a profile row from sign-up).
      c = { id, name: patch.name ?? id, segment: "", whatsappOptIn: false };
      store().contacts.push(c);
    }
    if (patch.name) c.name = patch.name;
    if (patch.segment) c.segment = patch.segment;
    // A new number or address is a new channel: its proof falls with the old one.
    const st = store().channels.get(id);
    if (patch.phone) {
      if (st?.phone && st.phone !== patch.phone) Object.assign(st, { phone: patch.phone, phoneVerifiedAt: undefined });
      c.phone = patch.phone;
      c.whatsappOptIn = true; // giving the number on the form is the consent
    }
    if (patch.email) {
      if (st?.email && st.email !== patch.email) Object.assign(st, { email: patch.email, emailVerifiedAt: undefined });
      c.email = patch.email;
    }
  },
  async listNotifications(limit = 50) {
    return structuredClone(store().notifications.slice(0, limit));
  },
  async createNotification(n) {
    const row: Notification = { id: uid(), createdAt: nowIso(), ...n };
    store().notifications.unshift(row);
    return structuredClone(row);
  },
  async listInbound(limit = 200) {
    return structuredClone(store().inbound.slice(0, limit));
  },
  async createInbound(m) {
    const receivedAt = m.receivedAt ?? nowIso();
    /* LA CLEF D'ÉCHANGE SE POSE ICI, au passage obligé : quatre points d'entrée
       écrivent des messages, et la règle doit être unique. */
    const row: InboundMessage = { id: uid(), ...m, receivedAt, convKey: m.convKey ?? cleIci(store().inbound, { ...m, receivedAt }) };
    store().inbound.unshift(row);
    return structuredClone(row);
  },
  async setInboundAttachments(id, pieces) {
    const m = store().inbound.find((x) => x.id === id);
    if (m) m.attachments = structuredClone(pieces);
  },
  async markInboundUnhandled(id) {
    const m = store().inbound.find((x) => x.id === id);
    if (m) {
      m.handledAt = undefined;
      m.handledBy = undefined;
    }
  },
  async listDeskExchanges() {
    return structuredClone(store().deskExchanges);
  },
  async setDeskExchange(convKey, patch, _by) {
    const l = store().deskExchanges;
    const i = l.findIndex((x) => x.convKey === convKey);
    const base = i >= 0 ? l[i] : { convKey, labels: [] };
    const neuf = { ...base, ...patch };
    if (i >= 0) l[i] = neuf;
    else l.push(neuf);
  },
  async listDeskThreads() {
    return structuredClone(store().deskThreads);
  },
  async setDeskThread(channel, addr, patch, _by) {
    const l = store().deskThreads;
    const i = l.findIndex((x) => x.channel === channel && x.addr === addr);
    const base = i >= 0 ? l[i] : { channel, addr, labels: [] };
    const neuf = { ...base, ...patch };
    if (i >= 0) l[i] = neuf;
    else l.push(neuf);
  },
  async markInboundHandled(id, by) {
    const m = store().inbound.find((x) => x.id === id);
    if (m) {
      m.handledAt = nowIso();
      m.handledBy = by;
    }
  },
  async updateNotification(id, patch) {
    const s = store();
    const i = s.notifications.findIndex((x) => x.id === id);
    if (i < 0) throw new Error(`Notification ${id} not found`);
    s.notifications[i] = { ...s.notifications[i], ...patch };
    return structuredClone(s.notifications[i]);
  },

  async listClientFiles() {
    return structuredClone(store().clientFiles);
  },
  async getClientFile(id) {
    const f = store().clientFiles.find((x) => x.id === id);
    return f ? structuredClone(f) : undefined;
  },
  async getClientFileByUser(userId) {
    const f = store().clientFiles.find((x) => x.userId === userId) ?? dossierDeDemonstration(userId);
    return f ? structuredClone(f) : undefined;
  },
  async createClientFile(f) {
    const row: ClientFile = { id: uid(), ...f };
    store().clientFiles.unshift(row);
    // A file makes its owner reachable.
    const c = store().contacts.find((x) => x.id === f.userId);
    if (!c) store().contacts.push({ id: f.userId, name: f.identity.name, segment: f.kind, phone: f.identity.phone, email: f.identity.email, whatsappOptIn: false });
    return structuredClone(row);
  },
  async updateClientFile(id, patch) {
    const s = store();
    const i = s.clientFiles.findIndex((x) => x.id === id);
    if (i < 0) throw new Error(`ClientFile ${id} not found`);
    s.clientFiles[i] = { ...s.clientFiles[i], ...patch, updatedAt: nowIso() };
    const f = s.clientFiles[i];
    const c = s.contacts.find((x) => x.id === f.userId);
    if (c) {
      c.name = f.identity.name || c.name;
      c.phone = f.identity.phone ?? c.phone;
      c.email = f.identity.email ?? c.email;
      c.whatsappOptIn = Boolean(f.consents.whatsappAt);
    }
    return structuredClone(f);
  },

  async listBulletins(limit = 30) {
    return structuredClone([...store().bulletins].sort((a, b) => b.sessionDate.localeCompare(a.sessionDate)).slice(0, limit));
  },
  async getBulletin(sessionDate) {
    const b = store().bulletins.find((x) => x.sessionDate === sessionDate);
    return b ? structuredClone(b) : undefined;
  },
  async upsertBulletin(b) {
    const s = store();
    const i = s.bulletins.findIndex((x) => x.sessionDate === b.sessionDate);
    if (i >= 0) s.bulletins[i] = structuredClone(b);
    else s.bulletins.push(structuredClone(b));
    return structuredClone(b);
  },
  async upsertQuotes(quotes) {
    const s = store();
    for (const q of quotes) {
      const i = s.quotes.findIndex((x) => x.isin === q.isin && x.sessionDate === q.sessionDate);
      if (i >= 0) s.quotes[i] = structuredClone(q);
      else s.quotes.push(structuredClone(q));
    }
  },
  async listQuotes(isin, limit = 60) {
    return structuredClone(store().quotes.filter((q) => q.isin === isin).sort((a, b) => b.sessionDate.localeCompare(a.sessionDate)).slice(0, limit));
  },
  async quotesOn(sessionDate) {
    return structuredClone(store().quotes.filter((q) => q.sessionDate === sessionDate));
  },
  async marketMovements() {
    /* La même différence d'ensembles que la fonction en base, sur le jeu
       d'essai qui tient en mémoire. Deux écritures d'une règle, et c'est
       assumé : l'une ne peut pas servir à l'autre, Postgres ne lisant pas le
       tableau et le tableau n'ayant pas de base. Elles tiennent en dix lignes
       chacune, et un essai les compare sur le même jeu. */
    const parDate = new Map<string, Set<string>>();
    for (const q of store().quotes) {
      const s = parDate.get(q.sessionDate) ?? new Set<string>();
      s.add(q.isin);
      parDate.set(q.sessionDate, s);
    }
    const jours = [...parDate.keys()].sort();
    return jours.slice(1).map((d, i) => {
      const avant = parDate.get(jours[i])!;
      const apres = parDate.get(d)!;
      return {
        sessionDate: d,
        prevDate: jours[i],
        partis: [...avant].filter((x) => !apres.has(x)).length,
        arrivees: [...apres].filter((x) => !avant.has(x)).length,
      };
    });
  },
  async quoteActivity(since) {
    return store().quotes.filter((q) => q.sessionDate >= since).map((q) => ({ isin: q.isin, sessionDate: q.sessionDate, volumeTraded: q.volumeTraded, valueTraded: q.valueTraded, trades: q.trades }));
  },
  async latestQuotes() {
    const latest = new Map<string, Quote>();
    for (const q of store().quotes) {
      const cur = latest.get(q.isin);
      if (!cur || q.sessionDate > cur.sessionDate) latest.set(q.isin, q);
    }
    return structuredClone([...latest.values()]);
  },
  async upsertFundNavs(navs) {
    const s = store();
    for (const n of navs) {
      const i = s.fundNavs.findIndex((x) => x.fundKey === n.fundKey && x.navDate === n.navDate);
      if (i >= 0) s.fundNavs[i] = structuredClone(n);
      else s.fundNavs.push(structuredClone(n));
    }
  },
  async listFundNavs(fundKey, limit = 60) {
    return structuredClone(store().fundNavs.filter((n) => n.fundKey === fundKey).sort((a, b) => b.navDate.localeCompare(a.navDate)).slice(0, limit));
  },
  async listFundCurves(keys, points = 60) {
    const out = new Map<string, FundCurve>();
    for (const key of keys) {
      const curve = fundCurveFrom(store().fundNavs.filter((n) => n.fundKey === key), points);
      if (curve) out.set(key, curve);
    }
    return out;
  },
  async latestFundNavs() {
    const latest = new Map<string, FundNav>();
    for (const n of store().fundNavs) {
      const cur = latest.get(n.fundKey);
      if (!cur || n.navDate > cur.navDate) latest.set(n.fundKey, n);
    }
    return structuredClone([...latest.values()].sort((a, b) => a.name.localeCompare(b.name)));
  },
  async fundNavDates(since) {
    return store()
      .fundNavs.filter((n) => n.navDate >= since)
      .map((n) => ({ fundKey: n.fundKey, navDate: n.navDate }));
  },

  async listAuctionResults(filter) {
    const f = filter ?? {};
    return structuredClone(
      store()
        .auctionResults.filter((r) => (!f.codeEmission || r.codeEmission === f.codeEmission) && (!f.instrument || r.instrument === f.instrument) && (!f.tenor || r.tenor === f.tenor) && (!f.country || r.country === f.country) && (f.confirmed === undefined || Boolean(r.confirmedBy) === f.confirmed))
        .sort((a, b) => b.sessionOn.localeCompare(a.sessionOn))
        .slice(0, f.limit ?? 200),
    );
  },
  async getAuctionResult(id) {
    const r = store().auctionResults.find((x) => x.id === id);
    return r ? structuredClone(r) : undefined;
  },
  async latestBeacCurve() {
    const derniere = [...store().beacCurves].sort((a, b) => b.mois.localeCompare(a.mois))[0];
    return derniere ? structuredClone(derniere) : undefined;
  },
  async saveBeacCurve(c) {
    const s = store();
    s.beacCurves = [...s.beacCurves.filter((x) => x.numero !== c.numero), structuredClone(c)];
  },

  async listEmissionNotices(filter) {
    const s = store();
    const tout = [...s.emissionNotices]
      .filter((n) => (filter?.codeEmission ? n.codeEmission === filter.codeEmission : true))
      .filter((n) => (filter?.country ? n.country === filter.country : true))
      .filter((n) => (filter?.confirmed === undefined ? true : Boolean(n.confirmedBy) === filter.confirmed))
      .sort((a, b) => b.sessionOn.localeCompare(a.sessionOn));
    return tout.slice(0, filter?.limit ?? 500);
  },
  async upsertEmissionNotice(n) {
    const s = store();
    const at = new Date().toISOString();
    const i = s.emissionNotices.findIndex((x) => x.sourceUrl === n.sourceUrl);
    if (i < 0) {
      const neuf: EmissionNotice = { id: String(++s.seq), remarks: [], ...n, createdAt: at, updatedAt: at };
      s.emissionNotices.push(neuf);
      return neuf;
    }
    const avant = s.emissionNotices[i];
    // La confirmation reste, et une pièce absente n'efface pas une pièce gardée.
    const fusion: EmissionNotice = {
      ...avant,
      ...Object.fromEntries(Object.entries(n).filter(([, v]) => v !== undefined)),
      fileKey: n.fileKey ?? avant.fileKey,
      confirmedBy: avant.confirmedBy ?? n.confirmedBy,
      confirmedAt: avant.confirmedBy ? avant.confirmedAt : n.confirmedAt,
      updatedAt: at,
    };
    s.emissionNotices[i] = fusion;
    return fusion;
  },
  async updateEmissionNotice(id, patch) {
    const s = store();
    const i = s.emissionNotices.findIndex((x) => x.id === id);
    if (i < 0) throw new Error("avis d'annonce introuvable");
    // Un null écrit efface, comme chez Supabase : il devient « undefined » dans
    // l'objet du domaine, qui n'a pas de null.
    const fusion: EmissionNotice = {
      ...s.emissionNotices[i],
      ...Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined).map(([k, v]) => [k, v === null ? undefined : v])),
      updatedAt: new Date().toISOString(),
    };
    s.emissionNotices[i] = fusion;
    return fusion;
  },
  async upsertAuctionResult(r) {
    const s = store();
    const now = new Date().toISOString();
    const i = s.auctionResults.findIndex((x) => x.sourceUrl === r.sourceUrl);
    // Un second passage du robot ne défait rien : ni la relecture du desk, ni la
    // pièce déjà gardée. Le robot rend « undefined » quand la BEAC ne répond pas,
    // et un champ vide ne remplace jamais un champ rempli.
    const row =
      i >= 0
        ? { ...s.auctionResults[i], ...r, confirmedBy: s.auctionResults[i].confirmedBy ?? r.confirmedBy, confirmedAt: s.auctionResults[i].confirmedAt ?? r.confirmedAt, fileKey: r.fileKey ?? s.auctionResults[i].fileKey, updatedAt: now }
        : { ...r, id: uid(), createdAt: now, updatedAt: now };
    if (i >= 0) s.auctionResults[i] = row;
    else s.auctionResults.push(row);
    return structuredClone(row);
  },
  async updateAuctionResult(id, patch) {
    const s = store();
    const i = s.auctionResults.findIndex((x) => x.id === id);
    if (i < 0) throw new Error("Résultat introuvable");
    // Même règle que la base : « undefined » veut dire « non fourni ». Un
    // « ...patch » nu écraserait un champ existant par undefined, et le dépôt
    // en mémoire mentirait sur ce que fait le vrai.
    const fourni = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
    s.auctionResults[i] = { ...s.auctionResults[i], ...fourni, updatedAt: new Date().toISOString() };
    return structuredClone(s.auctionResults[i]);
  },

  async reopenAuctionResult(id) {
    const s = store();
    const i = s.auctionResults.findIndex((x) => x.id === id);
    if (i < 0) throw new Error("Résultat introuvable");
    const { confirmedBy: _by, confirmedAt: _at, ...reste } = s.auctionResults[i];
    s.auctionResults[i] = { ...reste, updatedAt: new Date().toISOString() };
    return structuredClone(s.auctionResults[i]);
  },

  async listIssuerDocuments(mnemo) {
    return structuredClone(store().issuerDocs.filter((d) => !mnemo || d.mnemo === mnemo));
  },
  async upsertIssuerDocument(d) {
    const s = store();
    const i = s.issuerDocs.findIndex((x) => x.sourceUrl === d.sourceUrl);
    const row = { ...d, id: d.id ?? uid() };
    if (i >= 0) s.issuerDocs[i] = row;
    else s.issuerDocs.push(row);
    return structuredClone(row);
  },
  async listNews() {
    return structuredClone(store().news);
  },
  async upsertNews(n) {
    const s = store();
    const i = s.news.findIndex((x) => x.id === n.id);
    if (i >= 0) s.news[i] = structuredClone(n);
    else s.news.push(structuredClone(n));
  },
  async deleteNews(id) {
    store().news = store().news.filter((n) => n.id !== id);
  },
};
