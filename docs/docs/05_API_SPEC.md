# 05 — SoilMon API Specification

| Field | Value |
|---|---|
| Document status | DRAFT |
| Version | 0.2 |
| Last updated | 2026-10-20 |
| Owner | TBD |
| Sources | `CLAUDE.md`; `docs/00_PROJECT_CONTEXT.md` (v0.2); `docs/01_REQUIREMENTS.md` (v0.1); `docs/02_SYSTEM_ARCHITECTURE.md` (v0.1); `docs/03_DATA_CONTRACT.md` (v0.1); `docs/04_DATABASE_DESIGN.md` (v0.1); CE739L Project Assignment (`CE739L-PA`, summary only — not stored in the repository) |

---

## 1. Purpose and Scope

This document defines **how the backend accepts and exposes SoilMon data over HTTPS**:

- resources and paths
- HTTP methods
- request and response semantics
- status and error semantics
- versioning
- filtering and pagination, where justified

It is the document that 01 NFR-05 and 03 ODC-02 defer to for data representation and API versioning. It supports the CE739L Midterm items: REST API design, backend demo, and full-stack integration (02 §11).

| Topic | Owned by |
|---|---|
| Which data concepts exist, their direction and invariants | `03_DATA_CONTRACT.md` |
| How concepts are stored relationally | `04_DATABASE_DESIGN.md` |
| **How concepts are accepted and exposed over HTTP(S)/REST** | **This document** |
| How data is presented to users | `06_WEB_APP_SPEC.md` |
| Tracking of open decisions | `07_OPEN_DECISIONS.md` |

**Not in this document:**

- Database design, and any redesign of the data contract.
- UI behaviour.
- Authentication/authorisation mechanisms.
- Middleware, ORMs, infrastructure and cloud providers.
- Telemetry field names, units, ranges and intervals.

---

## 2. Conventions

| Label | Meaning |
|---|---|
| **CONFIRMED** | Explicitly decided or required in a source. |
| **PROPOSED** | A design choice owned by this document, or one that realises a PROPOSED concept. May change. |
| **TBD** | Not decided. Not implemented. |

**Inherited-status rule:** an endpoint is never stronger in status than the concept or entity it exposes. For example, Node is PROPOSED in `03`/`04`, so every Node endpoint is at most PROPOSED.

**Paths and status codes:** this document owns them, but no source confirms any of them. Every concrete path and status code here is **PROPOSED**. One exception: the path of the internal health endpoint `GET /health` (API-11, §15) is CONFIRMED by a SoilMon Team decision (07 §9.1). Its status code and body stay PROPOSED.

**Bodies:** request and response bodies are described as **conceptual parts** (for example, "origin", "measurement time", "measurement values"). They are not field names, because names depend on 03 ODC-01, ODC-03 and ODC-05.

| ID prefix | Meaning |
|---|---|
| API-xx | API decision (CONFIRMED or PROPOSED) |
| OAPI-xx | Open API decision |
| APIC-xx | Contradiction or ambiguity |

**Traceability:** each resource cites the `03` concepts (DC/INV) and `04` entities/rules (DBD/DBI/DBX) it realises.

---

## 3. API Architectural Role

```text
 Gateway / Simulator ──(a) Telemetry intake: HTTPS POST──► ┌─────────────┐ ◄──► Relational Database
   [Producer callers]                                     │ Backend API │
                                                          └──────┬──────┘
                                                                 │ (b) Data retrieval: REST (GET)
                                                                 ▼
                                                          Web Dashboard
                                                       [Dashboard-user callers]

 (c) Command direction (system → actuators): TBD. It may not use this API at all.
```

| Interface | Direction | Status | Source |
|---|---|---|---|
| (a) Telemetry intake | Gateway/Simulator → Backend, HTTPS POST | CONFIRMED (direction) | 01 FR-04, FR-05; 02 AD-04 |
| (b) Data retrieval | Dashboard → Backend → Dashboard, REST | CONFIRMED (direction) | 01 FR-08; 02 AD-05 |
| (c) Command direction | System → Actuator(s) | TBD | 02 §9, OAD-09 |
| Only the backend accesses the database. | — | CONFIRMED | 02 AD-06, §8 |

