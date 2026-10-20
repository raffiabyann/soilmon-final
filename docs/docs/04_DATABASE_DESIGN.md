# 04 — SoilMon Database Design

| Field | Value |
|---|---|
| Document status | DRAFT |
| Version | 0.2 |
| Last updated | 2026-10-20 |
| Owner | TBD |
| Sources | `CLAUDE.md`; `docs/00_PROJECT_CONTEXT.md` (v0.2); `docs/01_REQUIREMENTS.md` (v0.1); `docs/02_SYSTEM_ARCHITECTURE.md` (v0.1); `docs/03_DATA_CONTRACT.md` (v0.1); CE739L Project Assignment (`CE739L-PA`, summary only — not stored in the repository) |

---

## 1. Purpose and Scope

This document defines the **relational logical design** of SoilMon's persistent data on the CE739L side. It covers entities, relationships, cardinality, identity, integrity and indexing principles. It supports the CE739L database design and database demo deliverables (01 C739-04, C739-06).

| Topic | Owned by |
|---|---|
| Which data concepts exist, and their status | `03_DATA_CONTRACT.md` |
| How those concepts are represented relationally | **This document** |
| Wire format, endpoints, versioning, response semantics | `05_API_SPEC.md` |
| How stored data is presented to users | `06_WEB_APP_SPEC.md` |
| Tracking of open decisions | `07_OPEN_DECISIONS.md` |

**Not in this document:** SQL or DDL, column names and data types, the database hosting provider, ORMs, endpoints, frontend pages, authentication implementation, and deployment.

This document does **not** redefine the data contract. Where `03` leaves a concept TBD, it stays TBD here.

---

## 2. Status and Source Conventions

| Label | Meaning |
|---|---|
| **CONFIRMED** | Explicitly decided or required in a source. |
| **PROPOSED** | A design choice that is needed for a CONFIRMED requirement to work, or that realises a PROPOSED concept. May change. |
| **TBD** | Not decided. Not modelled and not implemented. |

**Inherited-status rule:** an entity, attribute or relationship can never be stronger in status than the `03` concept it realises. For example, Node realises DC-03 (PROPOSED), so Node is at most PROPOSED.

| ID prefix | Meaning |
|---|---|
| DBD-xx | Database design decision (CONFIRMED or PROPOSED) |
| DBI-xx | Integrity constraint |
| DBX-xx | Indexing principle |
| DB-xx | Open database decision |
| DBC-xx | Contradiction or ambiguity found in sources 00–03 |

**Source keys:** `CLAUDE §n`, `00 §n`, `01 <ID>`, `02 <ID or §n>`, `03 <DC/INV/ODC ID or §n>`, `CE739L-PA`.

**Promotion rule:** status changes only through an explicit team decision. The decision is recorded in `07_OPEN_DECISIONS.md` and reflected here with a version bump.

---

## 3. Database Architectural Role

| Statement | Status | Source |
|---|---|---|
| The database is SoilMon's persistent store on the CE739L/application side. | CONFIRMED | 02 §6.2; 01 C739-02 |
| It is relational. | CONFIRMED | 01 NFR-02; 02 AD-06 |
| Only the backend reads from and writes to the database. | CONFIRMED | 02 AD-06, §8 |
| The web dashboard never accesses the database directly; it uses the REST API. | CONFIRMED | 02 §8 |
| The gateway and simulator never access the database directly; they deliver through the backend under the data contract. | CONFIRMED | 02 §8; 03 §3 |
| The backend stores accepted telemetry. | CONFIRMED | 01 FR-06 |
| The database stores no content outside the data contract. | CONFIRMED | 03 INV-04, §14 |

```text
 Gateway / Simulator ──HTTPS POST (contract, 03)──► Backend API ◄──► Relational Database
                                                         │
                                                     REST API
                                                         ▼
                                                   Web Dashboard
```

---

## 4. Contract-to-Database Mapping

Every data concept from `03` §5 appears below. Concepts that are TBD in `03` are **not modelled**.

