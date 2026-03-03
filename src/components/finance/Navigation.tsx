import { LayoutDashboard, PlusCircle, List, BarChart3, Wallet } from "lucide-react";

export type Page = "dashboard" | "add" | "history" | "report" | "budget";

const NAV_ITEMS: { page: Page; label: string; icon: React.ElementType }[] = [
  { page: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { page: "history", label: "History", icon: List },
  { page: "add", label: "Add", icon: PlusCircle },
  { page: "report", label: "Reports", icon: BarChart3 },
  { page: "budget", label: "Budget", icon: Wallet },
];

interface Props {
  current: Page;
  onChange: (p: Page) => void;
}

export default function Navigation({ current, onChange }: Props) {
  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 min-h-screen bg-card border-r border-border p-6 gap-2 grain-overlay">
        <div className="mb-8">
          <h1 className="text-2xl font-serif text-primary">TakaTrack</h1>
          <p className="text-xs text-muted-foreground mt-1">Finance Manager</p>
        </div>
        {NAV_ITEMS.map(({ page, label, icon: Icon }) => (
          <button
            key={page}
            onClick={() => onChange(page)}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
              current === page
                ? "bg-primary/10 text-primary gold-glow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            <Icon size={18} />
            {label}
          </button>
        ))}
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border flex justify-around py-2 px-1">
        {NAV_ITEMS.map(({ page, label, icon: Icon }) => (
          <button
            key={page}
            onClick={() => onChange(page)}
            className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-xs transition-colors ${
              current === page ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Icon size={page === "add" ? 24 : 18} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </>
  );
}
