# 07 — SoilMon Open Decisions

| Field | Value |
|---|---|
| Document status | DRAFT |
| Version | 0.3 |
| Last updated | 2026-10-20 |
| Owner | TBD (OD-12) |
| Sources | `CLAUDE.md`; `docs/00_PROJECT_CONTEXT.md` (v0.3); `docs/01_REQUIREMENTS.md` (v0.2); `docs/02_SYSTEM_ARCHITECTURE.md` (v0.2); `docs/03_DATA_CONTRACT.md` (v0.1); `docs/04_DATABASE_DESIGN.md` (v0.2); `docs/05_API_SPEC.md` (v0.2); `docs/06_WEB_APP_SPEC.md` (v0.2); repository working-tree audit of `frontend/`, `shared/` and `embeded/` (2026-10-20) |
| Change in v0.2 | Added OD-16 to OD-19 from the repository audit (§4.4). No decision was made and no status was changed. |
| Change in v0.3 | Recorded three SoilMon Team decisions (§9.1): DB-01 RESOLVED (database technology), the backend part of AP-02 RESOLVED, and API-11 (internal health endpoint) CONFIRMED in `05`. Added DB-17 (database hosting provider, split from DB-01 in `04` v0.2). Re-counted §11.2 for `01` and `02`: lines that now cite DB-17 are mapped. No other status was changed. |

---

## 1. Purpose and Scope

This document is the **single tracking view** of SoilMon decisions that are not yet final. It collects the open decisions and contradictions recorded in documents `00`–`06`. It groups them, links duplicates, shows dependencies and marks priority.

**This document decides nothing.** It does not change requirements, architecture, the data contract, the database design, the API or the web app. Each decision stays **owned by its source document**. This document points to the owner by ID.

| This document does | This document does not |
|---|---|
| Index every open decision and contradiction from `00`–`06` | Make new decisions |
| Link IDs that describe the same question across documents | Change any status in a source document |
| Show dependencies and blockers | Choose technologies, fields, endpoints, auth mechanisms or fertigation logic |
| Record decisions once they are made (§9) | Replace the source documents as source of truth |

---

## 2. Decision Tracking Rules

| Rule | Detail |
|---|---|
| Existing IDs are never renamed, renumbered or reused. | OD (01), OAD (02), ODC (03), DB (04), OAPI (05), OWA (06); contradictions C (02), CC (03), DBC (04), APIC (05), WAC (06). |
| New IDs only where no ID exists anywhere. | Project-level gaps found by the audit use OD-11 onward (§4.4). |
| Linked IDs share one register row. | The **primary ID** is the most upstream owner of the question. Linked IDs are listed with it and are resolved together. |
| The owner document is the document of the primary ID. | New OD-11+ items are owned by `00`/`01`. |
| Rows are never deleted. | Resolved rows stay in the register with their decision record. |
| Status here never exceeds the status in the owner document. | Nothing is RESOLVED until the owner document is updated (§9). |

---

## 3. Status / Priority / Stage / Resolution Conventions

### 3.1 Status

| Status | Meaning |
|---|---|
| **CONFIRMED** | Explicitly decided in a source document. |
| **PROPOSED** | A design or option proposed in a source document, not final. |
| **TBD** | Not decided. |
| **RESOLVED** | A decision has been made explicitly, recorded here (§9), **and** the owner document has been updated. Never inferred. |

**Current state:** DB-01 and the backend part of AP-02 are RESOLVED (§9.1). No other item is RESOLVED.

### 3.2 Priority

Priority is assigned by rule, not by judgement.

| Priority | Rule |
|---|---|
| **BLOCKING** | (a) A source document's risk or dependency section names the item as blocking current implementation or demos, **or** (b) the item is a **direct** dependency of an item under (a). |
| **IMPORTANT** | Not blocking under the rule above, but a source document shows it affects design, a graded milestone item, or a recorded risk. |
| **DEFERRED** | No current work depends on it. The condition that would activate it is stated in §8. |

### 3.3 Stage

Stages are taken only from source documents. No deadlines or dates are invented (dates are OD-13).

| Stage | Meaning |
|---|---|
| **UTS** | Needed for a CE739L Midterm item (02 §11; 02 AD-11). |
| **UAS** | Required by the CE739L Final (02 §12; 02 AD-10). |
| **Product** | Long-term product goal beyond UAS (02 AD-12). |
| **TBD** | No source assigns a stage. |

No source defines an "MVP". MVP scope is part of OD-01 and OD-13 and is not invented here.

### 3.4 Opened

Each existing ID was opened in its owner document's current version: `01` v0.1 (2026-10-07); `02`–`06` v0.1 (2026-10-08). New IDs OD-11 to OD-15 were opened in this document, v0.1 (2026-10-08). New IDs OD-16 to OD-19 were opened in this document, v0.2 (2026-10-20), from an audit of the repository working tree. DB-17 was opened in `04` v0.2 (2026-10-20) by splitting DB-01.

---

## 4. Consolidated Open Decision Register

**Columns:** Primary ID · Linked IDs · Decision · Status · Proposed direction (from a source, or "None") · Depends on · Affects · Priority — reason · Stage · Evidence / decision needed · Resolution.

All rows are currently **TBD** unless stated otherwise. The Resolution column is "—" until §9 is applied.

### 4.1 Register by category

#### A. Project / stakeholder / scope

