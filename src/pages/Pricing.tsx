import { useState } from "react";
import { useAuth, useAuthFetch } from "@/lib/auth-context";
import { Check, Sparkles, ArrowLeft, Crown, MessageSquare, Mic, Shield, Zap } from "lucide-react";
import type { Page } from "@/components/finance/Navigation";

const API_BASE = "http://localhost:3000/api";

interface Props {
  onNavigate: (p: Page) => void;
}

export default function Pricing({ onNavigate }: Props) {
  const { isSubscribed, user } = useAuth();
  const authFetch = useAuthFetch();
  const [loading, setLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const res = await authFetch(`${API_BASE}/subscription/create-checkout`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Failed to create checkout session");
      }
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleManage = async () => {
    setPortalLoading(true);
    try {
      const res = await authFetch(`${API_BASE}/subscription/portal`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      alert("Failed to open billing portal");
    } finally {
      setPortalLoading(false);
    }
  };

  const features = [
    { icon: MessageSquare, text: "Unlimited AI Chat" },
    { icon: Mic, text: "Voice-to-Expense (Bangla)" },
    { icon: Zap, text: "Smart Category Detection" },
    { icon: Shield, text: "Secure & Private" },
  ];

  return (
    <div className="page-transition max-w-xl mx-auto py-4">
      <button
        onClick={() => onNavigate("dashboard")}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft size={16} />
        Back to Dashboard
      </button>

      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-1.5 rounded-full text-xs font-semibold mb-4 border border-amber-200">
          <Crown size={14} />
          PRO PLAN
        </div>
        <h1 className="text-3xl font-serif text-foreground mb-2">Upgrade to Pro</h1>
        <p className="text-muted-foreground text-sm">
          Unlock AI-powered expense tracking with voice support
        </p>
      </div>

      {/* Pricing Card */}
      <div className="bg-card border-2 border-primary/20 rounded-2xl p-8 shadow-xl shadow-primary/5 relative overflow-hidden">
        {/* Decorative gradient */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-amber-400/10 to-transparent rounded-bl-full" />

        <div className="relative z-10">
          <div className="flex items-baseline gap-1 mb-1">
            <span className="text-4xl font-bold text-foreground">৳299</span>
            <span className="text-muted-foreground text-sm">/month</span>
          </div>
          <p className="text-xs text-muted-foreground mb-6">Cancel anytime • No hidden fees</p>

          <div className="space-y-3 mb-8">
            {features.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                  <Icon size={16} className="text-green-600" />
                </div>
                <span className="text-sm text-foreground font-medium">{text}</span>
                <Check size={16} className="text-green-500 ml-auto" />
              </div>
            ))}
          </div>

          {isSubscribed ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm font-medium">
                <Check size={16} />
                You're on the Pro plan!
              </div>
              <button
                onClick={handleManage}
                disabled={portalLoading}
                className="w-full border border-border text-foreground py-3 rounded-xl font-semibold text-sm hover:bg-secondary transition-all disabled:opacity-50"
              >
                {portalLoading ? "Opening..." : "Manage Subscription"}
              </button>
            </div>
          ) : (
            <button
              onClick={handleSubscribe}
              disabled={loading}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white py-3.5 rounded-xl font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-50 shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Redirecting to checkout...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Subscribe Now
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground/60 mt-6">
        Secured by Stripe • 256-bit SSL encryption
      </p>
    </div>
  );
}
