import { useEffect, useMemo, useRef, useState } from "react";
import { generateCode, submitLeaderboard } from "../../lib/api";
import { recordCodeSession } from "../../lib/storage";
import { useAuth } from "../../context/AuthContext";
import { sfx } from "../../lib/sound";
import { tokenize, TOKEN_COLORS } from "../../lib/syntax";
import { Play, RotateCcw, Loader2, Timer, Target, Lightbulb, Flame } from "lucide-react";

const LANGS = ["python", "javascript", "typescript", "java", "go", "rust", "css", "html"];
const DIFFS = ["easy", "medium", "hard"];
const TOPICS = [
  { value: "", label: "Random" },
  { value: "sorting", label: "Sorting" },
  { value: "string manipulation", label: "Strings" },
  { value: "math calculations", label: "Math" },
  { value: "file I/O", label: "File I/O" },
  { value: "data structures", label: "Data Structures" },
  { value: "API calls", label: "APIs" },
  { value: "recursion", label: "Recursion" },
  { value: "error handling", label: "Error Handling" },
];

export default function CodeTyping() {
  const { user } = useAuth();
  const [language, setLanguage] = useState("python");
  const [difficulty, setDifficulty] = useState("easy");
  const [topic, setTopic] = useState("");
  const [snippet, setSnippet] = useState(null);
  const [description, setDescription] = useState("");
  const [explanation, setExplanation] = useState("");
  const [typed, setTyped] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [startAt, setStartAt] = useState(null);
  const [endAt, setEndAt] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [sessionStreak, setSessionStreak] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!startAt || endAt) return undefined;
    const i = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(i);
  }, [startAt, endAt]);

  const fetchSnippet = async () => {
    setError(""); setLoading(true); setSnippet(null); setTyped(""); setStartAt(null); setEndAt(null); setExplanation("");
    try {
      const data = await generateCode({ language, difficulty, topic: topic || undefined });
      setSnippet(data.snippet);
      setDescription(data.description || "");
      setExplanation(data.explanation || "");
      setTimeout(() => inputRef.current?.focus(), 50);
    } catch (e) {
      setError(e?.response?.data?.detail || "Could not generate snippet.");
    } finally {
      setLoading(false);
    }
  };

  const handleInput = (e) => {
    const v = e.target.value;
    if (!startAt && v.length > 0) setStartAt(Date.now());
    setTyped(v);
    if (snippet && v === snippet) {
      const finishedAt = Date.now();
      setEndAt(finishedAt);
      sfx.win();
      setSessionStreak((s) => s + 1);
      const minutes = Math.max(0.01, (finishedAt - (startAt || finishedAt)) / 60000);
      const wpm = Math.round((v.length / 5) / minutes);
      const acc = computeAccuracy(v, snippet);
      recordCodeSession({ wpm, accuracy: acc, language });
      if (user) submitLeaderboard("code", wpm, { language, accuracy: acc }).catch(() => {});
    } else if (snippet) {
      const idx = v.length - 1;
      if (idx >= 0 && snippet[idx] === v[idx]) sfx.tick();
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
  const currentAcc = useMemo(() => snippet ? computeAccuracy(typed, snippet) : 100, [typed, snippet]);

  // Syntax-highlighted tokens for the target snippet
  const syntaxTokens = useMemo(() => {
    if (!snippet) return [];
    return tokenize(snippet, language);
  }, [snippet, language]);

  const renderTokens = () => {
    if (!snippet || !syntaxTokens.length) return null;

    // Map each character to its syntax token type
    let charIndex = 0;
    const charTypes = [];
    for (const token of syntaxTokens) {
      for (let i = 0; i < token.text.length; i++) {
        charTypes.push(token.type);
      }
    }

    // Build lines with line numbers
    const lines = snippet.split("\n");
    let globalIdx = 0;

    return (
      <div className="font-mono text-[13px] sm:text-sm leading-6">
        {lines.map((line, lineNum) => (
          <div key={lineNum} className="flex">
            <span className="select-none w-8 sm:w-10 text-right pr-3 syn-line-num flex-shrink-0">
              {lineNum + 1}
            </span>
            <span className="flex-1 whitespace-pre-wrap break-all">
              {line.split("").map((ch, ci) => {
                const idx = globalIdx + ci;
                const synType = charTypes[idx] || "normal";
                let cls;
                if (idx < typed.length) {
                  cls = typed[idx] === ch
                    ? "code-char-correct"
                    : "code-char-wrong";
                } else if (idx === typed.length) {
                  cls = `code-char-cursor ${TOKEN_COLORS[synType]}`;
                } else {
                  cls = `code-char-pending ${TOKEN_COLORS[synType]}`;
                }
                return <span key={ci} className={cls}>{ch}</span>;
              })}
              {/* If this isn't the last line, account for the \n character */}
              {lineNum < lines.length - 1 && (() => {
                const nlIdx = globalIdx + line.length;
                let nlCls = "code-char-pending";
                if (nlIdx < typed.length) {
                  nlCls = typed[nlIdx] === "\n" ? "code-char-correct" : "code-char-wrong";
                } else if (nlIdx === typed.length) {
                  nlCls = "code-char-cursor";
                }
                return <span className={nlCls}>{" "}</span>;
              })()}
            </span>
          </div>
        ))}
        {/* Hidden: update globalIdx per line */}
        {lines.reduce((_, line, i) => { if (i === 0) globalIdx = 0; else globalIdx += lines[i-1].length + 1; return null; }, null)}
      </div>
    );
  };

  // Better approach: pre-compute character positions
  const renderSyntaxTarget = () => {
    if (!snippet) return null;

    // Build char-level syntax map
    const charSyn = [];
    for (const token of syntaxTokens) {
      for (let i = 0; i < token.text.length; i++) {
        charSyn.push(token.type);
      }
    }

    const lines = snippet.split("\n");
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

          charOffset += line.length + 1; // +1 for \n

          return (
            <div key={li} className="flex min-h-[1.75rem]">
              <span className="select-none w-8 sm:w-10 text-right pr-3 syn-line-num flex-shrink-0 opacity-40">
                {li + 1}
              </span>
              <span className="flex-1 whitespace-pre-wrap break-all">{lineChars}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const reset = () => {
    setTyped(""); setStartAt(null); setEndAt(null); setNow(Date.now());
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="nb-card p-5 bg-white">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <div className="label-cap mb-2">Language</div>
            <select data-testid="code-language" value={language} onChange={(e) => setLanguage(e.target.value)} className="nb-input">
              {LANGS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <div className="label-cap mb-2">Difficulty</div>
            <select data-testid="code-difficulty" value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="nb-input">
              {DIFFS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <div className="label-cap mb-2">Topic</div>
            <select data-testid="code-topic" value={topic} onChange={(e) => setTopic(e.target.value)} className="nb-input">
              {TOPICS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button data-testid="code-generate-btn" onClick={fetchSnippet} disabled={loading} className="nb-btn w-full justify-center">
              {loading ? <><Loader2 className="animate-spin" size={16}/> Loading…</> : <><Play size={16} strokeWidth={3}/> New snippet</>}
            </button>
          </div>
        </div>
        {error && <div className="mt-3 nb-badge bg-[#FFB8D1]" data-testid="code-error">{error}</div>}
      </div>

      {snippet && (
        <div className="space-y-4">
          {/* Stats bar */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="nb-badge bg-white"><Timer size={12} strokeWidth={3}/> {seconds}s</span>
            <span className="nb-badge bg-[#A8E6CF]">{currentWpm} WPM</span>
            <span className="nb-badge bg-[#FFD3B6]"><Target size={12} strokeWidth={3}/> {currentAcc}%</span>
            <span className="nb-badge bg-[#FFF7DC]">{typed.length}/{snippet.length}</span>
            {sessionStreak > 0 && (
              <span className="nb-badge bg-[#C9B6FF]"><Flame size={12} strokeWidth={3}/> {sessionStreak} streak</span>
            )}
            <button data-testid="code-reset-btn" onClick={reset} className="nb-badge bg-[#FFB8D1] ml-auto">
              <RotateCcw size={12} strokeWidth={3}/> Reset
            </button>
          </div>

          {description && <div className="text-sm text-[var(--muted)]">{description}</div>}

          {/* Syntax-highlighted code target */}
          <div className="nb-card p-4 sm:p-5 code-editor-block overflow-x-auto" data-testid="code-target">
            {renderSyntaxTarget()}
          </div>

          {/* Typing input */}
          <textarea
            data-testid="code-typing-input"
            ref={inputRef}
            value={typed}
            onChange={handleInput}
            spellCheck="false"
            autoCorrect="off"
            autoCapitalize="off"
            className="nb-input font-mono w-full min-h-[140px] resize-none code-input-area"
            placeholder="Type here..."
          />

          {/* Completion card */}
          {endAt && (
            <div className="nb-card p-6 bg-[#A8E6CF]" data-testid="code-result">
              <div className="label-cap">Done!</div>
              <div className="font-display font-black text-4xl mt-1">{currentWpm} WPM · {currentAcc}%</div>
              <div className="text-sm mt-1">Finished in {seconds}s</div>

              {/* Explanation — the learning part */}
              {explanation && (
                <div className="mt-4 nb-card p-4 bg-white border-[3px] border-[var(--ink)]">
                  <div className="flex items-center gap-2 label-cap text-[#6B5CE7] mb-2">
                    <Lightbulb size={14} strokeWidth={3}/> What you just typed
                  </div>
                  <p className="text-sm leading-relaxed">{explanation}</p>
                </div>
              )}

              <div className="mt-4 flex gap-3 flex-wrap">
                <button data-testid="code-again-btn" onClick={fetchSnippet} className="nb-btn">
                  <Play size={16} strokeWidth={3}/> Another snippet
                </button>
                <button data-testid="code-retry-btn" onClick={reset} className="nb-btn nb-btn-ghost">
                  <RotateCcw size={16} strokeWidth={3}/> Retry this one
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {!snippet && !loading && (
        <div className="nb-card p-6 bg-[#FFF7DC]">
          <div className="font-bold">Click <b>New snippet</b> to begin.</div>
          <div className="text-sm text-[var(--muted)] mt-1">Pick a language, difficulty, and optional topic. Type the snippet as fast as you can — mistakes glow pink. After completing, you'll see an explanation of what the code does.</div>
        </div>
      )}
    </div>
  );
}
