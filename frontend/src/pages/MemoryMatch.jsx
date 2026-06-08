import { useEffect, useMemo, useState } from "react";
import ListPicker from "../components/ListPicker";
import { recordMatchSession, getSettings, saveSettings } from "../lib/storage";
import { submitLeaderboard } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { sfx } from "../lib/sound";
import { Layers, Play, RotateCcw, Trophy, Timer } from "lucide-react";

function buildDeck(words, size) {
  const sampled = [...words].sort(() => Math.random() - 0.5).slice(0, size);
  const pairs = sampled.flatMap((w, i) => [
    { id: `w-${i}`, pairId: i, type: "word", text: w.word },
    { id: `d-${i}`, pairId: i, type: "def", text: w.definition },
  ]);
  return pairs.sort(() => Math.random() - 0.5);
}

export default function MemoryMatch() {
  const { user } = useAuth();
  const [language, setLanguage] = useState(getSettings().language);
  const [list, setList] = useState(null);
  const [pairs, setPairs] = useState(6);
  const [deck, setDeck] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState(new Set());
  const [moves, setMoves] = useState(0);
  const [startAt, setStartAt] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [done, setDone] = useState(false);
  const [endTime, setEndTime] = useState(null);

  useEffect(() => {
    if (!startAt || done) return undefined;
    const i = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(i);
  }, [startAt, done]);

  const seconds = startAt
    ? Math.floor(((done && endTime ? endTime : now) - startAt) / 1000)
    : 0;

  const startGame = () => {
    if (!list) return;
    const size = Math.min(pairs, list.words.length);
    setDeck(buildDeck(list.words, size));
    setFlipped([]);
    setMatched(new Set());
    setMoves(0);
    setDone(false);
    setEndTime(null);
    setStartAt(Date.now());
    saveSettings({ language });
  };

  const onCardClick = (idx) => {
    if (done) return;
    if (flipped.includes(idx) || matched.has(deck[idx].id)) return;
    if (flipped.length === 2) return;
    const next = [...flipped, idx];
    setFlipped(next);
    if (next.length === 2) {
      setMoves((m) => m + 1);
      const [a, b] = next.map((i) => deck[i]);
      const isMatch = a.pairId === b.pairId && a.type !== b.type;
      setTimeout(() => {
        if (isMatch) {
          sfx.match();
          setMatched((prev) => {
            const updated = new Set(prev);
            updated.add(a.id); updated.add(b.id);
            const total = deck.length;
            if (updated.size === total) {
              const e = Date.now();
              setEndTime(e);
              setDone(true);
              const elapsed = Math.floor((e - startAt) / 1000);
              recordMatchSession({ moves: moves + 1, seconds: elapsed, language });
              sfx.win();
              if (user) {
                const score = Math.max(0, 1000 - elapsed * 4 - (moves + 1) * 2);
                submitLeaderboard("match", score, { seconds: elapsed, moves: moves + 1, language }).catch(() => {});
              }
            }
            return updated;
          });
        } else {
          sfx.flip();
        }
        setFlipped([]);
      }, isMatch ? 250 : 700);
    }
  };

  const totalPairs = deck.length / 2;
  const matchedPairs = matched.size / 2;
  const gridCols = useMemo(() => {
    const n = deck.length;
    if (n <= 8) return "grid-cols-2 sm:grid-cols-4";
    if (n <= 12) return "grid-cols-3 sm:grid-cols-4";
    if (n <= 16) return "grid-cols-4";
    return "grid-cols-4 sm:grid-cols-5";
  }, [deck.length]);

  return (
    <div data-testid="match-page" className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-10 py-10">
      <div className="mb-6">
        <span className="nb-badge bg-[#FFD3B6]"><Layers size={12} strokeWidth={3}/> Memory Match</span>
        <h1 className="font-display font-black text-3xl sm:text-4xl mt-2">Pair words with meanings</h1>
        <p className="text-[#3a3a3a]">Flip two cards. Match a word to its definition. Fewer moves = better.</p>
      </div>

      {deck.length === 0 && (
        <div className="space-y-6">
          <ListPicker value={list} onChange={setList} language={language} onLanguageChange={setLanguage} testIdPrefix="match" />
          <div className="nb-card p-5 bg-[#FFF7DC] flex items-center gap-4 flex-wrap">
            <div className="label-cap">Pairs</div>
            {[4, 6, 8, 10].map((p) => (
              <button key={p} data-testid={`match-pairs-${p}`} onClick={() => setPairs(p)}
                className={`nb-badge ${pairs === p ? "bg-[#121212] text-white" : "bg-white"}`}>{p}</button>
            ))}
            {list && <div className="ml-auto text-sm">Using <b>{Math.min(pairs, list.words.length)}</b> words from <b>{list.name}</b></div>}
          </div>
          <button data-testid="match-start-btn" disabled={!list} onClick={startGame} className="nb-btn">
            <Play size={16} strokeWidth={3}/> Start match
          </button>
        </div>
      )}

      {deck.length > 0 && (
        <div className="space-y-5">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="nb-badge bg-white"><Timer size={12} strokeWidth={3}/> {seconds}s</div>
            <div className="nb-badge bg-white">Moves: {moves}</div>
            <div className="nb-badge bg-[#A8E6CF]">Matched: {matchedPairs}/{totalPairs}</div>
            <button data-testid="match-reset-btn" onClick={() => { setDeck([]); setStartAt(null); }} className="nb-badge bg-[#FFB8D1] ml-auto">
              <RotateCcw size={12} strokeWidth={3}/> Reset
            </button>
          </div>

          <div className={`grid gap-3 ${gridCols}`} data-testid="match-grid">
            {deck.map((c, idx) => {
              const isFlipped = flipped.includes(idx) || matched.has(c.id);
              const isMatched = matched.has(c.id);
              return (
                <div
                  key={c.id}
                  data-testid={`match-card-${idx}`}
                  onClick={() => onCardClick(idx)}
                  className={`flip-card aspect-[3/4] sm:aspect-square cursor-pointer ${isFlipped ? "flipped" : ""}`}
                >
                  <div className="flip-card-inner h-full">
                    <div className="flip-face" style={{ background: "#C9B6FF" }}>
                      <div className="font-display font-black text-3xl">?</div>
                    </div>
                    <div className="flip-face flip-back" style={{ background: isMatched ? "#A8E6CF" : c.type === "word" ? "#FFB8D1" : "#FFD3B6" }}>
                      <div className={`${c.type === "word" ? "font-display font-black text-xl sm:text-2xl" : "text-xs sm:text-sm font-bold"}`}>
                        {c.text}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {done && (
            <div className="nb-card p-8 bg-[#A8E6CF]" data-testid="match-done">
              <div className="flex items-center gap-3 mb-2">
                <Trophy strokeWidth={3} />
                <div className="label-cap">You did it!</div>
              </div>
              <div className="font-display font-black text-4xl">{seconds}s · {moves} moves</div>
              <div className="mt-4 flex gap-3">
                <button data-testid="match-again-btn" onClick={startGame} className="nb-btn">
                  <Play size={16} strokeWidth={3}/> Play again
                </button>
                <button data-testid="match-change-btn" onClick={() => { setDeck([]); setStartAt(null); }} className="nb-btn nb-btn-ghost">
                  <RotateCcw size={16} strokeWidth={3}/> Change list
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