| DC | Concept (status in 03) | Database representation | Status here |
|---|---|---|---|
| DC-01 | Telemetry record (CONFIRMED) | Telemetry Record entity | CONFIRMED |
| DC-02 | Measurement values (CONFIRMED concept; contents TBD) | Measurement Value entity, linked to Telemetry Record and Metric (DBD-02) | Representation PROPOSED; contents TBD |
| DC-03 | Origin (PROPOSED) | Node entity; each Telemetry Record references one Node | PROPOSED |
| DC-04 | Measurement time (PROPOSED) | Attribute of Telemetry Record | PROPOSED |
| DC-05 | Gateway context (TBD) | Not modelled; extension point | TBD (DB-06) |
| DC-06 | Producer type (TBD) | Not modelled. How simulated and real data are separated is open. | TBD (DB-07) |
| DC-07 | Power status (TBD) | Not modelled; owner (Node or Gateway) open | TBD (DB-10) |
| DC-08 | Events/alerts (TBD) | Not modelled; stored or derived is open | TBD (DB-11) |
| DC-09 | Command data (TBD) | Not modelled; extension point (§11) | TBD (DB-12) |
| DC-10 | Actuation/verification evidence (TBD) | Not modelled; extension point (§11) | TBD (DB-12) |
| DC-11 | Delivery response (exists; content TBD) | Not persisted. Whether deliveries or rejections are logged is open. | TBD (DB-08) |

---

## 5. Candidate Entities

### 5.1 Modelled entities

| Entity | Responsibility | Justified attributes (conceptual) | Status | Realises |
|---|---|---|---|---|
| **Telemetry Record** | One accepted delivery of measurements from a node. | Internal identity (DBD-03); reference to its Node; measurement time (PROPOSED, DC-04). | CONFIRMED (entity) | DC-01, DC-04, INV-06 |
| **Node** | A field node that measurements are attributed to. | Internal identity (DBD-03); the node's contract origin identifier (format TBD, ODC-03). | PROPOSED | DC-03 |
| **Measurement Value** | One measured value within a Telemetry Record. | Reference to its Telemetry Record; reference to its Metric; the value itself (representation TBD; raw vs. converted is ODC-01). | PROPOSED | DC-02 |
| **Metric** | Defines a measured parameter, i.e. what a Measurement Value means. | Internal identity (DBD-03). The parameter's identity and unit are TBD (ODC-01). | PROPOSED (DBD-02) | DC-02 |

Attributes not listed above are not justified by the sources and are not part of the design.

### 5.2 Entities not modelled

| Entity | Reason | Status |
|---|---|---|
| Gateway | Gateway context (DC-05) is TBD. | TBD (DB-06) |
| Alert / Event | Events/alerts (DC-08, 01 FR-22) are TBD. | TBD (DB-11) |
| Irrigation Zone | Not mentioned anywhere in 00–03. | Not supported (DB-14) |
| Power status | DC-07 is TBD. | TBD (DB-10) |
| User / Role | Authentication and authorisation are required by UAS (02 AD-10), but their design is TBD and 01 FR-23 is still TBD (DBC-2). | Required by UAS; design TBD (DB-13) |
| Command / Actuation / Verification | DC-09 and DC-10 are TBD. | TBD (DB-12) |

### 5.3 Logical ER diagram

```text
 Legend:  ──  modelled relationship      - -  TBD extension point (not modelled)
          1 / 0..* / 1..*  cardinality

 ┌──────────────┐ 1       0..* ┌──────────────────┐ 1       1..* ┌───────────────────┐ 0..*      1 ┌──────────┐
 │    Node      │──────────────│ Telemetry Record │──────────────│ Measurement Value │──────────────│  Metric  │
 │  (PROPOSED)  │              │   (CONFIRMED)    │              │    (PROPOSED)     │              │(PROPOSED)│
 └──────┬───────┘              └────────┬─────────┘              └───────────────────┘              └──────────┘
        ┆                               ┆
        ┆ - - Gateway (TBD)             ┆ - - Command / Actuation / Verification evidence (TBD)
        ┆ - - Power status (TBD)        ┆
        ┆ - - Alert / Event (TBD)
```

