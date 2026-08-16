const express = require('express');
const app = express();
app.use(express.json());

let tasks = [
  { id: 1, title: "Buy milk", done: false },
  { id: 2, title: "Walk the dog", done: true },
  { id: 3, title: "Finish assignment", done: false }
];
let nextId = 4;

app.get('/', (req, res) => {
  res.json({ name: "Task API", version: "1.0", endpoints: ["/tasks"] });
});

app.get('/health', (req, res) => {
  res.json({ status: "ok" });
});

app.get('/tasks', (req, res) => {
  res.json(tasks);
});

app.get('/tasks/:id', (req, res) => {
  const task = tasks.find(t => t.id === Number(req.params.id));
  if (!task) {
    return res.status(404).json({ error: `Task ${req.params.id} not found` });
  }
  res.json(task);
});

app.post('/tasks', (req, res) => {
  const title = req.body.title;
  if (!title || title.trim() === '') {
    return res.status(400).json({ error: "title is required" });
  }
  const newTask = { id: nextId++, title, done: false };
  tasks.push(newTask);
  res.status(201).json(newTask);
});

app.put('/tasks/:id', (req, res) => {
  const task = tasks.find(t => t.id === Number(req.params.id));
  if (!task) {
    return res.status(404).json({ error: `Task ${req.params.id} not found` });
  }
  const { title, done } = req.body;
  if (title !== undefined) {
    if (title.trim() === '') {
      return res.status(400).json({ error: "title cannot be empty" });
    }
    task.title = title;
  }
  if (done !== undefined) {
    task.done = done;
  }
  res.json(task);
});

app.delete('/tasks/:id', (req, res) => {
  const index = tasks.findIndex(t => t.id === Number(req.params.id));
  if (index === -1) {
    return res.status(404).json({ error: `Task ${req.params.id} not found` });
  }
  tasks.splice(index, 1);
  res.status(204).send();
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});