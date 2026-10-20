# 00 — SoilMon Project Context

| Field | Value |
|---|---|
| Document status | DRAFT |
| Version | 0.3 |
| Last updated | 2026-10-20 |
| Owner | TBD |
| Sources | `CLAUDE.md`; project kickoff brief; project team corrections (rev. 0.2) |

> This document sets out the shared product and system context for the real SoilMon project. It does **not** specify implementation. Requirements, architecture, data contract, database, API and web app details go in documents `01`–`06`. Open items are tracked in `07_OPEN_DECISIONS.md`.

## Status labels

| Label | Meaning |
|---|---|
| **CONFIRMED** | Explicitly decided or required. |
| **PROPOSED** | A current design proposal or something under evaluation. It may change. |
| **TBD** | Not decided yet. Must not be assumed or invented. |

A PROPOSED or TBD item becomes CONFIRMED only through an explicit team decision recorded in the docs.

---

## 1. Project Overview

SoilMon is an IoT-based monitoring and automated fertigation system for a starfruit farm in Tuban, East Java. **CONFIRMED**

Soil/field monitoring already exists, using sensors, LoRa and a monitoring dashboard. SoilMon's purpose is to connect that monitoring to **automated and verifiable fertigation**. **CONFIRMED**

SoilMon is described by five stages: **CONFIRMED**

```text
Monitor → Understand → Decide → Control → Verify
```

| Stage | Meaning (product level) |
|---|---|
| Monitor | Measure soil/field conditions in the field and deliver the data. |
| Understand | Turn the measurements into information people can use (current state and history). |
| Decide | Determine whether and when fertigation is needed. |
| Control | Carry out fertigation through actuation. |
| Verify | Confirm, using monitoring data, that fertigation actually happened and had the intended effect. |

How each stage works (thresholds, rules, control logic, verification criteria) is **TBD**.

SoilMon is a **real project** and continues beyond UTS/UAS. The academic deliverables are milestones of the real project, not a disposable prototype. **CONFIRMED**

## 2. Academic Context

SoilMon is the shared project for two courses. **CONFIRMED**

### 2.1 CE631L — Embedded System Design

Covers the embedded system: hardware, firmware, sensing, communication, actuation and the gateway. **CONFIRMED**

### 2.2 CE739L — Mobile Pervasive Computing

Covers the application side: backend API, database, web application and end-to-end data flow. **CONFIRMED**

### 2.3 How both courses share the same real SoilMon project

- Both courses work on **one** SoilMon system, not two separate projects. **CONFIRMED**
- CE631L is responsible for the system from the embedded node up to the gateway. CE739L is responsible from the backend up to the web dashboard. The courses meet where the gateway sends data to the backend over HTTPS POST. **CONFIRMED**
- That hand-off is governed by a shared data contract, to be defined in `03_DATA_CONTRACT.md`. Its contents are **TBD**.
- Real embedded telemetry may not be available while the application side is being built. The application side therefore develops against **simulated telemetry** as an intentional strategy. **CONFIRMED**
- UTS and UAS are milestones of the real project. **CONFIRMED** What each course delivers at each milestone (beyond §12), and the dates, are **TBD**.

## 3. Stakeholder

| Item | Status |
|---|---|
| Primary real-world stakeholder: the starfruit farm in Tuban, East Java | **CONFIRMED** |
| Named contact person(s) and their roles at the farm | **TBD** |
| Day-to-day users of the dashboard | **TBD** |
| Users' devices and technical familiarity | **TBD** |
| Academic stakeholders: CE631L and CE739L lecturers/assessors | **CONFIRMED** |
| Project team members and their roles | **TBD** |

## 4. Real-world Context

