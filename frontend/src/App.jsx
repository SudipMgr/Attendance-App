import { useCallback, useEffect, useState } from 'react';

/* ---------- helpers ---------- */
const SERVER_DOWN =
  "Can't reach the server. Make sure the backend is running on port 5000 and MySQL is started.";

const pad = (n) => String(n).padStart(2, '0');
const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromISO = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const shiftDate = (iso, days) => {
  const d = fromISO(iso);
  d.setDate(d.getDate() + days);
  return toISO(d);
};
const prettyDate = (iso) =>
  fromISO(iso).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
const sortRecords = (list) =>
  [...list].sort((a, b) => a.roll_no.localeCompare(b.roll_no, undefined, { numeric: true }));

async function api(path, options) {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong. Try again.');
  return data;
}

/* ---------- icons ---------- */
function Icon({ name }) {
  const paths = {
    left: 'M15 5l-7 7 7 7',
    right: 'M9 5l7 7-7 7',
    search: 'M11 4a7 7 0 100 14 7 7 0 000-14zm9 16l-4-4',
  };
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  );
}

/* ---------- roll call ---------- */
function RollCall({ date, onDateChange, records, loading, dirty, saving, onSet, onSetAll, onSave, onGoStudents }) {
  const [query, setQuery] = useState('');
  const presentCount = records.filter((r) => r.present).length;
  const q = query.trim().toLowerCase();
  const visible = records.filter((r) => `${r.name} ${r.roll_no}`.toLowerCase().includes(q));
  const isToday = date === toISO(new Date());

  return (
    <section aria-labelledby="day-title">
      <div className="day">
        <div className="day-nav">
          <button className="icon-btn" onClick={() => onDateChange(shiftDate(date, -1))} aria-label="Previous day">
            <Icon name="left" />
          </button>
          <button className="icon-btn" onClick={() => onDateChange(shiftDate(date, 1))} aria-label="Next day">
            <Icon name="right" />
          </button>
          <button className="pill" onClick={() => onDateChange(toISO(new Date()))} disabled={isToday}>
            Today
          </button>
          <label className="date-pick">
            <span className="sr-only">Choose a date</span>
            <input type="date" value={date} onChange={(e) => e.target.value && onDateChange(e.target.value)} />
          </label>
        </div>
        <h1 id="day-title" className="day-title">{prettyDate(date)}</h1>
      </div>

      {records.length > 0 && (
        <div className="tally">
          <div className="tally-bars" aria-hidden="true">
            {records.map((r) => (
              <span key={r.id} className={r.present ? 'on' : ''} />
            ))}
          </div>
          <p className="tally-text" aria-live="polite">
            <strong>{presentCount}</strong> of {records.length} present
          </p>
        </div>
      )}

      {loading && <p className="muted pad">Loading the roll…</p>}

      {!loading && records.length === 0 && (
        <div className="empty">
          <h2>No students yet</h2>
          <p>Add the students in your class and they will appear here for roll call.</p>
          <button className="btn" onClick={onGoStudents}>Add students</button>
        </div>
      )}

      {!loading && records.length > 0 && (
        <>
          <div className="toolbar">
            <label className="search">
              <Icon name="search" />
              <span className="sr-only">Search students</span>
              <input
                type="search"
                placeholder="Search by name or roll number"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <div className="bulk">
              <button className="btn btn-quiet" onClick={() => onSetAll(true)}>Mark all present</button>
              <button className="btn btn-quiet" onClick={() => onSetAll(false)}>Mark all absent</button>
            </div>
          </div>

          <ul className="roll">
            {visible.map((r) => (
              <li key={r.id} className={`row ${r.present ? 'is-present' : ''}`}>
                <span className="roll-no">{r.roll_no}</span>
                <span className="name">{r.name}</span>
                <div className="seg" role="group" aria-label={`Attendance for ${r.name}`}>
                  <button className="seg-present" aria-pressed={r.present} onClick={() => onSet(r.id, true)}>
                    Present
                  </button>
                  <button className="seg-absent" aria-pressed={!r.present} onClick={() => onSet(r.id, false)}>
                    Absent
                  </button>
                </div>
              </li>
            ))}
            {visible.length === 0 && <li className="row-empty">No student matches “{query}”.</li>}
          </ul>

          <div className="savebar">
            <p className={dirty ? 'unsaved' : 'muted'}>
              {dirty ? 'You have unsaved changes' : 'All changes saved'}
            </p>
            <button className="btn" onClick={onSave} disabled={!dirty || saving}>
              {saving ? 'Saving…' : 'Save attendance'}
            </button>
          </div>
        </>
      )}
    </section>
  );
}

