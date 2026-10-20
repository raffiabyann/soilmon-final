# 02 — SoilMon System Architecture

| Field | Value |
|---|---|
| Document status | DRAFT |
| Version | 0.2 |
| Last updated | 2026-10-20 |
| Owner | TBD |
| Sources | `CLAUDE.md`; `docs/00_PROJECT_CONTEXT.md` (v0.2); `docs/01_REQUIREMENTS.md` (v0.1); CE739L Project Assignment (`CE739L-PA`) |

---

## 1. Architecture Purpose and Scope

This document describes **how SoilMon is structured at system level**: its components, the boundaries between them, the direction data flows, and which course owns which part.

| Document | Role |
|---|---|
| `01_REQUIREMENTS.md` | Defines **what** the system must do. This document realises those requirements structurally and cites their IDs. |
| `03_DATA_CONTRACT.md` | Payload format and fields |
| `04_DATABASE_DESIGN.md` | Database schema and technology |
| `05_API_SPEC.md` | Endpoints and versioning |
| `06_WEB_APP_SPEC.md` | Pages and views |
| `07_OPEN_DECISIONS.md` | Where open decisions are tracked |

**Out of scope for this document:** database schema, API endpoint definitions, payload specification, frontend page specification, source code and infrastructure configuration.

**Source keys used in this document**

| Key | Meaning |
|---|---|
| `CLAUDE §n` | `CLAUDE.md` section n |
| `00 §n` | `docs/00_PROJECT_CONTEXT.md` section n |
| `01 <ID>` | A requirement ID in `docs/01_REQUIREMENTS.md` |
| `CE739L-PA` | The CE739L Project Assignment. It sets the minimum system composition and the Midterm/Final grading items. It is not currently stored in `/docs` (see C-5 in §15). |

---

## 2. Architecture Status

Statuses follow the same convention as `01_REQUIREMENTS.md` §2.

| Label | Meaning |
|---|---|
| **CONFIRMED** | Explicitly decided or required. |
| **PROPOSED** | A current proposal; may change. |
| **TBD** | Not decided. Must not be assumed or implemented. |

Every architectural decision and structural claim below carries a status and a source.

### 2.1 Confirmed architecture decisions

| ID | Decision | Source |
|---|---|---|
| AD-01 | UTS architecture direction: Embedded Node → LoRa → Gateway → HTTPS POST → Backend API → Database → REST API → Web Dashboard. | CLAUDE §2; 00 §13 |
| AD-02 | The system contains at least a smart device/embedded system communicating with a server, a backend server and a frontend interface. | CE739L-PA |
| AD-03 | Node → Gateway communication is over LoRa (direction). | 00 §13; 01 FR-03 |
| AD-04 | Gateway → Backend communication is via HTTPS POST (direction). This is the CE631L/CE739L integration boundary. | 00 §2.3, §13; 01 FR-04, C631-02 |
| AD-05 | Backend → Web Dashboard communication is over a REST API (direction). | 00 §13; 01 FR-08, NFR-04 |
| AD-06 | Persistent storage is relational and is accessed only through the backend. | 00 §10; 01 FR-06, NFR-02; derived from AD-01 |
| AD-07 | A development simulator stands in for Embedded Node + Gateway, using the same conceptual data contract as the real gateway. | CLAUDE §2; 01 FR-20, FR-21 |
| AD-08 | Swapping simulated telemetry for real telemetry requires no complete frontend or backend rewrite. | CLAUDE §2; 01 NFR-01 |
| AD-09 | The backend has three responsibilities: (a) accept telemetry under the data contract; (b) store it; (c) serve data to the dashboard. | 01 FR-05, FR-06, FR-08 |
| AD-10 | By UAS (Final), the system must include authentication, authorisation, a communication protocol, a cloud-related architecture and a cloud deployment. Mechanisms are TBD. | CE739L-PA |
| AD-11 | Full-stack integration must be demonstrable at UTS (Midterm). | CE739L-PA; 01 C739-08 |
| AD-12 | The long-term architecture must accommodate the full Monitor → Understand → Decide → Control → Verify loop. | 00 §1; 01 PG-02 |