| Item | Status |
|---|---|
| Location: Tuban, East Java, Indonesia | **CONFIRMED** |
| Crop: starfruit | **CONFIRMED** |
| Soil/field monitoring with sensors, LoRa and a monitoring dashboard is already in place | **CONFIRMED** |
| Fertigation is currently manual | **CONFIRMED** |
| Farm size, number of trees/plots, field layout | **TBD** |
| Water source and fertigation equipment | **TBD** |
| On-site power availability | **TBD** |
| Internet/cellular coverage at the gateway location | **TBD** |
| Environmental conditions the hardware must withstand | **TBD** |

## 5. Current Situation

**CONFIRMED:**

```text
Sensor + LoRa + monitoring dashboard
+
Fertigation is still manual and not fully verified
```

- Soil/field conditions are already monitored using sensors, LoRa and a monitoring dashboard.
- Fertigation is carried out manually.
- Fertigation is not fully verified. No closed loop confirms that it took place and had the intended effect.
- Monitoring and fertigation are not yet fully connected.

**TBD:**

- Whether the existing monitoring system is an earlier version of SoilMon or a separate system, and whether SoilMon will extend, reuse or replace it.
- What the existing monitoring measures and how its data is stored.
- How fertigation decisions are made and carried out today, and by whom.
- How fertigation is checked today, if at all.

## 6. Problem Statement

**CONFIRMED (core problem):**

Basic monitoring is not the gap. The farm can already observe soil/field conditions, but that monitoring is **not yet connected to fertigation**. Fertigation stays manual, and there is no reliable way to verify that it was carried out or that it had the intended effect on field conditions.

**TBD:** the concrete, evidenced impact of this gap on the farm, such as labour, consistency, inputs or crop outcome. Do not quantify it until the stakeholder has provided data.

## 7. Expected / Target Situation

**CONFIRMED (direction):**

```text
Monitoring data supports automated fertigation and verification
```

- Monitoring data feeds fertigation decisions (Monitor → Understand → Decide).
- Fertigation is carried out automatically through actuation (Control).
- Monitoring data is used to verify fertigation (Verify).
- The system remains in use after the academic milestones.

**TBD:** measurable targets and acceptance criteria for each stage. These are defined in `01_REQUIREMENTS.md` and must not be invented here.

## 8. SoilMon Product Vision

**PROPOSED (wording):**

> SoilMon closes the loop between field monitoring and fertigation on the starfruit farm in Tuban. It turns the measurements the farm already collects into decisions, carries those decisions out through automated fertigation, and verifies the result. SoilMon is built as a real, maintainable system that continues beyond its first academic milestones.

The underlying direction (Monitor → Understand → Decide → Control → Verify) is **CONFIRMED**.

## 9. Value Provided by the System

**PROPOSED** (qualitative; to be validated with the stakeholder):

| Stage | Value |
|---|---|
| Monitor / Understand | Field conditions become information that can drive action, not just readings on a dashboard. |
| Decide | Fertigation decisions rest on measured data and documented rules, not manual judgement alone. |
| Control | Less manual effort to carry out fertigation. |
| Verify | Evidence that fertigation happened and had its intended effect. |
| Project | One real, documented system that meets both courses' requirements and keeps evolving. |

Quantified benefits are **TBD** and will not be estimated in this document.

## 10. High-level System Scope

| Area | Status |
|---|---|
| Field sensing by embedded node(s) | **CONFIRMED** |
| Node → gateway over LoRa | **CONFIRMED** (direction) |
| Gateway → backend over HTTPS POST | **CONFIRMED** (direction) |
| Backend storing telemetry in a relational database | **CONFIRMED**; database technology **PostgreSQL** (04 DB-01); hosting provider **TBD** (04 DB-17) |
| REST API serving the web dashboard | **CONFIRMED** (direction) |
| Web dashboard | **CONFIRMED** |
| Simulated telemetry following the same conceptual data contract as the real gateway | **CONFIRMED** |
| Automated fertigation (Decide → Control) | **CONFIRMED** as product goal; logic and behaviour **TBD** |
| Fertigation verification (Verify) | **CONFIRMED** as product goal; verification method **TBD** |
| Command path from system to actuators | **TBD** |
| Which stages are delivered at UTS vs. UAS vs. after the semester | **TBD** |
| Manual override, alerts/notifications, user roles, multiple farms | **TBD** |
| Native mobile app vs. web-only delivery | **TBD** |

