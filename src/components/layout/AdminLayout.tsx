import { useState, useCallback, useRef, useEffect, memo, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  LogOut, Menu, X, ExternalLink, Moon, Sun, Search, Bell,
  LayoutDashboard, Settings, BarChart2, GraduationCap, ClipboardList,
  FileText, CheckSquare, Wallet, FolderOpen, CalendarDays, Hash,
  Armchair, Trophy, Users, BookOpen, Calendar, Megaphone, Library,
  MonitorPlay, BookMarked, Images, ShieldCheck, type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useDarkMode } from "@/hooks/useDarkMode";
import NotificationBell from "@/components/shared/NotificationBell";

// ── Icon chip — soft tinted square behind every nav icon (premium, calm) ─────
const NavIconChip = ({ item, isActive }: { item: NavItem; isActive: boolean }) => {
  const Icon = item.lucideIcon;
  if (!Icon) return <EmojiIcon emoji={item.emoji} size="w-5 h-5" />;
  return (
    <span
      className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 transition-colors ${
        isActive
          ? "bg-white/15 text-white"
          : item.tint ?? "bg-secondary text-muted-foreground"
      }`}
      aria-hidden
    >
      <Icon className="w-[15px] h-[15px]" />
    </span>
  );
};

// ── Emoji icon component (fallback only — every nav item ships an icon) ──────
const EmojiIcon = ({ emoji, size = "w-5 h-5" }: { emoji: string; size?: string }) => (
  <span className={`${size} flex items-center justify-center text-base leading-none select-none`} aria-hidden>
    {emoji}
  </span>
);

// ── Nav structure with sections ───────────────────────────────────────────────
interface NavItem {
  id: string;
  label: string;
  emoji: string;
  lucideIcon?: LucideIcon;
  lucideColor?: string;
  /** Soft chip classes for the icon square (light + dark). */
  tint?: string;
}
interface NavSection {
  heading: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    heading: "OVERVIEW",
    items: [
      { id: "overview",         label: "Overview",              emoji: "📊",
        lucideIcon: LayoutDashboard, tint: "bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300" },
      { id: "settings",         label: "College Settings",      emoji: "⚙️",
        lucideIcon: Settings,        tint: "bg-zinc-100 text-zinc-700 dark:bg-zinc-400/15 dark:text-zinc-300" },
      { id: "site-analytics",   label: "Site Analytics",        emoji: "📈",
        lucideIcon: BarChart2,       tint: "bg-violet-100 text-violet-700 dark:bg-violet-400/15 dark:text-violet-300" },
    ],
  },
  {
    heading: "STUDENTS",
    items: [
      { id: "students",     label: "Manage Students",     emoji: "🎓",
        lucideIcon: GraduationCap,   tint: "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300" },
      { id: "admissions",   label: "Admissions",          emoji: "📋",
        lucideIcon: ClipboardList,   tint: "bg-sky-100 text-sky-700 dark:bg-sky-400/15 dark:text-sky-300" },
      { id: "results",      label: "Manage Results",      emoji: "📝",
        lucideIcon: FileText,        tint: "bg-orange-100 text-orange-700 dark:bg-orange-400/15 dark:text-orange-300" },
      { id: "attendance",   label: "Attendance",          emoji: "✅",
        lucideIcon: CheckSquare,     tint: "bg-teal-100 text-teal-700 dark:bg-teal-400/15 dark:text-teal-300" },
      { id: "fees",          label: "Fee Management",       emoji: "💰",
        lucideIcon: Wallet,          tint: "bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300" },
      { id: "student-records", label: "Student Records",   emoji: "🗂️",
        lucideIcon: FolderOpen,      tint: "bg-indigo-100 text-indigo-700 dark:bg-indigo-400/15 dark:text-indigo-300" },
    ],
  },
  {
    heading: "EXAMS",
    items: [
      { id: "exam-date-sheet", label: "Exam Date Sheet",   emoji: "🗓️",
        lucideIcon: CalendarDays,    tint: "bg-rose-100 text-rose-700 dark:bg-rose-400/15 dark:text-rose-300" },
      { id: "exam-rolls",      label: "Exam Roll Numbers", emoji: "🔢",
        lucideIcon: Hash,            tint: "bg-cyan-100 text-cyan-700 dark:bg-cyan-400/15 dark:text-cyan-300" },
      { id: "exam-seating",    label: "Exam Seating",      emoji: "🪑",
        lucideIcon: Armchair,        tint: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-400/15 dark:text-fuchsia-300" },
      { id: "merit-list",      label: "Merit List",        emoji: "🏆",
        lucideIcon: Trophy,          tint: "bg-yellow-100 text-yellow-700 dark:bg-yellow-400/15 dark:text-yellow-300" },
    ],
  },
  {
    heading: "COLLEGE",
    items: [
      { id: "teachers",      label: "Manage Faculty",   emoji: "👨‍🏫",
        lucideIcon: Users,           tint: "bg-rose-100 text-rose-700 dark:bg-rose-400/15 dark:text-rose-300" },
      { id: "programs",      label: "Manage Programs",  emoji: "🎓",
        lucideIcon: BookOpen,        tint: "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300" },
      { id: "timetables",    label: "Timetables",        emoji: "📅",
        lucideIcon: Calendar,        tint: "bg-sky-100 text-sky-700 dark:bg-sky-400/15 dark:text-sky-300" },
      { id: "events",        label: "Event Calendar",    emoji: "🗓️",
        lucideIcon: CalendarDays,    tint: "bg-violet-100 text-violet-700 dark:bg-violet-400/15 dark:text-violet-300" },
      { id: "announcements", label: "Announcements",     emoji: "📢",
        lucideIcon: Megaphone,       tint: "bg-pink-100 text-pink-700 dark:bg-pink-400/15 dark:text-pink-300" },
      { id: "library",       label: "Library",           emoji: "📚",
        lucideIcon: Library,         tint: "bg-indigo-100 text-indigo-700 dark:bg-indigo-400/15 dark:text-indigo-300" },
      { id: "online-classes",label: "Online Classes",    emoji: "💻",
        lucideIcon: MonitorPlay,     tint: "bg-blue-100 text-blue-700 dark:bg-blue-400/15 dark:text-blue-300" },
    ],
  },
  {
    heading: "CONTENT",
    items: [
      { id: "notes",   label: "Notes Manager",    emoji: "📓",
        lucideIcon: BookMarked,      tint: "bg-lime-100 text-lime-700 dark:bg-lime-400/15 dark:text-lime-300" },
      { id: "videos",  label: "Gallery",          emoji: "🖼️",
        lucideIcon: Images,          tint: "bg-purple-100 text-purple-700 dark:bg-purple-400/15 dark:text-purple-300" },
    ],
  },
  {
    heading: "ADMIN ACCESS",
    items: [
      { id: "users", label: "Manage Users", emoji: "👤",
        lucideIcon: ShieldCheck,     tint: "bg-red-100 text-red-700 dark:bg-red-400/15 dark:text-red-300" },
    ],
  },
];

// Flat list for searching
const allNavItems: NavItem[] = navSections.flatMap(s => s.items);

// First few items for the mobile bottom bar quick-access row
const bottomBarItems: NavItem[] = allNavItems.slice(0, 4);

// Deep search index
const searchIndex: { label: string; sublabel?: string; tabId: string }[] = [
  ...allNavItems.map(item => ({ label: item.label, tabId: item.id })),
  { label: "Analytics",         sublabel: "Site Analytics",          tabId: "site-analytics" },
  { label: "Page Views",        sublabel: "Site Analytics",          tabId: "site-analytics" },
  { label: "Visitors",          sublabel: "Site Analytics",          tabId: "site-analytics" },
  { label: "Notices",          sublabel: "Announcements",        tabId: "announcements" },
  { label: "Exam Dates",       sublabel: "Event Calendar",       tabId: "events" },
  { label: "Holidays",         sublabel: "Event Calendar",       tabId: "events" },
  { label: "PTM",              sublabel: "Event Calendar",       tabId: "events" },
  { label: "Sports Day",       sublabel: "Event Calendar",       tabId: "events" },
  { label: "Results Day",      sublabel: "Event Calendar",       tabId: "events" },
  { label: "News",             sublabel: "Announcements",        tabId: "announcements" },
  { label: "Achievements",     sublabel: "Announcements",        tabId: "announcements" },
  { label: "Merit List",       sublabel: "Announcements",        tabId: "announcements" },
  { label: "Videos",           sublabel: "Library",              tabId: "library" },
  { label: "Gallery",          sublabel: "Gallery",               tabId: "videos" },
  { label: "Add Admin",        sublabel: "Admin Access",          tabId: "users" },
  { label: "Delete Admin",     sublabel: "Admin Access",          tabId: "users" },
  { label: "Manage Users",     sublabel: "Admin Access",          tabId: "users" },
  { label: "YouTube",          sublabel: "Library",              tabId: "library" },
  { label: "Exam Schedule",    sublabel: "Exams · Date Sheet",    tabId: "exam-date-sheet" },
  { label: "Exam Date Sheet",  sublabel: "Exams · Date Sheet",    tabId: "exam-date-sheet" },
  { label: "Exam Roll Numbers",sublabel: "Exams · Roll Numbers",  tabId: "exam-rolls" },
  { label: "Admit Card",       sublabel: "Exams · Roll Numbers",  tabId: "exam-rolls" },
  { label: "Mark Attendance",  sublabel: "Attendance",           tabId: "attendance" },
  { label: "Monthly Report",   sublabel: "Attendance",           tabId: "attendance" },
  { label: "Upload Results",   sublabel: "Manage Results",       tabId: "results" },
  { label: "Marksheet",        sublabel: "Manage Results",       tabId: "results" },
  { label: "Class Timetable",  sublabel: "Timetables",           tabId: "timetables" },
  { label: "Exam Timetable",   sublabel: "Timetables",           tabId: "timetables" },
  { label: "School Files",     sublabel: "Library",              tabId: "library" },
  { label: "Fee Structures",   sublabel: "Fee Management",       tabId: "fees" },
  { label: "Fee Vouchers",     sublabel: "Fee Management",       tabId: "fees" },
  { label: "Payments",         sublabel: "Fee Management",       tabId: "fees" },
  { label: "Fee Reports",      sublabel: "Fee Management",       tabId: "fees" },
  { label: "Defaulters List",  sublabel: "Fee Management",       tabId: "fees" },
  // ── Exam Seating synonyms ──
  { label: "Seating",          sublabel: "Exam Seating",         tabId: "exam-seating" },
  { label: "Seating Plan",     sublabel: "Exam Seating",         tabId: "exam-seating" },
  { label: "Exam Hall",        sublabel: "Exam Seating",         tabId: "exam-seating" },
  { label: "Room",             sublabel: "Exam Seating",         tabId: "exam-seating" },
  { label: "Desk",             sublabel: "Exam Seating",         tabId: "exam-seating" },
  { label: "Desk Layout",      sublabel: "Exam Seating",         tabId: "exam-seating" },
  { label: "Desk Map",         sublabel: "Exam Seating",         tabId: "exam-seating" },
  { label: "Invigilator",      sublabel: "Exam Seating",         tabId: "exam-seating" },
  { label: "QR Stickers",      sublabel: "Exam Seating",         tabId: "exam-seating" },
  { label: "Anti-Cheat",       sublabel: "Exam Seating",         tabId: "exam-seating" },
  // ── Merit List synonyms ──
  { label: "Merit List",       sublabel: "Merit List",           tabId: "merit-list" },
  { label: "Toppers",          sublabel: "Merit List",           tabId: "merit-list" },
  { label: "School Merit",     sublabel: "Merit List",           tabId: "merit-list" },
  { label: "Position Holders", sublabel: "Merit List",           tabId: "merit-list" },
  // ── Live Exam Console synonyms (now nested inside Exam Seating → Live Console tab) ──
  { label: "Console",          sublabel: "Exam Seating · Live Console",    tabId: "exam-seating" },
  { label: "Live Console",     sublabel: "Exam Seating · Live Console",    tabId: "exam-seating" },
  { label: "Exam Day",         sublabel: "Exam Seating · Live Console",    tabId: "exam-seating" },
  { label: "Control Room",     sublabel: "Exam Seating · Live Console",    tabId: "exam-seating" },
  { label: "Hall Operations",  sublabel: "Exam Seating · Live Console",    tabId: "exam-seating" },
  { label: "Tally",            sublabel: "Exam Seating · Live Console",    tabId: "exam-seating" },
  { label: "Absentee",         sublabel: "Exam Seating · Live Console",    tabId: "exam-seating" },
  { label: "Absentee List",    sublabel: "Exam Seating · Live Console",    tabId: "exam-seating" },
  { label: "Re-Exam",          sublabel: "Exam Seating · Live Console",    tabId: "exam-seating" },
  { label: "Invigilation",     sublabel: "Exam Seating · Live Console",    tabId: "exam-seating" },
  { label: "Paper Countdown",  sublabel: "Exam Seating · Live Console",    tabId: "exam-seating" },
  { label: "Live Attendance",  sublabel: "Exam Seating · Live Console",    tabId: "exam-seating" },
];

// Case-insensitive match against a label or any of its known synonyms
// in searchIndex, so e.g. typing "fee" finds "Fee Management".
const matchesQuery = (item: NavItem, query: string) => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (item.label.toLowerCase().includes(q)) return true;
  return searchIndex.some(
    (e) => e.tabId === item.id && e.label.toLowerCase().includes(q)
  );
};

// ── PERFORMANCE: NavBtn + SectionedNav are defined OUTSIDE the parent ────────
// Previously these were defined INSIDE <AdminLayout>, which meant every
// render of the parent (e.g. typing in the search box, opening the mobile
// sidebar) created NEW component identities for NavBtn and SectionedNav.
// React then unmounted + remounted every single nav button on every render
// → focus loss, layout thrash, visible jank, and slow search filtering.
// Moving them outside + wrapping NavBtn in memo() means React can now skip
// re-rendering buttons whose props haven't changed. Pure refactor — the DOM
// output is byte-identical to before.
type NavBtnProps = {
  item: NavItem;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onItemClick?: () => void;
};
const NavBtn = memo(({ item, activeTab, onTabChange, onItemClick }: NavBtnProps) => {
  const isActive = activeTab === item.id;
  return (
    <button
      key={item.id}
      data-active={isActive ? "true" : "false"}
      onClick={() => { onTabChange(item.id); onItemClick?.(); }}
      className={`group relative w-full flex items-center gap-2.5 pl-3 pr-2.5 py-1.5 rounded-xl text-sm font-medium transition-all duration-200 ${
        isActive
          ? "bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-600 dark:from-emerald-800 dark:via-emerald-700 dark:to-emerald-700 text-white shadow-md shadow-emerald-900/20 ring-1 ring-emerald-500/30"
          : "hover:bg-secondary text-foreground hover:shadow-sm"
      }`}
    >
      {/* Gold left indicator on the active item */}
      {isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-full bg-gradient-to-b from-amber-400 to-yellow-500" aria-hidden />
      )}
      <NavIconChip item={item} isActive={isActive} />
      <span className="truncate">{item.label}</span>
    </button>
  );
});
NavBtn.displayName = "NavBtn";

type SectionedNavProps = {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onItemClick?: () => void;
  query?: string;
};
// ── PERFORMANCE: SectionedNav memoizes the filtered sections array so the
// .map().filter() work only re-runs when `query` actually changes — not on
// every parent render. Without this, typing in the search box would rebuild
// the entire navSections-derived array on every keystroke even when the
// filtered result was identical to the previous render.
const SectionedNav = memo(({ activeTab, onTabChange, onItemClick, query = "" }: SectionedNavProps) => {
  const filteredSections = useMemo(() =>
    navSections
      .map(section => ({
        ...section,
        items: section.items.filter(item => matchesQuery(item, query)),
      }))
      .filter(section => section.items.length > 0),
    [query]
  );

  if (query.trim() && filteredSections.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        No matches for "{query.trim()}"
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {filteredSections.map(section => (
        <div key={section.heading}>
          <p className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground tracking-widest uppercase px-3 mb-1.5">
            <span className="h-px w-3 bg-gradient-to-r from-amber-400 to-transparent" aria-hidden />
            {section.heading}
          </p>
          <div className="space-y-0.5">
            {section.items.map(item => <NavBtn key={item.id} item={item} activeTab={activeTab} onTabChange={onTabChange} onItemClick={onItemClick} />)}
          </div>
        </div>
      ))}
    </div>
  );
});
SectionedNav.displayName = "SectionedNav";

interface AdminLayoutProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  children: React.ReactNode;
}

const AdminLayout = ({ activeTab, onTabChange, children }: AdminLayoutProps) => {
  const { profile, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopQuery, setDesktopQuery] = useState("");
  const [mobileQuery, setMobileQuery] = useState("");
  const mobileNavRef = useRef<HTMLElement>(null);
  const navigate = useNavigate();
  const { isDark, toggle } = useDarkMode();

  useEffect(() => {
    if (!sidebarOpen) return;
    requestAnimationFrame(() => {
      const nav = mobileNavRef.current;
      if (!nav) return;
      const active = nav.querySelector('[data-active="true"]') as HTMLElement | null;
      if (active) {
        const top = active.offsetTop - nav.clientHeight / 2 + active.clientHeight / 2;
        nav.scrollTop = Math.max(0, top);
      }
    });
  }, [sidebarOpen]);

  const handleSignOut = async () => { await signOut(); navigate("/"); };

  const initials = profile?.full_name
    ?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "A";

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-[260px] bg-card border-r border-border shrink-0 sticky top-0 h-screen">
        <div className="p-4 border-b border-border bg-gradient-to-br from-emerald-50 via-card to-amber-50/70 dark:from-emerald-950/50 dark:via-card dark:to-amber-900/15">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 ring-2 ring-amber-400/50">
              <img src="/icon-512.png" alt="Government Degree College Lakarai logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <span className="font-heading font-bold text-foreground text-sm">Government Degree College Lakarai</span>
              <p className="text-[10px] font-semibold uppercase tracking-wider bg-gradient-to-r from-emerald-600 to-amber-500 bg-clip-text text-transparent">Admin Panel</p>
            </div>
          </Link>
        </div>

        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover ring-2 ring-primary/20" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-600 to-amber-500 flex items-center justify-center text-white text-sm font-bold shadow-md shadow-emerald-900/20">
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{profile?.full_name || "Admin"}</p>
              <span className="inline-block text-[10px] font-semibold uppercase bg-gradient-to-r from-amber-500 to-yellow-500 text-white px-2 py-0.5 rounded-full mt-0.5 tracking-wider shadow-sm">
                Administrator
              </span>
            </div>
          </div>
        </div>

        {/* Desktop Search — filters the menu below in place, never opens a popup */}
        <div className="px-3 py-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={desktopQuery}
              onChange={(e) => setDesktopQuery(e.target.value)}
              placeholder="Search anything..."
              className="w-full pl-8 pr-2 py-1.5 text-xs rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-colors"
            />
          </div>
        </div>

        <nav className="flex-1 p-3 overflow-y-auto">
          <SectionedNav activeTab={activeTab} onTabChange={onTabChange} query={desktopQuery} />
        </nav>

        <div className="p-3 border-t border-border space-y-1">
          <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-40 h-14 bg-card border-b border-border flex items-center px-4 gap-3 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-amber-400/50 after:to-transparent relative">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-secondary text-foreground transition-colors">
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="font-heading font-semibold text-foreground">
            {allNavItems.find(n => n.id === activeTab)?.label || "Admin Dashboard"}
          </h1>
          <div className="ml-auto flex items-center gap-2">
            <NotificationBell />
            {/* SPA link (NOT <a href>) — a plain anchor here did a FULL
                document reload of the whole admin panel just to peek at the
                public site, losing the admin's scroll/forms/tabs. */}
            <Link to="/" className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-secondary transition-colors">
              <ExternalLink className="w-3.5 h-3.5" /> View Website
            </Link>
            <button onClick={toggle} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground transition-colors" title={isDark ? "Switch to light mode" : "Switch to dark mode"}>
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button onClick={handleSignOut} className="flex items-center gap-1.5 text-xs font-medium text-destructive px-3 py-1.5 rounded-lg hover:bg-destructive/10 transition-colors">
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 pb-20 lg:pb-6">{children}</main>
      </div>

      {/* Mobile bottom bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border">
        <div className="flex items-center justify-around py-1">
          {bottomBarItems.map(item => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`relative flex flex-col items-center gap-0.5 p-2 min-w-[3rem] transition-colors ${isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                {item.lucideIcon ? (
                  <item.lucideIcon className="w-5 h-5" />
                ) : (
                  <span className="text-lg leading-none">{item.emoji}</span>
                )}
                {isActive && (
                  <span className="absolute -top-px left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-gradient-to-r from-emerald-500 to-amber-400" aria-hidden />
                )}
              </button>
            );
          })}
          <button onClick={() => setSidebarOpen(true)} className="flex flex-col items-center gap-0.5 p-2 min-w-[3rem] text-muted-foreground">
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-foreground/50" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-72 bg-card h-full shadow-xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-br from-emerald-50 via-card to-amber-50/70 dark:from-emerald-950/50 dark:via-card dark:to-amber-900/15">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 ring-2 ring-amber-400/50">
                  <img src="/icon-512.png" alt="Government Degree College Lakarai logo" className="w-full h-full object-cover" />
                </div>
                <div>
                  <span className="font-heading font-bold text-foreground text-sm leading-tight block">Government Degree College Lakarai</span>
                  <p className="text-[10px] font-semibold uppercase tracking-wider bg-gradient-to-r from-emerald-600 to-amber-500 bg-clip-text text-transparent leading-tight">Admin Panel</p>
                </div>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="p-2 rounded-lg hover:bg-secondary">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-3 py-2 border-b border-border">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  value={mobileQuery}
                  onChange={(e) => setMobileQuery(e.target.value)}
                  placeholder="Search anything..."
                  className="w-full pl-8 pr-2 py-1.5 text-xs rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-colors"
                />
              </div>
            </div>
            <nav ref={mobileNavRef} className="flex-1 p-3 overflow-y-auto">
              <SectionedNav activeTab={activeTab} onTabChange={onTabChange} onItemClick={() => setSidebarOpen(false)} query={mobileQuery} />
            </nav>
            <div className="p-3 border-t border-border space-y-1">
              <Link to="/" onClick={() => setSidebarOpen(false)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-primary hover:bg-primary/10 transition-colors">
                <ExternalLink className="w-4 h-4" /> Main Website
              </Link>
              <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10">
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLayout;
