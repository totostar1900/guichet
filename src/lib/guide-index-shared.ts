import type { SearchEntry } from "@/app/info/InfoSearch";

/** The shape of the Guide's index, safe on the client (the builder is server-only in guide-index.ts). */
export interface AideRow {
  chapter: string;
  chapterTitle: string;
  slug: string;
  q: string;
  a: string;
}
export interface LessonSummary {
  key: string;
  title: string;
  section?: string;
  order: number;
  minutes: number;
}
export interface GuideIndex {
  entries: SearchEntry[];
  aide: AideRow[];
  lessons: LessonSummary[];
  sections: { key: string; order: number; title: string; color: string }[];
}
/** The three questions clients ask most, by slug (the menu shows them first). */
export const TOP_QUESTIONS = ["je-n-ai-pas-recu-le-code", "pourquoi-un-code-whatsapp-avant-d-envoyer", "un-fonds-s-achete-a-quel-prix"];