| ID | Linked | Decision | Status | Proposed direction | Depends on | Affects | Priority — reason | Stage | Needed | Resolution |
|---|---|---|---|---|---|---|---|---|---|---|
| **OD-11** (new) | — | Stakeholder contacts and farm facts (size, layout, water source, fertigation equipment, power, connectivity). Evidenced impact of the gap. Verification of the 00 §18 assumptions. | TBD | None | — | 00, 01, 02 | IMPORTANT — gateway HTTPS relies on site connectivity, which is an unverified assumption (00 §18) | TBD | Site information from the farm stakeholder | — |
| **OWA-01** | 01 FR-23 (roles) | Who the users are; roles, devices, technical familiarity | TBD | None | OD-11 | 00, 01, 05, 06 | IMPORTANT — shapes auth roles and the UI (06 §3) | TBD | Stakeholder input | — |
| **OD-12** (new) | — | Team roles, document owners ("Owner: TBD" in every doc), long-term system ownership and operation | TBD | None | — | All docs | IMPORTANT — the resolution workflow (§9) needs named decision owners | TBD | Team decision | — |
| **OD-AC** | 01 C739-05…08 (acceptance criteria) | Acceptance criteria and measurable targets per stage and per demo | TBD | None | OD-01 | 01, 05, 06 | IMPORTANT — demos have no pass/fail criteria (01 §9) | TBD | Team and assessor expectations | — |
| **OD-09** | 06 §2 | Wording of the one-line stage definitions | TBD | None | — | 00, 01, 06 | DEFERRED — no design depends on the wording | TBD | Team review | — |
| **OD-15** (new) | CC-2 | Document-ownership boundary: 02 §1 assigns "payload format and fields" to `03` and "schema and technology" to `04`, while 03 §1, 04 §1 and 05 §1 assign these differently | TBD | 03 §1 / 04 §1 / 05 §1 split (concepts / logical design / representation) | — | 01, 02, 03, 04, 05 | IMPORTANT — determines where future decisions are recorded | TBD | Team confirmation, then update 02 §1 | — |
| **OD-10 (FR-24)** | 03 §7 (site identity) | Multiple farms | TBD | None | OD-11 | 01, 03, 04 | DEFERRED — not in any current scope | TBD | Product decision | — |
| **OD-16** (new) | C-5, WAC-8 (same pattern: cited source not in the repository) | Status of the document named `SoilMon_API_Spec`, and of the "Spec Topik 4/5/6" and phase "F6" references, cited in `shared/` and `frontend/` code comments. The document is not in the repository or the audited project location, and phases F1 to F5 are not defined anywhere. | TBD | None. Under CLAUDE §3 only `/docs` is a source, so the missing document is not an active source of truth. 06 App. A.2 maps each code reference to the available document that covers the topic, without restoring the missing content. | — | CLAUDE, 03, 05, 06; `shared/` and `frontend/` comments | IMPORTANT — code shapes (field names, nine metric keys, normal ranges, offline rule) trace to a source that cannot be checked (CLAUDE §3, §4) | TBD | Team confirmation that the document is retired, or the team writes the needed content into `/docs` through §9 | — |
| **OD-17** (new) | WA-02, WA-12, WAC-5, OWA-09, OWA-10, OWA-11 | Status of frontend features that exist in code without a requirement basis: Alerts page, Reports page, Settings placeholder, gateway status, irrigation history and totals, farm map, dashboard summary figures, user profile block. They run on mock data only. | TBD | None. 06 App. A.1 records them as mock-based prototypes, not requirements; WA-02 is unchanged. | ODC-08, OD-03, ODC-04, OD-08, OD-11 | 01, 06; `frontend/` | IMPORTANT — the frontend demo (01 C739-07) shows features outside the 06 page set | TBD | Team decision per feature: keep as a labelled prototype, hide, or add a requirement to `01` | — |
| **OD-19** (new) | OD-14 (repository structure), AP-02, OAPI-01 | Role of the `shared/` workspace package and how other application parts consume it. It currently exports TypeScript source only (no compiled output) and contains types for concepts that are TBD in `/docs`. | TBD | None | OD-16, OAPI-01 | CLAUDE §6, 02, 05; `shared/`, future backend | IMPORTANT — the consumption method may need new tooling (CLAUDE §5), and the types can be mistaken for a confirmed contract | TBD | Team decision | — |

#### B. Existing monitoring relationship

| ID | Linked | Decision | Status | Proposed direction | Depends on | Affects | Priority — reason | Stage | Needed | Resolution |
|---|---|---|---|---|---|---|---|---|---|---|
| **OD-04** | OAD-11, ODC-15, DB-15, OWA-14 | Does SoilMon extend, reuse or replace the existing monitoring system, its dashboard and its data? | TBD | None | OD-11 | 00, 01 (FR-01–FR-11), 02, 03, 04, 06 | IMPORTANT — affects Monitor/Understand scope and risks duplicated effort (06 WAC-3) | TBD | Facts about the existing system; stakeholder decision | — |

#### C. UTS / UAS scope, milestones, demo

| ID | Linked | Decision | Status | Proposed direction | Depends on | Affects | Priority — reason | Stage | Needed | Resolution |
|---|---|---|---|---|---|---|---|---|---|---|
| **OD-01** | OAD-12, OAPI-15 (UTS endpoint set) | Which stages (Monitor … Verify) are in UTS, UAS and Product | TBD | 05 API-10 minimum UTS API set (PROPOSED) | OD-13 | 01, 02, 05, 06 | IMPORTANT — API-10 stays PROPOSED until this is decided (05 §13.1) | — | Team and course decision | — |
| **OD-13** (new) | C-3 | UTS/UAS dates and per-course deliverables beyond the CE739L list | TBD | None | — | 00, 01 | IMPORTANT — 00 §2.3 says the dates are TBD; planning depends on them | — | Course schedule and the CE739L-PA document | — |
| **OD-07** | 01 C631-06 | CE631L UTS/UAS deliverables | TBD | None | OD-13 | 01, 02 | IMPORTANT — real integration depends on CE631L delivery | TBD | CE631L requirements | — |
| **OD-05** | OAD-15 | Data source for the integration demo (simulated or real) | TBD | None | OD-06 | 01, 02, 05, 06 | IMPORTANT — acceptance of C739-08 | UTS (02 AD-11) | Course/assessor expectation | — |
| **OAPI-15** | C-4 | Meaning of "half-REST API design" (Midterm) | TBD | None | CE739L-PA (C-5) | 02, 05 | IMPORTANT — a graded Midterm item (02 §11) | UTS | The original assignment text | — |

#### D. Hardware / embedded

| ID | Linked | Decision | Status | Proposed direction | Depends on | Affects | Priority — reason | Stage | Needed | Resolution |
|---|---|---|---|---|---|---|---|---|---|---|
| **OAD-13** | OD-10 (C631-05, gateway part) | Gateway hardware and internal design. The prototype gateway does not yet POST (03 App. A). | TBD | None | OD-07 | 02, 03 | IMPORTANT — the real integration path | TBD | CE631L design decision | — |
| **OAD-01** | ODC-11, ODC-12, ODC-13 (parts) | LoRa configuration, plus the umbrella for protocol details (security, retry, intervals) | TBD | None | — | 02, 03 | IMPORTANT — CE631L design; the parts are tracked in E | TBD | CE631L design decision | — |
| **OD-14** (new) | 03 App. A | Status of the `embeded/` prototype firmware (prototype or product code), and its absence from the CLAUDE §6 repository structure | TBD | None | OD-07 | CLAUDE.md, 03 | IMPORTANT — the repository diverges from the documented structure | TBD | Team decision | — |
| **OD-10 (NFR-10, C631-05)** | 03 §9 | Power supply and environmental durability; node count, placement, enclosure | TBD | None | OD-11 | 01, 02 | DEFERRED — not needed for current application-side work | TBD | CE631L design; site facts | — |

#### E. Telemetry / data contract

