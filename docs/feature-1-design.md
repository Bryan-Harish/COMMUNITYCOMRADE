# CommunityComrade MVP — Feature #1 Architecture Design Document
**System Architecture & Technical Design: Authentication, User Registration, Verification, and Role Management**

---

## 1. High-Level Architecture

CommunityComrade is designed as a secure, distributed full-stack system utilizing Next.js 15 (App Router) for both the user interface and serverless backend API routes. The primary backend data store is MongoDB Atlas. The application leverages Google Cloud Platform (GCP) for deployment and storage of binary assets (such as Government/Employee IDs).

### Component Block Diagram
```
+---------------------------------------------------------------------------------+
|                                 CLIENT TIER                                     |
|                                                                                 |
|  +--------------------+      +-------------------------+      +--------------+  |
|  |   Citizen Portal   |      | Department Officer Port |      | Admin Portal |  |
|  +---------+----------+      +------------+------------+      +------+-------+  |
|            |                              |                          |          |
|            +-----------------------+      |      +-------------------+          |
|                                    |      |      |                              |
|                                    v      v      v                              |
|                             +----------------------------+                      |
|                             |    Next.js Client State    |                      |
|                             |   (React Query / Context)  |                      |
|                             +--------------+-------------+                      |
+--------------------------------------------|------------------------------------+
                                             | (HTTPS / JSON / Session Cookies)
                                             v
+---------------------------------------------------------------------------------+
|                                APPLICATION TIER                                 |
|                                                                                 |
|  +---------------------------------------------------------------------------+  |
|  |                           Next.js API Gateway                             |  |
|  |     - NextAuth.js Middleware for Session & Routing RBAC Validation        |  |
|  +-------------------------------------+-------------------------------------+  |
|                                        |                                        |
|                                        v                                        |
|                     +--------------------------------------+                    |
|                     |     Serverless API Route Handlers    |                    |
|                     | - Citizen, Officer, Admin Sub-routes |                    |
|                     +------------------+-------------------+                    |
+----------------------------------------|----------------------------------------+
                  +----------------------+----------------------+
                  | (Mongoose DB Driver)                        | (GCS Node SDK)
                  v                                             v
+----------------------------------+          +----------------------------------+
|          DATABASE TIER           |          |           STORAGE TIER           |
|                                  |          |                                  |
|     +----------------------+     |          |     +----------------------+     |
|     |    MongoDB Atlas     |     |          |     | Google Cloud Storage |     |
|     |  (Durable Document   |     |          |     | (Encrypted Buckets   |     |
|     |        Store)        |     |          |     |     for ID Images)   |     |
|     +----------------------+     |          |     +----------------------+     |
+----------------------------------+          +----------------------------------+
```

### Architectural Highlights
* **Unification & Separation**: User-facing interfaces are split into three dedicated dashboard layouts (`/citizen`, `/officer`, `/admin`) while utilizing a unified `User` collection mapped to discrete, sub-profile schemas via relational references for modularity and high write performance.
* **Asset Upload Security**: Sensitive documents (Government/Employee IDs) are directly streamed to Google Cloud Storage (GCS) using short-lived signed URLs, avoiding local filesystem persistence on serverless functions.
* **Geospatial Readiness**: Location is tracked using standard 2D Sphere coordinates at registration to enforce downstream regional issue reporting scopes.

---

## 2. Authentication Architecture

The authentication layer is driven by **NextAuth.js (Auth.js) v5** utilizing a decoupled JWT-and-Session hybrid strategy.

### 2.1 The Login Flow
1. **Request Submission**: User submits credentials (Email + Password) via HTTPS to the NextAuth login handler (`/api/auth/callback/credentials`).
2. **User Retrieval & Status Evaluation**:
   * Fetch the account from the MongoDB `users` collection.
   * If the account is suspended (`status === 'SUSPENDED'`), abort immediately and return standard error code `403` with a localized generic error message.
   * If the user is a Citizen and is `PENDING_VERIFICATION`, or an Officer and is `PENDING_OFFICER_APPROVAL` or `REJECTED_OFFICER`, login attempts must be restricted (or guided to profile verification progress views).
