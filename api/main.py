"""ROAR Engine — FastAPI application entry point."""

from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routers import auth, cases, internal, messages, policies, reports, webhooks
from api.services import timeout_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: launch background timeout task. Shutdown: cancel it."""
    logger.info("ROAR Engine starting up...")
    timeout_task = asyncio.create_task(timeout_service.run())
    try:
        yield
    finally:
        logger.info("ROAR Engine shutting down...")
        timeout_task.cancel()
        try:
            await timeout_task
        except asyncio.CancelledError:
            pass


app = FastAPI(
    title="ROAR Engine API",
    description="Retail Operations and Resolution Engine",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://roarengine.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok", "service": "ROAR Engine API", "version": "1.0.0"}


# Register all routers (each router already defines its own prefix and tags)
app.include_router(auth.router)
app.include_router(cases.router)
app.include_router(messages.router)
app.include_router(reports.router)
app.include_router(webhooks.router)
app.include_router(policies.router)
app.include_router(internal.router)
app.include_router(internal.debug_router)
