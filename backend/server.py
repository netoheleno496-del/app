from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')
ACCESS_TOKEN_DAYS = int(os.environ.get('ACCESS_TOKEN_DAYS', '30'))

app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=True)

DEFAULT_CASAS = [
    "10Bet", "1XBet", "22Bet", "888Sport", "7Games", "Bet365", "Betano", "KTO",
    "Stake", "Superbet", "Betfair", "Betclic", "Bwin", "Pixbet", "Parimatch",
    "Sportingbet", "Novibet", "Betnacional", "Esportes da Sorte", "Suprema Bet",
]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ===================== MODELS =====================
class RegisterBody(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    email: EmailStr
    password: str = Field(min_length=6, max_length=72)


class LoginBody(BaseModel):
    email: EmailStr
    password: str


class BankrollCreate(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    capital: float = Field(gt=0)


class BankrollUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    capital: float = Field(gt=0)


class BetCreate(BaseModel):
    bankroll_id: str
    casa: str
    titulo: str
    cotacao: float
    valor: float
    estado: str = "Pendente"
    data: str
    hora: str
    esporte: str = "Futebol"
    formato: str = "Simples"
    tipo: str = "Simples"


class BetUpdate(BaseModel):
    casa: Optional[str] = None
    titulo: Optional[str] = None
    cotacao: Optional[float] = None
    valor: Optional[float] = None
    estado: Optional[str] = None
    data: Optional[str] = None
    hora: Optional[str] = None
    esporte: Optional[str] = None
    formato: Optional[str] = None


class CasaCreate(BaseModel):
    name: str = Field(min_length=1, max_length=40)


# ===================== HELPERS =====================
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))
    except (ValueError, TypeError):
        return False


