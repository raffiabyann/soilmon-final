## 1. Project Overview

SoilMon is an IoT-based monitoring and automated fertigation system for a starfruit farm in Tuban, East Java.

Soil/field monitoring (sensors, LoRa, monitoring dashboard) already exists. SoilMon's focus is connecting monitoring to automated and verifiable fertigation:

Monitor → Understand → Decide → Control → Verify

How the Decide, Control and Verify stages behave is TBD until specified in `/docs`. See `docs/00_PROJECT_CONTEXT.md`.

The project is shared across two courses:

- CE631L — Embedded System Design
- CE739L — Mobile Pervasive Computing

CE631L focuses on the embedded system, hardware, firmware, sensing, communication, actuation, and gateway.

CE739L focuses on the application side: backend API, database, web application, and end-to-end data flow.

This is a real project that continues beyond UTS/UAS. The UTS/UAS academic deliverables are milestones of the real project. Do not treat SoilMon as a disposable mockup, prototype or tutorial project.

---

## 2. Confirmed UTS Architecture Direction

The confirmed UTS architecture direction is:

Embedded Node
→ LoRa
→ Gateway
→ HTTPS POST
→ Backend API
→ Database
→ REST API
→ Web Dashboard

This direction is CONFIRMED. Implementation details remain TBD until they are specified in the appropriate docs (`docs/02_SYSTEM_ARCHITECTURE.md`, `docs/03_DATA_CONTRACT.md`, `docs/05_API_SPEC.md`), including:

- payload format
- sampling interval
- retry logic
- security details
- exact API endpoints

The command path from the system to actuators (needed for Control) is TBD.

Hardware components currently discussed for CE631L are PROPOSED unless explicitly confirmed in `/docs`. Do not treat them as final hardware specifications.

The database technology is PostgreSQL (07 DB-01, RESOLVED). The database hosting provider is TBD (07 DB-17, with OAD-06).

Simulated telemetry is an intentional development strategy, because real embedded telemetry may not be available yet. The simulator must use the same conceptual data contract as the eventual real gateway.

The software architecture must allow simulated data to be replaced by real telemetry without requiring a complete rewrite of the frontend or backend.

---

## 3. Source of Truth

Before making architectural or implementation decisions, check the relevant files in `/docs`.

Expected documentation:

- `docs/00_PROJECT_CONTEXT.md`
- `docs/01_REQUIREMENTS.md`
- `docs/02_SYSTEM_ARCHITECTURE.md`
- `docs/03_DATA_CONTRACT.md`
- `docs/04_DATABASE_DESIGN.md`
- `docs/05_API_SPEC.md`
- `docs/06_WEB_APP_SPEC.md`
- `docs/07_OPEN_DECISIONS.md`

If a requirement is not documented or is marked as TBD, do not silently invent a solution.

If documents contradict each other, stop and identify the contradiction before making a major architectural decision.

---

## 4. Confirmed vs Proposed vs TBD

Treat project information according to its status:

- CONFIRMED — explicitly decided or required
- PROPOSED — current design proposal, may change
- TBD — not decided yet

Do not convert a PROPOSED or TBD decision into a confirmed requirement.

In particular, do not invent:

- final hardware specifications
- final communication protocol details beyond documented requirements
- sensor parameters that have not been confirmed
- irrigation/fertigation behavior that has not been specified
- authentication requirements that have not been defined
- production deployment architecture

---

## 5. Technology Principles

Prefer technologies that are already familiar to the project team and avoid unnecessary complexity.

Current intended stack:

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- Recharts where charting is required

### Backend

CONFIRMED by the SoilMon Team (07 §9.1, AP-02 backend part):

- Node.js
- JavaScript with ES Modules (not TypeScript)
- Express
- `pg` as the PostgreSQL driver

### Database

PostgreSQL, CONFIRMED (07 DB-01). The hosting provider is TBD (07 DB-17, with OAD-06).

Do not introduce another database platform, or a hosting provider, without a documented reason.

### API

- REST
- HTTP/HTTPS
- JSON
- API versioning such as `/api/v1/...` where specified by the API documentation

Do not introduce additional frameworks, ORMs, state-management libraries, message brokers, WebSockets, microservices, or other infrastructure unless there is a clear project requirement.

---

## 6. Frontend / Backend Separation

The repository is currently structured as follows (working tree as of 2026-10-20):

```text
soilmon-final/
├── .claude/              # Claude Code project settings and skills
├── backend/              # Express API, Stage 1 scaffold (JavaScript ES Modules); standalone npm package
│   ├── src/
│   │   ├── app.js        # builds the Express app; no network I/O, used by the tests
│   │   ├── server.js     # startup and graceful shutdown
│   │   ├── config/       # environment validation (PORT, NODE_ENV, DATABASE_URL)
│   │   ├── db/           # PostgreSQL connection pool (pg); no schema yet
│   │   ├── middleware/   # JSON 404 and error handling
│   │   └── routes/       # GET /health (05 §15)
│   ├── tests/            # node:test suites (npm test)
│   ├── .env.example      # variable names only; .env is git-ignored
│   ├── package.json      # npm scripts: start, dev, test
│   ├── package-lock.json
│   └── test.js           # empty placeholder from before Stage 1 (tracked)
├── docs/
│   └── docs/             # 00–07 project documentation (the files are one level deeper than the paths in §3)
├── embeded/
│   └── embeded/          # PlatformIO prototype firmware (CE631L): node, gateway, cfgread, uji
├── frontend/             # React + Vite web app, running on mock data
├── shared/               # @soilmon/shared: TypeScript types and pure helper functions
├── CLAUDE.md
├── README.md             # empty
├── package.json          # pnpm workspace root (lint, format, typecheck, dev)
└── pnpm-workspace.yaml   # workspace members: frontend, shared
```

