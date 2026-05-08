import { useState, useEffect } from "react";
import {
  Monitor, Smartphone, Tablet, Globe, Clock, Shield, ShieldAlert,
  MapPin, Chrome, Wifi, Mail, Lock, Fingerprint, RefreshCw
} from "lucide-react";
import { useAuthFetch } from "@/lib/auth-context";

const API_BASE = "http://localhost:3000/api";

interface LoginEntry {
  id: number;
  email: string;
  ip: string;
  location: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  loginMethod: string;
  createdAt: string;
}

interface SessionEntry {
  id: string;
  ip: string | null;
  location: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  createdAt: string;
}

// Device icon helper
function getDeviceIcon(device: string | null) {
  switch (device?.toLowerCase()) {
    case "mobile": return Smartphone;
    case "tablet": return Tablet;
    default: return Monitor;
  }
}

// Login method icon + label
function getMethodInfo(method: string) {
  switch (method) {
    case "google": return { icon: Globe, label: "Google Sign-In", color: "text-blue-400" };
    case "register": return { icon: Fingerprint, label: "New Registration", color: "text-emerald-400" };
    default: return { icon: Mail, label: "Email & Password", color: "text-violet-400" };
  }
}

// Time ago helper
function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-BD", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-BD", {
    timeZone: "Asia/Dhaka",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function LoginActivity() {
  const authFetch = useAuthFetch();
  const [logs, setLogs] = useState<LoginEntry[]>([]);
  const [sessions, setSessions] = useState<SessionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [logsRes, sessionsRes] = await Promise.all([
        authFetch(`${API_BASE}/auth/login-activity`),
        authFetch(`${API_BASE}/auth/sessions`)
      ]);

      if (!logsRes.ok || !sessionsRes.ok) throw new Error("Failed to fetch");
      
      setLogs(await logsRes.json());
      setSessions(await sessionsRes.json());
    } catch {
      setError("Could not load login activity. Make sure backend is running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []); // eslint-disable-line

  const handleRevokeSession = async (id: string) => {
    try {
      const res = await authFetch(`${API_BASE}/auth/sessions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSessions(prev => prev.filter(s => s.id !== id));
      }
    } catch (err) {
      console.error('Failed to revoke session:', err);
    }
  };

  // First entry is the current session
  const currentSession = logs.length > 0 ? logs[0] : null;
  const pastSessions = logs.slice(1);

  return (
    <div className="page-transition max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Shield size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-serif text-foreground">Login Activity</h2>
            <p className="text-xs text-muted-foreground">Monitor who accesses your account</p>
          </div>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="p-2.5 rounded-lg bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-5 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-secondary" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-40 bg-secondary rounded" />
                  <div className="h-3 w-56 bg-secondary rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-5 text-center mb-6">
          <ShieldAlert size={28} className="mx-auto mb-2 text-red-400" />
          <p className="text-sm text-red-300">{error}</p>
          <button onClick={fetchData} className="mt-3 text-xs text-red-400 underline hover:text-red-300">
            Try again
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && logs.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Shield size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No login activity yet</p>
          <p className="text-xs mt-1 opacity-60">Your login history will appear here.</p>
        </div>
      )}

      {/* Current Session */}
      {!loading && currentSession && (
        <div className="mb-6">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
            Current Session
          </p>
          <LoginCard entry={currentSession} isCurrent />
        </div>
      )}

      {/* Active Sessions (Where you're logged in) */}
      {!loading && sessions.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-semibold text-emerald-500/80 uppercase tracking-wider mb-3 px-1 flex items-center gap-2">
            Where you're logged in
          </p>
          <div className="space-y-3">
            {sessions.map((session, index) => (
              <SessionCard 
                key={session.id} 
                session={session} 
                isCurrent={index === 0} // Approximate current session by recency
                onRevoke={() => handleRevokeSession(session.id)} 
              />
            ))}
          </div>
        </div>
      )}

      {/* Past Sessions */}
      {!loading && pastSessions.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
            Login History — {pastSessions.length} record{pastSessions.length !== 1 ? "s" : ""}
          </p>
          <div className="space-y-3">
            {pastSessions.map((entry) => (
              <LoginCard key={entry.id} entry={entry} />
            ))}
          </div>
        </div>
      )}

      {/* Security tip */}
      {!loading && logs.length > 0 && (
        <div className="mt-8 bg-amber-500/5 border border-amber-500/15 rounded-xl px-5 py-4 flex items-start gap-3">
          <Lock size={16} className="text-amber-500 mt-0.5 shrink-0" />
          <div className="text-xs text-amber-200/80 leading-relaxed">
            <strong className="text-amber-400">Security Tip:</strong> If you see any login you don't recognize,
            change your password immediately. Enable Google Sign-In for added security.
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Individual Login Card ─────────────────────────────────────
function LoginCard({ entry, isCurrent }: { entry: LoginEntry; isCurrent?: boolean }) {
  const DeviceIcon = getDeviceIcon(entry.device);
  const method = getMethodInfo(entry.loginMethod);
  const MethodIcon = method.icon;

  return (
    <div
      className={`bg-card border rounded-xl p-4 transition-all hover:shadow-md ${
        isCurrent
          ? "border-emerald-500/30 shadow-sm shadow-emerald-500/5"
          : "border-border hover:border-border/80"
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Device Icon */}
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
            isCurrent
              ? "bg-emerald-500/10 text-emerald-400"
              : "bg-secondary text-muted-foreground"
          }`}
        >
          <DeviceIcon size={20} />
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          {/* Top row: Device + Time */}
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">
                {entry.os || "Unknown OS"}
              </span>
              {isCurrent && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 uppercase tracking-wider">
                  Active
                </span>
              )}
            </div>
            <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
              <Clock size={11} />
              {timeAgo(entry.createdAt)}
            </span>
          </div>

          {/* Browser + Method */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mb-2">
            {entry.browser && (
              <span className="flex items-center gap-1">
                <Chrome size={11} />
                {entry.browser}
              </span>
            )}
            <span className={`flex items-center gap-1 ${method.color}`}>
              <MethodIcon size={11} />
              {method.label}
            </span>
          </div>

          {/* IP + Location */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground/70">
            <span className="flex items-center gap-1">
              <Wifi size={11} />
              {entry.ip}
            </span>
            {entry.location && (
              <span className="flex items-center gap-1">
                <MapPin size={11} />
                {entry.location}
              </span>
            )}
          </div>

          {/* Full timestamp tooltip */}
          <p className="text-[10px] text-muted-foreground/40 mt-1.5">
            {formatDateTime(entry.createdAt)}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Individual Session Card ─────────────────────────────────────
function SessionCard({ session, isCurrent, onRevoke }: { session: SessionEntry; isCurrent?: boolean; onRevoke: () => void }) {
  const DeviceIcon = getDeviceIcon(session.device);

  return (
    <div
      className={`bg-card border rounded-xl p-4 transition-all hover:shadow-md ${
        isCurrent
          ? "border-emerald-500/30 shadow-sm shadow-emerald-500/5"
          : "border-border hover:border-border/80"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          {/* Device Icon */}
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
              isCurrent
                ? "bg-emerald-500/10 text-emerald-400"
                : "bg-secondary text-muted-foreground"
            }`}
          >
            <DeviceIcon size={20} />
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            {/* Top row: Device + Time */}
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">
                  {session.os || "Unknown OS"}
                </span>
                {isCurrent && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 uppercase tracking-wider">
                    Current Device
                  </span>
                )}
              </div>
            </div>

            {/* Browser */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mb-2">
              {session.browser && (
                <span className="flex items-center gap-1">
                  <Chrome size={11} />
                  {session.browser}
                </span>
              )}
            </div>

            {/* IP + Location */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground/70">
              <span className="flex items-center gap-1">
                <Wifi size={11} />
                {session.ip}
              </span>
              {session.location && (
                <span className="flex items-center gap-1">
                  <MapPin size={11} />
                  {session.location}
                </span>
              )}
            </div>

            {/* Full timestamp tooltip */}
            <p className="text-[10px] text-muted-foreground/40 mt-1.5">
              Logged in: {formatDateTime(session.createdAt)}
            </p>
          </div>
        </div>
        
        {/* Revoke Action */}
        {!isCurrent && (
          <button
            onClick={onRevoke}
            className="text-xs font-medium text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg border border-red-500/20 hover:bg-red-500/10 transition-colors"
          >
            Log out
          </button>
        )}
      </div>
    </div>
  );
}
