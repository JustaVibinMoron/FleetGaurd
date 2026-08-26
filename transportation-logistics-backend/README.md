# Transportation Logistics Management System — Backend
Hackathon-ready FastAPI backend for truck transport, deliveries, routes, JWT auth, and **pluggable** AI + route-optimizer teammates.
---
## 1. System architecture

```
React frontend
      │  HTTP + JSON  (+ Authorization: Bearer <jwt>)
      ▼
FastAPI (this repo)
      ├── authentication/     passwords + JWT
      ├── api/routes/         REST endpoints (thin)
      ├── services/           business rules
      ├── database + models/  PostgreSQL via SQLAlchemy
      ├── ai/                 calls the generative-AI module (stub or HTTP)
      └── optimizer/          calls the route optimizer (stub, HTTP, or Python function)
      ▼
PostgreSQL
```

The backend is the **only** place the frontend talks to. It loads trucks/deliveries/routes from Postgres, builds a small JSON context, and forwards that to AI / optimizer services. Those services are **not** implemented here on purpose.

| Layer | Why it exists |
| --- | --- |
| `config/` | Reads `.env` so secrets are not hard-coded |
| `database/` | One engine + session factory; routes never open connections themselves |
| `models/` | Tables and foreign keys |
| `schemas/` | Validates JSON in/out (Pydantic) |
| `authentication/` | Hash passwords, issue/verify JWT |
| `api/routes/` | HTTP only — no SQL or AI calls |
| `api/dependencies/` | `get_current_user`, role checks, DB session |
| `services/` | Rules: capacity, status transitions, RBAC filtering |
| `ai/` | Adapter for the generative-AI teammate |
| `optimizer/` | Adapter for the route-optimizer teammate |
| `utils/` | Shared error type + `{ success, data }` envelope |

---
## 2. Database schema
```
users 1 ──< trucks (owner_id)
users 1 ──< trucks (driver_id, optional)
trucks 1 ──< deliveries
users 1 ──< deliveries (assigned_driver_id)
deliveries 1 ── 1 routes          (unique delivery_id)
routes 1 ──< route_optimization_results
```

### users
`id`, `email` (unique), `hashed_password`, `full_name`, `role` (`ADMIN` \| `DISPATCHER` \| `DRIVER`), `is_active`, `created_at`

### trucks
`id`, `registration_number` (unique), `owner_id` → users, `driver_id` → users, `max_capacity_kg`, `current_load_kg`, `current_location`, `status`, `created_at`, `updated_at`

Constraint: `0 <= current_load_kg <= max_capacity_kg`

Statuses: `AVAILABLE`, `ASSIGNED`, `IN_TRANSIT`, `MAINTENANCE`, `OFFLINE`

### deliveries
`id`, `truck_id` → trucks (nullable until assigned), `origin`, `destination`, `load_kg`, `delivery_status`, `assigned_driver_id`, `estimated_delivery_time`, `created_at`

Statuses: `PENDING` → `ASSIGNED` → `PICKED_UP` → `IN_TRANSIT` → `DELIVERED` (or `CANCELLED` from non-terminal states)

### routes
`id`, `delivery_id` (unique) → deliveries, `start_location`, `destination`, `distance_km`, `estimated_time_minutes`, `route_status`, `created_at`

Statuses: `ACTIVE`, `BLOCKED`, `DELAYED`, `ALTERNATIVE`, `COMPLETED`

### route_optimization_results
`id`, `route_id` → routes, `source` (`ai` \| `optimizer`), `recommended_route`, `estimated_time`, `fuel_saving`, `reason`, `raw_response`, `created_at`

---

## 3. API endpoint list

All JSON keys in requests/responses use **camelCase** (`truckId`, `maxCapacityKg`). Auth header: `Authorization: Bearer <accessToken>`.

Envelope:

```json
{ "success": true, "data": {} }
```

```json
{ "success": false, "error": { "code": "TRUCK_NOT_FOUND", "message": "Truck does not exist" } }
```

| Method | Path | Auth | Roles | Purpose |
| --- | --- | --- | --- | --- |
| GET | `/api/health` | no | — | Liveness |
| POST | `/api/auth/register` | no | — | Register (first user becomes Admin) |
| POST | `/api/auth/login` | no | — | JWT |
| GET | `/api/auth/me` | yes | any | Current user |
| GET/PUT/DELETE | `/api/users` … | yes | Admin | User admin |
| GET | `/api/trucks` | yes | any* | List trucks |
| GET | `/api/trucks/{truck_id}` | yes | any* | Get truck |
| POST | `/api/trucks` | yes | Admin | Create truck |
| PUT | `/api/trucks/{truck_id}` | yes | Admin, Dispatcher | Update truck |
| DELETE | `/api/trucks/{truck_id}` | yes | Admin | Delete truck |
| POST | `/api/deliveries` | yes | Admin, Dispatcher | Create delivery |
| GET | `/api/deliveries` | yes | any* | List deliveries |
| GET | `/api/deliveries/{id}` | yes | any* | Get delivery |
| PUT | `/api/deliveries/{id}/status` | yes | Admin, Dispatcher, Driver | Status |
| GET | `/api/routes` | yes | any* | List routes |
| GET | `/api/routes/{id}` | yes | any* | Get route |
| POST | `/api/routes` | yes | Admin, Dispatcher | Create route |
| PUT | `/api/routes/{id}` | yes | Admin, Dispatcher | Update route |
| POST | `/api/routes/{id}/optimize` | yes | Admin, Dispatcher | AI + optimizer |

\*Drivers only see **their** trucks, deliveries, and routes.

