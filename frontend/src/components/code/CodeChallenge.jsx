import { useState, useMemo } from "react";
import { generateChallenge } from "../../lib/api";
import { recordChallengeSession } from "../../lib/storage";
import { useAuth } from "../../context/AuthContext";
import { sfx } from "../../lib/sound";
import { tokenize, TOKEN_COLORS } from "../../lib/syntax";
import { Play, Loader2, CheckCircle2, XCircle, ChevronRight, Trophy, RotateCcw } from "lucide-react";

const LANGS = ["python", "javascript", "typescript", "java", "go", "rust"];
const DIFFS = ["easy", "medium", "hard"];

export default function CodeChallenge() {
  const { user } = useAuth();
  const [language, setLanguage] = useState("python");
  const [difficulty, setDifficulty] = useState("easy");
  const [challenge, setChallenge] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentQ, setCurrentQ] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [answers, setAnswers] = useState([]); // array of { selected, correct }

  const fetchChallenge = async () => {
    setError(""); setLoading(true); setChallenge(null);
    setCurrentQ(0); setSelectedAnswer(null); setShowExplanation(false); setAnswers([]);
    try {
      const data = await generateChallenge({ language, difficulty });
      setChallenge(data);
    } catch (e) {
      setError(e?.response?.data?.detail || "Could not generate challenge.");
    } finally {
      setLoading(false);
    }
  };

  const question = challenge?.questions?.[currentQ];
  const isFinished = challenge && answers.length === (challenge.questions?.length || 0);
  const correctCount = answers.filter((a) => a.correct).length;
  const totalQuestions = challenge?.questions?.length || 0;

  const selectAnswer = (idx) => {
    if (selectedAnswer !== null) return; // already answered
    setSelectedAnswer(idx);
    setShowExplanation(true);
    const correct = idx === question.answer_index;
    if (correct) sfx.match(); else sfx.miss();
  };

  const nextQuestion = () => {
    const correct = selectedAnswer === question.answer_index;
    const newAnswers = [...answers, { selected: selectedAnswer, correct }];
    setAnswers(newAnswers);
    setSelectedAnswer(null);
    setShowExplanation(false);

    if (currentQ + 1 >= totalQuestions) {
      // Finished all questions
      const finalCorrect = newAnswers.filter((a) => a.correct).length;
      sfx.win();
      recordChallengeSession({ correct: finalCorrect, total: totalQuestions, language });
    } else {
      setCurrentQ(currentQ + 1);
    }
  };

  // Syntax tokens for the code display
  const syntaxTokens = useMemo(() => {
    if (!challenge?.snippet) return [];
    return tokenize(challenge.snippet, language);
  }, [challenge, language]);

  const renderCodeBlock = () => {
    if (!challenge?.snippet) return null;
    const charSyn = [];
    for (const token of syntaxTokens) {
      for (let i = 0; i < token.text.length; i++) {
        charSyn.push(token.type);
      }
    }
    const lines = challenge.snippet.split("\n");
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

  const optionColors = (idx) => {
    if (selectedAnswer === null) return "bg-white hover:bg-[#f0f0f0] hover:translate-y-[-1px]";
    if (idx === question.answer_index) return "bg-[#A8E6CF] ring-2 ring-[var(--ink)]";
    if (idx === selectedAnswer) return "bg-[#FFB8D1] ring-2 ring-[var(--ink)]";
    return "bg-white opacity-50";
  };

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="nb-card p-5 bg-white">
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <div className="label-cap mb-2">Language</div>
            <select data-testid="challenge-language" value={language} onChange={(e) => setLanguage(e.target.value)} className="nb-input">
              {LANGS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <div className="label-cap mb-2">Difficulty</div>
            <select data-testid="challenge-difficulty" value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="nb-input">
              {DIFFS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button data-testid="challenge-generate-btn" onClick={fetchChallenge} disabled={loading} className="nb-btn w-full justify-center">
              {loading ? <><Loader2 className="animate-spin" size={16}/> Generating…</> : <><Play size={16} strokeWidth={3}/> New challenge</>}
            </button>
          </div>
        </div>
        {error && <div className="mt-3 nb-badge bg-[#FFB8D1]" data-testid="challenge-error">{error}</div>}
      </div>

      {challenge && !isFinished && (
        <div className="space-y-4">
          {/* Progress */}
          <div className="flex items-center gap-3">
            <span className="label-cap">Question {currentQ + 1} / {totalQuestions}</span>
            <div className="flex-1 h-2 rounded-full bg-[var(--soft)] border-2 border-[var(--ink)] overflow-hidden">
              <div
                className="h-full bg-[#C9B6FF] transition-all duration-300"
                style={{ width: `${((currentQ) / totalQuestions) * 100}%` }}
              />
            </div>
          </div>

          {/* Code snippet */}
          {challenge.description && <div className="text-sm text-[var(--muted)]">{challenge.description}</div>}
          <div className="nb-card p-4 sm:p-5 code-editor-block overflow-x-auto" data-testid="challenge-code">
            {renderCodeBlock()}
          </div>

          {/* Question */}
          <div className="nb-card p-5 bg-white">
            <p className="font-display font-bold text-lg mb-4">{question?.question}</p>
            <div className="grid gap-3">
              {question?.options?.map((opt, idx) => (
                <button
                  key={idx}
                  data-testid={`challenge-option-${idx}`}
                  onClick={() => selectAnswer(idx)}
                  disabled={selectedAnswer !== null}
                  className={`text-left px-4 py-3 rounded-xl border-[3px] border-[var(--ink)] font-semibold text-sm transition-all duration-200 shadow-[3px_3px_0_0_var(--ink)] ${optionColors(idx)}`}
                >
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-[var(--soft)] border-2 border-[var(--ink)] font-black text-xs mr-3">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  {opt}
                  {selectedAnswer !== null && idx === question.answer_index && (
                    <CheckCircle2 size={18} className="inline ml-2 text-green-700" strokeWidth={3}/>
                  )}
                  {selectedAnswer === idx && idx !== question.answer_index && (
                    <XCircle size={18} className="inline ml-2 text-red-700" strokeWidth={3}/>
                  )}
                </button>
              ))}
            </div>

            {/* Explanation */}
            {showExplanation && question?.explanation && (
              <div className="mt-4 nb-card p-4 bg-[#FFF7DC] border-[3px] border-[var(--ink)]">
                <div className="label-cap text-[#6B5CE7] mb-1">
                  {selectedAnswer === question.answer_index ? "✓ Correct!" : "✗ Not quite"}
                </div>
                <p className="text-sm leading-relaxed">{question.explanation}</p>
              </div>
            )}

            {/* Next button */}
            {showExplanation && (
              <button onClick={nextQuestion} className="nb-btn mt-4">
                {currentQ + 1 >= totalQuestions ? (
                  <><Trophy size={16} strokeWidth={3}/> See results</>
                ) : (
                  <><ChevronRight size={16} strokeWidth={3}/> Next question</>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Results */}
      {isFinished && (
        <div className="nb-card p-6" style={{ background: correctCount === totalQuestions ? "#A8E6CF" : correctCount >= totalQuestions / 2 ? "#FFF7DC" : "#FFB8D1" }}>
          <div className="label-cap">{correctCount === totalQuestions ? "Perfect score!" : correctCount >= totalQuestions / 2 ? "Good effort!" : "Keep practicing!"}</div>
          <div className="font-display font-black text-4xl mt-1">{correctCount} / {totalQuestions}</div>
          <div className="text-sm mt-1">
            {correctCount === totalQuestions
              ? "You nailed every question! 🎯"
              : `You got ${correctCount} out of ${totalQuestions} correct.`}
          </div>
          <div className="mt-4 flex gap-3 flex-wrap">
            <button onClick={fetchChallenge} className="nb-btn">
              <Play size={16} strokeWidth={3}/> New challenge
            </button>
            <button onClick={() => { setAnswers([]); setCurrentQ(0); setSelectedAnswer(null); setShowExplanation(false); }} className="nb-btn nb-btn-ghost">
              <RotateCcw size={16} strokeWidth={3}/> Retry this one
            </button>
          </div>
        </div>
      )}

      {!challenge && !loading && (
        <div className="nb-card p-6 bg-[#FFF7DC]">
          <div className="font-bold">Click <b>New challenge</b> to begin.</div>
          <div className="text-sm text-[var(--muted)] mt-1">Read a code snippet, then answer questions about what it does. Tests your code reading and comprehension skills — no typing required!</div>
        </div>
      )}
    </div>
  );
}
