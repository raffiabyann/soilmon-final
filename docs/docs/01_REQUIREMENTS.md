# 01 — SoilMon Requirements

## 1. Document Status and Purpose

| Field | Value |
|---|---|
| Document status | DRAFT |
| Version | 0.2 |
| Last updated | 2026-10-20 |
| Owner | TBD |
| Sources | `CLAUDE.md`; `docs/00_PROJECT_CONTEXT.md` (v0.2) |

This document defines **what** SoilMon must do. It does not define **how**.

- Product and system context is in `00_PROJECT_CONTEXT.md`.
- How each requirement is realised is specified later in `02_SYSTEM_ARCHITECTURE.md`, `03_DATA_CONTRACT.md`, `04_DATABASE_DESIGN.md`, `05_API_SPEC.md` and `06_WEB_APP_SPEC.md`.
- Open items are carried into `07_OPEN_DECISIONS.md`.

Every requirement here traces to `CLAUDE.md` or `00_PROJECT_CONTEXT.md`. Anything without a source is not a requirement.

Technology choices (frameworks, languages, libraries), data representation and API versioning are design decisions. They are not requirements and do not appear here, except as TBD where they need to be named.

---

## 2. Requirement Status Convention

| Label | Meaning |
|---|---|
| **CONFIRMED** | Explicitly decided or required in the source documents. |
| **PROPOSED** | A current design proposal or something under evaluation. It may change. |
| **TBD** | Not decided yet. Must not be assumed, invented or implemented. |

**Qualifiers**

- **CONFIRMED (goal):** the outcome is required, but its behaviour is TBD and is given in a separate row.
- **CONFIRMED (direction):** the architecture direction is confirmed, but implementation details are TBD.

**Promotion rule:** a status changes (TBD → PROPOSED → CONFIRMED) only through an explicit team decision. The decision is recorded in `07_OPEN_DECISIONS.md` and reflected here with a version bump.

**ID scheme**

| Prefix | Section |
|---|---|
| PG | Product goals |
| FR | Functional requirements |
| NFR | Non-functional requirements |
| C631 | CE631L requirements |
| C739 | CE739L requirements |
| OD | Open requirement decisions |

**Columns**

| Column | Meaning |
|---|---|
| Source | Where the requirement comes from. `00 §n` = `docs/00_PROJECT_CONTEXT.md` section n; `CLAUDE §n` = `CLAUDE.md` section n. |
| Verification | **Inspection** (check a document or artifact), **Demonstration** (show it working), or **TBD**: criteria to be defined. |
| Downstream doc | The document that will specify how the requirement is met. |

---

## 3. Product Goals

| ID | Goal | Status | Source | Verification | Downstream doc |
|---|---|---|---|---|---|
| PG-01 | Connect existing soil/field monitoring to automated and verifiable fertigation. | CONFIRMED | 00 §1, §6, §7 | TBD — see OD-01 | 02 |
| PG-02 | Realise the product as Monitor → Understand → Decide → Control → Verify. | CONFIRMED | 00 §1; CLAUDE §1 | TBD — see OD-01 | 02 |
| PG-03 | SoilMon is a real system that continues beyond UTS/UAS. The academic deliverables are milestones of the real project. | CONFIRMED | 00 §1; CLAUDE §1 | Inspection (documentation and design support continuation) | All |
| PG-04 | One shared system satisfies both CE631L and CE739L. | CONFIRMED | 00 §2, §18 | Demonstration (integration across the gateway → backend hand-off) | 02, 03 |

Measurable targets and acceptance criteria per stage are not product goals. They are an open decision (OD-AC, §10).

---

## 4. Functional Requirements

### 4.1 Monitor

| ID | Requirement | Status | Source | Verification | Downstream doc |
|---|---|---|---|---|---|
| FR-01 | Embedded node(s) shall measure soil/field conditions. | CONFIRMED | 00 §10 | Demonstration | 02 |
| FR-02 | Which soil/field parameters are measured, with their units and ranges. | TBD | 00 §11, §17 | TBD | 03 |
| FR-03 | Node(s) shall send measurements to a gateway over LoRa. | CONFIRMED (direction) | 00 §10, §13 | Demonstration | 02 |
| FR-04 | The gateway shall forward measurements to the backend via HTTPS POST. | CONFIRMED (direction) | 00 §10, §13 | Demonstration | 02, 03 |
| FR-05 | The backend API shall accept telemetry delivered according to the shared data contract. | CONFIRMED (contract contents TBD) | 00 §2.3, §12 | Demonstration | 03, 05 |
| FR-06 | The backend shall store received telemetry in a relational database. | CONFIRMED (technology TBD) | 00 §10, §12 | Demonstration | 04 |
| FR-07 | Sampling/transmission interval, retry behaviour and payload format. | TBD | 00 §13 | TBD | 02, 03 |

