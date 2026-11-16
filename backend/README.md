# PCCIS Backend

## Setup (run from `backend/`)

```bash
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
cp .env.example .env             # Windows: copy .env.example .env  (then edit it)
alembic upgrade head             # creates pccis.db with all tables
uvicorn app.main:app --reload --port 8000
```

Open http://localhost:8000/api/health and http://localhost:8000/docs.

## Tests

```bash
pytest -v
```

## Migrations

After changing a model: `alembic revision --autogenerate -m "describe change"`, review the
generated file, then `alembic upgrade head`.

## Phase 2: authentication

Set `JWT_SECRET_KEY` (random, 32+ chars) and `GOOGLE_CLIENT_ID` in `.env`. No new migration is needed.

Create the first Admin (public signup can only create Inspectors):

```powershell
python -m app.scripts.create_admin --email you@college.edu --full-name "Your Name"
```

Endpoints: `POST /api/auth/register`, `/login`, `/google`, `/logout`, `GET /api/auth/me`,
`GET /api/users` (Admin), `PATCH /api/users/{id}/role` (Admin).
Send the token as `Authorization: Bearer <access_token>`.
