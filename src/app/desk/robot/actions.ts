"use server";

import { requireDesk } from "@/lib/auth";
import { answerInbound, botAvailable, type BotAnswer } from "@/lib/bot/reply";

export type BotTest = { ok: true; answer: BotAnswer; contactName?: string; createdRef?: string } | { ok: false; error: string };

/** Runs the robot on a message as if it came from `phone` : no WhatsApp send; intents are created only when `live` is checked. */
export async function testBotAction(_p: BotTest | null, form: FormData): Promise<BotTest> {
  await requireDesk("/desk/robot");
  if (!botAvailable()) return { ok: false, error: "Robot indisponible : ANTHROPIC_API_KEY absente (ou BOT_ENABLED=0)." };
  const phone = String(form.get("phone") ?? "").trim();
  const text = String(form.get("text") ?? "").trim();
  if (!phone || !text) return { ok: false, error: "Numéro et message requis." };
  try {
    const { answer, contact, createdRef } = await answerInbound(phone, text, { dryRun: form.get("live") !== "on" });
    return { ok: true, answer, contactName: contact?.name, createdRef };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur du robot." };
  }
}
