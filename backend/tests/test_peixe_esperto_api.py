"""
Peixe Esperto API tests - Auth, Bankrolls, Bets, Casas, Cross-device persistence.
Ordered end-to-end suite using module-scoped state to preserve continuity.
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL") or "https://bet-manager-16.preview.emergentagent.com"
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"

# Module-scoped shared state
STATE = {}


def _unique_email(tag: str = "user") -> str:
    return f"TEST_{tag}_{uuid.uuid4().hex[:10]}@example.com"


@pytest.fixture(scope="module")
def s():
    return requests.Session()


# -------------------- HEALTH --------------------
def test_health_root(s):
    r = s.get(f"{API}/", timeout=15)
    assert r.status_code == 200
    assert "message" in r.json()


# -------------------- AUTH --------------------
def test_register_user_a(s):
    email = _unique_email("A")
    r = s.post(f"{API}/auth/register", json={"name": "User A", "email": email, "password": "senha123"}, timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "access_token" in data and "user" in data
    assert data["user"]["email"] == email.lower()
    assert "password_hash" not in data["user"]
    STATE["A_email"] = email
    STATE["A_token"] = data["access_token"]
    STATE["A_user_id"] = data["user"]["id"]


def test_register_duplicate_email_returns_409(s):
    r = s.post(f"{API}/auth/register", json={"name": "Dup", "email": STATE["A_email"], "password": "senha123"}, timeout=15)
    assert r.status_code == 409


def test_login_wrong_password_returns_401(s):
    r = s.post(f"{API}/auth/login", json={"email": STATE["A_email"], "password": "wrong-password"}, timeout=15)
    assert r.status_code == 401


def test_login_correct_returns_token(s):
    r = s.post(f"{API}/auth/login", json={"email": STATE["A_email"], "password": "senha123"}, timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert "access_token" in data
    STATE["A_token2"] = data["access_token"]  # simulate another device token


def test_me_returns_user_without_password(s):
    r = s.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {STATE['A_token']}"}, timeout=15)
    assert r.status_code == 200
    body = r.json()
    assert body["email"] == STATE["A_email"].lower()
    assert "password_hash" not in body


def test_me_without_token_returns_401(s):
    r = s.get(f"{API}/auth/me", timeout=15)
    assert r.status_code in (401, 403)


# -------------------- BANKROLLS --------------------
def _auth_a():
    return {"Authorization": f"Bearer {STATE['A_token']}"}


def test_bankrolls_initially_empty(s):
    r = s.get(f"{API}/bankrolls", headers=_auth_a(), timeout=15)
    assert r.status_code == 200
    assert isinstance(r.json(), list)
    assert r.json() == []


def test_create_bankroll(s):
    r = s.post(f"{API}/bankrolls", headers=_auth_a(), json={"name": "TEST_Banca1", "capital": 1000.0}, timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["name"] == "TEST_Banca1"
    assert data["capital"] == 1000.0
    assert "id" in data
    assert "_id" not in data
    assert "owner_id" not in data
    STATE["bank_id"] = data["id"]


def test_list_bankrolls_after_create(s):
    r = s.get(f"{API}/bankrolls", headers=_auth_a(), timeout=15)
    assert r.status_code == 200
    lst = r.json()
    assert any(b["id"] == STATE["bank_id"] for b in lst)


def test_update_bankroll(s):
    r = s.put(
        f"{API}/bankrolls/{STATE['bank_id']}",
        headers=_auth_a(),
        json={"name": "TEST_Banca1_upd", "capital": 1500.0},
        timeout=15,
    )
    assert r.status_code == 200
    assert r.json()["name"] == "TEST_Banca1_upd"
    assert r.json()["capital"] == 1500.0
    # verify via GET
    lst = s.get(f"{API}/bankrolls", headers=_auth_a(), timeout=15).json()
    found = [b for b in lst if b["id"] == STATE["bank_id"]][0]
    assert found["capital"] == 1500.0


# -------------------- BETS --------------------
def test_create_bet_requires_valid_bankroll(s):
    payload = {
        "bankroll_id": "not-a-real-id",
        "casa": "Bet365",
        "titulo": "Time A vs Time B",
        "cotacao": 1.85,
        "valor": 50.0,
        "estado": "Pendente",
        "data": "2026-01-15",
        "hora": "18:00",
        "esporte": "Futebol",
        "formato": "Simples",
    }
    r = s.post(f"{API}/bets", headers=_auth_a(), json=payload, timeout=15)
    assert r.status_code == 404


def test_create_bet_success(s):
    payload = {
        "bankroll_id": STATE["bank_id"],
        "casa": "Bet365",
        "titulo": "TEST_Aposta1",
        "cotacao": 2.10,
        "valor": 100.0,
        "estado": "Pendente",
        "data": "2026-01-15",
        "hora": "18:00",
        "esporte": "Futebol",
        "formato": "Simples",
    }
    r = s.post(f"{API}/bets", headers=_auth_a(), json=payload, timeout=15)
    assert r.status_code == 200, r.text
    bet = r.json()
    assert bet["titulo"] == "TEST_Aposta1"
    assert bet["bankroll_id"] == STATE["bank_id"]
    assert "id" in bet and "_id" not in bet
    STATE["bet_id"] = bet["id"]


def test_list_bets_by_bankroll(s):
    r = s.get(f"{API}/bets?bankroll_id={STATE['bank_id']}", headers=_auth_a(), timeout=15)
    assert r.status_code == 200
    bets = r.json()
    assert any(b["id"] == STATE["bet_id"] for b in bets)


def test_update_bet_status(s):
    r = s.put(f"{API}/bets/{STATE['bet_id']}", headers=_auth_a(), json={"estado": "Ganha"}, timeout=15)
    assert r.status_code == 200
    assert r.json()["estado"] == "Ganha"
    # verify persistence
    bets = s.get(f"{API}/bets?bankroll_id={STATE['bank_id']}", headers=_auth_a(), timeout=15).json()
    assert [b for b in bets if b["id"] == STATE["bet_id"]][0]["estado"] == "Ganha"


# -------------------- CROSS-DEVICE PERSISTENCE (CORE FIX) --------------------
def test_cross_device_persistence(s):
    """Login again with same account -> see the same bankroll + bet."""
    r = s.post(f"{API}/auth/login", json={"email": STATE["A_email"], "password": "senha123"}, timeout=15)
    assert r.status_code == 200
    device2_token = r.json()["access_token"]
    h = {"Authorization": f"Bearer {device2_token}"}

    banks = s.get(f"{API}/bankrolls", headers=h, timeout=15).json()
    assert any(b["id"] == STATE["bank_id"] and b["name"] == "TEST_Banca1_upd" for b in banks)

    bets = s.get(f"{API}/bets?bankroll_id={STATE['bank_id']}", headers=h, timeout=15).json()
    assert any(b["id"] == STATE["bet_id"] and b["estado"] == "Ganha" for b in bets)


# -------------------- DATA ISOLATION --------------------
def test_data_isolation_between_users(s):
    email_b = _unique_email("B")
    r = s.post(f"{API}/auth/register", json={"name": "User B", "email": email_b, "password": "senha123"}, timeout=15)
    assert r.status_code == 200
    token_b = r.json()["access_token"]
    h = {"Authorization": f"Bearer {token_b}"}

    banks_b = s.get(f"{API}/bankrolls", headers=h, timeout=15).json()
    assert banks_b == []  # user B sees nothing of user A

    # User B cannot update user A's bankroll
    r2 = s.put(
        f"{API}/bankrolls/{STATE['bank_id']}",
        headers=h,
        json={"name": "hack", "capital": 1.0},
        timeout=15,
    )
    assert r2.status_code == 404

    # User B cannot create bet in user A's bankroll
    r3 = s.post(
        f"{API}/bets",
        headers=h,
        json={
            "bankroll_id": STATE["bank_id"],
            "casa": "Bet365",
            "titulo": "hack",
            "cotacao": 1.5,
            "valor": 10,
            "estado": "Pendente",
            "data": "2026-01-15",
            "hora": "18:00",
        },
        timeout=15,
    )
    assert r3.status_code == 404


# -------------------- CASAS --------------------
def test_casas_default_list(s):
    r = s.get(f"{API}/casas", headers=_auth_a(), timeout=15)
    assert r.status_code == 200
    casas = r.json()
    assert isinstance(casas, list)
    lowered = [c.lower() for c in casas]
    assert "bet365" in lowered and "betano" in lowered


def test_casas_add_custom_persists(s):
    custom = f"TEST_Casa_{uuid.uuid4().hex[:6]}"
    r = s.post(f"{API}/casas", headers=_auth_a(), json={"name": custom}, timeout=15)
    assert r.status_code == 200
    assert custom in r.json()
    # verify persisted via GET
    r2 = s.get(f"{API}/casas", headers=_auth_a(), timeout=15)
    assert custom in r2.json()


# -------------------- SOFT DELETE CASCADE --------------------
def test_delete_bankroll_cascades_bets(s):
    r = s.delete(f"{API}/bankrolls/{STATE['bank_id']}", headers=_auth_a(), timeout=15)
    assert r.status_code == 200

    banks = s.get(f"{API}/bankrolls", headers=_auth_a(), timeout=15).json()
    assert all(b["id"] != STATE["bank_id"] for b in banks)

    bets = s.get(f"{API}/bets?bankroll_id={STATE['bank_id']}", headers=_auth_a(), timeout=15).json()
    assert bets == []  # cascade soft-delete


def test_delete_bet_direct(s):
    # create fresh bankroll + bet, then delete the bet
    b = s.post(f"{API}/bankrolls", headers=_auth_a(), json={"name": "TEST_B2", "capital": 200.0}, timeout=15).json()
    bet = s.post(
        f"{API}/bets",
        headers=_auth_a(),
        json={
            "bankroll_id": b["id"],
            "casa": "Bet365",
            "titulo": "TEST_toDelete",
            "cotacao": 1.5,
            "valor": 10,
            "estado": "Pendente",
            "data": "2026-01-15",
            "hora": "18:00",
        },
        timeout=15,
    ).json()
    r = s.delete(f"{API}/bets/{bet['id']}", headers=_auth_a(), timeout=15)
    assert r.status_code == 200
    bets = s.get(f"{API}/bets?bankroll_id={b['id']}", headers=_auth_a(), timeout=15).json()
    assert all(x["id"] != bet["id"] for x in bets)
    # cleanup
    s.delete(f"{API}/bankrolls/{b['id']}", headers=_auth_a(), timeout=15)
