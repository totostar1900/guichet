import { NextResponse, type NextRequest } from "next/server";
import { checkLinks, watchSources } from "@/lib/news/watch";

export const maxDuration = 300;

/** Nightly: new links on the followed sites land in « Liens reçus »; every published link is pinged. */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) return new NextResponse("Unauthorized", { status: 401 });
  const watch = await watchSources();
  const links = await checkLinks();
  return NextResponse.json({ watch, links });
}
