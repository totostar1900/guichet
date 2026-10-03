import type { NextRequest } from "next/server";
import { routeDuRobot } from "@/lib/cron/tour";
import { sendDigest } from "@/lib/digest";

/** 06:30 every weekday: the desk's morning brief (what closes, what came in, what waits, what moved). */
export async function GET(req: NextRequest) {
  return routeDuRobot("point", req, () => sendDigest());
}
