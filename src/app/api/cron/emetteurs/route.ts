import type { NextRequest } from "next/server";
import { routeDuRobot } from "@/lib/cron/tour";
import { collectIssuerDocuments } from "@/lib/companies/collect";

export const maxDuration = 300;

/** Weekly: new documents published by the listed companies on the BVMAC site are catalogued and archived. */
export async function GET(req: NextRequest) {
  return routeDuRobot("emetteurs", req, async () => {
    const out = await collectIssuerDocuments();
    return ({ seen: out.seen, added: out.added.map((d) => `${d.mnemo} · ${d.title}`), skipped: out.skipped, errors: out.errors });
  });
}
