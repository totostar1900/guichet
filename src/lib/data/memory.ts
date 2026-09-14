import { SEED_CONTACTS, SEED_INTAKE, SEED_INTENTS, SEED_OFFERS } from "@/data/seed";
import type { Contact, EventLog, GeneratedDocument, IntakeItem, Intent, Notification, Offer } from "@/lib/domain/types";
import type { ClientFile } from "@/lib/domain/kyc";
import { receivedLabel } from "@/lib/domain/intent";
import { fmt } from "@/lib/format";
import { makeRef, type Repository } from "./repository";

/**
 * In-memory repository backed by the seed. Survives hot reloads via globalThis
 * so the desk sees what the client submitted during a dev session.
 * Not for production — data resets on restart.
 */
interface Store {
  offers: Offer[];
  intents: Intent[];
  events: EventLog[];
  intake: IntakeItem[];
  documents: GeneratedDocument[];
  contacts: Contact[];
  notifications: Notification[];
  clientFiles: ClientFile[];
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
        { id: "e2", at: "2026-09-14T09:05:00", kind: "desk", html: "Desk : prix publiés sur les trois lignes RCA (94 / 93 / 92 %) — clients notifiés" },
        { id: "e3", at: "2026-09-14T09:02:00", kind: "intent", html: "<b>Cession</b> reçue de Groupe Mbaïki SARL sur Rachat OTA 3 ans · 300 titres · réf. CS-0914-016" },
        { id: "e4", at: "2026-09-14T08:41:00", kind: "intent", html: "<b>Appétit</b> reçu d'Assur-Vie Centrale sur OTA 6,50 % · 12 août 2029 · 200 000 000 FCFA · réf. AP-0914-014" },
      ],
      intake: structuredClone(SEED_INTAKE),
      documents: [],
      contacts: structuredClone(SEED_CONTACTS),
      notifications: [],
      clientFiles: [],
      seq: 17,
    };
  }
  // Dev hot-reload can keep an older store shape around.
  if (!g.__guichetStore.intake) g.__guichetStore.intake = structuredClone(SEED_INTAKE);
  if (!g.__guichetStore.documents) g.__guichetStore.documents = [];
  if (!g.__guichetStore.contacts) g.__guichetStore.contacts = structuredClone(SEED_CONTACTS);
  if (!g.__guichetStore.notifications) g.__guichetStore.notifications = [];
  if (!g.__guichetStore.clientFiles) g.__guichetStore.clientFiles = [];
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
      channel: input.channel,
      message: input.message?.trim() || undefined,
      state: "recue",
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
  async upsertOffer(offer) {
    const s = store();
    const i = s.offers.findIndex((x) => x.id === offer.id);
    if (i < 0) s.offers.push(structuredClone(offer));
    else s.offers[i] = structuredClone(offer);
    return structuredClone(offer);
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
  async listNotifications(limit = 50) {
    return structuredClone(store().notifications.slice(0, limit));
  },
  async createNotification(n) {
    const row: Notification = { id: uid(), createdAt: nowIso(), ...n };
    store().notifications.unshift(row);
    return structuredClone(row);
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
};
