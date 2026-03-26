#!/bin/bash
set -e

echo "[ORION] Pulling latest from staging..."
git pull origin staging

echo "[ORION] Building Docker image..."
docker build -t orion-backend:latest .

echo "[ORION] Stopping existing container..."
docker stop orion 2>/dev/null || true
docker rm orion 2>/dev/null || true

echo "[ORION] Starting new container..."
docker run -d \
  --name orion \
  --env-file .env \
  -p 3000:3000 \
  --restart unless-stopped \
  orion-backend:latest

echo "[ORION] Deployed successfully."
docker ps --filter name=orion
