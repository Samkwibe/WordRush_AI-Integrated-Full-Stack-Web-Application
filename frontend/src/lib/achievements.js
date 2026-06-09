// Achievements logic — evaluated against a stats object.
export const ACHIEVEMENTS = [
  { id: "first_blood", name: "First Steps", desc: "Complete any game session", icon: "🚀" },
  { id: "flash_perfect", name: "Total Recall", desc: "Score 100% in Flash mode", icon: "🧠" },
  { id: "flash_10", name: "Flash 10", desc: "Play 10 Flash sessions", icon: "⚡" },
  { id: "speed_400wpm", name: "Speed Demon", desc: "Read at 400 WPM or more", icon: "🏎️" },
  { id: "speed_quiz_full", name: "Eagle Eyes", desc: "Answer all comprehension questions correctly", icon: "🦅" },
  { id: "match_fast", name: "Sharp Pair", desc: "Finish Memory Match in under 30s", icon: "🎯" },
  { id: "code_clean", name: "Clean Coder", desc: "Type a code snippet with 95%+ accuracy", icon: "💻" },
  { id: "code_10", name: "Code Monkey", desc: "Complete 10 code typing sessions", icon: "🐒" },
  { id: "challenge_ace", name: "Bug Hunter", desc: "Score 100% on a code challenge", icon: "🐛" },
  { id: "lesson_5", name: "Student", desc: "Complete 5 coding lessons", icon: "🎓" },
  { id: "streak_3", name: "On a Roll", desc: "3-day play streak", icon: "🔥" },
  { id: "streak_7", name: "Week Strong", desc: "7-day play streak", icon: "🌟" },
  { id: "polyglot", name: "Polyglot", desc: "Play in 3 different languages", icon: "🌍" },
];

export function evaluateAchievements(stats, ctx = {}) {
  const earned = new Set(stats.achievements || []);
  const add = (id) => earned.add(id);

  if (stats.totalSessions > 0) add("first_blood");
  if (stats.flash.best >= 100) add("flash_perfect");
  if (stats.flash.played >= 10) add("flash_10");
  if (stats.speed.bestWpm >= 400) add("speed_400wpm");
  if (ctx.speedAllCorrect) add("speed_quiz_full");
  if ((stats.match.bestTime ?? 1e9) <= 30) add("match_fast");
  if ((stats.code?.bestAccuracy ?? 0) >= 95) add("code_clean");
  if ((stats.code?.played ?? 0) >= 10) add("code_10");
  if (ctx.challengePerfect) add("challenge_ace");
  if ((stats.code?.lessonsCompleted ?? 0) >= 5) add("lesson_5");
  if ((stats.streak?.current ?? 0) >= 3) add("streak_3");
  if ((stats.streak?.current ?? 0) >= 7) add("streak_7");
  if (new Set((stats.history || []).map((h) => h.language).filter(Boolean)).size >= 3) {
    add("polyglot");
  }
  return Array.from(earned);
}

export function bumpStreak(stats) {
  const today = new Date().toISOString().slice(0, 10);
  const last = stats.streak?.last_day;
  if (last === today) return stats;
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const cur = last === yesterday ? (stats.streak?.current || 0) + 1 : 1;
  const longest = Math.max(stats.streak?.longest || 0, cur);
  return { ...stats, streak: { current: cur, longest, last_day: today } };
}
