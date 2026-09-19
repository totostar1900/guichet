import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ authMode: () => "dev" }));

/** The signed line link: bound to a number, forged or stale ones read as nothing. */
describe("line link from the desk's WhatsApp reply", () => {
  it("vouches for the number it was made for", async () => {
    const { signLineLink, readLineLink } = await import("@/lib/channels");
    const tok = signLineLink("6 87 67 67 67");
    expect(readLineLink(tok)).toBe("+237687676767");
    expect(readLineLink(tok.slice(0, -2) + "zz")).toBeNull();
    expect(readLineLink(undefined)).toBeNull();
    expect(readLineLink("abc")).toBeNull();
  });
});
