export interface Expense {
  id: string;
  amount: number;
  category: string;
  note: string;
  date: string;
  createdAt: number;
}

export interface Budget {
  monthly: number;
}

export const CATEGORIES = [
  { name: "Food", icon: "UtensilsCrossed", color: "#F97316" },
  { name: "Transport", icon: "Car", color: "#3B82F6" },
  { name: "Shopping", icon: "ShoppingBag", color: "#EC4899" },
  { name: "Bills", icon: "Receipt", color: "#8B5CF6" },
  { name: "Health", icon: "Heart", color: "#EF4444" },
  { name: "Entertainment", icon: "Gamepad2", color: "#10B981" },
  { name: "Other", icon: "MoreHorizontal", color: "#6B7280" },
] as const;

export const getCategoryColor = (cat: string) =>
  CATEGORIES.find((c) => c.name === cat)?.color ?? "#6B7280";

export const formatTaka = (n: number) =>
  `৳${n.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const formatDate = (d: string) => {
  const date = new Date(d + "T00:00:00");
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
};

export const genId = () => crypto.randomUUID();

export const loadExpenses = (): Expense[] => {
  try {
    return JSON.parse(localStorage.getItem("taka_expenses") || "[]");
  } catch {
    return [];
  }
};

export const saveExpenses = (e: Expense[]) =>
  localStorage.setItem("taka_expenses", JSON.stringify(e));

export const loadBudget = (): Budget => {
  try {
    return JSON.parse(localStorage.getItem("taka_budget") || '{"monthly":0}');
  } catch {
    return { monthly: 0 };
  }
};

export const saveBudget = (b: Budget) =>
  localStorage.setItem("taka_budget", JSON.stringify(b));

export const getToday = () => new Date().toISOString().slice(0, 10);

export const getStreak = (expenses: Expense[]): number => {
  if (!expenses.length) return 0;
  const dates = [...new Set(expenses.map((e) => e.date))].sort().reverse();
  const today = getToday();
  if (dates[0] !== today) return 0;
  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1] + "T00:00:00");
    const curr = new Date(dates[i] + "T00:00:00");
    const diff = (prev.getTime() - curr.getTime()) / 86400000;
    if (diff === 1) streak++;
    else break;
  }
  return streak;
};

export const getSmartInsight = (expenses: Expense[]): string => {
  if (expenses.length < 3) return "Start logging expenses to get smart insights!";
  const today = new Date();
  const thisWeekStart = new Date(today);
  thisWeekStart.setDate(today.getDate() - 7);
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(thisWeekStart.getDate() - 7);

  const tw = thisWeekStart.toISOString().slice(0, 10);
  const lw = lastWeekStart.toISOString().slice(0, 10);
  const td = today.toISOString().slice(0, 10);

  const thisWeek = expenses.filter((e) => e.date >= tw && e.date <= td);
  const lastWeek = expenses.filter((e) => e.date >= lw && e.date < tw);

  const byCatThis: Record<string, number> = {};
  const byCatLast: Record<string, number> = {};
  thisWeek.forEach((e) => (byCatThis[e.category] = (byCatThis[e.category] || 0) + e.amount));
  lastWeek.forEach((e) => (byCatLast[e.category] = (byCatLast[e.category] || 0) + e.amount));

  let maxIncrease = 0;
  let maxCat = "";
  for (const cat of Object.keys(byCatThis)) {
    const last = byCatLast[cat] || 0;
    if (last > 0) {
      const pct = ((byCatThis[cat] - last) / last) * 100;
      if (pct > maxIncrease) {
        maxIncrease = pct;
        maxCat = cat;
      }
    }
  }

  if (maxIncrease > 20 && maxCat) {
    return `You spent ${Math.round(maxIncrease)}% more on ${maxCat} this week than last week.`;
  }

  const totalThis = thisWeek.reduce((s, e) => s + e.amount, 0);
  const totalLast = lastWeek.reduce((s, e) => s + e.amount, 0);
  if (totalLast > 0 && totalThis < totalLast) {
    return `Great job! You spent ${Math.round(((totalLast - totalThis) / totalLast) * 100)}% less this week.`;
  }

  return `You've logged ${expenses.length} expenses so far. Keep tracking!`;
};

export const exportToCSV = (expenses: Expense[]) => {
  const header = "Date,Category,Note,Amount\n";
  const rows = expenses
    .map((e) => `${e.date},${e.category},"${e.note}",${e.amount}`)
    .join("\n");
  const blob = new Blob([header + rows], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `taka-expenses-${getToday()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};
