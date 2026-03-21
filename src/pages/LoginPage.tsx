import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "@/lib/authApi";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "@/hooks/use-toast";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await login({
        email,
        password,
      });

      setUser(response.user);
      navigate(response.user.role === "super_admin" ? "/owner/dashboard" : "/dashboard");
    } catch (error) {
      toast({
        title: "Sign-in failed",
        description: error instanceof Error ? error.message : "Unable to sign in right now.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07110c] text-white">
      <header className="border-b border-white/10 bg-[#121212]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-500/10">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5 text-emerald-300">
                <path d="M3 21h18" />
                <path d="M5 21V7l7-4 7 4v14" />
                <path d="M9 21v-6h6v6" />
                <path d="M10 9h4" />
                <path d="M12 7v4" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">MedGhana</h1>
              <p className="text-xs text-white/50">Hospital management</p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/create-hospital" className="rounded-lg px-4 py-2 text-sm font-medium text-white/85 transition hover:bg-white/5 hover:text-white">
              Create Hospital
            </Link>
          </div>
        </div>
      </header>

      <div className="relative isolate overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.22),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(245,158,11,0.18),transparent_30%)]" />
        <div className="relative mx-auto grid min-h-[calc(100vh-73px)] max-w-7xl items-center gap-10 px-6 py-16 lg:grid-cols-2 lg:px-8">
          <div className="max-w-xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-4 py-2 text-sm text-amber-200">
              <span>+</span>
              <span>Secure sign-in for MedGhana hospital teams</span>
            </div>
            <h2 className="text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">
              Sign in to your hospital workspace
            </h2>
            <p className="mt-6 text-lg leading-8 text-white/75">
              Access patient records, appointments, triage, billing, pharmacy, laboratory, and reports according to
              your assigned role and branch policy.
            </p>
            <div className="mt-10 space-y-3 text-sm text-white/70">
              <div>Email-based sign-in keeps access simple for approved staff</div>
              <div>Role-aware access for clinical, finance, and operational teams</div>
              <div>Designed for hospitals, clinics, maternity homes, and diagnostic centres</div>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-md">
            <div className="rounded-[24px] border border-emerald-400/10 bg-[#0c1712]/90 p-6">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-white">Login</h3>
                <p className="mt-2 text-sm text-white/60">Enter your staff credentials to access the workspace.</p>
              </div>

              <form className="space-y-4" onSubmit={handleLogin}>
                <div>
                  <label className="mb-2 block text-sm text-white/70">Email</label>
                  <input type="email" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/35 focus:border-emerald-400/40" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@hospital.com" required />
                </div>
                <div>
                  <label className="mb-2 block text-sm text-white/70">Password</label>
                  <input type="password" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/35 focus:border-emerald-400/40" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" required />
                </div>

                <button type="submit" disabled={loading} className="inline-flex w-full items-center justify-center rounded-xl bg-amber-500 px-6 py-3.5 text-base font-semibold text-[#1b1204] transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60">
                  {loading ? "Signing in..." : "Login"}
                </button>

                <p className="text-center text-sm text-white/60">
                  Need a workspace?{" "}
                  <Link to="/create-hospital" className="font-medium text-amber-300 hover:text-amber-200">
                    Create Hospital
                  </Link>
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>

      <div className="pb-4 text-center">
        <Link to="/owner/login" className="text-[10px] text-white/20 transition hover:text-white/40">
          owner
        </Link>
      </div>
    </div>
  );
}
