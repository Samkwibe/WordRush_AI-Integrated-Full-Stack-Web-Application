import { useEffect, useMemo, useRef, useState } from "react";
import { generateLesson } from "../../lib/api";
import { recordLessonSession, recordCodeSession } from "../../lib/storage";
import { sfx } from "../../lib/sound";
import { tokenize, TOKEN_COLORS } from "../../lib/syntax";
import { BookOpen, Play, Loader2, ChevronRight, CheckCircle2, Lightbulb, RotateCcw, Sparkles } from "lucide-react";

const LANGS = ["python", "javascript", "typescript", "java", "go", "rust"];
const DIFFS = ["easy", "medium", "hard"];
const TOPICS = [
  { value: "variables", label: "Variables & Types", icon: "📦", color: "#FFB8D1" },
  { value: "loops", label: "Loops & Iteration", icon: "🔄", color: "#A8E6CF" },
  { value: "functions", label: "Functions", icon: "⚡", color: "#FFD3B6" },
  { value: "conditionals", label: "Conditionals", icon: "🔀", color: "#C9B6FF" },
  { value: "arrays", label: "Arrays & Lists", icon: "📋", color: "#B6E3FF" },
  { value: "strings", label: "String Ops", icon: "🔤", color: "#FFF7DC" },
  { value: "error_handling", label: "Error Handling", icon: "🛡️", color: "#FFB8D1" },
  { value: "classes", label: "Classes & OOP", icon: "🏗️", color: "#A8E6CF" },
  { value: "algorithms", label: "Algorithms", icon: "🧮", color: "#FFD3B6" },
  { value: "patterns", label: "Patterns", icon: "🎨", color: "#C9B6FF" },
];

