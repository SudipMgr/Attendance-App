# Attendance App

Student attendance web app: React (Vite) frontend, Node/Express API, MySQL.

## Run locally with Docker
    cp deploy/.env.example .env   # then edit the values
    docker compose up -d --build
App: http://localhost:8080

## Deploy (server)
    cd deploy && cp .env.example .env   # set a real password
    docker compose up -d
Images are published to Docker Hub as sudipmgr/attendance-backend and sudipmgr/attendance-frontend.
