# OLX Clone — Run locally from zero (Windows)

This repo contains:
- **backend**: ASP.NET Core Web API + EF Core + PostgreSQL + JWT + Google Sign-In + SMTP reset
- **frontend**: React + TypeScript + Vite

Follow the steps exactly.

---

## 0) Requirements
Install:
- **.NET SDK 8+**
- **Node.js 18+**
- **Docker Desktop**
- **Git**

---

## 1) Clone repo
```bash
git clone https://github.com/sashagorbatyuk/olx-clone
cd <REPO_FOLDER>

DOCKER: 
docker compose up -d
docker compose up -d

Configure appsettings.Development.json
Потрібно підставити свою інфу з гугл клауду

Зробити міграції
cd backend
dotnet ef database update --project .\src\OlxClone.Infrastructure\OlxClone.Infrastructure.csproj
dotnet ef --startup-project .\src\OlxClone.Api\OlxClone.Api.csproj

Якщо дотнету нема - в корні olx clone - dotnet tool install --global dotnet-ef

Запустити бекенд - dotnet run --project .\src\OlxClone.Api\OlxClone.Api.csproj

API: http://localhost:5015
Swagger: http://localhost:5015/swagger

Для енву також потрібно вставити свій гугл кліент айді

VITE_API_BASE_URL=http://localhost:5015
VITE_GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID

Для фронтенду просто запустіть ці програми з корню проекту 

cd frontend
npm install
npm run dev

все запуститься на http://localhost:5173

ПЕРЕЗАПУСКИ

Фронт - ctrl + c, y, та npm run dev
Бек - docker ps + docker compose up -d
Перестворює дб з початку(всі дані стираються) - docker compose down -v + docker compose up -d, після цього знову міграції

Frontend: http://localhost:5173

Swagger: http://localhost:5015/swagger
