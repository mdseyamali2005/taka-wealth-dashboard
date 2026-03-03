import { useState } from "react";
import { Check, X } from "lucide-react";
import { CATEGORIES, genId, getToday, type Expense } from "@/lib/finance-utils";
import type { Page } from "./Navigation";

interface Props {
  onAdd: (e: Expense) => void;
  onNavigate: (p: Page) => void;
}

export default function AddExpense({ onAdd, onNavigate }: Props) {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(getToday());
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount);
    if (!num || num <= 0) {
      setError("Please enter a valid positive amount");
      return;
    }
    setError("");
    onAdd({
      id: genId(),
      amount: num,
      category,
      note: note.trim(),
      date,
      createdAt: Date.now(),
    });
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      setAmount("");
      setNote("");
      setDate(getToday());
    }, 1500);
  };

  return (
    <div className="page-transition max-w-lg mx-auto">
      <h2 className="text-2xl font-serif text-foreground mb-6">Add Expense</h2>

      {success && (
        <div className="flex items-center gap-2 bg-success/20 text-success px-4 py-3 rounded-lg mb-4 text-sm font-medium">
          <Check size={16} /> Expense added successfully!
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-6 space-y-5">
        {/* Amount */}
        <div>
          <label className="block text-sm text-muted-foreground mb-1.5">Amount (৳)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary font-bold">৳</span>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-secondary border border-border rounded-lg py-3 pl-8 pr-4 text-foreground text-lg font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
            />
          </div>
          {error && <p className="text-danger text-xs mt-1">{error}</p>}
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm text-muted-foreground mb-1.5">Category</label>
          <div className="grid grid-cols-4 gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => setCategory(c.name)}
                className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-lg text-xs font-medium transition-all border ${
                  category === c.name
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-secondary text-muted-foreground hover:border-muted-foreground"
                }`}
              >
                <div className="w-3 h-3 rounded-full" style={{ background: c.color }} />
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Note */}
        <div>
          <label className="block text-sm text-muted-foreground mb-1.5">Note (optional)</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Lunch at Dhanmondi"
            className="w-full bg-secondary border border-border rounded-lg py-2.5 px-3 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
          />
        </div>

        {/* Date */}
        <div>
          <label className="block text-sm text-muted-foreground mb-1.5">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-secondary border border-border rounded-lg py-2.5 px-3 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="flex-1 bg-primary text-primary-foreground py-3 rounded-lg font-semibold text-sm hover:opacity-90 transition gold-glow"
          >
            Save Expense
          </button>
          <button
            type="button"
            onClick={() => onNavigate("dashboard")}
            className="px-4 py-3 rounded-lg border border-border text-muted-foreground hover:text-foreground transition text-sm"
          >
            <X size={16} />
          </button>
        </div>
      </form>
    </div>
  );
}
