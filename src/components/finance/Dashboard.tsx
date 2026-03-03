import { useEffect, useState } from "react";
import {
  TrendingUp, TrendingDown, Flame, Lightbulb, Plus, PiggyBank, CalendarDays, Banknote,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import {
  Expense, formatTaka, getStreak, getSmartInsight, getCategoryColor, getToday,
} from "@/lib/finance-utils";
import type { Page } from "./Navigation";

function AnimatedNumber({ value, prefix = "" }: { value: number; prefix?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = value;
    const duration = 800;
    const startTime = performance.now();
    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      start = end * eased;
      setDisplay(start);
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value]);
  return (
    <span className="count-up">
      {prefix}{display.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </span>
  );
}

interface Props {
  expenses: Expense[];
  budget: number;
  onNavigate: (p: Page) => void;
}

export default function Dashboard({ expenses, budget, onNavigate }: Props) {
  const today = getToday();
  const todaySpend = expenses.filter((e) => e.date === today).reduce((s, e) => s + e.amount, 0);

  const now = new Date();
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthExpenses = expenses.filter((e) => e.date.startsWith(monthStr));
  const monthSpend = monthExpenses.reduce((s, e) => s + e.amount, 0);
  const remaining = Math.max(budget - monthSpend, 0);
  const savingsProgress = budget > 0 ? Math.round((remaining / budget) * 100) : 0;

  // Last 7 days
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const ds = d.toISOString().slice(0, 10);
    const total = expenses.filter((e) => e.date === ds).reduce((s, e) => s + e.amount, 0);
    return { day: d.toLocaleDateString("en-US", { weekday: "short" }), amount: total };
  });

  // Top 3 categories
  const catMap: Record<string, number> = {};
  monthExpenses.forEach((e) => (catMap[e.category] = (catMap[e.category] || 0) + e.amount));
  const topCats = Object.entries(catMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, value]) => ({ name, value, color: getCategoryColor(name) }));

  const streak = getStreak(expenses);
  const insight = getSmartInsight(expenses);

  const greeting = now.getHours() < 12 ? "Good Morning" : now.getHours() < 18 ? "Good Afternoon" : "Good Evening";
  const dateStr = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  const cards = [
    { label: "Today's Spend", value: todaySpend, icon: Banknote, accent: false },
    { label: "This Month", value: monthSpend, icon: CalendarDays, accent: false },
    { label: "Budget Remaining", value: remaining, icon: PiggyBank, accent: true },
    { label: "Savings Progress", value: savingsProgress, icon: TrendingUp, accent: false, suffix: "%" },
  ];

  return (
    <div className="page-transition space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl md:text-3xl font-serif text-foreground">{greeting} 👋</h2>
        <p className="text-muted-foreground text-sm mt-1">{dateStr}</p>
      </div>

      {/* Streak & Insight */}
      <div className="flex flex-col sm:flex-row gap-3">
        {streak > 0 && (
          <div className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-lg text-sm font-medium">
            <Flame size={16} /> {streak}-day logging streak! 🔥
          </div>
        )}
        <div className="flex items-center gap-2 bg-secondary px-4 py-2 rounded-lg text-sm text-secondary-foreground flex-1">
          <Lightbulb size={16} className="text-primary shrink-0" />
          <span>{insight}</span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className={`rounded-xl p-4 md:p-5 border transition-all duration-300 hover:scale-[1.02] ${
              c.accent ? "bg-primary/5 border-primary/30 gold-glow" : "bg-card border-border"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">{c.label}</span>
              <c.icon size={16} className={c.accent ? "text-primary" : "text-muted-foreground"} />
            </div>
            <p className={`text-xl md:text-2xl font-bold ${c.accent ? "text-primary" : "text-foreground"}`}>
              {c.suffix ? (
                <AnimatedNumber value={c.value} />
              ) : (
                <>৳<AnimatedNumber value={c.value} /></>
              )}
              {c.suffix && <span className="text-base ml-0.5">{c.suffix}</span>}
            </p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Bar Chart */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Last 7 Days</h3>
          {last7.every((d) => d.amount === 0) ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
              No expenses this week yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={last7}>
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(215 10% 55%)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(215 10% 55%)" }} axisLine={false} tickLine={false} width={50} />
                <Tooltip
                  contentStyle={{ background: "hsl(215 19% 11%)", border: "1px solid hsl(215 15% 20%)", borderRadius: 8, color: "#fff", fontSize: 12 }}
                  formatter={(v: number) => [`৳${v.toLocaleString()}`, "Spent"]}
                />
                <Bar dataKey="amount" fill="hsl(41 100% 47%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pie Chart */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Top Categories</h3>
          {topCats.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
              No data yet
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={130}>
                <PieChart>
                  <Pie data={topCats} dataKey="value" cx="50%" cy="50%" innerRadius={30} outerRadius={55} paddingAngle={4}>
                    {topCats.map((c, i) => (
                      <Cell key={i} fill={c.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {topCats.map((c) => (
                  <div key={c.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: c.color }} />
                      <span className="text-foreground">{c.name}</span>
                    </div>
                    <span className="text-muted-foreground">{formatTaka(c.value)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={() => onNavigate("add")}
        className="fixed bottom-20 md:bottom-8 right-6 w-14 h-14 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg gold-glow hover:scale-110 transition-transform z-40"
      >
        <Plus size={24} />
      </button>
    </div>
  );
}
