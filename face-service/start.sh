#!/bin/bash
# Start ArcFace FastAPI service on port 5050
cd "$(dirname "$0")"
./venv/bin/python -m uvicorn main:app --host 0.0.0.0 --port 5050 --workers 1
