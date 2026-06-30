# MASTER SYSTEM ARCHITECTURE DOCUMENT 🏛️🛡️
### CommunityComrade: AI-Powered Civic Engagement & Grievance Management Platform

---

## SECTION 1: SYSTEM OVERVIEW

### 1.1 Project Purpose
**CommunityComrade** is designed to restore the social contract between citizens and municipal authorities. It establishes a transparent, high-accountability digital town square that replaces opaque grievance portals with an AI-validated, peer-endorsed, and gamified municipal collaboration ecosystem.

### 1.2 System Objectives
*   **Operational Automation:** Eliminate manual triaging by leveraging Gemini to categorize, prioritize, and route municipal complaints dynamically.
*   **Preventive Fraud Defenses:** Block visual fraud (commercial stock photos and duplicate files) and private property exploitation using multimodal vision-based audits.
*   **Physical Verification Gating:** Force contractors and field officers to authenticate repair completions via GPS location boundaries and visual landmark alignment.
*   **Community Stewardship:** Empower local ward residents to participate directly in resolution auditing through spatial discussions, peer endorsements, and localized geofenced voting.
*   **Constructive Gamification:** Reward community service while preventing point farming using hard limits, escrow stages, and dynamic civic literacy education.

### 1.3 Core Architectural Principles
1.  **Strict Security Boundaries:** Zero API keys or sensitive credentials exposed to the client-side. The Express server acts as a secure proxy gateway.
2.  **State Machine Integrity:** Enforces deterministic state transitions for issue lifecycles, backed by digital audit timelines.
3.  **Spatial Geofencing:** Utilizes Haversine mathematics and MongoDB spatial operators to restrict comments, coordinate checks, and voting eligibility.
4.  **Resilient AI Fallbacks:** Integrates retry-mechanisms with exponential backoffs and automatic model fallbacks (cycling through `gemini-3.5-flash` to `gemini-3.1-flash-lite`) to guarantee maximum API uptime.

### 1.4 Supported User Roles
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                 USER ROLES                                  │
├──────────────────────┬──────────────────────┬───────────────────────────────┤
│       CITIZEN        │  DEPARTMENT OFFICER  │         ADMINISTRATOR         │
├──────────────────────┼──────────────────────┼───────────────────────────────┤
│ • File geo-pin cases │ • Claim local cases  │ • Review pending citizen KYC  │
│ • Complete quizzes   │ • Post updates       │ • Approve/Reject officer IDs  │
│ • Vote on resolution │ • Record coordinates │ • Configure helpline listings │
│ • Endorse peers      │ • Upload repair proof│ • Audit monthly predictive maps│
└──────────────────────┴──────────────────────┴───────────────────────────────┘
```

---

## SECTION 2: HIGH-LEVEL ARCHITECTURE

CommunityComrade operates on a decoupled full-stack architecture that isolates database collections, processes API communications securely, and coordinates cognitive workloads through Google Gemini.

### 2.1 Technical Context Diagram

```
                       ┌─────────────────────────────────────────┐
                       │              CLIENT LAYER               │
                       │   React 19 + Tailwind + Google Maps     │
                       └───────────────────┬─────────────────────┘
                                           │
                                           │ HTTPS (JWT in Authorization Header)
                                           ▼
                       ┌─────────────────────────────────────────┐
                       │             GATEWAY LAYER               │
                       │    Express API Router (Port 3000)       │
                       └───────────────────┬─────────────────────┘
                                           │
                ┌──────────────────────────┼──────────────────────────┐
                │                          │                          │
                ▼                          ▼                          ▼
   ┌─────────────────────────┐┌─────────────────────────┐┌─────────────────────────┐
   │     COGNITIVE LAYER     ││     DATABASE LAYER      ││      MAPS PLATFORM      │
   │  Google Gemini 3.5 API  ││    MongoDB Document     ││  Google Maps JavaScript │
   │   (Server-Side SDK)     ││  Store (Mongoose ORM)  ││    Heatmap & Geo APIs    │
   └─────────────────────────┘└─────────────────────────┘└─────────────────────────┘
