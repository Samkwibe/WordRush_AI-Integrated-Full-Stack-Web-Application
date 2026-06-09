import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const TOKEN_KEY = "wr_jwt";

export function setToken(t) {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}
export function getToken() {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

const http = axios.create({ baseURL: API, withCredentials: true });
http.interceptors.request.use((cfg) => {
  const t = getToken();
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

export const api = http;

// LLM generators
export async function generateWords({ theme, difficulty, language, count }) {
  const { data } = await http.post(`/generate-words`, { theme, difficulty, language, count });
  return data.words;
}
export async function generatePassage({ topic, difficulty, language, length }) {
  const { data } = await http.post(`/generate-passage`, { topic, difficulty, language, length });
  return data;
}
export async function generateCode({ language, difficulty, topic }) {
  const { data } = await http.post(`/generate-code`, { language, difficulty, ...(topic ? { topic } : {}) });
  return data;
}
export async function generateChallenge({ language, difficulty, topic }) {
  const { data } = await http.post(`/generate-challenge`, { language, difficulty, ...(topic ? { topic } : {}) });
  return data;
}
export async function generateLesson({ language, topic, difficulty }) {
  const { data } = await http.post(`/generate-lesson`, { language, topic, difficulty });
  return data;
}

// Daily
export async function fetchDailyChallenge() {
  const { data } = await http.get(`/daily-challenge`);
  return data;
}

// Auth
export async function signup(body) {
  const { data } = await http.post(`/auth/signup`, body);
  setToken(data.token);
  return data.user;
}
export async function login(body) {
  const { data } = await http.post(`/auth/login`, body);
  setToken(data.token);
  return data.user;
}
export async function googleSession(session_id) {
  const { data } = await http.post(`/auth/google/session`, { session_id });
  if (data.token) setToken(data.token);
  return data.user;
}
export async function me() {
  const { data } = await http.get(`/auth/me`);
  return data;
}
export async function logout() {
  try { await http.post(`/auth/logout`); } catch {
    /* ignore */
  }
  setToken(null);
}

// Cloud sync
export async function cloudGetStats() {
  const { data } = await http.get(`/me/stats`);
  return data;
}
export async function cloudPutStats(stats) {
  const { data } = await http.put(`/me/stats`, stats);
  return data;
}
export async function cloudGetLists() {
  const { data } = await http.get(`/me/lists`);
  return data;
}
export async function cloudSaveList(list) {
  const { data } = await http.post(`/me/lists`, list);
  return data;
}
export async function cloudDeleteList(id) {
  const { data } = await http.delete(`/me/lists/${id}`);
  return data;
}

// Leaderboard
export async function submitLeaderboard(mode, score, detail = {}) {
  const { data } = await http.post(`/leaderboard/submit`, { mode, score, detail });
  return data;
}
export async function getLeaderboard(mode = "flash", limit = 20) {
  const { data } = await http.get(`/leaderboard`, { params: { mode, limit } });
  return data;
}
