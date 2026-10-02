import { useState, useMemo } from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BookOpen, GraduationCap, Beaker, Microscope, Calculator,
  Palette, Atom, Dna, Code, Scale, FileText, Layers,
  CheckCircle2, Info, ArrowRight, Calendar, Award,
  Phone, Mail, Clock, MessageCircle,
} from "lucide-react";
import PageLayout from "@/components/layout/PageLayout";
import PageBanner from "@/components/shared/PageBanner";
import { useSchoolSettings } from "@/hooks/useSchoolSettings";
import {
  usePrograms, mergePrograms,
  type ProgramRecord, type ProgramCategory, type ProgramSubjectGroup,
} from "@/hooks/usePrograms";

/* ═══════════════════════════════════════════════════════════════════════════
   PROGRAM DATA — Intermediate + BS program definitions with subjects
   ═══════════════════════════════════════════════════════════════════════════ */

interface ProgramDef {
  slug: string;
  category: "intermediate" | "bs" | "ad";
  title: string;
  shortName: string;
  duration: string;
  icon: typeof BookOpen;
  tagline: string;
  description: string;
  firstYear?: {
    label: string;
    subjects: string[];
    note?: string;
  };
  secondYear?: {
    label: string;
    subjects: string[];
    note?: string;
  };
  semesters?: {
    label: string;
    subjects: string[];
  }[];
  careerPaths: string[];
  admissionRequirement: string;
  accent: string; // tailwind color token, e.g. "emerald"
}

