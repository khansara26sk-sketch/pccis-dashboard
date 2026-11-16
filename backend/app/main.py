from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.routes import api_router


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Only the upload directory is created here; tables are managed by Alembic migrations.
    settings = get_settings()
    for directory in (settings.upload_dir, settings.originals_dir, settings.processed_dir):
        directory.mkdir(parents=True, exist_ok=True)
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="PCCIS API", version="0.1.0", lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.cors_origins),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(_request: Request, exc: RequestValidationError):
        # FastAPI's default 422 body echoes the submitted value ("input"), which would send
        # passwords back to the client and into logs. Return only where/what/why.
        errors = [{"loc": e["loc"], "msg": e["msg"], "type": e["type"]} for e in exc.errors()]
        return JSONResponse(status_code=422, content={"detail": jsonable_encoder(errors)})

    app.include_router(api_router)
    return app


app = create_app()
