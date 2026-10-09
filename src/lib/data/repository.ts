import type { FinancialProfile } from "@/data/profile";
import type { Approval, AuditEntry, ChannelCode, ChannelStatus, ClientPrefs, Contact, DocumentType, TemplateText, TemplateTextStatus, DeviceKind, EventLog, GeneratedDocument, IntakeItem, Intent, IntentState, NewAuditEntry, NewIntentInput, Notification, Offer, OfferVersion, PieceGardee, ProofChannel, PushSubscription, ReferenceDraft, ReferenceRow, StaffMember, StaffRole, TrustedDevice, Watch, InboundMessage, DeskThread, DeskExchange } from "@/lib/domain/types";
import type { CashEntry, CashPayout } from "@/lib/domain/cash";
import type { Rapprochement } from "@/lib/domain/rapprochement";
import type { Preavis } from "@/lib/domain/preavis";
import type { TourVu } from "@/lib/domain/robots";
import type { Temoignage } from "@/lib/domain/temoignage";
import type { AvisGarde } from "@/lib/domain/garde";
import type { NewStandingOrder, StandingOrder } from "@/lib/domain/standing";
import type { ClientFile } from "@/lib/domain/kyc";
import type { FundNav, IssuerDocument, MarketBulletin, MouvementSeance, Quote, QuoteActivity } from "@/lib/domain/market";
import type { AuctionResult, NewAuctionResult, PatchAuctionResult } from "@/lib/market/auction-results";
import type { EmissionNotice, EmissionNoticePatch, NewEmissionNotice } from "@/lib/market/emission-notices";
import type { NewsItem } from "@/lib/news/model";
import type { FundCurve } from "@/lib/domain/fund-curve";

/**
 * Single access point for offers, intents and the event log.
 * Two implementations: in-memory (seed, dev without backend) and Supabase.
 */
/** Un relevé de la courbe de la BEAC, tel qu'il est rangé. */
export interface BeacCurveRow {
  numero: number;
  /** Le mois arrêté, en AAAA-MM : la date de la courbe, pas celle du relevé. */
  mois: string;
  source: string;
  releveLe: string;
  /** Les durées sont des durées d'ÉMISSION, pas des vies restantes. */
  series: { pays: string; points: { annees: number; pct: number }[] }[];
}

export interface Repository {
  listOffers(): Promise<Offer[]>;
  getOffer(id: string): Promise<Offer | undefined>;
  /** Desk: publish a price → new version, status published. */
  publishOffer(id: string, patch: Partial<Offer>): Promise<Offer>;

  listIntents(): Promise<Intent[]>;
  createIntent(input: NewIntentInput): Promise<Intent>;
  /** `closedReason` n’a de sens qu’avec l’état « annulee » : c’est le motif que le client lit. */
  setIntentState(id: string, state: IntentState, closedReason?: string): Promise<Intent>;
  updateIntent(
    id: string,
    patch: Partial<
      Pick<
        Intent,
        | "state"
        | "allocationPct"
        | "servedUnits"
        | "message"
        | "executedPrice"
        | "amount"
        | "limitPrice"
        | "counter"
        | "switchToOfferId"
        | "switchFromIntentId"
        // La signature de l'ordre et le code qui la donne : migration 0071.
        | "pendingCodeHash"
        | "pendingCodeAt"
        | "pendingCodeTries"
        | "pendingCodeTo"
        | "signedAt"
        | "signedMethod"
        | "signedTo"
        | "orderDocId"
        | "maxAmount"
        | "coveredAt"
        | "coveredAmount"
      >
    >,
  ): Promise<Intent>;

  listEvents(limit?: number): Promise<EventLog[]>;
  logEvent(e: Omit<EventLog, "id" | "at">): Promise<EventLog>;

