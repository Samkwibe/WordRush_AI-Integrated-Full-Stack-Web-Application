import { useEffect, useRef, useState } from "react";
import ListPicker from "../components/ListPicker";
import { recordFlashSession, getSettings, saveSettings } from "../lib/storage";
import { submitLeaderboard } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import ShareScoreCard from "../components/ShareScoreCard";
import { sfx } from "../lib/sound";
import { Play, Pause, RotateCcw, Check, X, Zap, ChevronRight, Share2 } from "lucide-react";

const PHASES = { setup: "setup", flashing: "flashing", recall: "recall", result: "result" };

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function FlashMode() {
  const { user } = useAuth();
  const [phase, setPhase] = useState(PHASES.setup);
  const [language, setLanguage] = useState(getSettings().language);
  const [list, setList] = useState(null);
  const [speed, setSpeed] = useState(getSettings().flashSpeedMs);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [recallInput, setRecallInput] = useState("");
  const [recalled, setRecalled] = useState([]);
  const [result, setResult] = useState(null);
  const [shareOpen, setShareOpen] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  useEffect(() => {
    if (phase !== PHASES.flashing || paused || !list) return;
    timerRef.current = setTimeout(() => {
      setIndex((i) => {
        const next = i + 1;
        if (next >= list.words.length) {
          setPhase(PHASES.recall);
          return i;
        }
        return next;
      });
    }, speed);
    return () => clearTimeout(timerRef.current);
  }, [phase, paused, index, list, speed]);

  const start = () => {
    if (!list) return;
    setIndex(0);
    setRecalled([]);
    setRecallInput("");
    setResult(null);
    setPhase(PHASES.flashing);
    saveSettings({ flashSpeedMs: speed, language });
  };

  const addRecall = () => {
    const w = recallInput.trim().toLowerCase();
    if (!w) return;
    if (!recalled.includes(w)) setRecalled((r) => [...r, w]);
    setRecallInput("");
  };

  const finishRecall = () => {
    const target = list.words.map((w) => w.word.toLowerCase());
    const correctSet = new Set(target);
    const correct = recalled.filter((r) => correctSet.has(r));
    const missed = target.filter((t) => !recalled.includes(t));
    const wrong = recalled.filter((r) => !correctSet.has(r));
    const res = { correct, missed, wrong, total: target.length };
    setResult(res);
    recordFlashSession({ correct: correct.length, total: target.length, language });
    sfx.win();
    if (user) {
      const score = Math.round((correct.length / Math.max(1, target.length)) * 100);
      submitLeaderboard("flash", score, { list: list.name, language }).catch(() => {});
    }
    setPhase(PHASES.result);
  };

  const reset = () => {
    setPhase(PHASES.setup);
    setIndex(0);
    setRecalled([]);
    setResult(null);
    clearTimeout(timerRef.current);
  };

  return (
    <div data-testid="flash-page" className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-10 py-10">
      <div className="mb-6 flex items-end justify-between flex-wrap gap-3">
        <div>
          <span className="nb-badge bg-[#FFB8D1]"><Zap size={12} strokeWidth={3}/> Flash Mode</span>
          <h1 className="font-display font-black text-3xl sm:text-4xl mt-2">Memorize on the fly</h1>
          <p className="text-[#3a3a3a]">Watch each word once, then list every word you remember.</p>
        </div>
      </div>

      {phase === PHASES.setup && (
        <div className="space-y-8">
          <ListPicker
            value={list}
            onChange={setList}
            language={language}
            onLanguageChange={setLanguage}
            testIdPrefix="flash"
          />
          <div className="nb-card p-5 bg-[#FFF7DC]">
            <div className="label-cap">Speed per word</div>
            <div className="mt-3 flex items-center gap-4 flex-wrap">
              <input
                data-testid="flash-speed-slider"
                type="range" min="300" max="1500" step="50"
                value={speed}
                onChange={(e) => setSpeed(+e.target.value)}
                className="w-full sm:w-80 accent-[#121212]"
              />
              <div className="font-display font-black text-2xl">{speed}<span className="text-base ml-1 font-bold">ms</span></div>
              <div className="flex gap-2 ml-auto">
                {[400, 600, 900].map((s) => (
                  <button key={s} data-testid={`flash-preset-${s}`} onClick={() => setSpeed(s)} className="nb-badge bg-white">{s}ms</button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              data-testid="flash-start-btn"
              disabled={!list}
              onClick={start}
              className="nb-btn"
            >
              <Play size={18} strokeWidth={3} /> Start Flashing
            </button>
            {list && (
              <div className="nb-badge bg-[#A8E6CF]">{list.words.length} words · {list.name}</div>
            )}
          </div>
        </div>
      )}

      {phase === PHASES.flashing && list && (
        <div data-testid="flash-stage" className="nb-card p-10 sm:p-16 bg-[#FFB8D1] min-h-[60vh] flex flex-col items-center justify-center relative">
          <div className="absolute top-4 left-4 nb-badge bg-white">{Math.min(index + 1, list.words.length)} / {list.words.length}</div>
          <div className="absolute top-4 right-4 flex gap-2">
            <button data-testid="flash-pause-btn" onClick={() => setPaused((p) => !p)} className="nb-badge bg-white">
              {paused ? <Play size={14} strokeWidth={3}/> : <Pause size={14} strokeWidth={3}/>}
              {paused ? "Resume" : "Pause"}
            </button>
            <button data-testid="flash-stop-btn" onClick={() => setPhase(PHASES.recall)} className="nb-badge bg-white">Stop</button>
          </div>
          <div
            key={index}
            data-testid="flash-current-word"
            className="flash-word font-display font-black text-5xl sm:text-7xl lg:text-8xl text-center break-words"
          >
            {list.words[Math.min(index, list.words.length - 1)].word}
          </div>
        </div>
      )}

      {phase === PHASES.recall && list && (
        <div className="space-y-5">
          <div className="nb-card p-6 bg-white">
            <div className="label-cap">Recall</div>
            <h2 className="font-display font-black text-2xl mt-1">Type every word you remember</h2>
            <p className="text-[#3a3a3a] text-sm">Press Enter after each word. Order doesn&apos;t matter.</p>
            <div className="mt-4 flex gap-2 flex-wrap">
              <input
                data-testid="flash-recall-input"
                autoFocus
                value={recallInput}
                onChange={(e) => setRecallInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addRecall()}
                placeholder="Type a word..."
                className="nb-input flex-1 min-w-[200px]"
              />
              <button data-testid="flash-add-recall" onClick={addRecall} className="nb-btn nb-btn-secondary">
                Add <ChevronRight size={16} strokeWidth={3} />
              </button>
              <button data-testid="flash-submit-recall" onClick={finishRecall} className="nb-btn">
                Done <Check size={16} strokeWidth={3} />
              </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 min-h-[2.5rem]">
              {recalled.map((r) => (
                <span key={r} data-testid={`flash-recalled-${r}`} className="nb-badge bg-[#FFD3B6]">{r}</span>
              ))}
              {recalled.length === 0 && <span className="text-sm text-[#777]">Your typed words will appear here…</span>}
            </div>
          </div>
        </div>
      )}

      {phase === PHASES.result && result && list && (
        <div className="space-y-5">
          <div className="nb-card p-8 bg-[#A8E6CF]" data-testid="flash-result">
            <div className="label-cap">Result</div>
            <div className="font-display font-black text-5xl mt-2">
              {result.correct.length} / {result.total}
            </div>
            <div className="font-bold mt-1">{Math.round((result.correct.length / result.total) * 100)}% recalled</div>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="nb-card p-5">
              <div className="label-cap mb-2 text-green-700">Correct</div>
              <div className="flex flex-wrap gap-2">
                {result.correct.length === 0 ? <span className="text-sm">None</span> : result.correct.map((w) => (
                  <span key={w} className="nb-badge bg-[#A8E6CF]"><Check size={12} strokeWidth={3}/>{w}</span>
                ))}
              </div>
            </div>
            <div className="nb-card p-5">
              <div className="label-cap mb-2 text-amber-700">Missed</div>
              <div className="flex flex-wrap gap-2">
                {result.missed.length === 0 ? <span className="text-sm">None</span> : result.missed.map((w) => (
                  <span key={w} className="nb-badge bg-[#FFD3B6]">{w}</span>
                ))}
              </div>
            </div>
            <div className="nb-card p-5">
              <div className="label-cap mb-2 text-rose-700">Wrong</div>
              <div className="flex flex-wrap gap-2">
                {result.wrong.length === 0 ? <span className="text-sm">None</span> : result.wrong.map((w) => (
                  <span key={w} className="nb-badge bg-[#FFB8D1]"><X size={12} strokeWidth={3}/>{w}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button data-testid="flash-play-again" onClick={start} className="nb-btn">
              <Play size={16} strokeWidth={3} /> Play again
            </button>
            <button data-testid="flash-reset" onClick={reset} className="nb-btn nb-btn-ghost">
              <RotateCcw size={16} strokeWidth={3} /> Change list
            </button>
            <button data-testid="flash-share" onClick={() => setShareOpen(true)} className="nb-btn nb-btn-secondary">
              <Share2 size={16} strokeWidth={3} /> Share
            </button>
          </div>
          <ShareScoreCard
            open={shareOpen}
            onClose={() => setShareOpen(false)}
            title={`Flash · ${list.name}`}
            primary={`${result.correct.length} / ${result.total}`}
            secondary={`${Math.round((result.correct.length / result.total) * 100)}% recalled · ${language}`}
            accentColor="#FFB8D1"
          />
        </div>
      )}
    </div>
  );
}
