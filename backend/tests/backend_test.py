"""WordRush backend regression test suite.

Covers health/daily-challenge, LLM generation endpoints, JWT auth flow,
cloud sync (stats/lists), and leaderboard.
"""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://speed-reader-8.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

DEMO_EMAIL = "demo@wordrush.app"
DEMO_PASSWORD = os.environ.get("WR_DEMO_PASSWORD", "Demo1234")


# ---------- Fixtures ----------
@pytest.fixture(scope="session")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


@pytest.fixture(scope="session")
def demo_token(s):
    r = s.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD})
    if r.status_code != 200:
        pytest.skip(f"Demo login failed: {r.status_code} {r.text}")
    return r.json()["token"]


@pytest.fixture(scope="session")
def auth_headers(demo_token):
    return {"Authorization": f"Bearer {demo_token}", "Content-Type": "application/json"}


# ---------- Health & Daily ----------
class TestHealth:
    def test_health(self, s):
        r = s.get(f"{API}/health", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["status"] == "ok"
        assert d["llm_configured"] is True

    def test_root(self, s):
        r = s.get(f"{API}/", timeout=15)
        assert r.status_code == 200
        assert "WordRush" in r.json().get("message", "")

    def test_daily_challenge(self, s):
        r = s.get(f"{API}/daily-challenge", timeout=15)
        assert r.status_code == 200
        d = r.json()
        for k in ("date", "theme", "language", "difficulty", "mode", "title"):
            assert k in d
        assert d["mode"] in ("flash", "speed", "match")
        # Determinism: two consecutive calls return same date+theme
        r2 = s.get(f"{API}/daily-challenge", timeout=15).json()
        assert r2["date"] == d["date"]
        assert r2["theme"] == d["theme"]


# ---------- LLM-backed generators ----------
class TestGenerators:
    def test_generate_words(self, s):
        r = s.post(f"{API}/generate-words", json={
            "theme": "ocean", "difficulty": "easy", "language": "English", "count": 6,
        }, timeout=120)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "words" in d and len(d["words"]) >= 4
        for w in d["words"]:
            assert w["word"] and w["definition"]

    def test_generate_passage(self, s):
        r = s.post(f"{API}/generate-passage", json={
            "topic": "honeybees", "difficulty": "easy", "language": "English", "length": "short",
        }, timeout=120)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["passage"]
        assert len(d["questions"]) == 3
        for q in d["questions"]:
            assert len(q["options"]) == 4
            assert 0 <= q["answer_index"] < 4

    def test_generate_code(self, s):
        r = s.post(f"{API}/generate-code", json={
            "language": "python", "difficulty": "easy",
        }, timeout=120)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["language"] == "python"
        assert d["snippet"]
        assert d["description"]


# ---------- Auth ----------
class TestAuth:
    def test_signup_and_me(self, s):
        email = f"test+{int(time.time())}-{uuid.uuid4().hex[:6]}@wordrush.app"
        r = s.post(f"{API}/auth/signup", json={
            "email": email, "password": "Password123", "name": "Tester",
        })
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["token"]
        assert d["user"]["email"] == email
        assert d["user"]["auth_provider"] == "jwt"

        # /me with Bearer JWT
        me = s.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {d['token']}"})
        assert me.status_code == 200
        assert me.json()["email"] == email

    def test_signup_duplicate(self, s):
        email = f"dup+{int(time.time())}-{uuid.uuid4().hex[:6]}@wordrush.app"
        body = {"email": email, "password": "Password123", "name": "Dup"}
        r1 = s.post(f"{API}/auth/signup", json=body)
        assert r1.status_code == 200
        r2 = s.post(f"{API}/auth/signup", json=body)
        assert r2.status_code == 400

    def test_login_demo_user(self, s):
        r = s.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD})
        assert r.status_code == 200, r.text
        assert r.json()["user"]["email"] == DEMO_EMAIL

    def test_login_wrong_password(self, s):
        r = s.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": "wrong"})
        assert r.status_code == 401

    def test_me_unauth(self, s):
        r = s.get(f"{API}/auth/me")
        assert r.status_code == 401


# ---------- Cloud sync ----------
class TestCloudSync:
    def test_put_and_get_stats(self, s, auth_headers):
        payload = {
            "totalSessions": 3,
            "flash": {"played": 2, "correct": 5, "total": 10, "best": 80},
            "speed": {"played": 1, "correct": 2, "total": 3, "bestWpm": 250},
            "match": {"played": 0, "bestTime": None, "totalMoves": 0},
            "code": {"played": 1, "bestWpm": 40, "bestAccuracy": 95},
            "streak": {"current": 1, "longest": 2, "last_day": "2026-01-01"},
            "history": [],
            "achievements": ["first-step"],
        }
        r = s.put(f"{API}/me/stats", json=payload, headers=auth_headers)
        assert r.status_code == 200, r.text

        r2 = s.get(f"{API}/me/stats", headers=auth_headers)
        assert r2.status_code == 200
        got = r2.json()
        assert got["totalSessions"] == 3
        assert got["flash"]["best"] == 80
        assert "first-step" in got["achievements"]

    def test_save_and_list_lists(self, s, auth_headers):
        list_id = f"test_{uuid.uuid4().hex[:8]}"
        item = {
            "id": list_id,
            "name": "TEST list",
            "theme": "ocean",
            "difficulty": "easy",
            "language": "English",
            "words": [
                {"word": "wave", "definition": "moving water"},
                {"word": "shell", "definition": "hard outer covering"},
            ],
        }
        r = s.post(f"{API}/me/lists", json=item, headers=auth_headers)
        assert r.status_code == 200, r.text
        assert r.json()["id"] == list_id

        r2 = s.get(f"{API}/me/lists", headers=auth_headers)
        assert r2.status_code == 200
        assert any(d["id"] == list_id for d in r2.json())

        # Cleanup
        r3 = s.delete(f"{API}/me/lists/{list_id}", headers=auth_headers)
        assert r3.status_code == 200
        r4 = s.get(f"{API}/me/lists", headers=auth_headers)
        assert all(d["id"] != list_id for d in r4.json())

    def test_stats_unauth(self, s):
        assert s.get(f"{API}/me/stats").status_code == 401
        assert s.get(f"{API}/me/lists").status_code == 401


# ---------- Leaderboard ----------
class TestLeaderboard:
    def test_submit_and_list(self, s, auth_headers):
        r = s.post(f"{API}/leaderboard/submit",
                   json={"mode": "flash", "score": 99.0, "detail": {"correct": 9, "total": 10}},
                   headers=auth_headers)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["mode"] == "flash"
        assert d["score"] == 99.0

        lb = s.get(f"{API}/leaderboard", params={"mode": "flash"})
        assert lb.status_code == 200
        rows = lb.json()
        assert isinstance(rows, list)
        assert any(row.get("mode") == "flash" for row in rows)

    def test_leaderboard_modes(self, s):
        for mode in ("flash", "speed", "match", "code"):
            r = s.get(f"{API}/leaderboard", params={"mode": mode})
            assert r.status_code == 200
            assert isinstance(r.json(), list)

    def test_submit_unauth(self, s):
        r = s.post(f"{API}/leaderboard/submit",
                   json={"mode": "flash", "score": 1.0, "detail": {}})
        assert r.status_code == 401
