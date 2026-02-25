# OLX Clone (ASP.NET Core + React)

A simple OLX-like marketplace clone.

## Stack

**Backend**
- ASP.NET Core Web API
- EF Core
- PostgreSQL (Docker)
- JWT Auth
- Static files for images (`/uploads`, `/avatars`)
- Google Sign-In (ID token -> backend -> JWT)
- Password reset via SMTP (with dev mode that returns reset link)

**Frontend**
- React + TypeScript + Vite
- React Router
- Axios

## Features

- Auth: register/login + Google Sign-In
- Ads: CRUD + photos
- Categories
- Profile: avatar + about + phone/name
- Chats: buyer/seller conversations + messages
- Orders: basic purchase flow + shipping (meetup/post/courier)
- Password reset (forgot/reset)

---

## Requirements

- **Node.js** 18+ (recommended)
- **.NET SDK** 8.0+
- **Docker Desktop** (for PostgreSQL)

---

## Project structure

# OLX Clone (ASP.NET Core + React)

A simple OLX-like marketplace clone.

## Stack

**Backend**
- ASP.NET Core Web API
- EF Core
- PostgreSQL (Docker)
- JWT Auth
- Static files for images (`/uploads`, `/avatars`)
- Google Sign-In (ID token -> backend -> JWT)
- Password reset via SMTP (with dev mode that returns reset link)

**Frontend**
- React + TypeScript + Vite
- React Router
- Axios

## Features

- Auth: register/login + Google Sign-In
- Ads: CRUD + photos
- Categories
- Profile: avatar + about + phone/name
- Chats: buyer/seller conversations + messages
- Orders: basic purchase flow + shipping (meetup/post/courier)
- Password reset (forgot/reset)

---

## Requirements

- **Node.js** 18+ (recommended)
- **.NET SDK** 8.0+
- **Docker Desktop** (for PostgreSQL)

---

## Project structure
backend/
src/
OlxClone.Api/
OlxClone.Domain/
OlxClone.Infrastructure/
OlxClone.Application/
frontend/

---

## 1) Start PostgreSQL (Docker)

From project root:

```bash
docker compose up -d



cp backend/src/OlxClone.Api/appsettings.Development.example.json backend/src/OlxClone.Api/appsettings.Development.json

Then edit backend/src/OlxClone.Api/appsettings.Development.json and set:

Jwt:Key (any long dev secret)

GoogleAuth:ClientId (if using Google Sign-In)

Smtp settings (if using email reset)

App:FrontendBaseUrl = http://localhost:5173

For development, you can keep:
App:ReturnDevResetLink = true
Then /auth/forgot-password returns devResetLink in response.



cd backend
dotnet ef database update \
  --project ./src/OlxClone.Infrastructure/OlxClone.Infrastructure.csproj \
  --startup-project ./src/OlxClone.Api/OlxClone.Api.csproj


Frontend setup & run
3.1 Create env file

Copy example:

cp frontend/.env.example frontend/.env

Edit frontend/.env if needed:

VITE_API_BASE_URL=http://localhost:5015

VITE_GOOGLE_CLIENT_ID=... (optional)

3.2 Install dependencies & run
cd frontend
npm install
npm run dev

Frontend:
http://localhost:5173



---

## 5) Після цього: перевір, що секрети не потрапили в GitHub

Перед пушем (або після) глянь:
- чи нема `appsettings.Development.json` у репо
- чи нема `frontend/.env`
- чи нема реальних фото у `wwwroot/uploads`

---

## Якщо хочеш — я піджену README під твої реальні порти/імена
Скажи:
- який порт у бекенда (ти зараз використовуєш 5015 — ок)
- чи є `docker-compose.yml` в корені чи в `backend/`
і я зроблю README 1:1 під твою структуру без “можливо”.