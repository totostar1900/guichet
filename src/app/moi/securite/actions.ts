"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { noter } from "@/lib/journal";
import type { TrustedDevice } from "@/lib/domain/types";

/** Enrolling and forgetting the devices a client trusts; the sign-in side lives in /connexion/actions. */

export async function enrolPin(token: string, pin: string, name: string): Promise<{ ok: true; device: TrustedDevice } | { ok: false; error: string }> {
  const s = await requireSession("/moi/securite");
  const { pinEnrol } = await import("@/lib/auth/devices");
  const r = await pinEnrol(s, token, pin, name);
  if (r.ok) {
    await noter("securite.code.pose", { objet: r.device.id, detail: name });
    /* Le serveur garde aussi l'appareil, au cas où Safari efface le stockage du navigateur. */
    const { retenirAppareil } = await import("@/lib/auth/appareil-cookie");
    const prenom = s.name.includes("@") ? "" : (s.name.trim().split(/\s+/)[0] ?? "");
    await retenirAppareil({ id: r.device.id, token, who: prenom, name: r.device.name });
    revalidatePath("/moi/securite");
  }
  return r;
}

export async function forgetDeviceAction(id: string): Promise<void> {
  const s = await requireSession("/moi/securite");
  const { forgetDevice } = await import("@/lib/auth/devices");
  await forgetDevice(s, id);
  const { oublierAppareil } = await import("@/lib/auth/appareil-cookie");
  await oublierAppareil(id);
  await noter("securite.appareil.oublie", { objet: id });
  revalidatePath("/moi/securite");
}
