# LeadCloser AI — Autonomous Sales Qualification and Conversion Platform

LeadCloser AI is an enterprise-grade AI sales agent and CRM platform designed for service-based businesses. The system autonomous-qualifies leads, understands customer requirements, asks relevant discovery questions, estimates pricing deterministically using configured business rules, schedules consultations or demos against real staff availability, maintains synchronized CRM records, and routes high-value or uncertain leads to human sales representatives.

---

## 1. Architectural Highlights

LeadCloser AI is built as a **modular monolith** with workspace-level multi-tenancy:

```
├── client/                     # React 18 + Vite + Tailwind CSS Dark UI + Recharts
│   ├── src/
│   │   ├── components/         # Sidebar, Header, Modals, Drawers
│   │   ├── context/            # AuthContext (JWT + Session State)
│   │   ├── pages/              # Overview, Inbox, Pipeline, Leads, Appointments,
│   │   │                       # Estimates, Services, Automation, Analytics, Widget, Login
│   │   └── services/           # Axios API Client
├── server/                     # Express.js + Mongoose + Socket.IO + Jest
│   ├── src/
│   │   ├── config/             # DB connection with auto-memory fallback, constants
│   │   ├── controllers/        # Auth, Leads, Conversations, Estimates, Scheduling, Analytics
│   │   ├── middlewares/        # JWT Auth, RBAC, Zod Validation, Error Handling
│   │   ├── models/             # 16 Mongoose Schemas with compound unique indexes
│   │   ├── routes/             # RESTful API endpoints
│   │   ├── scripts/            # Database seeder with realistic fictional agency
│   │   ├── services/           # Deterministic Pricing Engine, Qualification Engine,
│   │   │                       # Scheduling Engine, AI Tool Engine, Conversation State Machine
│   │   └── sockets/            # Real-time room broadcast (chat, takeover, alerts)
│   └── tests/                  # Automated Jest & Supertest suites
├── postman_collection.json     # Ready-to-import API test collection
└── .env.example                # Environment variables template
```

---

## 2. Core Modules & Engine Specifications

### 2.1 Deterministic Pricing Engine (Paise Precision)
- **Zero LLM Hallucinations**: Final price totals, discounts, and itemized calculations are computed exclusively in backend code. The LLM interfaces solely via schema-validated query tools.
- **Precision Currency**: Stored and calculated in integer **paise** (1 INR = 100 paise; e.g. ₹20,000 = `2,000,000` paise).
- **Formula**:
  $$\text{Total} = \text{BasePackage} + \sum (\text{AddonPrice} \times \text{Quantity}) + \text{ComplexityAdjustment} - \text{AuthorizedDiscount}$$
- **Discount Guardrails**: Sales representatives cannot apply ad-hoc discounts. Discounts require Business Owner or Admin sign-off via `POST /api/estimates/:id/approve`.
- **Estimate Versioning**: When requirements or add-ons change, previous estimates are preserved with status `superseded` and an incremented version number.

### 2.2 Appointment Scheduling & Concurrency Control
- **Dynamic Slot Generation**: Computes available 30-minute consultation slots with 15-minute buffers matching sales staff's configured `AvailabilityRule`s.
- **Race Condition Prevention**:
  1. Real-time availability calculation filters out conflicting appointments.
  2. MongoDB compound partial unique index on `{ salesRepId: 1, startTime: 1, status: 1 }` (for `scheduled` status).
  3. Immediate atomic re-validation checks slot availability prior to insert.
- **Idempotency Protection**: Client passes an `idempotencyKey`. If repeated due to network retries, the server returns the existing confirmed booking without creating duplicates.
- **Simulation Adapter**: Generates working meeting links (`https://meet.leadcloser.ai/session/<code >`) without paid external calendar subscriptions.

### 2.3 Autonomous Sales Conversation State Machine
The agent manages a state machine tracking intents, missing requirements, answered topics, and the next best action:

```
[Inbound Message]
       │
       ▼
[Intent & Entity Extraction] ──► [LeadRequirement CRM Update]
       │
       ├─► Wants Price / Has Features? ──► [Tool: calculate_estimate] ──► Present Breakdown
       │
       ├─► Wants Consultation? ──► [Tool: search_available_slots] ──► Present Available Slots
       │
       ├─► Selects Slot? ──► [Tool: book_appointment] ──► Confirm & Provide Meeting Link
       │
       ├─► High Value / Asks for Human? ──► [Tool: request_human_handoff] ──► Pause Bot & Alert Rep
       │
       └─► Missing Details? ──► Targeted Sequential Question (Without repeating answered topics)
```