| ID | Linked | Decision | Status | Proposed direction | Depends on | Affects | Priority — reason | Stage | Needed | Resolution |
|---|---|---|---|---|---|---|---|---|---|---|
| **ODC-01** | DB-03, OD-10 (FR-02) | Measured parameters, units, ranges, count; raw or converted values | TBD | None | OD-04 | 01, 03, 04, 05, 06 | **BLOCKING** — named as blocking in 04 Risks, 05 §13.4, 06 §17 | UTS (demos) | CE631L sensor decision | — |
| **ODC-03** | DB-05, DBI-04 (scope) | Origin identifier: format, uniqueness scope, provisioning | TBD | None | — | 03, 04, 05, 06 | **BLOCKING** — direct dependency of OAPI-01 and OAPI-03 | UTS | CE631L/CE739L agreement | — |
| **ODC-05** | DB-04, OWA-15, CC-3 | Time source (node, gateway or receipt), format, time zone | TBD | None | — | 03, 04, 05, 06 | **BLOCKING** — direct dependency of OAPI-01 and OAPI-07 | UTS | CE631L/CE739L agreement | — |
| **ODC-02** | OAD-02, OAPI-11, DB-16, OD-10 (NFR-05), APIC-1 | Data representation, and contract vs. API versioning | TBD | 05 API-02 `/api/v1` and API-03 JSON (both PROPOSED) | — | 01, 03, 04, 05 | IMPORTANT — needed before implementation is fixed | TBD | Team confirmation | — |
| **ODC-11** | DB-08, OAPI-05 | Delivery response content, rejection, duplicates, idempotency, retry | TBD | None | ODC-03, ODC-05 | 03, 04, 05 | IMPORTANT — ingestion robustness | TBD | Agreement on gateway behaviour | — |
| **ODC-12** | OAPI-02, OD-10 (FR-07) | Sampling interval and batching | TBD | None | ODC-01 | 03, 05, 06 | IMPORTANT — shapes the ingestion request; OWA-06 and OWA-17 depend on it | TBD | CE631L decision | — |
| **ODC-06** | DB-07, OWA-05 | Producer-type (simulated/real) marker | TBD | 06 WA-07 environment-level notice as interim (PROPOSED) | — | 03, 04, 05, 06 | IMPORTANT — 04 Risks: simulated data seeded into a long-lived store | TBD | Team decision | — |
| **ODC-13** | OAPI-09 | Boundary/producer (gateway) security | TBD | None | OD-08 | 02, 03, 05 | IMPORTANT — UAS auth may or may not include it (05 APIC-5) | TBD | Team decision | — |
| **OD-06** | OAD-14, ODC-14, OAPI-12 | Simulator transport/entry-point parity, and simulator ownership | TBD | None | — | 01, 02, 03, 05 | IMPORTANT — affects INV-01/NFR-01 in practice | TBD | Team decision | — |
| **ODC-04** | DB-06, OAPI-14 (gateway part) | Gateway context in records | TBD | None | OAD-13 | 03, 04, 05 | DEFERRED — not in the UTS contract (03 §5) | TBD | CE631L design | — |
| **ODC-07** | DB-10, OAPI-14 (power part) | Power status: whether it crosses the boundary, and its owner | TBD | None | OD-10 (NFR-10) | 03, 04, 05 | DEFERRED — no current requirement | TBD | Team decision | — |
| **ODC-08** | DB-11, OAPI-14 (alert part), OWA-09, OD-10 (FR-22) | Events/alerts: existence, origin, stored or derived | TBD | None | ODC-01; OD-03 (thresholds) | 01, 03, 04, 05, 06 | DEFERRED — FR-22 is TBD | TBD | Product decision | — |
| **OD-18** (new) | ODC-01, ODC-11, DBI-05, 03 App. A | Validity of sensor readings within a telemetry record. The prototype node firmware sends its register buffer even when the sensor read fails (the buffer then holds initial zeros or the previous reading), and nothing in the line marks the reading as valid or failed. | TBD | None | ODC-01 | 03, 04, 05; firmware; simulator | IMPORTANT — invalid readings could enter the append-oriented, long-lived store (04 §8; 00 §1) | TBD | CE631L/CE739L agreement | — |

#### F. Database

| ID | Linked | Decision | Status | Proposed direction | Depends on | Affects | Priority — reason | Stage | Needed | Resolution |
|---|---|---|---|---|---|---|---|---|---|---|
| **DB-01** | OAD-04, OD-10 (NFR-02) | Database technology (the provider part is now DB-17) | RESOLVED | — | — | 02, 04, 05 | Resolved. Was **BLOCKING** — 04 Risks (DB demo); 05 §13.4 | UTS (DB demo) | — | Decided by the SoilMon Team with a documented reason (§9.1); owner `04` §12 v0.2 |
| **DB-17** | OAD-04, OAD-06 | Database hosting provider (split from DB-01) | TBD | None | OAD-06 | 02, 04 | IMPORTANT — part of OAD-06, a UAS requirement (02 AD-10) | TBD | Team decision, together with OAD-06 | — |
| **DB-02** | DBC-4 | Narrow (Metric) model vs. one attribute per parameter | TBD | 04 DBD-02 narrow model (PROPOSED) | ODC-01 | 04, 05, 06 | **BLOCKING** — 04 Risks | UTS | Team decision after ODC-01 | — |
| **DB-16** | ODC-02 | Schema migration and versioning approach | TBD | None | DB-01 | 04 | IMPORTANT — needed once a physical schema exists | TBD | Team decision | — |
| **DB-09** | OD-10 (NFR-09, retention part) | Retention, deletion, corrections, archival | TBD | None | — | 01, 04 | DEFERRED — no target exists (01 NFR-09) | TBD | Product decision | — |

#### G. API

| ID | Linked | Decision | Status | Proposed direction | Depends on | Affects | Priority — reason | Stage | Needed | Resolution |
|---|---|---|---|---|---|---|---|---|---|---|
| **OAPI-01** | OAD-03 (umbrella), OD-10 (FR-12) | Request/response field names and structure | TBD | None | ODC-01, ODC-03, ODC-05, ODC-12 | 05, 06; firmware; simulator | **BLOCKING** — 05 §13.4 (bodies are blocked) | UTS | Decisions it depends on | — |
| **OAPI-03** | APIC-3 | Unknown-origin handling (reject or auto-register) | TBD | None | ODC-03 | 04, 05 | **BLOCKING** — 05 §13.4 ("needs a decision before backend work") | UTS | Team decision | — |
| **OAPI-07** | — | Pagination style and limits; time-filter parameter names and format; ordering direction | TBD | 05 API-07 principles (PROPOSED) | ODC-05 | 05, 06 | **BLOCKING** — 06 §17 (demos depend on it) | UTS | Team decision | — |
| **OAPI-04** | OWA-07, APIC-4, WAC-4 | Which node identifier appears in paths and in the UI | TBD | None | ODC-03 | 04, 05, 06 | IMPORTANT — retrieval URLs and node display | TBD | Team decision | — |
| **OAPI-06** | — | 400 vs. 422 for contract violations; error-body format | TBD | 05 API-08 conceptual error model (PROPOSED) | — | 05, 06 | IMPORTANT — the error handling contract | TBD | Team decision | — |

