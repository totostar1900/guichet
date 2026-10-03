import type { NextRequest } from "next/server";
import { routeDuRobot } from "@/lib/cron/tour";
import { runWatchAlerts } from "@/lib/watch";

/** Every morning after the coupons run: tell clients when a followed line moved. */
export async function GET(req: NextRequest) {
  return routeDuRobot("suivi", req, () => runWatchAlerts());
}
