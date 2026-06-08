import { useEffect, useMemo, useRef, useState } from "react";
import { generateCode, submitLeaderboard } from "../lib/api";
import { recordCodeSession } from "../lib/storage";
import { useAuth } from "../context/AuthContext";
import { sfx } from "../lib/sound";
import { Code2, Play, RotateCcw, Loader2, Timer, Target } from "lucide-react";

const LANGS = ["python", "javascript", "typescript", "java", "go", "rust", "css", "html"];
const DIFFS = ["easy", "medium", "hard"];

export default function SpeedCode() {
  const { user } = useAuth();
  const [language, setLanguage] = useState("python");
  const [difficulty, setDifficulty] = useState("easy");
  const [snippet, setSnippet] = useState(null);
  const [description, setDescription] = useState("");
  const [typed, setTyped] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [startAt, setStartAt] = useState(null);
  const [endAt, setEndAt] = useState(null);
  const [now, setNow] = useState(Date.now());
  const inputRef = useRef(null);

  useEffect(() => {
    if (!startAt || endAt) return undefined;
    const i = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(i);
  }, [startAt, endAt]);

  const fetchSnippet = async () => {
    setError(""); setLoading(true); setSnippet(null); setTyped(""); setStartAt(null); setEndAt(null);
    try {
      const data = await generateCode({ language, difficulty });
      setSnippet(data.snippet);
      setDescription(data.description || "");
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
      const minutes = Math.max(0.01, (finishedAt - (startAt || finishedAt)) / 60000);
      const wpm = Math.round((v.length / 5) / minutes);
      const acc = computeAccuracy(v, snippet);
      recordCodeSession({ wpm, accuracy: acc, language });
      if (user) submitLeaderboard("code", wpm, { language, accuracy: acc }).catch(() => {});
    } else if (snippet) {
      // play soft tick on each correct character milestone
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

  const renderTokens = () => {
    if (!snippet) return null;
    return (
      <pre className="font-mono text-base sm:text-lg leading-7 whitespace-pre-wrap break-words">
        {snippet.split("").map((ch, i) => {
          let cls = "text-[#888]";
          if (i < typed.length) cls = typed[i] === ch ? "text-[#121212] bg-[#A8E6CF]" : "text-white bg-[#FF6FA3]";
          else if (i === typed.length) cls = "text-[#121212] bg-[#FFD3B6] animate-pulse";
          return <span key={i} className={cls}>{ch === "\n" ? "\n" : ch}</span>;
        })}
      </pre>
    );
  };

  const reset = () => {
    setTyped(""); setStartAt(null); setEndAt(null); setNow(Date.now());
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <div data-testid="code-page" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-10 py-10">
      <div className="mb-6">
        <span className="nb-badge bg-[#C9B6FF]"><Code2 size={12} strokeWidth={3}/> Speed Code</span>
        <h1 className="font-display font-black text-3xl sm:text-4xl mt-2">Type code at the speed of thought</h1>
        <p className="text-[#3a3a3a]">A snippet appears. Retype it as fast as you can. Mistakes are highlighted live.</p>
      </div>

      <div className="nb-card p-5 bg-white mb-5">
        <div className="grid sm:grid-cols-3 gap-4">
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
          <div className="flex flex-wrap items-center gap-3">
            <span className="nb-badge bg-white"><Timer size={12} strokeWidth={3}/> {seconds}s</span>
            <span className="nb-badge bg-[#A8E6CF]">{currentWpm} WPM</span>
            <span className="nb-badge bg-[#FFD3B6]"><Target size={12} strokeWidth={3}/> {currentAcc}%</span>
            <span className="nb-badge bg-[#FFF7DC]">{typed.length}/{snippet.length}</span>
            <button data-testid="code-reset-btn" onClick={reset} className="nb-badge bg-[#FFB8D1] ml-auto">
              <RotateCcw size={12} strokeWidth={3}/> Reset
            </button>
          </div>
          {description && <div className="text-sm text-[#555]">{description}</div>}
          <div className="nb-card p-5 bg-[#FDFDFB] overflow-x-auto" data-testid="code-target">
            {renderTokens()}
          </div>
          <textarea
            data-testid="code-typing-input"
            ref={inputRef}
            value={typed}
            onChange={handleInput}
            spellCheck="false"
            autoCorrect="off"
            autoCapitalize="off"
            className="nb-input font-mono w-full min-h-[140px] resize-none"
            placeholder="Type here..."
          />
          {endAt && (
            <div className="nb-card p-6 bg-[#A8E6CF]" data-testid="code-result">
              <div className="label-cap">Done!</div>
              <div className="font-display font-black text-4xl mt-1">{currentWpm} WPM · {currentAcc}%</div>
              <div className="text-sm mt-1">Finished in {seconds}s</div>
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
          <div className="text-sm text-[#555]">Tip: keep eyes on the highlighted target text. Wrong characters glow pink.</div>
        </div>
      )}
    </div>
  );
}
