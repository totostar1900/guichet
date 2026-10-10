"use server";

import { revalidatePath } from "next/cache";
import type { RegistrationResponseJSON } from "@simplewebauthn/server";
import { requireSession } from "@/lib/auth";
import { noter } from "@/lib/journal";
import type { TrustedDevice } from "@/lib/domain/types";

/** Enrolling and forgetting the devices a client trusts; the sign-in side lives in /connexion/actions. */

export async function beginPasskey() {
  const s = await requireSession("/moi/securite");
  const { passkeyRegistrationOptions } = await import("@/lib/auth/devices");
  return passkeyRegistrationOptions(s);
}

export async function finishPasskey(response: RegistrationResponseJSON, name: string): Promise<{ ok: true; device: TrustedDevice } | { ok: false; error: string }> {
  const s = await requireSession("/moi/securite");
  const { passkeyRegister } = await import("@/lib/auth/devices");
  const r = await passkeyRegister(s, response, name);
  if (r.ok) {
    await noter("securite.clef.enrolee", { objet: r.device.id, detail: name });
    revalidatePath("/moi/securite");
  }
  return r;
}

export async function enrolPin(token: string, pin: string, name: string): Promise<{ ok: true; device: TrustedDevice } | { ok: false; error: string }> {
  const s = await requireSession("/moi/securite");
  const { pinEnrol } = await import("@/lib/auth/devices");
  const r = await pinEnrol(s, token, pin, name);
  if (r.ok) {
    await noter("securite.code.pose", { objet: r.device.id, detail: name });
    revalidatePath("/moi/securite");
  }
  return r;
}

export async function forgetDeviceAction(id: string): Promise<void> {
  const s = await requireSession("/moi/securite");
  const { forgetDevice } = await import("@/lib/auth/devices");
  await forgetDevice(s, id);
  await noter("securite.appareil.oublie", { objet: id });
  revalidatePath("/moi/securite");
}
