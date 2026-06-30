# CommunityComrade 🛡️🏛️
### AI-Powered Civic Engagement & Grievance Management Platform

[![TypeScript](https://img.shields.io/badge/Language-TypeScript-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/Frontend-React%2019-61dafb.svg)](https://react.dev/)
[![Express](https://img.shields.io/badge/Backend-Express%204-lightgrey.svg)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB%20%2F%20Mongoose-green.svg)](https://www.mongodb.com/)
[![Gemini](https://img.shields.io/badge/AI%20Engine-Google%20Gemini-orange.svg)](https://ai.google.dev/)
[![Google Maps](https://img.shields.io/badge/Maps-Google%20Maps%20Platform-red.svg)](https://developers.google.com/maps)

> **"Restoring the Social Contract"**  
> CommunityComrade is an innovative, full-stack, AI-validated civic grievance management and community collaboration platform. It bridges the trust gap between citizens, municipal administrators, and government officers by transforming passive complaint filing into a high-accountability, secure, and gamified ecosystem.

---

## 📖 Table of Contents
1. [Problem Statement](#problem-statement)
2. [Solution Overview](#solution-overview)
3. [Key Features](#key-features)
4. [System Workflows](#system-workflows)
5. [Technology Stack](#technology-stack)
6. [Google Technologies Used](#google-technologies-used)
7. [Architecture Overview](#architecture-overview)
8. [Project Structure](#project-structure)
9. [User Roles & Permissions](#user-roles--permissions)
10. [Test Data & Credentials](#test-data--credentials)
11. [Security & Anti-Fraud Features](#security--anti-fraud-features)
12. [Installation & Setup](#installation--setup)
13. [Environment Variables](#environment-variables)
14. [Screenshots Placeholder](#screenshots-placeholder)
15. [Future Roadmap](#future-roadmap)
16. [Impact & Business Value](#impact--business-value)
17. [License](#license)
18. [Acknowledgements](#acknowledgements)

---

## 🚨 Problem Statement

Modern municipal grievance systems suffer from critical, systemic deficiencies that alienate citizens and overwhelm government authorities:

1. **Administrative Bottlenecks:** Manual triaging of thousands of municipal issues leads to misclassified reports, incorrect department routing, and severe SLA backlogs.
2. **Point Farming & Spam:** Gamified portals are highly vulnerable to users reporting fake, non-existent, or private household complaints (e.g., indoor kitchen sinks) to "farm" achievements, badges, and ranking positions.
3. **Ghost Resolutions (Contractor Fraud):** Field contractors or government officers sometimes close tickets as "resolved" without carrying out actual on-site work, uploading stock photos or unverified images.
4. **Duplicate Report Inundation:** A single pothole or garbage heap triggers dozens of redundant independent reports, flooding the system and diluting local discussion and voting power.
5. **Lack of Local Relevance:** Public forums suffer from "digital brigading" where non-local internet users derail discussions, while genuine residents are overwhelmed by noise outside their neighborhood ward.

---

## 💡 Solution Overview

CommunityComrade addresses these inefficiencies by introducing **automated operational triaging**, **double-gated visual audit validation**, and **Sybil-resistant peer accountability**.

```
[Citizen Registration] ──> [Admin KYC Verification] ──> [Tier 1: Verified Citizen]
                                                               │ (Needs 3 Community Endorsements)
                                                               ▼
[SLA Tracking & Dashboards] <── [Department Routed] <── [Tier 2: Community Verified Citizen]
             │                                                 │ (Reports Issue + Geo-Pin)
             ▼                                                 ▼
[Officer Resolves Issue] ──> [Double-Gated AI Audit] ──> [Tier 2 Community Vote] ──> [SLA Cleared]
```

The system ensures a high-trust lifecycle:
1. **KYC Registration:** Users register under official IDs. Administrators review documents to grant **Verified Citizen** status.
2. **Community Verification:** Verified Citizens obtain **Community Verified** status via endorsements from 3 established community members in their registered ward.
3. **Filing & Triaging:** Citizens report issues with physical images and location pins. Gemini AI analyzes, categorizes, prioritizes, and routes complaints, vetting against private property boundaries and checking for duplicates within 200m.
4. **Action & Audit:** Assigned officers resolve the issue. Closure is double-gated: requiring a <50-meter GPS proximity check and a Gemini visual alignment audit ("Before" vs "After" landmark analysis).
5. **Democracy in Action:** Issues move to community verification where geofenced citizens vote (+3 approval net score) to formally close or reopen the ticket.

---

## ✨ Key Features

### Feature 1: Two-Tier Identity Verification & RBAC
*   **Purpose:** Establishes a Sybil-resistant, high-trust foundation for civic participation.
*   **How it Works:** 
    *   **Tier 1 (Verified Citizen):** New citizens register as "Pending" by choosing from official IDs (Aadhaar, Voter ID, Driving License, Passport) and uploading a document scan. Admins manually verify documentation.
    *   **Tier 2 (Community Verified Citizen):** To unlock core community actions (voting, endorsing, comments), citizens must secure **3 endorsements** from existing Community Verified Citizens in their identical district and ward.
    *   **Admin User Management (User Registry):** Administrators retain full power to view the entire user list, instantly suspend malicious or fraudulent citizens/officers, or reinstate suspended profiles directly through their administrative User Registry dashboard.
*   **Benefits:** Completely eliminates automated bot creation, duplicate spam profiles, and provides an immediate moderator control switch to suspend malicious actors.

### Feature 2: Geofenced Issue Reporting & Location Validation
*   **Purpose:** Ensures high-precision spatial logging of municipal issues.
*   **How it Works:** Integrates the Google Maps API with an interactive coordinates picker. The frontend captures exact latitude/longitude coordinates and fetches corresponding address data.
*   **Benefits:** Prevents complaints filed outside valid municipality boundaries and routes reports to the exact local administrative ward.

### Feature 3: Gemini AI Issue Analysis Engine
*   **Purpose:** Offloads administrative overhead by automating issue triaging.
*   **How it Works:** Gemini evaluates the title, description, and visual upload:
    *   **Auto-Classification:** Maps inputs to categories (`POTHOLE`, `GARBAGE`, `STREETLIGHT`, `WATER_LEAKAGE`, etc.) and sets priority (`LOW` to `CRITICAL`).
    *   **Private Property Vetting:** Gemini's computer vision detects if the image contains indoor private fixtures (e.g., household bathroom tiles, domestic faucets). If detected, it flags the issue as "Private Property" and routes it to the Admin's Manual Review Queue instead of direct rejection, protecting municipal resources while maintaining administrative oversight.
    *   **Semantic Duplicate Check:** Queries MongoDB for open tickets within 200m, passing their text and images to Gemini. If a duplicate is found, the user is redirected to upvote the existing ticket.
*   **Benefits:** Saves hundreds of man-hours of manual sorting and protects government budgets from private repairs.

### Feature 4: Government Lifecycle State Machine
*   **Purpose:** Maintains structural accountability for service delivery.
*   **How it Works:** Enforces strict state transitions:  
    `OPEN` ➔ `ASSIGNED` ➔ `ACCEPTED` ➔ `IN_PROGRESS` ➔ `RESOLUTION_PENDING_VERIFICATION` ➔ `COMMUNITY_VERIFIED` ➔ `CLOSED`.  
    Features countdown timers mapped to severity SLAs, automatic breach warnings, and official communication logs.
*   **Benefits:** Provides real-time tracking of civic contractor performance.

### Feature 5: Double-Gated Resolution Auditing & Community Voting
*   **Purpose:** Eliminates fraudulent paper-resolutions.
*   **How it Works:**
    *   **Gate 1 (Spatial Audit):** The officer's mobile coordinates must be within 50 meters of the original issue location during submission.
    *   **Gate 2 (AI Visual Audit):** Gemini's multimodal vision evaluates the officer's "After" photo against the "Before" photo. It analyzes static landmarks (building shapes, power lines, trees) to confirm identical location. It also performs pixel checks for commercial watermarks to prevent internet stock photo fraud.
    *   **Gate 3 (Community Vote):** On passing AI audit, local citizens within a 2km radius vote on the resolution. Achieving a net **+3 approval** score moves the ticket to `COMMUNITY_VERIFIED`; a net **-3 rejections** score reopens the ticket.
*   **Benefits:** Guarantees work was physically performed at the correct site before releasing funds.

### Feature 6: Spatial Heatmaps & Predictive Admin Analytics
*   **Purpose:** Empowers administrators with visual hotspot trends.
*   **How it Works:** Employs Google Maps heatmaps displaying grievance density dynamically. Gemini compiles historical issue frequencies to generate predictive hotspot alerts and department performance reviews.
*   **Benefits:** Promotes a transition from reactive fixing to proactive, data-driven municipal planning.

### Feature 7: Dual-Point Economy & Anti-Cheat Gamification
*   **Purpose:** Motivates civic action without inviting point manipulation.
*   **How it Works:** Users earn **Experience Points (XP)** for profile levels and **Community Impact Score (CIS)** for direct actions.
    *   **Escrow Hold:** Points for reporting an issue are staged in escrow and only credited when an admin validates and assigns the ticket.
    *   **Civic Literacy Quizzes:** Gemini dynamically generates interactive 5-question quizzes. To block point farming, users are restricted to **5 total attempts daily** and **1 attempt per category** within a 24-hour window. Additionally, administrators can create new quiz topics, activate/de-activate the quiz section, and regenerate quiz questions dynamically using the AI model.
    *   **Community Hero:** Tracks global and ward-specific leaderboards, saving monthly winners into a Hall of Fame.
*   **Benefits:** Channels healthy competition while completely breaking point-farming loops.

### Feature 8: Geofenced Collaborative Discussions
*   **Purpose:** Prevents forum hijacking, focuses on local resolution, and enforces administrative moderation standards.
*   **How it Works:** Limits thread commentary to verified citizens registered within a 2km geofence of the specific issue. Additionally, administrators retain absolute moderation authority to view, monitor, and instantly delete any inappropriate comments or offensive posts directly from the discussion panel.
*   **Benefits:** Suppresses digital brigading, maintains online safety, and keeps local conversations constructive.

### Feature 9: Department Helpline Directory
*   **Purpose:** Provides instant access to official municipal contacts.
*   **How it Works:** Houses direct routing numbers and contact emails mapped directly to municipal utilities (Water, Power, Roads, Sanitation).
*   **Benefits:** Connects citizens directly with emergency response crews.

---

## 📊 System Workflows

### 1. Two-Tier Citizen Verification & Endorsement
```
[ Citizen Registers ] ➔ Uploads Aadhaar/Voter ID & Selfie
                             │
                             ▼
               [ Admin Reviews KYC Documents ]
                             │
            Approved? ───────┴─────── No ➔ Status: REJECTED
              │
              ▼
    Status: VERIFIED_CITIZEN (Tier 1)
              │
              ▼
   Wants to vote, comment, or endorse?
              │
              ▼
[ Gathers 3 Endorsements from nearby Community Verified Citizens ]
              │
              ▼
Status: COMMUNITY_VERIFIED_CITIZEN (Tier 2) [UNLOCKED]
```

### 2. Issue Lifecycle State Machine
```
   [ Issue Filed ] ➔ AI Category/Priority Routing ➔ Status: OPEN
                                                       │
                                                       ▼
                                               Status: ASSIGNED
                                                       │
                                                       ▼
                                               Status: ACCEPTED
                                                       │
                                                       ▼
                                             Status: IN_PROGRESS
                                                       │
                                                       ▼
                                        [ Officer Uploads "After" Photo ]
                                                       │
                                                       ▼
                                         [ Double-Gated AI Verification ]
                                            - GPS < 50m check
                                            - Landmark analysis
                                            - Watermark fraud check
                                                       │
                                                       ▼
                                    Status: RESOLUTION_PENDING_VERIFICATION
                                                       │
                       ┌───────────────────────────────┴───────────────────────────────┐
                       ▼                                                               ▼
             [ Net +3 Citizen Approvals ]                                    [ Net -3 Citizen Rejections ]
                       │                                                               │
                       ▼                                                               ▼
         Status: COMMUNITY_VERIFIED ➔ CLOSED                                   Status: REOPENED
```

---

## 🛠️ Technology Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | React 19, Vite, Tailwind CSS, Motion | Modern single-page application, smooth animations, fluid layout |
| **Backend** | Node.js, Express, TSX, esbuild | Type-safe, modular API server compiled into standalone `dist/server.cjs` |
| **Database** | MongoDB / Mongoose | Scalable document store with `2dsphere` geo-spatial indexes |
| **Authentication** | JWT, BcryptJS | Secure session handling and hashed password protection |
| **Maps Engine** | Google Maps Platform, `@vis.gl/react-google-maps` | Spatial coordinate pickers, territorial heatmaps, geofencing |
| **Data Viz** | Recharts, D3 | Dynamic dashboard reporting, SLA timelines, and ward charts |
| **AI Engine** | Google Gemini (via `@google/genai` SDK) | Categorization, visual fraud filter, landmark auditor, quiz generator |

---

## 🌐 Google Technologies Used

### 1. Google Gemini AI Models
*   **Purpose:** Cognitive layer driving automation, auditing, and content creation.
*   **Implementation:** Utilizes the `@google/genai` SDK hosted strictly on the Express backend (preventing API key exposure).
    *   **`gemini-3.5-flash`:** Used for primary issue analysis, private property computer vision vetting, stock photo checks, and landmark alignment audits.
    *   **`gemini-3.1-flash-lite` (Fallback):** Programmatic fallback controller that catches connection timeouts or quota errors and automatically retries with a lightweight model using exponential backoff.
    *   **Structured Outputs (`responseSchema`):** Enforces strict JSON schemas for predictable and clean integration into Express route handlers.
*   **Business Value:** Lowers municipal administrative overhead, checks duplicate tickets, and eradicates contractor payment fraud.

### 2. Google Maps Platform
*   **Purpose:** Spatial context engine for coordinate picking, spatial query boundaries, and visual hotspot aggregation.
*   **Implementation:** Employs `@vis.gl/react-google-maps` on the client side.
    *   **Marker Pins:** Allows dragging pins to extract high-accuracy coordinates.
    *   **Geofencing:** Backend computes Haversine formulas using the captured coordinates to restrict citizen voting, peer verification, and comments.
    *   **Heatmaps:** Renders high-performance, dynamic heatmaps indicating geographic complaint concentrations.
*   **Business Value:** Pins issues to real coordinates and establishes clear territorial boundaries for municipal services.

---

## 🏗️ Architecture Overview

```
                      +---------------------------------------+
                      |             CLIENT LAYER              |
                      |  React 19 + Tailwind + Google Maps    |
                      +-------------------+-------------------+
                                          |
                                          | HTTPS JSON API (JWT Auth)
                                          v
                      +---------------------------------------+
                      |             BACKEND LAYER             |
                      |  Express Server (Binds to Port 3000)  |
                      +-------------------+---------------+---+
                                          |               |
                                          |               | server-side API calls
       Mongoose Schemas / Geo Queries     |               v
                                          |      +---------------------------------+
                                          |      |        GOOGLE AI SERVICES       |
                                          |      |  Gemini 3.5 API (GenAI SDK)     |
                                          v      |  Fallback Controller            |
                      +-------------------+---+  +---------------------------------+
                      |    DATABASE LAYER     |
                      |  MongoDB Document Store|
                      +-----------------------+
```

---

## 📂 Project Structure

```
communitycomrade/
├── docs/                                  # Project documentation
│   ├── hackathon-submission.md            # Master technical specification
│   └── hackathon-executive-summary.md     # Condensed judge's brief (3 pages)
├── server.ts                              # Core Express server entry point (API router, Vite middleware)
├── src/
│   ├── App.tsx                            # Main frontend single-page layout & client routing
│   ├── main.tsx                           # React entry point
│   ├── index.css                          # Global CSS with Tailwind v4 imports
│   ├── types.ts                           # Global TypeScript types, interfaces, and enums
│   ├── components/                        # Modular frontend interface components
│   │   ├── LandingPage.tsx                # Welcome page & feature summaries
│   │   ├── LoginForm.tsx                  # Secure user authentication interface
│   │   ├── RegisterCitizen.tsx            # Multi-document KYC citizen register
│   │   ├── RegisterOfficer.tsx            # Department officer credentials register
│   │   ├── CitizenDashboard.tsx           # Geofenced reporting, quiz hubs, & profile tracking
│   │   ├── OfficerDashboard.tsx           # Officer task workflows and geofenced closures
│   │   ├── AdminDashboard.tsx             # Document approvals, statistics, & AI monthly alerts
│   │   ├── AdminDepartmentManagementPage.tsx# Department configuration and helpline setup
│   │   ├── DepartmentDirectoryPage.tsx    # Municipal helper directory
│   │   ├── analytics/                     # Visual charts and map hotspot modules
│   │   ├── gamification/                  # Quiz screens, leaderboards, & Hall of Fame
│   │   └── issues/                        # Reporting form, issue cards, & comment threads
│   ├── db/                                # Database engine
│   │   ├── db.ts                          # Database connection and central query controller
│   │   ├── models.ts                      # Mongoose schema declarations (Users, Issues, Quizzes)
│   │   └── local_db.json                  # Hydrated mock-data backup
│   ├── services/                          # Core business logic handlers
│   │   ├── gamification.ts                # Score calculators and title unlock definitions
│   │   ├── gamificationRouter.ts          # Express quiz endpoints & verification rules
│   │   └── ai/                            # Server-side Gemini connectors
│   │       ├── gemini.ts                  # Gemini client setup & resilient model fallback
│   │       ├── analysis.ts                # Categorization & Private Property vision audit
│   │       ├── duplicates.ts              # Geo-spatial semantic duplication checker
│   │       └── insights.ts                # Monthly hotspot predictor and admin report generator
│   └── utils/
│       └── auth.ts                        # Client storage helpers for session validation
├── package.json                           # Dependency configuration and build commands
└── vite.config.ts                         # Custom Vite configurations
```

---

## 👥 User Roles & Permissions

| Role | Status | Key Permissions | Responsibilities |
| :--- | :--- | :--- | :--- |
| **Citizen** | `PENDING_VERIFICATION` | View public issues, access help directory. | Await manual admin document review. |
| **Citizen** | `VERIFIED_CITIZEN` | File geofenced complaints, earn XP, run quizzes. | Participate as an active reporter. |
| **Citizen** | `COMMUNITY_VERIFIED` | Comment, endorse peers, vote on resolution closure. | Act as a certified local ward custodian. |
| **Officer** | `ACTIVE_OFFICER` | Update assignment status, submit visual proof. | Perform physical repairs, upload on-site "After" proof. |
| **Admin** | `ACTIVE_ADMIN` | Approve KYC, adjust helplines, review insights. | Provide system oversight and department routing. |

---

## 🧪 Test Data & Credentials

Below are the pre-registered demo accounts populated with mock history, contributions, and ward mappings to let you evaluate all application states instantly:

### Citizens (Tier 1 & Tier 2)
1. **Username:** `testuserbang1@gmail.com` | **Password:** `Testuserbang1`
2. **Username:** `testuserbang2@gmail.com` | **Password:** `Testuserbang2`
3. **Username:** `testuserbang3@gmail.com` | **Password:** `TestUserBang3`
4. **Username:** `testuserbang4@gmail.com` | **Password:** `TestUserBang4`
5. **Username:** `testuserbang5@gmail.com` | **Password:** `TestUserBang5`

### Department Officers
1. **Username:** `test_road_off_bang@gov.in` | **Password:** `TestRoadBang1` (Roads Department)
2. **Username:** `test_elec_off_bang@gov.in` | **Password:** `TestElecBang1` (Electricity Department)
3. **Username:** `test_sani_off_bang@gov.in` | **Password:** `TestSaniBang1` (Sanitation Department)

### Administrator
* **Admin Login Details:** Available under the login page as pre-fill options for seamless, one-click administrative evaluation.

---

## 🔒 Security & Anti-Fraud Features

1.  **Aadhaar/Voter ID KYC Gates:** Citizens must select their document type and upload a physical file scan, which is evaluated during admin review.
2.  **Visual Private Property Vetting:** Gemini inspects incoming photos and automatically flags indoor reports, routing them to the Admin's Manual Review Queue to ensure public funds are not used on private repairs.
3.  **GPS Geofence Audits:** Enforces an automated Haversine check ensuring officers are standing within **50 meters** of the issue coordinates before uploading "After" repairs.
4.  **Before/After Landmark Auditor:** Gemini evaluates structural backdrops in both images to verify work is done at the identical physical spot.
5.  **Stock-Photo Pixel Audit:** Gemini analyzes the officer's image to identify commercial watermarks, throwing a red flag to the admin on detection.
6.  **Quiz Anti-Cheat Engine:** Hard cap of **5 total attempts daily** and **1 attempt per category** within 24 hours. Points for issues are placed in **Escrow** until an admin approves. Additionally, administrators can create new quiz topics, activate/de-activate the quiz section, and regenerate quiz questions dynamically using the AI model.
7.  **Discussion Geofence:** REST API prevents users from posting comments on tickets unless they are registered within a **2km radius** of the issue.

---

## 🚀 Installation & Setup

### Prerequisites
*   Node.js (v18 or higher)
*   MongoDB Instance (Local or Atlas)
*   Google Gemini API Key (via Google AI Studio)
*   Google Maps API Key (with Maps JavaScript API and Geocoding API enabled)

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/communitycomrade.git
cd communitycomrade
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the root directory and populate it based on `.env.example`:
```env
GEMINI_API_KEY="your-gemini-api-key"
APP_URL="http://localhost:3000"
MONGODB_URI="your-mongodb-connection-string"
JWT_SECRET="your-strong-jwt-secret-key"
GOOGLE_MAPS_PLATFORM_KEY="your-google-maps-api-key"
```

### 4. Run the Application in Development Mode
This command starts the backend Express server on port `3000` with the Vite frontend running concurrently.
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Compile and Run Production Builds
This compiles the client app into static files in `/dist` and bundles the Express server into a standalone CommonJS bundle (`dist/server.cjs`) using `esbuild`.
```bash
npm run build
npm run start
```

---

## 🔑 Environment Variables Reference

| Variable | Required | Description |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | **Yes** | API key generated via Google AI Studio to run Gemini 3.5 visual and text audits. |
| `GOOGLE_MAPS_PLATFORM_KEY` | **Yes** | Client-side API key enabling interactive map coordinates picking and spatial heatmaps. |
| `MONGODB_URI` | **Yes** | Connection string for MongoDB database to store users, grievances, and logs. |
| `JWT_SECRET` | **Yes** | String key to sign role-based JSON Web Tokens (JWT) for authentication. |
| `APP_URL` | No | Full URL where the app is hosted (defaults to `http://localhost:3000`). |

---

## 📸 Screenshots Placeholder

Below are the main wireframe and interface components represented in the application:

### Home Page
![Landing Page](screenshots/home/MainPage.png)
![Landing Page](screenshots/home/MainPage2.png)

### Login Page
![Login Page](screenshots/home/loginPage.png)

### Citizen

#### Registration
![Registration Page](screenshots/citizen/citizen_registration.png)

#### Dashboard
![Dashboard](screenshots/citizen/citizen_dashboard.png)

#### Complaints
![Complaints](screenshots/citizen/citizen_complaints.png)

#### View Complaint
![View Complaint](screenshots/citizen/citizen_complaint_view.png)

#### Profile
![Profile](screenshots/citizen/citizen-profile.png)

#### Create Complaint
![Create Complaint](screenshots/citizen/complaint_register_page.png)

#### Location Select Pop-up
![Location Select Pop-up](screenshots/citizen/location_selection_popup.png)

#### Analytics Overview
![Analytics Overview](screenshots/citizen/citizen_analytics_overview.png)

#### Analytics HeatMap
![Analytics HeatMap](screenshots/citizen/citizen_analytics_heatmap.png)

#### Analytics Insights
![Analytics Insights](screenshots/citizen/citizen-analytics-ai-insights.png)

#### Quiz Menu
![Quiz Menu](screenshots/citizen/citizen-quiz-menu.png)

#### Quiz Attempt
![Quiz Attempt](screenshots/citizen/citizen-quiz-page.png)

#### Quiz Quit
![Quiz Quit](screenshots/citizen/citizen-quiz-quit.png)

#### Quiz Complete
![Quiz Complete](screenshots/citizen/citizen-quiz-complete.png)

#### LeaderBoard Monthly
![LeaderBoard Monthly](screenshots/citizen/citizen-leaderboard-monthly.png)

#### LeaderBoard Lifetime
![LeaderBoard Lifetime](screenshots/citizen/citizen-leaderboard-lifetime.png)

#### LeaderBoard Hall-of-fame
![LeaderBoard Hall-of-fame](screenshots/citizen/citizen-leaderboard-hall-of-fame.png)

#### Helpline
![Helpline](screenshots/citizen/citizen-helpline.png)


---

## 🗺️ Future Roadmap

1.  **Predictive Infrastructure Wear Logs:** Integrating public sensor telemetry (e.g., street vibrations) with Gemini to forecast road damage before complaints occur.
2.  **Mobile Wrapper Compatibility:** Wrapping the application with Capacitor or React Native to offer push notifications and background GPS logging.
3.  **Offline SMS Reporting:** Enabling basic offline grievance lodging via encrypted SMS text channels for users without stable internet coverage.

---

## 🏆 Impact & Business Value

*   **For Citizens:** Restores the social contract, builds trust through transparent audit logs, and offers a fun, rewarding learning environment.
*   **For Officers:** Eliminates administrative friction, highlights high-priority safety complaints, and prevents duplicate report tracking.
*   **For Administrators:** Drastically cuts down manual triaging labor, protects municipality budgets from private repair fraud, and flags structural SLA breaches.
*   **For Communities:** Activates localized civic ownership, builds spatial high-trust circles, and keeps digital discussion boards relevant to actual residents.

---

## 📄 License
This project is licensed under the MIT License - see the LICENSE file for details.

---

## 🤝 Acknowledgements

*   **Google Gemini AI Models & Google AI Studio** for visual audits, text analyses, and model-fallback systems.
*   **Google Maps Platform** for high-precision geofencing, mapping coordinates, and hotspot indicators.
*   **The Open Source Community** for providing modern libraries like React, Express, Mongoose, Motion, and Lucide Icons.

***

**Note:** A condensed, 3-page, judge-focused executive version of this documentation is saved as `hackathon-executive-summary.md` inside the `/docs` folder. The complete detailed technical architecture is available in `/docs/hackathon-submission.md`. Please refer to these documents for further technical deep-dives.