  /** Intake queue (desk « À valider »). */
  listIntake(): Promise<IntakeItem[]>;
  getIntake(id: string): Promise<IntakeItem | undefined>;
  createIntake(item: Omit<IntakeItem, "id">): Promise<IntakeItem>;
  updateIntake(id: string, patch: Partial<IntakeItem>): Promise<IntakeItem>;
  /** Create or replace a whole offer (publication from a draft). */
  /** Writes the offer; with expectedVersion, refuses (ConflictError) when the stored version moved. Keeps a full snapshot per version. */
  upsertOffer(offer: Offer, opts?: { expectedVersion?: number; by?: string; note?: string }): Promise<Offer>;
  listOfferVersions(offerId: string): Promise<OfferVersion[]>;
  /** Audit trail (append-only, hash-chained). */
  logAudit(e: NewAuditEntry): Promise<AuditEntry>;
  listAudit(filter?: { entity?: string; entityId?: string; limit?: number }): Promise<AuditEntry[]>;
  /** Four-eyes: proposals waiting for a responsable. */
  listApprovals(open?: boolean): Promise<Approval[]>;
  createApproval(a: Omit<Approval, "id" | "requestedAt">): Promise<Approval>;
  decideApproval(id: string, decision: "approuve" | "refuse", by: string, note?: string): Promise<Approval>;

  /** Generated documents (PDFs on the letterhead). */
  listDocuments(): Promise<GeneratedDocument[]>;
  getDocument(id: string): Promise<GeneratedDocument | undefined>;
  createDocument(doc: Omit<GeneratedDocument, "id">): Promise<GeneratedDocument>;
  updateDocument(id: string, patch: Partial<GeneratedDocument>): Promise<GeneratedDocument>;

  /** Reachable contacts. */
  listContacts(): Promise<Contact[]>;
  getContact(id: string): Promise<Contact | undefined>;
  setContactOptIn(id: string, optIn: boolean): Promise<void>;
  /** Le consentement aux informations par courrier : le service n’en dépend pas. */
  setEmailOptIn(id: string, optIn: boolean): Promise<void>;
  /** Desk team: who has desk access, at which level, with MFA or not. */
  listStaff(): Promise<StaffMember[]>;
  findProfileByEmail(email: string): Promise<StaffMember | undefined>;
  setRole(userId: string, role: StaffRole | "client", by: string): Promise<void>;
  /**
   * Corriger le nom affiché de quelqu'un.
   *
   * L'adresse n'a pas d'équivalent ici, et c'est délibéré : elle est l'identité
   * de connexion, et la changer sans la changer dans l'authentification
   * couperait la personne de son compte, en silence.
   */
  setProfileName(userId: string, name: string): Promise<void>;
  markMfaEnrolled(userId: string): Promise<void>;
  /** Le membre de l'équipe qui suit ce client. Absent : le desk répond. */
  findAdvisor(userId: string): Promise<StaffMember | undefined>;
  setAdvisor(userId: string, advisorId: string | undefined): Promise<void>;
  /** Reference data the desk edits in the app (product types, bond terms, companies, issuers, glossary). */
  listReference(kind: string): Promise<ReferenceRow[]>;
  upsertReference(kind: string, key: string, data: unknown, by?: string): Promise<void>;
  deleteReference(kind: string, key: string): Promise<void>;
  /** Stages a change on one entry; nothing the app reads moves until publishReference. */
  saveReferenceDraft(kind: string, key: string, draft: ReferenceDraft, by: string): Promise<void>;
  /** Applies the drafts of one kind (all, or the given keys): set → published, reset → row removed. Returns the keys applied. */
  publishReference(kind: string, keys?: string[]): Promise<string[]>;
  /** Drops the drafts of one kind (all, or the given keys); a row with no published value disappears. */
  discardReference(kind: string, keys?: string[]): Promise<string[]>;
  /** Lines followed by clients (all of them for the daily alert, one client's for their page). */
  /** Le journal des espèces d'un client : ce qui est entré, ce qui est sorti, dans l'ordre. */
  listCash(userId: string): Promise<CashEntry[]>;
  /** Un mouvement s'ajoute, il ne se modifie pas : une correction est un mouvement inverse. */
  addCash(entry: Omit<CashEntry, "id" | "at"> & { at?: string; createdBy?: string }): Promise<CashEntry>;