def create_token(user_id: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {"sub": user_id, "iat": now, "exp": now + timedelta(days=ACCESS_TOKEN_DAYS)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_user(cred: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    err = HTTPException(status_code=401, detail="Sessão inválida ou expirada")
    try:
        payload = jwt.decode(cred.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise err
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        raise err
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise err
    return user


def public_user(u: dict) -> dict:
    return {"id": u["id"], "name": u.get("name", ""), "email": u["email"]}


def clean(doc: dict) -> dict:
    doc.pop("_id", None)
    doc.pop("owner_id", None)
    doc.pop("deleted_at", None)
    return doc


# ===================== AUTH =====================
@api_router.post("/auth/register")
async def register(body: RegisterBody):
    email = body.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=409, detail="Este e-mail já está cadastrado")
    user_id = str(uuid.uuid4())
    doc = {
        "id": user_id,
        "name": body.name.strip(),
        "email": email,
        "password_hash": hash_password(body.password),
        "casas": DEFAULT_CASAS.copy(),
        "created_at": now_iso(),
    }
    await db.users.insert_one(doc)
    return {"access_token": create_token(user_id), "user": public_user(doc)}


@api_router.post("/auth/login")
async def login(body: LoginBody):
    email = body.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="E-mail ou senha incorretos")
    return {"access_token": create_token(user["id"]), "user": public_user(user)}


@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return public_user(user)


# ===================== BANKROLLS =====================
@api_router.get("/bankrolls")
async def list_bankrolls(user: dict = Depends(get_current_user)):
    docs = await db.bankrolls.find({"owner_id": user["id"], "deleted_at": None}).to_list(500)
    return [clean(d) for d in docs]


@api_router.post("/bankrolls")
async def create_bankroll(body: BankrollCreate, user: dict = Depends(get_current_user)):
    doc = {
        "id": str(uuid.uuid4()),
        "owner_id": user["id"],
        "name": body.name.strip(),
        "capital": body.capital,
        "created_at": now_iso(),
        "deleted_at": None,
    }
    await db.bankrolls.insert_one(doc.copy())
    return clean(doc)


@api_router.put("/bankrolls/{bankroll_id}")
async def update_bankroll(bankroll_id: str, body: BankrollUpdate, user: dict = Depends(get_current_user)):
    res = await db.bankrolls.find_one({"id": bankroll_id, "owner_id": user["id"], "deleted_at": None})
    if not res:
        raise HTTPException(status_code=404, detail="Banca não encontrada")
    await db.bankrolls.update_one({"id": bankroll_id}, {"$set": {"name": body.name.strip(), "capital": body.capital}})
    res.update({"name": body.name.strip(), "capital": body.capital})
    return clean(res)


@api_router.delete("/bankrolls/{bankroll_id}")
async def delete_bankroll(bankroll_id: str, user: dict = Depends(get_current_user)):
    res = await db.bankrolls.find_one({"id": bankroll_id, "owner_id": user["id"], "deleted_at": None})
    if not res:
        raise HTTPException(status_code=404, detail="Banca não encontrada")
    ts = now_iso()
    await db.bankrolls.update_one({"id": bankroll_id}, {"$set": {"deleted_at": ts}})
    await db.bets.update_many({"bankroll_id": bankroll_id, "owner_id": user["id"]}, {"$set": {"deleted_at": ts}})
    return {"ok": True}


# ===================== BETS =====================
@api_router.get("/bets")
async def list_bets(bankroll_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    q = {"owner_id": user["id"], "deleted_at": None}
    if bankroll_id:
        q["bankroll_id"] = bankroll_id
    docs = await db.bets.find(q).to_list(5000)
    return [clean(d) for d in docs]


@api_router.post("/bets")
async def create_bet(body: BetCreate, user: dict = Depends(get_current_user)):
    bank = await db.bankrolls.find_one({"id": body.bankroll_id, "owner_id": user["id"], "deleted_at": None})
    if not bank:
        raise HTTPException(status_code=404, detail="Banca não encontrada")
    doc = body.dict()
    doc.update({
        "id": str(uuid.uuid4()),
        "owner_id": user["id"],
        "created_at": now_iso(),
        "deleted_at": None,
    })
    await db.bets.insert_one(doc.copy())
    return clean(doc)


@api_router.put("/bets/{bet_id}")
async def update_bet(bet_id: str, body: BetUpdate, user: dict = Depends(get_current_user)):
    bet = await db.bets.find_one({"id": bet_id, "owner_id": user["id"], "deleted_at": None})
    if not bet:
        raise HTTPException(status_code=404, detail="Aposta não encontrada")
    updates = {k: v for k, v in body.dict().items() if v is not None}
    if updates:
        await db.bets.update_one({"id": bet_id}, {"$set": updates})
        bet.update(updates)
    return clean(bet)


@api_router.delete("/bets/{bet_id}")
async def delete_bet(bet_id: str, user: dict = Depends(get_current_user)):
    bet = await db.bets.find_one({"id": bet_id, "owner_id": user["id"], "deleted_at": None})
    if not bet:
        raise HTTPException(status_code=404, detail="Aposta não encontrada")
    await db.bets.update_one({"id": bet_id}, {"$set": {"deleted_at": now_iso()}})
    return {"ok": True}


# ===================== CASAS (betting houses) =====================
@api_router.get("/casas")
async def list_casas(user: dict = Depends(get_current_user)):
    return sorted(user.get("casas", DEFAULT_CASAS), key=lambda s: s.lower())


@api_router.post("/casas")
async def add_casa(body: CasaCreate, user: dict = Depends(get_current_user)):
    name = body.name.strip()
    casas = user.get("casas", DEFAULT_CASAS.copy())
    if name and name.lower() not in [c.lower() for c in casas]:
        casas.append(name)
        await db.users.update_one({"id": user["id"]}, {"$set": {"casas": casas}})
    return sorted(casas, key=lambda s: s.lower())


@api_router.get("/")
async def root():
    return {"message": "Peixe Esperto API"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
