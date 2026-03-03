import { useState, useMemo } from "react";
import { Search, Trash2, Download, AlertTriangle, Receipt } from "lucide-react";
import {
  Expense, formatTaka, formatDate, getCategoryColor, exportToCSV,
} from "@/lib/finance-utils";

interface Props {
  expenses: Expense[];
  onDelete: (id: string) => void;
}

export default function ExpenseHistory({ expenses, onDelete }: Props) {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return expenses
      .filter((e) => {
        if (catFilter !== "All" && e.category !== catFilter) return false;
        if (search && !e.note.toLowerCase().includes(search.toLowerCase())) return false;
        if (dateFrom && e.date < dateFrom) return false;
        if (dateTo && e.date > dateTo) return false;
        return true;
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [expenses, search, catFilter, dateFrom, dateTo]);

  // Group by date
  const grouped = useMemo(() => {
    const map: Record<string, Expense[]> = {};
    filtered.forEach((e) => {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    });
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  const cats = ["All", "Food", "Transport", "Shopping", "Bills", "Health", "Entertainment", "Other"];

  return (
    <div className="page-transition space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-serif text-foreground">Expense History</h2>
        {expenses.length > 0 && (
          <button
            onClick={() => exportToCSV(expenses)}
            className="flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            <Download size={14} /> Export CSV
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by note..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-secondary border border-border rounded-lg py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {cats.map((c) => (
            <button
              key={c}
              onClick={() => setCatFilter(c)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition border ${
                catFilter === c
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="flex-1 bg-secondary border border-border rounded-lg py-1.5 px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <span className="text-muted-foreground text-xs self-center">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="flex-1 bg-secondary border border-border rounded-lg py-1.5 px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </div>

      {/* List */}
      {grouped.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Receipt size={48} className="mb-4 opacity-30" />
          <p className="text-lg font-serif">No expenses found</p>
          <p className="text-sm mt-1">Start tracking your spending!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(([date, items]) => {
            const dayTotal = items.reduce((s, e) => s + e.amount, 0);
            return (
              <div key={date}>
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-xs text-muted-foreground font-medium">{formatDate(date)}</span>
                  <span className="text-xs text-primary font-medium">{formatTaka(dayTotal)}</span>
                </div>
                <div className="space-y-1.5">
                  {items.map((e) => (
                    <div
                      key={e.id}
                      className="bg-card border border-border rounded-lg px-4 py-3 flex items-center justify-between hover:border-primary/30 transition group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: getCategoryColor(e.category) + "22" }}>
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: getCategoryColor(e.category) }} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{e.category}</p>
                          {e.note && <p className="text-xs text-muted-foreground">{e.note}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-foreground">{formatTaka(e.amount)}</span>
                        <button
                          onClick={() => setDeleteId(e.id)}
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-danger transition p-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm" onClick={() => setDeleteId(null)}>
          <div className="bg-card border border-border rounded-xl p-6 max-w-sm mx-4 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 text-warning">
              <AlertTriangle size={20} />
              <h3 className="font-serif text-lg text-foreground">Delete Expense?</h3>
            </div>
            <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => { onDelete(deleteId); setDeleteId(null); }}
                className="flex-1 bg-danger text-foreground py-2 rounded-lg text-sm font-medium hover:opacity-90 transition"
              >
                Delete
              </button>
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 border border-border text-muted-foreground py-2 rounded-lg text-sm hover:text-foreground transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
