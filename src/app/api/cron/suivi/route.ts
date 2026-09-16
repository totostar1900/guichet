import { NextResponse, type NextRequest } from "next/server";
import { runWatchAlerts } from "@/lib/watch";

/** Every morning after the coupons run: tell clients when a followed line moved. */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) return new NextResponse("Unauthorized", { status: 401 });
  return NextResponse.json(await runWatchAlerts());
}
