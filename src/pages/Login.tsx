import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import { Eye, EyeOff, Wallet, TrendingUp, Shield, Sparkles } from "lucide-react";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

export default function Login() {
  const { login, register, googleLogin } = useAuth();
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
        await register(email, password, name);
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setError("");
    setLoading(true);
    try {
      await googleLogin(credentialResponse.credential);
    } catch (err: any) {
      setError(err.message || "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: Wallet, title: "Track Expenses", desc: "Log every taka you spend" },
    { icon: TrendingUp, title: "Smart Reports", desc: "Beautiful charts & insights" },
    { icon: Shield, title: "Budget Control", desc: "Set limits, stay on track" },
    { icon: Sparkles, title: "AI Assistant", desc: "Voice-powered expense tracking" },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left Panel — Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-[#1a2332] via-[#1e3a5f] to-[#0f2027] flex-col justify-between p-12">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-20 -left-20 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl animate-pulse" />
          <div className="absolute bottom-40 right-10 w-96 h-96 rounded-full bg-teal-500/8 blur-3xl" style={{ animation: 'pulse 4s ease-in-out infinite' }} />
          <div className="absolute top-1/2 left-1/3 w-48 h-48 rounded-full bg-amber-400/5 blur-2xl" style={{ animation: 'pulse 6s ease-in-out infinite' }} />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <span className="text-white font-bold text-lg">৳</span>
            </div>
            <h1 className="text-3xl font-serif text-white tracking-tight">TakaTrack</h1>
          </div>
          <p className="text-blue-200/60 text-sm ml-[52px]">Premium Finance Manager</p>
        </div>

        <div className="relative z-10 space-y-6">
          <h2 className="text-3xl font-serif text-white leading-snug">
            Take control of<br />
            your <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-400">finances</span>
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 hover:bg-white/8 transition-all duration-300 group">
                <Icon size={20} className="text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
                <h3 className="text-white text-sm font-semibold">{title}</h3>
                <p className="text-blue-200/50 text-xs mt-0.5">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-blue-200/30 text-xs">
          © 2026 TakaTrack. Crafted for Bangladesh 🇧🇩
        </p>
      </div>

      {/* Right Panel — Auth Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gradient-to-b from-gray-50 to-white">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-lg">৳</span>
            </div>
            <h1 className="text-2xl font-serif text-gray-900">TakaTrack</h1>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-2xl font-serif text-gray-900">
              {isRegister ? "Create your account" : "Welcome back"}
            </h2>
            <p className="text-gray-500 text-sm mt-1">
              {isRegister ? "Start managing your finances today" : "Sign in to continue tracking"}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm animate-in fade-in duration-200">
              {error}
            </div>
          )}

          {/* Google Sign-In */}
          {GOOGLE_CLIENT_ID && (
            <div className="mb-6">
              <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
                <div className="flex justify-center">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => setError("Google sign-in failed")}
                    theme="outline"
                    size="large"
                    width="400"
                    text={isRegister ? "signup_with" : "signin_with"}
                    shape="pill"
                  />
                </div>
              </GoogleOAuthProvider>

              <div className="flex items-center gap-3 my-6">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400 font-medium">or continue with email</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
            </div>
          )}

          {/* Email Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Md. Seyam Ali"
                  className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isRegister ? "Min. 6 characters" : "Enter your password"}
                  required
                  minLength={isRegister ? 6 : undefined}
                  className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 pr-11 text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#1e3a5f] to-[#2a5298] text-white py-3 rounded-xl font-semibold text-sm hover:opacity-90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/20 active:scale-[0.98]"
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
                isRegister ? "Create Account" : "Sign In"
              )}
            </button>
          </form>

          {/* Toggle */}
          <p className="text-center text-sm text-gray-500 mt-6">
            {isRegister ? "Already have an account?" : "Don't have an account?"}
            <button
              onClick={() => { setIsRegister(!isRegister); setError(""); }}
              className="ml-1 text-blue-600 font-semibold hover:text-blue-700 transition-colors"
            >
              {isRegister ? "Sign In" : "Sign Up"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