```

### 2.2 System Components
*   **Frontend Client:** A compiled single-page application built on Vite and React 19. It uses `@vis.gl/react-google-maps` for geospatial representations and Recharts/D3 for data analytics.
*   **Backend Application:** A TypeScript Node.js/Express server that acts as the API gateway. It provides secure JWT session handling, hosts files statically via `/uploads`, and enforces role-based endpoint controllers.
*   **Database Engine:** MongoDB, storing structured data models through Mongoose schemas, using `2dsphere` indexes to optimize high-volume location queries.
*   **AI Services:** Powered by Google AI Studio's SDK (`@google/genai`), implementing computer vision, JSON response constraints, and automatic model fallback pipelines.

---

## SECTION 3: FRONTEND ARCHITECTURE

The client UI is designed for extreme speed and responsiveness, utilizing modular components and clean data feeds.

### 3.1 Component Hierarchy Diagram

```
                                      ┌───────────┐
                                      │  App.tsx  │
                                      └─────┬─────┘
                     ┌──────────────────────┼──────────────────────┐
                     ▼                      ▼                      ▼
             ┌───────────────┐      ┌───────────────┐      ┌───────────────┐
             │  LandingPage  │      │   LoginForm   │      │   Register    │
             └───────────────┘      └───────────────┘      └───────┬───────┘
                                                    ┌──────────────┴──────────────┐
                                                    ▼                             ▼
                                            ┌───────────────┐             ┌───────────────┐
                                            │RegCitizen(KYC)│             │  RegOfficer   │
                                            └───────────────┘             └───────────────┘
                                                    │
                                                    ▼
                             ┌──────────────────────┼──────────────────────┐
                             ▼                      ▼                      ▼
                     ┌───────────────┐      ┌───────────────┐      ┌───────────────┐
                     │CitizenDash    │      │  OfficerDash  │      │   AdminDash   │
                     └───────┬───────┘      └───────┬───────┘      └───────┬───────┘
         ┌───────────────────┼───────────┐          │                      │
         ▼                   ▼           ▼          │                      ▼
   ┌───────────┐       ┌───────────┐┌───────────┐   │              ┌───────────────┐
   │IssueReport│       │ GamifyHub ││Discussion │   │              │DeptManagement │
   │ (Geo-Pin) │       │ (Quizzes) ││ (Threads) │   │              └───────────────┘
   └───────────┘       └───────────┘└───────────┘   │
         │                                          ▼
         └───────────────────────────────────►┌───────────┐
                                              │MapHeatmap │
                                              │ (Recharts)│
                                              └───────────┘
```

### 3.2 Key Client Technologies
*   **State Management:** Driven through React hooks (`useState`, `useContext`, `useEffect`) and persisted local tokens for session stability.
*   **Routing System:** Condition-based rendering based on User Session Role payloads decrypted from local JWT headers.
*   **Dynamic Animation Engine:** Staggered list reveals and layout adjustments managed via standard CSS animations and Tailwind transitions.

---

## SECTION 4: BACKEND ARCHITECTURE

The server coordinates multi-tenant API routing, executes database transactions, and manages AI prompts securely on the server-side.

### 4.1 Request Processing Pipeline

```
 [Client API Call] ➔ [Express Global Middleware] ➔ [authenticateToken] ➔ [authorizeRoles]
                                                                                │
                                                                                ▼
 [DB Transaction Completed] ◄── [Controller Business Logic] ◄── [Route Handler Vetted]
