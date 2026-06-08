from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, Cookie, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import json
import logging
import re
import uuid
import hashlib
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Literal, Any
from datetime import datetime, timezone, timedelta

import bcrypt
import jwt
import httpx


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

OPENROUTER_API_KEY = os.environ.get('OPEN_ROUTER_API_KEY')
JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALG = "HS256"
SESSION_TTL_DAYS = 7

app = FastAPI()
api_router = APIRouter(prefix="/api")


# ===== Helpers =====
def _now() -> datetime:
    return datetime.now(timezone.utc)


def _extract_json(text: str):
    fenced = re.search(r"```(?:json)?\s*(\{.*?\}|\[.*?\])\s*```", text, re.DOTALL)
    if fenced:
        text = fenced.group(1)
    else:
        m = re.search(r"(\{.*\}|\[.*\])", text, re.DOTALL)
        if m:
            text = m.group(1)
    return json.loads(text)


async def _llm_chat(system_message: str, user_text: str) -> str:
    if not OPENROUTER_API_KEY:
        raise HTTPException(status_code=500, detail="LLM key not configured. Set OPEN_ROUTER_API_KEY in backend/.env")
    async with httpx.AsyncClient(timeout=120.0) as http_client:
        resp = await http_client.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost:3000",
                "X-Title": "WordRush",
            },
            json={
                "model": "anthropic/claude-sonnet-4",
                "max_tokens": 2048,
                "messages": [
                    {"role": "system", "content": system_message},
                    {"role": "user", "content": user_text},
                ],
            },
        )
        if resp.status_code != 200:
            logging.error(f"OpenRouter API error {resp.status_code}: {resp.text}")
            raise HTTPException(status_code=502, detail=f"LLM API error: {resp.status_code}")
        data = resp.json()
        return data["choices"][0]["message"]["content"]


