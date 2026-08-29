# FleetGuard

FleetGuard is an intelligent logistics and fleet management platform built for emergency and time-sensitive transportation operations.

The idea is simple: instead of making a dispatcher jump between different tools to track trucks, manage deliveries, check routes and respond to disruptions, FleetGuard brings the important parts together in one place.

## What FleetGuard does

FleetGuard helps a logistics team:

- Track trucks and their current status
- Manage deliveries and vehicle assignments
- Find real driving routes using OpenStreetMap routing data
- Save routes and connect them with deliveries
- Optimize delivery assignments using OR-Tools
- Use AI as a decision-support layer for route and operational decisions
- Handle emergency situations and find suitable partner trucks
- View fleet information and operational analytics from a central dashboard

## How the system works

The main flow looks like this:

```text
Fleet / Delivery Data
        ↓
FastAPI Backend
        ↓
Route Calculation (OSRM)
        ↓
OR-Tools Optimization
        ↓
Structured Operational Context
        ↓
AI Decision Support
        ↓
Decision + Risk + Reasoning + Suggested Actions
```

A key design decision in FleetGuard is that AI is not used as the actual route solver.

OR-Tools handles the deterministic optimization and constraint-based part of the problem. The AI layer then interprets the result and turns it into something that is easier for a dispatcher to understand and act on.

## AI and optimization

The AI side of the project was developed around a structured-context approach.

Relevant information such as:

- Origin and destination
- Distance and estimated travel time
- Traffic or delay information
- Vehicle details
- Delivery priority
- Optimization results

is converted into structured JSON and passed to the AI layer.

The AI can then provide outputs such as:

- Maintain or reroute decisions
- Risk level
- Recommended route
- Reasoning
- Suggested actions

This keeps the system more reliable than asking a generative model to directly solve the entire routing problem.

## Technology stack

### Frontend
- Next.js
- React
- TypeScript
- Tailwind CSS

### Backend
- Python
- FastAPI
- SQLAlchemy
- SQLite for the demo setup

### Routing and optimization
- OSRM (Open Source Routing Machine)
- OpenStreetMap road data
- Google OR-Tools

### AI
- Google Gemini API
- Google AI Studio
- Python-based Gemini client

### Deployment
- Railway for the backend
- Netlify for the frontend

## Project structure

```text
FleetGaurd/
├── frontend/
│   ├── components/
│   ├── context/
│   ├── data/
│   ├── lib/
│   └── ...
│
└── transportation-logistics-backend/
    ├── ai/
    ├── api/
    ├── authentication/
    ├── database/
    ├── maps/
    ├── models/
    ├── optimizer/
    ├── schemas/
    ├── services/
    ├── config/
    └── main.py
```

## Running the project locally

### 1. Start the backend

From the backend directory:

```bash
.venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

The API will be available at:

```text
http://127.0.0.1:8000
```

FastAPI documentation:

```text
http://127.0.0.1:8000/docs
```

### 2. Start the frontend

From the frontend directory:

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

For local development, the frontend can use:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Demo login

For the demo environment:

```text
Email: admin@fleetguard.com
Password: Admin@12345
```

## Example demo flow

A typical demonstration can be done like this:

1. Log in as the admin user.
2. Open the Dashboard to show the fleet overview.
3. Open Trucks to show the available vehicles.
4. Go to Routes.
5. Enter an origin and destination, for example:
   `Kolkata → Bhubaneswar`
6. Select a truck.
7. Click **Find Fastest Route** to calculate the real driving route.
8. Save the route so it is linked to a delivery.
9. Click **Optimize Route**.
10. Show the OR-Tools result and the AI decision-support output.
11. Use Deliveries / Emergency / Partner Network to demonstrate the wider fleet-management workflow.

## API overview

Some of the main backend operations are:

```text
POST /api/deliveries
POST /api/routes
POST /api/routes/{id}/optimize
GET  /api/trucks
GET  /api/health
```

The application also exposes the standard FastAPI documentation through:

```text
/docs
/openapi.json
```

## Why we built it this way

Traditional fleet systems can give a dispatcher a lot of raw information without helping them decide what to do next.

FleetGuard is designed around that last step.

The optimization engine answers questions like:

> What route or assignment is feasible and efficient?

The AI layer helps answer:

> What does this result mean operationally, and what should the dispatcher consider doing next?

This separation also means that the core routing and constraint logic does not depend on a generative model being correct.

## Current limitations

FleetGuard is currently a working prototype built for demonstration and hackathon use.

Some parts are still simplified, including:

- Demo fleet and delivery data
- Real-time telemetry integration
- Production-grade persistent storage
- Advanced historical prediction models
- Full conversational AI grounding
- Live traffic/event feeds beyond the current routing setup

## Future scope

There are several natural directions for taking FleetGuard further:

### Predictive logistics
Use historical fleet data to predict:

- Delivery delays
- ETA changes
- Vehicle downtime
- Demand patterns

### RAG for logistics knowledge
A retrieval-augmented AI layer could use:

- Company SOPs
- Route policies
- Historical incidents
- Driver instructions
- Emergency procedures

to provide more grounded recommendations.

### Real-time fleet integration
Connect the platform with:

- GPS/IoT telemetry
- Live traffic feeds
- Weather information
- Road closure and disruption feeds

### Smarter cost optimization
Expand optimization to include:

- Fuel consumption
- Driver hours
- Toll costs
- Vehicle maintenance
- Carbon emissions

### Learning from dispatcher feedback
Future versions could use dispatcher decisions and historical outcomes to continuously improve recommendations.


## Team

FleetGuard was developed as a team project for Smart India Hackathon, with different team members contributing to the frontend, backend, optimization, AI, and overall product integration.

---

FleetGuard is built around one goal: **make fleet operations faster to understand, easier to optimize, and easier to act on.**
