import { NextResponse, type NextRequest } from "next/server";
import { collectIssuerDocuments } from "@/lib/companies/collect";

export const maxDuration = 300;

/** Weekly: new documents published by the listed companies on the BVMAC site are catalogued and archived. */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) return new NextResponse("Unauthorized", { status: 401 });
  const out = await collectIssuerDocuments();
  return NextResponse.json({ seen: out.seen, added: out.added.map((d) => `${d.mnemo} · ${d.title}`), skipped: out.skipped, errors: out.errors });
}
