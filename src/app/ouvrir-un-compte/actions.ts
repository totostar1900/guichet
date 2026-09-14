"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createHash } from "node:crypto";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { emptyClientFile, type ClientFile, type ClientKind, type KycDocKind, type KycPerson } from "@/lib/domain/kyc";
import { saveSource } from "@/lib/intake/storage";
import { DOC_LABEL, missingForSubmission } from "@/lib/kyc/checklist";

export type StepResult = { ok: true; message?: string; code?: string } | { ok: false; error: string };

const PATH = "/ouvrir-un-compte";

async function myFile(): Promise<{ file: ClientFile; userId: string; name: string }> {
  const s = await requireSession(PATH);
  const r = repo();
  let f = await r.getClientFileByUser(s.userId);
  if (!f) f = await r.createClientFile(emptyClientFile(s.userId, "physique", s.name, { phone: s.phone, email: s.email }));
  return { file: f, userId: s.userId, name: s.name };
}

const editable = (f: ClientFile) => f.status === "brouillon" || f.status === "complements";
const str = (form: FormData, k: string) => {
  const v = form.get(k);
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
};

/* ---------- 1. Type de client ---------- */
export async function setKindAction(form: FormData): Promise<void> {
  const { file } = await myFile();
  const kind = z.enum(["physique", "morale", "groupement", "institutionnel"]).safeParse(form.get("kind"));
  if (!kind.success || !editable(file)) return;
  await repo().updateClientFile(file.id, { kind: kind.data as ClientKind, profile: { ...file.profile, category: kind.data === "institutionnel" ? "professionnel" : "non_professionnel" } });
  revalidatePath(PATH);
}

/* ---------- 2. Identité ---------- */
export async function saveIdentityAction(_p: StepResult | null, form: FormData): Promise<StepResult> {
  const { file } = await myFile();
  if (!editable(file)) return { ok: false, error: "Dossier en cours de revue : il n'est plus modifiable." };
  const identity: ClientFile["identity"] = {
    ...file.identity,
    name: str(form, "name") ?? file.identity.name,
    phone: str(form, "phone"),
    email: str(form, "email"),
    address: str(form, "address"),
    city: str(form, "city"),
    country: str(form, "country") ?? "Cameroun",
    residentAbroad: form.get("residentAbroad") === "on",
    birthDate: str(form, "birthDate"),
    nationality: str(form, "nationality"),
    profession: str(form, "profession"),
    taxId: str(form, "taxId"),
    idType: str(form, "idType"),
    idNumber: str(form, "idNumber"),
    idExpiresOn: str(form, "idExpiresOn"),
    registration: str(form, "registration"),
    legalForm: str(form, "legalForm"),
    decisionRule: str(form, "decisionRule"),
  };
  if (!identity.name) return { ok: false, error: "Le nom est obligatoire." };
  if (!identity.phone && !identity.email) return { ok: false, error: "Indiquez un téléphone WhatsApp ou une adresse e-mail." };
  if (identity.phone && !/^\+?\d{8,15}$/.test(identity.phone.replace(/\s/g, ""))) return { ok: false, error: "Téléphone au format international, ex. +237 6 87 67 67 67." };
  if (identity.phone) identity.phone = `+${identity.phone.replace(/[^\d]/g, "")}`;
  await repo().updateClientFile(file.id, { identity });
  revalidatePath(PATH);
  return { ok: true, message: "Identité enregistrée." };
}

/* ---------- 2b. Personnes (représentants, mandataires, bénéficiaires) ---------- */
export async function addPersonAction(_p: StepResult | null, form: FormData): Promise<StepResult> {
  const { file } = await myFile();
  if (!editable(file)) return { ok: false, error: "Dossier non modifiable." };
  const p = z.object({ role: z.enum(["representant", "mandataire", "beneficiaire_effectif"]), name: z.string().trim().min(2), idNumber: z.string().trim().optional(), share: z.coerce.number().min(0).max(100).optional(), pep: z.string().optional() }).safeParse(Object.fromEntries(form));
  if (!p.success) return { ok: false, error: "Nom et rôle sont obligatoires." };
  const person: KycPerson = { role: p.data.role, name: p.data.name, idNumber: p.data.idNumber || undefined, share: p.data.share || undefined, pep: p.data.pep === "on" };
  await repo().updateClientFile(file.id, { persons: [...file.persons, person] });
  revalidatePath(PATH);
  return { ok: true };
}

export async function removePersonAction(form: FormData): Promise<void> {
  const { file } = await myFile();
  if (!editable(file)) return;
  const idx = Number(form.get("index"));
  await repo().updateClientFile(file.id, { persons: file.persons.filter((_, i) => i !== idx) });
  revalidatePath(PATH);
}

/* ---------- 3. Pièces ---------- */
const DOC_KINDS = Object.keys(DOC_LABEL) as KycDocKind[];
const ACCEPTED = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