3. **Password Verification**: Validate the payload password against the stored Argon2id hash.
4. **Token Generation**: NextAuth creates an encrypted JWT containing key identity claims (User ID, Role, Verification Status, and Geographical Coordinates).

### 2.2 JWT and Session Strategy
* **JWT Expiration**: The Access Token maintains a short TTL of **15 minutes**.
* **Session Management**: Session tokens are stored in secure, encrypted HTTP-only, SameSite=Strict cookies.
* **Refresh Strategy**: NextAuth `jwt` callback handles silent token rotations:
  * When a JWT approaches expiration, a `/api/auth/session` request queries the user's current MongoDB status.
  * If the user has been suspended or has transitioned from `PENDING_OFFICER_APPROVAL` to `ACTIVE_OFFICER`, the JWT claims are refreshed automatically. This mitigates stale privilege escalation.

### 2.3 Registration Flows

```
Citizen Registration Flow:
+--------------+     +-------------+     +-------------------+     +------------------+
| Submit Basic | --> | Upload Govt | --> | Dummy Validation  | --> | Status:          |
| Credentials  |     |  ID Card    |     | Engine Auto-Pass  |     | VERIFIED_CITIZEN |
+--------------+     +-------------+     +-------------------+     +------------------+

Officer Registration Flow:
+--------------+     +-------------+     +-------------------+     +------------------+
| Submit Basic | --> | Upload Emp  | --> | Select Dept &     | --> | Status:          |
| Credentials  |     | & Dept IDs  |     | Geographic Region |     | PENDING_APPROVAL |
+--------------+     +-------------+     +-------------------+     +------------------+
                                                                            |
                                                                            v
                                                                   +------------------+
                                                                   | Admin Approval   |
                                                                   |  -> ACTIVE_OFF   |
                                                                   +------------------+
```

---

## 3. Database Schema Design

MongoDB's document-oriented architecture is leveraged using a **hybrid design** (Core Profile with referencing). This maintains optimal query performance by decoupling role-specific profiles, avoiding large sparse documents, and enabling clean multi-tenant index isolation.

### 3.1 Design Principles
* **Referential Integrity**: Standardized DBRefs or ObjectIds connect core identity collections to secondary role profiles.
* **Enum Constancy**: Role boundaries and status arrays are strictly governed.
* **Immutability of Key Records**: Verification actions (endorsements, admin audits) are appended as discrete transactions rather than dynamic array mutations where audit-trail compliance is required.

---

## 4. MongoDB Collections

### 4.1 `users` Collection
Stores core identity data, password hashes, structural flags, and geographical coordinates.