#### H. Authentication / authorisation

| ID | Linked | Decision | Status | Proposed direction | Depends on | Affects | Priority — reason | Stage | Needed | Resolution |
|---|---|---|---|---|---|---|---|---|---|---|
| **OD-08** | OAD-05, DB-13, OAPI-08, OWA-08, OD-10 (FR-23, C739-11) | Whether access control is needed beyond the UAS requirement; mechanisms per caller class; whether the app is open at UTS | TBD (required by UAS: 02 AD-10) | 05 §11 caller-class split (PROPOSED) | OWA-01 | 01, 02, 04, 05, 06 | IMPORTANT — late-binding risk (05 §13.4) | UAS (02 AD-10) | Team decision | — |

#### I. Frontend / UX

| ID | Linked | Decision | Status | Proposed direction | Depends on | Affects | Priority — reason | Stage | Needed | Resolution |
|---|---|---|---|---|---|---|---|---|---|---|
| **OWA-03** | — | How the dashboard obtains each node's latest values | TBD | None | OAPI-07 | 05, 06 | **BLOCKING** — direct dependency on OAPI-07; 06 §17 | UTS (frontend demo) | Decision on OAPI-07 | — |
| **OWA-02** | — | UI language | TBD | None | OWA-01 | 06 | IMPORTANT — affects every page | TBD | Stakeholder/team decision | — |
| **OWA-04** | OD-10 (FR-11) | History presentation: table, chart or both | TBD | None | ODC-01 | 01, 06 | IMPORTANT — defines the history view | TBD | Team decision | — |
| **OWA-13** | OD-10 (NFR-11) | Delivery form (responsive web or native) and responsive target | TBD | 06 §13 "do not preclude narrow viewports" (PROPOSED) | OWA-01 | 01, 06 | IMPORTANT — the course is Mobile Pervasive Computing (06 WAC-7) | TBD | Team/course decision | — |
| **OWA-06**, **OWA-17** | — | Stale/unavailable indicator; refresh behaviour | TBD | 06 WA-14 user-initiated re-fetch (PROPOSED) | ODC-12 | 06 | DEFERRED — WA-14 avoids the need for now | TBD | ODC-12 | — |
| **OWA-10**, **OWA-11**, **OWA-16** | — | Reports/analytics; settings; accessibility target level | TBD | None | OD-02 (reports); OD-03 (settings) | 06 | DEFERRED — no source asks for them | TBD | Product decision | — |

#### J. Communication protocol / gateway boundary

| ID | Linked | Decision | Status | Proposed direction | Depends on | Affects | Priority — reason | Stage | Needed | Resolution |
|---|---|---|---|---|---|---|---|---|---|---|
| **OAD-07** | OAPI-10 | What "communication protocol" means in the CE739L Final | TBD | None | CE739L-PA (C-5) | 02, 03, 05 | IMPORTANT — may extend 03/05 beyond concepts (03 CC-5) | UAS | The original assignment text | — |

#### K. Fertigation — Decide / Control / Verify

| ID | Linked | Decision | Status | Proposed direction | Depends on | Affects | Priority — reason | Stage | Needed | Resolution |
|---|---|---|---|---|---|---|---|---|---|---|
| **OD-03** | OAD-08, OAD-09, ODC-09, DB-12 (command part), OAPI-13, OWA-12 (control part), OD-10 (FR-14, FR-16, FR-17) | Where Decide runs; decision logic; actuators; command path; manual override | TBD | None | OD-01, ODC-01 | 01, 02, 03, 04, 05, 06 | DEFERRED — no current work depends on it; OD-01 may pull it into UTS/UAS | Product (02 AD-12); UTS/UAS inclusion TBD | CE631L + team design | — |
| **OD-02** | OAD-10, ODC-10, DB-12 (evidence part), OWA-12 (verify part), OD-10 (FR-19) | What "verified" means; what evidence is needed | TBD | None | OD-03 | 01, 02, 03, 04, 06 | DEFERRED — as for OD-03 | Product | Team definition | — |
| **DB-14** | — | Irrigation Zone: needed or not | TBD | None | OD-01, OD-03 | 04, 05 | DEFERRED — no source supports it (04 DBC-1) | TBD | Product decision | — |

#### L. Deployment / cloud

| ID | Linked | Decision | Status | Proposed direction | Depends on | Affects | Priority — reason | Stage | Needed | Resolution |
|---|---|---|---|---|---|---|---|---|---|---|
| **OAD-06** | OD-10 (NFR-12, C739-11), DB-17 | Cloud provider, topology, what is hosted where (includes the database hosting provider, DB-17) | TBD (required by UAS: 02 AD-10) | None | DB-01 (RESOLVED) | 01, 02, 04 | IMPORTANT — UAS requirement | UAS (02 AD-10) | Team decision | — |

#### M. Testing / demo

No separate testing-strategy decision exists in `00`–`06`, and none is invented. Demo-related decisions are OD-AC (category A) and OD-05 (category C).

### 4.2 PROPOSED items pending confirmation

These are proposals in their owner documents. They stay **PROPOSED** until the team confirms them through §9.

| IDs | Owner | Proposal | Priority — reason |
|---|---|---|---|
| DBD-02, DBD-03 | 04 | Narrow Metric model; internal identities separate from contract identifiers | **BLOCKING** — 04 Risks (DB demo) |
| DC-03, DC-04 | 03 | Origin and measurement time as required contract concepts | IMPORTANT — the ingestion design assumes them |
| INV-05, INV-06 | 03 | Backend accepts only conforming records; every record has an origin | IMPORTANT |
| DBI-01…DBI-05, DBX-01, DBX-02; 04 §8 append-oriented storage | 04 | Integrity, indexing and append-oriented storage | IMPORTANT — confirm before the physical schema |
| API-02…API-10 | 05 | Versioning, JSON, naming, endpoints, error model, minimum UTS set | IMPORTANT — confirm before implementation |
| WA-02…WA-14 | 06 | Page set, adapter seam, metric-driven display, labelling, state rules | IMPORTANT — confirm before frontend build |
| AP-01 (each component) | 02 / 00 §11 | ESP32-WROOM-32U, LoRa E220-900T22D, RS485 soil sensor, LiFePO4 32700, TP5000, XL6009, AMS1117 | IMPORTANT — CE631L hardware confirmation |
| AP-02 | 02 / CLAUDE §5 | Application technology stack. Backend part RESOLVED (§9.1); frontend part pending. | IMPORTANT — confirm the frontend part before the frontend build |
| 00 §8, §9, §18 | 00 | Vision wording, value statements, assumptions | DEFERRED (§8, §9); assumptions tracked in OD-11 |

