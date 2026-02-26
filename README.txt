# OLX Clone — Run locally from zero (Windows)

Repo:
- backend: ASP.NET Core Web API + EF Core + PostgreSQL (Docker) + JWT + Google Sign-In + SMTP reset
- frontend: React + TypeScript + Vite

## Потрібно мати : 
- .NET SDK 8+
- Node.js 18+
- Docker Desktop
- Git



------------------------------
Клонуємо
------------------------------
bash
git clone https://github.com/sashagorbatyuk/olx-clone
cd olx-clone
docker compose up -d
docker compose down -v
docker compose up -d



------------------------------
Backend config
------------------------------
Змінити під себе:
backend/src/OlxClone.Api/appsettings.Development.json
set ConnectionStrings (Postgres uses host port 5433 -> container 5432)
set Jwt settings
set GoogleAuth: ClientId (from Google Cloud)
(optional) Smtp налаштування для ресету паролю
If you don’t have EF tool: dotnet tool install --global dotnet-ef



------------------------------
Міграції + Запуск
------------------------------
cd backend
dotnet ef database update --project .\src\OlxClone.Infrastructure\OlxClone.Infrastructure.csproj --startup-project .\src\OlxClone.Api\OlxClone.Api.csproj --project .\src\OlxClone.Api\OlxClone.Api.csproj
dotnet run --project .\src\OlxClone.Api\OlxClone.Api.csproj

API: http://localhost:5015
Swagger: http://localhost:5015/swagger

------------------------------
ПЕРЕЗАПУСКИ
------------------------------
Фронт - ctrl + c, y, та npm run dev
Бек - docker ps + docker compose up -d
Перестворює дб з початку(всі дані стираються) - docker compose down -v + docker compose up -d, після цього знову міграції
