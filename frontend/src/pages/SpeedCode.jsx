import { useState } from "react";
import CodeTyping from "../components/code/CodeTyping";
import CodeChallenge from "../components/code/CodeChallenge";
import CodeLesson from "../components/code/CodeLesson";
import { Code2, Keyboard, Brain, BookOpen } from "lucide-react";

const TABS = [
  { id: "type", label: "Type", icon: Keyboard, color: "#C9B6FF" },
  { id: "challenge", label: "Challenge", icon: Brain, color: "#FFD3B6" },
  { id: "learn", label: "Learn", icon: BookOpen, color: "#A8E6CF" },
];

export default function SpeedCode() {
  const [tab, setTab] = useState("type");

  return (
    <div data-testid="code-page" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-10 py-10">
      {/* Header */}
      <div className="mb-6">
        <span className="nb-badge bg-[#C9B6FF]"><Code2 size={12} strokeWidth={3}/> Code Lab</span>
        <h1 className="font-display font-black text-3xl sm:text-4xl mt-2">Your coding playground</h1>
        <p className="text-[var(--muted)]">Type, challenge yourself, and learn — all in one place.</p>
      </div>

      {/* Tab bar */}
      <div className="flex rounded-xl border-[3px] border-[var(--ink)] bg-[var(--soft)] p-1 mb-6 shadow-[3px_3px_0_0_var(--ink)]">
        {TABS.map((t) => (
          <button
            key={t.id}
            data-testid={`tab-${t.id}`}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-black uppercase tracking-wider transition-all duration-200 ${
              tab === t.id
                ? "bg-[var(--ink)] text-[var(--surface)] shadow-sm"
                : "text-[var(--muted)] hover:text-[var(--ink)]"
            }`}
          >
            <t.icon size={16} strokeWidth={2.5} />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "type" && <CodeTyping />}
      {tab === "challenge" && <CodeChallenge />}
      {tab === "learn" && <CodeLesson />}
    </div>
  );
}