export default function CodeLesson() {
  const [language, setLanguage] = useState("python");
  const [difficulty, setDifficulty] = useState("easy");
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(0); // 0=read, 1=study, 2=practice, 3=complete

  // Practice typing state
  const [typed, setTyped] = useState("");
  const [startAt, setStartAt] = useState(null);
  const [endAt, setEndAt] = useState(null);
  const [now, setNow] = useState(Date.now());
  const inputRef = useRef(null);

  useEffect(() => {
    if (!startAt || endAt) return undefined;
    const i = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(i);
  }, [startAt, endAt]);

  const fetchLesson = async (topic) => {
    setSelectedTopic(topic);
    setError(""); setLoading(true); setLesson(null); setStep(0);
    setTyped(""); setStartAt(null); setEndAt(null);
    try {
      const data = await generateLesson({ language, topic, difficulty });
      setLesson(data);
    } catch (e) {
      setError(e?.response?.data?.detail || "Could not generate lesson.");
      setSelectedTopic(null);
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    setLesson(null); setSelectedTopic(null); setStep(0);
    setTyped(""); setStartAt(null); setEndAt(null); setError("");
  };

  // Practice typing logic
  const practiceSnippet = lesson?.practice_snippet || "";

  const handleInput = (e) => {
    const v = e.target.value;
    if (!startAt && v.length > 0) setStartAt(Date.now());
    setTyped(v);
    if (practiceSnippet && v === practiceSnippet) {
      const finishedAt = Date.now();
      setEndAt(finishedAt);
      sfx.win();
      const minutes = Math.max(0.01, (finishedAt - (startAt || finishedAt)) / 60000);
      const wpm = Math.round((v.length / 5) / minutes);
      const acc = computeAccuracy(v, practiceSnippet);
      recordCodeSession({ wpm, accuracy: acc, language });
      recordLessonSession({ topic: selectedTopic, language });
      setStep(3);
    } else if (practiceSnippet) {
      const idx = v.length - 1;
      if (idx >= 0 && practiceSnippet[idx] === v[idx]) sfx.tick();
      else sfx.miss();
    }
  };

  function computeAccuracy(input, target) {
    if (!input.length) return 100;
    let correct = 0;
    for (let i = 0; i < input.length; i++) {
      if (input[i] === target[i]) correct++;
    }
    return Math.round((correct / Math.max(input.length, target.length)) * 100);
  }

  const seconds = startAt ? Math.floor(((endAt || now) - startAt) / 1000) : 0;
  const currentWpm = useMemo(() => {
    if (!startAt) return 0;
    const minutes = Math.max(0.01, ((endAt || now) - startAt) / 60000);
    return Math.round((typed.length / 5) / minutes);
  }, [typed, startAt, endAt, now]);
  const currentAcc = useMemo(() => practiceSnippet ? computeAccuracy(typed, practiceSnippet) : 100, [typed, practiceSnippet]);

  // Render syntax highlighted code block (read-only)
  const renderCodeBlock = (code) => {
    if (!code) return null;
    const tokens = tokenize(code, language);
    const charSyn = [];
    for (const token of tokens) {
      for (let i = 0; i < token.text.length; i++) {
        charSyn.push(token.type);
      }
    }
    const lines = code.split("\n");
    let charOffset = 0;

    return (
      <div className="font-mono text-[13px] sm:text-sm leading-7 code-target-block">
        {lines.map((line, li) => {
          const lineStart = charOffset;
          const lineChars = line.split("").map((ch, ci) => {
            const idx = lineStart + ci;
            const synType = charSyn[idx] || "normal";
            return <span key={ci} className={`code-char-pending ${TOKEN_COLORS[synType]}`}>{ch}</span>;
          });
          charOffset += line.length + 1;
          return (
            <div key={li} className="flex min-h-[1.75rem]">
              <span className="select-none w-8 sm:w-10 text-right pr-3 syn-line-num flex-shrink-0 opacity-40">{li + 1}</span>
              <span className="flex-1 whitespace-pre-wrap break-all">{lineChars}</span>
            </div>
          );
        })}
      </div>
    );
  };

  // Render practice snippet with typing highlights
  const renderPracticeTarget = () => {
    if (!practiceSnippet) return null;
    const tokens = tokenize(practiceSnippet, language);
    const charSyn = [];
    for (const token of tokens) {
      for (let i = 0; i < token.text.length; i++) {
        charSyn.push(token.type);
      }
    }
    const lines = practiceSnippet.split("\n");
    let charOffset = 0;

    return (
      <div className="font-mono text-[13px] sm:text-sm leading-7 code-target-block">
        {lines.map((line, li) => {
          const lineStart = charOffset;
          const lineChars = line.split("").map((ch, ci) => {
            const idx = lineStart + ci;
            const synType = charSyn[idx] || "normal";
            let cls;
            if (idx < typed.length) {
              cls = typed[idx] === ch ? "code-char-correct" : "code-char-wrong";
            } else if (idx === typed.length) {
              cls = `code-char-cursor ${TOKEN_COLORS[synType]}`;
            } else {
              cls = `code-char-pending ${TOKEN_COLORS[synType]}`;
            }
            return <span key={ci} className={cls}>{ch}</span>;
          });
          charOffset += line.length + 1;
          return (
            <div key={li} className="flex min-h-[1.75rem]">
              <span className="select-none w-8 sm:w-10 text-right pr-3 syn-line-num flex-shrink-0 opacity-40">{li + 1}</span>
              <span className="flex-1 whitespace-pre-wrap break-all">{lineChars}</span>
            </div>
          );
        })}
      </div>
    );
  };

  // Topic selection grid
  if (!lesson && !loading) {
    return (
      <div className="space-y-5">
        <div className="nb-card p-5 bg-white">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <div className="label-cap mb-2">Language</div>
              <select value={language} onChange={(e) => setLanguage(e.target.value)} className="nb-input">
                {LANGS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <div className="label-cap mb-2">Difficulty</div>
              <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="nb-input">
                {DIFFS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-display font-bold text-lg mb-3">Pick a topic to learn</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {TOPICS.map((t) => (
              <button
                key={t.value}
                data-testid={`lesson-topic-${t.value}`}
                onClick={() => fetchLesson(t.value)}
                className="nb-card p-4 text-center group"
                style={{ background: t.color }}
              >
                <div className="text-2xl mb-2">{t.icon}</div>
                <div className="font-display font-bold text-xs uppercase tracking-wider">{t.label}</div>
              </button>
            ))}
          </div>
        </div>

        {error && <div className="nb-badge bg-[#FFB8D1]">{error}</div>}
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="nb-card p-10 bg-white text-center">
        <Loader2 className="animate-spin mx-auto mb-3" size={32}/>
        <div className="font-display font-bold">Generating your lesson on <span className="text-[#6B5CE7]">{TOPICS.find((t) => t.value === selectedTopic)?.label}</span>…</div>
        <div className="text-sm text-[var(--muted)] mt-1">This may take a moment</div>
      </div>
    );
  }

  // Lesson loaded — step-based UI
  const topicMeta = TOPICS.find((t) => t.value === selectedTopic);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={goBack} className="nb-badge bg-white">← Topics</button>
        <span className="nb-badge" style={{ background: topicMeta?.color || "#C9B6FF" }}>
          {topicMeta?.icon} {topicMeta?.label}
        </span>
        <span className="nb-badge bg-white">{language}</span>

        {/* Step indicators */}
        <div className="ml-auto flex gap-1">
          {["Read", "Study", "Practice"].map((s, i) => (
            <button
              key={s}
              onClick={() => { if (i <= 2 && step !== 3) setStep(i); }}
              className={`px-3 py-1 rounded-lg border-2 border-[var(--ink)] text-xs font-bold transition-all ${
                step === i || (step === 3 && i === 2) ? "bg-[var(--ink)] text-[var(--surface)]" : "bg-white"
              }`}
            >
              {i + 1}. {s}
            </button>
          ))}
        </div>
      </div>

      {/* Step 0: Read — Concept explanation */}
      {step === 0 && (
        <div className="space-y-4">
          <div className="nb-card p-6 bg-white">
            <div className="flex items-center gap-2 label-cap text-[#6B5CE7] mb-3">
              <BookOpen size={14} strokeWidth={3}/> Concept
            </div>
            <div className="prose-sm leading-relaxed whitespace-pre-line text-[15px]">
              {lesson?.explanation}
            </div>
          </div>
          <button onClick={() => setStep(1)} className="nb-btn">
            <ChevronRight size={16} strokeWidth={3}/> See the example code
          </button>
        </div>
      )}

      {/* Step 1: Study — Example code */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="nb-card p-5 bg-white">
            <div className="flex items-center gap-2 label-cap text-[#6B5CE7] mb-3">
              <Sparkles size={14} strokeWidth={3}/> Example Code
            </div>
            <div className="nb-card p-4 code-editor-block overflow-x-auto">
              {renderCodeBlock(lesson?.example_code)}
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep(0)} className="nb-btn nb-btn-ghost">← Back</button>
            <button onClick={() => { setStep(2); setTimeout(() => inputRef.current?.focus(), 100); }} className="nb-btn">
              <ChevronRight size={16} strokeWidth={3}/> Practice typing
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Practice — Type the snippet */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="nb-card p-5 bg-white">
            <div className="flex items-center gap-2 label-cap text-[#6B5CE7] mb-2">
              ⌨️ Practice — type the code below
            </div>
            {lesson?.practice_description && (
              <p className="text-sm text-[var(--muted)] mb-3">{lesson.practice_description}</p>
            )}

            {/* Stats */}
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <span className="nb-badge bg-white text-xs">{seconds}s</span>
              <span className="nb-badge bg-[#A8E6CF] text-xs">{currentWpm} WPM</span>
              <span className="nb-badge bg-[#FFD3B6] text-xs">{currentAcc}%</span>
              <span className="nb-badge bg-[#FFF7DC] text-xs">{typed.length}/{practiceSnippet.length}</span>
            </div>

            {/* Target */}
            <div className="nb-card p-4 code-editor-block overflow-x-auto mb-3">
              {renderPracticeTarget()}
            </div>

            {/* Input */}
            <textarea
              ref={inputRef}
              value={typed}
              onChange={handleInput}
              spellCheck="false"
              autoCorrect="off"
              autoCapitalize="off"
              className="nb-input font-mono w-full min-h-[120px] resize-none code-input-area"
              placeholder="Type the practice code here..."
            />
          </div>
          <button onClick={() => setStep(1)} className="nb-btn nb-btn-ghost">← Back to example</button>
        </div>
      )}

      {/* Step 3: Complete */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="nb-card p-6 bg-[#A8E6CF]">
            <div className="label-cap">🎉 Lesson Complete!</div>
            <div className="font-display font-black text-3xl mt-1">{currentWpm} WPM · {currentAcc}%</div>
            <div className="text-sm mt-1">You typed the practice snippet in {seconds}s</div>

            {/* Tips */}
            {lesson?.tips?.length > 0 && (
              <div className="mt-4 nb-card p-4 bg-white border-[3px] border-[var(--ink)]">
                <div className="flex items-center gap-2 label-cap text-[#6B5CE7] mb-2">
                  <Lightbulb size={14} strokeWidth={3}/> Pro Tips
                </div>
                <ul className="space-y-2">
                  {lesson.tips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0 text-green-700" strokeWidth={3}/>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-4 flex gap-3 flex-wrap">
              <button onClick={goBack} className="nb-btn">
                <Play size={16} strokeWidth={3}/> Pick another topic
              </button>
              <button onClick={() => { setTyped(""); setStartAt(null); setEndAt(null); setStep(2); setTimeout(() => inputRef.current?.focus(), 100); }} className="nb-btn nb-btn-ghost">
                <RotateCcw size={16} strokeWidth={3}/> Retry practice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
