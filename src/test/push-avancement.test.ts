import { describe, expect, it } from "vitest";
import { repo } from "@/lib/data";
import { notifyIntentUpdated } from "@/lib/notify/dispatch";
import type { Intent, Offer } from "@/lib/domain/types";

/**
 * Le push porte l'avancement d'un ordre, et pas seulement les opportunités.
 *
 * Il ne partait que pour les lignes nouvellement ouvertes : un client qui
 * installe le Guichet et accepte les alertes recevait « une nouvelle ligne est
 * ouverte » et jamais « votre ordre est servi ». L'une se lit à loisir, l'autre
 * engage son argent.
 *
 * Ce cliquet tient les deux choses qui retomberaient sans bruit : que le canal
 * soit visé, et que la ligne s'écrive même sans VAPID, pour que le desk voie ce
 * qui SERAIT parti. Rien n'est envoyé ici : sans clefs, l'envoi est « écarté ».
 */
const offre = (): Offer =>
  ({
    id: "o-push",
    kind: "OTA",
    title: "OTA de test",
    issuer: "Trésor",
    country: "CM",
    countryName: "Cameroun",
    isin: "CM0000000001",
    nominal: 10_000,
    deadlineAt: "2026-12-01T12:00:00",
    settleOn: "2026-12-05",
    status: "published",
    operation: "emission",
    documents: [],
  }) as unknown as Offer;

describe("le push suit l'ordre, pas seulement les opportunités", () => {
  it("écrit une ligne par appareil, et l'écarte faute de clefs", async () => {
    const r = repo();
    const userId = "u-push";
    await r.savePushSubscription({ userId, endpoint: "https://push.example/sub-un", keys: { p256dh: "x", auth: "y" } } as never);
    await r.savePushSubscription({ userId, endpoint: "https://push.example/sub-deux", keys: { p256dh: "x", auth: "y" } } as never);

    // Le contact se déduit de l'intention quand le répertoire n'en a pas : c'est
    // le chemin d'un prospect, et il porte quand même l'identifiant du client.
    const intent = { id: "i-push", ref: "PF-TEST-0001", clientId: userId, clientName: "Awa Ndongo", clientSegment: "Personne physique", contactPhone: "+237600000001", contactEmail: "awa@example.com", offerId: "o-push", type: "ferme", state: "servie", amount: 1_000_000, createdAt: new Date().toISOString() } as unknown as Intent;
    await notifyIntentUpdated(intent, offre(), "servie");

    const notes = (await r.listNotifications(100)).filter((n) => n.intentId === "i-push" && n.channel === "push");
    // Une par appareil : un téléphone désinscrit ne doit pas faire croire que la
    // tablette n'a rien reçu.
    expect(notes).toHaveLength(2);
    // Le titre dit l'état, et non « Guichet » : c'est ce qu'on lit sans ouvrir.
    expect(notes[0].subject).toBe("Votre ordre est servi");
    // Sans VAPID, la ligne existe et dit pourquoi elle n'est pas partie.
    expect(notes.every((n) => n.status === "skipped" || n.status === "sent")).toBe(true);
  });
});