---

## 4. API Style and Versioning

| ID | Decision | Status | Source |
|---|---|---|---|
| API-01 | The API is resource-oriented REST over HTTPS. | CONFIRMED (direction) | 01 NFR-04; 02 AD-05; CE739L-PA |
| API-02 | The major version is carried as a URI prefix: `/api/v1`. | PROPOSED | CLAUDE §5 ("intended … where specified by the API documentation"); 01 NFR-05 |
| API-03 | Request and response bodies use JSON. | PROPOSED | CLAUDE §5 ("current intended stack"); 01 NFR-05 |
| API-04 | Collections use plural nouns. Paths contain no verbs. Sub-resources express ownership. | PROPOSED | REST resource orientation (API-01) |
| — | How the data-contract version relates to the API version. | TBD (OAPI-11) | 03 ODC-02; 04 DB-16 |

---

## 5. Candidate Resources

| Resource | Responsibility | Concepts | Caller → consumer | Status | Depends on |
|---|---|---|---|---|---|
| **Telemetry (ingestion collection)** | Accept telemetry records. | DC-01–DC-04, DC-11; Telemetry Record, Measurement Value | Gateway/Simulator → Backend | POST CONFIRMED (direction); path PROPOSED | ODC-01, 03, 05, 11, 12, 13 |
| **Node** (read-only) | List nodes; get one node. | DC-03; Node | Backend → Dashboard | PROPOSED | ODC-03; OAPI-04 |
| **Node telemetry history** (read-only) | One node's records over time. | DC-01–DC-04; Telemetry Record; DBX-01 | Backend → Dashboard | PROPOSED | ODC-01; DB-04 |
| **Metric** (read-only) | What each measured parameter means. | DC-02; Metric (DBD-02) | Backend → Dashboard | PROPOSED, dependent on 04 DBD-02 being accepted | ODC-01; DB-02 |
| Gateway | — | DC-05 | — | **TBD.** No resource. | DB-06 |
| Alert | — | DC-08 | — | **TBD.** No resource. | DB-11 |
| Irrigation Zone | — | None | — | **Not justified.** Excluded. | DB-14 |
| Command / Control | — | DC-09 | — | **TBD.** No resource. | ODC-09; DB-12 |
| Verification | — | DC-10 | — | **TBD.** No resource. | ODC-10; DB-12 |
| User / Authentication | — | — | — | **Required by UAS. No endpoints until the mechanism is decided.** | OAPI-08; DB-13 |

### 5.1 Why these resources, and not others

| Question | Finding |
|---|---|
| Is a Node resource needed? | The dashboard must present field data (01 FR-09, CONFIRMED). The only anticipated access pattern is per-node history (04 DBX-01), so the dashboard has to discover which nodes exist. Node is PROPOSED, so the resource is too. Creating and updating nodes depends on provisioning (ODC-03) and is TBD. |
| Should telemetry be nested under nodes? | **Ingestion: no.** The gateway knows only the contract origin identifier, not the database identity (04 DBD-03), and batching across nodes is open (ODC-12). **Retrieval: yes.** It follows Node → Telemetry Record ownership (04 §6). |
| Is an ingestion acknowledgement resource needed? | No. DC-11 says only that a response exists; its content is TBD. Nothing is persisted (04 §4). The HTTP response is enough. |
| Gateway, Alert, Irrigation Zone? | These were discussed earlier, but `03`/`04` mark them TBD or unsupported (APIC-2). |

---

## 6. Telemetry Ingestion

**Caller class:** Producer (the real gateway or the development simulator).