```json
{
  "_id": "ObjectId",
  "email": "String (Unique, Indexed)",
  "passwordHash": "String (Argon2id)",
  "role": "String (Enum: 'CITIZEN', 'DEPARTMENT_OFFICER', 'ADMIN')",
  "location": {
    "type": { "type": "String", "default": "Point" },
    "coordinates": ["Number"] // [Longitude, Latitude]
  },
  "registeredLocationName": "String",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### 4.2 `citizen_profiles` Collection
Maintains verification status and attributes unique to Citizens.

```json
{
  "_id": "ObjectId",
  "userId": "ObjectId (Indexed, Reference to users)",
  "status": "String (Enum: 'PENDING_VERIFICATION', 'VERIFIED_CITIZEN', 'COMMUNITY_VERIFIED_CITIZEN', 'SUSPENDED')",
  "governmentId": {
    "type": "String (Enum: 'AADHAAR', 'VOTER_ID', 'DRIVING_LICENSE', 'PASSPORT')",
    "numberMasked": "String", // e.g. "XXXXXXXX3214"
    "numberEncrypted": "String", // AES-256-GCM encrypted original number
    "imageUrl": "String" // Secure GCS asset URI
  },
  "endorsementCount": "Number (Default: 0)",
  "updatedAt": "Date"
}
```

### 4.3 `officer_profiles` Collection
Maintains department affiliation, operational range, and administrative approval files.

```json
{
  "_id": "ObjectId",
  "userId": "ObjectId (Indexed, Reference to users)",
  "status": "String (Enum: 'PENDING_OFFICER_APPROVAL', 'ACTIVE_OFFICER', 'REJECTED_OFFICER', 'SUSPENDED')",
  "employeeId": "String (Indexed)",
  "departmentName": "String (Enum: 'ROADS', 'WATER', 'ELECTRICAL', 'SANITATION', 'MUNICIPAL')",
  "departmentIdCardUrl": "String", // Secure GCS asset URI
  "assignedArea": {
    "type": { "type": "String", "default": "Polygon" },
    "coordinates": [[["Number"]]] // Array of GeoJSON Polygon points
  },
  "assignedAreaName": "String",
  "reviewedBy": "ObjectId (Reference to users, nullable)",
  "reviewNotes": "String (nullable)",
  "reviewedAt": "Date"
}
```

### 4.4 `citizen_endorsements` Collection
Tracks peer-to-peer endorsements to transition citizens to `COMMUNITY_VERIFIED_CITIZEN` status.

```json
{
  "_id": "ObjectId",
  "targetCitizenId": "ObjectId (Indexed, Reference to users)",
  "endorsingCitizenId": "ObjectId (Indexed, Reference to users)",
  "endorsedAt": "Date"
}
```

### 4.5 Indexing Strategy
To optimize low-latency operations under heavy system load, the following indices are designated:

| Target Collection | Index Fields | Index Type | Business Justification |
|---|---|---|---|
| `users` | `email` | Unique Single-Field | Low-latency login lookup |
| `users` | `location` | 2DSphere Geospatial | Downstream geo-bounded reporting and area alerts |
| `citizen_profiles` | `userId` | Single-Field Hash | Standard session sub-profile fetch |
| `officer_profiles` | `userId` | Single-Field Hash | Standard session sub-profile fetch |
| `officer_profiles` | `departmentName`, `status` | Compound Index | Admin filter dashboards for pending reviews |
| `citizen_endorsements` | `targetCitizenId`, `endorsingCitizenId` | Unique Compound | Fast endorsement counts & duplicate vote prevention |

---

## 5. Entity Relationships

```
              +-------------------+
              |       USER        |
              +-------------------+
              |  _id [PK]         |
              |  email (U)        |
              |  role             |
              |  location         |
              +---------+---------+
                        |
        +---------------+---------------+
        | (1:1)                         | (1:1)
        v                               v
+-------------------+           +-------------------+
|  CITIZEN_PROFILE  |           |  OFFICER_PROFILE  |
+-------------------+           +-------------------+
|  _id [PK]         |           |  _id [PK]         |
|  userId [FK] (U)  |           |  userId [FK] (U)  |
|  status           |           |  status           |
|  governmentId     |           |  departmentName   |
+---------+---------+           |  assignedArea     |
          |                     +-------------------+
          | (1:N Target)
          |
          v
