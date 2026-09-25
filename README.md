# Todo API — with Supabase Auth

A CRUD to-do API secured with **Supabase Auth**. Handles sign up, log in, log
out, and guards protected routes by verifying JWTs on every request via
Supabase — no passwords hashed or stored by this code.

## Setup

### Option A — Docker (one command)
```bash
docker compose up
```
This starts the API and a Postgres database together. Copy `.env.example` to
`.env` first and fill in your Supabase values (see below).

### Option B — Manual
1. Start Postgres yourself, e.g.:
```bash
   docker run --name todo-postgres -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=dev -e POSTGRES_DB=tasks -p 5432:5432 -d postgres
```
2. Install dependencies:
```bash
   npm install
```
3. Copy `.env.example` to `.env` and fill in your own values: