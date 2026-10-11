# Production Deployment Guide: AiBus Backend on Render

This document provides complete, step-by-step instructions for deploying the **AiBus Backend Application** to [Render](https://render.com). It covers repository setup, database configuration (Supabase / PostgreSQL), Redis setup, environment variables, health checks, zero-downtime deployment, troubleshooting, and production verification.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Prerequisites](#2-prerequisites)
3. [Step 1: Database Setup & Migration (Supabase / PostgreSQL)](#3-step-1-database-setup--migration-supabase--postgresql)
4. [Step 2: Redis Configuration (Upstash / Render Redis)](#4-step-2-redis-configuration-upstash--render-redis)
5. [Step 3: Deploying on Render](#5-step-3-deploying-on-render)
   - [Method A: Deploy with Render Blueprint (`render.yaml`) — Recommended](#method-a-deploy-with-render-blueprint-renderyaml--recommended)
   - [Method B: Deploy Manually via Render Web Dashboard](#method-b-deploy-manually-via-render-web-dashboard)
6. [Step 4: Environment Variables Reference](#6-step-4-environment-variables-reference)
7. [Step 5: Health Checks & Lifecycle Management](#7-step-5-health-checks--lifecycle-management)
8. [Step 6: Production Verification & Smoke Tests](#8-step-6-production-verification--smoke-tests)
9. [Step 7: Troubleshooting Common Issues](#9-step-7-troubleshooting-common-issues)
10. [Step 8: Performance & Security Best Practices](#10-step-8-performance--security-best-practices)

---

## 1. Architecture Overview

The AiBus backend is built with:
- **Runtime**: Node.js (>= 18.0.0) with TypeScript compiled to JavaScript (`dist/`)
- **Web Framework**: Express 5.x with Helmet, CORS, HPP, compression, and rate limiting
- **ORM / Database**: Prisma Client 6.x connected to PostgreSQL (Supabase)
- **Caching & Queues**: Redis (ioredis) with BullMQ for asynchronous reconciliation, refunds, and notifications
- **External Providers**: Mantis GDS (bus inventory, booking, ticketing), PhonePe (payment gateway & refunds)

```
                            +-----------------------------------+
                            |       Render Load Balancer        |
                            |   (SSL Termination / Reverse Proxy)|
                            +-----------------+-----------------+
                                              |
                                              v (HTTP / PORT: 10000)
                            +-----------------------------------+
                            |        AiBus Node.js Backend      |
                            |           (Express 5.x)           |
                            +-------+-------------------+-------+
                                    |                   |
            +-----------------------+                   +-----------------------+
            |                                                                   |
            v                                                                   v
+---------------------------+                                       +---------------------------+
|    Supabase PostgreSQL    |                                       |      Cloud Redis Server   |
| (Connection Pooler :6543) |                                       |     (Upstash / Render)    |
| - Transactional data      |                                       | - Distributed seat locks  |
| - Automatic pooling       |                                       | - Search & layout cache   |
+---------------------------+                                       | - BullMQ background queues|
                                                                    +---------------------------+
```

---

## 2. Prerequisites

Before starting deployment, ensure you have:
1. A **GitHub** or **GitLab** account containing the `AiBus` backend repository.
2. A **Render** account ([https://dashboard.render.com](https://dashboard.render.com)).
3. A **Supabase** account ([https://supabase.com](https://supabase.com)) with an active project, or another hosted PostgreSQL instance.
4. A **Redis** instance:
   - Option A: **Upstash Redis** (Recommended: free tier, serverless, automated TLS, global latency).
   - Option B: **Render Managed Redis** (Available on Render paid plans).
   - Option C: **Redis Cloud** ([https://redis.com](https://redis.com)).
5. Production/Sandbox credentials for **Mantis GDS** and **PhonePe**.

---

## 3. Step 1: Database Setup & Migration (Supabase / PostgreSQL)

### 3.1 Get Your Connection String
In your Supabase dashboard:
1. Navigate to **Project Settings** > **Database**.
2. Scroll to **Connection string** and select **URI**.
3. Choose **Transaction Connection Pooler** (Port `6543`) for production web applications:
   ```
   postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
   ```
   > **Note**: For schema migrations (`prisma migrate deploy`), use the **Session Connection Pooler** (Port `5432`) or the direct database connection, as PgBouncer transaction mode does not support DDL locking.

### 3.2 Apply Database Migrations
Run the production migration command from your local machine (or CI pipeline) pointing to your remote database:

```bash
# In your local backend directory:
DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres" npx prisma migrate deploy
```

Verify that all tables, relations, and enums have been created.

### 3.3 Connection Pooling Settings
The backend automatically optimizes Prisma connection pooling:
- `DATABASE_POOL_MIN`: Minimum connection pool size (Default: `2`).
- `DATABASE_POOL_MAX`: Maximum connections allocated per instance (Default: `10`).
- The backend dynamically appends `connection_limit=${DATABASE_POOL_MAX}&pool_timeout=10&connect_timeout=15` to the `DATABASE_URL` query string to prevent connection exhaustion.

---

## 4. Step 2: Redis Configuration (Upstash / Render Redis)

Redis is used for:
1. **Advisory Seat Locks**: Preventing double-booking during checkout.
2. **Caching**: High-speed retrieval for bus search results, city lists, and seat layout charts.
3. **BullMQ Background Workers**: Asynchronous reconciliation for unknown booking states, refund dispatching, and notifications.

### 4.1 Upstash Redis Setup (Recommended)
1. Go to [https://console.upstash.com](https://console.upstash.com) and create a Redis database.
2. In the database dashboard, find **REST API / Node.js** and copy the **Node.js (ioredis)** connection URL:
   ```
   rediss://default:your_upstash_password@your-endpoint.upstash.io:6379
   ```
   *(Notice `rediss://` with double 's' denotes SSL/TLS).*
3. Set `REDIS_TLS=true` in your environment.

### 4.2 Graceful Redis Degradation Strategy
The backend is designed with a **5-retry resilience strategy**:
- Upon server startup, the backend attempts to connect to Redis up to **5 times** with exponential backoff.
- If Redis is unavailable after 5 attempts, the connection is **gracefully closed** (`disconnect()`), background workers are safely skipped, and the server operates in **degraded mode**:
  - Seat locking automatically degrades to database row checks and provider hold checks.
  - Search and seat layouts query upstream directly.
  - The HTTP server continues serving user traffic normally without crashing.

---

## 5. Step 3: Deploying on Render

### Method A: Deploy with Render Blueprint (`render.yaml`) — Recommended

The repository includes a ready-to-use `render.yaml` specification file.

1. Push your repository to GitHub / GitLab.
2. Log in to [Render Dashboard](https://dashboard.render.com).
3. Click **New +** in the top navigation and select **Blueprint**.
4. Select your `AiBus` repository.
5. Render will automatically parse `render.yaml` and configure:
   - **Service Name**: `aibus-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`
   - **Health Check Path**: `/health/live`
   - **Auto-generated Secrets**: Secure 32-character random keys for `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`.
6. Fill in the required secrets marked `sync: false`:
   - `DATABASE_URL`: Your Supabase connection string.
   - `REDIS_URL`: Your Upstash or Redis connection URL.
   - `GDS_CLIENT_ID` & `GDS_CLIENT_SECRET`: Your Mantis provider credentials.
   - `CORS_ORIGINS`: Your frontend URL(s) (e.g. `https://aibus-client.onrender.com`).
7. Click **Apply**. Render will trigger the build and deploy.

---

### Method B: Deploy Manually via Render Web Dashboard

1. In Render Dashboard, click **New +** > **Web Service**.
2. Connect your Git repository.
3. Configure the following fields:
   - **Name**: `aibus-backend`
   - **Region**: Choose the region closest to your database (e.g., `Singapore` for India-based Supabase).
   - **Branch**: `main` (or your production branch).
   - **Root Directory**: Leave blank if repository root is the backend, or `./backend` if inside a monorepo.
   - **Runtime**: `Node`.
   - **Build Command**:
     ```bash
     npm install && npm run build
     ```
     *(Note: `npm run build` runs `prisma generate && tsc` to compile both the Prisma Linux engine and TypeScript code).*
   - **Start Command**:
     ```bash
     npm run start
     ```
   - **Instance Type**: `Starter` (recommended for production) or `Free` (for evaluation).
4. Expand **Advanced** settings:
   - **Health Check Path**: `/health/live`
   - **Auto-Deploy**: `Yes`
5. Click **Add Environment Variable** and enter all variables from [Section 6](#6-step-4-environment-variables-reference).
6. Click **Create Web Service**.

---

## 6. Step 4: Environment Variables Reference

Configure these environment variables in Render (**Environment** tab of your service):

| Variable | Required | Example / Default | Description |
|---|---|---|---|
| `NODE_ENV` | Yes | `production` | Environment mode |
| `PORT` | Auto | `10000` | Injected by Render automatically; backend listens on `0.0.0.0:PORT` |
| `HOST` | No | `0.0.0.0` | Bind host address |
| `API_VERSION` | No | `v1` | API version prefix |
| `APP_NAME` | No | `aibus-backend` | Service name in structured logs |
| `LOG_LEVEL` | No | `info` | Logging verbosity (`fatal`, `error`, `warn`, `info`, `debug`) |
| `CORS_ORIGINS` | Yes | `https://aibus.com,https://aibus.onrender.com` | Comma-separated list of allowed frontend origins |
| `JWT_ACCESS_SECRET` | Yes | *Min 32 characters* | Cryptographic secret for signing access tokens |
| `JWT_REFRESH_SECRET` | Yes | *Min 32 characters* | Cryptographic secret for signing refresh tokens |
| `JWT_ACCESS_EXPIRY` | No | `15m` | Lifetime of access token |
| `JWT_REFRESH_EXPIRY` | No | `7d` | Lifetime of refresh token |
| `JWT_ISSUER` | No | `aibus` | JWT issuer claim |
| `DATABASE_URL` | Yes | `postgresql://user:pass@host:5432/db` | Supabase or PostgreSQL connection string |
| `DATABASE_POOL_MIN` | No | `2` | Minimum connection pool size |
| `DATABASE_POOL_MAX` | No | `10` | Maximum connections per instance |
| `REDIS_URL` | Yes | `rediss://default:pass@host:6379` | Redis connection URL |
| `REDIS_TLS` | No | `true` (if using TLS/Upstash) | Enables SSL/TLS for Redis connections |
| `REDIS_KEY_PREFIX` | No | `aibus:` | Key namespace in Redis |
| `BULL_PREFIX` | No | `bull` | Key namespace for BullMQ queues |
| `GDS_PARTNER_BASE_URL` | Yes | `https://partnerapi.iamgds.com` | Mantis GDS Partner API URL |
| `GDS_TRANSACTION_BASE_URL` | Yes | `https://partnertranapi.iamgds.com` | Mantis GDS Transaction API URL |
| `GDS_CLIENT_ID` | Yes | `50` | GDS Client ID |
| `GDS_CLIENT_SECRET` | Yes | *Secret* | GDS Client Secret |
| `GDS_REQUEST_TIMEOUT_MS` | No | `15000` | Upstream GDS timeout (ms) |
| `PHONEPE_MERCHANT_ID` | Yes | `M23XTGBCAO55H` | PhonePe Merchant ID |
| `PHONEPE_CLIENT_ID` | Yes | `M23XTGBCAO55H_...` | PhonePe Client ID |
| `PHONEPE_CLIENT_SECRET` | Yes | *Secret* | PhonePe Salt Key / Secret |
| `PHONEPE_CLIENT_VERSION` | No | `1` | PhonePe Salt Index |
| `PHONEPE_ENVIRONMENT` | Yes | `SANDBOX` or `PRODUCTION` | PhonePe environment mode |
| `PHONEPE_CALLBACK_URL` | Yes | `https://your-backend.onrender.com/api/v1/payments/webhook` | Webhook URL for payment updates |
| `PHONEPE_REDIRECT_URL` | Yes | `https://your-frontend.onrender.com/payment/status` | User browser redirect URL after payment |
| `RATE_LIMIT_WINDOW_MS` | No | `60000` | Rate limiting window (1 min) |
| `RATE_LIMIT_MAX_REQUESTS` | No | `100` | Max requests per IP per window |
| `AUTH_RATE_LIMIT_WINDOW_MS` | No | `900000` | Auth rate limit window (15 min) |
| `AUTH_RATE_LIMIT_MAX_REQUESTS` | No | `10` | Max failed auth attempts |
| `BCRYPT_ROUNDS` | No | `12` | Password hashing salt rounds |
| `REQUEST_BODY_LIMIT` | No | `1mb` | Max JSON payload size |
| `SEAT_HOLD_TTL_SECONDS` | No | `600` | Seat hold duration (10 minutes) |
| `SEAT_LOCK_TTL_SECONDS` | No | `30` | Distributed mutex lock duration (seconds) |
| `SHUTDOWN_TIMEOUT_MS` | No | `15000` | Force kill timeout during graceful shutdown |

---

## 7. Step 5: Health Checks & Lifecycle Management

The backend exposes three health check endpoints:

### 1. Liveness Probe: `GET /health/live`
- **Purpose**: Verifies that the Node.js event loop and HTTP server are responsive.
- **Dependencies Checked**: None (isolated).
- **HTTP Response**: Always `200 OK`.
- **Render Setting**: Use `/health/live` as Render's **Health Check Path**.

```json
{
  "status": "ok",
  "timestamp": "2026-10-12T00:00:00.000Z",
  "uptime": 128.45
}
```

### 2. Readiness Probe: `GET /health/ready`
- **Purpose**: Verifies that the instance is ready to receive production traffic.
- **Dependencies Checked**:
  - Database (PostgreSQL): Critical. If DB fails, returns `503`.
  - Redis: Non-critical. If Redis is unavailable, returns `200` with `status: "degraded"`.

```json
{
  "status": "ready",
  "timestamp": "2026-10-12T00:00:00.000Z",
  "checks": {
    "database": "ok",
    "redis": "ok"
  }
}
```

### 3. Detailed Health: `GET /health`
- **Purpose**: Full system diagnostics, including memory usage (RSS, Heap), uptime, and dependency breakdown.

```json
{
  "status": "healthy",
  "timestamp": "2026-10-12T00:00:00.000Z",
  "version": "1.0.0",
  "uptime": 128.45,
  "memory": {
    "rss": "84MB",
    "heapUsed": "42MB",
    "heapTotal": "55MB"
  },
  "checks": {
    "database": { "status": "ok", "critical": true },
    "redis": { "status": "ok", "critical": false }
  }
}
```

### 4. Graceful Shutdown Workflow
When Render initiates a deploy or scales an instance, it sends a `SIGTERM` signal:
1. HTTP server stops accepting new incoming connections (`server.close()`).
2. Active keep-alive idle connections are terminated (`server.closeIdleConnections()`).
3. BullMQ workers pause and finish currently processing jobs (`shutdownQueues()`).
4. Redis connections and BullMQ connection pools are cleanly closed (`disconnectRedis()`).
5. Prisma database connections are disconnected (`disconnectDatabase()`).
6. If the process does not terminate within `SHUTDOWN_TIMEOUT_MS` (15s), a force exit (`process.exit(1)`) terminates the container to avoid deadlocks.

---

## 8. Step 6: Production Verification & Smoke Tests

After deployment completes on Render, execute these verification tests against your live service:

### 1. Verify Service Root
```bash
curl -i https://your-backend.onrender.com/
```
**Expected Response**: `200 OK`
```json
{
  "name": "aibus-backend",
  "version": "v1",
  "status": "operational",
  "docs": "/api/docs"
}
```

### 2. Verify Liveness & Readiness Probes
```bash
curl -i https://your-backend.onrender.com/health/live
curl -i https://your-backend.onrender.com/health/ready
```
**Expected Response**: `200 OK`

### 3. Verify Interactive OpenAPI Docs (Swagger)
Open in your browser:
```
https://your-backend.onrender.com/api/docs
```
Confirm the interactive documentation interface loads with all v1 endpoints listed.

### 4. Test Live Bus Search
```bash
curl -i "https://your-backend.onrender.com/api/v1/search?fromCityId=4292&toCityId=4562&journeyDate=2026-12-01"
```
**Expected Response**: `200 OK` with bus results array.

### 5. Test Live Seat Layout Chart
```bash
curl -i https://your-backend.onrender.com/api/v1/buses/6901/chart
```
**Expected Response**: `200 OK` with `Layout` array containing seat tiers and numbers.

---

## 9. Step 7: Troubleshooting Common Issues

### Issue 1: `PrismaClientInitializationError: Query engine binary for debian-openssl-... was not found`
- **Cause**: Prisma Client was built without Linux engine binaries.
- **Solution**: The `prisma/schema.prisma` file is configured with:
  ```prisma
  generator client {
    provider      = "prisma-client-js"
    binaryTargets = ["native", "debian-openssl-3.0.x", "debian-openssl-1.1.x", "linux-musl-openssl-3.0.x", "darwin-arm64"]
  }
  ```
  Ensure your Render **Build Command** includes `npm run build` (which executes `prisma generate && tsc`).

### Issue 2: Supabase `Max client connections reached` / Connection Pool Exhaustion
- **Cause**: Connecting directly to port 5432 with multiple Render instances or serverless invocations.
- **Solution**: Use Supabase **Transaction Connection Pooler** on port `6543`. Ensure `DATABASE_POOL_MAX=10` is set in your environment.

### Issue 3: Redis `Error: self signed certificate` / SSL Handshake Failure
- **Cause**: Cloud providers (Upstash, Render Managed Redis) use TLS certificates that require relaxing strict CA verification.
- **Solution**: The backend automatically sets `{ rejectUnauthorized: false }` when `REDIS_TLS=true` or when using `rediss://` protocol URLs.

### Issue 4: Render Deploy Fails / Health Check Timeout
- **Cause**: Using `/health/ready` or `/health` when database cold start takes longer than Render's health probe window.
- **Solution**: Set Render's **Health Check Path** to `/health/live`. This responds with `200 OK` as soon as the Express server starts listening, avoiding deployment timeouts.

### Issue 5: CORS Errors on Frontend
- **Cause**: The frontend origin is not present in `CORS_ORIGINS`.
- **Solution**: In Render's **Environment** tab, set:
  ```
  CORS_ORIGINS=https://your-frontend.onrender.com,http://localhost:5173
  ```
  Do not leave trailing commas or spaces.

---

## 10. Step 8: Performance & Security Best Practices

1. **Keep-Alive & Reverse Proxy**:
   Render terminates TLS at its load balancer. The backend uses `app.set('trust proxy', 1)` so that IP rate limiting, client IP detection, and `X-Forwarded-Proto` work reliably.
2. **Log Redaction**:
   Pino logger automatically redacts sensitive keys: `authorization`, `cookie`, `password`, `token`, `GDS_CLIENT_SECRET`, `JWT_ACCESS_SECRET`, `PHONEPE_CLIENT_SECRET`, `creditCard`, and `cvv`.
3. **Payload Compression**:
   The Gzip compression middleware reduces large JSON payloads (bus search results and seat layout trees) by up to 85%, significantly reducing bandwidth and response latency.
4. **Zero-Downtime Deploys**:
   Render automatically handles rolling deploys. The old instance keeps serving traffic until the new instance passes the `/health/live` probe, after which `SIGTERM` gracefully drains active connections on the old container.
