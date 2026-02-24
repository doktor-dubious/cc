#!/bin/sh
set -e

echo "Running Prisma migrations..."
npx prisma db push 2>&1 || {
    echo "Warning: Prisma db push failed. Database may not be ready yet."
    echo "Retrying in 5 seconds..."
    sleep 5
    npx prisma db push
}

echo "Starting application..."
exec "$@"
