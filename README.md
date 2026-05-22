# DKP_NSU — сайт программы повышения квалификации

Сайт регистрации участников программы **«Денежно-кредитная политика: базовые знания
и образовательные практики в подготовке специалистов социально-экономического
профиля»** (30 сентября — 1 октября 2026, НГУ, Новосибирск; СГУ Банка России × НГУ).

## Стек

- **Next.js 14** (App Router, Server Actions)
- **Prisma 5** + **SQLite** (локально; в production легко заменяется на PostgreSQL)
- **NextAuth.js v5** (Credentials provider, JWT-сессии, bcrypt)
- **Tailwind CSS**
- **TypeScript**, **Zod**

## Быстрый старт

```bash
# 1. Установить зависимости
npm install

# 2. Создать файл с переменными окружения
cp .env.example .env
# в .env подставьте AUTH_SECRET (любая случайная строка):
#   openssl rand -base64 32

# 3. Создать БД и таблицы (SQLite в prisma/dev.db)
npx prisma db push

# 4. Создать первого администратора
npm run db:seed
#   логин/пароль берутся из SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD
#   по умолчанию: admin@example.com / admin12345

# 5. Запустить dev-сервер
npm run dev
# открыть http://localhost:3000
```

## Что есть на сайте

| Маршрут          | Назначение                                                  |
| ---------------- | ----------------------------------------------------------- |
| `/`              | Лендинг программы                                           |
| `/auth/register` | Регистрация (e-mail + пароль)                               |
| `/auth/login`    | Вход                                                        |
| `/consent`       | Согласие на обработку персональных данных (152-ФЗ)         |
| `/dashboard`     | Личный кабинет — анкета участника                           |
| `/admin`         | Админ-панель (только для роли `ADMIN`)                      |
| `/api/auth/*`    | Эндпоинты NextAuth                                          |

## Поля анкеты (по ТЗ)

- ФИО полностью
- Наименование высшего учебного заведения
- Город
- Подразделение вуза (институт, факультет), в котором вы работаете
- Должность
- Контактный телефон
- E-mail

**Сохранение анкеты заблокировано до подтверждения согласия на обработку
персональных данных.** Согласие фиксируется отдельной отметкой флажка на
странице `/consent`, дата подтверждения записывается в БД.

## Выдача админских прав

Три способа.

**Через админ-панель.** Существующий админ открывает `/admin`, в таблице
пользователей в поле «Роль» выбирает `ADMIN` и нажимает «Применить».

**Через Prisma Studio.** GUI-инспектор БД:

```bash
npm run db:studio
# откройте http://localhost:5555, в таблице User
# поменяйте поле role у нужной строки на ADMIN
```

**Через seed-скрипт.** Используется для первого запуска:

```bash
SEED_ADMIN_EMAIL=me@example.com SEED_ADMIN_PASSWORD=qwerty12 npm run db:seed
```

Скрипт идемпотентен: если пользователь уже существует, ему просто выдаётся
роль `ADMIN`.

## Что показывает админ-панель

- общее число зарегистрированных пользователей;
- сколько из них заполнили анкету;
- сколько подтвердили согласие на ОПД;
- полная таблица пользователей с персональными данными;
- управление ролями (USER ↔ ADMIN), удаление пользователей.

## История git

Проект разбит на этапы — каждый этап отдельным коммитом, чтобы можно было
откатиться к любому состоянию (`git log --oneline`):

1. `chore: initial Next.js + Tailwind scaffold` — каркас проекта.
2. `feat(db): Prisma schema (User, Profile, Role) + seed` — БД и сидинг.
3. `feat(auth): NextAuth.js v5 credentials + middleware` — авторизация.
4. `feat(ui): pages /, /auth/login, /auth/register` — публичный UI.
5. `feat(consent): страница согласия + блокировка без флажка` — 152-ФЗ.
6. `feat(dashboard): личный кабинет с анкетой` — кабинет пользователя.
7. `feat(admin): админ-панель и управление ролями` — админ-фичи.
8. `docs: README` — документация.

Откатиться к предыдущему этапу:

```bash
git log --oneline           # увидеть список этапов
git checkout <hash>          # посмотреть состояние
git reset --hard <hash>      # жёстко откатиться
```

## Структура каталогов

```
src/
  app/
    layout.tsx               # шапка/футер, навигация
    page.tsx                 # лендинг
    auth/
      login/                 # /auth/login
      register/              # /auth/register
    consent/                 # /consent — согласие на ОПД
    dashboard/               # /dashboard — кабинет
    admin/                   # /admin — админ-панель
    api/auth/[...nextauth]/  # NextAuth handlers
  lib/
    auth.ts                  # конфигурация NextAuth + типы Session
    prisma.ts                # singleton PrismaClient
    actions/
      register.ts            # серверное действие — регистрация
      login.ts               # серверное действие — вход
      consent.ts             # серверное действие — согласие
      profile.ts             # серверное действие — анкета
      admin.ts               # серверное действие — роли / удаление
  middleware.ts              # защита /dashboard и /admin
prisma/
  schema.prisma              # модели User, Profile, Role
  seed.ts                    # создание первого админа
_legacy/                     # исходный статический index.html и материалы
```

## Production

При выкатке смените `provider = "sqlite"` в `prisma/schema.prisma` на
`postgresql`, задайте `DATABASE_URL` (например, на Vercel Postgres), а в
`.env` обязательно проставьте новый `AUTH_SECRET` и корректный `AUTH_URL`.
