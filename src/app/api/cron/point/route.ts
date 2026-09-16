import { NextResponse, type NextRequest } from "next/server";
import { sendDigest } from "@/lib/digest";

/** 06:30 every weekday: the desk's morning brief (what closes, what came in, what waits, what moved). */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) return new NextResponse("Unauthorized", { status: 401 });
  return NextResponse.json(await sendDigest());
}
