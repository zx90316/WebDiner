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
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router)
app.include_router(menu.router)
app.include_router(orders.router)
app.include_router(admin.router)
app.include_router(vendor.router)
app.include_router(extension_directory.router)


@app.get("/")
def read_root():
    return {"message": "Welcome to VSCC-WebDiner API"}