  /** Les tours des robots, du plus récent au plus ancien. Ce qui compte est l'absence d'une ligne. */
  listTours(limit?: number): Promise<TourVu[]>;
  /** Ouvrir un tour : il existe dès son début, pour qu'un robot mort en plein travail se voie. */
  ouvrirTour(robot: string, par?: "cron" | "main"): Promise<{ id: string }>;
  /** Le fermer : abouti avec ses compteurs, ou échoué avec sa raison. */
  fermerTour(id: string, p: { ok: boolean; detail?: unknown; error?: string }): Promise<void>;

  /** Les occurrences annoncées : celles d'un client, celles d'une instruction, ou la file. */
  listPreavis(q?: { userId?: string; standingId?: string; state?: Preavis["state"] }): Promise<Preavis[]>;
  /** Annoncer une occurrence. Une seule par instruction et par jour prévu : la base le garantit. */
  annoncerPreavis(p: { standingId: string; userId: string; dueOn: string; amount: number }): Promise<Preavis>;
  /** Clore une occurrence : partie, arrêtée par le client, ou périmée. Et dire si le préavis est parti. */
  cloturerPreavis(id: string, p: { state?: Preavis["state"]; noticeSent?: boolean; noticeError?: string; stopReason?: string; intentId?: string; intents?: string[]; paidAmount?: number }): Promise<Preavis>;

  /** Ce que les clients disent de leurs échéances : ceux d'un client, ou la file du desk. */
  listTemoignages(q?: { userId?: string }): Promise<Temoignage[]>;
  /** Le client témoigne. Une seule déclaration vivante par échéance : la nouvelle remplace. */
  direLeFlux(t: Omit<Temoignage, "id" | "at">): Promise<Temoignage>;

  /** Les rapprochements, du plus récent au plus ancien. Un contrôle ne se modifie pas. */
  listRapprochements(limit?: number): Promise<Rapprochement[]>;
  /** Enregistrer un contrôle : les deux chiffres sont gelés à la date du jour. */
  addRapprochement(r: Omit<Rapprochement, "id" | "createdAt">): Promise<Rapprochement>;

  /** Les demandes de restitution : celles d'un client, ou la file ouverte du desk. */
  listPayouts(q?: { userId?: string; state?: CashPayout["state"] }): Promise<CashPayout[]>;
  /** Le client demande. Une seule demande ouverte à la fois, la base le garantit. */
  askPayout(p: { userId: string; askedAmount: number; note?: string }): Promise<CashPayout>;
  /** Le desk répond : payée avec son mouvement, ou refusée avec son motif. */
  closePayout(id: string, p: { state: "payee" | "refusee"; closedBy: string; closedReason?: string; paidAmount?: number; cashEntry?: string }): Promise<CashPayout>;

  /** Les avis de droits de garde émis : ceux d'un client, ou tous ceux d'une période. */
  listCustodyNotices(q?: { userId?: string; period?: string }): Promise<AvisGarde[]>;
  /**
   * Un avis s'émet une fois par client et par période, et la base le garantit :
   * un double prélèvement est l'erreur que personne ne voit passer, parce
   * qu'elle ressemble à un fonctionnement normal.
   */
  createCustodyNotice(input: Omit<AvisGarde, "id" | "ref" | "issuedAt">): Promise<AvisGarde>;

  /** Les épargnes programmées : toutes pour le robot mensuel, celles d'un client pour sa page. */
  listStandingOrders(userId?: string): Promise<StandingOrder[]>;
  createStandingOrder(input: NewStandingOrder): Promise<StandingOrder>;
  updateStandingOrder(id: string, patch: Partial<Pick<StandingOrder, "state" | "lastRunOn" | "stopReason" | "endsOn">>): Promise<StandingOrder>;
  /**
   * Modifier, c'est remplacer : l'ancienne passe à « remplacee » et garde ses
   * ordres, la nouvelle dit laquelle elle remplace. Les deux écritures vont
   * ensemble, sans quoi un client se retrouverait avec deux instructions actives.
   */
  remplacerStandingOrder(id: string, input: NewStandingOrder): Promise<StandingOrder>;

