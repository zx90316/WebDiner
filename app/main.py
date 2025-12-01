from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .routers import auth, menu, orders, admin, vendor, extension_directory
from . import models

# Create tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="VSCC-WebDiner API")

@app.on_event("startup")
def on_startup():
    with engine.connect() as connection:
        from sqlalchemy import text
        connection.execute(text("PRAGMA journal_mode=WAL;"))
        connection.execute(text("PRAGMA synchronous=NORMAL;"))

# CORS
origins = [
    "http://localhost:5173", # Vite default
    "http://127.0.0.1:5173",
    "http://localhost:8201",
    "http://127.0.0.1:8201",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    # 允許 localhost、127.0.0.1 和內網 IP (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}):\d+",
)

# Include Routers (所有 API 都加上 /api 前綴，避免與前端路由衝突)
app.include_router(auth.router, prefix="/api")
app.include_router(menu.router, prefix="/api")
app.include_router(orders.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(vendor.router, prefix="/api")
app.include_router(extension_directory.router, prefix="/api")


@app.get("/")
def read_root():
    return {"message": "Welcome to VSCC-WebDiner API"}