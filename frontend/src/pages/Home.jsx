import { useNavigate } from "react-router-dom";
import { Zap, BookOpen, Layers, Code2, ArrowRight, Sparkles, Globe, Brain, Timer } from "lucide-react";
import DailyChallenge from "../components/DailyChallenge";

const modes = [
  { id: "flash", title: "Flash Cards", desc: "Words flash on screen. Race to remember them all.", bg: "#FFB8D1", icon: Zap, to: "/flash", testid: "mode-flash-cards-btn" },
  { id: "speed", title: "Speed Reading", desc: "Sprint through passages then answer comprehension.", bg: "#A8E6CF", icon: BookOpen, to: "/speed-read", testid: "mode-speed-read-btn" },
  { id: "match", title: "Memory Match", desc: "Flip cards. Pair words with their meanings.", bg: "#FFD3B6", icon: Layers, to: "/match", testid: "mode-match-btn" },
  { id: "code", title: "Speed Code", desc: "Retype real code snippets — fast and accurately.", bg: "#C9B6FF", icon: Code2, to: "/code", testid: "mode-code-btn" },
];

export default function Home() {
  const navigate = useNavigate();
  return (
    <div data-testid="home-page" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-10 sm:py-14">
      {/* Hero */}
      <section className="grid lg:grid-cols-[1.4fr_1fr] gap-8 lg:gap-12 items-center mb-12 lg:mb-16">
        <div>
          <span className="nb-badge bg-[#FFD3B6]" data-testid="hero-badge">
            <Sparkles size={14} strokeWidth={3} /> Train your reading brain
          </span>
          <h1 className="mt-5 font-display font-black text-4xl sm:text-5xl lg:text-6xl leading-[1.02] tracking-tight">
            Read <span className="bg-[#FFB8D1] px-2 -rotate-1 inline-block border-[3px] border-[var(--ink)] shadow-[4px_4px_0_0_var(--ink)] text-[#121212]">faster</span>.
            <br />
            Remember <span className="bg-[#A8E6CF] px-2 rotate-1 inline-block border-[3px] border-[var(--ink)] shadow-[4px_4px_0_0_var(--ink)] text-[#121212]">more</span>.
          </h1>
          <p className="mt-6 text-lg max-w-xl">
            A tiny gym for your vocabulary. Four game modes, eight languages,
            and an AI that crafts word lists & code snippets about anything you can dream up.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button data-testid="cta-start-flash" onClick={() => navigate("/flash")} className="nb-btn">
              <Zap size={18} strokeWidth={3} /> Start Flashing <ArrowRight size={18} strokeWidth={3} />
            </button>
            <button data-testid="cta-browse-lists" onClick={() => navigate("/lists")} className="nb-btn nb-btn-ghost">
              <Sparkles size={18} strokeWidth={3} /> Generate a Word List
            </button>
          </div>

          <div className="mt-10 grid grid-cols-3 gap-3 max-w-md">
            {[
              { icon: Globe, label: "8 languages" },
              { icon: Brain, label: "AI lists" },
              { icon: Timer, label: "Adjustable WPM" },
            ].map((f, i) => (
              <div key={i} className="nb-card p-3 text-center">
                <f.icon className="mx-auto" strokeWidth={2.5} size={20} />
                <div className="text-xs font-bold mt-1 uppercase tracking-wider">{f.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative">
          <div className="nb-card p-6 bg-[#C9B6FF]">
            <div className="grid grid-cols-3 gap-3">
              {["fast", "vivid", "calm", "rapid", "lucid", "keen", "swift", "bright", "alert"].map((w, i) => (
                <div key={i} className="aspect-square nb-border rounded-xl flex items-center justify-center bg-[var(--surface)] font-display font-black text-sm sm:text-base shadow-[3px_3px_0_0_var(--ink)]" style={{ transform: `rotate(${(i % 3 - 1) * 2}deg)` }}>
                  {w}
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="nb-badge bg-[var(--surface)]"><Timer size={12} strokeWidth={3}/> 600ms / word</span>
              <span className="nb-badge bg-[#FFB8D1]">Live preview</span>
            </div>
          </div>
        </div>
      </section>

      {/* Daily challenge */}
      <section className="mb-12">
        <DailyChallenge />
      </section>

      {/* Game modes */}
      <section className="mb-16">
        <div className="flex items-end justify-between mb-6 flex-wrap gap-2">
          <h2 className="font-display font-black text-3xl sm:text-4xl">Pick a game mode</h2>
          <span className="label-cap">4 ways to train</span>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {modes.map((m) => (
            <button key={m.id} data-testid={m.testid} onClick={() => navigate(m.to)} className="nb-card text-left p-6 sm:p-7 group text-[#121212]" style={{ background: m.bg }}>
              <div className="w-14 h-14 rounded-xl border-[3px] border-[#121212] bg-white flex items-center justify-center shadow-[3px_3px_0_0_#121212]">
                <m.icon strokeWidth={2.5} size={26} />
              </div>
              <h3 className="mt-5 font-display font-black text-xl">{m.title}</h3>
              <p className="mt-2 text-[#1f1f1f] text-sm">{m.desc}</p>
              <div className="mt-5 inline-flex items-center gap-2 font-display font-bold uppercase tracking-wider text-xs">
                Play now <ArrowRight strokeWidth={3} size={16} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="nb-card p-6 sm:p-10 bg-[var(--surface)]">
        <h2 className="font-display font-black text-2xl sm:text-3xl">How it works</h2>
        <div className="mt-6 grid md:grid-cols-3 gap-6">
          {[
            { n: "01", t: "Pick a list", d: "Use a built-in pack, generate one with AI, or write your own." },
            { n: "02", t: "Pick a mode", d: "Flash, speed read, match, or code. Each trains a different muscle." },
            { n: "03", t: "Track progress", d: "Stats, streaks, achievements. Cloud-sync when you log in." },
          ].map((s) => (
            <div key={s.n}>
              <div className="font-display font-black text-5xl text-[#FFB8D1]" style={{ WebkitTextStroke: "2px var(--ink)" }}>
                {s.n}
              </div>
              <div className="font-display font-bold text-xl mt-2">{s.t}</div>
              <div className="text-[var(--muted)]">{s.d}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
