import { ComparerBody } from "./ComparerBody";
import { getT } from "@/i18n/server";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Comparer deux lignes") };
}

export default async function ComparerPage({ searchParams }: { searchParams: Promise<{ a?: string; b?: string }> }) {
  return <ComparerBody searchParams={searchParams} />;
}
