import { Toaster } from "@/components/ui/sonner";
import { Github, Moon, Sun, Twitter, Zap } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { ThemeProvider, useTheme } from "next-themes";
import { useEffect, useState } from "react";
import MazeSolver from "./components/MazeSolver";
import SudokuSolver from "./components/SudokuSolver";

function NavBar() {
  const { theme, setTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "py-2" : "py-4"
      }`}
    >
      <div className="max-w-6xl mx-auto px-6">
        <div
          className={`flex items-center justify-between px-6 py-3 rounded-2xl transition-all duration-300 ${
            scrolled
              ? "dark:glass glass-light shadow-xl"
              : "dark:glass glass-light"
          }`}
        >
          {/* Brand */}
          <div className="flex items-center gap-3" data-ocid="nav.link">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-600 flex items-center justify-center shadow-neon">
              <span className="text-white font-display font-bold text-sm">
                AI
              </span>
            </div>
            <span className="font-display font-bold text-base tracking-wide gradient-text hidden sm:block">
              AI SOLVE LAB
            </span>
          </div>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-1">
            {["home", "projects", "sudoku", "maze", "about"].map((link) => (
              <button
                type="button"
                key={link}
                onClick={() => scrollTo(link)}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground capitalize rounded-lg hover:bg-accent transition-all duration-200"
                data-ocid="nav.link"
              >
                {link.charAt(0).toUpperCase() + link.slice(1)}
              </button>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {mounted && (
              <button
                type="button"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-200"
                aria-label="Toggle theme"
                data-ocid="nav.toggle"
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
            <button
              type="button"
              onClick={() => scrollTo("sudoku")}
              className="px-4 py-2 rounded-full text-sm font-semibold bg-gradient-to-r from-cyan-400 to-cyan-500 text-slate-900 hover:opacity-90 transition-all duration-200 shadow-neon"
              data-ocid="nav.primary_button"
            >
              Get Started
            </button>
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

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() =>
              document
                .getElementById("sudoku")
                ?.scrollIntoView({ behavior: "smooth" })
            }
            className="px-8 py-4 rounded-full font-semibold text-base bg-gradient-to-r from-cyan-400 to-cyan-500 text-slate-900 shadow-neon hover:opacity-90 transition-all"
            data-ocid="hero.primary_button"
          >
            Explore Solvers
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() =>
              document
                .getElementById("maze")
                ?.scrollIntoView({ behavior: "smooth" })
            }
            className="px-8 py-4 rounded-full font-semibold text-base border border-border hover:border-purple-500/50 hover:bg-purple-500/10 transition-all"
            data-ocid="hero.secondary_button"
          >
            Try Maze Solver
          </motion.button>
        </div>
      </motion.div>
    </section>
  );
}

function ProjectsSection() {
  const features = [
    {
      icon: "🧩",
      title: "Sudoku Solver",
      desc: "Backtracking constraint-satisfaction with image recognition upload",
      color: "from-purple-500 to-purple-700",
    },
    {
      icon: "🌐",
      title: "Maze Pathfinder",
      desc: "BFS & A* pathfinding with animated step-by-step visualization",
      color: "from-cyan-500 to-cyan-700",
    },
    {
      icon: "🎨",
      title: "Visual Algorithms",
      desc: "Watch algorithms explore space in real-time on a canvas grid",
      color: "from-emerald-500 to-emerald-700",
    },
  ];

  return (
    <section id="projects" className="py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <h2 className="font-display font-bold text-3xl sm:text-4xl mb-4">
            What's Inside
          </h2>
          <p className="text-muted-foreground text-base max-w-xl mx-auto">
            Two interactive algorithm visualizers — built entirely in the
            browser
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="p-6 rounded-2xl border border-border bg-card card-glow hover:border-primary/30 transition-all"
            >
              <div
                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center text-2xl mb-4`}
              >
                {f.icon}
              </div>
              <h3 className="font-display font-semibold text-lg mb-2">
                {f.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {f.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const year = new Date().getFullYear();
  const hostname =
    typeof window !== "undefined" ? window.location.hostname : "";
  const caffeineUrl = `https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(hostname)}`;

  return (
    <footer id="about" className="border-t border-border mt-20 py-10 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Left */}
          <p className="text-sm text-muted-foreground">
            © {year}. Built with ❤️ using{" "}
            <a
              href={caffeineUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              caffeine.ai
            </a>
          </p>

          {/* Center nav */}
          <nav className="flex items-center gap-5">
            {["home", "sudoku", "maze"].map((link) => (
              <button
                type="button"
                key={link}
                onClick={() =>
                  document
                    .getElementById(link)
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="text-sm text-muted-foreground hover:text-foreground capitalize transition-colors"
                data-ocid="footer.link"
              >
                {link.charAt(0).toUpperCase() + link.slice(1)}
              </button>
            ))}
          </nav>

          {/* Right */}
          <div className="flex items-center gap-3">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
              data-ocid="footer.link"
            >
              <Github size={18} />
            </a>
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
              data-ocid="footer.link"
            >
              <Twitter size={18} />
            </a>
            {mounted && (
              <div className="flex items-center gap-1 border border-border rounded-xl p-1 ml-2">
                <button
                  type="button"
                  onClick={() => setTheme("dark")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    theme === "dark"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  data-ocid="footer.toggle"
                >
                  Dark
                </button>
                <button
                  type="button"
                  onClick={() => setTheme("light")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    theme === "light"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  data-ocid="footer.toggle"
                >
                  Light
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}

function MainContent() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        isDark
          ? "bg-gradient-to-br from-[#0B1220] via-[#0E1A2B] to-[#0B1220]"
          : "bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100"
      }`}
    >
      <NavBar />
      <main>
        <HeroSection />
        <ProjectsSection />

        {/* Side-by-side solvers */}
        <section id="sudoku" className="py-10 px-6 scroll-mt-24">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="grid grid-cols-1 xl:grid-cols-2 gap-8"
            >
              {/* Sudoku */}
              <div id="sudoku-card">
                <SudokuSolver />
              </div>
              {/* Maze */}
              <div id="maze">
                <MazeSolver isDark={isDark} />
              </div>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
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
