import os
import uvicorn
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from config.database import db
from routers import auth, products, categories, banners, orders, addresses, users, cities

load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Test MongoDB connection on startup
    try:
        await db.command("ping")
        print("\n🚀 QuickCart Python FastAPI server starting up...")
        print("✅ MongoDB Connected: mongodb://127.0.0.1:27017/quickcart\n")
    except Exception as e:
        print(f"❌ MongoDB connection error: {e}")
    yield

app = FastAPI(
    title="QuickCart API",
    description="Python FastAPI backend with MongoDB for QuickCart grocery app",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS Middleware (allows mobile devices and web browsers to connect)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(auth.router)
app.include_router(products.router)
app.include_router(categories.router)
app.include_router(banners.router)
app.include_router(orders.router)
app.include_router(addresses.router)
app.include_router(users.router)
app.include_router(cities.router)

@app.get("/api/health")
async def health_check():
    return {
        "status": "ok",
        "service": "QuickCart Python FastAPI Backend",
        "database": "MongoDB (quickcart)",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