export async function uploadDocAction(_p: StepResult | null, form: FormData): Promise<StepResult> {
  const { file, userId } = await myFile();
  if (!editable(file)) return { ok: false, error: "Dossier non modifiable." };
  const kind = form.get("kind");
  const f = form.get("file");
  if (typeof kind !== "string" || !DOC_KINDS.includes(kind as KycDocKind)) return { ok: false, error: "Type de pièce inconnu." };
  if (!(f instanceof File) || f.size === 0) return { ok: false, error: "Choisissez un fichier (photo ou PDF)." };
  if (f.size > 15 * 1024 * 1024) return { ok: false, error: "Fichier trop lourd (15 Mo max)." };
  const mime = f.type || "application/octet-stream";
  if (!ACCEPTED.includes(mime)) return { ok: false, error: "Formats acceptés : photo (JPEG, PNG, WebP) ou PDF." };
  const ext = f.name.split(".").pop()?.toLowerCase() ?? "bin";
  const fileKey = `kyc/${userId}/${kind}-${Date.now().toString(36)}.${ext}`;
  await saveSource(fileKey, new Uint8Array(await f.arrayBuffer()), mime);
  const docs = file.documents.filter((d) => d.kind !== kind);
  docs.push({ kind: kind as KycDocKind, fileKey, fileName: f.name, mimeType: mime, uploadedAt: new Date().toISOString() });
  await repo().updateClientFile(file.id, { documents: docs });
  revalidatePath(PATH);
  return { ok: true, message: `${DOC_LABEL[kind as KycDocKind]} reçue.` };
}

/* ---------- 4. Origine des fonds, PPE, questionnaire ---------- */
export async function saveFundsProfileAction(_p: StepResult | null, form: FormData): Promise<StepResult> {
  const { file } = await myFile();
  if (!editable(file)) return { ok: false, error: "Dossier non modifiable." };
  const funds: ClientFile["funds"] = { source: str(form, "source"), expectedAmount: str(form, "expectedAmount"), bankName: str(form, "bankName"), bankAccount: str(form, "bankAccount")?.replace(/\s+/g, " ").trim(), bankHolder: str(form, "bankHolder"), pep: form.get("pep") === "on", pepDetails: str(form, "pepDetails") };
  const profile: ClientFile["profile"] = { ...file.profile, objectives: str(form, "objectives"), horizon: str(form, "horizon"), experience: str(form, "experience"), riskTolerance: str(form, "riskTolerance"), lossCapacity: str(form, "lossCapacity") };
  if (!funds.source) return { ok: false, error: "Indiquez l'origine des fonds." };
  await repo().updateClientFile(file.id, { funds, profile });
  revalidatePath(PATH);
  return { ok: true, message: "Profil enregistré." };
}

/* ---------- 5. Consentements et convention (acceptation par code) ---------- */
const hash = (code: string) => createHash("sha256").update(`${process.env.AUTH_SECRET ?? "guichet"}:${code}`).digest("hex");

export async function sendConventionCodeAction(_p: StepResult | null, form: FormData): Promise<StepResult> {
  const { file } = await myFile();
  if (!editable(file)) return { ok: false, error: "Dossier non modifiable." };
  const data = form.get("data") === "on";
  if (!data) return { ok: false, error: "Le consentement au traitement des données est nécessaire pour ouvrir un compte." };
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const consents = { ...file.consents, dataAt: file.consents.dataAt ?? new Date().toISOString(), whatsappAt: form.get("whatsapp") === "on" ? (file.consents.whatsappAt ?? new Date().toISOString()) : undefined, pendingCodeHash: hash(code), pendingCodeAt: new Date().toISOString() };
  await repo().updateClientFile(file.id, { consents });
  const { notifyCode } = await import("@/lib/kyc/notify");
  const via = await notifyCode(file, code);
  revalidatePath(PATH);
  return { ok: true, message: via === "demo" ? "Mode démonstration : le code s'affiche ci-dessous." : `Code envoyé par ${via}.`, code: via === "demo" ? code : undefined };
}

export async function verifyConventionCodeAction(_p: StepResult | null, form: FormData): Promise<StepResult> {
  const { file } = await myFile();
  const code = String(form.get("code") ?? "").replace(/\s/g, "");
  const { pendingCodeHash, pendingCodeAt, ...rest } = file.consents;
  if (!pendingCodeHash || !pendingCodeAt || Date.now() - new Date(pendingCodeAt).getTime() > 10 * 60_000) return { ok: false, error: "Code expiré : demandez-en un nouveau." };
  if (hash(code) !== pendingCodeHash) return { ok: false, error: "Code incorrect." };
  await repo().updateClientFile(file.id, { consents: { ...rest, conventionAt: new Date().toISOString(), conventionMethod: "code à usage unique" } });
  revalidatePath(PATH);
  return { ok: true, message: "Convention acceptée." };
}

/* ---------- 6. Soumettre ---------- */
export async function submitFileAction(): Promise<StepResult> {
  const { file } = await myFile();
  if (!editable(file)) return { ok: false, error: "Dossier déjà soumis." };
  const miss = missingForSubmission(file);
  if (miss.length) return { ok: false, error: `Il manque : ${miss.join(", ")}.` };
  const r = repo();
  await r.updateClientFile(file.id, { status: "soumis", submittedAt: new Date().toISOString() });
  await r.logEvent({ kind: "system", html: `<b>Dossier client soumis</b> — ${file.identity.name} (${file.kind}) — à revoir dans Desk › Clients` });
  revalidatePath(PATH);
  revalidatePath("/desk/clients");
  redirect(`${PATH}?soumis=1`);
}
