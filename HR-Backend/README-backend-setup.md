# HR Backend - Setup

This file documents how to set up the backend locally for development.

Prerequisites
- Node.js (>= 16)
- PostgreSQL running locally or accessible via a connection string

Install dependencies

From the `HR-Backend` folder run (PowerShell):

```powershell
# If your PowerShell blocks npm scripts, run in cmd.exe or temporarily allow script execution:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process; npm install
# or simply use the npm.cmd binary from PowerShell:
npm.cmd install
```

Environment variables

Create a `.env` file in the project root with:

```
PORT=5001
DATABASE_URL=postgres://postgres:your_password@localhost:5432/your_database_name
JWT_SECRET=your_jwt_secret_here
# Optional (for S3 uploads)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=
AWS_REGION=
```

You can also copy the provided `.env.example` and update the values:

```powershell
copy .env.example .env
# then edit .env with your secrets
``` 

DB sync (development only)

To create/alter tables automatically in development:

```powershell
node scripts/sync-db.js
```

Run server

```powershell
npm run dev
# or
node src/index.js
```

Swagger docs

Open `http://localhost:5001/api/docs` to view the API documentation.

Notes
- The upload presign endpoint returns a mock URL unless AWS credentials and S3 bucket are configured.
- The onboarding endpoints are protected by JWT; use `/api/auth/login` to get a token.

