# DynamoDB Migration Plan

## Decision

Migrate incrementally from PostgreSQL/Sequelize to DynamoDB. Do not attempt a
table-for-table conversion or change the frontend API contracts during the
migration. The portal has relational onboarding writes, employee/admin views,
and sensitive HR data; replacing Sequelize directly would make the cutover
hard to test and hard to reverse.

The target is one `hr-portal-<environment>` DynamoDB table, with an S3 bucket
for uploaded files. The backend owns all DynamoDB access through repository
modules. The browser must never receive AWS credentials or call DynamoDB
directly.

## Target infrastructure

- DynamoDB table: on-demand capacity, point-in-time recovery enabled,
  server-side encryption with a customer-managed AWS KMS key.
- S3 bucket: private, KMS-encrypted, versioning enabled; DynamoDB stores only
  document metadata and S3 object keys.
- IAM: a task role/user with least-privilege access to this table and upload
  bucket. No long-lived AWS keys in source control or frontend environment
  variables.
- CloudWatch: alarms for errors, throttling, and unusually high consumed
  capacity.

## Data model

Use `PK` and `SK` as the DynamoDB primary key. IDs should be UUIDs for all new
items. During import, retain the existing PostgreSQL ID as `legacyId` so links
and API responses can be reconciled.

| Entity / access pattern | PK | SK | Notes |
| --- | --- | --- | --- |
| Employee profile | `EMP#<employeeId>` | `PROFILE` | Core profile only; encrypt especially sensitive fields. |
| Employee login mapping | `USER#<userId>` | `PROFILE` | Includes employee ID and role. |
| Employee onboarding section | `EMP#<employeeId>` | `ONBOARDING#<section>` | One item per personal, education, work, skills, documents, etc. Prevents the 400 KB item limit. |
| Spouse / dependant | `EMP#<employeeId>` | `DEPENDANT#<dependantId>` | One item per dependant. |
| Document metadata | `EMP#<employeeId>` | `DOCUMENT#<documentId>` | Store S3 key, MIME type, checksum, status, and expiry; never the file bytes. |
| Timesheet entry | `EMP#<employeeId>` | `TIMESHEET#<YYYY-MM-DD>#<entryId>` | Query employee entries by date range without a scan. |
| Payroll record | `EMP#<employeeId>` | `PAYROLL#<YYYY-MM-DD>#<payrollId>` | File metadata points to S3. |
| Edit request | `EMP#<employeeId>` | `EDIT_REQUEST#<createdAt>#<requestId>` | Include status and section key. |
| Audit event | `EMP#<employeeId>` | `AUDIT#<createdAt>#<eventId>` | Immutable append-only record. |
| Project assignment | `EMP#<employeeId>` | `PROJECT#<projectId>` | Denormalize project/client labels required by the UI. |
| Company configuration | `ORG#DEFAULT` | `SETTINGS` / `ANNOUNCEMENT#...` | Use a tenant ID instead of `DEFAULT` if multiple companies are required. |

### Required GSIs

| Index | Partition key | Sort key | Supports |
| --- | --- | --- | --- |
| `GSI1` | `GSI1PK` | `GSI1SK` | Login by normalized email: `EMAIL#<email>` → `USER#...`. |
| `GSI2` | `GSI2PK` | `GSI2SK` | Admin employee lists by onboarding/profile status: `EMPLOYEE_STATUS#<status>` → `<name>#<employeeId>`. |
| `GSI3` | `GSI3PK` | `GSI3SK` | Pending admin work: `EDIT_REQUEST#pending`, `TIMESHEET#Submitted`, `DOCUMENT_EXPIRY` → timestamp and employee ID. |
| `GSI4` | `GSI4PK` | `GSI4SK` | Project/client views, if required after measuring real access patterns. |

GSIs are eventually consistent. Approval screens must read the primary item
when a just-written status must be reflected immediately.

## Backend refactor

1. Add AWS SDK v3 packages: `@aws-sdk/client-dynamodb` and
   `@aws-sdk/lib-dynamodb`.
2. Create `src/repositories/` with interfaces for users, employees,
   onboarding, documents, timesheets, payroll, and admin queries.
3. Keep controllers and routes unchanged initially; move their Sequelize calls
   into the repository implementations.
4. Add a DynamoDB implementation alongside the existing Sequelize one. Select
   it with `DATA_STORE=postgres|dynamodb|dual`.
5. Replace relational onboarding transactions with `TransactWriteItems` for
   changes that must succeed together. Use conditional expressions for unique
   email creation, optimistic version checks, and duplicate-pending-request
   prevention.
6. Replace joins with targeted `Query` operations and small, intentional
   denormalized fields. Do not use `Scan` for admin lists or dashboards.

## Migration phases

### 1. Baseline and access-pattern inventory

- Fix the existing failing test baseline before moving data.
- List every API query by endpoint and confirm each one has a DynamoDB `Get`,
  `Query`, GSI query, or transaction design.
- Classify sensitive attributes: SSN, SIN, NI, TFN, PAN, Aadhaar, bank details,
  passports, visas, and document metadata. Apply field-level encryption for
  sensitive values and restrict audit-log access.

### 2. Build the data-access layer

- Implement repository interfaces and unit tests using DynamoDB Local or
  LocalStack.
- Implement the DynamoDB table and GSIs as infrastructure-as-code (AWS CDK,
  CloudFormation, or Terraform), not click-created production resources.
- Add structured logs and request IDs without logging sensitive HR values.

### 3. Backfill data

- Export PostgreSQL tables in dependency order and transform them into the
  item shapes above. A custom transformation is required because the target is
  intentionally denormalized.
- Batch-write with retry/backoff, a checkpoint file, and an import error
  report. Do not bulk-write document blobs; migrate them to S3 separately.
- Compare record counts and representative per-employee aggregates between
  PostgreSQL and DynamoDB.

### 4. Dual-write and shadow-read

- In `dual` mode, write to PostgreSQL first and DynamoDB second with an
  outbox/retry record for failed secondary writes.
- Shadow-read DynamoDB for selected endpoints and compare normalized results
  to PostgreSQL without changing user-visible responses.
- Run this until mismatch and retry rates are understood and resolved.

### 5. Cut over and retire PostgreSQL

- Switch reads endpoint by endpoint behind feature flags.
- Keep PostgreSQL read-only for an agreed rollback window.
- Take final backups, switch all reads to DynamoDB, then remove dual writes.
- Retire PostgreSQL only after reconciliation, performance, security review,
  and business sign-off.

## Acceptance gates

- All API tests pass against both storage implementations.
- No production path depends on a DynamoDB `Scan`.
- Backfill counts and sampled record checks reconcile exactly.
- Onboarding save/submission, document permissions, timesheet approval,
  payroll, employee search, and admin alerts pass end-to-end tests.
- IAM, KMS, backups, restore exercise, TTL policy, and monitoring are verified.

## Initial configuration

Add these only to the backend runtime environment (not the frontend):

```text
DATA_STORE=dual
AWS_REGION=<deployment-region>
DYNAMODB_TABLE=hr-portal-dev
DOCUMENTS_BUCKET=hr-portal-documents-dev
```

Use an IAM role in AWS deployments. For local development, use a named AWS
profile or DynamoDB Local rather than placing long-lived credentials in `.env`.
