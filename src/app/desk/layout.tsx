import { requireDesk } from "@/lib/auth";
import { DeskTour } from "@/components/DeskTour";

/** Every /desk page requires a desk session. */
export default async function DeskLayout({ children }: { children: React.ReactNode }) {
  await requireDesk();
  return (
    <>
      {children}
      <DeskTour />
    </>
  );
}
