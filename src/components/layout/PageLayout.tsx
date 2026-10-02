import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import ScrollToTop from "../shared/ScrollToTop";

const PageLayout = ({ children }: { children: ReactNode }) => {
  // FOOTER IS HOME-ONLY — the big site footer (brand, quick links,
  // programs, contact info) is rendered exclusively on the Home page.
  // Every other page/tab (About, Contact, Programs, Gallery, Results,
  // admin pages, …) ends with its own content and no footer, keeping
  // inner pages clean and focused.
  const { pathname } = useLocation();
  const isHome = pathname === "/";

  return (
    // Bottom padding = the mobile bottom dock's height (5 icon rows ≈ 52px)
    // + its safe-area inset, so the footer / last section can never hide
    // BEHIND the fixed dock (X-Twitter-style clearance). Desktop (xl+) has
    // no dock, so the padding resets to 0 there.
    <div className="min-h-screen flex flex-col overflow-x-clip pb-[calc(52px+env(safe-area-inset-bottom,0px))] xl:pb-0">
      <Navbar />
      <main className="flex-1">{children}</main>
      {isHome && <Footer />}
      <ScrollToTop />
    </div>
  );
};

export default PageLayout;
