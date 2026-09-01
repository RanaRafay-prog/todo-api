require('dotenv').config();

const express = require('express');
const swaggerUi = require('swagger-ui-express');
const openapiDocument = require('./openapi.json');
const { Pool } = require('pg');

const app = express();
app.use(express.json());
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiDocument));

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

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

app.get('/', (req, res) => {
  res.json({ name: "Task API", version: "1.0", endpoints: ["/tasks"] });
});

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: "ok", db: "ok" });
  } catch (err) {
    res.status(500).json({ status: "error", db: "unreachable" });
  }
});

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
    app.listen(3000, () => {
      console.log('Server running on http://localhost:3000');
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