### 2.2 Proposed architecture decisions

| ID | Decision | Source |
|---|---|---|
| AP-01 | CE631L node hardware: ESP32-WROOM-32U, LoRa E220-900T22D, RS485 soil sensor, LiFePO4 32700, TP5000, XL6009, AMS1117. Each component is PROPOSED. | 00 §11; 01 C631-04 |
| AP-02 | Application stack (see §6.4). The backend part is CONFIRMED (07 §9.1); the frontend part stays PROPOSED. | CLAUDE §5 ("current intended stack"); 07 §9.1 |

### 2.3 TBD architecture decisions

Listed in full in §15 (OAD-xx).

---

## 3. System Context

```text
                 ┌───────────────────────────────────────────┐
  Farm field ───►│                                           │◄─── Farm users
  (soil/field    │                 SoilMon                   │     (who: TBD, 00 §3)
   conditions)   │                                           │
                 └───────────────────────────────────────────┘
                     ▲                 ▲                  ▲
                     │                 │                  │
    Existing monitoring system   Development simulator   Hosting / cloud
    (relationship TBD:           (stands in for field    (required by UAS;
     extend / reuse / replace)    side during dev)        provider TBD)
```

| External entity | Relationship to SoilMon | Status | Source |
|---|---|---|---|
| Starfruit farm field, Tuban | Source of soil/field conditions; target of fertigation. | CONFIRMED | 00 §4 |
| Farm users | View field data through the web dashboard. Identity and roles TBD. | CONFIRMED (users exist) / TBD (who) | 00 §3; 01 FR-09 |
| Existing monitoring system (sensors, LoRa, dashboard) | Already in place. Whether SoilMon extends, reuses or replaces it is TBD. | CONFIRMED (exists) / TBD (relationship) | 00 §5; 01 OD-04 |
| Development simulator | Provides telemetry during development in place of the field side. | CONFIRMED | 01 FR-20 |
| Hosting / cloud | Where the application side runs. Cloud deployment is required by UAS; provider and topology TBD. | CONFIRMED (required by UAS) / TBD (how) | CE739L-PA |
| Academic assessors (CE631L, CE739L) | Evaluate UTS/UAS milestones. | CONFIRMED | 00 §3 |

---

## 4. High-level End-to-end Architecture

### 4.1 Main architecture diagram