Interactive docs: [http://localhost:8000/docs](http://localhost:8000/docs) (Swagger) and `/redoc`.

---

## 4. Folder structure

```
transportation-logistics-backend/
├── backend/
│   ├── main.py
│   ├── api/routes/ + api/dependencies/
│   ├── models/  schemas/  services/
│   ├── database/  authentication/  config/
│   ├── ai/        optimizer/       utils/
├── docker-compose.yml      PostgreSQL 16
├── requirements.txt
├── .env.example
├── postman/TLMS.postman_collection.json
└── README.md
```

---

## 5. Data flow

**Login:** React POST `/api/auth/login` → verify hash → JWT → frontend stores token.

**Create delivery:** Dispatcher POST body → `delivery_service` checks truck capacity → insert row → maybe bump truck load/status → `{ success, data }`.

**Optimize route:**

1. Frontend `POST /api/routes/{routeId}/optimize` with optional `{ problem, deliveryPriority }`
2. Backend loads route + delivery + truck
3. Builds context JSON (origin, destination, capacities, problem, …)
4. `optimizer_service.request_optimizer_plan(context)`
5. `ai_service.request_ai_recommendation(context)`
6. Validates keys `recommendedRoute`, `estimatedTime`, `reason`
7. Stores two `route_optimization_results` rows
8. May set route status to `ALTERNATIVE`
9. Returns both results to React

---

## Run locally

```bash
cd transportation-logistics-backend
cp .env.example .env
docker compose up -d
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

If PostgreSQL / Docker is not available yet, you can boot with SQLite for local UI work only:

```bash
DATABASE_URL=sqlite:///./tlms.db uvicorn backend.main:app --reload --port 8000
```

Use PostgreSQL for the hackathon demo (`docker compose up -d` plus the default `.env`).

### First user

`POST /api/auth/register` — the **first** account is always `ADMIN`. Later registrations cannot self-assign Admin (an admin can change roles via `PUT /api/users/{id}`).

### Example requests

Register:

```json
POST /api/auth/register
{ "email": "admin@tlms.dev", "password": "password123", "fullName": "Ada Admin" }
```

Login:

```json
POST /api/auth/login
{ "email": "admin@tlms.dev", "password": "password123" }
```

Create truck:

```json
POST /api/trucks
Authorization: Bearer <token>
{
  "registrationNumber": "MH12AB1234",
  "maxCapacityKg": 10000,
  "currentLoadKg": 0,
  "currentLocation": "Delhi",
  "status": "AVAILABLE",
  "driverId": 2
}
```

Create delivery:

```json
POST /api/deliveries
{
  "origin": "Delhi",
  "destination": "Mumbai",
  "loadKg": 7000,
  "truckId": 1
}
```

Optimize:

```json
POST /api/routes/1/optimize
{ "problem": "Road blockage", "deliveryPriority": "high" }
```

Example AI-shaped payload the backend **sends** (and the stub **returns**):

```json
{
  "origin": "Delhi",
  "destination": "Mumbai",
  "truckCapacityKg": 10000,
  "currentLoadKg": 7000,
  "problem": "Road blockage"
}
```

```json
{
  "recommendedRoute": "Alternative Route",
  "estimatedTime": 1200,
  "fuelSaving": 15,
  "reason": "Avoids traffic congestion"
}
```

---

## Role permissions

| Action | Admin | Dispatcher | Driver |
| --- | --- | --- | --- |
| Manage users | yes | no | no |
| Create/delete trucks | yes | no (update yes) | no |
| Create deliveries / routes | yes | yes | no |
| Monitor / list | yes | yes | own assignments only |
| Update delivery status | yes | yes | pickup / transit / delivered only |
| Run optimize | yes | yes | no |

---

## Plug in the AI teammate

1. They expose `POST {AI_MODULE_URL}/optimize` accepting the context JSON above.
2. They return `{ recommendedRoute, estimatedTime, reason, fuelSaving? }`.
3. Set in `.env`:

```
AI_MODE=http
AI_MODULE_URL=http://localhost:8001
```

Until then `AI_MODE=stub` returns a deterministic fake recommendation.

---

## Plug in the route optimizer

Same JSON contract. Options in `.env`:

| `OPTIMIZER_MODE` | Behavior |
| --- | --- |
| `stub` | Built-in fake plan (default) |
| `http` | `POST {OPTIMIZER_URL}/optimize` |
| `function` | `from route_optimizer import optimize_route` |

Edit only `backend/optimizer/optimizer_client.py` — do not put optimizer math in `services/`.

---

## Frontend integration

1. Import `postman/TLMS.postman_collection.json` or use Swagger.
2. Send JSON; include `Authorization` on every protected route.
3. CORS defaults: `http://localhost:3000` and `http://localhost:5173` (change `CORS_ORIGINS`).
4. Treat `success === false` as an error and show `error.message`.

---

## Major files (quick map)

| File | Responsibility |
| --- | --- |
| `backend/main.py` | App, CORS, error envelope, table create |
| `backend/config/settings.py` | `.env` settings |
| `backend/database/session.py` | Engine + `get_db` |
| `backend/models/*.py` | Tables |
| `backend/schemas/*.py` | Request/response validation |
| `backend/authentication/*` | bcrypt + JWT |
| `backend/api/dependencies/auth.py` | Protected routes + RBAC |
| `backend/api/routes/*.py` | REST controllers |
| `backend/services/*.py` | Domain logic |
| `backend/ai/ai_service.py` | AI adapter |
| `backend/optimizer/optimizer_service.py` | Optimizer adapter |
