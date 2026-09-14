import { requireDesk } from "@/lib/auth";

/** Every /desk page requires a desk session. */
export default async function DeskLayout({ children }: { children: React.ReactNode }) {
  await requireDesk();
  return <>{children}</>;
}