const PROGRAMS: ProgramDef[] = [
  /* ── Intermediate: Pre-Engineering ── */
  {
    slug: "pre-engineering",
    category: "intermediate",
    title: "Pre-Engineering",
    shortName: "Pre-Engineering",
    duration: "2 Years (1st Year + 2nd Year)",
    icon: Calculator,
    tagline: "The engineering pathway — Mathematics, Physics and Chemistry for university admission.",
    description:
      "The Pre-Engineering program at Government Degree College Lakarai provides a rigorous foundation in Mathematics, Physics and Chemistry, preparing students for admission to BE / BS Engineering degrees at universities across Pakistan. The two-year Intermediate program follows the BISE Peshawar curriculum and culminates in the HSSC (Part-I and Part-II) examinations.",
    firstYear: {
      label: "1st Year (Part-I)",
      subjects: ["English", "Urdu", "Mathematics", "Physics", "Chemistry", "Islamiyat", "M.Quran"],
    },
    secondYear: {
      label: "2nd Year (Part-II)",
      subjects: ["English", "Urdu", "Mathematics", "Physics", "Chemistry", "Pak-Study"],
      note: "In 2nd Year, Islamiyat is replaced by Pak-Study and M.Quran is discontinued — per BISE Peshawar HSSC scheme.",
    },
    careerPaths: [
      "BE / BS Electrical, Mechanical, Civil Engineering",
      "BS Computer Science, Software Engineering",
      "BS Mathematics, Physics, Statistics",
      "Architecture & related fields",
    ],
    admissionRequirement: "Matriculation (SSC) with Science group — Mathematics as a compulsory subject.",
    accent: "emerald",
  },

  /* ── Intermediate: Pre-Medical ── */
  {
    slug: "pre-medical",
    category: "intermediate",
    title: "Pre-Medical",
    shortName: "Pre-Medical",
    duration: "2 Years (1st Year + 2nd Year)",
    icon: Microscope,
    tagline: "The medical pathway — Biology, Physics and Chemistry for MBBS / BDS / Pharmacy admission.",
    description:
      "The Pre-Medical program at Government Degree College Lakarai is designed for students aspiring to careers in medicine, dentistry, pharmacy, and the life sciences. The two-year curriculum follows the BISE Peshawar HSSC scheme, with Biology replacing Mathematics at the Part-I stage and Pak-Study replacing Islamiyat at the Part-II stage.",
    firstYear: {
      label: "1st Year (Part-I)",
      subjects: ["English", "Urdu", "Biology", "Physics", "Chemistry", "Islamiyat", "M.Quran"],
      note: "Same combination as Pre-Engineering, but Mathematics is replaced by Biology.",
    },
    secondYear: {
      label: "2nd Year (Part-II)",
      subjects: ["English", "Urdu", "Biology", "Physics", "Chemistry", "Pak-Study"],
      note: "In 2nd Year, Islamiyat is replaced by Pak-Study — same substitution rule as all Intermediate streams.",
    },
    careerPaths: [
      "MBBS, BDS (Medical & Dental)",
      "Pharm-D, DVM, BSN Nursing",
      "BS Zoology, Botany, Microbiology",
      "Allied health & life-science degrees",
    ],
    admissionRequirement: "Matriculation (SSC) with Science group — Biology as a subject.",
    accent: "emerald",
  },

  /* ── Intermediate: ICS (Computer Science) ── */
  {
    slug: "ics",
    category: "intermediate",
    title: "ICS — Intermediate in Computer Science",
    shortName: "ICS",
    duration: "2 Years (1st Year + 2nd Year)",
    icon: Code,
    tagline: "Programming and computing foundation — Computer Science replacing Chemistry in the engineering group.",
    description:
      "The ICS program at Government Degree College Lakarai introduces students to programming, computational thinking and the foundations of computer science alongside a strong Mathematics and Physics base. It is the preferred Intermediate route for students planning to pursue BS Computer Science, Software Engineering, Data Science or related degrees. The two-year curriculum follows the BISE Peshawar HSSC scheme.",
    firstYear: {
      label: "1st Year (Part-I)",
      subjects: ["English", "Urdu", "Mathematics", "Physics", "Computer Science", "Islamiyat", "M.Quran"],
      note: "Same as Pre-Engineering, but Chemistry is replaced by Computer Science.",
    },
    secondYear: {
      label: "2nd Year (Part-II)",
      subjects: ["English", "Urdu", "Mathematics", "Physics", "Computer Science", "Pak-Study"],
      note: "In 2nd Year, Islamiyat is replaced by Pak-Study — consistent with all Intermediate streams.",
    },
    careerPaths: [
      "BS Computer Science, Software Engineering",
      "BS Data Science, Artificial Intelligence",
      "BS Information Technology, Cyber Security",
      "BS Mathematics, BS Statistics",
    ],
    admissionRequirement: "Matriculation (SSC) with Science group — Mathematics as a compulsory subject.",
    accent: "emerald",
  },

  /* ── Intermediate: Arts (Humanities) ──
     Arts and Humanities stream — Civics, History and Islamic Studies are the
     core electives alongside the compulsory English, Urdu, Islamiyat and
     Pak-Study. The student picks one optional subject (e.g. Economics,
     Geography, Sociology, Education) at enrollment time. */
  {
    slug: "arts",
    category: "intermediate",
    title: "Arts (Humanities)",
    shortName: "Arts",
    duration: "2 Years (1st Year + 2nd Year)",
    icon: Palette,
    tagline: "The humanities pathway — Civics, History and Islamic Studies for civil services, law and social sciences.",
    description:
      "The Intermediate in Arts (Humanities) program at Government Degree College Lakarai offers a flexible pathway for students interested in languages, social sciences, history, civics and Islamic Studies. The curriculum follows the BISE Peshawar HSSC scheme and is designed for students planning to pursue AD or BS degrees in English, Urdu, Political Science, History, Mass Communication, Law (LLB) and the civil services.",
    firstYear: {
      label: "1st Year (Part-I)",
      subjects: ["English (Compulsory)", "Urdu (Compulsory)", "Islamiyat (Compulsory)", "M.Quran", "Civics", "History", "Islamic Studies"],
      note: "Plus one optional subject chosen at enrollment (e.g. Economics, Geography, Sociology, Education, Pashto or Arabic).",
    },
    secondYear: {
      label: "2nd Year (Part-II)",
      subjects: ["English (Compulsory)", "Urdu (Compulsory)", "Pak-Study", "Civics", "History", "Islamic Studies"],
      note: "In 2nd Year, Islamiyat is replaced by Pak-Study — consistent with all Intermediate streams. M.Quran is discontinued.",
    },
    careerPaths: [
      "AD English / AD Urdu / AD Political Science (2-Year Associate Degree)",
      "BS Urdu, BS English Literature, BS Political Science, BS History",
      "BS Mass Communication, BS Journalism, BS International Relations",
      "LLB (after graduation) and civil-services pathways (CSS / PCS)",
    ],
    admissionRequirement: "Matriculation (SSC) — any group (Science or General).",
    accent: "emerald",
  },

  /* ── BS Programs (4-year, 8 semesters) ── */
  {
    slug: "urdu",
    category: "bs",
    title: "BS Urdu",
    shortName: "BS Urdu",
    duration: "4 Years (8 Semesters)",
    icon: FileText,
    tagline: "A four-year degree in Urdu language, literature and linguistics.",
    description:
      "The BS Urdu program at Government Degree College Lakarai is a four-year undergraduate degree following the Higher Education Commission (HEC) of Pakistan curriculum. Students study classical and modern Urdu literature, poetry, prose, linguistics, criticism and research methodology, culminating in a final-year research thesis. Graduates are prepared for teaching, journalism, civil services, translation work and postgraduate research.",
    semesters: [
      { label: "Semester 1", subjects: ["Urdu (Compulsory)", "English (Compulsory)", "Islamic Studies / Ethics", "Introduction to Urdu Literature", "Pakistan Studies", "Functional Urdu"] },
      { label: "Semester 2", subjects: ["Urdu (Compulsory)", "English (Compulsory)", "Classical Urdu Poetry", "Modern Urdu Prose", "Urdu Grammar & Linguistics", "Computer Applications"] },
      { label: "Semester 3", subjects: ["Urdu Poetry — Ghazal", "Urdu Poetry — Nazm", "Urdu Prose — Fiction", "Literary Criticism (Intro)", "History of Urdu Language", "Translation Studies"] },
      { label: "Semester 4", subjects: ["Classical Prose", "Modern Poetry", "Literary Movements", "Research Methodology", "Stylistics", "Comparative Literature"] },
      { label: "Semester 5", subjects: ["Iqbaliyat", "Ghalib Studies", "Critical Theory", "Diaspora Urdu Literature", "Linguistics (Advanced)", "Urdu Journalism"] },
      { label: "Semester 6", subjects: ["Sir Syed Studies", "Modern Criticism", "Fiction Studies", "Urdu Drama", "Computational Urdu", "Elective I"] },
      { label: "Semester 7", subjects: ["Research Thesis (Part-I)", "Specialization Paper I", "Specialization Paper II", "Elective II", "Elective III"] },
      { label: "Semester 8", subjects: ["Research Thesis (Part-II)", "Specialization Paper III", "Specialization Paper IV", "Viva Voce", "Internship Report"] },
    ],
    careerPaths: [
      "Lecturer in Urdu (colleges & universities)",
      "Journalist, Columnist, Editor",
      "Civil Services (CSS / PCS)",
      "Translation, publishing & media",
    ],
    admissionRequirement: "Intermediate (HSSC) in any group with at least 2nd division.",
    accent: "sky",
  },

  {
    slug: "zoology",
    category: "bs",
    title: "BS Zoology",
    shortName: "BS Zoology",
    duration: "4 Years (8 Semesters)",
    icon: Dna,
    tagline: "A four-year degree in animal biology, ecology and research methods.",
    description:
      "The BS Zoology program at Government Degree College Lakarai is a four-year undergraduate degree following the HEC curriculum. It covers animal diversity, physiology, genetics, ecology, evolution, microbiology and biotechnology, with substantial laboratory and fieldwork components. The program prepares graduates for careers in research, teaching, healthcare support, fisheries, wildlife management and pharmaceutical sciences.",
    semesters: [
      { label: "Semester 1", subjects: ["Urdu (Compulsory)", "English (Compulsory)", "Islamic Studies / Ethics", "Introduction to Zoology", "Botany-I", "Chemistry-I"] },
      { label: "Semester 2", subjects: ["Urdu (Compulsory)", "English (Compulsory)", "Zoology — Diversity of Invertebrates", "Botany-II", "Chemistry-II", "Pakistan Studies"] },
      { label: "Semester 3", subjects: ["Diversity of Vertebrates", "Cell Biology", "Genetics", "Mathematics / Stats", "English-II"] },
      { label: "Semester 4", subjects: ["Animal Physiology", "Microbiology", "Ecology", "Biochemistry-I", "Computer Applications"] },
      { label: "Semester 5", subjects: ["Developmental Biology", "Comparative Anatomy", "Biochemistry-II", "Biostatistics", "Elective I"] },
      { label: "Semester 6", subjects: ["Animal Behaviour", "Evolution", "Parasitology", "Endocrinology", "Elective II"] },
      { label: "Semester 7", subjects: ["Research Thesis (Part-I)", "Molecular Biology", "Fisheries & Aquaculture", "Wildlife Management", "Elective III"] },
      { label: "Semester 8", subjects: ["Research Thesis (Part-II)", "Entomology", "Specialization Paper", "Viva Voce", "Internship Report"] },
    ],
    careerPaths: [
      "Research scientist (biology, ecology, genetics)",
      "Lecturer in Zoology / Biology",
      "Fisheries, wildlife & conservation officer",
      "Medical laboratory & pharmaceutical sciences",
    ],
    admissionRequirement: "Intermediate (HSSC) Pre-Medical or equivalent with Biology.",
    accent: "sky",
  },

  {
    slug: "political-science",
    category: "bs",
    title: "BS Political Science",
    shortName: "BS Political Science",
    duration: "4 Years (8 Semesters)",
    icon: Scale,
    tagline: "A four-year degree in governance, public policy and political theory.",
    description:
      "The BS Political Science program at Government Degree College Lakarai is a four-year undergraduate degree covering political theory, comparative politics, international relations, public administration, public policy and the political history of Pakistan and the Muslim world. The program prepares graduates for civil services, law, journalism, public-policy research, diplomacy and teaching.",
    semesters: [
      { label: "Semester 1", subjects: ["Urdu (Compulsory)", "English (Compulsory)", "Islamic Studies / Ethics", "Introduction to Political Science", "Pakistan Studies", "Civics"] },
      { label: "Semester 2", subjects: ["Urdu (Compulsory)", "English (Compulsory)", "Political Thought (Western)", "Political Thought (Muslim)", "Introduction to Public Administration", "Computer Applications"] },
      { label: "Semester 3", subjects: ["Comparative Political Systems", "International Relations", "Local Government", "Western Political Systems", "English-II"] },
      { label: "Semester 4", subjects: ["Government & Politics of Pakistan", "International Organizations", "Public Policy", "Political Economy", "Research Methodology"] },
      { label: "Semester 5", subjects: ["Diplomacy & Foreign Policy", "Political Sociology", "Government & Politics of South Asia", "Elective I", "Statistics"] },
      { label: "Semester 6", subjects: ["Government & Politics of Middle East", "Public Administration", "Human Rights", "Elective II", "Foreign Policy of Pakistan"] },
      { label: "Semester 7", subjects: ["Research Thesis (Part-I)", "Specialization Paper I", "Specialization Paper II", "Elective III", "International Law"] },
      { label: "Semester 8", subjects: ["Research Thesis (Part-II)", "Specialization Paper III", "Specialization Paper IV", "Viva Voce", "Internship Report"] },
    ],
    careerPaths: [
      "Civil Services (CSS / PCS)",
      "Law (LLB after graduation)",
      "Journalism, public-policy research",
      "Diplomacy, international organizations",
    ],
    admissionRequirement: "Intermediate (HSSC) in any group with at least 2nd division.",
    accent: "sky",
  },

  {
    slug: "computer-science",
    category: "bs",
    title: "BS Computer Science",
    shortName: "BS Computer Science",
    duration: "4 Years (8 Semesters)",
    icon: Code,
    tagline: "A four-year degree in algorithms, software and computational systems.",
    description:
      "The BS Computer Science program at Government Degree College Lakarai is a four-year HEC-aligned undergraduate degree that covers programming, data structures, algorithms, operating systems, databases, computer networks, software engineering, artificial intelligence and machine learning. The program includes a strong laboratory and project component, preparing graduates for software engineering, data science, cybersecurity and research careers.",
    semesters: [
      { label: "Semester 1", subjects: ["Urdu (Compulsory)", "English (Compulsory)", "Islamic Studies / Ethics", "Introduction to Programming (C++)", "Calculus & Analytical Geometry", "Pakistan Studies"] },
      { label: "Semester 2", subjects: ["Urdu (Compulsory)", "English (Compulsory)", "Object-Oriented Programming (Java)", "Digital Logic Design", "Discrete Mathematics", "Computer Organization"] },
      { label: "Semester 3", subjects: ["Data Structures", "Database Systems", "Operating Systems", "Linear Algebra", "Probability & Statistics"] },
      { label: "Semester 4", subjects: ["Algorithms", "Computer Networks", "Software Engineering", "Theory of Automata", "Web Development"] },
      { label: "Semester 5", subjects: ["Computer Architecture", "Database Administration", "Web Application Development", "Elective I", "Numerical Methods"] },
      { label: "Semester 6", subjects: ["Artificial Intelligence", "Machine Learning", "Mobile App Development", "Elective II", "Professional Ethics"] },
      { label: "Semester 7", subjects: ["Research Thesis (Part-I)", "Cybersecurity", "Cloud Computing", "Elective III", "Specialization Paper I"] },
      { label: "Semester 8", subjects: ["Research Thesis (Part-II)", "Data Science & Big Data", "Distributed Systems", "Viva Voce", "Internship Report"] },
    ],
    careerPaths: [
      "Software Engineer, Full-Stack Developer",
      "Data Scientist, ML Engineer",
      "Cybersecurity Analyst",
      "Researcher / Lecturer in Computer Science",
    ],
    admissionRequirement: "Intermediate (HSSC) with Mathematics — Pre-Engineering or ICS preferred.",
    accent: "sky",
  },

  /* ── BS Botany ── */
  {
    slug: "botany",
    category: "bs",
    title: "BS Botany",
    shortName: "BS Botany",
    duration: "4 Years (8 Semesters)",
    icon: Beaker,
    tagline: "A four-year degree in plant biology, ecology, taxonomy and biotechnology.",
    description:
      "The BS Botany program at Government Degree College Lakarai is a four-year HEC-aligned undergraduate degree covering plant diversity, plant physiology, anatomy, taxonomy, ecology, genetics, microbiology, plant pathology and biotechnology. The program emphasizes substantial laboratory work, field collection and a final-year research thesis, preparing graduates for careers in agriculture, forestry, environmental protection, research, teaching and the pharmaceutical sector.",
    semesters: [
      { label: "Semester 1", subjects: ["Urdu (Compulsory)", "English (Compulsory)", "Islamic Studies / Ethics", "Introduction to Botany", "Zoology-I", "Chemistry-I"] },
      { label: "Semester 2", subjects: ["Urdu (Compulsory)", "English (Compulsory)", "Plant Diversity — Algae & Fungi", "Zoology-II", "Chemistry-II", "Pakistan Studies"] },
      { label: "Semester 3", subjects: ["Bryophytes & Pteridophytes", "Gymnosperms", "Cell Biology", "Genetics", "Mathematics / Statistics"] },
      { label: "Semester 4", subjects: ["Angiosperm Taxonomy", "Plant Anatomy", "Plant Physiology", "Microbiology", "Computer Applications"] },
      { label: "Semester 5", subjects: ["Plant Ecology", "Plant Embryology", "Paleobotany", "Biochemistry-I", "Biostatistics"] },
      { label: "Semester 6", subjects: ["Plant Pathology", "Plant Biotechnology", "Economic Botany", "Biochemistry-II", "Elective I"] },
      { label: "Semester 7", subjects: ["Research Thesis (Part-I)", "Plant Breeding", "Molecular Biology of Plants", "Elective II", "Environmental Botany"] },
      { label: "Semester 8", subjects: ["Research Thesis (Part-II)", "Specialization Paper", "Viva Voce", "Internship Report", "Plant Resource Management"] },
    ],
    careerPaths: [
      "Research scientist (botany, ecology, plant genetics)",
      "Lecturer in Botany / Biology",
      "Agriculture, forestry & environmental officer",
      "Pharmaceutical, horticulture & conservation sectors",
    ],
    admissionRequirement: "Intermediate (HSSC) Pre-Medical or equivalent with Biology.",
    accent: "sky",
  },

  /* ═══════════════════════════════════════════════════════════════════════════
     ASSOCIATE DEGREE (AD) PROGRAMS — 2-Year (4 Semesters)
     Per HEC Pakistan Associate Degree framework, equivalent to 14 years of
     schooling. Articulates with BS programs (lateral entry into 5th semester
     of corresponding BS).
     ═══════════════════════════════════════════════════════════════════════════ */

  /* ── AD English ── */
  {
    slug: "ad-english",
    category: "ad",
    title: "AD English — Associate Degree in English",
    shortName: "AD English",
    duration: "2 Years (4 Semesters)",
    icon: BookOpen,
    tagline: "A two-year associate degree in English language, literature and communication.",
    description:
      "The Associate Degree in English (AD English) at Government Degree College Lakarai is a two-year HEC-recognized undergraduate program covering English literature, grammar, composition, communication skills, classical and modern literary criticism and an introduction to linguistics. The program is ideal for students seeking a faster entry into teaching, journalism, content writing, civil services or as a stepping-stone to a full BS English degree (lateral entry into the 5th semester of BS English Literature at any HEC-recognized university).",
    semesters: [
      { label: "Semester 1", subjects: ["English (Compulsory)", "Urdu (Compulsory)", "Islamic Studies / Ethics", "Functional English", "Introduction to Literature", "Pakistan Studies"] },
      { label: "Semester 2", subjects: ["English (Compulsory)", "Urdu (Compulsory)", "Classical Poetry", "Modern Prose", "Grammar & Composition", "Communication Skills"] },
      { label: "Semester 3", subjects: ["Drama", "Literary Criticism", "Short Story & Essay", "Linguistics (Introduction)", "Elective I"] },
      { label: "Semester 4", subjects: ["Modern Poetry & Fiction", "American Literature (Intro)", "Research Methodology", "Elective II", "Internship Report / Project"] },
    ],
    careerPaths: [
      "Teacher / Lecturer (after further qualification)",
      "Content writer, copywriter, journalist",
      "Civil services (CSS / PCS) — strong English base",
      "Lateral entry into 5th semester of BS English Literature",
    ],
    admissionRequirement: "Intermediate (HSSC) in any group with at least 2nd division.",
    accent: "amber",
  },

  /* ── AD Urdu ── */
  {
    slug: "ad-urdu",
    category: "ad",
    title: "AD Urdu — Associate Degree in Urdu",
    shortName: "AD Urdu",
    duration: "2 Years (4 Semesters)",
    icon: FileText,
    tagline: "A two-year associate degree in Urdu language, literature and linguistics.",
    description:
      "The Associate Degree in Urdu (AD Urdu) at Government Degree College Lakarai is a two-year HEC-recognized undergraduate program covering classical and modern Urdu poetry, prose, fiction, drama, literary criticism, linguistics and research methodology. Graduates are well-prepared for teaching, journalism, civil services, translation, publishing and for lateral entry into the 5th semester of BS Urdu at any HEC-recognized university.",
    semesters: [
      { label: "Semester 1", subjects: ["Urdu (Compulsory)", "English (Compulsory)", "Islamic Studies / Ethics", "Introduction to Urdu Literature", "Pakistan Studies", "Functional Urdu"] },
      { label: "Semester 2", subjects: ["Urdu (Compulsory)", "English (Compulsory)", "Classical Urdu Poetry", "Modern Urdu Prose", "Urdu Grammar & Linguistics", "Computer Applications"] },
      { label: "Semester 3", subjects: ["Urdu Ghazal & Nazm", "Urdu Fiction", "Literary Criticism", "History of Urdu Language", "Elective I"] },
      { label: "Semester 4", subjects: ["Iqbaliyat & Ghalib Studies", "Modern Criticism", "Research Methodology", "Elective II", "Internship Report / Project"] },
    ],
    careerPaths: [
      "Lecturer in Urdu (after further qualification)",
      "Journalist, columnist, editor, translator",
      "Civil services (CSS / PCS)",
      "Lateral entry into 5th semester of BS Urdu",
    ],
    admissionRequirement: "Intermediate (HSSC) in any group with at least 2nd division.",
    accent: "amber",
  },

  /* ── AD Political Science ── */
  {
    slug: "ad-political-science",
    category: "ad",
    title: "AD Political Science — Associate Degree in Political Science",
    shortName: "AD Political Science",
    duration: "2 Years (4 Semesters)",
    icon: Scale,
    tagline: "A two-year associate degree in governance, public policy and political theory.",
    description:
      "The Associate Degree in Political Science (AD Political Science) at Government Degree College Lakarai is a two-year HEC-recognized undergraduate program covering political theory, comparative politics, international relations, public administration, the government & politics of Pakistan and political history. Graduates are prepared for civil services, law (LLB), journalism, public-policy research and for lateral entry into the 5th semester of BS Political Science at any HEC-recognized university.",
    semesters: [
      { label: "Semester 1", subjects: ["Urdu (Compulsory)", "English (Compulsory)", "Islamic Studies / Ethics", "Introduction to Political Science", "Pakistan Studies", "Civics"] },
      { label: "Semester 2", subjects: ["Urdu (Compulsory)", "English (Compulsory)", "Political Thought (Western & Muslim)", "Public Administration (Intro)", "Computer Applications", "Political Economy (Intro)"] },
      { label: "Semester 3", subjects: ["Comparative Political Systems", "International Relations", "Government & Politics of Pakistan", "Local Government", "Elective I"] },
      { label: "Semester 4", subjects: ["Foreign Policy of Pakistan", "International Organizations", "Public Policy", "Elective II", "Internship Report / Project"] },
    ],
    careerPaths: [
      "Civil Services (CSS / PCS)",
      "Law (LLB after graduation)",
      "Journalism, public-policy research, diplomacy",
      "Lateral entry into 5th semester of BS Political Science",
    ],
    admissionRequirement: "Intermediate (HSSC) in any group with at least 2nd division.",
    accent: "amber",
  },
];

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════════════ */