### 4.3 OD-10 umbrella breakdown

01 OD-10 covers "every other TBD row" in `01` §3–§7. Each part is tracked here:

| 01 row | Tracked under |
|---|---|
| FR-02 parameters | ODC-01 |
| FR-07 interval, retry, payload | ODC-12, ODC-11, OAPI-01 |
| FR-11 UI details | OWA-04 |
| FR-12 endpoints | OAPI-01; API-05…09 (§4.2) |
| FR-14, FR-16, FR-17 | OD-03 |
| FR-19 | OD-02 |
| FR-22 alerts | ODC-08 |
| FR-23 users/auth | OD-08, OWA-01 |
| FR-24 multiple farms | OD-10 (FR-24) row, category A |
| NFR-02 database technology | DB-01 (RESOLVED); hosting provider DB-17 |
| NFR-03 security details | ODC-13 |
| NFR-05 representation, versioning | ODC-02 |
| NFR-08 measurable maintainability criteria | OD-AC |
| NFR-09 performance, availability, retention, reliability | OD-AC (targets); DB-09 (retention) |
| NFR-10 power, durability | OD-10 (NFR-10, C631-05) row, category D |
| NFR-11 delivery form | OWA-13 |
| NFR-12 deployment | OAD-06 |
| C631-04 hardware confirmation | AP-01 (§4.2) |
| C631-05 gateway hw, actuators, nodes, enclosure, LoRa config | OAD-13, OD-03, OD-10 row, OAD-01 |
| C631-06 CE631L deliverables | OD-07 |
| C739-05…08 acceptance criteria | OD-AC; OD-05 (C739-08 data source) |
| C739-11 auth, deployment, dashboard content | OD-08, OAD-06, OWA-04 |

### 4.4 New IDs introduced by this document

| ID | Why no existing ID covers it | Source | Owner |
|---|---|---|---|
| OD-11 | Stakeholder contacts, farm facts, evidenced impact and assumption verification are TBD in 00 §3, §4, §6, §17 and §18, without an ID | 00 | 00 |
| OD-12 | Team roles, document ownership ("Owner: TBD" in every document) and long-term ownership are TBD in 00 §17, without an ID | 00; all headers | 00 |
| OD-13 | Milestone dates and per-milestone deliverables are TBD in 00 §2.3, without an ID | 00 | 00/01 |
| OD-14 | `embeded/` is referenced in 03 App. A but is absent from the CLAUDE §6 repository structure. No ID covers this. | CLAUDE §6; 03 App. A | 00 / CLAUDE.md |
| OD-15 | 02 §1 assigns document ownership differently from 03/04/05 §1. Only partly covered by CC-2. | 02 §1; 03–05 §1 | 01/02 |
| OD-16 | Code cites a specification document that is not in the repository. C-5 and WAC-8 cover other missing documents (CE739L-PA, legacy analysis), not this one. | Repository audit (2026-10-20); CLAUDE §3 | 00 / CLAUDE.md |
| OD-17 | Frontend features exist outside the 06 page set. WAC-5 covers legacy pages and OWA-09/10/11 cover individual areas, but no ID covers the status of features already implemented. | Repository audit; 06 App. A.1 | 01 / 06 |
| OD-18 | Prototype firmware can send readings from a failed sensor read. ODC-11 covers delivery rejection and duplicates, not the validity of the measured values. | Repository audit; 03 App. A | 03 |
| OD-19 | The `shared/` package is not described in any document. OD-14 covers only `embeded/`. | Repository audit; CLAUDE §6 | 02 / CLAUDE.md |

---

## 5. Cross-Document Dependency Map

An arrow means "must be decided before". Items in brackets are what is affected.

```text
ODC-01 parameters ─► DB-02 / DB-03 ─► OAPI-01 field names ─► WA-04 metric-driven UI ─► [backend / frontend / gateway build]
ODC-03 origin ID  ─► DB-05, DBI-04 ─► OAPI-03 unknown origin ─► [ingestion build]
                                   └► OAPI-04 node ID in paths ─► OWA-07 node display
ODC-05 time       ─► DB-04 ─► OAPI-01; OAPI-07 time filter ─► OWA-03 latest; OWA-15 display
ODC-12 interval   ─► OAPI-02 batching; OWA-06 stale; OWA-17 refresh
ODC-11 dup/retry  ─► DB-08, OAPI-05
ODC-06 marker     ─► DB-07 ─► OWA-05
ODC-02 versioning ─► OAPI-11, DB-16
DB-01 product     ─► [physical schema, DB demo]        RESOLVED (§9.1)
DB-17 db hosting  ↔ OAD-06 hosting
OD-08 auth        ─► DB-13, OAPI-08 ─► OWA-08;    ODC-13 ─► OAPI-09
OD-04 existing    ─► OAD-11, ODC-15, DB-15, OWA-14  [FR-01–FR-11 scope]
OD-01 stage scope ─► OAD-12, API-10 / OAPI-15, DB-14; whether OD-02 / OD-03 enter UTS/UAS
OD-03 decide/cmd  ─► OAD-08 / OAD-09 ─► ODC-09 ─► DB-12, OAPI-13 ─► OWA-12
OD-02 verify      ─► OAD-10, ODC-10 ─► DB-12 ─► OWA-12
OD-06 sim parity  ─► ODC-14 ─► OAPI-12;   OD-05 demo data source
OAD-07 protocol   ─► may extend 03 / 05 (CC-5)
OD-11 site facts  ─► OWA-01 users ─► OD-08 auth, OWA-02 language, OWA-13 delivery form
```

---

## 6. Blocking Decisions / Current Implementation Blockers

Applying the rule in §3.2, in decision order:

| # | ID | Why it blocks | Source of the blocking statement |
|---|---|---|---|
| 1 | **ODC-01** | Root of the main chain. No real request/response bodies, metrics or display without it. | 04 Risks; 05 §13.4; 06 §17 |
| 2 | **ODC-03** | Needed by OAPI-03 and OAPI-01 | Rule (b) via 05 §13.4 |
| 3 | **OAPI-03** | Ingestion cannot be built without it | 05 §13.4 |
| 4 | **ODC-05** | Needed by OAPI-01 and OAPI-07 | Rule (b) |
| 5 | **OAPI-01** | Request/response bodies | 05 §13.4 |
| 6 | **DB-01** — RESOLVED (§9.1) | No longer blocks. Was: database demo and physical schema | 04 Risks; 05 §13.4 |
| 7 | **DB-02**, **DBD-02**, **DBD-03** (confirmation) | Database demo | 04 Risks |
| 8 | **OAPI-07** | History and latest values in the demos | 06 §17 |
| 9 | **OWA-03** | Dashboard latest values | 06 §17 (via OAPI-07) |

