import { useState, useEffect, useCallback } from "react";
import Navigation, { type Page } from "@/components/finance/Navigation";
import Dashboard from "@/components/finance/Dashboard";
import AddExpense from "@/components/finance/AddExpense";
import ExpenseHistory from "@/components/finance/ExpenseHistory";
import MonthlyReport from "@/components/finance/MonthlyReport";
import BudgetManager from "@/components/finance/BudgetManager";
import {
  type Expense, type Budget,
  loadExpenses, saveExpenses, loadBudget, saveBudget,
} from "@/lib/finance-utils";

export default function Index() {
  const [page, setPage] = useState<Page>("dashboard");
  const [expenses, setExpenses] = useState<Expense[]>(loadExpenses);
  const [budget, setBudget] = useState<Budget>(loadBudget);

  useEffect(() => saveExpenses(expenses), [expenses]);
  useEffect(() => saveBudget(budget), [budget]);

  const addExpense = useCallback((e: Expense) => {
    setExpenses((prev) => [...prev, e]);
  }, []);

  const deleteExpense = useCallback((id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const updateBudget = useCallback((amount: number) => {
    setBudget({ monthly: amount });
  }, []);

  const renderPage = () => {
    switch (page) {
      case "dashboard":
        return <Dashboard expenses={expenses} budget={budget.monthly} onNavigate={setPage} />;
      case "add":
        return <AddExpense onAdd={addExpense} onNavigate={setPage} />;
      case "history":
        return <ExpenseHistory expenses={expenses} onDelete={deleteExpense} />;
      case "report":
        return <MonthlyReport expenses={expenses} />;
      case "budget":
        return <BudgetManager budget={budget.monthly} onSetBudget={updateBudget} expenses={expenses} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-background grain-overlay">
      <Navigation current={page} onChange={setPage} />
      <main className="flex-1 p-4 md:p-8 pb-20 md:pb-8 overflow-auto">
        {renderPage()}
      </main>
    </div>
  );
}
