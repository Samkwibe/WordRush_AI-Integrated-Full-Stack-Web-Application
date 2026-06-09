// LocalStorage helpers for progress + custom lists with optional cloud sync.
import { bumpStreak, evaluateAchievements } from "./achievements";

const KEYS = {
  custom: "wr_custom_lists",
  stats: "wr_stats",
  settings: "wr_settings",
};

function read(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}
function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

// ---- Custom lists ----
export function getCustomLists() { return read(KEYS.custom, []); }
export function saveCustomList(list) {
  const all = getCustomLists();
  const idx = all.findIndex((l) => l.id === list.id);
  if (idx >= 0) all[idx] = list; else all.push(list);
  write(KEYS.custom, all);
  return all;
}
export function deleteCustomList(id) {
  const all = getCustomLists().filter((l) => l.id !== id);
  write(KEYS.custom, all);
  return all;
}
export function setCustomLists(lists) { write(KEYS.custom, lists); return lists; }

// ---- Settings ----
export function getSettings() {
  return read(KEYS.settings, {
    language: "English",
    wpm: 280,
    flashSpeedMs: 600,
  });
}
export function saveSettings(s) { write(KEYS.settings, { ...getSettings(), ...s }); }

// ---- Stats ----
function emptyStats() {
  return {
    totalSessions: 0,
    flash: { played: 0, correct: 0, total: 0, best: 0 },
    speed: { played: 0, correct: 0, total: 0, bestWpm: 0 },
    match: { played: 0, bestTime: null, totalMoves: 0 },
    code: { played: 0, bestWpm: 0, bestAccuracy: 0, challengesPlayed: 0, challengeScore: 0, lessonsCompleted: 0, topicsCompleted: [] },
    streak: { current: 0, longest: 0, last_day: null },
    history: [],
    achievements: [],
  };
}

export function getStats() {
  const raw = read(KEYS.stats, emptyStats());
  // backfill for older sessions
  return { ...emptyStats(), ...raw, flash: { ...emptyStats().flash, ...(raw.flash || {}) },
    speed: { ...emptyStats().speed, ...(raw.speed || {}) },
    match: { ...emptyStats().match, ...(raw.match || {}) },
    code: { ...emptyStats().code, ...(raw.code || {}) },
    streak: { ...emptyStats().streak, ...(raw.streak || {}) },
  };
}
export function setStats(stats) { write(KEYS.stats, stats); return stats; }

function commit(stats, ctx = {}) {
  const bumped = bumpStreak(stats);
  const achievements = evaluateAchievements(bumped, ctx);
  const out = { ...bumped, achievements };
  write(KEYS.stats, out);
  return out;
}

export function recordFlashSession({ correct, total, language }) {
  const s = getStats();
  s.totalSessions += 1;
  s.flash.played += 1;
  s.flash.correct += correct;
  s.flash.total += total;
  const pct = total ? (correct / total) * 100 : 0;
  if (pct > s.flash.best) s.flash.best = Math.round(pct);
  s.history.unshift({ mode: "flash", correct, total, language, at: Date.now() });
  s.history = s.history.slice(0, 30);
  return commit(s);
}

export function recordSpeedSession({ correct, total, wpm, language }) {
  const s = getStats();
  s.totalSessions += 1;
  s.speed.played += 1;
  s.speed.correct += correct;
  s.speed.total += total;
  if (wpm > s.speed.bestWpm) s.speed.bestWpm = wpm;
  s.history.unshift({ mode: "speed", correct, total, wpm, language, at: Date.now() });
  s.history = s.history.slice(0, 30);
  return commit(s, { speedAllCorrect: correct === total && total > 0 });
}

export function recordMatchSession({ moves, seconds, language }) {
  const s = getStats();
  s.totalSessions += 1;
  s.match.played += 1;
  s.match.totalMoves += moves;
  if (s.match.bestTime === null || seconds < s.match.bestTime) s.match.bestTime = seconds;
  s.history.unshift({ mode: "match", moves, seconds, language, at: Date.now() });
  s.history = s.history.slice(0, 30);
  return commit(s);
}

export function recordCodeSession({ wpm, accuracy, language }) {
  const s = getStats();
  s.totalSessions += 1;
  s.code.played += 1;
  if (wpm > s.code.bestWpm) s.code.bestWpm = wpm;
  if (accuracy > s.code.bestAccuracy) s.code.bestAccuracy = accuracy;
  s.history.unshift({ mode: "code", wpm, accuracy, language, at: Date.now() });
  s.history = s.history.slice(0, 30);
  return commit(s);
}

export function recordChallengeSession({ correct, total, language }) {
  const s = getStats();
  s.totalSessions += 1;
  s.code.challengesPlayed = (s.code.challengesPlayed || 0) + 1;
  s.code.challengeScore = (s.code.challengeScore || 0) + correct;
  s.history.unshift({ mode: "challenge", correct, total, language, at: Date.now() });
  s.history = s.history.slice(0, 30);
  return commit(s, { challengePerfect: correct === total && total > 0 });
}

export function recordLessonSession({ topic, language }) {
  const s = getStats();
  s.totalSessions += 1;
  s.code.lessonsCompleted = (s.code.lessonsCompleted || 0) + 1;
  const topics = new Set(s.code.topicsCompleted || []);
  topics.add(topic);
  s.code.topicsCompleted = Array.from(topics);
  s.history.unshift({ mode: "lesson", topic, language, at: Date.now() });
  s.history = s.history.slice(0, 30);
  return commit(s);
}

export function clearStats() { write(KEYS.stats, emptyStats()); }