### 5.4 Normalisation reasoning (DBD-02)

| Aspect | Reasoning |
|---|---|
| Why a narrow model | Measured parameters are unknown (ODC-01). The narrow model (Telemetry Record → Measurement Value → Metric) stays normalised and avoids reserving one nullable attribute per unknown parameter. |
| Extensibility | New parameters are added as new Metric rows, without changing the structure. This suits a long-lived system (00 §1; 01 NFR-08). |
| Redundancy | No attribute is repeated across entities. Each fact about a parameter lives once, in Metric. |
| Trade-off | Reading a full record requires joining its Measurement Values. Per-parameter meaning lives in Metric rather than in the record structure. |
| Status | PROPOSED. The team may revisit it once ODC-01 is resolved (DB-02). |

---

## 6. Relationships and Cardinality

| Relationship | Cardinality | Status | Basis |
|---|---|---|---|
| Node → Telemetry Record | One Node has zero or more Telemetry Records. Each Telemetry Record belongs to exactly one Node. | PROPOSED | DC-03, INV-06 |
| Telemetry Record → Measurement Value | One Telemetry Record has one or more Measurement Values. Each Measurement Value belongs to exactly one Telemetry Record. | PROPOSED | DC-02 |
| Metric → Measurement Value | One Metric is used by zero or more Measurement Values. Each Measurement Value refers to exactly one Metric. | PROPOSED | DBD-02 |
| Gateway ↔ Node | — | TBD, not modelled. No source states node–gateway ownership or topology. | DC-05; 02 §4.2 |
| Node ↔ Alert | — | TBD, not modelled | DC-08 |
| Node ↔ Irrigation Zone | — | Not supported, not modelled | No source |
| Power ownership (Node or Gateway) | — | TBD | DC-07 |
| Command / Verification ↔ Node or Telemetry Record | — | TBD; future extension (§11) | DC-09, DC-10 |

---

## 7. Identifier Strategy

| ID | Decision | Status | Basis |
|---|---|---|---|
| DBD-03 | Each modelled entity has a **database-internal identity**, separate from any identifier carried in the data contract. Relationships use internal identities, so a change to the contract's origin identifier format (ODC-03) does not ripple through them. | PROPOSED | 03 DC-03, ODC-03 |
| — | A Node keeps its contract origin identifier as an attribute. Its format and uniqueness scope are TBD. | PROPOSED (attribute) / TBD (format) | 03 ODC-03 |
| — | A Telemetry Record has an internal identity only. Whether the contract also carries a record identifier is TBD. | PROPOSED / TBD | 03 ODC-11 |
| — | Gateway identity is not modelled. | TBD | 03 DC-05 |
| — | Internal identifier type and format. | TBD (DB-05) | — |

---

## 8. Telemetry Storage Strategy

| Statement | Status | Basis |
|---|---|---|
| Telemetry is stored historically: each accepted Telemetry Record is kept as its own entry. | PROPOSED | 01 FR-06, FR-10, FR-11 (history); FR-18 (Verify compares before/after) |
| Storage is append-oriented: accepted records are added, not overwritten. | PROPOSED | Same as above |
| The record carries measurement time (DC-04). Its Measurement Values are linked to it (DBD-02). | PROPOSED | 03 §6 |
| Which clock provides measurement time (node, gateway or backend receipt), its precision and time zone, and whether receipt time is also stored. | TBD (DB-04) | 03 ODC-05 |
| Corrections, deletion, retention, resolution and archival. | TBD (DB-09) | 01 NFR-09 |
| Value representation (raw, converted, or both). | TBD (DB-03) | 03 ODC-01 |

---

## 9. Integrity and Constraints

