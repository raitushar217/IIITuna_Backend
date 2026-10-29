# Classroom Management Backend

## 1. Project Overview

This project is a **Classroom Management Backend API** built with Node.js and TypeScript.
It provides core features required in an academic platform such as user authentication, assignments, notices, and quizzes.

### What problem it solves

Educational systems often need a single backend to manage teacher and student workflows consistently. This project solves that by exposing structured REST APIs for:

- User registration, authentication, profile management
- Assignment creation and submission
- Notice publishing
- Quiz creation and student attempts

### Tech stack

- **Node.js**: runtime
- **Express**: HTTP server and routing
- **TypeScript**: type-safe backend development
- **PostgreSQL**: relational database
- **TypeORM**: ORM for entity mapping and database access

## 2. Architecture Explanation

Core backend structure:

```text
backend/
 ├── src/
 │   ├── controllers/
 │   ├── routes/
 │   ├── entities/
 │   ├── services/
 │   ├── middleware/
 │   ├── config/
 │   ├── app.ts
 │   └── server.ts
```

Responsibilities:

- `src/routes/`: defines endpoint paths and attaches middleware + controllers
- `src/controllers/`: receives HTTP requests, validates request-level input, returns responses
- `src/services/`: business logic and orchestration with database entities
- `src/entities/`: TypeORM entity definitions (DB tables/relations)
- `src/middleware/`: cross-cutting concerns such as auth, role checks, error handling
- `src/config/`: configuration and database connection setup
- `src/app.ts`: creates and configures Express app (middlewares + route registration)
- `src/server.ts`: bootstraps application (initializes DB and starts server)

## 3. Request Flow

Standard request lifecycle:

```text
Client
	-> Route
		-> Controller
			-> Service
				-> Entity/Repository (TypeORM)
					-> PostgreSQL
				<- Service Result
			<- Controller Response
	<- HTTP Response
```

In short:
`client -> routes -> controller -> service -> entity -> DB -> response`

## 4. API Endpoints

Base URL (local): `http://localhost:8000`

### A. Users (`/api/users`)

#### `POST /api/users/login/`

Request body:

```json
{
	"identification_number": "STU001",
	"password": "secret123"
}
```

Response example:

```json
{
	"token": "generated_auth_token",
	"user": {
		"id": 1,
		"name": "Aman",
		"role": "student"
	}
}
```

#### `GET /api/users/profile/`

Headers:

```http
Authorization: Token <auth_token>
```

Response example:

```json
{
	"id": 1,
	"name": "Aman",
	"email": "aman@example.com",
	"role": "student"
}
```

### B. Assignments (`/api/assignments`)

#### `GET /api/assignments/assignments/`

Response example:

```json
[
	{
		"id": 12,
		"title": "Database Homework",
		"deadline": "2026-04-15T23:59:59.000Z"
	}
]
```

#### `POST /api/assignments/assignments/`

Note: multipart/form-data supported (`assignment_pdf` file upload).

Request body example:

```json
{
	"title": "Database Homework",
	"description": "Normalization and ER diagrams",
	"deadline": "2026-04-15T23:59:59.000Z"
}
```

Response example:

```json
{
	"id": 12,
	"title": "Database Homework",
	"description": "Normalization and ER diagrams",
	"message": "Assignment created successfully"
}
```

### C. Notices (`/api/notices`)

#### `GET /api/notices/`

Response example:

```json
[
	{
		"id": 4,
		"title": "Midterm Schedule",
		"message": "Midterms begin next Monday"
	}
]
```

#### `POST /api/notices/`

Request body:

```json
{
	"title": "Midterm Schedule",
	"message": "Midterms begin next Monday"
}
```

Response example:

```json
{
	"id": 4,
	"title": "Midterm Schedule",
	"message": "Midterms begin next Monday"
}
```

### D. Quizzes (`/api/quizzes`)

#### `GET /api/quizzes/quizzes/`

Response example:

```json
[
	{
		"id": 7,
		"title": "TypeScript Basics",
		"duration_minutes": 30
	}
]
```

#### `POST /api/quizzes/quizzes/`

Request body:

```json
{
	"title": "TypeScript Basics",
	"duration_minutes": 30,
	"total_marks": 20
}
```

Response example:

```json
{
	"id": 7,
	"title": "TypeScript Basics",
	"message": "Quiz created successfully"
}
```

## 5. Setup Instructions

Run locally using only Node.js:

```bash
cd backend
npm install
npm run dev
```

Optional build check:

```bash
npm run build
```

## 6. Environment Variables

Create/update `backend/.env` with:

```env
PORT=8000
DATABASE_URL=postgres://postgres:postgres@localhost:5432/classroom
JWT_SECRET=replace_with_a_long_random_secret
```

### Meaning of fields

- `PORT`: backend server port
- `DATABASE_URL`: full PostgreSQL connection string
- `JWT_SECRET`: secret used for token generation/verification

Additional variables supported by current config:

- `NODE_ENV`
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASS`
- `UPLOAD_DIR`

## 7. Database Flow

### TypeORM entities

Entity classes in `src/entities/` represent tables and relations. These classes are loaded in the TypeORM `DataSource` and used by services for CRUD/business operations.

### Connection (`src/config/db.ts`)

- Loads env values
- Creates `AppDataSource` with PostgreSQL config
- Registers entity classes
- `initDb()` initializes DB connection before server starts

`src/server.ts` calls `initDb()` first, then starts Express listener.

## 8. Error Handling

Error strategy is middleware-based:

- Controllers/services can throw typed errors (`HttpError`)
- `notFound` middleware handles unknown routes
- `errorHandler` middleware normalizes errors and sends consistent HTTP responses

This keeps route handlers clean and centralizes error formatting.

## 9. Development Workflow

How to add a new API module:

1. Create/update Entity in `src/entities/`
2. Create Service logic in `src/services/`
3. Create Controller handlers in `src/controllers/`
4. Create Route definitions in `src/routes/`
5. Register route in `src/app.ts`

This preserves clean separation of concerns and testability.

## 10. Example API Flow (End-to-End)

Example: `POST /api/users/login/`

1. Request hits route in `src/routes/user.routes.ts`
2. Route forwards to `login` handler in `src/controllers/user.controller.ts`
3. Controller validates required fields (`identification_number`, `password`)
4. Controller calls `AuthService.login(...)`
5. Service verifies credentials against user records via entities/repositories
6. Service returns token + user payload
7. Controller returns JSON response to client

## 11. Project Status

This backend is the **Node.js + TypeScript conversion** of an earlier Django-based classroom backend.

Current status:

- Django code removed from runtime path
- Node-only local backend in active use
- APIs organized into modular route/controller/service architecture

## 12. Final Folder Tree

```text
backend/
├── src/
│   ├── controllers/
│   ├── routes/
│   ├── entities/
│   ├── services/
│   ├── middleware/
│   ├── config/
│   ├── app.ts
│   └── server.ts
├── package.json
├── tsconfig.json
├── .env
└── README.md
```
