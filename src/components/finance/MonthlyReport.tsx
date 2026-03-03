import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Crown } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import { Expense, formatTaka, getCategoryColor, CATEGORIES } from "@/lib/finance-utils";

interface Props {
  expenses: Expense[];
}

export default function MonthlyReport({ expenses }: Props) {
  const [offset, setOffset] = useState(0);

  const now = new Date();
  const month = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const monthLabel = month.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const prefix = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;

  const monthExpenses = useMemo(
    () => expenses.filter((e) => e.date.startsWith(prefix)),
    [expenses, prefix]
  );

  const totalSpend = monthExpenses.reduce((s, e) => s + e.amount, 0);

  // Category breakdown
  const catBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    monthExpenses.forEach((e) => (map[e.category] = (map[e.category] || 0) + e.amount));
    return Object.entries(map)
      .map(([name, value]) => ({ name, value, pct: totalSpend > 0 ? (value / totalSpend) * 100 : 0, color: getCategoryColor(name) }))
      .sort((a, b) => b.value - a.value);
  }, [monthExpenses, totalSpend]);

  // Day-by-day
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const dailyData = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const ds = `${prefix}-${String(day).padStart(2, "0")}`;
      const total = monthExpenses.filter((e) => e.date === ds).reduce((s, e) => s + e.amount, 0);
      return { day, amount: total };
    });
  }, [monthExpenses, prefix, daysInMonth]);

  // Biggest expense
  const biggest = monthExpenses.length > 0
    ? monthExpenses.reduce((max, e) => (e.amount > max.amount ? e : max), monthExpenses[0])
    : null;

  return (
    <div className="page-transition space-y-6">
      {/* Month Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-serif text-foreground">Monthly Report</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => setOffset((o) => o - 1)} className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground transition">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-medium text-foreground min-w-[140px] text-center">{monthLabel}</span>
          <button onClick={() => setOffset((o) => Math.min(o + 1, 0))} disabled={offset >= 0} className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground transition disabled:opacity-30">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Total */}
      <div className="bg-card border border-border rounded-xl p-5 gold-glow">
        <p className="text-sm text-muted-foreground mb-1">Total Spend</p>
        <p className="text-3xl font-bold text-primary">{formatTaka(totalSpend)}</p>
      </div>

      {/* Area Chart */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm text-muted-foreground mb-4">Spending Trend</h3>
        {totalSpend === 0 ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">No data for this month</div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={dailyData}>
              <defs>
                <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(41 100% 47%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(41 100% 47%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(215 10% 55%)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(215 10% 55%)" }} axisLine={false} tickLine={false} width={45} />
              <Tooltip
                contentStyle={{ background: "hsl(215 19% 11%)", border: "1px solid hsl(215 15% 20%)", borderRadius: 8, color: "#fff", fontSize: 12 }}
                formatter={(v: number) => [`৳${v.toLocaleString()}`, "Spent"]}
              />
              <Area type="monotone" dataKey="amount" stroke="hsl(41 100% 47%)" fill="url(#goldGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Category Breakdown */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm text-muted-foreground mb-4">Category Breakdown</h3>
        {catBreakdown.length === 0 ? (
          <p className="text-sm text-muted-foreground">No expenses this month</p>
        ) : (
          <div className="space-y-3">
            {catBreakdown.map((c) => (
              <div key={c.name}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: c.color }} />
                    <span className="text-sm text-foreground">{c.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{c.pct.toFixed(1)}%</span>
                    <span className="text-sm font-medium text-foreground">{formatTaka(c.value)}</span>
                  </div>
                </div>
                <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${c.pct}%`, background: c.color }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Biggest Expense */}
      {biggest && (
        <div className="bg-card border border-border rounded-xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Crown size={18} className="text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Biggest Single Expense</p>
            <p className="text-sm font-medium text-foreground">{biggest.category}{biggest.note ? ` — ${biggest.note}` : ""}</p>
          </div>
          <p className="text-lg font-bold text-primary">{formatTaka(biggest.amount)}</p>
        </div>
      )}
    </div>
  );
}