```text
 Legend:  ───►  CONFIRMED direction      - - ->  TBD / future path      (P) PROPOSED

 ┌──────────────── CE631L — Field side (farm, Tuban) ───────────────┐
 │                                                                  │
 │  ┌──────────────────────────────┐          ┌──────────────────┐  │
 │  │ Embedded Node(s)             │   LoRa   │                  │  │
 │  │  · soil sensor (P)           │─────────►│     Gateway      │  │
 │  │  · microcontroller (P)       │          │ (hardware TBD)   │  │
 │  │  · LoRa radio (P)            │          │                  │  │
 │  │  · power supply (P)          │          └────────┬─────────┘  │
 │  └──────────────────────────────┘                   │            │
 │                                                     │            │
 │  ┌ - - - - - - - - - - - - - - ┐                    │            │
 │    Actuator(s) — TBD          ◄ - - - - - - - - - - - - - - - -  │ ◄ - Command path TBD
 │  └ - - - - - - - - - - - - - - ┘                    │            │      (existence, route,
 └─────────────────────────────────────────────────────┼────────────┘       owner TBD)
                                                       │
 ══════════════ Gateway → Backend boundary ════════════╪══════════════════════════════════
               HTTPS POST · shared data contract (03)  │
                                                       │       ┌ - - - - - - - - - - - - - ┐
                                                       │◄- - -   Development simulator
                                                       │         (same conceptual contract)
                                                       ▼       └ - - - - - - - - - - - - - ┘
 ┌─────────────── CE739L — Application side (hosting/cloud: required by UAS, TBD) ───────────┐
 │                                                                                         │
 │   ┌───────────────────────────────┐            ┌──────────────────────────────┐         │
 │   │ Backend API                   │───────────►│ Relational Database          │         │
 │   │  · telemetry intake           │◄───────────│ (technology TBD)             │         │
 │   │  · data serving               │            └──────────────────────────────┘         │
 │   └───────────────┬───────────────┘                                                     │
 │                   │ REST API                                                            │
 │                   ▼                                                                     │
 │   ┌───────────────────────────────┐                                                     │
 │   │ Web Dashboard                 │────────►  Farm users                                │
 │   └───────────────────────────────┘                                                     │
 │                                                                                         │
 │   Cross-cutting (required by UAS, mechanisms TBD):  Authentication · Authorisation ·    │
 │                                                     Cloud deployment                    │
 │                                                                                         │
 │   ┌ - - - - - - - - - - - - - - - - - - ┐                                               │
 │     Decide — location TBD                                                               │
 │     (node / gateway / backend)                                                          │
 │   └ - - - - - - - - - - - - - - - - - - ┘                                               │
 └─────────────────────────────────────────────────────────────────────────────────────────┘

 Side: Existing monitoring system (sensors, LoRa, dashboard) — relationship to SoilMon TBD
 Verify: the effect of fertigation is observed back through the normal monitoring flow (method TBD)
```

*"Decide — location TBD" is drawn inside the application zone only for layout. Where Decide runs is TBD (OAD-08).*

### 4.2 Components

| Component | Responsibility | Owner | Status | Requirements |
|---|---|---|---|---|
| Embedded Node(s) | Measure soil/field conditions; transmit over LoRa. | CE631L | CONFIRMED (role); parts PROPOSED | FR-01, FR-03, C631-04 |
| Actuator(s) | Carry out fertigation. | CE631L | CONFIRMED (goal); hardware and interface TBD | FR-15, FR-16 |
| Gateway | Sits between the LoRa link and the HTTPS POST boundary. | CE631L | CONFIRMED (role); internal design and hardware TBD | FR-04, C631-02, C631-05 |
| Development simulator | Produces telemetry at the gateway-to-backend boundary during development. | CE739L (consumer) | CONFIRMED; ownership/build TBD | FR-20, FR-21 |
| Backend API | Telemetry intake, storage, data serving. | CE739L | CONFIRMED (responsibilities) | FR-05, FR-06, FR-08, C739-01 |
| Relational Database | Persist telemetry and system data. | CE739L | CONFIRMED (relational; PostgreSQL); provider TBD (04 DB-17) | FR-06, NFR-02, C739-02 |
| Web Dashboard | Present field data so users can understand field conditions. | CE739L | CONFIRMED (role); views TBD | FR-09, FR-10, FR-11, C739-07 |
| Decide function | Determine whether/when fertigation is needed. | TBD | CONFIRMED (goal); location and logic TBD | FR-13, FR-14 |

### 4.3 Product stages mapped to components

| Stage | Components involved | Status |
|---|---|---|
| Monitor | Embedded Node → LoRa → Gateway → HTTPS POST → Backend → Database | CONFIRMED (direction) |
| Understand | Database → Backend → REST API → Web Dashboard → users | CONFIRMED (direction) |
| Decide | Decide function — location TBD | TBD |
| Control | Command path (TBD) → Actuator(s) | TBD |
| Verify | Monitoring flow after fertigation; method TBD | TBD |

---

## 5. CE631L / Embedded-side Architecture

