## Classroom Backend (Node.js + Express + TypeScript)

This folder contains the converted backend from the original Django/DRF project.

### Folder structure

- `backend/src/app.ts`: Express app (middleware + route mounting)
- `backend/src/server.ts`: Process entrypoint (DB init + listen)
- `backend/src/routes/*`: Express routers (keeps Django endpoint paths)
- `backend/src/controllers/*`: Route handlers (thin)
- `backend/src/services/*`: Business logic / DB access
- `backend/src/entities/*`: TypeORM entities (consolidated into 4 files)
- `backend/src/middleware/*`: Auth + errors
- `backend/src/config/db.ts`: Env + database connection

### Install

```bash
cd backend
npm install
```

### Run (dev)

```bash
npm run dev
```

### Build + run (prod-like)

```bash
npm run build
npm start
```

### Database

This backend uses Postgres and expects the same environment variables as the Django app:
`DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS` (plus `DB_PORT`).

To create tables automatically during development, `synchronize` is enabled when `NODE_ENV=development`.
