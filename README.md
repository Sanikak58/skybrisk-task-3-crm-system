# Skybrisk Internship - Task 3
# CRM Software: Customer & Lead Management System

Full-stack CRM MVP with:
- **Backend**: Flask + SQLAlchemy + JWT auth (REST API)
- **Frontend**: React (Vite) + React Router + Recharts
- **DB**: SQLite (default) via SQLAlchemy + Alembic migrations

## Folder structure

```
.
├── backend/                 # Flask API
├── frontend/                # React app
├── migrations/              # Alembic migrations (created by Flask-Migrate)
├── crm.db                   # SQLite DB (created on first migrate)
└── README.md
```

## Backend setup (Flask)

From the project root:

```bash
python -m pip install -r backend/requirements.txt
python -m flask --app backend.app db upgrade
python run_backend.py
```

Backend runs at `http://localhost:5001`.

### API quick test (optional)

- `GET /health`
- `POST /api/auth/signup`
- `POST /api/auth/login`

## Frontend setup (React)

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`.

### Configure API URL (optional)

Create `frontend/.env`:

```
VITE_API_BASE=http://localhost:5001
```

## Notes

- **Admin features**: Create a user with role `admin` on signup to enable **CSV export** from the Leads page.
- **Lead statuses**: `new`, `contacted`, `qualified`, `proposal`, `won`, `lost`.