### 4.2 Understand

| ID | Requirement | Status | Source | Verification | Downstream doc |
|---|---|---|---|---|---|
| FR-08 | The backend shall expose stored field data to the web dashboard through a REST API. | CONFIRMED (direction) | 00 §10, §13 | Demonstration | 05 |
| FR-09 | The web dashboard shall present field data to users. | CONFIRMED | 00 §10, §12 | Demonstration | 06 |
| FR-10 | The web dashboard shall enable users to understand monitored field conditions. | CONFIRMED (Monitor → Understand direction) | 00 §1, §7, §10 | TBD — see OD-AC | 06 |
| FR-11 | Specific dashboard views, charts, history ranges, filtering and other UI details. | TBD | 00 §12 | TBD | 06 |
| FR-12 | Exact API endpoints. | TBD | 00 §12, §13 | TBD | 05 |

### 4.3 Decide

| ID | Requirement | Status | Source | Verification | Downstream doc |
|---|---|---|---|---|---|
| FR-13 | The system shall determine whether and when fertigation is needed, based on monitoring data. | CONFIRMED (goal) | 00 §1, §7, §10 | TBD — see OD-AC | 02 |
| FR-14 | Decision rules, thresholds and logic, and where they run (node, gateway or backend). | TBD | 00 §11, §13, §17 | TBD | 02 |

### 4.4 Control

| ID | Requirement | Status | Source | Verification | Downstream doc |
|---|---|---|---|---|---|
| FR-15 | Fertigation shall be carried out automatically through actuation. | CONFIRMED (goal) | 00 §1, §7, §10 | TBD — see OD-AC | 02 |
| FR-16 | Actuators, the command path from the system to the actuators, and timing. | TBD | 00 §10, §11, §13 | TBD | 02, 03 |
| FR-17 | Manual override, and remote/manual control from the dashboard. | TBD | 00 §10, §17 | TBD | 02, 06 |

### 4.5 Verify

| ID | Requirement | Status | Source | Verification | Downstream doc |
|---|---|---|---|---|---|
| FR-18 | The system shall use monitoring data to verify fertigation. | CONFIRMED (goal) | 00 §1, §7, §10 | TBD — see OD-AC | 02 |
| FR-19 | What counts as "verified", how it is measured, and how results are presented. | TBD | 00 §13, §17 | TBD | 02, 06 |

### 4.6 Simulation

| ID | Requirement | Status | Source | Verification | Downstream doc |
|---|---|---|---|---|---|
| FR-20 | A simulator shall provide telemetry in place of Embedded Node + Gateway during development. | CONFIRMED | 00 §2.3, §13; CLAUDE §2 | Demonstration | 02, 03 |
| FR-21 | The simulator shall follow the same conceptual data contract as the real gateway. | CONFIRMED | 00 §12, §13; CLAUDE §2 | Inspection (simulator output against `03`) | 03 |

### 4.7 Other Functional Areas

| ID | Requirement | Status | Source | Verification | Downstream doc |
|---|---|---|---|---|---|
| FR-22 | Alerts/notifications. | TBD | 00 §10 | TBD | 02, 06 |
| FR-23 | Users, roles, authentication and authorisation. | TBD | 00 §10, §12 | TBD | 02, 05, 06 |
| FR-24 | Support for multiple farms. | TBD | 00 §10 | TBD | 02, 04 |

---

## 5. Non-functional Requirements

