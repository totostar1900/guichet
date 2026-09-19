import { SEED_CONTACTS, SEED_INTAKE, SEED_INTENTS, SEED_OFFERS } from "@/data/seed";
import { SEED_NEWS } from "@/data/news-seed";
import type { NewsItem } from "@/lib/news/model";
import { createHash } from "node:crypto";
import { ConflictError, type Approval, type AuditEntry, type ChannelCode, type ChannelStatus, type Contact, type EventLog, type GeneratedDocument, type IntakeItem, type Intent, type Notification, type Offer, type OfferVersion, type PushSubscription, type ReferenceRow, type StaffMember, type TrustedDevice, type Watch, type InboundMessage } from "@/lib/domain/types";
import { emptyClientFile, type ClientFile } from "@/lib/domain/kyc";
import type { FundNav, IssuerDocument, MarketBulletin, Quote } from "@/lib/domain/market";
import { receivedLabel } from "@/lib/domain/intent";
import { fmt } from "@/lib/format";
import { makeRef, type Repository } from "./repository";

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
function seedClientFiles(): ClientFile[] {
  const day = (d: number) => new Date(Date.now() - d * 86400e3).toISOString();
  const jpo = emptyClientFile("c-jpo", "physique", "J.-P. Onana", { phone: "+237600000017", email: "jp.onana@example.cm" });
  const am = emptyClientFile("c-am", "physique", "A. M.", { phone: "+237600000011", email: "a.m@example.com" });
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
      consents: { dataAt: day(2), whatsappAt: day(2), conventionAt: day(2), conventionMethod: "code WhatsApp" },
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
  codes: ChannelCode[];
  devices: TrustedDevice[];
  notifications: Notification[];
  inbound: InboundMessage[];
  watches: Watch[];
  reference: ReferenceRow[];
  staff: StaffMember[];
  versions: OfferVersion[];
  audit: AuditEntry[];
  approvals: Approval[];
  push: PushSubscription[];
  clientFiles: ClientFile[];
  bulletins: MarketBulletin[];
  quotes: Quote[];
  fundNavs: FundNav[];
  issuerDocs: IssuerDocument[];
  news: NewsItem[];
  seq: number;
}

const g = globalThis as unknown as { __guichetStore?: Store };

function store(): Store {
  if (!g.__guichetStore) {
    g.__guichetStore = {
      offers: structuredClone(SEED_OFFERS),
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
      codes: [],
      devices: [],
      notifications: [],
      inbound: seedInbound(),
      watches: [],
      reference: [],
      news: structuredClone(SEED_NEWS),
      versions: [],
      audit: [],
      approvals: [],
      push: [],
      staff: [
        { id: "desk-georges", name: "Georges", email: "georges@purposecapital.africa", role: "responsable", mfaEnrolledAt: "2026-09-01T08:00:00Z" },
        { id: "desk-aline", name: "Aline", email: "aline@purposecapital.africa", role: "desk" },
      ],
      clientFiles: seedClientFiles(),
      bulletins: [],
      quotes: [],
      fundNavs: [],
      issuerDocs: [],
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
  if (!g.__guichetStore.staff) g.__guichetStore.staff = [{ id: "desk-georges", name: "Georges", email: "georges@purposecapital.africa", role: "responsable", mfaEnrolledAt: "2026-09-01T08:00:00Z" }];
  if (!g.__guichetStore.reference) g.__guichetStore.reference = [];
  if (!g.__guichetStore.versions) g.__guichetStore.versions = [];
  if (!g.__guichetStore.audit) g.__guichetStore.audit = [];
  if (!g.__guichetStore.approvals) g.__guichetStore.approvals = [];
  if (!g.__guichetStore.push) g.__guichetStore.push = [];
  if (!g.__guichetStore.bulletins) g.__guichetStore.bulletins = [];
  if (!g.__guichetStore.quotes) g.__guichetStore.quotes = [];
  if (!g.__guichetStore.fundNavs) g.__guichetStore.fundNavs = [];
  if (!g.__guichetStore.issuerDocs) g.__guichetStore.issuerDocs = [];
  if (!g.__guichetStore.news) g.__guichetStore.news = structuredClone(SEED_NEWS);
  return g.__guichetStore;
}

const nowIso = () => new Date().toISOString();
const uid = () => Math.random().toString(36).slice(2, 10);

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
      ref: makeRef(input.type, s.seq),
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
  async setIntentState(id, state) {
    const s = store();
    const it = s.intents.find((x) => x.id === id);
    if (!it) throw new Error(`Intent ${id} not found`);
    it.state = state;
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
  async listWatches(userId) {
    return structuredClone(store().watches.filter((w) => !userId || w.userId === userId));
  },
  async addWatch(userId, offerId, snapshot) {
    const existing = store().watches.find((w) => w.userId === userId && w.offerId === offerId);
    if (existing) return structuredClone(existing);
    const w: Watch = { id: uid(), userId, offerId, lastHero: snapshot.hero, lastStatus: snapshot.status, createdAt: nowIso() };
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
    const row: InboundMessage = { id: uid(), ...m, receivedAt: m.receivedAt ?? nowIso() };
    store().inbound.unshift(row);
    return structuredClone(row);
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
    const f = store().clientFiles.find((x) => x.userId === userId);
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
  async latestFundNavs() {
    const latest = new Map<string, FundNav>();
    for (const n of store().fundNavs) {
      const cur = latest.get(n.fundKey);
      if (!cur || n.navDate > cur.navDate) latest.set(n.fundKey, n);
    }
    return structuredClone([...latest.values()].sort((a, b) => a.name.localeCompare(b.name)));
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