/* Convert a built-in program definition into the unified, admin-manageable
   record shape (1st/2nd Year + Semesters become subjectGroups). */
function builtInToRecord(p: ProgramDef): ProgramRecord {
  const subjectGroups: ProgramSubjectGroup[] = [];
  if (p.firstYear)
    subjectGroups.push({ label: p.firstYear.label, subjects: p.firstYear.subjects, note: p.firstYear.note });
  if (p.secondYear)
    subjectGroups.push({ label: p.secondYear.label, subjects: p.secondYear.subjects, note: p.secondYear.note });
  if (p.semesters)
    for (const s of p.semesters) subjectGroups.push({ label: s.label, subjects: s.subjects });
  return {
    slug: p.slug,
    category: p.category,
    title: p.title,
    shortName: p.shortName,
    duration: p.duration,
    tagline: p.tagline,
    description: p.description,
    subjectGroups,
    careerPaths: p.careerPaths,
    admissionRequirement: p.admissionRequirement,
    isActive: true,
    sortOrder: 0,
  };
}

const BUILT_IN_PROGRAMS: ProgramRecord[] = PROGRAMS.map(builtInToRecord);

const categoryIcon = (cat: ProgramCategory) =>
  cat === "bs" ? GraduationCap : cat === "ad" ? Award : BookOpen;