| ID | Requirement | Status | Source | Verification | Downstream doc |
|---|---|---|---|---|---|
| NFR-01 | Replacing simulated telemetry with real telemetry shall not require a complete frontend or backend rewrite. | CONFIRMED | 00 §12, §18; CLAUDE §2 | Demonstration (switch the data source without rewriting either side) | 02, 03 |
| NFR-02 | Persistent storage shall be relational. The technology is PostgreSQL, a design decision recorded in 04 §12 (DB-01). The hosting provider is TBD (04 DB-17). | CONFIRMED / TBD | 00 §10; CLAUDE §5 | Inspection | 04 |
| NFR-03 | Gateway → backend transport shall be HTTPS. Security details are TBD. | CONFIRMED (direction) / TBD | 00 §13 | Inspection | 02, 05 |
| NFR-04 | The backend → dashboard interface shall be REST. | CONFIRMED (direction) | 00 §13 | Inspection | 05 |
| NFR-05 | Data representation and API versioning. | TBD | 00 §13 | TBD | 03, 05 |
| NFR-06 | Prefer technologies familiar to the team. Add no frameworks or infrastructure without a documented requirement. | CONFIRMED (constraint) | CLAUDE §5; 00 §18 | Inspection | 02 |
| NFR-07 | Requirements and decisions shall be documented in `/docs`. TBD items shall not be silently implemented. | CONFIRMED (constraint) | CLAUDE §3, §4; 00 §15 | Inspection | All |
| NFR-08 | SoilMon shall be maintainable as a long-lived real system, not a throwaway prototype. | CONFIRMED (principle); measurable criteria TBD | 00 §1, §18 | TBD | 02 |
| NFR-09 | Performance, latency, availability, data retention and reliability. | TBD | 00 §7 | TBD | 02 |
| NFR-10 | Hardware power supply and environmental durability. | TBD | 00 §4, §11 | TBD | 02 |
| NFR-11 | Delivery form (responsive web vs. native mobile) and target user devices. | TBD | 00 §3, §12 | TBD | 06 |
| NFR-12 | Deployment/hosting. | TBD | 00 §12 | TBD | 02 |

The specific technology stack is not a requirement. It is recorded in `CLAUDE.md` §5 and will be documented in the architecture/design docs.

---

## 6. CE631L Requirements — Embedded System Design

| ID | Requirement | Status | Source | Verification | Downstream doc |
|---|---|---|---|---|---|
| C631-01 | CE631L delivers hardware, firmware, sensing, communication, actuation and the gateway. | CONFIRMED | 00 §2.1, §11; CLAUDE §1 | Demonstration | 02 |
| C631-02 | Communication follows Embedded Node → LoRa → Gateway → HTTPS POST to the backend. | CONFIRMED (direction) | 00 §11, §13; CLAUDE §2 | Demonstration | 02 |
| C631-03 | Gateway output shall conform to the shared data contract. | CONFIRMED (contract contents TBD) | 00 §2.3, §13 | Inspection against `03` | 03 |
| C631-04 | Hardware: ESP32-WROOM-32U, LoRa E220-900T22D, RS485 soil sensor, LiFePO4 32700, TP5000, XL6009, AMS1117. | PROPOSED (each component) | 00 §11, §16 | — | 02 |
| C631-05 | Gateway hardware, actuators, node count/placement, enclosure and LoRa configuration. | TBD | 00 §11, §17 | TBD | 02 |
| C631-06 | CE631L UTS/UAS deliverables. | TBD (not documented) | 00 §2.3 | TBD | — |

---

## 7. CE739L Requirements — Mobile Pervasive Computing

### 7.1 Required course deliverables

| ID | Deliverable | Status | Source | Verification | Downstream doc |
|---|---|---|---|---|---|
| C739-01 | Backend API | CONFIRMED | 00 §12, §15 | Demonstration | 05 |
| C739-02 | Relational database | CONFIRMED (technology TBD) | 00 §12, §15 | Demonstration | 04 |
| C739-03 | API design | CONFIRMED | 00 §12, §15 | Inspection | 05 |
| C739-04 | Database design | CONFIRMED | 00 §12, §15 | Inspection | 04 |
| C739-05 | Backend demo | CONFIRMED (acceptance criteria TBD) | 00 §12, §15 | Demonstration | 05 |
| C739-06 | Database demo | CONFIRMED (acceptance criteria TBD) | 00 §12, §15 | Demonstration | 04 |
| C739-07 | Frontend demo | CONFIRMED (acceptance criteria TBD) | 00 §12, §15 | Demonstration | 06 |
| C739-08 | Full-stack integration demo | CONFIRMED (acceptance criteria and data source TBD) | 00 §12, §15 | Demonstration | 02 |

### 7.2 Other CE739L requirements

