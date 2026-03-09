#!/bin/bash

# Run all three services concurrently with tagged log output

# Start server (Python uvicorn)
(cd ./server && uvicorn main:app --reload --port 8000 2>&1 | sed 's/^/[Srv] /') &

# Start backend (Node.js)
(cd ./backend && npm run dev 2>&1 | sed 's/^/[Bak] /') &

# Start frontend (Node.js)
(cd ./frontend && npm run dev 2>&1 | sed 's/^/[Frt] /') &

# Wait for all background processes
wait
