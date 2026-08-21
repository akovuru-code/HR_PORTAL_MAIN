# HR Backend API

This is the backend service for the HR Management Portal, built with Node.js, Express, and PostgreSQL.

## Setup

1. Install dependencies:
   ```sh
   npm install
   ```
2. Copy `.env` and update your PostgreSQL credentials:
   ```env
   PORT=5000
   DATABASE_URL=postgresql://username:password@localhost:5432/hr_db
   ```
3. Start the server:
   ```sh
   npm run dev
   ```

## Endpoints
- `GET /` — Health check
- `GET /api/test-db` — Test database connection

## Project Structure
- `src/index.js` — Main server file

---

You can now add routes, models, and controllers as needed for your HR portal.
