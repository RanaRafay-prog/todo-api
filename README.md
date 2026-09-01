# Task API

A small CRUD (Create, Read, Update, Delete) API for managing a to-do list, built with Node.js and Express.

Storage has moved through three stages:
- **A1** — in-memory array (reset on restart)
- **A2** — SQLite file (`tasks.db`)
- **A3 (this)** — PostgreSQL, running in Docker, started together with the app via `docker compose`

## Run everything with one command

```
git clone https://github.com/RanaRafay-prog/todo-api.git
cd todo-api
cp .env.example .env
docker compose up
```

The API is now running at http://localhost:3000, backed by a real Postgres database running in its own container. No local Postgres install, no manual table setup — `compose.yaml` starts both the `api` and `db` services, and the app creates and seeds the `tasks` table on first boot.

Interactive docs (Swagger UI): http://localhost:3000/docs

## Environment variables

Copy `.env.example` to `.env` before running. The only variable is:

| Variable | Meaning |
|---|---|
| `DATABASE_URL` | Postgres connection string, e.g. `postgres://postgres:dev@localhost:5432/tasks` |

`.env` is git-ignored — never commit real credentials. When run via `docker compose`, the `api` service gets its own `DATABASE_URL` pointing at the `db` service by name (not `localhost`), set directly in `compose.yaml`.

## Running without Docker Compose (Stages 0–3, for local dev)

1. Start Postgres by hand:
   ```
   docker run --name taskdb -e POSTGRES_PASSWORD=dev -e POSTGRES_DB=tasks \
     -p 5432:5432 -v taskdata:/var/lib/postgresql/data -d postgres
   ```
2. `npm install`
3. `node index.js`
4. Visit http://localhost:3000/tasks

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | / | API info |
| GET | /health | Health check (also pings the database) |
| GET | /tasks | List all tasks |
| GET | /tasks/:id | Get a single task by id |
| POST | /tasks | Create a new task |
| PUT | /tasks/:id | Update a task's title/done |
| DELETE | /tasks/:id | Delete a task |

## Example request

```
curl -i -X POST http://localhost:3000/tasks -H "Content-Type: application/json" -d "{\"title\":\"Buy milk\"}"
```

Response:
```
HTTP/1.1 201 Created
Content-Type: application/json; charset=utf-8

{"id":4,"title":"Buy milk","done":false}
```

## Persistence

Tasks now live in a named Docker volume (`taskdata`), not in the container itself. Run `docker compose down` then `docker compose up` again — the tasks you created are still there, because the volume outlives the container. Removing the volume (`docker compose down -v`) is what actually deletes the data — this is the "mortality experiment" from A1, now solved properly with a volume instead of a database engine choice.

## Database screenshot

![Postgres data](db-screenshot-postgres.png)

## Swagger UI

Swagger UI screenshot: swagger-screenshot.png
