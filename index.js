require('dotenv').config();

const express = require('express');
const swaggerUi = require('swagger-ui-express');
const openapiDocument = require('./openapi.json');
const { Pool } = require('pg');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiDocument));

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      done BOOLEAN NOT NULL DEFAULT false
    )
  `);

  const { rows } = await pool.query('SELECT COUNT(*) AS count FROM tasks');
  if (parseInt(rows[0].count, 10) === 0) {
    await pool.query('INSERT INTO tasks (title, done) VALUES ($1, $2)', ['Buy milk', false]);
    await pool.query('INSERT INTO tasks (title, done) VALUES ($1, $2)', ['Walk the dog', true]);
    await pool.query('INSERT INTO tasks (title, done) VALUES ($1, $2)', ['Finish assignment', false]);
  }
}

/* ---------- AUTH GUARD MIDDLEWARE (A4 Stage 2-4) ---------- */
/**
 * Reads Authorization: Bearer <token>, verifies it with Supabase,
 * attaches the user to req.user, and calls next().
 * Returns 401 on any missing/malformed/invalid/expired token.
 */
async function authGuard(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.user = data.user;
  next();
}

app.get('/', (req, res) => {
  res.json({ name: "Task API", version: "1.0", endpoints: ["/tasks", "/auth", "/protected", "/public"] });
});

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: "ok", db: "ok" });
  } catch (err) {
    res.status(500).json({ status: "error", db: "unreachable" });
  }
});

/* ---------- PUBLIC ROUTE (A4 Stage 2) ---------- */

app.get('/public/info', (req, res) => {
  res.status(200).json({ message: "Welcome stranger! This info is public." });
});

/* ---------- AUTH ROUTES (A4 Stage 1 & 4) ---------- */

app.post('/auth/signup', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.status(201).json(data.user);
});

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return res.status(401).json({ error: "Invalid login credentials" });
  }

  res.status(200).json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token
  });
});

app.post('/auth/logout', authGuard, async (req, res) => {
  const { error } = await supabase.auth.signOut();

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.status(204).send();
});

/* ---------- PROTECTED ROUTES (A4 Stage 3-4) ---------- */

app.get('/protected/profile', authGuard, (req, res) => {
  const { id, email, created_at } = req.user;
  res.status(200).json({ id, email, created_at });
});

app.get('/protected/dashboard', authGuard, (req, res) => {
  res.status(200).json({ message: `Welcome back, ${req.user.email}. This is your dashboard.` });
});

/* ---------- TASK ROUTES (from A1-A3) ---------- */

app.get('/tasks', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM tasks');
  res.json(rows);
});

app.get('/tasks/:id', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
  const task = rows[0];
  if (!task) {
    return res.status(404).json({ error: `Task ${req.params.id} not found` });
  }
  res.json(task);
});

app.post('/tasks', async (req, res) => {
  const title = req.body.title;
  if (!title || title.trim() === '') {
    return res.status(400).json({ error: "title is required" });
  }
  const { rows } = await pool.query(
    'INSERT INTO tasks (title, done) VALUES ($1, $2) RETURNING *',
    [title, false]
  );
  res.status(201).json(rows[0]);
});

app.put('/tasks/:id', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
  const task = rows[0];
  if (!task) {
    return res.status(404).json({ error: `Task ${req.params.id} not found` });
  }
  const { title, done } = req.body;
  if (title !== undefined && title.trim() === '') {
    return res.status(400).json({ error: "title cannot be empty" });
  }
  const newTitle = title !== undefined ? title : task.title;
  const newDone = done !== undefined ? Boolean(done) : task.done;
  const updated = await pool.query(
    'UPDATE tasks SET title = $1, done = $2 WHERE id = $3 RETURNING *',
    [newTitle, newDone, req.params.id]
  );
  res.json(updated.rows[0]);
});

app.delete('/tasks/:id', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
  if (!rows[0]) {
    return res.status(404).json({ error: `Task ${req.params.id} not found` });
  }
  await pool.query('DELETE FROM tasks WHERE id = $1', [req.params.id]);
  res.status(204).send();
});

init()
  .then(() => {
    app.listen(process.env.PORT || 3000, () => {
      console.log(`Server running on http://localhost:${process.env.PORT || 3000} and connected to Supabase`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
