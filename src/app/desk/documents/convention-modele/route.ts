import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { renderConventionModel } from "@/lib/documents/generate";

/** The blank convention any signed-in user can read before accepting. */
export async function GET() {
  if (!(await getSession())) return new NextResponse("Connexion requise", { status: 401 });
  const pdf = await renderConventionModel();
  return new NextResponse(new Uint8Array(pdf), { headers: { "content-type": "application/pdf", "content-disposition": 'inline; filename="convention-compte-titres.pdf"' } });
}
