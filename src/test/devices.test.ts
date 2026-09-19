import { beforeAll, describe, expect, it, vi } from "vitest";
import type { Session } from "@/lib/auth/types";

/**
 * A four-digit code bound to a browser: enrolled, opened, refused, forgotten
 * after five wrong codes. Dev backend, in-memory repository, cookies faked.
 */
const client: Session = { userId: "dev-client-awa-ndongo", role: "client", name: "Awa Ndongo", email: "awa@example.com", segment: "Personne physique", tier: 1, provider: "dev", mfaEnrolled: true, mfaVerified: true };
const jar = new Map<string, string>();

vi.mock("@/lib/auth", () => ({ authMode: () => "dev", getSession: async () => client, requireSession: async () => client }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (k: string) => (jar.has(k) ? { value: jar.get(k) } : undefined), set: (k: string, v: string) => jar.set(k, v), delete: (k: string) => jar.delete(k), getAll: () => [] }),
  headers: async () => new Headers({ host: "localhost:3000" }),
}));

beforeAll(() => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
});

describe("four-digit code bound to a device", () => {
  it("enrols, opens, counts failures, forgets at five", async () => {
    const { pinEnrol, pinAuthenticate, newDeviceToken } = await import("@/lib/auth/devices");
    const { repo } = await import("@/lib/data");
    const token = newDeviceToken();

    expect((await pinEnrol(client, token, "1234", "Test")).ok).toBe(false); // too simple
    expect((await pinEnrol(client, token, "12", "Test")).ok).toBe(false);
    const e = await pinEnrol(client, token, "2580", "Chrome sur Windows");
    expect(e.ok).toBe(true);
    if (!e.ok) return;
    expect((await repo().listDevices(client.userId)).map((d) => d.kind)).toEqual(["pin"]);

    // The right code with the wrong token opens nothing: the code is worth nothing off this browser.
    expect((await pinAuthenticate(e.device.id, newDeviceToken(), "2580")).ok).toBe(false);
    // The right pair mints a dev session cookie.
    const ok = await pinAuthenticate(e.device.id, token, "2580");
    expect(ok.ok).toBe(true);
    expect(jar.get("guichet_dev_session")).toBeTruthy();

    // Five wrong codes and the device is gone.
    let last;
    for (let i = 0; i < 5; i++) last = await pinAuthenticate(e.device.id, token, "0000");
    expect(last && !last.ok && last.forgotten).toBe(true);
    expect(await repo().listDevices(client.userId)).toEqual([]);
  });
});
