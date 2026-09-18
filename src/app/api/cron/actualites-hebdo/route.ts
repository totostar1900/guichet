import { NextResponse, type NextRequest } from "next/server";
import { sendWeeklyNews } from "@/lib/news/watch";

export const maxDuration = 300;

/** Friday afternoon: the week's links to every client who accepts our messages. */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) return new NextResponse("Unauthorized", { status: 401 });
  return NextResponse.json(await sendWeeklyNews());
}
