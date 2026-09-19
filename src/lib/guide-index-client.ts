import { doneKey } from "@/app/info/[key]/Quiz";
import type { GuideIndex } from "./guide-index-shared";

/** The Guide's index, fetched once per page life (in the viewer's language) when a menu first needs it. */
let cache: GuideIndex | null = null;
let pending: Promise<GuideIndex> | null = null;
export function loadGuideIndex(): Promise<GuideIndex> {
  if (cache) return Promise.resolve(cache);
  if (!pending)
    pending = fetch("/api/guide-index")
      .then((r) => r.json() as Promise<GuideIndex>)
      .then((i) => (cache = i));
  return pending;
}
export const cachedGuideIndex = () => cache;

/** The lessons the reader closed with their question, on this device. */
export function readDoneLessons(keys: string[]): string[] {
  try {
    return keys.filter((k) => localStorage.getItem(doneKey(k)) === "1");
  } catch {
    return [];
  }
}