+------------------------+
|  CITIZEN_ENDORSEMENT   |
+------------------------+
|  _id [PK]              |
|  targetCitizenId [FK]  | <---- (N:1 Endorser)
|  endorsingCitizenId[FK]|
+------------------------+
```

---

## 6. API Contract Design

All endpoints communicate via HTTPS with JSON payload patterns. Standard response wrappers dictate predictability.

### 6.1 Unified Response Layouts
* **Success Response (20x)**:
  ```json
  {
    "success": true,
    "data": {}
  }
  ```
* **Error Response (4xx/5xx)**:
  ```json
  {
    "success": false,
    "error": {
      "code": "STRING_ERROR_CODE",
      "message": "User-friendly description of error context."
    }
  }
  ```

---

### 6.2 Authentication API

#### POST `/api/auth/register/citizen`
Registers a new platform user and creates the secondary Citizen profile directly.

* **Request Headers**: `Content-Type: application/json`
* **Request Schema**:
  ```json
  {
    "email": "user@domain.com",
    "password": "Password123!",
    "latitude": 12.9716,
    "longitude": 77.5946,
    "locationName": "Bengaluru, Karnataka",
    "governmentIdType": "AADHAAR",
    "governmentIdNumber": "123456789012",
    "governmentIdImageUrl": "https://gcs.com/temp-bucket/temp-upload-key.jpg"
  }
  ```
* **Response Schema (201 Created)**:
  ```json
  {
    "success": true,
    "data": {
      "userId": "usr_65f8a2e1",
      "email": "user@domain.com",
      "role": "CITIZEN",
      "profileStatus": "VERIFIED_CITIZEN"
    }
  }
  ```
* **Error Scenarios**:
  * `400 BAD_REQUEST`: Password fails strength parameters; invalid geographic coordinates.
  * `409 CONFLICT`: Account with specified email already exists in the database.

---

### 6.3 Officer Registration API

#### POST `/api/auth/register/officer`
Submit a registration request for Department Officer validation.

* **Request Headers**: `Content-Type: application/json`
* **Request Schema**:
  ```json
  {
    "email": "officer.jones@gov.in",
    "password": "SecureOfficerPass#1",
    "employeeId": "EMP-99812",
    "departmentName": "ROADS",
    "departmentIdCardUrl": "https://gcs.com/temp-bucket/temp-id-key.jpg",
    "assignedArea": {
      "type": "Polygon",
      "coordinates": [
        [[77.5900, 12.9700], [77.6000, 12.9700], [77.6000, 12.9800], [77.5900, 12.9800], [77.5900, 12.9700]]
      ]
    },
    "assignedAreaName": "Ward 12, Central Zone"
  }
  ```
* **Response Schema (202 Accepted)**:
  ```json
  {
    "success": true,
    "data": {
      "userId": "usr_77b21a3f",
      "email": "officer.jones@gov.in",
      "role": "DEPARTMENT_OFFICER",
      "profileStatus": "PENDING_OFFICER_APPROVAL"
    }
  }
  ```
* **Error Scenarios**:
  * `400 INVALID_POLYGON`: Non-closed coordinates or overlapping coordinates.
  * `422 UNPROCESSABLE_ENTITY`: Department selected is not valid under official municipal codes.

---

### 6.4 Community Verification API

#### POST `/api/verification/endorse`
Submit a validation endorsement for a verified citizen to promote them to community-verified status.

* **Request Headers**: `Content-Type: application/json`, `Authorization: Bearer <JWT>`
* **Request Schema**:
  ```json
  {
    "targetCitizenId": "usr_65f8a2e1"
  }
  ```
* **Response Schema (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "targetCitizenId": "usr_65f8a2e1",
      "currentEndorsements": 3,
      "newStatus": "COMMUNITY_VERIFIED_CITIZEN"
    }
  }
  ```
* **Error Scenarios**:
  * `401 UNAUTHORIZED`: Authenticated user is not an active `COMMUNITY_VERIFIED_CITIZEN`.
  * `403 FORBIDDEN`: Self-endorsement attempt or target is already community-verified.
  * `409 DUPLICATE_ENDORSEMENT`: Endorsee has already received validation from this user.

---

### 6.5 Admin Approval API

#### POST `/api/admin/officers/review`
Approve or reject a pending officer application.

* **Request Headers**: `Content-Type: application/json`, `Authorization: Bearer <JWT>`
* **Request Schema**:
  ```json
  {
    "officerUserId": "usr_77b21a3f",
    "action": "APPROVE", // or "REJECT"
    "notes": "Verified against municipal employee roster. Valid credentials."
  }
  ```