| Aspect | Specification | Status | Trace |
|---|---|---|---|
| Method | POST | CONFIRMED | 01 FR-04; 02 AD-04 |
| Path | `/api/v1/telemetry` | PROPOSED (API-05) | API-02, API-04 |
| Conceptual request | One telemetry record, containing: | | |
| | · origin (which node produced it) | PROPOSED | DC-03 |
| | · measurement time | PROPOSED | DC-04 |
| | · measurement values (contents TBD) | CONFIRMED (concept) | DC-02; ODC-01 |
| | · producer type, gateway context, power status | Excluded until decided | DC-05, DC-06, DC-07 |
| One record or a batch per request | — | TBD (OAPI-02) | ODC-12 |
| Validation | The backend validates the request against the contract before storing it. Non-conforming requests are rejected and nothing is stored. | PROPOSED | INV-05; DBI-05 |
| Unknown origin | When no existing node matches the origin: reject the request, or register the node automatically. | TBD (OAPI-03) | ODC-03; DBI-01 |
| Success response | A success status. Body content TBD. | PROPOSED (status) / TBD (body) | DC-11 |
| Failure response | Error status and error body (§9). | PROPOSED | API-08 |
| Producer independence | The real gateway and the simulator use the same semantics, and the backend does not branch on producer type. | CONFIRMED | INV-01, INV-02 |
| Simulator uses the same entry point | — | TBD (OAPI-12) | ODC-14 |
| Idempotency, duplicate deliveries, retry | — | TBD (OAPI-05) | ODC-11; DB-08 |
| Boundary security | — | TBD (OAPI-09) | ODC-13 |

---

## 7. Telemetry Retrieval

**Caller class:** Dashboard user. All retrieval endpoints are read-only.

| ID | Endpoint | Purpose | Status | Trace |
|---|---|---|---|---|
| API-06 | `GET /api/v1/nodes` | List nodes | PROPOSED | DC-03; Node |
| API-06 | `GET /api/v1/nodes/{node}` | Get one node | PROPOSED | DC-03; Node |
| API-07 | `GET /api/v1/nodes/{node}/telemetry` | One node's telemetry history | PROPOSED | DC-01–DC-04; Telemetry Record; DBX-01 |
| API-09 | `GET /api/v1/metrics` | List metric definitions | PROPOSED, dependent on DBD-02 | DC-02; Metric |

`{node}` is a node identifier. Whether it is the contract origin identifier or a database identity is TBD (OAPI-04).

### 7.1 Node telemetry history

| Aspect | Specification | Status | Reason |
|---|---|---|---|
| Each returned record | Measurement time, plus its measurement values, each with a reference to its metric. Field names TBD. | PROPOSED / TBD | DC-02, DC-04; DBD-02 |
| Time-range filter | Return records within a requested time range. | PROPOSED (principle); parameter names and time format TBD (OAPI-07) | History and Verify (01 FR-10, FR-11, FR-18); 04 DBX-01 |
| Pagination | Results are returned in pages. | PROPOSED (principle); style and limits TBD (OAPI-07) | History is append-oriented and unbounded (04 §8). No performance target is assumed (01 NFR-09). |
| Ordering | By measurement time | PROPOSED; direction TBD | DBX-01 |
| Other filters (by metric, aggregation, "latest") | — | TBD | No source justifies them (01 FR-11 is TBD) |

---

## 8. HTTP Methods and Status Semantics

**Methods.** Only GET and POST are used. PUT, PATCH and DELETE are TBD because no source requires them. This also keeps stored telemetry append-oriented (04 §8).

| Situation | Category | Proposed code | Status |
|---|---|---|---|
| Successful read | 2xx | 200 | PROPOSED |
| Ingestion accepted and stored | 2xx | 201 | PROPOSED |
| Malformed request, or request that violates the contract | 4xx | 400 or 422 | PROPOSED / choice TBD (OAPI-06) |
| Node not found (retrieval) | 4xx | 404 | PROPOSED |
| Duplicate delivery | 4xx or 2xx | — | TBD (OAPI-05) |
| Not authenticated / not authorised | 4xx | 401 / 403 (reserved) | Required by UAS; mechanism TBD (OAPI-08) |
| Server failure | 5xx | 500 | PROPOSED |