def _hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def _verify_pw(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False


def _make_jwt(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "iat": int(_now().timestamp()),
        "exp": int((_now() + timedelta(days=SESSION_TTL_DAYS)).timestamp()),
        "type": "jwt",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


# ===== Models =====
class WordItem(BaseModel):
    word: str
    definition: str


class GenerateWordsRequest(BaseModel):
    theme: str
    difficulty: Literal["easy", "medium", "hard"] = "medium"
    language: str = "English"
    count: int = Field(default=12, ge=4, le=30)


class GenerateWordsResponse(BaseModel):
    words: List[WordItem]


class PassageRequest(BaseModel):
    topic: str
    difficulty: Literal["easy", "medium", "hard"] = "medium"
    language: str = "English"
    length: Literal["short", "medium", "long"] = "short"


class MCQ(BaseModel):
    question: str
    options: List[str]
    answer_index: int


class PassageResponse(BaseModel):
    passage: str
    questions: List[MCQ]


class CodeSnippetRequest(BaseModel):
    language: Literal["python", "javascript", "typescript", "java", "go", "rust", "css", "html"] = "python"
    difficulty: Literal["easy", "medium", "hard"] = "easy"


class CodeSnippetResponse(BaseModel):
    language: str
    snippet: str
    description: str


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=200)
    name: str = Field(min_length=1, max_length=80)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class GoogleSessionRequest(BaseModel):
    session_id: str


class PublicUser(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    auth_provider: str


class StatsModel(BaseModel):
    totalSessions: int = 0
    flash: dict = Field(default_factory=lambda: {"played": 0, "correct": 0, "total": 0, "best": 0})
    speed: dict = Field(default_factory=lambda: {"played": 0, "correct": 0, "total": 0, "bestWpm": 0})
    match: dict = Field(default_factory=lambda: {"played": 0, "bestTime": None, "totalMoves": 0})
    code: dict = Field(default_factory=lambda: {"played": 0, "bestWpm": 0, "bestAccuracy": 0})
    streak: dict = Field(default_factory=lambda: {"current": 0, "longest": 0, "last_day": None})
    history: List[dict] = Field(default_factory=list)
    achievements: List[str] = Field(default_factory=list)


class CustomList(BaseModel):
    id: str
    name: str
    theme: str
    difficulty: str
    language: str
    words: List[WordItem]


class LeaderboardEntry(BaseModel):
    user_id: str
    name: str
    picture: Optional[str] = None
    mode: str
    score: float
    detail: dict = Field(default_factory=dict)
    at: datetime


class LeaderboardSubmit(BaseModel):
    mode: Literal["flash", "speed", "match", "code"]
    score: float
    detail: dict = Field(default_factory=dict)


# ===== Auth dependency =====
async def get_current_user(
    request: Request,
    authorization: Optional[str] = Header(default=None),
    session_token: Optional[str] = Cookie(default=None),
) -> Optional[dict]:
    """Returns user dict or None. Order: cookie session_token -> Bearer JWT/session_token."""
    token = session_token
    bearer = None
    if authorization and authorization.lower().startswith("bearer "):
        bearer = authorization.split(" ", 1)[1].strip()

    # Try cookie/bearer as a session token (Emergent google flow)
    for candidate in [token, bearer]:
        if not candidate:
            continue
        sess = await db.user_sessions.find_one({"session_token": candidate}, {"_id": 0})
        if sess:
            exp = sess.get("expires_at")
            if isinstance(exp, str):
                exp = datetime.fromisoformat(exp)
            if exp.tzinfo is None:
                exp = exp.replace(tzinfo=timezone.utc)
            if exp < _now():
                continue
            user = await db.users.find_one({"user_id": sess["user_id"]}, {"_id": 0, "password_hash": 0})
            if user:
                return user

    # Try bearer as a JWT
    if bearer:
        try:
            payload = jwt.decode(bearer, JWT_SECRET, algorithms=[JWT_ALG])
            user = await db.users.find_one({"user_id": payload["sub"]}, {"_id": 0, "password_hash": 0})
            if user:
                return user
        except Exception:
            pass
    return None


async def require_user(user: Optional[dict] = Depends(get_current_user)) -> dict:
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


def _user_to_public(u: dict) -> PublicUser:
    return PublicUser(
        user_id=u["user_id"],
        email=u["email"],
        name=u["name"],
        picture=u.get("picture"),
        auth_provider=u.get("auth_provider", "jwt"),
    )


# ===== Routes =====
@api_router.get("/")
async def root():
    return {"message": "WordRush API running"}


@api_router.get("/health")
async def health():
    return {"status": "ok", "llm_configured": bool(OPENROUTER_API_KEY)}


@api_router.post("/generate-words", response_model=GenerateWordsResponse)
async def generate_words(req: GenerateWordsRequest):
    system = (
        "You are a vocabulary curator for a fast-paced word memorization game. "
        "Return ONLY valid JSON. No prose, no markdown fences."
    )
    user = (
        f"Generate exactly {req.count} {req.difficulty} vocabulary words in {req.language} "
        f"on the theme '{req.theme}'. Each word should have a concise 6-12 word definition "
        f"in {req.language}. Avoid duplicates. "
        f'Output strictly as JSON: {{"words":[{{"word":"...","definition":"..."}}]}}'
    )
    try:
        raw = await _llm_chat(system, user)
        data = _extract_json(raw)
        words = data.get("words", data) if isinstance(data, dict) else data
        return GenerateWordsResponse(words=[WordItem(**w) for w in words][: req.count])
    except HTTPException:
        raise
    except Exception as e:
        logging.exception("generate_words failed")
        raise HTTPException(status_code=502, detail=f"LLM generation failed: {e}")


@api_router.post("/generate-passage", response_model=PassageResponse)
async def generate_passage(req: PassageRequest):
    length_words = {"short": 90, "medium": 160, "long": 260}[req.length]
    system = (
        "You write engaging short passages for a speed-reading practice game and create "
        "multiple-choice comprehension questions. Output ONLY valid JSON, no markdown."
    )
    user = (
        f"Write a {req.difficulty} passage of about {length_words} words in {req.language} "
        f"about: {req.topic}. Then create 3 multiple-choice comprehension questions with 4 options each. "
        f'Output strictly as JSON: '
        f'{{"passage":"...","questions":[{{"question":"...","options":["a","b","c","d"],"answer_index":0}}]}}'
    )
    try:
        raw = await _llm_chat(system, user)
        data = _extract_json(raw)
        return PassageResponse(
            passage=data["passage"],
            questions=[MCQ(**q) for q in data["questions"]][:3],
        )
    except HTTPException:
        raise
    except Exception as e:
        logging.exception("generate_passage failed")
        raise HTTPException(status_code=502, detail=f"LLM generation failed: {e}")


@api_router.post("/generate-code", response_model=CodeSnippetResponse)
async def generate_code(req: CodeSnippetRequest):
    line_target = {"easy": "3-5", "medium": "6-9", "hard": "10-14"}[req.difficulty]
    system = (
        "You are a senior engineer writing short, idiomatic, READABLE code snippets for a "
        "Speed Code typing exercise. Return ONLY valid JSON. Do NOT use markdown fences."
    )
    user = (
        f"Write a {req.difficulty} {req.language} code snippet, {line_target} lines, that does "
        f"something useful and tiny. Use real indentation. Avoid trailing whitespace. "
        f'Output strictly as JSON: {{"language":"{req.language}","snippet":"...","description":"one sentence"}}'
    )
    try:
        raw = await _llm_chat(system, user)
        data = _extract_json(raw)
        return CodeSnippetResponse(**data)
    except HTTPException:
        raise
    except Exception as e:
        logging.exception("generate_code failed")
        raise HTTPException(status_code=502, detail=f"LLM generation failed: {e}")


# ----- Daily Challenge (deterministic per UTC day) -----
DAILY_THEMES = [
    ("focus and clarity", "English"),
    ("space and the cosmos", "English"),
    ("kitchen alchemy", "English"),
    ("oceans and rivers", "English"),
    ("memory and the brain", "English"),
    ("forests and creatures", "English"),
    ("ancient civilizations", "English"),
    ("startups and grit", "English"),
    ("weather phenomena", "English"),
    ("music and rhythm", "English"),
    ("light and color", "English"),
    ("emotions in motion", "English"),
    ("city life", "English"),
    ("seasons changing", "English"),
]


def _today_key() -> str:
    return _now().strftime("%Y-%m-%d")


@api_router.get("/daily-challenge")
async def daily_challenge():
    key = _today_key()
    seed = int(hashlib.sha1(key.encode()).hexdigest(), 16)
    theme, language = DAILY_THEMES[seed % len(DAILY_THEMES)]
    difficulty = ["easy", "medium", "hard"][seed % 3]
    mode = ["flash", "speed", "match"][(seed // 3) % 3]
    return {
        "date": key,
        "theme": theme,
        "language": language,
        "difficulty": difficulty,
        "mode": mode,
        "title": f"Today: {theme.title()}",
    }


# ----- Auth: JWT -----
@api_router.post("/auth/signup")
async def signup(req: SignupRequest, response: Response):
    existing = await db.users.find_one({"email": req.email.lower()}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    doc = {
        "user_id": user_id,
        "email": req.email.lower(),
        "name": req.name.strip(),
        "picture": None,
        "auth_provider": "jwt",
        "password_hash": _hash_pw(req.password),
        "created_at": _now().isoformat(),
    }
    await db.users.insert_one(doc)
    token = _make_jwt(user_id)
    return {"token": token, "user": _user_to_public(doc).model_dump()}


@api_router.post("/auth/login")
async def login(req: LoginRequest):
    u = await db.users.find_one({"email": req.email.lower()}, {"_id": 0})
    if not u or not u.get("password_hash") or not _verify_pw(req.password, u["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = _make_jwt(u["user_id"])
    return {"token": token, "user": _user_to_public(u).model_dump()}


# ----- Auth: Emergent Google -----
@api_router.post("/auth/google/session")
async def google_session(req: GoogleSessionRequest, response: Response):
    try:
        async with httpx.AsyncClient(timeout=15.0) as cli:
            r = await cli.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": req.session_id},
            )
            if r.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid Google session")
            data = r.json()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Auth provider error: {e}")

    email = (data.get("email") or "").lower()
    if not email:
        raise HTTPException(status_code=400, detail="No email returned from provider")

    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {
                "name": data.get("name") or existing.get("name"),
                "picture": data.get("picture") or existing.get("picture"),
                "auth_provider": "google",
            }},
        )
        user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user = {
            "user_id": user_id,
            "email": email,
            "name": data.get("name") or email.split("@")[0],
            "picture": data.get("picture"),
            "auth_provider": "google",
            "created_at": _now().isoformat(),
        }
        await db.users.insert_one(user)

    session_token = data.get("session_token") or f"sess_{uuid.uuid4().hex}"
    expires = _now() + timedelta(days=SESSION_TTL_DAYS)
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires.isoformat(),
        "created_at": _now().isoformat(),
    })

    response.set_cookie(
        key="session_token",
        value=session_token,
        max_age=SESSION_TTL_DAYS * 24 * 3600,
        path="/",
        httponly=True,
        secure=True,
        samesite="none",
    )
    return {"user": _user_to_public(user).model_dump(), "token": session_token}


@api_router.get("/auth/me")
async def auth_me(user: dict = Depends(require_user)):
    return _user_to_public(user).model_dump()


@api_router.post("/auth/logout")
async def auth_logout(response: Response, session_token: Optional[str] = Cookie(default=None)):
    if session_token:
        await db.user_sessions.delete_many({"session_token": session_token})
    response.delete_cookie("session_token", path="/")
    return {"ok": True}


# ----- Cloud sync: stats & lists -----
@api_router.get("/me/stats", response_model=StatsModel)
async def get_my_stats(user: dict = Depends(require_user)):
    doc = await db.user_stats.find_one({"user_id": user["user_id"]}, {"_id": 0, "user_id": 0})
    if not doc:
        return StatsModel()
    return StatsModel(**doc)


@api_router.put("/me/stats", response_model=StatsModel)
async def put_my_stats(stats: StatsModel, user: dict = Depends(require_user)):
    payload = stats.model_dump()
    payload["user_id"] = user["user_id"]
    payload["updated_at"] = _now().isoformat()
    await db.user_stats.update_one(
        {"user_id": user["user_id"]},
        {"$set": payload},
        upsert=True,
    )
    return stats


@api_router.get("/me/lists", response_model=List[CustomList])
async def get_my_lists(user: dict = Depends(require_user)):
    docs = await db.user_lists.find({"user_id": user["user_id"]}, {"_id": 0, "user_id": 0}).to_list(500)
    return [CustomList(**d) for d in docs]


@api_router.post("/me/lists", response_model=CustomList)
async def save_my_list(item: CustomList, user: dict = Depends(require_user)):
    payload = item.model_dump()
    payload["user_id"] = user["user_id"]
    payload["updated_at"] = _now().isoformat()
    await db.user_lists.update_one(
        {"user_id": user["user_id"], "id": item.id},
        {"$set": payload},
        upsert=True,
    )
    return item


@api_router.delete("/me/lists/{list_id}")
async def delete_my_list(list_id: str, user: dict = Depends(require_user)):
    await db.user_lists.delete_one({"user_id": user["user_id"], "id": list_id})
    return {"ok": True}


# ----- Leaderboard -----
@api_router.post("/leaderboard/submit", response_model=LeaderboardEntry)
async def submit_score(body: LeaderboardSubmit, user: dict = Depends(require_user)):
    entry = {
        "user_id": user["user_id"],
        "name": user.get("name", "Player"),
        "picture": user.get("picture"),
        "mode": body.mode,
        "score": float(body.score),
        "detail": body.detail,
        "at": _now().isoformat(),
    }
    # Only keep top score per user per mode
    existing = await db.leaderboard.find_one(
        {"user_id": user["user_id"], "mode": body.mode},
        {"_id": 0},
    )
    if not existing or body.score > existing.get("score", -1):
        await db.leaderboard.update_one(
            {"user_id": user["user_id"], "mode": body.mode},
            {"$set": entry},
            upsert=True,
        )
    # Return entry with parsed datetime
    return LeaderboardEntry(
        user_id=entry["user_id"],
        name=entry["name"],
        picture=entry.get("picture"),
        mode=entry["mode"],
        score=entry["score"],
        detail=entry["detail"],
        at=_now(),
    )


@api_router.get("/leaderboard")
async def get_leaderboard(mode: str = "flash", limit: int = 20):
    docs = (
        await db.leaderboard.find({"mode": mode}, {"_id": 0})
        .sort("score", -1)
        .limit(min(max(limit, 1), 100))
        .to_list(100)
    )
    return docs


# ===== Wire up =====
app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