| ID | Constraint | Status | Basis |
|---|---|---|---|
| DBI-01 | Every Telemetry Record references an existing Node. No orphan records. | PROPOSED | 03 INV-06 |
| DBI-02 | Every Measurement Value references an existing Telemetry Record and an existing Metric. | PROPOSED | DBD-02 |
| DBI-03 | At most one Measurement Value per Metric per Telemetry Record. | PROPOSED | Normalisation of DC-02 |
| DBI-04 | A Node's contract origin identifier is unique within its scope. | PROPOSED (uniqueness) / TBD (scope, ODC-03) | 03 DC-03 |
| DBI-05 | Only contract-conforming records are stored. The backend validates before storage. | PROPOSED | 03 INV-05 |
| — | Duplicate-delivery uniqueness (for example, one record per Node per measurement time). | TBD. Depends on idempotency rules (03 ODC-11). | 03 ODC-11 |
| — | Whether rejected or invalid deliveries are logged. | TBD (DB-08) | 03 ODC-11 |
| — | Deletion propagation (what happens to records when a Node is removed). | TBD (DB-09) | — |

---

## 10. Indexing Principles

Indexes are added only for access patterns the sources anticipate. No performance target exists (01 NFR-09 TBD), so none is assumed.

| ID | Principle | Status | Reason |
|---|---|---|---|
| DBX-01 | Index Telemetry Record by (Node reference, measurement time). | PROPOSED | The only access pattern the sources anticipate is per-node history over time (01 FR-10, FR-11, FR-18). |
| DBX-02 | Index the references from Measurement Value to Telemetry Record and to Metric. | PROPOSED | Supports the integrity checks (DBI-02) and the joins needed to read a record (§5.4). |
| — | Any other index. | TBD | Added only when a documented access pattern needs it. |

---

## 11. Extensibility for Decide → Control → Verify

| Statement | Status | Basis |
|---|---|---|
| Future command, actuation and verification entities will attach to existing entities (Node, Telemetry Record) through new relationships, without changing those entities. | PROPOSED (principle) | 01 FR-13–FR-19; 02 §13 |
| No command, actuation or verification structure is modelled now. | CONFIRMED | 03 DC-09, DC-10 are TBD |
| Verify compares conditions before and after fertigation. The stored telemetry history (§8) already supports that comparison. | PROPOSED | 01 FR-18 |
| Whether verification also needs separately persisted evidence, and what "verified" means. | TBD (DB-12) | 03 ODC-10; 01 OD-02 |
| Where Decide runs, which determines whether decisions are stored in this database at all. | TBD | 02 OAD-08 |

---

## 12. Database Technology / Provider

| Item | Decision | Status |
|---|---|---|
| Database technology (DB-01) | PostgreSQL. The backend accesses it through the `pg` driver (02 §6.4). | CONFIRMED (SoilMon Team; 07 §9.1) |
| Database hosting provider (DB-17) | Not decided. Decided together with hosting and deployment (02 OAD-06). | TBD (DB-17) |

**Rationale (DB-01):** relational telemetry data benefits from structured records, constraints, and SQL queries for historical monitoring and reporting. PostgreSQL is selected as the database technology; the hosting provider remains undecided.

- This document is a **logical** relational design. The physical schema, when it is produced (§14), targets PostgreSQL.
- No ORM is named or assumed here.
- Hosting and deployment are part of the UAS cloud requirements (02 AD-10). Their design is TBD (02 OAD-06).

---

## 13. Open Database Decisions

To be carried into `07_OPEN_DECISIONS.md`.

