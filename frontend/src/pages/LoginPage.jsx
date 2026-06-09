import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { signup, login } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { LogIn, UserPlus, Mail, Lock, User as UserIcon, Loader2, Eye, EyeOff, CheckCircle2, Zap, BarChart3, Trophy } from "lucide-react";

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
  const [showPassword, setShowPassword] = useState(false);

  const getAuthErrorMessage = (error) => {
    const status = error?.response?.status;
    const detail = error?.response?.data?.detail;

    if (!error?.response) return "Unable to connect to the server. Make sure the backend is running.";

    if (typeof detail === "string") {
      const lower = detail.toLowerCase();
      if (lower.includes("already registered") || lower.includes("already exists")) {
        return "An account with this email already exists. Try logging in instead.";
      }
      if (lower.includes("invalid email or password")) {
        return "Invalid email or password. Please try again.";
      }
      return detail;
    }

    if (status === 422 && Array.isArray(detail)) {
      const hasEmailError = detail.some((d) => (d?.loc || []).includes("email"));
      const hasPasswordError = detail.some((d) => (d?.loc || []).includes("password"));
      if (hasEmailError) return "Please enter a valid email address.";
      if (hasPasswordError) return "Password must be at least 6 characters.";
      return "Please check your input and try again.";
    }

    if (status === 401) return "Invalid email or password.";
    if (status === 400 && mode === "signup") return "An account with this email already exists.";

    return "Something went wrong. Please try again.";
  };

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
      console.error("[Auth Error]", {
        mode,
        status: e2?.response?.status,
        data: e2?.response?.data,
        message: e2?.message,
      });
      setErr(getAuthErrorMessage(e2));
    } finally {
      setLoading(false);
    }
  };

  const inputClass = [
    "w-full h-12 rounded-xl font-semibold text-[15px] tracking-[0.01em]",
    "bg-[var(--surface)] border-[3px] border-[var(--ink)] shadow-[3px_3px_0_0_var(--ink)]",
    "outline-none transition-all duration-200",
    "focus:shadow-[5px_5px_0_0_var(--ink)]",
    "placeholder:text-[var(--muted)] placeholder:opacity-70 placeholder:font-medium",
    "text-[var(--ink)]",
  ].join(" ");

  return (
    <div data-testid="login-page" className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4 sm:px-6 py-8">
      <div className="w-full max-w-[480px]">
        <div className="nb-card p-6 sm:p-8">
          {/* Tab Switcher */}
          <div className="flex rounded-xl border-[3px] border-[var(--ink)] bg-[var(--soft)] p-1 mb-6">
            <button
              type="button"
              data-testid="switch-login"
              onClick={() => { setMode("login"); setErr(""); }}
              className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-black uppercase tracking-wider transition-all duration-200 ${
                mode === "login"
                  ? "bg-[var(--ink)] text-[var(--bg)] shadow-sm"
                  : "text-[var(--muted)] hover:text-[var(--ink)]"
              }`}
            >
              Log in
            </button>
            <button
              type="button"
              data-testid="switch-signup"
              onClick={() => { setMode("signup"); setErr(""); }}
              className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-black uppercase tracking-wider transition-all duration-200 ${
                mode === "signup"
                  ? "bg-[var(--ink)] text-[var(--bg)] shadow-sm"
                  : "text-[var(--muted)] hover:text-[var(--ink)]"
              }`}
            >
              Sign up
            </button>
          </div>

          {/* Header */}
          <div className="mb-6">
            <h1 className="font-display font-black text-3xl sm:text-4xl leading-tight">
              {mode === "signup" ? "Create your account" : "Welcome back"}
            </h1>
            <p className="text-sm text-[var(--muted)] mt-2 leading-relaxed">
              {mode === "signup"
                ? "Sign up to sync your progress across devices and compete on the leaderboard."
                : "Log in to access your saved stats, word lists, and achievements."}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <label className="block">
                <span className="label-cap">Name</span>
                <div className="relative mt-1.5">
                  <UserIcon
                    size={16}
                    strokeWidth={2.5}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none"
                  />
                  <input
                    data-testid="signup-name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={inputClass}
                    style={{ paddingLeft: "2.75rem", paddingRight: "0.875rem" }}
                    placeholder="Your name"
                  />
                </div>
              </label>
            )}

            <label className="block">
              <span className="label-cap">Email</span>
              <div className="relative mt-1.5">
                <Mail
                  size={16}
                  strokeWidth={2.5}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none"
                />
                <input
                  data-testid="auth-email"
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  style={{ paddingLeft: "2.75rem", paddingRight: "0.875rem" }}
                  placeholder="you@example.com"
                />
              </div>
            </label>

            <label className="block">
              <span className="label-cap">Password</span>
              <div className="relative mt-1.5">
                <Lock
                  size={16}
                  strokeWidth={2.5}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none"
                />
                <input
                  data-testid="auth-password"
                  required
                  type={showPassword ? "text" : "password"}
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                  style={{ paddingLeft: "2.75rem", paddingRight: "3rem" }}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] rounded-lg transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {mode === "signup" && (
                <p className="mt-1.5 text-xs text-[var(--muted)]">At least 6 characters</p>
              )}
            </label>

            {/* Error / Info Banner */}
            {err ? (
              <div
                className="rounded-xl border-[3px] border-[var(--ink)] bg-[#FFD4E3] px-4 py-3 text-sm font-semibold text-[#3a1b25] shadow-[3px_3px_0_0_var(--ink)]"
                data-testid="auth-error"
              >
                {err}
              </div>
            ) : (
              <div className="rounded-xl border-[3px] border-[var(--ink)] bg-[#D8F6E6] px-4 py-3 text-sm font-semibold text-[#113626] flex items-center gap-2 shadow-[3px_3px_0_0_var(--ink)]">
                <CheckCircle2 size={16} strokeWidth={2.5} />
                <span>
                  {mode === "signup"
                    ? "Create an account to unlock cloud sync and achievements."
                    : "Sign in to sync your progress across devices."}
                </span>
              </div>
            )}

            {/* Submit */}
            <button
              data-testid="auth-submit"
              disabled={loading}
              className="nb-btn w-full justify-center h-12"
            >
              {loading ? (
                <><Loader2 size={16} className="animate-spin" /> Working…</>
              ) : mode === "signup" ? (
                <><UserPlus size={16} strokeWidth={3} /> Create account</>
              ) : (
                <><LogIn size={16} strokeWidth={3} /> Log in</>
              )}
            </button>
          </form>

          {/* Guest Link */}
          <div className="mt-5 text-center">
            <Link to="/" className="text-sm text-[var(--muted)] underline underline-offset-2 hover:text-[var(--ink)] transition-colors">
              Continue as guest
            </Link>
          </div>
        </div>

        {/* Feature highlights below card */}
        <div className="grid grid-cols-3 gap-3 mt-5">
          {[
            { icon: Zap, label: "4 game modes", color: "#FFB8D1" },
            { icon: BarChart3, label: "Track stats", color: "#A8E6CF" },
            { icon: Trophy, label: "Leaderboard", color: "#FFD3B6" },
          ].map((f, i) => (
            <div key={i} className="nb-card p-3 text-center hover:translate-y-0">
              <f.icon className="mx-auto" strokeWidth={2.5} size={18} style={{ color: "var(--ink)" }} />
              <div className="text-[10px] font-bold mt-1.5 uppercase tracking-wider">{f.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
