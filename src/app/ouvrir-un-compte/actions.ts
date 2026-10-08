"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { attenteAvantRenvoi, empreinte, nouveauCode, verifier } from "@/lib/signature/code";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { emptyClientFile, type ClientFile, type ClientKind, type KycDocKind, type KycPerson } from "@/lib/domain/kyc";
import { saveSource } from "@/lib/intake/storage";
import { conventionAJour, conventionSignable, DOC_LABEL, missingForSubmission } from "@/lib/kyc/checklist";

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
  /* UN CONTACT NE S'EFFACE PAS EN LE LAISSANT VIDE.
     Le nom avait son repli, le téléphone et l'adresse n'en avaient pas :
     enregistrer la section avec la case vidée supprimait le contact du dossier,
     alors que la session, elle, le connaissait toujours. Le garde-fou en dessous
     laissait passer dès qu'il restait l'autre des deux. Vider un champ n'est
     jamais une demande de suppression ici : c'est le remplacer qui compte, et le
     client change de canal dans Sécurité, où un code le prouve. */
  const identity: ClientFile["identity"] = {
    ...file.identity,
    name: str(form, "name") ?? file.identity.name,
    phone: str(form, "phone") ?? file.identity.phone,
    email: str(form, "email") ?? file.identity.email,
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
const ACCEPTED = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

export async function uploadDocAction(_p: StepResult | null, form: FormData): Promise<StepResult> {
  const { file, userId } = await myFile();
  if (!editable(file)) return { ok: false, error: "Dossier non modifiable." };
  const kind = form.get("kind");
  const f = form.get("file");
  if (typeof kind !== "string" || !DOC_KINDS.includes(kind as KycDocKind)) return { ok: false, error: "Type de pièce inconnu." };
  if (!(f instanceof File) || f.size === 0) return { ok: false, error: "Choisissez un fichier (photo ou PDF)." };
  if (f.size > 15 * 1024 * 1024) return { ok: false, error: "Fichier trop lourd (15 Mo max)." };
  const mime = f.type || "application/octet-stream";
  if (!ACCEPTED.includes(mime)) return { ok: false, error: "Formats acceptés : photo (JPEG, PNG, WebP, HEIC) ou PDF." };
  const ext = f.name.split(".").pop()?.toLowerCase() ?? "bin";
  const fileKey = `kyc/${userId}/${kind}-${Date.now().toString(36)}.${ext}`;
  await saveSource(fileKey, new Uint8Array(await f.arrayBuffer()), mime);
  /* UNE PIÈCE ATTENDUE SE REMPLACE, UNE PIÈCE LIBRE S'AJOUTE.
     La règle était « un document par genre », et elle est juste pour les pièces
     attendues : un nouveau recto remplace l'ancien, sans quoi le dossier
     porterait deux rectos et personne ne saurait lequel vaut. Appliquée au
     genre « autre », elle voulait dire qu'un client ne pouvait joindre qu'UNE
     SEULE pièce libre, pour toujours : la deuxième effaçait la première, en
     silence. */
  const libre = kind === "autre";
  const label = libre ? String(form.get("label") ?? "").trim().slice(0, 80) || undefined : undefined;
  const docs = libre ? [...file.documents] : file.documents.filter((d) => d.kind !== kind);
  docs.push({ kind: kind as KycDocKind, label, fileKey, fileName: f.name, mimeType: mime, uploadedAt: new Date().toISOString() });
  await repo().updateClientFile(file.id, { documents: docs });
  revalidatePath(PATH);
  return { ok: true, message: `${label ?? DOC_LABEL[kind as KycDocKind]} reçue.` };
}

/**
 * Retirer une pièce jointe par erreur.
 *
 * On pouvait en envoyer et jamais en reprendre : une photo floue, une mauvaise
 * page, et elle restait au dossier jusqu'à ce qu'un conseiller la voie. Tant
 * que le dossier n'est pas soumis, il appartient encore au client.
 *
 * La clef du fichier identifie la pièce : deux pièces libres peuvent porter le
 * même genre et le même libellé, jamais la même clef.
 */
export async function removeDocAction(_p: StepResult | null, form: FormData): Promise<StepResult> {
  const { file } = await myFile();
  if (!editable(file)) return { ok: false, error: "Dossier non modifiable." };
  const fileKey = String(form.get("fileKey") ?? "");
  const doc = file.documents.find((d) => d.fileKey === fileKey);
  if (!doc) return { ok: false, error: "Pièce introuvable." };
  await repo().updateClientFile(file.id, { documents: file.documents.filter((d) => d.fileKey !== fileKey) });
  revalidatePath(PATH);
  return { ok: true, message: `${doc.label ?? DOC_LABEL[doc.kind]} retirée.` };
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

/* ---------- 5a. Consentements (ce qu'il faut pour envoyer le dossier) ---------- */
/**
 * Le consentement au traitement des données se donne à l'envoi du dossier : sans
 * lui, le desk n'a pas le droit d'instruire. Il est séparé de l'acceptation de la
 * convention, qui vient après l'approbation ; les deux tenaient dans un seul
 * bouton, et le client signait donc avant de savoir si son compte serait ouvert.
 */
export async function saveConsentsAction(_p: StepResult | null, form: FormData): Promise<StepResult> {
  const { file } = await myFile();
  if (!editable(file)) return { ok: false, error: "Dossier en cours de revue : il n'est plus modifiable." };
  if (form.get("data") !== "on") return { ok: false, error: "Le consentement au traitement des données est nécessaire pour ouvrir un compte." };
  const now = new Date().toISOString();
  const consents = { ...file.consents, dataAt: file.consents.dataAt ?? now, whatsappAt: form.get("whatsapp") === "on" ? (file.consents.whatsappAt ?? now) : undefined };
  await repo().updateClientFile(file.id, { consents });
  revalidatePath(PATH);
  return { ok: true, message: "Consentements enregistrés." };
}

/* ---------- 5b. Convention : acceptation par code, après l'approbation ---------- */
// La mécanique du code vit dans lib/signature/code : elle sert aussi à signer un ordre.

// La signature reste celle de useActionState : le formulaire ne porte plus rien, les consentements ont leur propre action.
export async function sendConventionCodeAction(_p: StepResult | null, _form: FormData): Promise<StepResult> {
  const { file, userId } = await myFile();
  /* ON LIT LA RÈGLE, PAS LA DATE. « conventionAt existe » voulait dire
     « déjà acceptée » : à la première reprise du texte, la date était là et
     ce garde refusait le code sans que rien sur la page ne le laisse prévoir.
     Troisième endroit du même jour à confondre la date et la question. */
  if (!conventionSignable(file)) return { ok: false, error: conventionAJour(file) ? "Convention déjà acceptée." : "La convention s'accepte dès que votre dossier est approuvé : nous vous prévenons de la décision." };
  if (!file.consents.dataAt) return { ok: false, error: "Donnez d'abord votre consentement au traitement des données." };
  const attente = attenteAvantRenvoi(file.consents.pendingCodeAt);
  if (attente) return { ok: false, error: `Un code vient de partir. Attendez ${attente} secondes avant d'en demander un autre.` };
  const { canalDuCode, nommerCanal } = await import("@/lib/kyc/canal");
  const canal = await canalDuCode(userId, file);
  const code = nouveauCode();
  const { notifyCode } = await import("@/lib/kyc/notify");
  const envoi = await notifyCode(file, code, canal);
  /* L'ancien code n'est remplacé que si le nouveau est bien parti : un envoi
     refusé par le fournisseur brûlait le code que le client avait peut-être
     sous les yeux. */
  if (envoi.via === "echec") return { ok: false, error: `Le code n'a pas pu partir vers ${envoi.to} : ${envoi.raison}. Réessayez dans un instant ; si cela se répète, écrivez-nous depuis vos messages et nous l'enverrons autrement.` };
  await repo().updateClientFile(file.id, { consents: { ...file.consents, pendingCodeHash: empreinte(code), pendingCodeAt: new Date().toISOString(), pendingCodeTries: 0, pendingCodeTo: canal?.to } });
  revalidatePath(PATH);
  if (envoi.via === "demo") return { ok: true, message: "Mode démonstration : le code s'affiche ci-dessous.", code };
  return { ok: true, message: `Code envoyé par ${nommerCanal(canal)}.` };
}

export async function verifyConventionCodeAction(_p: StepResult | null, form: FormData): Promise<StepResult> {
  const { file } = await myFile();
  if (conventionAJour(file)) return { ok: true, message: "Convention déjà acceptée." };
  if (!conventionSignable(file)) return { ok: false, error: "La convention s'accepte dès que votre dossier est approuvé." };
  const { pendingCodeHash, pendingCodeAt, pendingCodeTries, pendingCodeTo, ...rest } = file.consents;
  const verdict = verifier(String(form.get("code") ?? ""), { hash: pendingCodeHash, at: pendingCodeAt, tries: pendingCodeTries, to: pendingCodeTo });
  if (!verdict.ok) {
    // Un essai raté se compte : c'est ce qui finit par brûler le code.
    if (verdict.essais !== (pendingCodeTries ?? 0)) {
      await repo().updateClientFile(file.id, { consents: { ...file.consents, pendingCodeTries: verdict.essais } });
      revalidatePath(PATH);
    }
    return { ok: false, error: verdict.erreur };
  }
  const r = repo();
  const { CONVENTION_VERSION } = await import("@/data/legal");
  const updated = await r.updateClientFile(file.id, { consents: { ...rest, conventionAt: new Date().toISOString(), conventionMethod: "code à usage unique", conventionTo: pendingCodeTo, conventionVersion: CONVENTION_VERSION } });
  /* La convention se produit maintenant, parce que c'est maintenant qu'elle est
     signée : à l'approbation, elle sortait en portant « non acceptée ». */
  const { generateKycDocument } = await import("@/lib/documents/generate");
  await generateKycDocument("convention", updated);
  await r.logEvent({ kind: "system", html: `<b>Convention acceptée</b> par ${updated.identity.name}${pendingCodeTo ? ` (code envoyé à ${pendingCodeTo})` : ""}` });
  revalidatePath(PATH);
  revalidatePath("/desk/clients");
  return { ok: true, message: "Convention acceptée. Votre exemplaire est dans vos documents." };
}

/* ---------- 6. Soumettre ---------- */
export async function submitFileAction(): Promise<StepResult> {
  const { file } = await myFile();
  if (!editable(file)) return { ok: false, error: "Dossier déjà soumis." };
  const miss = missingForSubmission(file);
  if (miss.length) return { ok: false, error: `Il manque : ${miss.join(", ")}.` };
  const r = repo();
  await r.updateClientFile(file.id, { status: "soumis", submittedAt: new Date().toISOString() });
  await r.logEvent({ kind: "system", html: `<b>Dossier client soumis</b>, ${file.identity.name} (${file.kind}), à revoir dans Desk › Clients` });
  revalidatePath(PATH);
  revalidatePath("/desk/clients");
  redirect(`${PATH}?soumis=1`);
}