Paths in §3 such as `docs/00_PROJECT_CONTEXT.md` refer to the files in `docs/docs/`.

`.gitignore` excludes `docs/`, `CLAUDE.md` and `.claude/` as private project documentation, and `embeded/` as a separate repository. Keep these exclusions. Do not change `.gitignore` to publish them.

### 6.1 Rules per folder

**`docs/`**

- The source of truth (§3). Decisions follow the workflow in `07_OPEN_DECISIONS.md` §9.

**`frontend/`**

- Reads data only through the REST retrieval interface in `05_API_SPEC.md` (06 WA-01). It never accesses the database and never calls the ingestion endpoint.
- Mock data lives only in `frontend/src/mocks/` and is shown with the "Data contoh" label. Mock values are not specifications.
- Pages and features outside the 06 page set (Alerts, Reports, Settings, gateway status, irrigation and others) are mock-based prototypes, not requirements. They are listed in 06 Appendix A.1, and their status is open as 07 OD-17. Do not remove them, and do not treat them as confirmed scope.

**`shared/`**

- Holds TypeScript types and pure functions that the frontend uses. It does not define the contract: `03`, `04` and `05` do. Where the code and the documents differ, the documents win, and the difference is recorded in `07`.
- Several types and constants describe concepts that are TBD in the documents: the nine metric keys, normal ranges, the offline rule, gateway, alerts, irrigation events and user roles. Treat them as prototype shapes (07 OD-16, OD-17).
- Keep it free of I/O and runtime dependencies, and do not import from `frontend/` or `backend/`.
- A change here must not break the frontend typecheck or build.
- How the backend will consume this package is open (07 OD-19).
- Comments that cite `SoilMon_API_Spec`, "Spec Topik" or "F6" refer to a document that is not in the repository. It is not a source of truth; 06 Appendix A.2 maps each reference to the available documents (07 OD-16).

**`embeded/`**

- CE631L prototype firmware (node, gateway and test programs). Whether it is prototype or product code is open (07 OD-14).
- What it currently does is recorded in 03 Appendix A, which is non-normative. Firmware behaviour does not confirm sensor parameters, units, identifiers or timing (03 ODC-01, ODC-03, ODC-05).
- The LoRa line format is outside the data contract (03 INV-03).
- Do not change firmware as part of CE739L work without agreement from CE631L.

**`backend/`**

- Holds the Stage 1 scaffold only: `GET /health`, configuration, error handling and the PostgreSQL connection pool. No telemetry endpoints, schema or migrations exist yet.
- It is a standalone npm package (`npm install`, `npm start`, `npm test` inside `backend/`), not a pnpm workspace member. The root ESLint and Prettier configs ignore it (07 OD-19).
- It follows `05_API_SPEC.md` and `04_DATABASE_DESIGN.md`. The database is PostgreSQL (07 DB-01); the hosting provider is TBD (07 DB-17).

**Dependencies (all folders)**

- Do not add packages, tools or infrastructure without a documented decision (§5).

<!-- antislop:start -->
## antislop
For UI, copy, people, mobile layout, or code comments work, read these installed skill files directly (use these paths even if a same-named global skill exists):
- Core filter, always on: `antislop`: `.claude/skills/antislop/SKILL.md`
- UI / visual: `antislop-ui`: `.claude/skills/antislop-ui/SKILL.md`
- People: `antislop-human`: `.claude/skills/antislop-human/SKILL.md`
- Mobile / responsive: `antislop-layoutmobile`: `.claude/skills/antislop-layoutmobile/SKILL.md`
- Code comments: `antislop-code`: `.claude/skills/antislop-code/SKILL.md`
Before starting, follow the core's "Two Usage Modes" section in strict order: explicit session instruction first, then global preference, then ask. A session instruction always wins. For a resolved mode, say `antislop active: <mode> (session override).` or `antislop active: <mode> (global preference).` once before presenting findings or making edits, using the actual mode and source. Acknowledging the user's request without naming the source does not replace this notice.
Only an explicit choice of antislop during or after selects a session mode. A request to review, audit, or avoid file edits does not select a mode; read the global preference in that case. Another skill's mode does not select antislop's mode.
If the mode is unresolved, ask during/after and end the response; wait for the answer before any UI review, planning, or concept. For read-only tasks, put the active-mode notice only at the start of the final answer, never in progress messages. For editing tasks, announce before the first edit and omit it from the final answer.
To update antislop later: `npx antislop-ai --update`, or run `npx antislop-ai` and pick Overwrite them.
<!-- antislop:end -->
