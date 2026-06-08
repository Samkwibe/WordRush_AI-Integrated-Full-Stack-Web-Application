import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { signup, login } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { LogIn, UserPlus, Mail, Lock, User as UserIcon, Loader2 } from "lucide-react";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
function googleLogin() {
  const redirectUrl = window.location.origin + "/auth/callback";
  window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
}

export default function LoginPage() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from || "/";

  const [mode, setMode] = useState("login"); // login | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const u = mode === "signup"
        ? await signup({ email, password, name })
        : await login({ email, password });
      setUser(u);
      navigate(redirectTo, { replace: true });
    } catch (e2) {
      setErr(e2?.response?.data?.detail || "Could not authenticate.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-testid="login-page" className="max-w-md mx-auto px-4 sm:px-6 py-12">
      <div className="nb-card p-7 bg-white">
        <h1 className="font-display font-black text-3xl">
          {mode === "signup" ? "Create account" : "Welcome back"}
        </h1>
        <p className="text-sm text-[#555] mt-1">
          Sync stats & word lists across devices. Earn badges. Compete on the leaderboard.
        </p>

        <button
          data-testid="google-login-btn"
          onClick={googleLogin}
          className="nb-btn nb-btn-ghost w-full justify-center mt-6"
        >
          <svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true">
            <path fill="#FFC107" d="M43.6 20.5h-1.9V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.2 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16.3 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.2 29.3 4 24 4 16.3 4 9.6 8.5 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.5-5.2l-6.2-5.2C29.4 35 26.9 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.5 16.2 44 24 44z"/>
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4-4 5.4l6.2 5.2C41.2 35.4 44 30.1 44 24c0-1.3-.1-2.4-.4-3.5z"/>
          </svg>
          Continue with Google
        </button>

        <div className="my-5 flex items-center gap-3">
          <div className="flex-1 h-[2px] bg-[#121212]" />
          <span className="label-cap">or</span>
          <div className="flex-1 h-[2px] bg-[#121212]" />
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" && (
            <label className="block">
              <span className="label-cap">Name</span>
              <div className="relative mt-1">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" size={16} strokeWidth={2.5}/>
                <input data-testid="signup-name" required value={name} onChange={(e) => setName(e.target.value)} className="nb-input pl-9" placeholder="Your name"/>
              </div>
            </label>
          )}
          <label className="block">
            <span className="label-cap">Email</span>
            <div className="relative mt-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" size={16} strokeWidth={2.5}/>
              <input data-testid="auth-email" required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="nb-input pl-9" placeholder="you@example.com"/>
            </div>
          </label>
          <label className="block">
            <span className="label-cap">Password</span>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" size={16} strokeWidth={2.5}/>
              <input data-testid="auth-password" required type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="nb-input pl-9" placeholder="••••••••"/>
            </div>
          </label>
          {err && <div className="nb-badge bg-[#FFB8D1]" data-testid="auth-error">{err}</div>}
          <button data-testid="auth-submit" disabled={loading} className="nb-btn w-full justify-center">
            {loading
              ? <><Loader2 size={16} className="animate-spin"/> Working…</>
              : mode === "signup"
                ? <><UserPlus size={16} strokeWidth={3}/> Create account</>
                : <><LogIn size={16} strokeWidth={3}/> Log in</>}
          </button>
        </form>

        <div className="mt-4 text-sm text-center">
          {mode === "signup" ? (
            <>Already have an account?{" "}
              <button data-testid="switch-login" onClick={() => setMode("login")} className="font-bold underline">Log in</button>
            </>
          ) : (
            <>New to WordRush?{" "}
              <button data-testid="switch-signup" onClick={() => setMode("signup")} className="font-bold underline">Create account</button>
            </>
          )}
        </div>
        <div className="mt-2 text-center">
          <Link to="/" className="text-xs text-[#555] underline">Continue as guest</Link>
        </div>
      </div>
    </div>
  );
}