```

### 4.2 Modular API Routing Map
*   `/api/auth/*` — User authentication, secure token generation, and multi-profile registrations.
*   `/api/admin/*` — Restricted admin methods: KYC manual review approvals, officer vetting, account suspensions, and helpline adjustments.
*   `/api/issues/*` — Public and ward-specific grievance filing, geofenced commentary, and officer assignments.
*   `/api/gamification/*` — Interactive trivia generation, anti-cheat submissions, level increments, and hall of fame lookups.

---

## SECTION 5: DATABASE ARCHITECTURE

MongoDB stores coordinates using GeoJSON standards to handle spatial indexes seamlessly under load.

### 5.1 ER-Style Relationship Diagram

```
   ┌──────────────────┐               ┌──────────────────┐
   │    User (DB)     │1             1│  CitizenProfile  │
   │ ──────────────── │──────────────►│ ──────────────── │
   │ _id (PK)         │               │ userId (FK)      │
   │ email            │               │ governmentIdNum  │
   │ role             │               └──────────────────┘
   │ status           │               ┌──────────────────┐
   └────────┬─────────┘1             1│  OfficerProfile  │
            │  ──────────────────────►│ ──────────────── │
            │                         │ userId (FK)      │
            │                         │ employeeId       │
            │                         └──────────────────┘
            │                         ┌──────────────────┐
            │1                       *│      Issue       │
            └────────────────────────►│ ──────────────── │
                                      │ reporterId (FK)  │
                                      │ assignedOfficerId│
                                      │ status           │
                                      │ location (Point) │
                                      └────────┬─────────┘
                                               │1
                                               │
                                               ▼*
                                      ┌──────────────────┐
                                      │   IssueMessage   │
                                      │ ──────────────── │
                                      │ issueId (FK)     │
                                      │ userId (FK)      │
                                      │ message          │
                                      └──────────────────┘
```

### 5.2 Schema Glossary

#### 5.2.1 `UserModel` (Collection: `users`)
Holds common identity credentials, location data, and global points tallies.
*   `_id` (ObjectId): Primary Key.
*   `email` (String, unique, index): Email identifier.
*   `passwordHash` (String): Securely encrypted password representation.
*   `role` (String): Enforces `CITIZEN`, `DEPARTMENT_OFFICER`, or `ADMIN`.
*   `status` (String): Current registration/suspension state.
*   `registeredWard` / `registeredDistrict` (String): Administrative boundaries used for spatial grouping and validations.
*   `latitude` / `longitude` (Number, index): Captured center-point.

#### 5.2.2 `IssueModel` (Collection: `issues`)
Contains the comprehensive telemetry of reported grievances, AI analysis outputs, SLA limits, and resolution validation results.
*   `issueNumber` (String, unique, index): Formatted alphanumeric identifier (e.g., `CC-YYYY-XXXXXX`).
*   `reporterId` (ObjectId, ref User): Reference to the creator.
*   `location` (GeoJSON Point, index: `2dsphere`): Multi-axis spatial array `[longitude, latitude]`.
*   `status` (String, index): Enforces the municipal lifecycle.
*   `isPublicProperty` (Boolean): Vetted public flag.
*   `aiAnalysisStatus` (String): AI analysis lifecycle state: `PENDING`, `COMPLETED`, `FAILED`, or `MANUAL_REVIEW`.
*   `slaTargetHours` / `slaBreached` (Number / Boolean): Tracks municipal SLA constraints.

#### 5.2.3 `GamificationProfileModel` (Collection: `gamificationprofiles`)
Tracks interactive point economies, daily quiz usage boundaries, and earned achievements.
*   `userId` (ObjectId, ref User, unique, index): Reference to target citizen.
*   `xp` / `communityImpactScore` (Number): Global profile score tracking.
*   `quizUsageLimit` (Sub-document): Employs `lastAttemptDate` (String) and `attemptsCount` (Number) to implement strict 24-hour verification.

---

## SECTION 6: AUTHENTICATION & AUTHORIZATION

Access control uses standard JSON Web Tokens (JWT) signed using a server-side secret key with a 24-hour expiration.

### 6.1 Authentication Workflow Diagram

```
 [Register/Login Credentials] ➔ [Validate Hash / Unique Constraints] ➔ [Generate Signed JWT]
                                                                                │
                                                                                ▼
 [Allow Protected Route] ◄── [role Vetted via authorizeRoles] ◄── [Header: Bearer <Token>]
```

### 6.2 Authentication Details
1.  **Strict Sign-Up Validation:** Validates strong passwords (capital letter, digit, minimum 8 characters) on registration.
2.  **Aadhaar/Voter ID Document Hold:** Citizens are initially registered as `PENDING_ADMIN_REVIEW`. Only when an administrator validates the uploaded document is the citizen status promoted to `VERIFIED_CITIZEN`.
3.  **Role Verification Vetting:** Sub-actions (such as creating helpline listings or approving/rejecting contractors) are guarded by specific route authorization checks.
4.  **Admin User Registry (Suspension & Re-instatement):** Administrators have full administrative controls in their User Registry dashboard to suspend or reinstate any citizen or officer, instantly disabling their login and system interaction capabilities or restoring them to original functionality.

---

## SECTION 7: AI ARCHITECTURE

Cognitive processing logic resides entirely inside server-side controllers, leveraging Google AI Studio's `@google/genai` TypeScript library.

### 7.1 Resilient API Fallback Controller Diagram

```
                    ┌───────────────────────────────┐
                    │  Initiate AI Audit Request    │
                    └───────────────┬───────────────┘
                                    │
                                    ▼
                     (Try Model: gemini-3.5-flash)
                                    │
        ┌───────────────────────────┴───────────────────────────┐
        ▼ Successful?                                           ▼ Failed (Timeout/Quota)?
 ┌──────────────┐                                        ┌───────────────────────────────┐
 │ Process JSON │                                        │ Apply Exponential Backoff     │
 │  Response    │                                        └──────────────┬────────────────┘
 └──────────────┘                                                       │
                                                                        ▼
                                                         (Fallback: gemini-3.1-flash-lite)
                                                                        │
                                                ┌───────────────────────┴───────────────────────┐
                                                ▼ Successful?                                   ▼ Failed?
                                         ┌──────────────┐                                ┌──────────────┐
                                         │ Process JSON │                                │ Throw Server │
                                         │  Response    │                                │  Exception   │
                                         └──────────────┘                                └──────────────┘
```

### 7.2 Implemented AI Engines

#### 7.2.1 Issue Analysis Engine (Public vs Private Vetting)
*   **Prompt Architecture:** Structured instructions directing Gemini to assess both the descriptive text and physical photo attachments. It enforces strict public property boundaries, automatically identifying private household spaces (bathrooms, domestic kitchens, backyards).
*   **Veto Decision Action:** If the image features domestic home tiles, private indoor piping, or household fixtures, Gemini marks the flag `isPublicProperty: false` and sets `aiAnalysisStatus: "MANUAL_REVIEW"`.
*   **Business Outcome:** Flags complaints on private properties to the Admin Manual Review Queue, protecting taxpayer budgets from funding private home repairs while keeping administrative oversight intact.

#### 7.2.2 Double-Gated Resolution Auditing Engine
*   **Prompt Architecture:** Compares the citizen's initial "Before" photo with the officer's submitted "After" photo.
*   **Landmark Vetting:** Analyzes static structural objects in both photos (building profiles, utility posts, road signs, tree shapes) to confirm they were taken at the identical geographical spot.
*   **Watermark Audit:** Performs pixel scans looking for online stock photo watermarks (Alamy, Shutterstock, Getty Images). If a watermark is detected, it flags the ticket as fraudulent.

#### 7.2.3 Semantic Geo-Duplication Vetting
*   **Prompt Architecture:** Compares a newly submitted issue against open neighboring issues within 200 meters.
*   **Duplicate Filtering:** Compares both description texts and photos. If a match is detected, it returns `duplicateDetected: true` and the corresponding existing issue ID, prompting the frontend to redirect the user to upvote the existing issue.

### 7.3 Submit Complaint Workflow Performance Optimizations
To ensure rapid user feedback and highly responsive submission times under heavy civic load, the following high-performance architectural optimizations were implemented in the submission flow:

1.  **Multi-Model Parallel Execution Pipelines:**
    *   Instead of executing tasks sequentially, the backend runs the main issue analysis (`analyzeIssue`) and the semantic geo-duplication check (`compareWithCandidates`) concurrently in parallel threads using `Promise.all`.
    *   This halves the aggregate waiting time, ensuring both cognitive tasks complete in a single round-trip.

2.  **Intellectual Model Tiering & Cost-Performance Routing:**
    *   **Core Issue Analysis:** Handled by `gemini-3.5-flash` to leverage its high-fidelity reasoning for private vs. public property vetting.
    *   **Semantic Duplicate Verification:** Routed primarily to the ultra-fast and cost-effective `gemini-3.1-flash-lite` model, falling back automatically to `gemini-3.5-flash` only if the primary quota is reached. This optimizes token usage, minimizes API latency, and preserves higher-tier quota.

3.  **Parallel Asset & Media Inline Extraction:**
    *   Replaced serial sequential loading of image/video attachments with fully asynchronous, non-blocking operations.
    *   Inline base64 media extraction routines are executed concurrently using `Promise.all` during duplicate prompt construction, removing sequential latency bottlenecks during file conversions.

4.  **Lightweight Context Gating (Candidate-Set Optimization):**
    *   Filters neighboring spatial search coordinates to retrieve only the top 5 most recent and relevant candidate issues within the 200-meter range.
    *   This caps the context window of the prompt, ensuring the model parses lightweight payloads and responds with minimal latency.

---

## SECTION 8: GOOGLE MAPS ARCHITECTURE

Spatial accuracy is central to verifying grievances, mapping hotspots, and geofencing community boards.

### 8.1 Coordinates Capture & Geofencing Pipeline

```
 [Citizen Drags Map Marker] ➔ [Capture exact Lat/Lng] ➔ [Identify Ward Administrative Boundary]
                                                                        │
                                                                        ▼
 [Geofenced Comment Allowed] ◄── [Validate Proximity Delta < 2km] ◄── [Filing Pin Registered]
```

### 8.2 Location Services & Haversine Checking
*   **Officer Resolution Proximity Gate:** During repair completion, the officer's live location is captured. The server runs a mathematical Haversine check:
    $$\Delta d = 2R \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta\lambda}{2}\right)}\right)$$
    If the computed physical distance delta exceeds **50 meters**, the submission is rejected.
*   **Geofenced Discussion Boards:** Prevents non-local citizens from posting comments on threads unless they are registered within a **2km radius** of the issue coordinates.

---

## SECTION 9: ANALYTICS ARCHITECTURE

Data aggregation pipelines run continuously to translate spatial coordinates and historical reports into actionable management dashboards.

### 9.1 Data Aggregation & Analysis Flow

```
 [Mongoose Coordinates Store] ➔ [Filter Active Ward/District] ➔ [Compute density hotspot maps]
                                                                        │
                                                                        ▼
 [Render Admin Alert Briefs] ◄── [Gemini Compiles Monthly Trends] ◄────┘
```

### 9.2 Analytics Modules
*   **Dynamic Spatial Heatmaps:** Aggregates latitude/longitude data points into visible, clustered density heatmaps on the Google Maps canvas to locate areas with high grievance frequencies.
*   **Predictive AI Ward Forecasts:** Gemini processes monthly grievance statistics, categorizing departments by resolved ratios and generating predictions for potential infrastructure failures.

---

## SECTION 10: GAMIFICATION ARCHITECTURE

The gamification architecture is designed to reward real citizen stewardship while preventing point manipulation.

### 10.1 Point Allocation and Verification Workflow

```
 [Citizen Files Complaint] ➔ [Points Placed in Escrow] ➔ [Admin Approves & Assigns Case]
                                                                        │
                                                                        ▼
 [Leaderboard Ranks Updated] ◄── [Level Incremented & Badge Unlocked] ◄── [XP / CIS Released]
```

### 10.2 Scoring Algorithms
*   **Escrow Hold System:** Points earned from reporting a grievance are held in escrow. They are only credited to the user's profile once an administrator approves and assigns the issue.
*   **Reputation Level Ranks:** Levels are determined using a logarithmic scale:
    $$\text{Level} = \lfloor 1 + \sqrt{\frac{\text{XP}}{100}} \rfloor$$
*   **Anti-Cheat Quiz Engine:** Users are restricted to **5 total quiz attempts daily** and **1 attempt per category** within a 24-hour window, completely eliminating rapid point-farming loops. Additionally, administrators can create new quiz topics, activate/de-activate the quiz section, and regenerate quiz questions dynamically using the AI model.

---

## SECTION 11: SECURITY ARCHITECTURE

Security checks are embedded across every operational layer.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SECURITY DEFENSE LAYERS                           │
├───────────────────────┬──────────────────────────┬──────────────────────────┤
│    IDENTITY LAYER     │      SPATIAL LAYER       │      COGNITIVE LAYER     │
├───────────────────────┼──────────────────────────┼──────────────────────────┤
│ • JWT Session Tokens  │ • 50m Officer GPS check  │ • Private Property Veto  │
│ • Role-Based Gateways │ • 2km Comment geofence   │ • Before/After Landmark  │
│ • Aadhaar/ID KYC Gate │ • 200m Duplicate check   │ • Stock Photo Watermark  │
└───────────────────────┴──────────────────────────┴──────────────────────────┘
```

---

## SECTION 12: DATA FLOW DIAGRAMS

### 12.1 Citizen Issue Lifecycle
```
 [Verified Citizen] ➔ Reports Case ➔ [Gemini Vets Location & Duplicates] ➔ Admin Manual Queue (if private)
                                                                                  │ (or)
                                                                                  ▼
                                                                           Status: OPEN
```

### 12.2 Issue Resolution Lifecycle
```
 [Officer Claims Case] ➔ Repair Finished ➔ [GPS Check < 50m] ➔ [Gemini Image Match Audit] ➔ Approve
                                                                                               │
                                                                                               ▼
                                                                                   Status: PENDING_VERIFICATION
```

### 12.3 Community Verification Lifecycle
```
 [Local Geofenced Voters] ➔ Caste Vote (+1 Approve / -1 Reject) ➔ Net Score Reach +3? ➔ Close Case
                                                                       │ (or)
                                                                       ▼
                                                                 Reach -3? ➔ Reopen Case
```

### 12.4 Quiz Lifecycle
```
 [Select Trivia Topic] ➔ [Verify Daily Category Limits] ➔ Start Timer ➔ Submit Answers ➔ Log Profile XP
```

### 12.5 Community Hero Lifecycle
```
 [End of Month] ➔ [Admin Aggregates Scores] ➔ Write Citations ➔ Unlock Hero Badges ➔ Hall of Fame Log
```

---

## SECTION 13: SCALABILITY CONSIDERATIONS

*   **Geospatial Scale:** MongoDB `2dsphere` indexes allow millions of geofenced query lookups with minimal latency.
*   **AI Rate Optimization:** The Fallback Controller gracefully manages API traffic bursts, scaling back to lightweight models when primary quotas are met.
*   **Database Isolation:** Using distinct Mongoose references prevents database locking during high-volume read-write cycles.

---

## SECTION 14: DEPLOYMENT ARCHITECTURE

The application runs on high-availability container infrastructure, ensuring resource separation and high uptime.

### 14.1 Production Deployment Scheme

```
                        ┌───────────────────────────────┐
                        │     INTERNET / INGRESS GATE   │
                        └───────────────┬───────────────┘
                                        │
                                        ▼ (Port 3000)
                        ┌───────────────────────────────┐
                        │    STANDALONE EXPRESS NODE    │
                        │     (Runs: dist/server.cjs)   │
                        └───────┬───────────────┬───────┘
                                │               │
          Static Assets (/dist) │               │ API Transactions (JSON)
                                ▼               ▼
                        ┌───────────────┐┌───────────────┐
                        │ STATIC CLIENT ││ MONGODB ATLAS │
                        │  (Vite Build) ││ (Geo-Clustered│
                        └───────────────┘└───────────────┘
```

---

## SECTION 15: ARCHITECTURAL DECISIONS

1.  **MongoDB:** Selected for native GeoJSON operators and flexible schema attributes, perfect for mapping dynamic infrastructure metrics.
2.  **Google Gemini AI:** Used as the cognitive reasoning engine for vision analysis, duplicate checks, and dynamic quiz generation (with administrative controls to create quiz topics, activate/de-activate sections, and regenerate questions using the model).
3.  **Google Maps Platform:** Used for geospatial tracking, interactive coordinate pickers, and high-performance hotspot heatmaps.
4.  **Community-Led Auditing:** Combines automated AI checks with human verification to prevent fraud and ensure accountability.

---

## SECTION 16: CONCLUSION

CommunityComrade's master architecture provides a resilient, secure, and highly scalable framework for civic collaboration. By combining spatial calculations, role-based controls, and Google's Gemini models, it transforms municipal governance from a slow, opaque process into an engaging, high-trust community partnership.
