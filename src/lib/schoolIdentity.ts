// schoolIdentity.ts — single source of truth for the college's PRINTABLE
// identity (PDF headers, admit cards, timetable sheets, merit lists…).
//
// WHY THIS EXISTS: five different PDF generators used to hardcode an
// institution name plus a made-up "Established" year instead of reading
// the college's real identity. Every document the site prints must read
// the college's name from the admin-managed school settings
// (school_settings row id=1), which useSchoolSettings() keeps cached in
// localStorage. These generators run inside admin pages where the
// settings hook has almost certainly already hydrated that cache — and
// even if it hasn't, the fallback below is the college's own public
// identity (Government Degree College Lakarai, Established 2004).
//
// ⚠ Nothing in this module may contain personal phone numbers, EMIS codes
// or staff names — those are operational data owned by the admin dashboard.

import { SCHOOL_SETTINGS_CACHE_KEY } from "@/hooks/useSchoolSettings";

export interface SchoolIdentity {
  /** Official school name — e.g. "Government Degree College Lakarai". */
  name: string;
  /** One-line address used under the name on printed headers. */
  addressLine: string;
  /** "Established <year>" fragment, only when a year is actually known. */
  establishedYear: number | null;
}

const DEFAULT_IDENTITY: SchoolIdentity = {
  name: "Government Degree College Lakarai",
  addressLine: "Bajaur Express Road, District Mohmand, Khyber Pakhtunkhwa",
  establishedYear: 2004,
};

/** "District Mohmand, Khyber Pakhtunkhwa  |  Established 2004" style line. */
export function schoolSubtitleLine(id: SchoolIdentity): string {
  const est = id.establishedYear ? `  |  Established ${id.establishedYear}` : "";
  return `${id.addressLine}${est}`;
}

/**
 * Read the admin-controlled identity. Safe to call from non-React modules
 * (PDF builders, workers, event handlers) at any time — never throws.
 */
export function getSchoolIdentity(): SchoolIdentity {
  if (typeof window === "undefined") return DEFAULT_IDENTITY;
  try {
    const raw = window.localStorage.getItem(SCHOOL_SETTINGS_CACHE_KEY);
    if (!raw) return DEFAULT_IDENTITY;
    const s = JSON.parse(raw) as Record<string, unknown>;

    const name =
      typeof s.school_name === "string" && s.school_name.trim()
        ? s.school_name.trim()
        : DEFAULT_IDENTITY.name;

    // Prefer the DB address; trim the country off if the admin saved the
    // long ", Pakistan" form, so the printed line stays one tidy fragment.
    let addressLine = DEFAULT_IDENTITY.addressLine;
    if (typeof s.address === "string" && s.address.trim()) {
      addressLine = s.address.trim().replace(/,\s*Pakistan$/i, "");
    }

    const year =
      typeof s.established_year === "number" && s.established_year > 1900
        ? s.established_year
        : DEFAULT_IDENTITY.establishedYear;

    return { name, addressLine, establishedYear: year };
  } catch {
    return DEFAULT_IDENTITY;
  }
}