| Element | Description | Status | Source |
|---|---|---|---|
| Embedded Node(s) | Sensing and LoRa transmission. Parameters measured TBD. | CONFIRMED (role) | 00 §11; 01 FR-01, FR-02 |
| Node hardware | ESP32-WROOM-32U (MCU), LoRa E220-900T22D (radio), RS485 soil sensor, LiFePO4 32700 (battery), TP5000 (charging), XL6009 (boost), AMS1117 (regulator). | PROPOSED (each) | 00 §11; 01 C631-04 |
| Node count, placement, enclosure | — | TBD | 00 §11; 01 C631-05 |
| Node → Gateway link | LoRa. Configuration TBD. | CONFIRMED (direction) / TBD (config) | 00 §13; 01 FR-03 |
| Gateway | Its only confirmed role is to sit between the LoRa link and the HTTPS POST boundary. Internal design, processing and hardware are TBD. | CONFIRMED (role) / TBD (design) | 00 §13; 01 FR-04, C631-05 |
| Actuation | Part of CE631L scope. Actuators, interface and command source TBD. | CONFIRMED (scope) / TBD (design) | 00 §2.1, §11; 01 FR-15, FR-16 |
| Power and environmental durability | — | TBD | 01 NFR-10 |

---

## 6. CE739L / Application-side Architecture

### 6.1 Backend API — CONFIRMED (responsibilities)

| Responsibility | Status | Source |
|---|---|---|
| Accept telemetry delivered over HTTPS POST under the shared data contract | CONFIRMED | 01 FR-05, C739-09 |
| Store received telemetry in the relational database | CONFIRMED | 01 FR-06 |
| Serve stored data to the web dashboard over a REST API | CONFIRMED | 01 FR-08, C739-09 |
| Internal module structure | TBD | — |
| Endpoints and versioning | TBD (`05`) | 01 FR-12, NFR-05 |

### 6.2 Relational Database — CONFIRMED (relational; PostgreSQL) / TBD (provider)

Accessed only by the backend (AD-06). Schema goes in `04`. Technology: PostgreSQL, CONFIRMED (04 §12, DB-01). Hosting provider TBD (04 DB-17; OAD-06).

### 6.3 Web Dashboard — CONFIRMED (role)

Presents field data and enables users to understand monitored field conditions (01 FR-09, FR-10). It gets data only through the REST API. Views, charts and UI details are TBD (`06`; 01 FR-11). Delivery form (responsive web vs. native mobile) is TBD (01 NFR-11).

### 6.4 Application stack — CONFIRMED (backend) / PROPOSED (frontend)

| Layer | Technology | Status | Source |
|---|---|---|---|
| Frontend | React, TypeScript, Vite, Tailwind CSS, Recharts (where charting is required) | PROPOSED | CLAUDE §5 |
| Backend | Node.js; JavaScript with ES Modules (not TypeScript); Express; PostgreSQL through the `pg` driver | CONFIRMED (SoilMon Team) | 07 §9.1 |

This stack is a design choice, not a requirement (01 §1). The backend row was confirmed by the SoilMon Team (07 §9.1). The frontend row stays PROPOSED until confirmed by the team.

### 6.5 UAS-required concerns — CONFIRMED (required) / TBD (mechanism)

| Concern | Status | Source |
|---|---|---|
| Authentication | Required by UAS; mechanism TBD | CE739L-PA |
| Authorisation | Required by UAS; model TBD | CE739L-PA |
| Cloud-related architecture | Required by UAS; design TBD | CE739L-PA |
| Cloud deployment | Required by UAS; provider and topology TBD | CE739L-PA |

---

## 7. Gateway-to-Backend Boundary

This is the **single integration point** between CE631L and CE739L. **CONFIRMED** (00 §2.3; 01 FR-04, C631-02, C739-09)

