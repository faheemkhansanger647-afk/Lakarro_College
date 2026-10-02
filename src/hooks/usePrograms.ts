import { useQuery } from "@tanstack/react-query";
import { supabase, supabasePublic } from "@/lib/supabase";

/* ═══════════════════════════════════════════════════════════════════════════
   usePrograms — database-backed program catalogue

   Programs live in the Supabase `programs` table (created by
   supabase-migration.sql in the project root). The admin panel
   (Admin → Content → Programs) manages rows there; the public /programs
   page merges these rows on top of the built-in program definitions.

   Every field is admin-editable: title, category, duration, tagline,
   description, subject groups (1st/2nd Year or Semesters), admission
   requirement, career pathways, per-program contact info and visibility.
   ═══════════════════════════════════════════════════════════════════════════ */

export type ProgramCategory = "intermediate" | "bs" | "ad";

export interface ProgramSubjectGroup {
  label: string;
  subjects: string[];
  note?: string;
}

export interface ProgramRecord {
  id?: string;
  slug: string;
  category: ProgramCategory;
  title: string;
  shortName: string;
  duration: string;
  tagline: string;
  description: string;
  subjectGroups: ProgramSubjectGroup[];
  careerPaths: string[];
  admissionRequirement: string;
  contactInfo?: string | null;
  isActive: boolean;
  sortOrder: number;
}

/* Raw row shape as stored in Supabase (snake_case columns) */
interface ProgramRow {
  id: string;
  slug: string;
  category: string;
  title: string;
  short_name: string | null;
  duration: string | null;
  tagline: string | null;
  description: string | null;
  subject_groups: ProgramSubjectGroup[] | null;
  career_paths: string[] | null;
  admission_requirement: string | null;
  contact_info: string | null;
  is_active: boolean | null;
  sort_order: number | null;
}

function rowToRecord(row: ProgramRow): ProgramRecord {
  const category: ProgramCategory =
    row.category === "bs" ? "bs" : row.category === "ad" ? "ad" : "intermediate";
  return {
    id: row.id,
    slug: row.slug,
    category,
    title: row.title,
    shortName: row.short_name || row.title,
    duration: row.duration || "",
    tagline: row.tagline || "",
    description: row.description || "",
    subjectGroups: Array.isArray(row.subject_groups)
      ? row.subject_groups.map((g) => ({
          label: g?.label || "Subjects",
          subjects: Array.isArray(g?.subjects) ? g.subjects.filter(Boolean) : [],
          note: g?.note || undefined,
        }))
      : [],
    careerPaths: Array.isArray(row.career_paths) ? row.career_paths.filter(Boolean) : [],
    admissionRequirement: row.admission_requirement || "",
    contactInfo: row.contact_info || null,
    isActive: row.is_active !== false,
    sortOrder: row.sort_order ?? 0,
  };
}

async function fetchPrograms(client: typeof supabase): Promise<ProgramRecord[]> {
  const { data, error } = await client
    .from("programs")
    .select("*")
    .order("sort_order", { ascending: true });

  // A missing table (migration not run yet) or any other error must never
  // break the public page — we just fall back to the built-in programs.
  if (error) throw error;
  return (data ?? []).map(rowToRecord);
}

/** Read-only public programs hook. Returns [] when the table is missing,
 *  so callers merge with built-in defaults. */
export function usePrograms() {
  return useQuery<ProgramRecord[]>({
    queryKey: ["programs"],
    queryFn: async () => {
      try {
        return await fetchPrograms(supabasePublic);
      } catch (publicErr) {
        console.warn("[usePrograms] Public fetch failed, trying authed client:", publicErr);
      }
      try {
        return await fetchPrograms(supabase);
      } catch (err) {
        console.warn(
          "[usePrograms] Supabase programs unavailable — using built-in programs only. " +
          "Run supabase-migration.sql (project root) to enable admin-managed programs.",
          err
        );
        return [];
      }
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

/* ── Merge logic: built-in definitions + admin-managed overrides ────────── */

export function mergePrograms(
  builtIn: ProgramRecord[],
  overrides: ProgramRecord[]
): ProgramRecord[] {
  const result = new Map<string, ProgramRecord>();
  for (const b of builtIn) result.set(b.slug, b);

  for (const o of overrides) {
    const existing = result.get(o.slug);
    if (o.isActive === false) {
      // Admin hid this program — drop it from the catalogue entirely
      result.delete(o.slug);
      continue;
    }
    result.set(o.slug, {
      ...(existing || o),
      ...o,
      // Empty subject groups fall back to the built-in ones
      subjectGroups:
        o.subjectGroups && o.subjectGroups.some((g) => g.subjects.length > 0)
          ? o.subjectGroups
          : existing?.subjectGroups || o.subjectGroups,
      // Career paths fall back to built-in when the admin left them empty
      careerPaths:
        o.careerPaths && o.careerPaths.length > 0
          ? o.careerPaths
          : existing?.careerPaths || [],
    });
  }

  return Array.from(result.values()).sort((a, b) =>
    a.sortOrder === b.sortOrder ? 0 : a.sortOrder - b.sortOrder
  );
}