const categoryYears = (cat: ProgramCategory) => (cat === "bs" ? "4 Years" : "2 Years");

/* ── Emerald / Gold / Jade accent system (by category) ──
   One coherent golden+green identity for the whole page instead of the
   old rainbow emerald/sky/amber mix. */
const ACCENTS: Record<
  ProgramCategory,
  { tile: string; strip: string; icon: string; badge: string; chip: string; text: string; ring: string }
> = {
  intermediate: {
    tile: "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-light",
    strip: "from-primary/15 via-gold/5 to-transparent",
    icon: "text-primary",
    badge: "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-light",
    chip: "bg-primary text-primary-foreground",
    text: "text-primary",
    ring: "hover:border-primary/40",
  },
  bs: {
    tile: "bg-gold/15 text-bronze dark:bg-gold/20 dark:text-gold",
    strip: "from-gold/25 via-gold/10 to-transparent",
    icon: "text-bronze dark:text-gold",
    badge: "bg-gold/15 text-bronze dark:bg-gold/20 dark:text-gold",
    chip: "bg-bronze text-white dark:bg-gold dark:text-[hsl(36_60%_12%)]",
    text: "text-bronze dark:text-gold",
    ring: "hover:border-gold/50",
  },
  ad: {
    tile: "bg-azure-soft text-azure-strong dark:bg-azure-soft",
    strip: "from-azure/15 via-gold/5 to-transparent",
    icon: "text-azure-strong dark:text-azure",
    badge: "bg-azure-soft text-azure-strong dark:bg-azure-soft dark:text-azure",
    chip: "bg-azure-strong text-white",
    text: "text-azure-strong dark:text-azure",
    ring: "hover:border-azure/40",
  },
};

