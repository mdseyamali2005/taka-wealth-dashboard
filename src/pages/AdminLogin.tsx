import { useState } from "react";
import { useAdmin } from "@/lib/admin-context";
import { Eye, EyeOff, ShieldCheck, Users, Ban, BarChart3, Settings } from "lucide-react";

export default function AdminLogin() {
  const { login, register } = useAdmin();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isRegister) {
        if (!name.trim()) {
          setError("Full name is required");
          setLoading(false);
          return;
        }
        await register(email, password, name);
      } else {
        await login(email, password);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: Users, title: "User Management", desc: "View, search & manage all users" },
    { icon: Ban, title: "Ban & Unban", desc: "Control user access instantly" },
    { icon: BarChart3, title: "Analytics", desc: "Platform-wide stats & insights" },
    { icon: Settings, title: "System Control", desc: "Subscription & role management" },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left Panel — Admin Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-between p-12"
        style={{ background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a2e 40%, #16213e 100%)' }}
      >
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-20 -left-20 w-72 h-72 rounded-full blur-3xl" style={{ background: 'rgba(220, 38, 38, 0.08)', animation: 'pulse 5s ease-in-out infinite' }} />
          <div className="absolute bottom-40 right-10 w-96 h-96 rounded-full blur-3xl" style={{ background: 'rgba(251, 146, 60, 0.06)', animation: 'pulse 7s ease-in-out infinite' }} />
          <div className="absolute top-1/2 left-1/3 w-48 h-48 rounded-full blur-2xl" style={{ background: 'rgba(239, 68, 68, 0.05)', animation: 'pulse 4s ease-in-out infinite' }} />
          {/* Grid pattern overlay */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
          }} />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-lg"
              style={{ background: 'linear-gradient(135deg, #dc2626, #ea580c)' }}
            >
              <ShieldCheck size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl text-white tracking-tight" style={{ fontFamily: "'DM Serif Display', serif" }}>TakaTrack</h1>
              <p className="text-xs font-medium tracking-widest uppercase" style={{ color: 'rgba(248, 113, 113, 0.7)' }}>Admin Console</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <h2 className="text-3xl text-white leading-snug" style={{ fontFamily: "'DM Serif Display', serif" }}>
            Command center for<br />
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(90deg, #f87171, #fb923c)' }}>platform control</span>
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-xl p-4 transition-all duration-300 group cursor-default"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(8px)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.07)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)'; }}
              >
                <Icon size={18} className="mb-2 transition-transform group-hover:scale-110" style={{ color: '#f87171' }} />
                <h3 className="text-white text-sm font-semibold" style={{ fontFamily: "'DM Sans', sans-serif" }}>{title}</h3>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
          TakaTrack Admin Panel &middot; Authorized access only
        </p>
      </div>

      {/* Right Panel — Auth Form */}
      <div className="flex-1 flex items-center justify-center p-6" style={{ background: 'linear-gradient(180deg, #fafafa 0%, #ffffff 100%)' }}>
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
              style={{ background: 'linear-gradient(135deg, #dc2626, #ea580c)' }}
            >
              <ShieldCheck size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl" style={{ fontFamily: "'DM Serif Display', serif", color: '#1a1a1a' }}>TakaTrack</h1>
              <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: '#dc2626' }}>Admin</p>
            </div>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-2xl" style={{ fontFamily: "'DM Serif Display', serif", color: '#1a1a1a' }}>
              {isRegister ? "Create admin account" : "Admin sign in"}
            </h2>
            <p className="text-sm mt-1" style={{ color: '#6b7280' }}>
              {isRegister ? "Set up your admin credentials" : "Enter your credentials to continue"}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="px-4 py-3 rounded-xl mb-6 text-sm" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>
              {error}
            </div>
          )}

          {/* Email Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#374151' }}>Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Admin Name"
                  required
                  className="w-full rounded-xl py-3 px-4 text-sm transition-all outline-none"
                  style={{
                    background: '#fff', border: '1px solid #e5e7eb', color: '#1a1a1a',
                  }}
                  onFocus={e => { e.target.style.borderColor = '#dc2626'; e.target.style.boxShadow = '0 0 0 3px rgba(220,38,38,0.1)'; }}
                  onBlur={e => { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = 'none'; }}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#374151' }}>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@takatrack.com"
                required
                className="w-full rounded-xl py-3 px-4 text-sm transition-all outline-none"
                style={{
                  background: '#fff', border: '1px solid #e5e7eb', color: '#1a1a1a',
                }}
                onFocus={e => { e.target.style.borderColor = '#dc2626'; e.target.style.boxShadow = '0 0 0 3px rgba(220,38,38,0.1)'; }}
                onBlur={e => { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = 'none'; }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#374151' }}>Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isRegister ? "Min. 8 characters" : "Enter your password"}
                  required
                  minLength={isRegister ? 8 : undefined}
                  className="w-full rounded-xl py-3 px-4 pr-11 text-sm transition-all outline-none"
                  style={{
                    background: '#fff', border: '1px solid #e5e7eb', color: '#1a1a1a',
                  }}
                  onFocus={e => { e.target.style.borderColor = '#dc2626'; e.target.style.boxShadow = '0 0 0 3px rgba(220,38,38,0.1)'; }}
                  onBlur={e => { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = 'none'; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: '#9ca3af' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#4b5563'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#9ca3af'; }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full text-white py-3 rounded-xl font-semibold text-sm transition-all duration-200 active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
                boxShadow: '0 4px 14px rgba(220, 38, 38, 0.25)',
                opacity: loading ? 0.6 : 1,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.opacity = '0.9'; }}
              onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {isRegister ? "Creating account..." : "Signing in..."}
                </span>
              ) : (
                isRegister ? "Create Admin Account" : "Sign In to Admin Panel"
              )}
            </button>
          </form>

          {/* Toggle */}
          <p className="text-center text-sm mt-6" style={{ color: '#6b7280' }}>
            {isRegister ? "Already have an admin account?" : "Need an admin account?"}
            <button
              onClick={() => { setIsRegister(!isRegister); setError(""); }}
              className="ml-1 font-semibold transition-colors"
              style={{ color: '#dc2626' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#b91c1c'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#dc2626'; }}
            >
              {isRegister ? "Sign In" : "Register"}
            </button>
          </p>

          {/* Back to user login link */}
          <div className="text-center mt-4">
            <a
              href="/login"
              className="text-xs transition-colors"
              style={{ color: '#9ca3af' }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#6b7280'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#9ca3af'; }}
            >
              &larr; Back to user login
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