---

## 7. Contradictions and Ambiguities

All contradictions stay **OPEN** until every document involved is updated (§9 step 5). Summaries are shortened; the full text is in the owner document.

| ID | Summary | Docs | Closed by |
|---|---|---|---|
| C-1 | Auth TBD in 01 (FR-23, C739-11, OD-08), but required by UAS (CE739L-PA) | 01, 02 | OD-08 |
| C-2 | Deployment TBD in 00/01, but cloud deployment required by UAS | 00, 01, 02 | OAD-06 |
| C-3 | CE739L deliverable lists in 00/01 miss the Final items | 00, 01, 02 | OD-13 |
| C-4 | Meaning of "half-REST API design" is unclear | 02 | OAPI-15 |
| C-5 | CE739L-PA is not stored in `/docs` | 02–06 | Adding the assignment (or a summary) to `/docs`; affects OAPI-15, OAD-07 |
| CC-1 | "Nothing behind the boundary needs to know" vs. long-lived data integrity | 02, 03 | ODC-06 |
| CC-2 | Where payload format is specified (01 FR-07, 02 §1, 03) | 01, 02, 03 | OD-15 |
| CC-3 | History and Verify need time, but no source states time is in the data | 01, 03 | ODC-05; DC-04 confirmation |
| CC-4 | CE631L owns actuation, but actuators and command path are TBD; the prototype has a local relay | 00, 01, 02, 03 | OD-03 |
| CC-5 | "Communication protocol" (Final) may need more than concepts | 02, 03 | OAD-07 |
| DBC-1 | Gateway, Alert, Irrigation Zone and Power discussed but unsupported or TBD | 03, 04 | DB-14; ODC-04; ODC-07; ODC-08 |
| DBC-2 | Auth required by UAS vs. 01 FR-23 TBD; no User entity | 01, 02, 04 | OD-08 |
| DBC-3 | Shared storage for simulated and real records | 03, 04 | ODC-06 |
| DBC-4 | Metric is 04's own modelling choice | 04 | DB-02 |
| DBC-5 | Power owner unclear (node battery vs. gateway) | 00, 03, 04 | ODC-07 |
| DBC-6 | Alerts: stored or derived | 01, 03, 04 | ODC-08 |
| DBC-7 | Verification evidence vs. history; "verified" undefined | 01, 04 | OD-02 |
| DBC-8 | Existing monitoring system data | 00, 01, 03, 04 | OD-04 |
| APIC-1 | `/api/v1` and JSON "intended" in CLAUDE §5 vs. TBD in 01 NFR-05 | CLAUDE, 01, 05 | ODC-02; API-02/03 confirmation |
| APIC-2 | Earlier candidate endpoints (alerts, zones, gateways) excluded | 03, 04, 05 | ODC-04; ODC-08; DB-14 |
| APIC-3 | Unknown origin vs. no-orphan rule | 03, 04, 05 | OAPI-03 |
| APIC-4 | Two node identifiers | 04, 05 | OAPI-04 |
| APIC-5 | Auth required vs. TBD; whether it covers the gateway | 01, 02, 05 | OD-08; ODC-13 |
| APIC-6 | Is ingestion "REST"? | 02, 05 | API-05 confirmation |
| APIC-7 | "Communication protocol" and "half-REST" not interpreted | 02, 05 | OAD-07; OAPI-15 |
| WAC-1 | Dashboard "current state" vs. no "latest" endpoint | 05, 06 | OWA-03 / OAPI-07 |
| WAC-2 | Per-record simulated labelling vs. no producer marker | 03, 06 | ODC-06 |
| WAC-3 | Existing monitoring dashboard vs. new web app | 00, 01, 06 | OD-04 |
| WAC-4 | Node has no human-friendly name | 04, 06 | OAPI-04 |
| WAC-5 | Legacy Alerts/Reports/Settings pages have no requirement basis | 06 | ODC-08; OWA-10; OWA-11 |
| WAC-6 | Legacy fixed four nodes vs. node count TBD | 00, 06 | WA-05 confirmation; OD-10 (C631-05) |
| WAC-7 | Mobile Pervasive Computing vs. delivery form TBD | 01, 06 | OWA-13 |
| WAC-8 | Legacy frontend analysis is not in the repository | 06 | Adding the analysis to the repository |
| WAC-9 | Recharts in the intended stack vs. charts TBD | CLAUDE, 01, 06 | OWA-04 |

**Audit findings added by this document** (tracked as decisions, because only the OD prefix may be used for new IDs):

| ID | Finding | Docs |
|---|---|---|
| OD-14 | `embeded/` exists and is referenced in 03 App. A, but is absent from the CLAUDE §6 repository structure. | CLAUDE, 03 |
| OD-15 | 02 §1 document-ownership table conflicts with 03 §1, 04 §1 and 05 §1. | 02, 03, 04, 05 |
| OD-16 | `shared/` and `frontend/` comments cite `SoilMon_API_Spec`, "Spec Topik 4/5/6" and "F6"; the document is not in the repository. | CLAUDE, 06 App. A.2 |
| OD-17 | The frontend implements Alerts, Reports, Settings, gateway status, irrigation and other features on mock data, outside WA-02. | 06 |
| OD-18 | Prototype node firmware can send a failed sensor read as if it were a reading. | 03 |
| OD-19 | `shared/` exists in the workspace but is absent from CLAUDE §6 and from 02. | CLAUDE, 02 |

---

## 8. Deferred / Future Decisions

| ID(s) | Why deferred | Becomes active when |
|---|---|---|
| OD-03, OD-02, DB-14 | No current work depends on them (product goal, 02 AD-12) | OD-01 places Decide/Control/Verify in UTS or UAS scope, or work on fertigation starts |
| ODC-04 | Not in the UTS contract | Gateway design (OAD-13) needs to carry context |
| ODC-07 | No current requirement | OD-10 (NFR-10) or a power-monitoring requirement is defined |
| ODC-08, OWA-09 | FR-22 is TBD | Alerts are requested, or thresholds exist (OD-03) |
| DB-09 | No retention target | NFR-09 targets are set (OD-AC) or data volume becomes an issue |
| OWA-06, OWA-17 | WA-14 covers refresh for now | ODC-12 is decided |
| OWA-10, OWA-11, OWA-16 | No source asks for them | A requirement is added to `01` |
| OD-09 | No design depends on the wording | Team review of 00/01 |
| OD-10 (NFR-10, C631-05), OD-10 (FR-24) | Not needed for current application-side work | CE631L field deployment planning; multi-farm requirement |

---

