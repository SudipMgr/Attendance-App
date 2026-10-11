# Student Attendance App (React + Node + MySQL)

A small full-stack app: React (Vite) frontend, Node/Express backend, MySQL/MariaDB database
(works with the one that comes with XAMPP). No deployment/DevOps files are included on purpose.

## Features
- Add / delete students
- Mark attendance per date
- Per-student attendance report

## Structure
```
backend/    Express API (src/index.js, src/db.js)
frontend/   React app (src/App.jsx)
```

## Run locally with XAMPP
1. Start **Apache** and **MySQL** in the XAMPP Control Panel.
2. Open http://localhost/phpmyadmin -> New -> create a database named `attendance`
   (collation utf8mb4_general_ci). Tables are created automatically by the backend.
3. Backend:
   ```bash
   cd backend
   npm install
   npm start
   ```
4. Frontend (second terminal):
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
5. Open http://localhost:5173

## Backend environment variables (defaults in brackets)
```
PORT        (5000)
DB_HOST     (localhost)
DB_PORT     (3306)
DB_USER     (root)
DB_PASSWORD (empty - XAMPP default)
DB_NAME     (attendance)
```

## Production note
The frontend calls the API with relative URLs (`/api/...`). After `npm run build`
(output in frontend/dist), something such as a reverse proxy must route `/api` to the backend.

## API
| Method | Path | Description |
|---|---|---|
| GET | /api/health | Health + DB check |
| GET | /api/students | List students |
| POST | /api/students | `{name, roll_no}` |
| DELETE | /api/students/:id | Remove student |
| GET | /api/attendance?date=YYYY-MM-DD | Attendance for a date |
| POST | /api/attendance | `{date, records:[{student_id, present}]}` |
| GET | /api/report | Present/total days per student |