  listWatches(userId?: string): Promise<Watch[]>;
  addWatch(userId: string, offerId: string, snapshot: { hero: string; status: string }, mode?: Watch["mode"]): Promise<Watch>;
  removeWatch(userId: string, offerId: string): Promise<void>;
  updateWatch(id: string, patch: Partial<Pick<Watch, "lastHero" | "lastStatus" | "alertedAt" | "lastDaily">>): Promise<void>;
  /** Client-side updates to reachability (phone, e-mail) : the desk keeps the last one given. */
  updateContact(id: string, patch: Partial<Pick<Contact, "name" | "phone" | "email" | "segment">>): Promise<void>;
  /** The client's personal preferences, set from the account sheet. */
  getPrefs(userId: string): Promise<ClientPrefs>;
  /** The document models' wording: every version (newest first), for one type or all. */
  listTemplateTexts(docType?: TemplateText["docType"]): Promise<TemplateText[]>;
  addTemplateText(t: Omit<TemplateText, "id" | "at" | "version">): Promise<TemplateText>;
  setTemplateTextStatus(id: string, status: TemplateTextStatus, approvedBy?: string): Promise<void>;
  setPrefs(userId: string, p: ClientPrefs): Promise<void>;
  /** Proven channels of a client, and the proof itself (a code, six digits, ten minutes, five tries). */
  /** The legal text the client accepted: its version (a date) and when. */
  getConsent(userId: string): Promise<{ version?: string; at?: string }>;
  /** The client's financial profile, as computed from their answers. */
  getFinancialProfile(userId: string): Promise<FinancialProfile | undefined>;
  setFinancialProfile(userId: string, p: FinancialProfile): Promise<void>;
  setConsent(userId: string, version: string): Promise<void>;
  getChannelStatus(userId: string): Promise<ChannelStatus>;
  markChannelVerified(userId: string, channel: "phone" | "email", target: string): Promise<void>;
  createChannelCode(c: Omit<ChannelCode, "id" | "createdAt" | "attempts">): Promise<ChannelCode>;
  findChannelCode(channel: ProofChannel, target: string): Promise<ChannelCode | undefined>;
  updateChannelCode(id: string, patch: Partial<Pick<ChannelCode, "attempts" | "verifiedAt">>): Promise<void>;
  /** Devices a client trusts for a fast return (passkeys, four-digit codes). */
  listDevices(userId: string): Promise<TrustedDevice[]>;
  findDevice(by: { credentialId?: string; id?: string }): Promise<TrustedDevice | undefined>;
  addDevice(d: Omit<TrustedDevice, "id" | "createdAt" | "failures">): Promise<TrustedDevice>;
  updateDevice(id: string, patch: Partial<Pick<TrustedDevice, "counter" | "failures" | "lastUsedAt" | "name">>): Promise<void>;
  removeDevice(id: string, userId?: string): Promise<void>;
  removeDevices(userId: string, kind?: DeviceKind): Promise<void>;

  /** Browsers that accepted push notifications. */
  listPushSubscriptions(userIds?: string[]): Promise<PushSubscription[]>;
  savePushSubscription(s: Omit<PushSubscription, "id" | "createdAt" | "failures">): Promise<void>;
  removePushSubscription(endpoint: string): Promise<void>;
  markPushFailure(endpoint: string, gone: boolean): Promise<void>;
  /** Outbound messages, whatever the channel. */
  listNotifications(limit?: number): Promise<Notification[]>;
  listInbound(limit?: number): Promise<InboundMessage[]>;
  createInbound(m: Omit<InboundMessage, "id" | "receivedAt"> & { receivedAt?: string }): Promise<InboundMessage>;
  /** Rattacher ou mettre a jour les pieces d'un message : la promotion y pose l'identifiant d'intake. */
  setInboundAttachments(id: string, pieces: PieceGardee[]): Promise<void>;
  markInboundHandled(id: string, by: string): Promise<void>;
  /**
   * L'inverse, qui manquait : « marquer comme traité » était une porte à sens
   * unique, et un clic de trop sortait un fil de la file sans retour.
   */
  markInboundUnhandled(id: string): Promise<void>;
  /** L'état des échanges : traité, reporté, étiqueté. */
  listDeskExchanges(): Promise<DeskExchange[]>;
  /** Poser ou corriger l'état d'un échange. Une valeur nulle efface la sienne. */
  setDeskExchange(convKey: string, patch: Partial<Omit<DeskExchange, "convKey">>, by: string): Promise<void>;
  /** L'état des fils du desk : épinglé, reporté, étiqueté. */
  listDeskThreads(): Promise<DeskThread[]>;
  /** Poser ou corriger l'état d'un fil. Une valeur nulle efface la sienne. */
  setDeskThread(channel: "whatsapp" | "email", addr: string, patch: Partial<Omit<DeskThread, "channel" | "addr">>, by: string): Promise<void>;
  createNotification(n: Omit<Notification, "id" | "createdAt">): Promise<Notification>;
  updateNotification(id: string, patch: Partial<Notification>): Promise<Notification>;