| Aspect | Status |
|---|---|
| The boundary exists between Gateway and Backend API | CONFIRMED |
| Direction: Gateway → Backend via HTTPS POST | CONFIRMED |
| Traffic conforms to the shared data contract (`03`) | CONFIRMED |
| The simulator delivers to the same boundary under the same conceptual contract | CONFIRMED |
| How the gateway produces its POST | Not fixed here (CE631L design) |
| How the backend processes the POST internally | Not fixed here (CE739L design) |
| Payload contents and representation | TBD (`03`) |
| Security details | TBD |
| Retry behaviour | TBD |
| Sampling/transmission interval | TBD |
| Simulator transport parity (same transport and entry point as the gateway) | TBD (01 OD-06) |

---

## 8. Backend / Database / Frontend Relationships

| Rule | Status | Source |
|---|---|---|
| Only the backend reads from and writes to the database. | CONFIRMED | Derived from AD-01 (Backend API → Database) |
| The web dashboard gets data only through the REST API. | CONFIRMED | Derived from AD-01 (REST API → Web Dashboard) |
| The gateway and simulator reach stored data only through the backend. | CONFIRMED | Derived from AD-01, AD-04 |
| Whether the frontend and backend are deployed together or separately. | TBD | CE739L-PA (cloud deployment); OAD-06 |

---

## 9. Data Flow Direction

| Flow | Path | Status |
|---|---|---|
| Telemetry (upward) | Embedded Node → LoRa → Gateway → HTTPS POST → Backend → Database | CONFIRMED (direction) |
| User data access | Web Dashboard → REST API request → Backend → Database → response → Web Dashboard | CONFIRMED (direction) |
| Development telemetry | Simulator → Gateway-to-Backend boundary → Backend → Database | CONFIRMED |
| Command (downward) | System → … → Actuator(s) | TBD: existence, route, protocol, owner |

---

## 10. Development Simulator Path

**CONFIRMED:**

- The simulator stands in for Embedded Node + Gateway during development (AD-07).
- It follows the same conceptual data contract as the real gateway (01 FR-21).
- It feeds the backend at the gateway-to-backend boundary. Nothing behind the boundary needs to know whether data is simulated or real.
- Replacing it with real telemetry requires no complete frontend or backend rewrite (AD-08).

**TBD:**

- Whether the simulator uses the same transport and entry point as the gateway (01 OD-06).
- Whether the Midterm integration demo may use simulated data (01 OD-05).
- Who builds and owns the simulator.

---

## 11. UTS Architecture Scope

**CONFIRMED (CE739L-PA, Midterm grading items):**

- Background/problem, and how the system provides the solution
- General system architecture (this document supports the required architecture diagram)
- "Half-REST API design" (quoted as written in the assignment; its meaning is not interpreted here, see C-4)
- Backend demo
- Database demo
- Frontend demo
- Full-stack integration

**CONFIRMED (architecture):** the UTS direction in AD-01.

**TBD:** which of the five product stages are covered at UTS (01 OD-01), and the data source for the integration demo (01 OD-05).

---

## 12. UAS / Future Architecture Considerations

**CONFIRMED (CE739L-PA, Final grading adds):**

- Finalised problem statement
- Backend, database and frontend functionality
- Authentication
- Authorisation
- Communication protocol
- Cloud-related architecture
- Cloud deployment

**TBD:**

- The mechanism for each item above.
- What "communication protocol" specifically refers to in the Final grading.
- The relationship with the existing monitoring system (extend / reuse / replace).
- Which product stages are covered at UAS.

---

## 13. Product-level Future Control/Verification Path

The long-term product closes the loop (AD-12). This path is **separate from the confirmed UTS architecture**. Every element of it is TBD.

```text
  Monitor ───► Understand ───► Decide - - -► Control - - -► Verify
  (confirmed)  (confirmed)     (TBD)         (TBD)          (TBD)
                                 │              │              │
                       location TBD   command path TBD   observed via the
                       (node / gateway  and actuators TBD  monitoring flow;
                        / backend)                         method TBD
```