The status categories (2xx success, 4xx client error, 5xx server error) follow standard HTTP semantics.

---

## 9. Error Model

| ID | Rule | Status |
|---|---|---|
| API-08 | Every error response has the same conceptual parts: a machine-readable error category; a human-readable message; and, for validation errors, an indication of which part of the request failed. | PROPOSED |
| — | Client errors (validation, not found) are distinct from server errors. A server error never reports a client fault. | PROPOSED |
| — | Error body field names and exact format. | TBD (OAPI-06) |
| — | The Stage 1 implementation uses a provisional error body (§15.2). It realises API-08 and does not decide OAPI-06. | PROPOSED |

---

## 10. API ↔ Data Contract ↔ Database Mapping

| API element | `03` concepts / invariants | `04` entities / rules | Exposed or internal |
|---|---|---|---|
| Ingestion request | DC-01–DC-04; INV-01, INV-02, INV-05, INV-06 | Telemetry Record, Measurement Value; DBI-01–DBI-05 | Exposed (conceptual parts) |
| Ingestion response | DC-11 | Not persisted | Exposed (status, plus error body) |
| Node resource | DC-03 | Node; DBD-03; DBI-04 | Contract origin identifier exposed. Exposure of the database identity is TBD (OAPI-04). |
| Node telemetry history | DC-01, DC-04 | Telemetry Record; DBX-01 | Exposed |
| Record values | DC-02 | Measurement Value; DBI-02, DBI-03 | Exposed |
| Metric resource | DC-02 | Metric; DBD-02 | Exposed |
| Internal identities of records and values | — | DBD-03 | Internal unless a client needs them (OAPI-04) |
| Concepts DC-05 to DC-10 | TBD in `03` | Not modelled in `04` | Not exposed |

---

## 11. Authentication and Authorisation Boundary

| Statement | Status | Source |
|---|---|---|
| Authentication (establishing who the caller is) and authorisation (deciding what the caller may do) are both required by UAS. | CONFIRMED (required) | 02 AD-10; CE739L-PA |
| Mechanisms for both. | TBD (OAPI-08) | 02 OAD-05 |
| There are two caller classes. **Producer** may use ingestion only. **Dashboard user** may use retrieval only. | PROPOSED | §3 |
| Producer (gateway/simulator) authentication is a separate question from dashboard-user authentication. | TBD (OAPI-09) | 03 ODC-13 |
| No sign-in, credential or account endpoints are defined. | CONFIRMED (for this version) | Mechanism TBD |
| Whether endpoints are open (unauthenticated) at UTS. | TBD (OAPI-08) | 01 FR-23; 02 C-1 |
| Adding authentication later must not change any resource path. | PROPOSED | Keeps UTS and UAS paths stable |

---

## 12. Future Control / Verification API

| Statement | Status | Source |
|---|---|---|
| No command, control or verification resources are defined. | CONFIRMED (for this version) | 03 DC-09, DC-10 are TBD |
| A future command or verification resource would be separate from telemetry, and would relate to Node and/or Telemetry Record. | PROPOSED (principle) | 04 §11 |
| Whether commands travel over this API at all, or by another route. | TBD (OAPI-13) | 02 OAD-09 |

---

## 13. API Decisions and Open Decisions

### 13.1 API decisions

| ID | Decision | Status |
|---|---|---|
| API-01 | Resource-oriented REST over HTTPS | CONFIRMED (direction) |
| API-02 | `/api/v1` URI-prefix versioning | PROPOSED |
| API-03 | JSON representation | PROPOSED |
| API-04 | Plural-noun collections, no verbs, sub-resources for ownership | PROPOSED |
| API-05 | `POST /api/v1/telemetry`, with origin carried in the request | PROPOSED |
| API-06 | `GET /api/v1/nodes` and `GET /api/v1/nodes/{node}` | PROPOSED |
| API-07 | `GET /api/v1/nodes/{node}/telemetry`, with time-range filter and pagination principles | PROPOSED |
| API-08 | Consistent conceptual error model | PROPOSED |
| API-09 | `GET /api/v1/metrics` (dependent on 04 DBD-02) | PROPOSED |
| API-10 | Minimum UTS API set: API-05, API-06, API-07, API-09. This is the set the full-stack integration demo (02 AD-11) needs. | PROPOSED (UTS stage scope, 01 OD-01, is still open) |
| API-11 | Internal operational endpoint `GET /health`: reports that the process is running; does not check the database (§15) | CONFIRMED (endpoint and path; SoilMon Team, 07 §9.1). Status code and body PROPOSED. |

