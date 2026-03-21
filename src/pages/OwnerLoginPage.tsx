import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ownerLogin } from "@/lib/authApi";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "@/hooks/use-toast";

export default function OwnerLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await ownerLogin({ username, password });
      setUser(response.user);
      navigate("/owner/dashboard");
    } catch (error) {
      toast({
        title: "Owner sign-in failed",
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
              <span className="text-sm font-bold text-emerald-200">MG</span>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">MedGhana</h1>
              <p className="text-xs text-white/50">Owner access</p>
            </div>
          </Link>
          <Link to="/login" className="rounded-lg px-4 py-2 text-sm font-medium text-white/85 transition hover:bg-white/5 hover:text-white">
            Staff Login
          </Link>
        </div>
      </header>

      <div className="relative mx-auto grid min-h-[calc(100vh-73px)] max-w-7xl items-center gap-10 px-6 py-16 lg:grid-cols-2 lg:px-8">
        <div className="max-w-xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-4 py-2 text-sm text-amber-200">
            <span>+</span>
            <span>Platform owner and tenancy oversight</span>
          </div>
          <h2 className="text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">
            Owner access to the MedGhana network
          </h2>
          <p className="mt-6 text-lg leading-8 text-white/75">
            Monitor hospitals, branches, users, patient growth, workflow handoffs, and queued SMS from one owner dashboard.
          </p>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-md">
          <div className="rounded-[24px] border border-emerald-400/10 bg-[#0c1712]/90 p-6">
            <h3 className="text-2xl font-bold text-white">Owner Login</h3>
            <p className="mt-2 text-sm text-white/60">Use your owner username and password.</p>
            <form className="mt-6 space-y-4" onSubmit={handleLogin}>
              <div>
                <label className="mb-2 block text-sm text-white/70">Username</label>
                <input className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/35 focus:border-emerald-400/40" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Joseph" required />
              </div>
              <div>
                <label className="mb-2 block text-sm text-white/70">Password</label>
                <input type="password" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/35 focus:border-emerald-400/40" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your owner password" required />
              </div>
              <button type="submit" disabled={loading} className="inline-flex w-full items-center justify-center rounded-xl bg-amber-500 px-6 py-3.5 text-base font-semibold text-[#1b1204] transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60">
                {loading ? "Signing in..." : "Open Owner Dashboard"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
