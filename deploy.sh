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

# Check secrets are not placeholders
has_placeholder=false
for var in JWT_SECRET BETTER_AUTH_SECRET; do
    if grep -qE "^${var}=change-me" .env 2>/dev/null; then
        echo "WARNING: ${var} looks like a placeholder."
        has_placeholder=true
    fi
done

if [ "$has_placeholder" = true ]; then
    echo "Generate proper secrets with: openssl rand -hex 32"
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo ""
    [[ $REPLY =~ ^[Yy]$ ]] || exit 1
fi

echo "1/4  Pulling latest base images..."
docker compose pull db

echo ""
echo "2/4  Building application image..."
docker compose build --no-cache app

echo ""
echo "3/4  Restarting services..."
docker compose --profile prod up -d

echo ""
echo "4/4  Waiting for services to be healthy..."
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

# Wait for the app to start and run prisma db push
sleep 5

# Check app is running
if docker compose ps app --format '{{.Status}}' 2>/dev/null | grep -q "Up"; then
    echo ""
    echo "================================================"
    PROD_PORT=$(grep -E "^PROD_PORT=" .env 2>/dev/null | cut -d= -f2)
    PROD_PORT=${PROD_PORT:-3000}
    echo "  Deploy complete!"
    echo "  App running at http://localhost:${PROD_PORT}"
    echo "================================================"
else
    echo ""
    echo "ERROR: App container is not running. Check logs:"
    echo "  docker compose logs app"
    exit 1
fi