### 13.2 Open API decisions

| ID | Open decision | Cross-reference |
|---|---|---|
| OAPI-01 | Request and response field names and structure | 03 ODC-01, ODC-03, ODC-05 |
| OAPI-02 | One record or a batch per ingestion request | 03 ODC-12 |
| OAPI-03 | Unknown-origin handling (reject or auto-register) | 03 ODC-03; 04 DBI-01 |
| OAPI-04 | Which node identifier appears in paths (contract origin ID or database identity) | 04 DBD-03; 03 ODC-03 |
| OAPI-05 | Idempotency, duplicate and retry semantics | 03 ODC-11; 04 DB-08 |
| OAPI-06 | 400 vs. 422 for contract violations; error-body format | — |
| OAPI-07 | Pagination style and limits; time-filter parameter names and format | 04 DB-04; 01 NFR-09 |
| OAPI-08 | Authentication and authorisation mechanisms per caller class; whether endpoints are open at UTS | 02 AD-10, OAD-05; 01 FR-23 |
| OAPI-09 | Producer (gateway) authentication and boundary security | 03 ODC-13 |
| OAPI-10 | Meaning of "communication protocol" in the CE739L Final | 02 OAD-07 |
| OAPI-11 | How the data-contract version relates to the API version | 03 ODC-02; 04 DB-16 |
| OAPI-12 | Simulator entry-point parity with the gateway | 03 ODC-14 |
| OAPI-13 | Future command/control and verification interfaces | 03 ODC-09, ODC-10 |
| OAPI-14 | Gateway, alert and power resources, if they are ever decided | 04 DB-06, DB-10, DB-11 |
| OAPI-15 | Exact meaning of "half-REST API design" for the Midterm; which endpoints form the UTS set | 02 C-4; 01 OD-01 |

### 13.3 Contradictions and ambiguities

These are recorded for follow-up and are not resolved here.

| ID | Finding |
|---|---|
| APIC-1 | CLAUDE §5 lists `/api/v1` and JSON as "intended". 01 NFR-05 marks versioning and representation TBD and defers them to `05`. This document raises them only to PROPOSED (API-02, API-03), not CONFIRMED. |
| APIC-2 | `/alerts`, `/zones` and `/gateways` were discussed as candidates earlier. `03`/`04` mark them TBD or unsupported, so they are excluded. |
| APIC-3 | 04 DBI-01 forbids records without a node, but node provisioning is TBD (03 ODC-03). Ingestion behaviour for unknown nodes cannot be fixed yet (OAPI-03). |
| APIC-4 | The gateway uses the contract origin identifier. 04 DBD-03 keeps database identities separate. Retrieval paths could use either (OAPI-04). |
| APIC-5 | 02 AD-10 requires auth by UAS; 01 FR-23 still says TBD (02 C-1). It is also unclear whether "authentication" in the Final includes gateway authentication (OAPI-09). |
| APIC-6 | 02 calls the dashboard interface "REST" and the intake interface "HTTPS POST". Modelling intake as a POST to a REST collection is a PROPOSED design choice. |
| APIC-7 | "Communication protocol" (Final) and "half-REST API design" (Midterm) are not interpreted (OAPI-10, OAPI-15). |

### 13.4 Risks and dependencies