  /** KYC files : one per user. */
  listClientFiles(): Promise<ClientFile[]>;
  getClientFile(id: string): Promise<ClientFile | undefined>;
  getClientFileByUser(userId: string): Promise<ClientFile | undefined>;
  createClientFile(f: Omit<ClientFile, "id">): Promise<ClientFile>;
  updateClientFile(id: string, patch: Partial<ClientFile>): Promise<ClientFile>;

  /** Market data from the BVMAC bulletin (ingested, never typed). */
  listBulletins(limit?: number): Promise<MarketBulletin[]>;
  getBulletin(sessionDate: string): Promise<MarketBulletin | undefined>;
  upsertBulletin(b: MarketBulletin): Promise<MarketBulletin>;
  /** Idempotent on (isin, sessionDate). */
  upsertQuotes(quotes: Quote[]): Promise<void>;
  /** History of one line, most recent first. */
  listQuotes(isin: string, limit?: number): Promise<Quote[]>;
  /** Latest quote of every line. */
  latestQuotes(): Promise<Quote[]>;
  /** Every line quoted at one session. */
  quotesOn(sessionDate: string): Promise<Quote[]>;
  /** Les volumes échangés depuis une date, toutes lignes : de quoi calculer un taux de service. */
  quoteActivity(since: string): Promise<QuoteActivity[]>;
  /** Pour chaque séance, les lignes entrées et sorties depuis la précédente de la série. */
  marketMovements(): Promise<MouvementSeance[]>;
  /** Idempotent on (fundKey, navDate). */
  upsertFundNavs(navs: FundNav[]): Promise<void>;
  listFundNavs(fundKey: string, limit?: number): Promise<FundNav[]>;
  /** Les courbes de plusieurs fonds en une lecture : la liste les emporte, les cartes n'ont plus à les demander. */
  listFundCurves(keys: string[], points?: number): Promise<Map<string, FundCurve>>;
  /** Latest NAV of every fund. */
  latestFundNavs(): Promise<FundNav[]>;
  /**
   * Les dates de VL de tous les fonds depuis une date, et rien d'autre.
   *
   * De quoi lire le RYTHME réel d'un fonds, que sa fréquence déclarée ne
   * donne pas : la section du bulletin où il paraît est un horizon de
   * comparaison, pas une cadence de valorisation. Une seule lecture bornée
   * dans le temps, là où une série par fonds en demanderait quarante-six.
   */
  fundNavDates(since: string): Promise<{ fundKey: string; navDate: string }[]>;