## 9. Decision Resolution Workflow

`07` records decisions but never owns them. The owner document stays the source of truth.

| Step | Action |
|---|---|
| 1 | **Record** the decision in 07 using the template below: date, decided by, decision, rationale and evidence. |
| 2 | **Update the owner document** (the document of the primary ID): change the item's status and bump the document version. |
| 3 | **Update the status in 07.** A row becomes RESOLVED only after step 2 is complete. |
| 4 | **Update downstream documents**, following the chains in §5. Resolve or re-scope linked IDs. |
| 5 | **Re-check traceability**: re-run the audit in §11. A contradiction is closed only when every document involved has been updated. |

IDs are never reused. Resolved rows remain in the register.

**Decision record template**

| Field | Value |
|---|---|
| ID | |
| Date | |
| Decided by | |
| Decision | |
| Rationale / evidence | |
| Owner document updated (version) | |
| Downstream documents updated | |
| Linked IDs closed | |
| Contradictions closed | |

### 9.1 Decision log

Dates are the date each decision was recorded here. The approval date itself is not stated in the available records.

**DB-01 — database technology**

| Field | Value |
|---|---|
| ID | DB-01 (the provider part was split into DB-17) |
| Date | 2026-10-20 (recorded) |
| Decided by | SoilMon Team |
| Decision | The database technology is PostgreSQL, accessed from the backend through the `pg` driver. The hosting provider is not decided (DB-17, with OAD-06). |
| Rationale / evidence | Relational telemetry data benefits from structured records, constraints, and SQL queries for historical monitoring and reporting. PostgreSQL is selected as the database technology; the hosting provider remains undecided. |
| Owner document updated (version) | `04` v0.2 (§1, §12, §13, Risks, §14) |
| Downstream documents updated | `00` v0.3 (§10, §11, §17); `01` v0.2 (NFR-02); `02` v0.2 (§4.2, §6.2, §15 OAD-04, OAD-06); `05` v0.2 (§13.4); `CLAUDE.md` §2, §5, §6 |
| Linked IDs closed | OAD-04: technology part closed by DB-01; provider part continues as DB-17. OD-10 (NFR-02): technology part only. |
| Contradictions closed | None |

**AP-02 — backend part of the application stack**

| Field | Value |
|---|---|
| ID | AP-02 (backend part only) |
| Date | 2026-10-20 (recorded) |
| Decided by | SoilMon Team |
| Decision | Backend runtime Node.js; language JavaScript with ES Modules, not TypeScript; HTTP framework Express; PostgreSQL driver `pg`. The frontend part of AP-02 is unchanged and stays PROPOSED. |
| Rationale / evidence | Explicit decision of the SoilMon Team. No further rationale was recorded. |
| Owner document updated (version) | `02` v0.2 (§2.2, §6.4) |
| Downstream documents updated | `CLAUDE.md` §5, §6 |
| Linked IDs closed | None. OD-19 (how the backend consumes `shared/`) stays TBD. |
| Contradictions closed | None |

**API-11 — internal health endpoint**

| Field | Value |
|---|---|
| ID | API-11 (new in `05` v0.2) |
| Date | 2026-10-20 (recorded) |
| Decided by | SoilMon Team |
| Decision | `GET /health` is accepted as an internal operational endpoint. It reports that the backend process is running and does not check database connectivity. Status code and body stay PROPOSED (`05` §15). |
| Rationale / evidence | Explicit decision of the SoilMon Team. No further rationale was recorded. |
| Owner document updated (version) | `05` v0.2 (§2, §9, §13.1, §15) |
| Downstream documents updated | None |
| Linked IDs closed | None. OAPI-06 (error body) and OAPI-08 (access control) stay TBD. |
| Contradictions closed | None |

---

## 10. Relationship to Documents 00–06

| Document | Version | Owns | Count | Tracked in 07 |
|---|---|---|---|---|
| `CLAUDE.md` | — | Working rules; repository structure (§6) | — | OD-14; OD-16; OD-19; APIC-1; WAC-9 |
| `00_PROJECT_CONTEXT.md` | v0.3 | No IDs. Context TBDs are covered by other IDs, plus OD-11 to OD-14 (new). | 44 TBD lines | §4.1 A, C, D |
| `01_REQUIREMENTS.md` | v0.2 | OD-AC, OD-01…OD-10 | 11 | §4.1, §4.3 |
| `02_SYSTEM_ARCHITECTURE.md` | v0.2 | OAD-01…15; C-1…5; AP-01, AP-02 | 15 + 5 + 2 | §4.1, §4.2, §7 |
| `03_DATA_CONTRACT.md` | v0.1 | ODC-01…15; CC-1…5; DC-03/04, INV-05/06 (PROPOSED) | 15 + 5 | §4.1, §4.2, §7 |
| `04_DATABASE_DESIGN.md` | v0.2 | DB-01…17; DBC-1…8; DBD, DBI, DBX (PROPOSED) | 17 + 8 | §4.1, §4.2, §7 |
| `05_API_SPEC.md` | v0.2 | OAPI-01…15; APIC-1…7; API-02…10 (PROPOSED); API-11 (CONFIRMED) | 15 + 7 | §4.1, §4.2, §7 |
| `06_WEB_APP_SPEC.md` | v0.2 | OWA-01…17; WAC-1…9; WA-02…14 (PROPOSED); App. A (non-normative) | 17 + 9 | §4.1, §4.2, §7; OD-16, OD-17 |

---

## 11. Audit / Completeness Check

### 11.1 ID index — every open-decision ID → register row

