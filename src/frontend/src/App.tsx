import { Toaster } from "@/components/ui/sonner";
import { Github, Moon, Save, Sun, Twitter, Zap } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { ThemeProvider, useTheme } from "next-themes";
import { useEffect, useState } from "react";
import EducationalPanel from "./components/EducationalPanel";
import MazeComparison from "./components/MazeComparison2";
import MazeSolver from "./components/MazeSolver";
import SaveLoadExportModal from "./components/SaveLoadExportModal";
import StatisticsDashboard from "./components/StatisticsDashboard";
import SudokuSolver from "./components/SudokuSolver";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";

function NavBar({ onSaveClick }: { onSaveClick: () => void }) {
  const { theme, setTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "py-2" : "py-4"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6">
        <div
          className={`flex items-center justify-between px-6 py-3 rounded-2xl transition-all duration-300 ${
            scrolled
              ? "dark:glass glass-light shadow-xl"
              : "dark:glass glass-light"
          }`}
        >
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-600 flex items-center justify-center shadow-neon">
              <span className="text-white font-display font-bold text-sm">
                AI
              </span>
            </div>
            <span className="font-display font-bold text-base tracking-wide gradient-text hidden sm:block">
              AI SOLVE LAB
            </span>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <button
              onClick={onSaveClick}
              className="px-3 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-foreground/50 transition-all flex items-center gap-2 text-sm"
              title="Press S to toggle (Ctrl+S)"
            >
              <Save size={16} />
              <span className="hidden sm:inline">Save</span>
            </button>

            {mounted && (
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
              >
                <AnimatePresence mode="wait">
                  {theme === "dark" ? (
                    <motion.div
                      key="sun"
                      initial={{ rotate: -90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: 90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Sun size={18} />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="moon"
                      initial={{ rotate: 90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: -90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Moon size={18} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            )}
            <a
              href="https://github.com"
              className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
            >
              <Github size={18} />
            </a>
            <a
              href="https://twitter.com"
              className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
            >
              <Twitter size={18} />
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}

function HeroSection() {
  return (
    <section
      id="home"
      className="relative pt-40 pb-20 px-6 text-center overflow-hidden"
    >
      {/* Background orbs */}
      <div className="absolute top-20 left-1/4 w-96 h-96 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
      <div className="absolute top-32 right-1/4 w-80 h-80 rounded-full bg-purple-600/10 blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="relative max-w-4xl mx-auto"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 text-sm font-medium mb-8">
          <Zap size={14} />
          Powered by intelligent algorithms
        </div>

        <h1 className="font-display font-extrabold text-5xl sm:text-6xl lg:text-7xl tracking-tight mb-6 leading-[1.05]">
          <span className="gradient-text">AI SOLVE LAB</span>
          <br />
          <span className="text-foreground">Smart Solvers</span>
        </h1>

        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
          Visualize backtracking sudoku solvers and animated maze pathfinding
          algorithms — BFS, A* — all running live in your browser.
        </p>

      </motion.div>
    </section>
  );
}



function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border mt-20 py-10 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-sm text-muted-foreground">
            © {year}. AI Solve Lab — Algorithm visualizer. Built with React & Framer Motion.
          </p>

          <div className="flex items-center gap-3">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
            >
              <Github size={18} />
            </a>
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
            >
              <Twitter size={18} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function MainContent() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [activeTab, setActiveTab] = useState("solvers");
  const [saveModalOpen, setSaveModalOpen] = useState(false);

  const tabs = [
    { id: "solvers", label: "Solvers", icon: "🔧" },
    { id: "stats", label: "Statistics", icon: "📊" },
    { id: "learn", label: "Learn", icon: "📚" },
  ];

  useKeyboardShortcuts({
    s: () => setSaveModalOpen(!saveModalOpen),
  });

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        isDark
          ? "bg-gradient-to-br from-[#0B1220] via-[#0E1A2B] to-[#0B1220]"
          : "bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100"
      }`}
    >
      <NavBar onSaveClick={() => setSaveModalOpen(true)} />

      <main className="pt-24 pb-10 px-6">
        <div className="max-w-7xl mx-auto">
          <HeroSection />

          {/* Tab Navigation */}
          <div className="flex gap-2 mb-8 overflow-x-auto pb-2 justify-center">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-2 rounded-lg font-semibold text-sm transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-cyan-400 to-cyan-500 text-slate-900 shadow-lg"
                    : "border border-border text-muted-foreground hover:text-foreground hover:border-foreground/50"
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <AnimatePresence mode="wait">
            {activeTab === "solvers" && (
              <motion.div
                key="solvers"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <SudokuSolver />
                  <MazeSolver isDark={isDark} />
                </div>
                <div>
                  <MazeComparison isDark={isDark} />
                </div>
              </motion.div>
            )}

            {activeTab === "stats" && (
              <motion.div
                key="stats"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <StatisticsDashboard />
              </motion.div>
            )}

            {activeTab === "learn" && (
              <motion.div
                key="learn"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <EducationalPanel />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <Footer />
      <SaveLoadExportModal isOpen={saveModalOpen} onClose={() => setSaveModalOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <MainContent />
      <Toaster />
    </ThemeProvider>
  );
}
