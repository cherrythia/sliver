import os
import threading
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.workflows import router as workflows_router
from app.api.routes.execution import router as execution_router


def _seed_in_background():
    try:
        from app.db.seed import seed
        seed()
    except Exception as e:
        print(f"Seeding error (non-fatal): {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    threading.Thread(target=_seed_in_background, daemon=True).start()
    yield


app = FastAPI(title="Workflow Builder API", lifespan=lifespan)

_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(workflows_router)
app.include_router(execution_router)


@app.get("/health")
def health():
    return {"status": "ok"}
