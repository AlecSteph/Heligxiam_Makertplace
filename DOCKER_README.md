# Docker Setup for Auth Microservice

## Prerequisites
- Docker Desktop installed and running
- At least 2GB free RAM

## Quick Start

1. **Start Docker Desktop** (if not already running)

2. **Navigate to the auth-service directory:**
   ```bash
   cd BACKEND/auth-service
   ```

3. **Build and run the containers:**
   ```bash
   docker-compose up --build
   ```

   Or run in background:
   ```bash
   docker-compose up --build -d
   ```

4. **Check the logs:**
   ```bash
   docker-compose logs -f auth-service
   ```

5. **Test the service:**
   The auth service will be available at `http://localhost:3001`

## Services

- **auth-service**: Node.js Express API on port 3001
- **postgres**: PostgreSQL database on port 5432

## Environment Variables

All necessary environment variables are configured in `docker-compose.yml`. In production, update the secrets:
- `JWT_SECRET`
- `PEPPER`
- `DB_PASSWORD`

## Database

The database is automatically initialized with the schema from `../HELIGXIAM.sql` on first run.

## Stopping the Services

```bash
docker-compose down
```

To also remove volumes (including database data):
```bash
docker-compose down -v
```

## Troubleshooting

- **Port conflicts**: Ensure ports 3001 and 5432 are free
- **Docker not running**: Start Docker Desktop
- **Build fails**: Check Node.js version compatibility
- **Database connection fails**: Wait for postgres healthcheck to pass