| Risk | Note |
|---|---|
| Request/response bodies are blocked by 03 ODC-01 (parameters). | Until it is decided, the backend demo can only use placeholder metrics. |
| Ingestion implementation is blocked by OAPI-03 (unknown origin). | Needs a decision before backend work begins. |
| Auth binds late (OAPI-08). | If endpoints are open at UTS, adding auth by UAS must not change the paths (§11). |
| Database product (04 DB-01): resolved as PostgreSQL (07 §9.1). | No longer blocks the database and backend demos. The hosting provider is open as 04 DB-17 (02 OAD-06). |
| CE739L-PA is not in the repository. | "Half-REST" and "communication protocol" can't be checked against the original text. |

---

## 14. Relationship to Later Documents

| Document | Relationship |
|---|---|
| `06_WEB_APP_SPEC.md` | Consumes only the retrieval interface (§7). It defines no endpoints of its own and cannot read the database directly. |
| `07_OPEN_DECISIONS.md` | Tracks OAPI-01 to OAPI-15 and APIC-1 to APIC-7. |
| Backend implementation | Must follow this document, or update it first. Resources and fields not defined here are not implemented (01 NFR-07; 03 INV-04). |
| Gateway firmware / simulator | Implements the producer side of §6. Field-level details follow from OAPI-01 once 03 ODC-01, ODC-03 and ODC-05 are resolved. |

---

## 15. Internal Operational Endpoint: Health

`GET /health` (API-11) is an internal operational endpoint. It is not a resource, and it is not part of the telemetry intake (a) or data retrieval (b) interfaces in §3.

| Aspect | Specification | Status |
|---|---|---|
| Endpoint | `GET /health` | CONFIRMED (SoilMon Team, 07 §9.1) |
| Versioning | Not under `/api/v1` (API-02). It is operational, not a versioned resource. | CONFIRMED (follows from the path) |
| Purpose | Confirms that the backend process is running and answering HTTP requests. | CONFIRMED |
| What it checks | Only that the process received the request and returned a response. | CONFIRMED |
| What it does not check | PostgreSQL connectivity, telemetry freshness, gateway or node status, or any other dependency. A `200` response does **not** mean the database is reachable. | CONFIRMED |
| Access control | No authentication in the Stage 1 implementation. Whether it stays open is part of OAPI-08. | TBD (OAPI-08) |
| Caller | Internal: developers, operators and deployment tooling. Which tools call it depends on hosting (02 OAD-06). | TBD (OAD-06) |

### 15.1 Implemented behaviour (Stage 1)

These rows describe the current implementation. The status code and body are **PROPOSED**, like every status code in this document (§2).

| Request | Status code | Body | Status |
|---|---|---|---|
| `GET /health` | 200 | `{"data":{"status":"ok"}}`, `Content-Type: application/json` | PROPOSED |
| `HEAD /health` | 200 | None | Implementation detail (Express answers HEAD for GET routes) |
| Any other method on `/health` | 404 | Error body with code `not_found` (§15.2) | Implementation detail; 405 is not used |

### 15.2 Error responses implemented in Stage 1 (all paths)

The backend returns errors in one shape: `{"error":{"code":"<code>","message":"<text>"}}`. It realises the conceptual model in API-08 (category = `code`, message = `message`). It does **not** decide OAPI-06: the field names, the codes and the 400-vs-422 choice stay open, and the implementation may change when OAPI-06 is decided. The success wrapper `{"data": ...}` in §15.1 is provisional in the same way.

| Situation | Status code | `code` | Status |
|---|---|---|---|
| Unknown route | 404 | `not_found` | PROPOSED |
| Malformed JSON body | 400 | `invalid_json` | PROPOSED |
| JSON body over the 100 kB limit | 413 | `payload_too_large` | PROPOSED |
| Unsupported body charset or content encoding | 415 | `unsupported_media_type` | PROPOSED |
| Any other 400 client error | 400 | `bad_request` | PROPOSED |
| Any other 4xx client error | Same 4xx code | `client_error` | PROPOSED |
| Unexpected server error | 500 | `internal_error`, with a generic message and no error details or stack trace | PROPOSED |
| Error after the response has started | — | No error body. The response cannot be replaced, so the connection is closed. | Implementation detail |
