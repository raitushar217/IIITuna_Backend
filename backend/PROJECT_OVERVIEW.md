# Backend Project Overview

## 1. Project Summary
Ye backend Node.js + Express + TypeScript based API server hai, jisme auth, users, assignments, notices, aur quizzes modules implemented hain.

High-level stack:
- Express app (`src/app.ts`)
- TypeORM + DB init (`src/config/db.ts`)
- Controller-Service architecture
- Token-based auth middleware
- Role-based authorization (`student`, `teacher`)
- File upload support via multer (`uploads/`)

## 2. Runtime Flow
1. Server start hota hai `src/server.ts` se.
2. `initDb()` DB connection initialize karta hai.
3. `createApp()` Express middlewares + routes mount karta hai.
4. Request path ke hisaab se route -> controller -> service -> database flow chalta hai.
5. Errors centralized `errorHandler` middleware handle karta hai.

## 3. Core Middlewares
- `helmet`, `cors`, `morgan`
- `express.json`, `express.urlencoded`
- Static file serve: `/<UPLOAD_DIR>` -> local upload folder
- `requireAuth`:
  - `Authorization: Token <key>` (DRF style) accept karta hai
  - `Bearer <key>` bhi accept karta hai
- `requireTeacher`, `requireStudent`: role guard

## 4. API Modules

### 4.1 User Module (`/api/users`)
Main routes:
- `POST /login/`
- `POST /logout/` (auth required)
- `POST /register/student/`
- `POST /register/teacher/`
- `GET /profile/` (auth required)
- `PUT /profile/` (auth required)
- `POST /password/change/` (auth required)

Flow:
- Controller input validate karta hai
- `auth.service.ts` user/token/profile/password logic handle karta hai
- Successful login/register par token + basic user payload return hota hai

### 4.2 Assignment Module (`/api/assignments`)
Main routes:
- `GET /assignments/` (auth)
- `POST /assignments/` (auth + teacher + file `assignment_pdf`)
- `GET /submissions/` (auth)
- `POST /submissions/` (auth + student + file `submission_pdf`)

Flow:
- Multer file disk pe save karta hai
- Controller file required validation karta hai
- Service DB writes + response shaping karta hai

### 4.3 Notice Module (`/api/notices`)
Main routes:
- `GET /` (auth)
- `POST /` (auth + teacher)

Flow:
- Teacher notices create karta hai
- Authenticated users list dekh sakte hain

### 4.4 Quiz Module (`/api/quizzes`)
Main routes:
- `GET /quizzes/` (auth)
- `POST /quizzes/` (auth)
- `POST /quizzes/:id/start_attempt/` (auth)
- `POST /quizzes/:id/submit_attempt/` (auth)
- `POST /answers/` (auth + student)
- `GET /questions/` (auth + teacher)
- `POST /questions/` (auth + teacher)
- `GET /options/` (auth + teacher)
- `POST /options/` (auth + teacher)
- `GET /submitted-quizzes/` (auth + student)
- `GET /submitted-quizzes/:quiz_attempt_code/` (auth + student)

Flow:
- Quiz, questions, options creation mostly teacher side
- Attempt/answer/student submission tracking student side

## 5. Data & Entity Layer
Entities folder:
- `User.ts`
- `Assignment.ts`
- `Notice.ts`
- `Quiz.ts`

Auth token bhi `User` domain entities ke andar manage hota hai (`AuthToken`).

## 6. Auth Lifecycle
1. Login/Register par token generate ya fetch hota hai.
2. Token `AuthToken` store me persist hota hai.
3. Protected routes `requireAuth` se pass hote hain.
4. Logout token delete karta hai.

## 7. Error Handling Pattern
- `HttpError(status, message, details?)` custom error throw kiya jata hai.
- `errorHandler` final JSON error response return karta hai.
- Missing route ko `notFound` middleware handle karta hai.

## 8. Request Lifecycle (Concrete)
Client request -> Route -> Auth/Role middleware -> Controller -> Service -> TypeORM Repository -> DB -> Service response mapper -> Controller response JSON

## 9. Architecture Diagram
Detailed diagram ke liye dekhein:
- `ARCHITECTURE_DIAGRAM.md`

---

## 10. PDF Export (VS Code)
Aap direct in files ko PDF bana sakte ho:
1. `PROJECT_OVERVIEW.md` open karo
2. Markdown preview kholo (`Cmd+Shift+V`)
3. Print (`Cmd+P`) -> Save as PDF
4. Same steps `ARCHITECTURE_DIAGRAM.md` ke liye repeat karo