## 11. CE631L Scope — Embedded System Design

**CONFIRMED (responsibilities):** hardware, firmware, sensing, communication (node → LoRa → gateway → HTTPS POST), actuation, gateway.

**Current hardware design under discussion:**

| Component | Role (as discussed) | Status |
|---|---|---|
| ESP32-WROOM-32U | Microcontroller | **PROPOSED** |
| LoRa E220-900T22D | LoRa radio module | **PROPOSED** |
| RS485 soil sensor | Soil sensing | **PROPOSED** |
| LiFePO4 32700 | Battery | **PROPOSED** |
| TP5000 | Battery charging | **PROPOSED** |
| XL6009 | DC-DC boost converter | **PROPOSED** |
| AMS1117 | Voltage regulator | **PROPOSED** |

> The team should change any component above to CONFIRMED once it has been decided.

| Item | Status |
|---|---|
| Soil parameters measured by the RS485 sensor | **TBD** |
| Sampling and transmission intervals | **TBD** |
| LoRa configuration | **TBD** |
| Gateway hardware | **TBD** |
| Actuators for fertigation | **TBD** |
| Where fertigation decisions run (node, gateway or backend) | **TBD** |
| Number of nodes, placement, enclosure | **TBD** |

## 12. CE739L Scope — Mobile Pervasive Computing

**CONFIRMED (responsibilities):** backend API, database, web application, end-to-end data flow.

**CONFIRMED (required course deliverables):**

- Backend API
- Relational database
- API design
- Database design
- Backend demo
- Database demo
- Frontend demo
- Full-stack integration demo

| Item | Status |
|---|---|
| Receive telemetry from gateway via HTTPS POST | **CONFIRMED** (direction) |
| Serve the dashboard via REST API | **CONFIRMED** (direction) |
| Develop against simulated telemetry that uses the same conceptual data contract as the real gateway | **CONFIRMED** |
| Replace simulated telemetry with real telemetry without rewriting frontend/backend | **CONFIRMED** |
| Database technology / provider | Technology **CONFIRMED**: PostgreSQL (04 DB-01); hosting provider **TBD** (04 DB-17) |
| Exact API endpoints | **TBD** (`05_API_SPEC.md`) |
| Dashboard content and views | **TBD** (`06_WEB_APP_SPEC.md`) |
| Authentication and authorisation | **TBD** |
| Hosting / deployment | **TBD** |

## 13. End-to-End System Concept

**CONFIRMED architecture direction (UTS):**

```text
Embedded Node
   → LoRa
Gateway
   → HTTPS POST
Backend
   → Database
   → REST API
Web Dashboard
```

During development, a **simulator** may stand in for Embedded Node + Gateway. It sends data to the backend under the same conceptual data contract as the real gateway, so it can later be swapped for real telemetry. **CONFIRMED**

Mapping to the product stages:

| Stage | Where it sits in the concept | Status |
|---|---|---|
| Monitor | Embedded Node → LoRa → Gateway → Backend → Database | **CONFIRMED** (direction) |
| Understand | Backend → REST API → Web Dashboard | **CONFIRMED** (direction) |
| Decide | Location not yet decided | **TBD** |
| Control | Requires a command path to actuators, which the flow above does not show | **TBD** |
| Verify | Uses monitoring data after fertigation; method not yet decided | **TBD** |

**TBD (belongs in later documents):** payload format, fields, sampling interval, retry logic, transport security details, exact API endpoints.

## 14. Current Project Status

As of 2026-10-07:

