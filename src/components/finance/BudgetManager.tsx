import { useState } from "react";
import { Wallet, AlertTriangle, CheckCircle } from "lucide-react";
import { formatTaka, type Expense } from "@/lib/finance-utils";

interface Props {
  budget: number;
  onSetBudget: (amount: number) => void;
  expenses: Expense[];
}

export default function BudgetManager({ budget, onSetBudget, expenses }: Props) {
  const [input, setInput] = useState(budget > 0 ? String(budget) : "");

  const now = new Date();
  const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthSpend = expenses.filter((e) => e.date.startsWith(prefix)).reduce((s, e) => s + e.amount, 0);

  const pct = budget > 0 ? Math.min((monthSpend / budget) * 100, 100) : 0;
  const remaining = Math.max(budget - monthSpend, 0);
  const isOver = monthSpend > budget && budget > 0;

  const barColor = pct >= 90 ? "bg-danger" : pct >= 80 ? "bg-warning" : "bg-success";
  const statusColor = pct >= 90 ? "text-danger" : pct >= 80 ? "text-warning" : "text-success";

  const handleSave = () => {
    const num = parseFloat(input);
    if (num > 0) onSetBudget(num);
  };

  return (
    <div className="page-transition max-w-lg mx-auto space-y-6">
      <h2 className="text-2xl font-serif text-foreground">Budget Manager</h2>

      {/* Set Budget */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <label className="text-sm text-muted-foreground">Monthly Budget (৳)</label>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary font-bold">৳</span>
            <input
              type="number"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="15000"
              className="w-full bg-secondary border border-border rounded-lg py-3 pl-8 pr-4 text-foreground text-lg font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
            />
          </div>
          <button
            onClick={handleSave}
            className="px-6 bg-primary text-primary-foreground rounded-lg font-semibold text-sm hover:opacity-90 transition gold-glow"
          >
            Save
          </button>
        </div>
      </div>

      {/* Progress */}
      {budget > 0 && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-5 gold-glow">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet size={18} className="text-primary" />
              <span className="text-sm font-medium text-foreground">This Month's Budget</span>
            </div>
            <span className={`text-sm font-bold ${statusColor}`}>{pct.toFixed(0)}% used</span>
          </div>

          {/* Bar */}
          <div className="w-full h-4 bg-secondary rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${barColor}`}
              style={{ width: `${pct}%` }}
            />
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Budget</p>
              <p className="text-sm font-bold text-foreground">{formatTaka(budget)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Spent</p>
              <p className="text-sm font-bold text-foreground">{formatTaka(monthSpend)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Remaining</p>
              <p className={`text-sm font-bold ${isOver ? "text-danger" : "text-success"}`}>
                {isOver ? `-${formatTaka(monthSpend - budget)}` : formatTaka(remaining)}
              </p>
            </div>
          </div>

          {/* Warning */}
          {pct >= 80 && !isOver && (
            <div className="flex items-center gap-2 bg-warning/10 text-warning px-4 py-2.5 rounded-lg text-sm">
              <AlertTriangle size={16} />
              Warning: You've used over {Math.round(pct)}% of your budget!
            </div>
          )}
          {isOver && (
            <div className="flex items-center gap-2 bg-danger/10 text-danger px-4 py-2.5 rounded-lg text-sm">
              <AlertTriangle size={16} />
              You've exceeded your budget by {formatTaka(monthSpend - budget)}!
            </div>
          )}
          {pct < 80 && (
            <div className="flex items-center gap-2 bg-success/10 text-success px-4 py-2.5 rounded-lg text-sm">
              <CheckCircle size={16} />
              You're on track! Keep it up.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
