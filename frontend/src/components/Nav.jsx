import { NavLink, useNavigate } from "react-router-dom";
import { Zap, BookOpen, Layers, ListPlus, BarChart3, Sparkles, Code2, Trophy, Settings as Cog, LogIn, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const links = [
  { to: "/", label: "Home", icon: Sparkles, testid: "nav-home" },
  { to: "/flash", label: "Flash", icon: Zap, testid: "nav-flash" },
  { to: "/speed-read", label: "Read", icon: BookOpen, testid: "nav-speed" },
  { to: "/match", label: "Match", icon: Layers, testid: "nav-match" },
  { to: "/code", label: "Code", icon: Code2, testid: "nav-code" },
  { to: "/lists", label: "Lists", icon: ListPlus, testid: "nav-lists" },
  { to: "/stats", label: "Stats", icon: BarChart3, testid: "nav-stats" },
  { to: "/leaderboard", label: "Board", icon: Trophy, testid: "nav-board" },
];

export default function Nav() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  return (
    <header data-testid="top-nav" className="sticky top-0 z-40 bg-[var(--surface)] border-b-[3px] border-[var(--ink)]">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-3 flex items-center gap-3">
        <button data-testid="nav-logo" onClick={() => navigate("/")} className="flex items-center gap-2 group">
          <img
            src="/samueltech_log.png"
            alt="SamuelTech logo"
            className="w-10 h-10 rounded-xl border-[3px] border-[var(--ink)] object-cover shadow-[3px_3px_0_0_var(--ink)] group-hover:translate-x-[1px] group-hover:translate-y-[1px] group-hover:shadow-[2px_2px_0_0_var(--ink)] transition-all"
          />
          <div className="font-display text-xl sm:text-2xl font-black tracking-tight">
            SamuelTech<span className="text-[#1d9bf0]">.</span>
          </div>
        </button>
        <nav className="hidden lg:flex items-center gap-1 ml-3">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.to === "/"} data-testid={l.testid}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-lg font-display font-bold text-sm uppercase tracking-wider transition-all ${isActive ? "bg-[var(--ink)] text-[var(--surface)]" : "hover:bg-[var(--hover)] text-[var(--ink)]"
                }`
              }
            >
              <l.icon size={16} strokeWidth={2.5} />
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <NavLink to="/settings" data-testid="nav-settings" className="nb-badge bg-[var(--surface)]"><Cog size={12} strokeWidth={3} /> Settings</NavLink>
          {user ? (
            <div className="flex items-center gap-2">
              {user.picture
                ? <img src={user.picture} alt="" className="w-9 h-9 rounded-md nb-border object-cover" data-testid="nav-user-avatar" />
                : <div className="w-9 h-9 rounded-md nb-border bg-[#A8E6CF] flex items-center justify-center font-display font-black" data-testid="nav-user-avatar">{(user.name || "?")[0].toUpperCase()}</div>}
              <button data-testid="nav-logout" onClick={async () => { await logout(); navigate("/"); }} className="hidden sm:inline-flex nb-badge bg-[#FFB8D1]"><LogOut size={12} strokeWidth={3} /> Out</button>
            </div>
          ) : (
            <NavLink to="/login" data-testid="nav-login" className="nb-btn"><LogIn size={16} strokeWidth={3} /> Log in</NavLink>
          )}
        </div>
      </div>
      <div className="lg:hidden border-t-[2px] border-[var(--ink)] overflow-x-auto">
        <div className="flex gap-1 px-3 py-2">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.to === "/"} data-testid={`${l.testid}-mobile`}
              className={({ isActive }) =>
                `flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg border-2 border-[var(--ink)] text-sm font-bold ${isActive ? "bg-[var(--ink)] text-[var(--surface)]" : "bg-[var(--surface)]"}`
              }>
              <l.icon size={14} strokeWidth={2.5} /> {l.label}
            </NavLink>
          ))}
        </div>
      </div>
    </header>
  );
}