### 2.4 Multi-Dimensional Lead Qualification
Every lead is scored (0–100) across 5 configurable dimensions:
- **Service Fit** (0–25 pts)
- **Budget Fit** (0–20 pts)
- **Timeline Readiness** (0–20 pts)
- **Requirement Completeness** (0–15 pts)
- **Engagement & Intent** (0–20 pts)

Scores are transparently explained with rule triggers and can be overridden by authorized sales managers with an auditable justification.

---

## 3. Role-Based Access Control (RBAC) Matrix

| Action / Resource | Business Owner | Sales Agent | Workspace Admin | Prospect (Chat Widget) |
| :--- | :---: | :---: | :---: | :---: |
| **Workspace Settings & Team** | Full (CRUD) | None | Full (CRUD) | None |
| **Catalog Services & Rules** | Full (CRUD) | Read Only | Full (CRUD) | Read Only (via AI tool) |
| **View Leads** | All Workspace Leads | Assigned Only | All Workspace Leads | None |
| **Approve Discounts / Quotes**| Full | None | Full | None |
| **Human Chat Takeover** | Yes | Yes (Assigned) | Yes | N/A |
| **Book Appointments** | All Staff | Own Calendar | All Staff | Book Own Consultation |
| **Score Override** | Yes | None | Yes | None |
| **Analytics & Audit Logs** | Full | Personal | Full | None |

---

## 4. Quick Start & Setup Guide

### Prerequisites
- Node.js (v18+ or v20+)
- npm (v9+)
- (Optional) Local MongoDB daemon. If MongoDB is not running, the application automatically initializes an embedded in-memory MongoDB instance for zero-configuration local runs!

### 1. Clone & Install Dependencies
```bash
git clone <repo-url>
cd leadcloser\ ai

# Install server dependencies
npm --prefix server install

# Install client dependencies
npm --prefix client install
```

### 2. Configure Environment
```bash
cp server/.env.example server/.env
```

### 3. Seed Database with Realistic Demo Agency
```bash
npm run seed
```
Creates:
- **Workspace**: Apex Digital Solutions (`apex-digital`)
- **Owner**: `owner@leadcloser.ai` / `password123`
- **Sales Rep**: `priya@leadcloser.ai` / `password123`
- **Admin**: `admin@leadcloser.ai` / `password123`
- **Services & Rules**: Web Application, E-Commerce, Student Portal, Fee Tracking, Admin Dashboard
- **Realistic Leads**: 5 active leads across pipeline stages

### 4. Run Development Servers
In two separate terminals:
```bash
# Terminal 1: Backend Server (Port 5000)
npm run dev:server

# Terminal 2: Frontend Client (Port 5173)
npm run dev:client
```
Visit `http://localhost:5173` in your browser.

---

## 5. Automated Test Suite

Run the comprehensive Jest test suite:
```bash
npm test
```
Tests verify:
1. **Pricing**: Exact paise calculations, line item generation, rejection of unauthorized discounts, estimate version superseding.
2. **Scheduling**: Real working hours slots, overlapping conflict rejection (409), idempotent booking replays, cancellation.
3. **CRM & RBAC**: Strict multi-tenant workspace isolation, stage transitions, score override authorization.
4. **Conversation**: Structured requirement extraction, anti-repetition question tracking, human handoff, and bot pause on takeover.

---

## 6. End-to-End Walkthrough Scenario

1. **Prospect Experience**:
   - Navigate to `http://localhost:5173/widget`.
   - Click the prompt chip: *"Hi, I need a website for my coaching institute. I want student registration, online fee tracking, and an admin dashboard. What would it cost?"*
   - LeadCloser AI responds with the transparent estimate:
     - Base Web Application: ₹20,000
     - Student Registration Add-on: ₹8,000
     - Fee Tracking Integration: ₹6,000
     - Admin Dashboard: ₹7,500
     - **Total Estimated Investment: ₹41,500**
   - Click one of the offered consultation time slots to instantly lock and confirm the appointment with a video meeting link.

2. **Sales Team CRM Experience**:
   - Log in at `http://localhost:5173/login` using the **👑 Owner** quick-switch button.
   - Go to **AI Sales Inbox**: View the live chat, inspect the AI tool execution traces, check the extracted requirements checklist, and review the qualification score.
   - Go to **Sales Pipeline**: Inspect the lead moved to *Meeting Scheduled* with an estimated deal value of ₹41,500.
   - Go to **Appointments**: See the confirmed consultation slot locked for the sales representative.
