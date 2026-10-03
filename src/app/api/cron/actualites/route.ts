import type { NextRequest } from "next/server";
import { routeDuRobot } from "@/lib/cron/tour";
import { checkLinks, watchSources } from "@/lib/news/watch";

export const maxDuration = 300;

/** Nightly: new links on the followed sites land in « Liens reçus »; every published link is pinged. */
export async function GET(req: NextRequest) {
  return routeDuRobot("actualites", req, async () => {
    const watch = await watchSources();
    const links = await checkLinks();
    return ({ watch, links });
  });
}
