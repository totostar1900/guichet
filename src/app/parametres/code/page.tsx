import { requireSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { getT } from "@/i18n/server";
import { Glissement } from "@/components/mobile/Glissement";
import { ModifierLeCode } from "./ModifierLeCode";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const t = await getT();
  return { title: t("Modifier le code") };
}

/** LA PAGE DU CODE (19 novembre 2026, planche « Paramètres et connexion », 3A) : une page à elle, le clavier de l'écran, et la coche à la fin. */
export default async function CodePage() {
  const s = await requireSession("/parametres/code");
  const aUnCode = (await repo().listDevices(s.userId).catch(() => [])).some((d) => d.kind === "code");
  return (
    <Glissement>
      <ModifierLeCode aUnCode={aUnCode} who={s.name} />
    </Glissement>
  );
}
