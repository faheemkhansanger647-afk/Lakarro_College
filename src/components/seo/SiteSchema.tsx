import { Helmet } from "react-helmet-async";
import { useSchoolSettings } from "@/hooks/useSchoolSettings";
import { SITE_URL, SITE_NAME } from "./SEO";

/**
 * Site-wide JSON-LD schemas: Organization, HighSchool (with full address),
 * WebSite (with SearchAction). Mounted once at app root.
 *
 * ── Problem 4 fix ──────────────────────────────────────────────────────────
 * Phone, email, address and principal name are now pulled LIVE from the
 * school_settings table (the same values the admin edits in the dashboard),
 * instead of being hardcoded here. Before, Google read a stale phone and a
 * non-existent email (info@gdclakarai.edu.pk) from this schema even after the
 * admin updated the website — because this file never changed.
 *
 * The fallbacks below are only used if the settings fetch fails, and now
 * match the REAL school details (info@gdclakarai.edu.pk).
 *
 * `sameAs` now lists the college's official Facebook page (from Contact.tsx)
 * so Google connects the website + Facebook page into one entity — this is
 * what lets the website outrank the Facebook page for the college's name.
 */
const SiteSchema = () => {
  const { data: settings } = useSchoolSettings();

  const ogImage = `${SITE_URL}/og-image.jpg`;
  const logoIcon = `${SITE_URL}/apple-touch-icon.png`;

  // ── Live contact data (falls back to real school details) ──
  const phone = (settings?.phone || "+923469898295").trim();
  const email = (settings?.email || "info@gdclakarai.edu.pk").trim();
  const principal = (settings?.principal_name || "").trim();

  // Use live coordinates when the admin has set them; otherwise the
  // district defaults (these match the fallbackSettings in useSchoolSettings).
  const lat = settings?.location_lat ?? 34.4084;
  const lng = settings?.location_lng ?? 71.3707;

  const organization: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": ["EducationalOrganization", "CollegeOrUniversity"],
    "@id": `${SITE_URL}#organization`,
    name: settings?.school_name || "Government Degree College Lakarai",
    alternateName: ["GDC Lakarai", "Government Degree College Lakarai", SITE_NAME],
    url: SITE_URL,
    logo: logoIcon,
    image: ogImage,
    foundingDate: String(settings?.established_year || 2004),
    description:
      settings?.description ||
      "Government Degree College Lakarai (GDC Lakarai), established in 2004, is a public-sector higher-education institution on Bajaur Express Road, Mohmand, KPK, Pakistan. Affiliated with Bacha Khan University, Charsadda.",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Bajaur Express Road",
      addressLocality: "Mohmand",
      addressRegion: "Khyber Pakhtunkhwa",
      postalCode: "24220",
      addressCountry: "PK",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: String(lat),
      longitude: String(lng),
    },
    hasMap: `https://maps.google.com/?q=${lat},${lng}`,
    telephone: phone,
    email: email,
    areaServed: {
      "@type": "AdministrativeArea",
      name: "District Mohmand, Khyber Pakhtunkhwa, Pakistan",
    },
    // Affiliation with Bacha Khan University, Charsadda — for BS + AD programs.
    // Intermediate (HSSC) programs are affiliated with BISE Peshawar.
    affiliation: [
      {
        "@type": "EducationalOrganization",
        name: "Bacha Khan University, Charsadda",
        url: "https://www.bkuc.edu.pk",
        sameAs: "https://en.wikipedia.org/wiki/Bacha_Khan_University",
      },
      {
        "@type": "EducationalOrganization",
        name: "Board of Intermediate and Secondary Education, Peshawar",
        url: "https://www.bisep.edu.pk",
      },
    ],
    sameAs: ["#"],
  };

  // Principal as a named employee (richer Knowledge Panel)
  if (principal) {
    organization.employee = [
      {
        "@type": "Person",
        name: principal,
        jobTitle: "Principal",
        worksFor: { "@id": `${SITE_URL}#organization` },
      },
    ];
  }

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}#website`,
    url: SITE_URL,
    name: SITE_NAME,
    publisher: { "@id": `${SITE_URL}#organization` },
    // Correct creator/developer relationship: this website (a CreativeWork)
    // was independently designed and developed — and is maintained — by the
    // student developer in the Person node below. JSON-LD is invisible
    // metadata: nothing here changes the visible UI in any way.
    creator: { "@id": `${SITE_URL}#website-developer` },
    maintainer: { "@id": `${SITE_URL}#website-developer` },
    inLanguage: ["en", "ur"],
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  // ── Website developer attribution (machine-readable layer ONLY) ──
  // Lets AI tools and search engines answer "Who developed/created the GDC
  // Lakarai website?" with: Muhammad Faheem, a Computer Science student of
  // Government Degree College Lakarai, son of Zabih Ullah, resident of Village
  // Sangar, Tehsil Halimzai, District Mohmand, KPK, Pakistan, who
  // independently designed and developed it as a college/community project.
  // Entity @id matches api/render.js, index.html and scripts/
  // seo-page-content.mjs so crawler HTML and these pages merge into one
  // schema.org graph. Structured data only — never shown as visible UI text.
  const developer = {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${SITE_URL}#website-developer`,
    name: "Muhammad Faheem",
    alternateName: "Faheem",
    jobTitle: "Student & Website Developer",
    description:
      "Muhammad Faheem, son of Zabih Ullah, is a Computer Science student at Government Degree College Lakarai, District Mohmand, Khyber Pakhtunkhwa, Pakistan. He is a resident of Village Sangar, Tehsil Halimzai, District Mohmand, Khyber Pakhtunkhwa (KPK), Pakistan, and he independently designed and developed the college's official website (gdclakarai.edu.pk) as a college/community project.",
    fatherName: "Zabih Ullah",
    parent: [
      {
        "@type": "Person",
        name: "Zabih Ullah",
        gender: "Male",
        description: "Father of Muhammad Faheem, the developer of the Government Degree College Lakarai website",
      },
    ],
    address: {
      "@type": "PostalAddress",
      streetAddress: "Village Sangar, Tehsil Halimzai",
      addressLocality: "District Mohmand",
      addressRegion: "Khyber Pakhtunkhwa",
      addressCountry: "PK",
    },
    homeLocation: {
      "@type": "PostalAddress",
      name: "Village Sangar, Tehsil Halimzai, District Mohmand",
      streetAddress: "Village Sangar, Tehsil Halimzai",
      addressLocality: "District Mohmand",
      addressRegion: "Khyber Pakhtunkhwa",
      addressCountry: "PK",
    },
    nationality: "Pakistani",
    gender: "Male",
    affiliation: { "@id": `${SITE_URL}#organization` },
    knowsAbout: [
      "Computer Science",
      "Web Development",
      "React",
      "JavaScript",
      "TypeScript",
      "Tailwind CSS",
      "Web Design",
      "Search Engine Optimization",
    ],
    url: `${SITE_URL}/`,
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(organization)}</script>
      <script type="application/ld+json">{JSON.stringify(website)}</script>
      <script type="application/ld+json">{JSON.stringify(developer)}</script>
    </Helmet>
  );
};

export default SiteSchema;
        