| Element | What is known | Status |
|---|---|---|
| Decide | Must use monitoring data (01 FR-13). | CONFIRMED (goal); location and logic TBD |
| Control | Fertigation carried out through actuation (01 FR-15). | CONFIRMED (goal); actuators, command path, protocol TBD |
| Verify | Uses monitoring data (01 FR-18). Whether it means "it happened", "it had the intended effect" or both is open (01 OD-02). | CONFIRMED (goal); method TBD |
| Manual override | — | TBD (01 FR-17) |

---

## 14. Architecture Constraints

| Constraint | Status | Source |
|---|---|---|
| SoilMon is a real, long-lived system; the architecture must not be throwaway. | CONFIRMED | 00 §1; 01 PG-03, NFR-08 |
| Simulated telemetry is replaceable by real telemetry without a complete frontend/backend rewrite. | CONFIRMED | 01 NFR-01 |
| Storage is relational. | CONFIRMED | 01 NFR-02 |
| No additional frameworks or infrastructure without a documented requirement. | CONFIRMED | CLAUDE §5; 01 NFR-06 |
| TBD items are not silently implemented. | CONFIRMED | CLAUDE §3, §4; 01 NFR-07 |
| Minimum composition: smart device/embedded system communicating with a server, a backend server and a frontend interface. | CONFIRMED | CE739L-PA |

---

## 15. Open Architecture Decisions

To be carried into `07_OPEN_DECISIONS.md`.

| ID | Open decision | Related |
|---|---|---|
| OAD-01 | Protocol details beyond the confirmed directions: LoRa configuration, HTTPS security, retry, intervals. | FR-07, NFR-03 |
| OAD-02 | Data contract contents and data representation. | `03`; NFR-05 |
| OAD-03 | API details, endpoints and versioning. | `05`; FR-12, NFR-05 |
| OAD-04 | Database technology/provider. Technology resolved as 04 DB-01 (PostgreSQL). The provider is 04 DB-17, decided with OAD-06. | `04`; NFR-02 |
| OAD-05 | Authentication mechanism and authorisation model. | AD-10; FR-23 |
| OAD-06 | Cloud provider and deployment topology, including what is hosted where. This includes the database hosting provider (04 DB-17). | AD-10; NFR-12 |
| OAD-07 | What "communication protocol" refers to in the CE739L Final grading. | AD-10 |
| OAD-08 | Where Decide runs, and the decision logic. | FR-13, FR-14 |
| OAD-09 | Actuator hardware, the command/downlink path and the command protocol. | FR-15, FR-16 |
| OAD-10 | Verification logic. | FR-18, FR-19; 01 OD-02 |
| OAD-11 | Relationship with the existing monitoring system. | 01 OD-04 |
| OAD-12 | Which product stages are in UTS vs. UAS scope. | 01 OD-01 |
| OAD-13 | Gateway hardware and internal design. | C631-05 |
| OAD-14 | Simulator transport parity, and simulator ownership. | 01 OD-06 |
| OAD-15 | Data source for the Midterm integration demo. | 01 OD-05 |

### Contradictions and gaps recorded for follow-up

These contradictions are recorded for follow-up and must not be fixed as part of this document.

| ID | Finding |
|---|---|
| C-1 | `01` FR-23, C739-11 and OD-08 treat authentication/authorisation as TBD, including whether they are needed at all. CE739L-PA requires both by UAS. |
| C-2 | `01` NFR-12 and `00` §12 treat deployment as TBD. CE739L-PA requires cloud deployment and cloud-related architecture by UAS. |
| C-3 | The CE739L deliverable lists in `00` §12/§15 and `01` §7 do not include the Final items: finalised problem statement, authentication, authorisation, communication protocol, cloud architecture and deployment. |
| C-4 | The meaning of "half-REST API design" (Midterm) is unclear. It is quoted verbatim and not interpreted. |
| C-5 | CE739L-PA is not stored in `/docs`, so this document cites a source outside the repository. |
