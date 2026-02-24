@echo off
start "Python Server" cmd /k "cd server && uvicorn main:app --reload --port 8000"
start "Node Backend" cmd /k "cd backend && npm run dev"
start "React Frontend" cmd /k "cd frontend && npm run dev"