* **Response Schema (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "officerUserId": "usr_77b21a3f",
      "status": "ACTIVE_OFFICER",
      "reviewedBy": "usr_0000admin"
    }
  }
  ```
* **Error Scenarios**:
  * `403 FORBIDDEN`: Requester role is not `ADMIN`.
  * `404 NOT_FOUND`: Officer user profile does not exist.
  * `422 INVALID_STATE`: Profile status is not currently `PENDING_OFFICER_APPROVAL`.

---

### 6.6 User Management & Suspension API (ADMIN ONLY)

#### POST `/api/admin/users/suspend`
Suspends a registered user account (Citizen or Officer) to immediately block platform login and system interaction capabilities.

* **Request Headers**: `Content-Type: application/json`, `Authorization: Bearer <JWT>`
* **Request Schema**:
  ```json
  {
    "targetUserId": "usr_77b21a3f"
  }
  ```
* **Response Schema (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "userId": "usr_77b21a3f",
      "status": "SUSPENDED"
    }
  }
  ```
* **Error Scenarios**:
  * `403 FORBIDDEN`: Requester role is not `ADMIN`.
  * `404 NOT_FOUND`: Target user does not exist.

#### POST `/api/admin/users/reinstate`
Reinstates a suspended user account, restoring their original role and operational status.

* **Request Headers**: `Content-Type: application/json`, `Authorization: Bearer <JWT>`
* **Request Schema**:
  ```json
  {
    "targetUserId": "usr_77b21a3f"
  }
  ```
