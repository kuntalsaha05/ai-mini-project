import { Download, Save, Upload, X } from "lucide-react";
import { useState } from "react";
import { loadStats } from "../utils/statistics";
import { toast } from "sonner";

interface SaveLoadExportProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SaveLoadExportModal({ isOpen, onClose }: SaveLoadExportProps) {
  const [savedName, setSavedName] = useState("");

  const handleExportStats = () => {
    const stats = loadStats();
    const json = JSON.stringify(stats, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ai-solve-lab-stats-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPuzzle = () => {
    // TODO: Export current puzzle
    alert("Export puzzle feature coming soon!");
  };

  const handleImportStats = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const parsed = JSON.parse(evt.target?.result as string);
          const importedStats = Array.isArray(parsed)
            ? parsed
            : Array.isArray(parsed?.statistics)
              ? parsed.statistics
              : null;

          if (!importedStats) {
            throw new Error("Invalid stats file format");
          }

          const existingRaw = localStorage.getItem("ai-solve-lab");
          const existing = existingRaw
            ? JSON.parse(existingRaw)
            : {
                savedPuzzles: {},
                statistics: [],
                preferences: {
                  theme: "dark",
                  soundEnabled: true,
                  animationSpeed: "medium",
                },
              };

          const next = {
            savedPuzzles: existing.savedPuzzles ?? {},
            statistics: importedStats,
            preferences: {
              theme: existing.preferences?.theme ?? "dark",
              soundEnabled: existing.preferences?.soundEnabled ?? true,
              animationSpeed: existing.preferences?.animationSpeed ?? "medium",
            },
          };

          localStorage.setItem("ai-solve-lab", JSON.stringify(next));
          toast.success("Statistics imported successfully");
          onClose();
        } catch {
          toast.error("Failed to import stats. Please use a valid JSON export.");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display font-bold text-xl">Save, Load & Export</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Close modal"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleExportStats}
            className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent transition-colors"
          >
            <Download size={18} className="text-cyan-400" />
            <div className="text-left">
              <p className="font-semibold text-sm">Export Statistics</p>
              <p className="text-xs text-muted-foreground">Download your solve history as JSON</p>
            </div>
          </button>

          <button
            onClick={handleImportStats}
            className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent transition-colors"
          >
            <Upload size={18} className="text-purple-400" />
            <div className="text-left">
              <p className="font-semibold text-sm">Import Statistics</p>
              <p className="text-xs text-muted-foreground">Load previous stats from a JSON file</p>
            </div>
          </button>

          <button
            onClick={handleExportPuzzle}
            className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent transition-colors"
          >
            <Save size={18} className="text-emerald-400" />
            <div className="text-left">
              <p className="font-semibold text-sm">Save Puzzle</p>
              <p className="text-xs text-muted-foreground">Save current puzzle to continue later</p>
            </div>
          </button>
        </div>

        <div className="mt-6 p-4 rounded-lg bg-blue-500/10 border border-blue-500/30 text-sm">
          <p className="text-xs text-muted-foreground">
            Your data is stored locally in your browser and never sent to any server.
          </p>
        </div>
      </div>
    </div>
  );
}