- Soil/field monitoring with sensors, LoRa and a monitoring dashboard already exists. **CONFIRMED**
- Fertigation is still manual and not fully verified. **CONFIRMED**
- CE631L hardware design is under discussion (see §11). **PROPOSED**
- The SoilMon repository has been created (`.claude/`, `backend/`, `docs/`, `frontend/`, `CLAUDE.md`, `README.md`). **CONFIRMED**
- No application code, frontend/backend initialisation or dependencies yet, by design. Documentation comes first. **CONFIRMED**
- Real telemetry is not yet available to the application side. **CONFIRMED**
- This document is the first in the set. `01`–`07` are not yet written.

## 15. Confirmed Decisions

1. SoilMon is a real project for a starfruit farm in Tuban, East Java, continuing beyond UTS/UAS.
2. One shared project across CE631L and CE739L, with responsibilities as in §2.
3. Monitoring already exists. SoilMon's focus is automated and verifiable fertigation.
4. Product framing: Monitor → Understand → Decide → Control → Verify.
5. Architecture direction for UTS: Embedded Node → LoRa → Gateway → HTTPS POST → Backend → Database → REST API → Web Dashboard.
6. A relational database will be used. The specific technology is not chosen.
7. CE739L deliverables: backend API, relational database, API design, database design, backend demo, database demo, frontend demo, full-stack integration demo.
8. Simulated telemetry is an intentional development strategy and uses the same conceptual data contract as the real gateway.
9. The software must allow simulated telemetry to be replaced by real telemetry without a complete frontend/backend rewrite.
10. `/docs` is the source of truth. Undocumented or TBD items must not be silently invented.

## 16. Proposed Decisions

1. CE631L hardware: ESP32-WROOM-32U, LoRa E220-900T22D, RS485 soil sensor, LiFePO4 32700, TP5000, XL6009, AMS1117. Each awaits team confirmation.
2. Product vision wording (§8).
3. Value statements (§9), pending stakeholder validation.
4. Application technology stack as recorded in `CLAUDE.md` §5. Detailed in later documents, not here.

## 17. TBD / Open Decisions

To be carried into `07_OPEN_DECISIONS.md`:

- **Existing monitoring system:** its relationship to SoilMon (extend, reuse or replace) and what it currently measures and stores.
- **Stakeholder:** contacts, users, devices.
- **Farm facts:** size, layout, water source, fertigation equipment, power, connectivity.
- **Hardware status:** which proposed components are confirmed. Gateway hardware and actuators.
- **Sensor parameters:** which soil parameters are used, units and ranges.
- **Communication details:** LoRa configuration, payload format, sampling interval, retry logic, security.
- **Data contract** shared by the real gateway and the simulator.
- **Decide:** fertigation rules/logic and where they run.
- **Control:** actuators and the command path from the system to them.
- **Verify:** what counts as verified fertigation, and how it is measured.
- **Database hosting provider** (04 DB-17). The technology is decided: PostgreSQL (04 DB-01).
- **API endpoints.**
- **Authentication and authorisation.**
- **Deployment / hosting.**
- **Dashboard content**, alerts/notifications, manual override.
- **Delivery:** responsive web vs. native mobile.
- **Milestones:** what is delivered at UTS vs. UAS vs. after the semester, and the dates.
- **Team roles, document ownership, long-term system ownership.**

## 18. Important Constraints and Assumptions

### Constraints — CONFIRMED

- Both CE631L and CE739L assessments must be satisfied at UTS/UAS while SoilMon remains a real, continuing system.
- Application development cannot wait for hardware. It proceeds with simulated telemetry under the shared data contract.
- Switching from simulated to real telemetry must not require a full frontend/backend rewrite.
- Hardware specifications, sensor parameters, protocol details, fertigation logic, authentication, database technology and deployment must not be assumed before they are documented.
- Prefer technologies familiar to the team, and avoid unnecessary complexity.

### Assumptions — PROPOSED (to be verified)

- The gateway location has enough internet connectivity to reach the backend over HTTPS.
- The farm stakeholder can provide access, information and feedback throughout the project.
- Automated fertigation will be validated before it is relied on in real field operation.
