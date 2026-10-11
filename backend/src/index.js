const express = require('express');
const cors = require('cors');
const { pool, init } = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
  } catch (e) {
    res.status(500).json({ status: 'db_down' });
  }
});

app.get('/api/students', async (_req, res) => {
  const [rows] = await pool.query('SELECT * FROM students ORDER BY roll_no');
  res.json(rows);
});

app.post('/api/students', async (req, res) => {
  const { name, roll_no } = req.body;
  if (!name || !roll_no) return res.status(400).json({ error: 'name and roll_no required' });
  try {
    const [result] = await pool.query(
      'INSERT INTO students(name, roll_no) VALUES(?, ?)', [name, roll_no]);
    res.status(201).json({ id: result.insertId, name, roll_no });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'roll_no already exists' });
    console.error(e);
    res.status(500).json({ error: 'server error' });
  }
});

app.delete('/api/students/:id', async (req, res) => {
  await pool.query('DELETE FROM students WHERE id = ?', [req.params.id]);
  res.status(204).end();
});

app.get('/api/attendance', async (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  const [rows] = await pool.query(
    `SELECT s.id, s.name, s.roll_no, COALESCE(a.present, 0) AS present
     FROM students s LEFT JOIN attendance a ON a.student_id = s.id AND a.date = ?
     ORDER BY s.roll_no`, [date]);
  res.json({ date, records: rows.map(r => ({ ...r, present: !!r.present })) });
});

app.post('/api/attendance', async (req, res) => {
  const { date, records } = req.body; // records: [{student_id, present}]
  if (!date || !Array.isArray(records)) return res.status(400).json({ error: 'bad payload' });
  for (const rec of records) {
    await pool.query(
      `INSERT INTO attendance(student_id, date, present) VALUES(?, ?, ?)
       ON DUPLICATE KEY UPDATE present = VALUES(present)`,
      [rec.student_id, date, rec.present ? 1 : 0]);
  }
  res.json({ saved: records.length });
});

app.get('/api/report', async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT s.id, s.name, s.roll_no,
            COALESCE(SUM(a.present), 0) AS present_days,
            COUNT(a.student_id) AS total_days
     FROM students s LEFT JOIN attendance a ON a.student_id = s.id
     GROUP BY s.id, s.name, s.roll_no ORDER BY s.roll_no`);
  res.json(rows.map(r => ({
    ...r, present_days: Number(r.present_days), total_days: Number(r.total_days),
  })));
});

const PORT = process.env.PORT || 5000;

async function start() {
  for (let i = 0; i < 20; i++) {          // wait for DB to come up
    try { await init(); break; }
    catch (e) { console.log('DB not ready, retrying...', e.code || e.message); await new Promise(r => setTimeout(r, 2000)); }
  }
  app.listen(PORT, () => console.log(`API listening on ${PORT}`));
}

if (require.main === module) start();
module.exports = app;
