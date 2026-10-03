import type { NextRequest } from "next/server";
import { routeDuRobot } from "@/lib/cron/tour";
import { sendWeeklyNews } from "@/lib/news/watch";

export const maxDuration = 300;

/** Friday afternoon: the week's links to every client who accepts our messages. */
export async function GET(req: NextRequest) {
  return routeDuRobot("actualites-hebdo", req, () => sendWeeklyNews());
}
