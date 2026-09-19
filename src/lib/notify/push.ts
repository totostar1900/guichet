import "server-only";
import webpush from "web-push";
import { repo } from "@/lib/data";
import type { PushSubscription } from "@/lib/domain/types";

/** Web push (VAPID): free, instant, works on the phones that installed the Guichet. */
export const pushConfigured = (): boolean => Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

let ready = false;
function setup() {
  if (ready) return;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:info@purposecapital.africa", process.env.VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
  ready = true;
}

export interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag?: string;
}

/** Sends to one subscription; a 404/410 means the browser unsubscribed : the row is dropped. */
export async function sendPush(sub: PushSubscription, payload: PushPayload): Promise<void> {
  setup();
  try {
    await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, JSON.stringify(payload), { TTL: 6 * 3600, urgency: "high" });
  } catch (e) {
    const code = (e as { statusCode?: number }).statusCode;
    await repo().markPushFailure(sub.endpoint, code === 404 || code === 410);
    throw e;
  }
}
