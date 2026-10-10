import "server-only";
import { repo } from "@/lib/data";
import { REF } from "@/lib/reference";
import { activite, BAREME_DEFAUT, BAREME_KEY, volumesRegles, type Activite, type Bareme } from "@/lib/domain/activite";

/**
 * LE BARÈME, ET LES ACTIVITÉS DE TOUT LE MONDE EN UNE PASSE.
 *
 * Le volume d'un client se compare à ceux de son palier : le calculer client
 * par client relirait tous les ordres à chaque ligne du répertoire. Une seule
 * lecture sert pour les vingt-huit.
 *
 * Le barème vit au référentiel, avec ses brouillons et sa publication : la
 * maison règle ses poids sans déployer, et chaque publication monte d'une
 * version, parce qu'un score ne se compare qu'à barème égal.
 */
export async function baremeCourant(): Promise<Bareme> {
  const row = (await repo().listReference(REF.bareme).catch(() => [])).find((r) => r.key === BAREME_KEY);
  const pose = row?.data as Partial<Bareme> | undefined;
  return pose ? { ...BAREME_DEFAUT, ...pose, poids: { ...BAREME_DEFAUT.poids, ...pose.poids } } : BAREME_DEFAUT;
}

/** Le brouillon en attente, s'il y en a un : ce que la publication poserait. */
export async function baremeEnBrouillon(): Promise<Bareme | undefined> {
  const row = (await repo().listReference(REF.bareme).catch(() => [])).find((r) => r.key === BAREME_KEY);
  const d = row?.draft;
  if (!d || d.op !== "set") return undefined;
  const pose = d.data as Partial<Bareme>;
  return { ...BAREME_DEFAUT, ...pose, poids: { ...BAREME_DEFAUT.poids, ...pose.poids } };
}

export async function activitesDeTous(bareme?: Bareme, now = new Date()): Promise<Map<string, Activite>> {
  const r = repo();
  const b = bareme ?? (await baremeCourant());
  const [intents, offers, notifications, contacts, files] = await Promise.all([
    r.listIntents(),
    r.listOffers(),
    r.listNotifications(2000).catch(() => []),
    r.listContacts().catch(() => []),
    r.listClientFiles().catch(() => []),
  ]);
  const volumes = volumesRegles(intents, now);
  const out = new Map<string, Activite>();
  for (const c of contacts) {
    /* Les espèces et les gestes se lisent par client : à cette échelle c'est
       deux requêtes par ligne, et le jour où la clientèle grandira il faudra
       une lecture en bloc. La borne est notée plutôt que devinée. */
    const [cash, gestes] = await Promise.all([
      r.listCash(c.id).catch(() => []),
      r.listClientActions({ userId: c.id, limit: 500 }).catch(() => []),
    ]);
    out.set(
      c.id,
      activite(
        { userId: c.id, tier: c.tier ?? 1, intents, offers, notifications, cash, gestes, dossier: files.find((f) => f.userId === c.id), contacts, volumes },
        b,
        now,
      ),
    );
  }
  return out;
}

export async function activiteDe(userId: string, now = new Date()): Promise<Activite | undefined> {
  return (await activitesDeTous(undefined, now)).get(userId);
}
