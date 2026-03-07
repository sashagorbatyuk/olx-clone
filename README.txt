# OLX Clone — Детальний гід запуску локально (Windows)

OLX Clone складається з 2 частин:
- **backend**: ASP.NET Core Web API + EF Core + PostgreSQL (Docker) + JWT + Google Sign-In + SMTP reset
- **frontend**: React + TypeScript + Vite

---

## 1) Передумови (що має бути встановлено)

Перед запуском переконайтесь, що у вас є:
- **.NET SDK 8+**
- **Node.js 18+** (рекомендовано LTS)
- **Docker Desktop** (запущений)
- **Git**

Перевірка версій у терміналі:

```bash
dotnet --version
node --version
npm --version
docker --version
git --version
```

---

## 2) Клонування репозиторію та запуск Docker для БД

```bash
git clone https://github.com/sashagorbatyuk/olx-clone
cd olx-clone
```

Підняти контейнери (PostgreSQL):

```bash
docker compose up -d
```

Перевірити, що контейнер працює:

```bash
docker ps
```

Якщо потрібно повністю скинути базу даних (видаляє **всі дані**):

```bash
docker compose down -v
docker compose up -d
```

---

## 3) Налаштування backend

Файл конфігурації для локального запуску:

`backend/src/OlxClone.Api/appsettings.Development.json`

Потрібно заповнити/перевірити:
- `ConnectionStrings` (Postgres: host-порт **5433** → container-порт **5432**)
- `Jwt` (ключ, issuer, audience, lifetime)
- `GoogleAuth:ClientId` (із Google Cloud)
- `Smtp` (опційно, для відновлення паролю через email)

> Якщо не встановлений EF CLI:

```bash
dotnet tool install --global dotnet-ef
```

---

## 4) Міграції та запуск backend

Перейдіть у папку backend:

```bash
cd backend
```

Застосуйте міграції:

```bash
dotnet ef database update --project .\src\OlxClone.Infrastructure\OlxClone.Infrastructure.csproj --startup-project .\src\OlxClone.Api\OlxClone.Api.csproj
```

Запустіть API:

```bash
dotnet run --project .\src\OlxClone.Api\OlxClone.Api.csproj
```

Після старту:
- API: `http://localhost:5015`
- Swagger: `http://localhost:5015/swagger`

---

## 5) Запуск frontend

У новому терміналі з кореня проєкту:

```bash
cd frontend
npm install
npm run dev
```

Зазвичай Vite запускається на:
- Frontend: `http://localhost:5173`

> Якщо порт зайнятий, Vite покаже інший порт у терміналі.

---

## 6) Рекомендований порядок першого запуску

1. `docker compose up -d` (з кореня репо)
2. Налаштувати `appsettings.Development.json`
3. `cd backend` → `dotnet ef database update`
4. `dotnet run --project .\src\OlxClone.Api\OlxClone.Api.csproj`
5. `cd frontend` → `npm install` → `npm run dev`

---

## 7) Повсякденні перезапуски

### Frontend
- Зупинка: `Ctrl + C`
- Повторний запуск:

```bash
cd frontend
npm run dev
```

### Backend
- Якщо API зупинили: просто знову `dotnet run ...`
- Якщо проблема з БД/контейнером:

```bash
docker ps
docker compose up -d
```

### Повний reset БД (видалення даних)

```bash
docker compose down -v
docker compose up -d
```

Після reset обов'язково знову виконати міграції:

```bash
cd backend
dotnet ef database update --project .\src\OlxClone.Infrastructure\OlxClone.Infrastructure.csproj --startup-project .\src\OlxClone.Api\OlxClone.Api.csproj
```

---

## 8) Типові проблеми та рішення

- **`dotnet ef` не знайдено**
  - Встановіть інструмент: `dotnet tool install --global dotnet-ef`
  - Перезапустіть термінал.

- **API не стартує через підключення до БД**
  - Перевірте, що Docker контейнер запущений: `docker ps`
  - Перевірте правильність `ConnectionStrings` у `appsettings.Development.json`.

- **Google Sign-In не працює локально**
  - Перевірте `GoogleAuth:ClientId`
  - Перевірте налаштування OAuth consent screen та authorized origins у Google Cloud.

- **Листи для reset password не приходять**
  - Перевірте `Smtp` параметри (host, port, user, pass, from).

---

## 9) Корисні команди (швидка пам'ятка)

```bash
# із кореня репо
docker compose up -d
docker compose down -v

# backend
cd backend
dotnet ef database update --project .\src\OlxClone.Infrastructure\OlxClone.Infrastructure.csproj --startup-project .\src\OlxClone.Api\OlxClone.Api.csproj
dotnet run --project .\src\OlxClone.Api\OlxClone.Api.csproj

# frontend
cd frontend
npm install
npm run dev
```
