# WordRush — PRD

## Original Problem Statement
"build a game app that help user to read quicly and remeber words"

Follow-up: "add the logins and the add more topics and other cool stuff for coding and more"

## Vision
A tiny gym for your vocabulary and reading reflexes. Four game modes, eight languages, AI-curated content, optional cloud sync.

## User Personas
- **Casual Learner** — wants quick daily vocabulary boosts (Flash + daily challenge).
- **Test Prepper** — SAT/GRE prep, drills harder lists (Flash + Memory Match on hard packs).
- **Polyglot** — practices a second language (8 languages with native packs).
- **Developer** — drills code typing speed and CS vocab (Speed Code + Coding pack).

## Core Requirements (static)
- Multiple game modes that train recall, comprehension, speed, and code typing.
- Local-first progress; optional account for cloud sync + leaderboard + badges.
- AI-generated word lists, code snippets, and reading passages.
- Multi-language support and accessibility (kbd nav, focus rings).

## What's been implemented (2026-06-08)
- ✅ 4 game modes: Flash, Speed Reading, Memory Match, Speed Code
- ✅ AI generators: word lists (Claude), passages w/ MCQs, code snippets
- ✅ Built-in packs: Everyday, Business, Science, Coding & CS, Finance, Medicine, Idioms, SAT/GRE, Nature, plus starter packs for ES/FR/DE/IT/PT/JP/ZH
- ✅ 8 languages
- ✅ Auth: JWT (email/password) + Emergent Google OAuth
- ✅ Cloud sync: stats + custom word lists per user
- ✅ Leaderboard per mode (Flash/Speed/Match/Code), best-score-per-user
- ✅ Daily challenge (deterministic per UTC day) + streak tracking
- ✅ 10 achievement badges (auto-evaluated locally)
- ✅ Light/Dark theme toggle (persistent)
- ✅ WebAudio sound effects (toggleable)
- ✅ Share-your-score image card (canvas-rendered PNG download + Web Share)
- ✅ Custom list editor (manual create + AI generate + save/edit/delete)
- ✅ Neo-brutalist design system (Outfit + DM Sans, pastel palette)

## Architecture
- **Backend:** FastAPI + Motor (MongoDB). Routes under `/api`. Auth via JWT (HS256) and Emergent session tokens. Endpoints: auth/signup, auth/login, auth/google/session, auth/me, auth/logout, generate-words, generate-passage, generate-code, daily-challenge, me/stats (GET/PUT), me/lists (GET/POST, DELETE/:id), leaderboard (GET/submit), health.
- **Frontend:** CRA + Tailwind + Router. Context providers for Auth and Theme. Local storage layer for guest mode; cloud sync when logged in.
- **LLM:** Claude Sonnet via Emergent LLM key (`emergentintegrations`).

## Backlog (P0/P1/P2)
- P1: Cache LLM passage/snippet generation to cut latency.
- P1: Split server.py into routers (auth, generators, sync, leaderboard).
- P1: Silence guest /api/auth/me 401 console noise.
- P2: Streaks notification / push reminders.
- P2: Friend challenges and weekly leaderboards.
- P2: TTS for new vocab (OpenAI TTS) so users hear pronunciation.
- P2: Pre-generate daily challenge content server-side (cached).

## Next tasks
1. Add TTS pronunciation on word reveal (OpenAI TTS).
2. Email magic-link login as alternative to password.
3. Lift custom-list sync to be diff-based instead of full overwrite.
