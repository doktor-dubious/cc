# Docker Start

Start the Compliance Circle application using Docker Compose.

## Usage

Supports two modes via an optional argument:

- `/docker-start` or `/docker-start dev` — starts the **dev** profile (app-dev + db, with hot reload)
- `/docker-start prod` — starts the **prod** profile (app + db, production build)

## Instructions

1. Determine the mode from the argument (default: `dev`).
2. Run the appropriate command:
   - **dev**: `docker compose --profile dev up -d`
   - **prod**: `docker compose --profile prod up -d --build`
3. After starting, run `docker compose ps` to confirm the containers are running and show the user the status.
4. Tell the user the URL:
   - dev: `http://localhost:3001`
   - prod: `http://localhost:3000`
   (unless `APP_PORT` is overridden in `.env`)
