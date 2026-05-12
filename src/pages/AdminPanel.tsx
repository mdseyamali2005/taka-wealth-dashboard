import { useState, useEffect, useCallback } from "react";
import { useAdmin } from "@/lib/admin-context";
import {
  LayoutDashboard, Users, Activity, LogOut, ShieldCheck,
  Ban, UserCheck, Search, ChevronLeft, ChevronRight,
  Trash2, Crown, X, AlertTriangle
} from "lucide-react";

const API = "http://localhost:3000/api";
type Tab = "dashboard" | "users" | "activity";

interface Stats {
  totalUsers: number; bannedUsers: number; activeUsers: number;
  proUsers: number; recentSignups: number; totalTransactions: number;
  totalVolume: number; totalAdmins: number;
}

interface UserRow {
  id: number; email: string; name: string | null; avatarUrl: string | null;
  subscriptionStatus: string; isBanned: boolean; bannedAt: string | null;
  banReason: string | null; createdAt: string;
  _count: { transactions: number; loginLogs: number };
}

interface ActivityItem {
  id: number; email: string; ip: string; location: string | null;
  device: string | null; browser: string | null; os: string | null;
  loginMethod: string; createdAt: string;
  user: { name: string | null; avatarUrl: string | null; isBanned: boolean };
}