| Prefix | Mapping (ID → row) |
|---|---|
| OD (01) | OD-AC → OD-AC · OD-01 → OD-01 · OD-02 → OD-02 · OD-03 → OD-03 · OD-04 → OD-04 · OD-05 → OD-05 · OD-06 → OD-06 · OD-07 → OD-07 · OD-08 → OD-08 · OD-09 → OD-09 · OD-10 → §4.3 |
| OD (new) | OD-11 · OD-12 · OD-13 · OD-14 · OD-15 · OD-16 · OD-17 · OD-18 · OD-19 → own rows |
| OAD (02) | OAD-01 → OAD-01 · OAD-02 → ODC-02 · OAD-03 → OAPI-01 · OAD-04 → DB-01 + DB-17 · OAD-05 → OD-08 · OAD-06 → OAD-06 · OAD-07 → OAD-07 · OAD-08 → OD-03 · OAD-09 → OD-03 · OAD-10 → OD-02 · OAD-11 → OD-04 · OAD-12 → OD-01 · OAD-13 → OAD-13 · OAD-14 → OD-06 · OAD-15 → OD-05 |
| ODC (03) | ODC-01 → ODC-01 · ODC-02 → ODC-02 · ODC-03 → ODC-03 · ODC-04 → ODC-04 · ODC-05 → ODC-05 · ODC-06 → ODC-06 · ODC-07 → ODC-07 · ODC-08 → ODC-08 · ODC-09 → OD-03 · ODC-10 → OD-02 · ODC-11 → ODC-11 · ODC-12 → ODC-12 · ODC-13 → ODC-13 · ODC-14 → OD-06 · ODC-15 → OD-04 |
| DB (04) | DB-01 → DB-01 · DB-02 → DB-02 · DB-03 → ODC-01 · DB-04 → ODC-05 · DB-05 → ODC-03 · DB-06 → ODC-04 · DB-07 → ODC-06 · DB-08 → ODC-11 · DB-09 → DB-09 · DB-10 → ODC-07 · DB-11 → ODC-08 · DB-12 → OD-03 + OD-02 · DB-13 → OD-08 · DB-14 → DB-14 · DB-15 → OD-04 · DB-16 → DB-16 · DB-17 → DB-17 |
| OAPI (05) | OAPI-01 → OAPI-01 · OAPI-02 → ODC-12 · OAPI-03 → OAPI-03 · OAPI-04 → OAPI-04 · OAPI-05 → ODC-11 · OAPI-06 → OAPI-06 · OAPI-07 → OAPI-07 · OAPI-08 → OD-08 · OAPI-09 → ODC-13 · OAPI-10 → OAD-07 · OAPI-11 → ODC-02 · OAPI-12 → OD-06 · OAPI-13 → OD-03 · OAPI-14 → ODC-04 + ODC-07 + ODC-08 · OAPI-15 → OAPI-15 + OD-01 |
| OWA (06) | OWA-01 → OWA-01 · OWA-02 → OWA-02 · OWA-03 → OWA-03 · OWA-04 → OWA-04 · OWA-05 → ODC-06 · OWA-06 → OWA-06 · OWA-07 → OAPI-04 · OWA-08 → OD-08 · OWA-09 → ODC-08 · OWA-10 → OWA-10 · OWA-11 → OWA-11 · OWA-12 → OD-03 + OD-02 · OWA-13 → OWA-13 · OWA-14 → OD-04 · OWA-15 → ODC-05 · OWA-16 → OWA-16 · OWA-17 → OWA-17 |

**Totals:** 90 existing open-decision IDs (including DB-17, added in `04` v0.2) plus 9 new IDs (OD-11 to OD-19), all mapped. All 34 contradiction IDs appear in §7.

### 11.2 TBD lines without a decision ID

Every line containing "TBD" without an OD/OAD/ODC/DB/OAPI/OWA reference was reviewed.

| Document | Lines reviewed | Result |
|---|---|---|
| 00 | 44 | Mapped to existing rows. The uncovered items became OD-11 (stakeholder/farm facts, impact, assumptions), OD-12 (owners, roles) and OD-13 (dates). |
| 01 | 42 | Mapped through §4.3 (OD-10 umbrella) and the register. |
| 02 | 59 | Mapped to the register. Exception: see table below. |
| 03 | 26 | Mapped to the register. |
| 04 | 17 | Mapped to the register. |
| 05 | 15 | Mapped to the register. Exception: see table below. Ordering direction is tracked under OAPI-07. |
| 06 | 16 | Mapped to the register. Breakpoints are tracked under OWA-13. |

Lines that are status-label definitions, legends or rule statements (e.g. "TBD = not decided") are not decisions and are not tracked.

**TBD items with no register row** (recorded, not elevated to IDs, not decided):

| Item | Source | Note |
|---|---|---|
| Backend internal module structure | 02 §6.1 | An implementation-internal detail within the `05` constraints. Flagged for the team to decide whether it needs tracking. |
| Use of PUT/PATCH/DELETE methods | 05 §8 | No source requires them. Flagged; becomes relevant if write or correction endpoints are requested (see DB-09). |

### 11.3 Topic checklist

The 36 topics named when this document was planned, each mapped to its row:

| Topic | Row |
|---|---|
| Existing monitoring dashboard / system relationship | OD-04 |
| Stakeholder / farm facts | OD-11 |
| Hardware status, component selection | AP-01 (§4.2), OAD-13, OD-10 row |
| Sensor parameters, units, ranges | ODC-01 |
| Node identity | ODC-03 |
| Gateway context | ODC-04 |
| Measurement time / time source | ODC-05 |
| Producer marker | ODC-06 |
| Telemetry field representation | ODC-02, OAPI-01 |
| Batching | ODC-12 |
| Duplicates, idempotency, retry | ODC-11 |
| Unknown-node handling | OAPI-03 |
| Data-contract/API versioning | ODC-02 |
| Database technology/provider | DB-01 (RESOLVED); hosting provider DB-17 |
| Metric model | DB-02 |
| API field names | OAPI-01 |
| Node identifier in API path | OAPI-04 |
| Latest-telemetry strategy | OWA-03 |
| Pagination / time filter | OAPI-07 |
| Authentication / authorisation | OD-08 |
| Producer/gateway security | ODC-13 |
| Communication-protocol ambiguity | OAD-07 |
| Simulator parity | OD-06 |
| Frontend language | OWA-02 |
| History table/chart | OWA-04 |
| Stale-data semantics | OWA-06 |
| Refresh behaviour | OWA-17 |
| Responsive/mobile target | OWA-13 |
| Auth UI | OD-08 (OWA-08) |
| Alerts / reports / settings | ODC-08 / OWA-10 / OWA-11 |
| Decide / Control / Verify | OD-03, OD-02 |
| Command path | OD-03 |
| Verification evidence | OD-02 |
| Cloud / deployment | OAD-06 |
| UTS/UAS scope | OD-01 |

Topics added in v0.2 from the repository audit:

| Topic | Row |
|---|---|
| Specification cited in code but missing from the repository | OD-16 |
| Implemented frontend features without a requirement basis | OD-17 |
| Validity of sensor readings sent by the prototype firmware | OD-18 |
| Role and consumption of the `shared/` package | OD-19 |

### 11.4 Verification method (to repeat after every change)

1. **ID completeness:** extract every OD, OAD, ODC, DB, OAPI, OWA, C, CC, DBC, APIC and WAC ID defined in `00`–`06` and confirm each appears in §11.1 or §7.
2. **PROPOSED completeness:** confirm every AP, DC-03/04, INV-05/06, DBD, DBI, DBX, API-02…10 and WA-02…14 ID appears in §4.2.
3. **TBD lines:** re-run the per-document count of TBD lines without a decision ID, and map any new line (§11.2).
4. **No-decision guard:** confirm that no row is RESOLVED without a §9.1 log entry. Confirm no status in 07 is stronger than in its owner document, and that 07 introduces no technology, product, auth or endpoint names.
