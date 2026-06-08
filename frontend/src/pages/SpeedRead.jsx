import { useEffect, useRef, useState } from "react";
import { LANGUAGES } from "../lib/wordLists";
import { generatePassage, submitLeaderboard } from "../lib/api";
import { recordSpeedSession, getSettings, saveSettings } from "../lib/storage";
import { useAuth } from "../context/AuthContext";
import { BookOpen, Play, Loader2, Check, X, RotateCcw, Timer, ChevronRight } from "lucide-react";

const PHASES = { setup: "setup", reading: "reading", quiz: "quiz", result: "result" };

export default function SpeedRead() {
  const { user } = useAuth();
  const [phase, setPhase] = useState(PHASES.setup);
  const [topic, setTopic] = useState("the science of memory");
  const [difficulty, setDifficulty] = useState("medium");
  const [length, setLength] = useState("short");
  const [language, setLanguage] = useState(getSettings().language);
  const [wpm, setWpm] = useState(getSettings().wpm);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [tokens, setTokens] = useState([]);
  const [tokenIndex, setTokenIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [readingDoneAt, setReadingDoneAt] = useState(null);
  const [error, setError] = useState("");
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  useEffect(() => {
    if (phase !== PHASES.reading || !tokens.length) return;
    const intervalMs = Math.max(60, Math.round(60000 / wpm));
    timerRef.current = setTimeout(() => {
      setTokenIndex((i) => {
        const next = i + 1;
        if (next >= tokens.length) {
          setPhase(PHASES.quiz);
          setReadingDoneAt(Date.now());
          return i;
        }
        return next;
      });
    }, intervalMs);
    return () => clearTimeout(timerRef.current);
  }, [phase, tokenIndex, tokens, wpm]);

  const start = async () => {
    if (!topic.trim()) return;
    setError("");
    setLoading(true);
    try {
      const res = await generatePassage({ topic: topic.trim(), difficulty, language, length });
      setData(res);
      const t = res.passage.split(/\s+/).filter(Boolean);
      setTokens(t);
      setTokenIndex(0);
      setAnswers(Array(res.questions.length).fill(null));
      setPhase(PHASES.reading);
      saveSettings({ wpm, language });
    } catch (e) {
      setError(e?.response?.data?.detail || "Couldn't generate passage. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const submitQuiz = () => {
    if (!data) return;
    const correct = data.questions.reduce((acc, q, i) => acc + (answers[i] === q.answer_index ? 1 : 0), 0);
    recordSpeedSession({ correct, total: data.questions.length, wpm, language });
    if (user) submitLeaderboard("speed", wpm, { topic, language, correct }).catch(() => {});
    setPhase(PHASES.result);
  };

  const reset = () => {
    setPhase(PHASES.setup);
    setData(null);
    setTokens([]);
    setTokenIndex(0);
    setAnswers([]);
  };

  return (
    <div data-testid="speed-page" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-10 py-10">
      <div className="mb-6">
        <span className="nb-badge bg-[#A8E6CF]"><BookOpen size={12} strokeWidth={3}/> Speed Reading</span>
        <h1 className="font-display font-black text-3xl sm:text-4xl mt-2">Sprint through passages</h1>
        <p className="text-[#3a3a3a]">AI writes a passage on your topic, you read it at your pace, then answer 3 questions.</p>
      </div>

      {phase === PHASES.setup && (
        <div className="space-y-6">
          <div className="nb-card p-6 space-y-4 bg-white">
            <div>
              <div className="label-cap mb-2">Topic</div>
              <input
                data-testid="speed-topic-input"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. how bees navigate"
                className="nb-input"
              />
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <div className="label-cap mb-2">Difficulty</div>
                <div className="flex flex-wrap gap-2">
                  {["easy", "medium", "hard"].map((d) => (
                    <button key={d} data-testid={`speed-diff-${d}`} onClick={() => setDifficulty(d)}
                      className={`nb-badge ${difficulty === d ? "bg-[#121212] text-white" : "bg-white"}`}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="label-cap mb-2">Length</div>
                <div className="flex flex-wrap gap-2">
                  {["short", "medium", "long"].map((d) => (
                    <button key={d} data-testid={`speed-len-${d}`} onClick={() => setLength(d)}
                      className={`nb-badge ${length === d ? "bg-[#121212] text-white" : "bg-white"}`}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="label-cap mb-2">Language</div>
                <select data-testid="speed-language" value={language} onChange={(e) => setLanguage(e.target.value)} className="nb-input">
                  {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <div className="label-cap mb-2">Reading speed (WPM)</div>
              <div className="flex items-center gap-4 flex-wrap">
                <input
                  data-testid="speed-wpm-slider"
                  type="range" min="150" max="700" step="10"
                  value={wpm}
                  onChange={(e) => setWpm(+e.target.value)}
                  className="w-full sm:w-72 accent-[#121212]"
                />
                <div className="font-display font-black text-2xl">{wpm}<span className="text-base ml-1 font-bold">wpm</span></div>
              </div>
            </div>
          </div>
          {error && <div className="nb-card p-4 bg-[#FFB8D1] font-bold" data-testid="speed-error">{error}</div>}
          <button data-testid="speed-start-btn" disabled={loading} onClick={start} className="nb-btn">
            {loading ? <><Loader2 className="animate-spin" size={16}/> Generating...</> : <><Play size={16} strokeWidth={3}/> Start reading</>}
          </button>
        </div>
      )}

      {phase === PHASES.reading && tokens.length > 0 && (
        <div className="nb-card p-10 sm:p-16 bg-[#A8E6CF] min-h-[55vh] flex flex-col items-center justify-center relative">
          <div className="absolute top-4 left-4 nb-badge bg-white">
            <Timer size={12} strokeWidth={3}/> {tokenIndex + 1} / {tokens.length}
          </div>
          <button data-testid="speed-skip-btn" onClick={() => setPhase(PHASES.quiz)} className="absolute top-4 right-4 nb-badge bg-white">Skip to quiz</button>
          <div data-testid="speed-current-word" key={tokenIndex} className="flash-word font-display font-black text-5xl sm:text-7xl text-center break-words">
            {tokens[Math.min(tokenIndex, tokens.length - 1)]}
          </div>
          <div className="mt-8 w-full max-w-md h-3 nb-border bg-white rounded-full overflow-hidden">
            <div className="h-full bg-[#121212]" style={{ width: `${(tokenIndex / tokens.length) * 100}%` }} />
          </div>
        </div>
      )}

      {phase === PHASES.quiz && data && (
        <div className="space-y-5">
          <div className="nb-card p-5 bg-white">
            <div className="label-cap mb-2">The passage</div>
            <p className="leading-relaxed text-[#1f1f1f]">{data.passage}</p>
          </div>
          {data.questions.map((q, i) => (
            <div key={i} className="nb-card p-5" data-testid={`speed-question-${i}`}>
              <div className="font-display font-bold text-lg">{i + 1}. {q.question}</div>
              <div className="mt-3 grid sm:grid-cols-2 gap-2">
                {q.options.map((opt, oi) => (
                  <button
                    key={oi}
                    data-testid={`speed-q${i}-opt${oi}`}
                    onClick={() => setAnswers((a) => a.map((v, j) => j === i ? oi : v))}
                    className={`text-left p-3 rounded-lg border-[3px] border-[#121212] font-bold ${
                      answers[i] === oi ? "bg-[#FFB8D1] shadow-[3px_3px_0_0_#121212]" : "bg-white"
                    }`}
                  >
                    {String.fromCharCode(65 + oi)}. {opt}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <button data-testid="speed-submit-btn" disabled={answers.some((a) => a === null)} onClick={submitQuiz} className="nb-btn">
            Submit answers <ChevronRight size={16} strokeWidth={3}/>
          </button>
        </div>
      )}

      {phase === PHASES.result && data && (
        <div className="space-y-5">
          <div className="nb-card p-6 bg-[#A8E6CF]" data-testid="speed-result">
            <div className="label-cap">Result</div>
            <div className="font-display font-black text-5xl mt-2">
              {data.questions.reduce((acc, q, i) => acc + (answers[i] === q.answer_index ? 1 : 0), 0)} / {data.questions.length}
            </div>
            <div className="font-bold mt-1">Read at {wpm} WPM</div>
          </div>
          {data.questions.map((q, i) => {
            const ok = answers[i] === q.answer_index;
            return (
              <div key={i} className={`nb-card p-5 ${ok ? "bg-white" : "bg-[#FFE4EC]"}`}>
                <div className="flex items-start gap-3">
                  {ok ? <Check size={20} className="text-green-700" strokeWidth={3}/> : <X size={20} className="text-rose-700" strokeWidth={3}/>}
                  <div>
                    <div className="font-display font-bold">{q.question}</div>
                    <div className="text-sm mt-1">You: <span className="font-bold">{q.options[answers[i]] ?? "—"}</span></div>
                    {!ok && <div className="text-sm">Answer: <span className="font-bold">{q.options[q.answer_index]}</span></div>}
                  </div>
                </div>
              </div>
            );
          })}
          <div className="flex gap-3">
            <button data-testid="speed-again-btn" onClick={reset} className="nb-btn">
              <RotateCcw size={16} strokeWidth={3}/> Try another passage
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