* **Response Schema (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "userId": "usr_77b21a3f",
      "status": "ACTIVE"
    }
  }
  ```
* **Error Scenarios**:
  * `403 FORBIDDEN`: Requester role is not `ADMIN`.
  * `404 NOT_FOUND`: Target user does not exist.

---

## 7. Role-Based Access Control (RBAC) Design

A unified middleware engine parses NextAuth sessions to implement secure, robust route protection and API request boundaries.

### 7.1 Access Permission Matrix

| Operation / Path Scope | GUEST | CITIZEN | COMMUNITY_VERIFIED_CITIZEN | DEPARTMENT_OFFICER | ADMIN |
|---|:---:|:---:|:---:|:---:|:---:|
| **Public Routing** (`/`, `/about`) | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Citizen Portal** (`/citizen/*`) | ❌ | ✅ | ✅ | ❌ | ❌ |
| **Officer Portal** (`/officer/*`) | ❌ | ❌ | ❌ | ✅ | ❌ |
| **Admin Portal** (`/admin/*`) | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Endorsement Submission** | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Officer Approval / Reject** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Direct DB Management / Suspension**| ❌ | ❌ | ❌ | ❌ | ✅ |

### 7.2 Next.js Middleware Validation Design
```typescript
// Conceptual layout illustrating authentication routing guards within next.middleware
export const config = {
  matcher: ['/citizen/:path*', '/officer/:path*', '/admin/:path*', '/api/:path*']
};
```
Middleware verifies incoming tokens via edge-compatible cryptographic steps. If route constraints are breached, immediate redirects occur:
* Redirect unauthorized users visiting `/admin/*` to root landing pages or custom single-page error interfaces.
* Intercept invalid or outdated sessions targeting `/api/*` and return standard structured JSON payload failures containing `401` or `403` credentials status context.

---

## 8. Page Hierarchy Design

```
+---------------------------------------------------------------------------------+
|                                 PAGE HIERARCHY                                  |
+---------------------------------------------------------------------------------+
|                                                                                 |
|  [PUBLIC PAGES]                                                                 |
|   ├── /                           (Landing Page, Features & Metrics Showcase)   |
|   ├── /about                      (Mission, Privacy Policy & SLA Documents)     |
|   ├── /auth                       (Shared Root Sign-In)                         |
|   │    ├── /signin                (Email/Password login with fallback redirect) |
|   │    ├── /register-citizen      (Citizen credential and verification upload)  |
|   │    └── /register-officer      (Officer request, region selector, ID submit) |
|   └── /unauthorized               (Fallback visual boundary for RBAC failures)  |
|                                                                                 |
|  [CITIZEN PORTAL]                                                               |
|   └── /citizen                                                                  |
|        ├── /dashboard             (Issue list, notifications, analytics)        |
|        ├── /report                (Interactive map placement, description, image)|
|        ├── /verify-issues         (Peer-to-peer verification and validation feed)|
|        ├── /profile               (Endorsement tracking, credential status card)|
|        └── /quizzes               (Educational quizzes & scoring metrics)       |
|                                                                                 |
|  [OFFICER PORTAL]                                                               |
|   └── /officer                                                                  |
|        ├── /dashboard             (Assigned cases, map boundaries, SLA indicators)|
|        ├── /tasks                 (Active reports list, detailed action panels)  |
|        │    └── /[issueId]        (Dynamic route for single-case status update) |
|        └── /analytics             (Completion statistics, regional performance)  |
|                                                                                 |
|  [ADMIN PORTAL]                                                                 |
|   └── /admin                                                                    |
|        ├── /dashboard             (Global infrastructure status, SLA health logs) |
|        ├── /approvals             (Review interface for Officer applications)   |
|        ├── /users                 (Search directory, suspend/reinstate controls)|
|        └── /departments           (Manage operational rosters and contact index)|
|                                                                                 |
+---------------------------------------------------------------------------------+
```

---

## 9. Security Considerations

For an enterprise-grade municipal application managing user credentials and geographic parameters, strict visual, data, and access controls are essential.

### 9.1 Data Isolation & Encryption
* **Government ID Protection**: Original ID numbers (such as Aadhaar or Passport values) are encrypted at rest using AES-256-GCM. Unencrypted database indices are strictly prohibited for highly sensitive attributes. Masked values (e.g. `XXXX-XXXX-1234`) are parsed at registration to support safe admin validation layouts.
* **Document Visibility Restrictions**: Government or Employee ID upload files are stored in GCS buckets. Access is granted exclusively via time-bounded **Signed URLs** (TTL < 5 minutes) issued server-side dynamically for authorized administrators. Public buckets are not used.

### 9.2 Rate Limiting
To secure registration endpoints against distributed computational fatigue or credential stuffing:
* **Route Limits**: Limit authentication API endpoints (`/api/auth/*`) to a maximum of **5 registrations or login attempts per 10 minutes** per IP address, backed by dynamic Redis counters.
* **Payload Size Validation**: File size limits of **3MB** are enforced for base64 strings and direct multipart uploads.

### 9.3 Audit Trail Retention
* Critical status migrations (e.g. `PENDING_OFFICER_APPROVAL` -> `ACTIVE_OFFICER` or transition to `SUSPENDED`) are recorded as immutable system transactions containing user identification, timestamp, reviewing administrator details, and structural justification notes.

---

## 10. Future Scalability Considerations

As CommunityComrade expands from a hackathon MVP to a municipal platform processing thousands of requests, scalable system elements must be accounted for:

### 10.1 Decentralized Regional Caching
* Regional mapping metrics and civic helpline directories should utilize caching tiers via **Redis Cloud** with automatic invalidation parameters, keeping average visual load-times well under 100ms.

### 10.2 Geospatial Query Partitioning
* MongoDB 2D-Sphere indices execute queries within localized bounding areas efficiently. As scaling takes place, user location coordinates enable **horizontal database sharding** using a compound shard key of `(role, location)`. This optimizes data isolation within defined municipal zones.

### 10.3 Background Decoupled Job Queues
* The citizen verification transition (`VERIFIED_CITIZEN` to `COMMUNITY_VERIFIED_CITIZEN`) triggers when endorsements reach 3. As concurrency rises, the validation evaluation can be offloaded to an asynchronous microservice. This decouples the transactional database write from immediate response lifecycles, ensuring reliable performance during peak usage.
