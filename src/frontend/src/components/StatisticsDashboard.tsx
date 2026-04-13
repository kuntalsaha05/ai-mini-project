import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { loadStats, getSuccessRate, getAverageTime } from "../utils/statistics";

export default function StatisticsDashboard() {
  const stats = loadStats();
  const algorithms = Array.from(new Set(stats.map((s) => s.algorithm)));

  const chartData = algorithms.map((algo) => ({
    algorithm: algo,
    avgTime: getAverageTime(algo),
    successRate: getSuccessRate(algo),
    attempts: stats.filter((s) => s.algorithm === algo).length,
  }));

  const totalSolves = stats.length;
  const totalTime = stats.reduce((sum, s) => sum + s.duration, 0);
  const avgDuration = totalSolves > 0 ? Math.round(totalTime / totalSolves) : 0;

  return (
    <div className="p-6 rounded-2xl border border-border bg-card">
      <h2 className="font-display font-bold text-2xl mb-6">📊 Statistics Dashboard</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="p-4 rounded-lg bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/30">
          <p className="text-sm text-muted-foreground mb-1">Total Solves</p>
          <p className="text-3xl font-bold">{totalSolves}</p>
        </div>
        <div className="p-4 rounded-lg bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30">
          <p className="text-sm text-muted-foreground mb-1">Avg Duration</p>
          <p className="text-3xl font-bold">{avgDuration}ms</p>
        </div>
        <div className="p-4 rounded-lg bg-gradient-to-br from-emerald-500/10 to-green-500/10 border border-emerald-500/30">
          <p className="text-sm text-muted-foreground mb-1">Success Rate</p>
          <p className="text-3xl font-bold">
            {totalSolves > 0 ? Math.round((stats.filter((s) => s.success).length / totalSolves) * 100) : 0}%
          </p>
        </div>
      </div>

      {chartData.length > 0 && (
        <div className="mb-8">
          <h3 className="font-semibold mb-4">Performance by Algorithm</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,100,100,0.2)" />
              <XAxis dataKey="algorithm" stroke="rgba(200,200,200,0.5)" />
              <YAxis stroke="rgba(200,200,200,0.5)" />
              <Tooltip contentStyle={{ backgroundColor: "rgba(20,20,20,0.8)", border: "1px solid rgba(100,100,100,0.5)" }} />
              <Bar dataKey="avgTime" fill="#06b6d4" name="Avg Time (ms)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-2 font-semibold">Algorithm</th>
              <th className="text-right py-2 px-2 font-semibold">Attempts</th>
              <th className="text-right py-2 px-2 font-semibold">Success</th>
              <th className="text-right py-2 px-2 font-semibold">Avg Time</th>
            </tr>
          </thead>
          <tbody>
            {chartData.map((row) => (
              <tr key={row.algorithm} className="border-b border-border hover:bg-accent/50">
                <td className="py-2 px-2">{row.algorithm}</td>
                <td className="text-right py-2 px-2">{row.attempts}</td>
                <td className="text-right py-2 px-2">{row.successRate}%</td>
                <td className="text-right py-2 px-2">{row.avgTime}ms</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {stats.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No statistics yet. Solve some puzzles to see your stats!</p>
        </div>
      )}
    </div>
  );
}
