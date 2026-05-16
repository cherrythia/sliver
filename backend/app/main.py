import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.workflows import router as workflows_router
from app.api.routes.execution import router as execution_router

app = FastAPI(title="Workflow Builder API")

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