| ID | Open decision | Cross-reference |
|---|---|---|
| DB-01 | Database technology. **RESOLVED:** PostgreSQL, driver `pg` (07 §9.1). The provider part was split into DB-17 in v0.2. | 02 OAD-04; 01 NFR-02 |
| DB-02 | Confirm the narrow model (DBD-02), or move to one attribute per parameter after ODC-01 is resolved | 03 ODC-01 |
| DB-03 | Value representation: raw, converted, or both | 03 ODC-01 |
| DB-04 | Time storage: clock source, precision, time zone; whether receipt time is also stored | 03 ODC-05 |
| DB-05 | Internal identifier type and format | 03 ODC-03 |
| DB-06 | Gateway entity and Gateway ↔ Node relationship | 03 ODC-04 |
| DB-07 | Separating simulated and real data (marker, separate store, or none) | 03 ODC-06, CC-1 |
| DB-08 | Logging of deliveries and rejections | 03 ODC-11 |
| DB-09 | Deletion, retention, corrections and archival of telemetry | 01 NFR-09 |
| DB-10 | Power data storage and ownership (Node or Gateway) | 03 ODC-07 |
| DB-11 | Alerts: stored events or derived views | 03 ODC-08 |
| DB-12 | Command, actuation and verification-evidence storage | 03 ODC-09, ODC-10 |
| DB-13 | User/role storage for UAS authentication and authorisation | 02 AD-10, OAD-05 |
| DB-14 | Irrigation Zone: needed or not | No source; 01 OD-01 |
| DB-15 | Existing monitoring system's data: reuse, migrate or ignore | 03 ODC-15; 02 OAD-11 |
| DB-16 | Schema migration and versioning approach (no tool chosen) | 03 ODC-02 |
| DB-17 | Database hosting provider (split from DB-01 in v0.2) | 02 OAD-06 |

### Contradictions and ambiguities found in 00–03

These are recorded for follow-up and are not resolved here.

| ID | Finding |
|---|---|
| DBC-1 | Gateway, Alert, Irrigation Zone and Power were discussed in project context. The documents support them only as TBD (Gateway, Alert, Power) or not at all (Irrigation Zone appears nowhere in 00–03). None is modelled (DB-06, DB-10, DB-11, DB-14). |
| DBC-2 | 02 AD-10 (from CE739L-PA) requires authentication and authorisation by UAS, so user data will be needed. 01 FR-23 still treats this as TBD (02 C-1, unresolved). No User entity is modelled (DB-13). |
| DBC-3 | Whether simulated and real records share the same storage directly affects the database (03 CC-1). Left TBD (DB-07). |
| DBC-4 | Metric is this document's own modelling choice (DBD-02); no source names it. It is a relational way to hold DC-02 while parameters are unknown, so it is PROPOSED. |
| DBC-5 | The PROPOSED node hardware is battery-based (00 §11). No source excludes gateway power, or places power data in the contract (03 DC-07). The power owner is TBD (DB-10). |
| DBC-6 | Whether alerts are stored events or derived views is open: 01 FR-22 is TBD, and 03 §8 leaves their origin open (DB-11). |
| DBC-7 | Telemetry history may be enough for Verify, but what "verified" means is open (01 OD-02). Separate evidence storage is TBD (DB-12). |
| DBC-8 | The relationship with the existing monitoring system, including its data, is TBD (00 §5; 01 OD-04; 03 ODC-15). No migration is designed (DB-15). |

### Risks

| Risk | Note |
|---|---|
| UTS database demo (01 C739-06) | Only four entities are modelled, and three are PROPOSED. A demo needs DBD-02 and DBD-03 accepted, plus at least a provisional decision on ODC-01 (parameters). DB-01 (product) is resolved: PostgreSQL. |
| Auth by UAS | If user storage (DB-13) is not designed well before UAS, authentication/authorisation work starts late. |
| Simulated data in a long-lived store | Loading simulated data before DB-07 is decided may leave records that can't later be told apart from real ones. |

---

## 14. Relationship to Later Documents

| Document | Relationship |
|---|---|
| `05_API_SPEC.md` | Defines how contract records reach the backend and how stored data is served to the dashboard. Must map to DC, DBD and DBI IDs. |
| `06_WEB_APP_SPEC.md` | Presents stored data, read only through the REST API (02 §8). |
| `07_OPEN_DECISIONS.md` | Tracks DB-01 to DB-17 and DBC-1 to DBC-8. |
| Physical schema / SQL | Produced only after DB-01 and the key contract decisions (03 ODC-01, ODC-03, ODC-05) are resolved. It must follow this logical design or update it first. |