| ID | Requirement | Status | Source | Verification | Downstream doc |
|---|---|---|---|---|---|
| C739-09 | Accept gateway telemetry via HTTPS POST, and serve the dashboard via a REST API. | CONFIRMED (direction) | 00 §12, §13 | Demonstration | 03, 05 |
| C739-10 | Develop against the simulator, and switch to real telemetry without a rewrite (FR-20, FR-21, NFR-01). | CONFIRMED | 00 §12; CLAUDE §2 | Demonstration | 02, 03 |
| C739-11 | Authentication, deployment and dashboard content. | TBD | 00 §12 | TBD | 05, 06 |

---

## 8. UTS/UAS Scope versus Long-term Product Scope

**CONFIRMED**

- The UTS architecture direction: Embedded Node → LoRa → Gateway → HTTPS POST → Backend API → Database → REST API → Web Dashboard (00 §13; CLAUDE §2).
- The full Monitor → Understand → Decide → Control → Verify loop is the long-term product goal (00 §1, §7).
- SoilMon continues after UAS (00 §1).

**Stage × milestone matrix**

| Stage | UTS | UAS | Long-term |
|---|---|---|---|
| Monitor | TBD | TBD | CONFIRMED (goal) |
| Understand | TBD | TBD | CONFIRMED (goal) |
| Decide | TBD | TBD | CONFIRMED (goal) |
| Control | TBD | TBD | CONFIRMED (goal) |
| Verify | TBD | TBD | CONFIRMED (goal) |

No UTS or UAS cell is filled in without an explicit team decision (OD-01).

---

## 9. Requirement Traceability Considerations

- **Upstream.** Each requirement cites its source in `00_PROJECT_CONTEXT.md` or `CLAUDE.md`.
- **Downstream.** Each requirement names the document that will specify it: `02` architecture, `03` data contract, `04` database, `05` API, `06` web app. Those documents must cite requirement IDs.
- **Scope control.** Any design or implementation that cannot be traced to a requirement ID is out of scope until a requirement is added.
- **Change control.** Status changes are recorded in `07_OPEN_DECISIONS.md`, then reflected here with a version bump. IDs are never reused.
- **Course deliverables.** C631 and C739 items trace to the product requirements they demonstrate. For example, C739-08 demonstrates FR-04 to FR-10 and NFR-01.
- **Verification.** "Demonstration" and "Inspection" record how a requirement can be checked. Pass/fail criteria are TBD under OD-AC.

---

## 10. Open Requirement Decisions

To be carried into `07_OPEN_DECISIONS.md`.

| ID | Open decision | Affects | Source |
|---|---|---|---|
| OD-AC | Acceptance criteria and measurable targets for each stage and each demo. | PG-01, PG-02, FR-10, FR-13, FR-15, FR-18, C739-05–08 | 00 §7 |
| OD-01 | Which stages (Monitor, Understand, Decide, Control, Verify) are delivered at UTS, at UAS and after the semester. CE739L's deliverables are monitoring-oriented, while the product goal is fertigation. | §8, PG-01, PG-02 | 00 §10, §17 |
| OD-02 | Meaning of "Verify": that fertigation *happened*, that it *had the intended effect*, or both. These may need separate requirements. | FR-18, FR-19 | 00 §1, §5, §6 |
| OD-03 | Where Decide runs, and the command path from the system to the actuators. The confirmed flow only carries data upward. | FR-14, FR-16, C631-05 | 00 §13, §17 |
| OD-04 | Whether SoilMon extends, reuses or replaces the existing monitoring system and dashboard. | FR-01–FR-11 | 00 §5, §17 |
| OD-05 | Whether the full-stack integration demo may use simulated telemetry or must use real gateway data. | C739-08 | 00 §12 |
| OD-06 | Whether the simulator must also use HTTPS POST to the same backend entry point as the gateway, or only the same conceptual data contract. | FR-20, FR-21 | 00 §13 |
| OD-07 | CE631L UTS/UAS deliverables. | C631-06 | 00 §2.3 |
| OD-08 | Whether the dashboard needs access control at all, and if so, the requirements for it. | FR-23, C739-11 | 00 §12, §17 |
| OD-09 | Status of the one-line stage definitions in `00` §1. The five-stage framing is CONFIRMED, but the wording of each definition is not status-labelled. | PG-02, FR-10, FR-13, FR-15, FR-18 | 00 §1 |
| OD-10 | Every other TBD row in §3–§7: sensor parameters, intervals, payload, endpoints, database technology, data representation, API versioning, UI details, alerts, multiple farms, quality attributes, hardware durability, delivery form, deployment and hardware confirmation. | See rows | 00 §17 |