/* ═══════════════════════════════════════════════════════════════════════════
   PROGRAMS INDEX PAGE — /programs
   Built-in definitions merged with admin-managed programs (Supabase),
   rendered as a golden+green themed grid of pathway cards.
   ═══════════════════════════════════════════════════════════════════════════ */

const ProgramsIndex = () => {
  const { data: overrides = [] } = usePrograms();
  const programs = useMemo(() => mergePrograms(BUILT_IN_PROGRAMS, overrides), [overrides]);

  const sections: { category: ProgramCategory; title: string; subtitle: string }[] = [
    {
      category: "intermediate",
      title: "Intermediate Programs",
      subtitle: "2-Year HSSC — 1st Year (Part-I) + 2nd Year (Part-II) · Affiliated with BISE Peshawar",
    },
    {
      category: "bs",
      title: "BS Programs (4-Year)",
      subtitle: "4-Year Undergraduate Degrees — 8 Semesters · Affiliated with Bacha Khan University, Charsadda",
    },
    {
      category: "ad",
      title: "Associate Degree (AD) Programs",
      subtitle: "2-Year AD Degrees — 4 Semesters · HEC-recognized · Equivalent to 14 years of schooling",
    },
  ];

  return (
    <PageLayout>
      <PageBanner
        title="Academic Programs"
        subtitle="Intermediate (2-Year) · Associate Degrees (2-Year AD) · BS (4-Year) at Government Degree College Lakarai"
      />

      <section className="py-16">
        <div className="container mx-auto px-4 max-w-7xl">
          {/* ── Intro — light emerald/gold gradient wash ── */}
          <div className="relative overflow-hidden max-w-3xl mx-auto text-center mb-16 rounded-3xl border border-border/70 bg-gradient-to-b from-gold/10 via-card to-primary/5 px-6 py-10 shadow-card">
            <div className="orb orb-gold w-56 h-56 -top-24 -right-16" />
            <div className="orb orb-primary w-48 h-48 -bottom-24 -left-16" />
            <div className="relative">
              <span className="eyebrow">Admissions Open</span>
              <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mt-2 mb-4">
                Choose your pathway to <span className="text-gradient-brand">higher education</span>
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Government Degree College Lakarai offers Intermediate programs in four streams — Pre-Engineering, Pre-Medical, ICS (Computer Science) and Arts (Humanities) — alongside HEC-recognized four-year BS programs in Urdu, Zoology, Political Science, Computer Science and Botany, and two-year Associate Degree (AD) programs in English, Urdu and Political Science. Each program is affiliated with Bacha Khan University, Charsadda, and aligned with the BISE Peshawar and Higher Education Commission (HEC) curricula.
              </p>
            </div>
          </div>

          {sections.map(({ category, title, subtitle }) => {
            const accent = ACCENTS[category];
            const list = programs.filter((p) => p.category === category);
            if (list.length === 0) return null;
            const HeaderIcon = categoryIcon(category);
            return (
              <div key={category} className="mb-16 last:mb-0">
                <div className="flex items-center gap-3 mb-6">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${accent.tile}`}>
                    <HeaderIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-heading font-bold text-foreground">{title}</h3>
                    <p className="text-sm text-muted-foreground">{subtitle}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {list.map((p) => {
                    const Icon = categoryIcon(p.category);
                    const subjectCount = p.subjectGroups.reduce((n, g) => n + g.subjects.length, 0);
                    return (
                      <Link
                        key={p.slug}
                        to={`/programs/${p.category}/${p.slug}`}
                        className={`group bg-card rounded-2xl overflow-hidden border border-border shadow-card hover:shadow-elevated hover:-translate-y-1 transition-all duration-200 flex flex-col ${accent.ring}`}
                      >
                        <div className={`h-28 bg-gradient-to-br ${accent.strip} flex items-center justify-center relative shrink-0`}>
                          <Icon className={`w-11 h-11 ${accent.icon}`} strokeWidth={1.4} />
                          <span className={`absolute top-3 right-3 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-white px-2 py-1 rounded-full ${accent.chip}`}>
                            {categoryYears(p.category)}
                          </span>
                        </div>
                        <div className="p-5 flex flex-col flex-1">
                          <h4 className="font-heading font-semibold text-foreground text-base mb-1">{p.shortName}</h4>
                          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 flex-1">
                            {p.tagline || p.description}
                          </p>
                          <div className="flex items-center justify-between mt-3">
                            <span className={`inline-flex items-center gap-1 text-xs font-medium group-hover:gap-1.5 transition-all ${accent.text}`}>
                              View curriculum <ArrowRight className="w-3 h-3" />
                            </span>
                            {subjectCount > 0 && (
                              <span className="text-[10px] font-medium text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                                {subjectCount} subjects
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </PageLayout>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   PROGRAM DETAIL PAGE — /programs/:category/:slug
   Shows the full program with curriculum, admission requirements and an
   admin-managed admission-contact card (College Settings + per-program info).
   ═══════════════════════════════════════════════════════════════════════════ */

const ProgramDetail = () => {
  // NOTE: routes are /programs/intermediate/:slug, /programs/bs/:slug,
  // /programs/ad/:slug — the category is part of the PATH, not a param,
  // so we derive it from the pathname (the old code read a non-existent
  // :category param, which made every detail page show "Program Not Found").
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const category = useMemo<ProgramCategory | null>(() => {
    if (location.pathname.startsWith("/programs/intermediate/")) return "intermediate";
    if (location.pathname.startsWith("/programs/bs/")) return "bs";
    if (location.pathname.startsWith("/programs/ad/")) return "ad";
    return null;
  }, [location.pathname]);
  const { data: settings } = useSchoolSettings();
  const { data: overrides = [] } = usePrograms();
  const allPrograms = useMemo(() => mergePrograms(BUILT_IN_PROGRAMS, overrides), [overrides]);

  const program = useMemo(() => {
    if (!category || !slug) return undefined;
    return allPrograms.find((p) => p.category === category && p.slug === slug);
  }, [allPrograms, category, slug]);

  if (!program) {
    return (
      <PageLayout>
        <PageBanner title="Program Not Found" subtitle="The program you're looking for doesn't exist." />
        <section className="py-16">
          <div className="container mx-auto px-4 text-center">
            <p className="text-muted-foreground mb-6">
              We couldn't find the program you're looking for. Please check the URL or browse all programs.
            </p>
            <Link
              to="/programs"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
            >
              <ArrowRight className="w-4 h-4 rotate-180" /> All Programs
            </Link>
          </div>
        </section>
      </PageLayout>
    );
  }

  const Icon = categoryIcon(program.category);
  const accent = ACCENTS[program.category];
  const isIntermediate = program.category === "intermediate";
  const displayPhone = settings?.phone?.trim();
  const displayEmail = settings?.email?.trim() || "info@gdclakarai.edu.pk";
  const officeHours = settings?.office_hours?.trim() || "Monday – Saturday, 8:00 AM – 2:00 PM";
  const whatsapp = settings?.whatsapp_number?.trim();

  return (
    <PageLayout>
      <PageBanner title={program.title} subtitle={program.tagline} />

      {/* ── Header / overview ── */}
      <section className="py-12">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left — description */}
            <div className="lg:col-span-2">
              <div className="flex items-start gap-4 mb-6">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${accent.tile}`}>
                  <Icon className="w-7 h-7" strokeWidth={1.4} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${accent.badge}`}>
                      {isIntermediate ? "Intermediate" : program.category === "ad" ? "Associate Degree" : "BS Program"}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                      <Calendar className="w-3 h-3" /> {program.duration || categoryYears(program.category)}
                    </span>
                  </div>
                  <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground">{program.title}</h1>
                </div>
              </div>

              <p className="text-muted-foreground leading-relaxed text-base">
                {program.description || program.tagline}
              </p>
            </div>

            {/* Right — admission + contact card */}
            <aside className="lg:col-span-1">
              <div className="bg-card rounded-2xl border border-border p-5 sticky top-4 shadow-card">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className={`w-5 h-5 ${accent.icon}`} />
                  <h3 className="font-heading font-semibold text-foreground">Admission Requirement</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  {program.admissionRequirement || "Contact the college admission office for current requirements."}
                </p>

                {program.careerPaths.length > 0 && (
                  <div className="border-t border-border pt-4 mt-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Career Pathways</h4>
                    <ul className="space-y-1.5">
                      {program.careerPaths.map((cp, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <ArrowRight className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${accent.icon}`} />
                          <span>{cp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* ── Admission contact — fully managed from the admin panel
                    (Admin → College Settings for phone/email/WhatsApp/hours,
                    Admin → Programs for the per-program note below) ── */}
                <div className="border-t border-border pt-4 mt-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">Admission Contact</h4>
                  <div className="space-y-2 text-sm">
                    {program.contactInfo && (
                      <p className="text-xs text-foreground/85 bg-gold/10 border border-gold/25 rounded-lg px-3 py-2 leading-relaxed">
                        {program.contactInfo}
                      </p>
                    )}
                    {displayPhone && (
                      <a
                        href={`tel:${displayPhone.replace(/\s/g, "")}`}
                        className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                      >
                        <Phone className={`w-4 h-4 shrink-0 ${accent.icon}`} /> {displayPhone}
                      </a>
                    )}
                    {whatsapp && (
                      <a
                        href={`https://wa.me/${whatsapp.replace(/[^0-9]/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                      >
                        <MessageCircle className={`w-4 h-4 shrink-0 ${accent.icon}`} /> WhatsApp: {whatsapp}
                      </a>
                    )}
                    <a
                      href={`mailto:${displayEmail}`}
                      className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors break-all"
                    >
                      <Mail className={`w-4 h-4 shrink-0 ${accent.icon}`} /> {displayEmail}
                    </a>
                    <p className="flex items-start gap-2 text-muted-foreground">
                      <Clock className={`w-4 h-4 mt-0.5 shrink-0 ${accent.icon}`} /> {officeHours}
                    </p>
                  </div>
                </div>

                <Link
                  to="/admission"
                  className="btn-glow mt-5 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl gradient-accent text-white font-semibold shadow-md"
                >
                  Apply Now <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* ── Subjects / Curriculum ── */}
      <section className="py-12 bg-secondary/30">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex items-center gap-2 mb-2">
            <Layers className={`w-5 h-5 ${accent.icon}`} />
            <h2 className="text-xl md:text-2xl font-heading font-bold text-foreground">
              {isIntermediate ? "Subject Combinations" : "Semester-wise Curriculum"}
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mb-8">
            {isIntermediate
              ? "Subjects taught in each year of the Intermediate program. In 2nd Year, Islamiyat is replaced by Pak-Study — per BISE Peshawar HSSC scheme. M.Quran is studied only in 1st Year."
              : program.category === "ad"
              ? "Semester-wise subjects across the two-year Associate Degree program, aligned with the Higher Education Commission (HEC) of Pakistan Associate Degree framework. AD graduates can take lateral entry into the 5th semester of the corresponding BS program at any HEC-recognized university."
              : "Semester-wise subjects across the four-year BS program, aligned with the Higher Education Commission (HEC) of Pakistan curriculum."}
          </p>

          <div className={`grid grid-cols-1 md:grid-cols-2 ${program.subjectGroups.length > 4 ? "lg:grid-cols-4" : "lg:grid-cols-2"} gap-4 md:gap-6`}>
            {program.subjectGroups.map((group, i) => (
              <SubjectCard
                key={i}
                group={group}
                accent={accent}
                emptyPlaceholder="Subjects will be added by the college administration."
              />
            ))}
          </div>

          {/* ── Islamiyat / Pak-Study note ── */}
          {isIntermediate && (
            <div className="mt-8 bg-card border border-gold/30 dark:border-gold/20 rounded-xl p-4 flex items-start gap-3">
              <Info className="w-5 h-5 text-bronze dark:text-gold shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground mb-1">
                  Difference between 1st Year and 2nd Year
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  In 2nd Year, <strong className="text-foreground">Islamiyat is replaced by Pak-Study</strong>, and M.Quran is no longer offered. All other subjects remain unchanged. This substitution is mandated by the BISE Peshawar Higher Secondary School Certificate (HSSC) scheme and applies uniformly across all four Intermediate streams (Pre-Engineering, Pre-Medical, ICS and Arts).
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Cross-links to other programs ── */}
      <section className="py-12">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-lg font-heading font-semibold text-foreground mb-5 flex items-center gap-2">
            <Award className={`w-5 h-5 ${accent.icon}`} /> Other Programs
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            {allPrograms.filter((p) => p.slug !== program.slug).map((p) => {
              const OtherIcon = categoryIcon(p.category);
              return (
                <Link
                  key={p.slug}
                  to={`/programs/${p.category}/${p.slug}`}
                  className="bg-card border border-border rounded-lg p-3 text-center hover:border-primary/40 hover:shadow-sm transition-all"
                >
                  <OtherIcon className="w-5 h-5 mx-auto mb-1.5 text-muted-foreground" />
                  <span className="block text-[11px] font-medium text-foreground truncate">{p.shortName}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </PageLayout>
  );
};

/* ── Subject group card (1st/2nd Year or Semester) ── */
const SubjectCard = ({
  group,
  accent,
  emptyPlaceholder,
}: {
  group: ProgramSubjectGroup;
  accent: (typeof ACCENTS)[ProgramCategory];
  emptyPlaceholder?: string;
}) => {
  return (
    <div className="bg-card rounded-2xl border border-border p-6 shadow-card hover:shadow-elevated transition-shadow">
      <div className={`inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full ${accent.badge} mb-4`}>
        <BookOpen className="w-3 h-3" /> {group.label}
      </div>

      {group.subjects.length > 0 ? (
        <ul className="space-y-2.5">
          {group.subjects.map((s, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-foreground">
              <CheckCircle2 className={`w-4 h-4 mt-0.5 shrink-0 ${accent.icon}`} />
              <span>{s}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-sm text-muted-foreground italic border border-dashed border-border rounded-lg p-4 text-center">
          {emptyPlaceholder}
        </div>
      )}

      {group.note && (
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground leading-relaxed flex items-start gap-2">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{group.note}</span>
          </p>
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   EXPORTS — ProgramsIndex is the default; ProgramDetail is a named export
   that App.tsx mounts at /programs/:category/:slug
   ═══════════════════════════════════════════════════════════════════════════ */

const Programs = () => <ProgramsIndex />;
export { ProgramDetail };
export default Programs;
