import { LayoutDashboard, PlusCircle, List, BarChart3, Wallet, MessageSquare, Shield, Lock, LogOut, Crown } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export type Page = "dashboard" | "add" | "history" | "report" | "budget" | "chat" | "activity" | "pricing";

const NAV_ITEMS: { page: Page; label: string; icon: React.ElementType; pro?: boolean }[] = [
  { page: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { page: "history", label: "History", icon: List },
  { page: "add", label: "Add", icon: PlusCircle },
  { page: "report", label: "Reports", icon: BarChart3 },
  { page: "budget", label: "Budget", icon: Wallet },
  { page: "chat", label: "AI Chat", icon: MessageSquare, pro: true },
  { page: "activity", label: "Activity", icon: Shield },
];

interface Props {
  current: Page;
  onChange: (p: Page) => void;
}

export default function Navigation({ current, onChange }: Props) {
  const { user, isSubscribed, logout } = useAuth();

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 min-h-screen bg-card border-r border-border p-6 gap-2 grain-overlay">
        <div className="mb-8">
          <h1 className="text-2xl font-serif text-primary">TakaTrack</h1>
          <p className="text-xs text-muted-foreground mt-1">Finance Manager</p>
        </div>

        {/* Nav Items */}
        <div className="flex-1 flex flex-col gap-1">
          {NAV_ITEMS.map(({ page, label, icon: Icon, pro }) => (
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
              <span className="flex-1 text-left">{label}</span>
              {pro && !isSubscribed && (
                <Lock size={13} className="text-amber-500 opacity-70" />
              )}
              {pro && isSubscribed && (
                <Crown size={13} className="text-amber-500" />
              )}
            </button>
          ))}

          {/* Upgrade CTA for free users */}
          {!isSubscribed && (
            <button
              onClick={() => onChange("pricing")}
              className="mt-3 flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 border border-amber-200 hover:from-amber-100 hover:to-orange-100 transition-all"
            >
              <Crown size={14} />
              Upgrade to Pro
            </button>
          )}
        </div>

        {/* User Profile & Logout */}
        {user && (
          <div className="border-t border-border pt-4 mt-4">
            <div className="flex items-center gap-3 px-2 mb-3">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name || "User"}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                  {(user.name || user.email)?.[0]?.toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{user.name || "User"}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all w-full"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        )}
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border flex justify-around py-2 px-1">
        {NAV_ITEMS.map(({ page, label, icon: Icon, pro }) => (
          <button
            key={page}
            onClick={() => onChange(page)}
            className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-xs transition-colors relative ${
              current === page ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Icon size={page === "add" ? 24 : 18} />
            <span>{label}</span>
            {pro && !isSubscribed && (
              <Lock size={8} className="absolute top-0 right-0 text-amber-500" />
            )}
          </button>
        ))}
      </nav>
    </>
  );
}