  /**
   * Les résultats des adjudications de la zone, séance par séance.
   *
   * Le filtre porte sur ce que le desk cherche vraiment : les séances d'une de
   * nos lignes (« codeEmission »), ou les comparables d'une offre à venir
   * (instrument et durée). La lecture rend les plus récentes d'abord, parce que
   * c'est la dernière séance qui fait référence.
   */
  listAuctionResults(filter?: { codeEmission?: string; instrument?: AuctionResult["instrument"]; tenor?: string; country?: AuctionResult["country"]; confirmed?: boolean; limit?: number }): Promise<AuctionResult[]>;
  getAuctionResult(id: string): Promise<AuctionResult | undefined>;
  /** Idempotent sur l'URL du communiqué : la pièce est la séance, et on ne saisit pas deux fois la même. */
  upsertAuctionResult(r: NewAuctionResult): Promise<AuctionResult>;
  /** La relecture du desk, et le rattachement à une de nos lignes. */
  /** Un champ « undefined » n'est pas fourni et ne touche pas la colonne : pour effacer, voir reopenAuctionResult. */
  /**
   * Un champ absent ne touche pas sa colonne ; un `null` écrit l'efface.
   *
   * La distinction était déjà celle du mappeur, qui la documente en toutes
   * lettres, mais le type ne la portait pas : effacer une confirmation en
   * écartant une pièce ne se disait pas. Elle se dit maintenant.
   */
  updateAuctionResult(id: string, patch: PatchAuctionResult): Promise<AuctionResult>;
  /** Le seul effacement légitime de la table : la séance repasse « à relire ». */
  reopenAuctionResult(id: string): Promise<AuctionResult>;

  /**
   * Les avis d'annonce de la BEAC : les modalités de l'emprunt, que le
   * communiqué de résultats ne porte jamais.
   *
   * C'est là que le Trésor écrit « Remboursement : In fine », le taux facial,
   * la valeur nominale et le volume émis. Une ligne par document, le
   * regroupement par code d'émission se faisant dans le domaine.
   */
  /**
   * La courbe que la BEAC publie, relevée dans son bulletin mensuel.
   *
   * Elle sert de repère à côté de la nôtre et jamais de source de chiffres :
   * son abscisse est la durée d'émission quand la nôtre est la vie restante, et
   * son univers l'encours quand le nôtre est la dernière séance.
   */
  latestBeacCurve(): Promise<BeacCurveRow | undefined>;
  /** Idempotent sur le numéro : un bulletin ne se republie pas. */
  saveBeacCurve(c: BeacCurveRow): Promise<void>;

  listEmissionNotices(filter?: { codeEmission?: string; country?: EmissionNotice["country"]; confirmed?: boolean; limit?: number }): Promise<EmissionNotice[]>;
  /** Idempotent sur l'adresse du document : la pièce est l'avis. */
  upsertEmissionNotice(n: NewEmissionNotice): Promise<EmissionNotice>;
  /**
   * Un champ « undefined » n'est pas fourni et ne touche pas la colonne ; un
   * null écrit l'efface. Une relecture complète se sert du second, puisqu'elle
   * fait autorité sur la pièce qu'elle vient de lire.
   */
  updateEmissionNotice(id: string, patch: EmissionNoticePatch): Promise<EmissionNotice>;

  /** Documents published by listed companies (collected from the BVMAC site). */
  listIssuerDocuments(mnemo?: string): Promise<IssuerDocument[]>;
  upsertIssuerDocument(d: IssuerDocument): Promise<IssuerDocument>;

  // Actualités : its own table: only published items are readable by everyone.
  listNews(): Promise<NewsItem[]>;
  upsertNews(n: NewsItem): Promise<void>;
  deleteNews(id: string): Promise<void>;
}

export const INTENT_PREFIX: Record<NewIntentInput["type"], string> = {
  appetit: "AP",
  ferme: "PF",
  info: "IN",
  rappel: "RP",
  cession: "CS",
  achat: "OA",
  vente: "OV",
  souscription: "SO",
  rachat: "RA",
};

/** No I, L, O, U, 0 or 1: a reference is read out on the phone and typed on a transfer form. */
const REF_ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";

/**
 * PF-0914-K7Q4 : the operation, the day, then four characters drawn at random.
 * The client quotes this one, and it is the reference of their bank transfer.
 * It carries no rank: an order says nothing about how many the firm has taken.
 */
export function makeRef(type: NewIntentInput["type"], now = new Date()): string {
  const mmdd = `${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const tail = [...bytes].map((b) => REF_ALPHABET[b % REF_ALPHABET.length]).join("");
  return `${INTENT_PREFIX[type]}-${mmdd}-${tail}`;
}

/**
 * PC-ORD-000018 : the order journal, one unbroken sequence, desk and audit only.
 * It is never printed on what a client receives.
 */
export const makeOrderNo = (seq: number): string => `PC-ORD-${String(seq).padStart(6, "0")}`;