// ─── Stat Card ──────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: React.ElementType; color: string }) {
  return (
    <div className="rounded-2xl p-5 bg-white border border-gray-100" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}12` }}>
          <Icon size={18} style={{ color }} />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}

// ─── Dashboard Tab ──────────────────────────────────────────────
function DashboardTab({ adminFetch }: { adminFetch: (url: string) => Promise<Response> }) {
  const [stats, setStats] = useState<Stats | null>(null);
  useEffect(() => {
    adminFetch(`${API}/admin/stats`).then(r => r.json()).then(setStats).catch(() => {});
  }, [adminFetch]);

  if (!stats) return <div className="p-8 text-center text-gray-400 animate-pulse">Loading stats...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1" style={{ fontFamily: "'DM Serif Display', serif" }}>Dashboard Overview</h2>
        <p className="text-sm text-gray-500">Platform metrics at a glance</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={stats.totalUsers} icon={Users} color="#2563eb" />
        <StatCard label="Active (30d)" value={stats.activeUsers} icon={UserCheck} color="#16a34a" />
        <StatCard label="Banned" value={stats.bannedUsers} icon={Ban} color="#dc2626" />
        <StatCard label="Pro Subscribers" value={stats.proUsers} icon={Crown} color="#d97706" />
        <StatCard label="New This Week" value={stats.recentSignups} icon={Activity} color="#7c3aed" />
        <StatCard label="Transactions" value={stats.totalTransactions} icon={LayoutDashboard} color="#0891b2" />
        <StatCard label="Total Volume" value={`৳${stats.totalVolume.toLocaleString()}`} icon={Crown} color="#059669" />
        <StatCard label="Admins" value={stats.totalAdmins} icon={ShieldCheck} color="#e11d48" />
      </div>
    </div>
  );
}

// ─── Users Tab ──────────────────────────────────────────────────
function UsersTab({ adminFetch }: { adminFetch: (url: string, opts?: RequestInit) => Promise<Response> }) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ type: "ban" | "delete"; user: UserRow } | null>(null);
  const [banReason, setBanReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "15" });
    if (search) params.set("search", search);
    if (filter !== "all") params.set("status", filter);
    try {
      const r = await adminFetch(`${API}/admin/users?${params}`);
      const data = await r.json();
      setUsers(data.users); setTotalPages(data.pagination.totalPages);
    } catch {} finally { setLoading(false); }
  }, [adminFetch, page, search, filter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleBan = async (userId: number) => {
    setActionLoading(true);
    await adminFetch(`${API}/admin/users/${userId}/ban`, {
      method: "POST", body: JSON.stringify({ reason: banReason || "Violated terms of service" }),
    });
    setModal(null); setBanReason(""); setActionLoading(false); fetchUsers();
  };

  const handleUnban = async (userId: number) => {
    setActionLoading(true);
    await adminFetch(`${API}/admin/users/${userId}/unban`, { method: "POST" });
    setActionLoading(false); fetchUsers();
  };

  const handleDelete = async (userId: number) => {
    setActionLoading(true);
    await adminFetch(`${API}/admin/users/${userId}`, { method: "DELETE" });
    setModal(null); setActionLoading(false); fetchUsers();
  };

  const handleSubChange = async (userId: number, status: string) => {
    await adminFetch(`${API}/admin/users/${userId}/subscription`, {
      method: "PATCH", body: JSON.stringify({ status }),
    });
    fetchUsers();
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1" style={{ fontFamily: "'DM Serif Display', serif" }}>User Management</h2>
        <p className="text-sm text-gray-500">Search, ban, unban, and manage users</p>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name or email..." className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm bg-white border border-gray-200 outline-none focus:border-red-400 transition-colors" />
        </div>
        <select value={filter} onChange={e => { setFilter(e.target.value); setPage(1); }}
          className="px-4 py-2.5 rounded-xl text-sm bg-white border border-gray-200 outline-none focus:border-red-400">
          <option value="all">All Users</option>
          <option value="active">Active</option>
          <option value="banned">Banned</option>
          <option value="pro">Pro</option>
          <option value="free">Free</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        {loading ? (
          <div className="p-8 text-center text-gray-400 animate-pulse">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No users found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Plan</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Joined</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {u.avatarUrl ? (
                          <img src={u.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                            {(u.name || u.email)?.[0]?.toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">{u.name || "—"}</p>
                          <p className="text-xs text-gray-400 truncate">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {u.isBanned ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600">
                          <Ban size={10} /> Banned
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-600">
                          <UserCheck size={10} /> Active
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <select value={u.subscriptionStatus} onChange={e => handleSubChange(u.id, e.target.value)}
                        className="text-xs px-2 py-1 rounded-lg border border-gray-200 bg-white outline-none">
                        <option value="free">Free</option>
                        <option value="active">Pro</option>
                        <option value="canceled">Canceled</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 hidden lg:table-cell">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {u.isBanned ? (
                          <button onClick={() => handleUnban(u.id)} disabled={actionLoading}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-green-50 text-green-600 hover:bg-green-100 transition-colors">
                            Unban
                          </button>
                        ) : (
                          <button onClick={() => setModal({ type: "ban", user: u })}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors">
                            Ban
                          </button>
                        )}
                        <button onClick={() => setModal({ type: "delete", user: u })}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 disabled:opacity-30">
              <ChevronLeft size={14} /> Prev
            </button>
            <span className="text-xs text-gray-400">Page {page} of {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 disabled:opacity-30">
              Next <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} className={modal.type === "delete" ? "text-red-500" : "text-orange-500"} />
                <h3 className="font-bold text-gray-900">{modal.type === "ban" ? "Ban User" : "Delete User"}</h3>
              </div>
              <button onClick={() => setModal(null)} className="p-1 rounded-lg hover:bg-gray-100"><X size={16} /></button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              {modal.type === "ban"
                ? `Ban "${modal.user.name || modal.user.email}"? They won't be able to log in.`
                : `Permanently delete "${modal.user.name || modal.user.email}"? This cannot be undone.`}
            </p>
            {modal.type === "ban" && (
              <input value={banReason} onChange={e => setBanReason(e.target.value)}
                placeholder="Reason (optional)" className="w-full px-4 py-2.5 rounded-xl text-sm bg-white border border-gray-200 outline-none mb-4" />
            )}
            <div className="flex gap-3 justify-end">
              <button onClick={() => setModal(null)} className="px-4 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
              <button disabled={actionLoading}
                onClick={() => modal.type === "ban" ? handleBan(modal.user.id) : handleDelete(modal.user.id)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50">
                {actionLoading ? "Processing..." : modal.type === "ban" ? "Ban User" : "Delete User"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Activity Tab ───────────────────────────────────────────────
function ActivityTab({ adminFetch }: { adminFetch: (url: string) => Promise<Response> }) {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminFetch(`${API}/admin/activity`).then(r => r.json()).then(data => { setItems(data); setLoading(false); }).catch(() => setLoading(false));
  }, [adminFetch]);

  if (loading) return <div className="p-8 text-center text-gray-400 animate-pulse">Loading activity...</div>;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1" style={{ fontFamily: "'DM Serif Display', serif" }}>Recent Activity</h2>
        <p className="text-sm text-gray-500">Login activity across all users</p>
      </div>
      <div className="space-y-2">
        {items.map(item => (
          <div key={item.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4" style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
            {item.user.avatarUrl ? (
              <img src={item.user.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                {(item.user.name || item.email)?.[0]?.toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-gray-900 text-sm truncate">{item.user.name || item.email}</p>
                {item.user.isBanned && <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-500">Banned</span>}
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-500 capitalize">{item.loginMethod}</span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{item.device} · {item.browser} · {item.location || item.ip}</p>
            </div>
            <p className="text-xs text-gray-400 whitespace-nowrap hidden sm:block">{new Date(item.createdAt).toLocaleString()}</p>
          </div>
        ))}
        {items.length === 0 && <p className="text-center text-gray-400 py-8">No activity yet</p>}
      </div>
    </div>
  );
}

// ─── Main Admin Panel ───────────────────────────────────────────
const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "users", label: "Users", icon: Users },
  { id: "activity", label: "Activity", icon: Activity },
];

export default function AdminPanel() {
  const { admin, logout, adminFetch } = useAdmin();
  const [tab, setTab] = useState<Tab>("dashboard");

  return (
    <div className="flex min-h-screen" style={{ background: '#f8f8f6' }}>
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-60 min-h-screen p-5 gap-1 border-r border-gray-100" style={{ background: '#fff' }}>
        <div className="mb-6 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #dc2626, #ea580c)' }}>
            <ShieldCheck size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900" style={{ fontFamily: "'DM Serif Display', serif" }}>TakaTrack</h1>
            <p className="text-[10px] font-semibold tracking-widest uppercase text-red-500">Admin</p>
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-0.5">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                tab === id ? "bg-red-50 text-red-600" : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
              }`}>
              <Icon size={17} /> {label}
            </button>
          ))}
        </div>

        {admin && (
          <div className="border-t border-gray-100 pt-4 mt-4">
            <div className="flex items-center gap-2.5 px-1 mb-3">
              <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-500 text-xs font-bold">
                {admin.name[0]?.toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{admin.name}</p>
                <p className="text-[11px] text-gray-400 truncate">{admin.email}</p>
              </div>
            </div>
            <button onClick={logout}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all w-full">
              <LogOut size={15} /> Sign Out
            </button>
          </div>
        )}
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} className="text-red-500" />
          <span className="font-bold text-gray-900">Admin</span>
        </div>
        <button onClick={logout} className="text-gray-400"><LogOut size={18} /></button>
      </div>

      {/* Main content */}
      <main className="flex-1 p-4 md:p-8 pb-20 md:pb-8 overflow-auto mt-14 md:mt-0">
        {tab === "dashboard" && <DashboardTab adminFetch={adminFetch} />}
        {tab === "users" && <UsersTab adminFetch={adminFetch} />}
        {tab === "activity" && <ActivityTab adminFetch={adminFetch} />}
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 flex justify-around py-2">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 text-xs ${tab === id ? "text-red-500" : "text-gray-400"}`}>
            <Icon size={18} /> {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