/* ---------- students ---------- */
function Students({ records, onAdd, onRemove }) {
  const [name, setName] = useState('');
  const [roll, setRoll] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmId, setConfirmId] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !roll.trim()) return setErr('Enter both a name and a roll number.');
    setBusy(true);
    try {
      await onAdd(name.trim(), roll.trim());
      setName('');
      setRoll('');
      setErr('');
    } catch (ex) {
      setErr(ex.message === 'Failed to fetch' ? SERVER_DOWN : ex.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="students-title">
      <h1 id="students-title" className="page-title">Students</h1>

      <form className="add" onSubmit={submit}>
        <label className="field field-roll">
          <span>Roll number</span>
          <input value={roll} onChange={(e) => setRoll(e.target.value)} placeholder="e.g. 14" />
        </label>
        <label className="field field-name">
          <span>Full name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Anita Sharma" />
        </label>
        <button className="btn" type="submit" disabled={busy}>
          {busy ? 'Adding…' : 'Add student'}
        </button>
      </form>
      {err && <p className="error" role="alert">{err}</p>}

      <h2 className="list-title">
        {records.length === 0 ? 'Class list' : `Class list (${records.length})`}
      </h2>
      {records.length === 0 ? (
        <p className="muted pad">Nobody has been added yet. Use the form above to add your first student.</p>
      ) : (
        <ul className="roll">
          {records.map((r) => (
            <li key={r.id} className="row row-plain">
              <span className="roll-no">{r.roll_no}</span>
              <span className="name">{r.name}</span>
              {confirmId === r.id ? (
                <div className="confirm">
                  <span>Remove {r.name} and their attendance history?</span>
                  <button className="btn btn-danger" onClick={() => { onRemove(r.id); setConfirmId(null); }}>
                    Yes, remove
                  </button>
                  <button className="btn btn-quiet" onClick={() => setConfirmId(null)}>Keep</button>
                </div>
              ) : (
                <button className="btn btn-quiet" onClick={() => setConfirmId(r.id)}>Remove</button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ---------- report ---------- */
const LOW = 75;

function Report({ report, loading }) {
  const rows = report.map((r) => {
    const total = Number(r.total_days);
    const present = Number(r.present_days);
    return { ...r, total, present, pct: total ? Math.round((present / total) * 100) : null };
  });
  const totalDays = rows.reduce((s, r) => s + r.total, 0);
  const totalPresent = rows.reduce((s, r) => s + r.present, 0);
  const average = totalDays ? Math.round((totalPresent / totalDays) * 100) : null;
  const low = rows.filter((r) => r.pct !== null && r.pct < LOW).length;

  return (
    <section aria-labelledby="report-title">
      <h1 id="report-title" className="page-title">Report</h1>

      {loading && <p className="muted pad">Loading the report…</p>}
      {!loading && rows.length === 0 && (
        <p className="muted pad">There is nothing to report yet. Add students and save a day of attendance first.</p>
      )}

      {!loading && rows.length > 0 && (
        <>
          <p className="report-summary">
            {average === null
              ? 'No attendance has been saved yet.'
              : `Class attendance is ${average}%. ${
                  low === 0 ? `Nobody is below ${LOW}%.` : `${low} ${low === 1 ? 'student is' : 'students are'} below ${LOW}%.`
                }`}
          </p>
          <ul className="roll">
            {rows.map((r) => (
              <li key={r.id} className="row row-report">
                <span className="roll-no">{r.roll_no}</span>
                <span className="name">{r.name}</span>
                <div className="meter-wrap">
                  <div className="meter" aria-hidden="true">
                    <span
                      className={r.pct !== null && r.pct < LOW ? 'low' : ''}
                      style={{ width: `${r.pct ?? 0}%` }}
                    />
                  </div>
                  <span className={`pct ${r.pct !== null && r.pct < LOW ? 'low' : ''}`}>
                    {r.pct === null ? 'No days yet' : `${r.pct}%`}
                  </span>
                  <span className="days muted">{r.present} of {r.total} days</span>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

/* ---------- app ---------- */
export default function App() {
  const [tab, setTab] = useState('roll');
  const [date, setDate] = useState(toISO(new Date()));
  const [records, setRecords] = useState([]);
  const [baseline, setBaseline] = useState({});
  const [report, setReport] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const dirty = records.some((r) => baseline[r.id] !== r.present);

  const loadDay = useCallback(async (d) => {
    setLoading(true);
    try {
      const a = await api(`/attendance?date=${d}`);
      const list = sortRecords(a.records);
      setRecords(list);
      setBaseline(Object.fromEntries(list.map((r) => [r.id, r.present])));
      setError('');
    } catch {
      setError(SERVER_DOWN);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadReport = useCallback(async () => {
    setReportLoading(true);
    try {
      setReport(sortRecords(await api('/report')));
      setError('');
    } catch {
      setError(SERVER_DOWN);
    } finally {
      setReportLoading(false);
    }
  }, []);

  useEffect(() => { loadDay(date); }, [date, loadDay]);
  useEffect(() => { if (tab === 'report') loadReport(); }, [tab, loadReport]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const changeDate = (next) => {
    if (next === date) return;
    if (dirty && !window.confirm('You have unsaved changes for this day. Leave without saving?')) return;
    setDate(next);
  };

  const setPresent = (id, value) =>
    setRecords((rs) => rs.map((r) => (r.id === id ? { ...r, present: value } : r)));
  const setAll = (value) => setRecords((rs) => rs.map((r) => ({ ...r, present: value })));

  const save = async () => {
    setSaving(true);
    try {
      await api('/attendance', {
        method: 'POST',
        body: JSON.stringify({
          date,
          records: records.map((r) => ({ student_id: r.id, present: r.present })),
        }),
      });
      setBaseline(Object.fromEntries(records.map((r) => [r.id, r.present])));
      setToast('Attendance saved');
      setError('');
    } catch (ex) {
      setError(ex.message === 'Failed to fetch' ? SERVER_DOWN : ex.message);
    } finally {
      setSaving(false);
    }
  };

  const addStudent = async (name, roll_no) => {
    const s = await api('/students', { method: 'POST', body: JSON.stringify({ name, roll_no }) });
    setRecords((rs) => sortRecords([...rs, { ...s, present: false }]));
    setBaseline((b) => ({ ...b, [s.id]: false }));
    setToast(`${name} added`);
  };

  const removeStudent = async (id) => {
    try {
      await api(`/students/${id}`, { method: 'DELETE' });
      setRecords((rs) => rs.filter((r) => r.id !== id));
      setToast('Student removed');
    } catch (ex) {
      setError(ex.message === 'Failed to fetch' ? SERVER_DOWN : ex.message);
    }
  };

  const tabs = [
    { id: 'roll', label: 'Roll call' },
    { id: 'students', label: 'Students' },
    { id: 'report', label: 'Report' },
  ];

  return (
    <>
      <header className="top">
        <div className="top-inner">
          <span className="brand">Attendance</span>
          <nav aria-label="Main">
            {tabs.map((t) => (
              <button
                key={t.id}
                className="tab"
                aria-current={tab === t.id ? 'page' : undefined}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="page">
        {error && <div className="banner" role="alert">{error}</div>}

        {tab === 'roll' && (
          <RollCall
            date={date}
            onDateChange={changeDate}
            records={records}
            loading={loading}
            dirty={dirty}
            saving={saving}
            onSet={setPresent}
            onSetAll={setAll}
            onSave={save}
            onGoStudents={() => setTab('students')}
          />
        )}
        {tab === 'students' && <Students records={records} onAdd={addStudent} onRemove={removeStudent} />}
        {tab === 'report' && <Report report={report} loading={reportLoading} />}
      </main>

      <div className="toast-region" aria-live="polite">
        {toast && <div className="toast">{toast}</div>}
      </div>
    </>
  );
}
