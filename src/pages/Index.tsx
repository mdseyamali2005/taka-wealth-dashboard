import { useState, useEffect, useCallback } from "react";
import Navigation, { type Page } from "@/components/finance/Navigation";
import Dashboard from "@/components/finance/Dashboard";
import AddExpense from "@/components/finance/AddExpense";
import ExpenseHistory from "@/components/finance/ExpenseHistory";
import MonthlyReport from "@/components/finance/MonthlyReport";
import BudgetManager from "@/components/finance/BudgetManager";
import AIChatSidebar from "@/components/finance/AIChatSidebar";
import LoginActivity from "@/components/finance/LoginActivity";
import Pricing from "@/pages/Pricing";
import {
  type Expense, type Budget,
  loadExpenses, saveExpenses, loadBudget, saveBudget,
} from "@/lib/finance-utils";
import { useAuth, useAuthFetch } from "@/lib/auth-context";
import { toast } from "sonner";

const API_BASE = "http://localhost:3000/api";

export default function Index() {
  const { token, user, refreshUser } = useAuth();
  const authFetch = useAuthFetch();
  const [page, setPage] = useState<Page>("dashboard");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budget, setBudget] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Fetch from MS SQL Backend (authenticated)
  const fetchTransactions = useCallback(async () => {
    try {
      const res = await authFetch(`${API_BASE}/transactions`);
      if (!res.ok) throw new Error("Backend error");
      const data = await res.json();
      const formatted = data.map((t: any) => ({
        id: String(t.id),
        amount: t.amount,
        category: t.description.split(' - ')[0] || 'Other',
        note: t.description.split(' - ')[1] || t.description,
        date: t.date.split('T')[0],
        createdAt: new Date(t.date).getTime()
      }));
      setExpenses(formatted);
    } catch (err) {
      console.log("Using local storage fallback. Ensure backend is running.", err);
      setExpenses(loadExpenses());
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    if (token) {
      fetchTransactions();
    } else {
      setExpenses(loadExpenses());
      setLoading(false);
    }
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (user && user.budget !== undefined) {
      setBudget(user.budget);
    }
  }, [user]);

  // Save expenses to local storage as backup
  useEffect(() => saveExpenses(expenses), [expenses]);

  const addExpense = useCallback(async (e: Expense) => {
    try {
      const res = await authFetch(`${API_BASE}/transactions`, {
        method: 'POST',
        body: JSON.stringify({
          amount: e.amount,
          description: `${e.category} - ${e.note}`,
          type: 'expense',
          date: e.date
        })
      });
      if (res.ok) {
        const t = await res.json();
        const newExp = { ...e, id: String(t.id) };
        setExpenses((prev) => [...prev, newExp]);
        toast.success("Saved to database!");
        return;
      }
    } catch {
      console.warn("Backend unavailable, saving locally");
    }
    // Fallback
    setExpenses((prev) => [...prev, e]);
  }, [authFetch]);

  const deleteExpense = useCallback(async (id: string) => {
    try {
      await authFetch(`${API_BASE}/transactions/${id}`, { method: 'DELETE' });
    } catch {
      console.warn("Backend unavailable for deletion");
    }
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }, [authFetch]);

  const updateBudget = useCallback(async (amount: number) => {
    setBudget(amount); // Optimistic UI update
    
    if (token) {
      try {
        const res = await authFetch(`${API_BASE}/auth/budget`, {
          method: 'PATCH',
          body: JSON.stringify({ amount })
        });
        if (res.ok) {
          toast.success("Budget updated securely!");
          refreshUser();
        } else {
          toast.error("Failed to update budget");
        }
      } catch {
        toast.error("Network error while saving budget");
      }
    } else {
      toast.info("Login to save budget to database");
    }
  }, [authFetch, refreshUser, token]);

  // Refresh expenses when AI chat adds one
  const handleExpenseAdded = useCallback(() => {
    fetchTransactions();
    toast.success("Expense added via AI Chat!");
  }, [fetchTransactions]);

  const renderPage = () => {
    if (loading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Connecting to database...</div>;
    
    switch (page) {
      case "dashboard":
        return <Dashboard expenses={expenses} budget={budget} onNavigate={setPage} />;
      case "add":
        return <AddExpense onAdd={addExpense} onNavigate={setPage} />;
      case "history":
        return <ExpenseHistory expenses={expenses} onDelete={deleteExpense} />;
      case "report":
        return <MonthlyReport expenses={expenses} />;
      case "budget":
        return <BudgetManager budget={budget} onSetBudget={updateBudget} expenses={expenses} />;
      case "chat":
        return (
          <AIChatSidebar
            onExpenseAdded={handleExpenseAdded}
            onUpgrade={() => setPage("pricing")}
          />
        );
      case "activity":
        return <LoginActivity />;
      case "pricing":
        return <Pricing onNavigate={setPage} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Navigation current={page} onChange={setPage} />
      <main className="flex-1 p-4 md:p-8 pb-20 md:pb-8 overflow-auto">
        {renderPage()}
      </main>
    </div>
  );
}
