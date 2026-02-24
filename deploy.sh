#!/bin/bash
set -e

echo "================================================"
echo "  Compliance Circle — Production Deploy"
echo "================================================"
echo ""

# Check .env exists
if [ ! -f .env ]; then
    echo "ERROR: .env file not found."
    echo "Copy .env.example to .env and fill in your values:"
    echo "  cp .env.example .env"
    exit 1
fi

# Check JWT_SECRET is set
if grep -q "change-me" .env 2>/dev/null; then
    echo "WARNING: JWT_SECRET looks like a placeholder."
    echo "Generate a proper secret with: openssl rand -hex 32"
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo ""
    [[ $REPLY =~ ^[Yy]$ ]] || exit 1
fi

echo "1/5  Installing dependencies..."
npm ci

echo ""
echo "2/5  Pulling latest base images..."
docker compose pull db

echo ""
echo "3/5  Building application image..."
docker compose build --no-cache app

echo ""
echo "4/5  Restarting services..."
docker compose up -d

echo ""
echo "5/5  Waiting for services to be healthy..."
# Wait for db health check
timeout=60
elapsed=0
while [ $elapsed -lt $timeout ]; do
    if docker compose ps db --format '{{.Health}}' 2>/dev/null | grep -q "healthy"; then
        break
    fi
    sleep 2
    elapsed=$((elapsed + 2))
done

# Wait a few more seconds for the app to start and run migrations
sleep 5

# Check app is running
if docker compose ps app --format '{{.Status}}' 2>/dev/null | grep -q "Up"; then
    echo ""
    echo "================================================"
    APP_PORT=$(grep -E "^APP_PORT=" .env 2>/dev/null | cut -d= -f2)
    APP_PORT=${APP_PORT:-3000}
    echo "  Deploy complete!"
    echo "  App running at http://localhost:${APP_PORT}"
    echo "================================================"
else
    echo ""
    echo "ERROR: App container is not running. Check logs:"
    echo "  docker compose logs app"
    exit 1
fi
