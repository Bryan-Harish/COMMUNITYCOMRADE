# MASTER SYSTEM WORKFLOWS DOCUMENT 🏛️🛡️
### CommunityComrade: AI-Powered Civic Engagement & Grievance Management Platform

---

## SECTION 1: WORKFLOW OVERVIEW

This document outlines the standard operating workflows implemented within the CommunityComrade system. These pathways integrate role-based actions, geospatial calculations, and Google Gemini AI cognitive checks to orchestrate a transparent, automated, and secure municipal grievance ecosystem.

### 1.1 High-Level Systems Map

```
  [CITIZEN]              [GEMINI AI ENGINE]          [GOVERNMENT OFFICER]       [ADMINISTRATOR]
      │                           │                           │                       │
      ├─► Register & KYC ─────────┼───────────────────────────┼───────────────────────┼─► Approve/Reject Document
      │                           │                           │                       │
      ├─► File Issue with Pin ───┼─► Public Property Scan    │                       │
      │                           ├─► Category Triaging       │                       │
      │                           ├─► 200m Duplicate Check    │                       │
      │                           │                           │                       │
      │                           │                           ├─► Claim & Accept ─────┤
      │                           │                           ├─► Resolve & GPS Check │
      │                           │                           ├─► Upload Before/After │
      │                           │                           │                       │
      │                      [AI Resolution Validation]       │                       │
      │                      - Landmark Alignment Audit       │                       │
      │                      - Stock Photo Fraud Scan         │                       │
      │                           │                           │                       │
      ├─► Geofenced Vote ─────────┴───────────────────────────┴───────────────────────┼─► Monthly Hero Selection
```

---

## SECTION 2: CITIZEN REGISTRATION WORKFLOW

### 2.1 Workflow Objective
Establishes a unique user credential for citizens, captures their primary geographic center, and gates initial access levels.

### 2.2 Actors Involved
*   **Citizen (Applicant)**

### 2.3 Step-by-Step Process
1.  **Form Input:** The citizen inputs their name, password, email, and registers their primary District and Ward boundaries.
2.  **Location Pinning:** The citizen drags a map marker to pinpoint their residence coordinates, automatically capturing latitude and longitude.
3.  **Password Hashing:** Passwords are securely hashed on the server-side using BcryptJS.
4.  **Pending State Creation:** The profile is written to MongoDB with `status: "PENDING_ADMIN_REVIEW"` and `role: "CITIZEN"`.

### 2.4 ASCII Workflow Diagram
```
  [Citizen Input] ➔ [Pins Coordinates on Map] ➔ [Formulates Aadhaar/ID Payload] ➔ [Bcrypt Hashing] ➔ [Saved as PENDING]
```

### 2.5 Business Value
Guarantees that citizen profiles are tied to spatial coordinates and specific municipal wards, preventing generic fake profile injections.

---

## SECTION 3: CITIZEN VERIFICATION WORKFLOW

### 3.1 Workflow Objective
Conducts manual document auditing to protect the platform from Sybil attacks and bot networks.

### 3.2 Actors Involved
*   **Citizen**
*   **System Administrator**

### 3.3 Step-by-Step Process
1.  **KYC Submission:** The citizen selects their official document type (Aadhaar, Voter ID, Passport, Driving License) and uploads a scan.
2.  **Admin Review Queue:** The document is loaded into the Administrator’s Verification Hub.
3.  **Approve/Reject Assessment:**
    *   **Approved:** Status updates to `VERIFIED_CITIZEN` (Tier 1). The citizen is now allowed to report issues and participate in quizzes.
    *   **Rejected:** Profile is updated to `REJECTED`, prompting the citizen to submit a valid identity scan.
4.  **Tier 2 (Community Endorsement Gate):** To achieve full `COMMUNITY_VERIFIED` status (required for commenting and voting), a Verified Citizen must collect **3 endorsements** from existing Community Verified Citizens in their same ward.

### 3.4 ASCII Workflow Diagram
```
  [Citizen Uploads Scan] ➔ [Admin Review Queue] ───► Approved ➔ Status: VERIFIED_CITIZEN (Tier 1)
                                                 │
                                                 └──► Rejected ➔ Status: REJECTED
```

### 3.5 Business Value
Forms a reliable, peer-vouched, human-audited citizen network, ensuring democratic municipal processes are safe from malicious bot manipulation.

---

## SECTION 4: ISSUE REPORTING WORKFLOW

### 4.1 Workflow Objective
Facilitates precise geospatial logging and automatic triaging of localized infrastructure breakdowns.

### 4.2 Actors Involved
*   **Verified Citizen**
*   **Gemini AI Engine**

### 4.3 Step-by-Step Process
1.  **Submission:** The citizen uploads an issue image, types a detailed description, and drops a map marker onto the correct location.
2.  **Geofence Check:** The server validates that the coordinate pin resides inside valid municipal boundaries.
3.  **Duplicate Check:** The coordinates are checked against open local reports within 200m. Gemini conducts a visual and semantic description audit to catch redundant entries.
4.  **Analysis Gateway:** Gemini processes the visual asset and text description to identify categories, set severity, and check for public property compliance.
5.  **Ticket Filing:** The issue is written to MongoDB in the `OPEN` state.

### 4.4 ASCII Workflow Diagram
```
  [Citizen Files Issue] ➔ [Spatial Boundary Check] ➔ [200m Geo-Duplicate Scan] ➔ [Gemini AI Parsing] ➔ [Status: OPEN]
```

### 4.5 Business Value
Enforces strict spatial accuracy, groups duplicates immediately, and handles classification automatically, saving administrative staff hours of manual ticket routing.

---

## SECTION 5: AI ISSUE ANALYSIS WORKFLOW

### 5.1 Workflow Objective
Processes submitted reports through automated cognitive gating to classify grievances, prioritize responses, and route claims.

### 5.2 Actors Involved
*   **Gemini AI Engine**
*   **Mongoose Database**
*   **System Administrator**

### 5.3 Step-by-Step Process
1.  **Image & Text Evaluation:** Gemini scans the uploaded picture alongside the user description.
2.  **Auto-Classification:** Maps parameters to valid category classes (`POTHOLE`, `GARBAGE`, `STREETLIGHT`, `WATER_LEAKAGE`) and sets initial severity priority scales (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).
3.  **Private Property Vetting:** Gemini inspects the photo for indoor household fixtures (bathroom tiles, domestic kitchen sinks, internal pipes).
    *   **Private Property Flagged:** If detected, the issue is flagged with `isPublicProperty: false` and routed to the **Admin's Manual Review Queue** for validation.
    *   **Public Property Approved:** If the picture shows public roads, public parks, or outer structures, it is flagged as `isPublicProperty: true` and proceeds to automated department routing.
4.  **Structured JSON Conversion:** The backend enforces strict JSON formats via `responseSchema` to prevent code parsing failures.

### 5.4 ASCII Workflow Diagram
```
                                                        ┌──► Private Detected ➔ [Admin Manual Review Queue]
                                                        │
  [Image & Text Sent to Gemini] ➔ [Vetting Constraints] ┼──► Public Approved ➔ [Set Category & Routed]
```

### 5.5 Business Value
Completely prevents citizens from using public municipal funds to carry out repairs inside private household properties, while keeping administrative oversight intact.

---

## SECTION 6: ISSUE LIFECYCLE WORKFLOW

The state transitions of a municipal complaint follow a strict, linear state machine to maintain integrity and audit records.

### 6.1 State Transition Map

```
     [OPEN] ──► [ASSIGNED] ──► [ACCEPTED] ──► [IN_PROGRESS] ──► [RESOLUTION_PENDING]
                                                                        │
                                   ┌────────────────────────────────────┴────────────────────────────────────┐
                                   ▼                                                                         ▼
                      [Net +3 Community Approvals]                                              [Net -3 Community Rejections]
                                   │                                                                         │
                                   ▼                                                                         ▼
                      [COMMUNITY_VERIFIED] ──► [CLOSED]                                                  [REOPENED] ──► [ASSIGNED]
```

### 6.2 State Table Glossary
*   `OPEN`: Citizen report logged; category, severity, and routing assigned.
*   `ASSIGNED`: Ticket allocated to a localized department officer.
*   `ACCEPTED`: Officer accepts ownership of the case.
*   `IN_PROGRESS`: Officer starts active repairs on-site.
*   `RESOLUTION_PENDING`: Officer uploads "After" proof. Awaiting automated audits and geofenced voting.
*   `COMMUNITY_VERIFIED`: Resolution receives net +3 community approval score.
*   `CLOSED`: Administrative closure with points issued to citizen profiles.

---

## SECTION 7: OFFICER RESOLUTION WORKFLOW

### 7.1 Workflow Objective
Enforces structured procedures for officers to accept tasks and log completed physical repairs.

### 7.2 Actors Involved
*   **Department Officer**
*   **Mongoose Database**

### 7.3 Step-by-Step Process
1.  **Case Assessment:** The officer logs in and claims an `OPEN` case matching their department.
2.  **Assignment Claims:** Case status advances: `OPEN` ➔ `ASSIGNED` ➔ `ACCEPTED` ➔ `IN_PROGRESS`.
3.  **Repair Action:** The officer completes the physical repair work on-site.
4.  **Proof Logging:** Standing at the physical site, the officer captures and uploads an "After" photo.
5.  **Coordinates Logging:** The officer’s mobile device logs their current latitude and longitude.
6.  **Audit Submission:** Submits the payload to trigger spatial and AI visual validation.

### 7.4 ASCII Workflow Diagram
```
  [Officer Claims Issue] ➔ [Accepts Case] ➔ [On-Site Repairs Finished] ➔ [Captures After Photo & GPS] ➔ [Submits Proof]
```

### 7.5 Business Value
Guarantees transparency and tracks task completion speed, allowing municipal managers to assess contractor performance metrics.

---

## SECTION 8: AI RESOLUTION VALIDATION WORKFLOW

### 8.1 Workflow Objective
Detects resolution fraud automatically by comparing spatial telemetry and analyzing photo similarities before moving to community review.

### 8.2 Actors Involved
*   **Gemini AI Engine**
*   **Express Audit Controller**

### 8.3 Step-by-Step Process
1.  **Proximity Audit:** The server evaluates the officer’s upload coordinates against the original complaint coordinates using the Haversine formula. If the offset exceeds 50 meters, the submission is rejected.
2.  **Visual Alignment Audit:** If proximity passes, the "Before" and "After" photos are analyzed by Gemini's computer vision.
3.  **Landmark Matching:** Gemini confirms the presence of identical background structures (such as buildings, poles, tree trunks, or wall cracks) to verify both pictures were captured at the exact same spot.
4.  **Stock Photo Verification:** Gemini scans the photo for commercial watermarks to block stock photo fraud.
5.  **Audit Outcomes:**
    *   **Passed:** If both checks clear, the case status transitions to `RESOLUTION_PENDING_VERIFICATION` and enters the community voting pool.
    *   **Failed:** The submission is rejected, and the case status returns to `IN_PROGRESS` with a warning log written to the dashboard.

### 8.4 ASCII Workflow Diagram
```
                     ┌──► Offset > 50m ➔ [Submission Rejected / Return to IN_PROGRESS]
                     │
  [Submit Proof] ────┼──► GPS Proximity Pass ➔ [Gemini Visual Audit] ──► Pass ➔ [Status: RESOLUTION_PENDING]
                     │                                               └──► Fail ➔ [Reject / Return to IN_PROGRESS]
```

### 8.5 Business Value
Eradicates "paper resolutions" where contractors close tickets using old pictures or from incorrect locations, protecting government budgets.

---

## SECTION 9: COMMUNITY VERIFICATION WORKFLOW

### 9.1 Workflow Objective
Bridges citizen oversight and municipal accountability through localized, consensus-driven voting.

### 9.2 Actors Involved
*   **Verified Citizens**
*   **Community Verified Citizens**
*   **Mongoose Database**

### 9.3 Step-by-Step Process
1.  **Voting Availability:** Verified repairs are added to the geofenced community voting pool.
2.  **Voter Verification:** The system uses the Haversine formula to confirm the voter's primary residence is within a **2km radius** of the issue coordinates.
3.  **Voting Options:** Both Verified Citizens and Community Verified Citizens residing within the geofence can cast their vote: `APPROVE` (+1 point) or `REJECT` (-1 point).
4.  **State Outcomes:**
    *   **Net +3 Approval:** The resolution is verified. Status updates to `COMMUNITY_VERIFIED` and then `CLOSED`. Escrowed points are credited to the reporter.
    *   **Net -3 Rejection:** The resolution is rejected. Status returns to `IN_PROGRESS` to prompt re-assignment and further repairs.

### 9.4 ASCII Workflow Diagram
```
  [Repairs Verified] ➔ [Voter Geo-Check < 2km] ➔ [Casts Vote] ───► Net +3 Score ➔ Status: CLOSED
                                                              │
                                                              └──► Net -3 Score ➔ Status: REOPENED
```

### 9.5 Business Value
Empowers local neighborhoods to act as active auditors of local contractor quality, ensuring municipal works meet actual community needs.

---

## SECTION 10: COMMUNITY DISCUSSION WORKFLOW

### 10.1 Workflow Objective
Maintains focused, safe, and constructive local communication, preventing public threads from being derailed by non-local spam or inappropriate content.

### 10.2 Actors Involved
*   **Verified Citizens**
*   **Community Verified Citizens**
*   **Municipal Administrators (Moderators)**
*   **Express Discussion Router**

### 10.3 Step-by-Step Process
1.  **Access Verification:** A citizen or admin clicks a local issue to participate in discussion threads.
2.  **Distance Validation:** For citizens, the server evaluates their registered coordinates against the issue center.
3.  **Posting & Moderation Rights:**
    *   **Within 2km:** Both Verified Citizens and Community Verified Citizens residing within the 2km geofence can participate in the discussion forum to read and write comments.
    *   **Outside 2km:** Comment functions are deactivated for citizens, though reading remains available for public transparency.
    *   **Administrators:** Can post from any distance and have dedicated **Delete** buttons next to every message to instantly soft-delete abusive, spammy, or inappropriate content from the thread.

### 10.4 ASCII Workflow Diagram
```
  [User Clicks Thread] ───► Citizen ───► [Radius Check] ───► Within 2km ───► [Read & Comment UNLOCKED]
                        │                                  └──► Outside 2km ──► [Read-Only Mode]
                        │
                        └──► Admin ──────────────────────────────────────────► [Read, Comment & Delete UNLOCKED]
```

### 10.5 Business Value
Suppresses coordinate-brigading from non-local accounts and provides a direct, active moderation safeguard to keep community discussion threads safe, clean, and constructive.

---

## SECTION 11: ANALYTICS WORKFLOW

### 11.1 Workflow Objective
Aggregates spatial coordinates and historical reports to give administrative teams real-time operational insights.

### 11.2 Actors Involved
*   **Municipal Administrators**
*   **Mongoose Geo-Aggregator**
*   **Gemini AI Engine**

### 11.3 Step-by-Step Process
1.  **Geo-Aggregation:** The server runs geospatial queries to count total reports grouped by category, ward, and department.
2.  **SLA Calculation:** Computes average processing duration, highlighting active SLA breaches.
3.  **Predictive Generation:** Summarizes monthly metrics and feeds historical frequencies to Gemini.
4.  **Insights Output:** Gemini outputs monthly predictions for infrastructural failures and flags lagging departments.

### 11.4 ASCII Workflow Diagram
```
  [Read Spatial Records] ➔ [Mongoose Geo-Aggregation] ➔ [Generate SLA Charts] ➔ [Gemini Processes Trends] ➔ [Admin Report]
```

### 11.5 Business Value
Helps cities shift from reactive, complaint-driven fixing to predictive, preventative municipal infrastructure maintenance.

---

## SECTION 12: HEATMAP GENERATION WORKFLOW

### 12.1 Workflow Objective
Visualizes geographic issue density across the municipal map using high-performance visual layers.

### 12.2 Actors Involved
*   **Citizens (Verified and Community Verified)**
*   **Department Officers**
*   **Administrators**
*   **Google Maps Heatmap API**

### 12.3 Step-by-Step Process
1.  **Access Permissions:** All types of users (Citizen, Officer, Admin) can access analytics and the heatmap interface.
2.  **District Selection Limitation:** While all users can view their localized heatmaps, **only the Admin can choose and filter by any district** to see system-wide hotspots.
3.  **Query Trigger:** The client requests spatial data points matching active filter states.
4.  **Spatial Fetch:** The backend returns an array containing `[latitude, longitude, weight]` from matching issues.
5.  **Heatmap Rendering:** Google Maps client-side SDK aggregates these points into dynamic visual overlays.
6.  **Interactive Exploration:** Users zoom and pan, updating coordinates dynamically to display localized hotspots.

### 12.4 ASCII Workflow Diagram
```
  [Apply Search Filters] ➔ [Fetch GeoJSON Coordinates] ➔ [Map SDK Renders Weighted Heat Overlay] ➔ [Display Map]
```

### 12.5 Business Value
Provides instant, visual clarity on high-density complaint locations, helping administrators prioritize resource allocation.

---

## SECTION 13: CIVIC LEARNING WORKFLOW

### 13.1 Workflow Objective
Educates citizens on local laws, civil procedures, and civic duties through interactive learning modules, backed by administrative management.

### 13.2 Actors Involved
*   **Citizen**
*   **Gemini AI Engine**
*   **Administrator**

### 13.3 Step-by-Step Process
1.  **Quiz Administration:** 
    *   Administrators can create new quiz topics in the central database.
    *   Administrators can activate or de-activate specific quiz sections to control what is visible to users.
    *   Administrators can trigger the Gemini AI engine to regenerate quiz questions dynamically for any topic, ensuring questions stay fresh and relevant.
2.  **Category Selection:** The citizen selects an active, administrator-approved learning topic (e.g., Waste Management, Civic Rights).
3.  **Validation:** The server verifies the user has remaining daily quiz attempts (max 5 overall, max 1 per category).
4.  **Dynamic Generation:** Gemini builds a unique 5-question multiple-choice quiz based on the selected theme (or retrieves a fresh, administrator-regenerated set).
5.  **Trivia Execution:** The citizen answers the quiz within the interactive UI.
6.  **Score Verification:** Scores are evaluated. Achieving 4/5 or 5/5 awards profile XP.

### 13.4 ASCII Workflow Diagram
```
  [Admin: Create/Regen/Toggle Quizzes] ➔ [Citizen Selects Active Quiz] ➔ [Check Daily Limits] ➔ [Gemini Generates Questions] ➔ [Citizen Submits Answers] ➔ [Log Profile XP]
```

### 13.5 Business Value
Improves community civic literacy through structured, fun, and automated learning pathways.

---

## SECTION 14: GAMIFICATION WORKFLOW

### 14.1 Workflow Objective
Drives healthy citizen participation and rewards civic engagement while breaking point-farming loops.

### 14.2 Actors Involved
*   **Citizen**
*   **Express Points Router**

### 14.3 Step-by-Step Process
1.  **Points Staging:** A user files an issue. 50 XP is calculated but held in **Escrow**.
2.  **Approval Release:** An admin reviews and assigns the issue. Escrow is released, and the XP is credited to the profile.
3.  **Action Multipliers:** Users earn 10 XP for geofenced voting and 100 XP for passing civic quizzes.
4.  **Level Progression:** The server recalculates level rankings using a logarithmic scale:
    $$\text{Level} = \lfloor 1 + \sqrt{\frac{\text{XP}}{100}} \rfloor$$
5.  **Badge Unlocks:** Progression unlocks new profiles badges (e.g., "Street Warden", "Eco-Warrior").

### 14.4 ASCII Workflow Diagram
```
  [Complete Civic Action] ➔ [Evaluate Rules / Escrow State] ➔ [Update Profile XP] ➔ [Level Recalculated] ➔ [Unlock Badges]
```

### 14.5 Business Value
Drives positive neighborhood participation while locking down security gates to prevent users from manipulating the leaderboard.

---

## SECTION 15: COMMUNITY HERO WORKFLOW

### 15.1 Workflow Objective
Highlights and recognizes the top-contributing citizens in each municipality.

### 15.2 Actors Involved
*   **Top Citizens**
*   **Municipal Administrators**

### 15.3 Step-by-Step Process
1.  **Score Aggregation:** At the end of each month, the system ranks users based on Community Impact Scores (CIS).
2.  **Selection Vetting:** Top-ranking candidates undergo profile validation to ensure no active flags or suspensions.
3.  **Citation Writing:** The system compiles a summary of the winner's monthly contributions.
4.  **Hall of Fame Induction:** The winner is registered in the Hall of Fame archive, awarding them the "Community Hero" badge.

### 15.4 ASCII Workflow Diagram
```
  [End of Month] ➔ [Rank Community Scores] ➔ [Verify User Flags] ➔ [Induct Winner to Hall of Fame] ➔ [Award Hero Badge]
```

### 15.5 Business Value
Fosters neighborhood pride and encourages long-term civic participation through visible, prestigious community recognition.

---

## SECTION 16: HELPLINE DIRECTORY WORKFLOW

### 16.1 Workflow Objective
Provides citizens with direct, verified contact channels to municipal emergency departments.

### 16.2 Actors Involved
*   **Citizen**
*   **Department Administrators**

### 16.3 Step-by-Step Process
1.  **Accessing Directory:** The citizen opens the Directory page.
2.  **Filters:** Selects the target utility category (e.g., Water, Power, Sanitation).
3.  **Display Details:** The screen displays active helpline phone numbers, official support emails, and estimated resolution timelines.
4.  **Action:** The user clicks to call directly from their mobile device or initiate an email draft.

### 16.4 ASCII Workflow Diagram
```
  [Open Helpline Directory] ➔ [Select Utility Category] ➔ [Display Direct Helpline Details] ➔ [Initiate Mobile Call]
```

### 16.5 Business Value
Eliminates search frustration during infrastructural emergencies by centralizing verified municipal contacts in a single directory.

---

## SECTION 17: ADMINISTRATION WORKFLOW

### 17.1 Workflow Objective
Provides central tools for user approvals, platform moderation, and service configuration.

### 17.2 Actors Involved
*   **System Administrator**
*   **Mongoose Models**

### 17.3 Step-by-Step Process
1.  **Review Approvals:** Admins review incoming citizen KYC documents to confirm ID details.
2.  **Manage Departments:** Admins can create new department entries and assign designated officers.
3.  **Helpline Configuration:** Admins can add or update emergency helplines in the central directory.
4.  **Grievance Intervention:** If Gemini flags a report as Private Property, the admin reviews the image and decides to officially approve or decline the complaint.
5.  **Quiz Management:** Admins can create new quiz topics, activate/de-activate specific quiz sections/categories, and trigger Gemini to dynamically regenerate quiz questions.
6.  **User Registry Suspension Controls:** From the central User Registry dashboard, administrators can view all registered citizens and officers, and instantly toggle their status using the **Suspend** or **Reinstate** action. Suspending an account instantly terminates active login privileges and blocks any system interactions.

### 17.4 ASCII Workflow Diagram
```
  [Admin Logs In] ➔ [Accesses Admin Console] ───► KYC Verification Queue ➔ Approve/Reject User
                                            ├──► Manage Municipal Departments
                                            ├──► Manage Quiz Topics, Toggle Active States, Regen Questions
                                            ├──► Suspend / Reinstate Citizens or Officers via User Registry
                                            └──► Review flagged Private Property cases
```

### 17.5 Business Value
Gives municipal supervisors full control over identity vetting, platform compliance, and department structures.

---

## SECTION 18: END-TO-END SYSTEM WORKFLOW

The diagram below maps the complete, uninterrupted lifecycle of a municipal grievance within CommunityComrade, from registration to final resolution and reward.

```
+────────────────────────────────────────────────────────────────────────────────────────────+
|                                    END-TO-END LIFECYCLE                                    |
+────────────────────────────────────────────────────────────────────────────────────────────+
                                                                                              
    [CITIZEN]                    [ADMINISTRATOR]               [GEMINI AI ENGINE]       [OFFICER]
        │                              │                               │                    │
        ├─► Register & Upload ID ──────┼───────────────────────────────┼────────────────────┤
        │                              ├─► Approve ID (Tier 1)         │                    │
        │                              │                               │                    │
        ├─► Gather 3 Peer Endorsements │                               │                    │
        │   (Unlock Tier 2 Access)     │                               │                    │
        │                              │                               │                    │
        ├─► File Complaint with Pin ───┼───────────────────────────────┼────────────────────┤
        │                              │                               ├─► Category/SLA     │
        │                              │                               ├─► Duplicates check │
        │                              │                               ├─► Public Vet Check │
        │                              │                               │                    │
        │                              │                               │ ◄── Claim Case ────┤
        │                              │                               │                    │
        │                              │                               │ ◄── Repair Proof ──┤
        │                              │                               │                    │
        │                              │                               ├─► GPS Delta < 50m  │
        │                              │                               ├─► Landmark Check   │
        │                              │                               ├─► Stock Photo Audit│
        │                              │                               │                    │
        ├─► Geofenced Community Vote ──┼───────────────────────────────┼────────────────────┤
        │   (Net +3 Score Cleared)     │                               │                    │
        │                              │                               │                    │
        ├─► Close Case ────────────────┼───────────────────────────────┼────────────────────┤
        │                              │                               │                    │
        ├─► Release Escrow XP ─────────┼───────────────────────────────┼────────────────────┤
        │                              │                               │                    │
        │                              ├─► Compile Month-End Results ──┼────────────────────┤
        │                              │                               ├─► Select Hero      │
        │                              │                               │                    │
        │                              ├─► Induct into Hall of Fame ───┼────────────────────┤
        v                              v                               v                    v
```

---

## SECTION 19: EXCEPTION FLOWS

When actions run into security warnings or validation failures, clear fallback mechanisms are triggered.

### 19.1 AI Confidence/Validation Failures (Private Property Detected)
```
 [Citizen Files Issue] ➔ [Gemini Detects Domestic Kitchen / Bathroom Tiles]
                                     │
                                     ▼
                      isPublicProperty set to false
                                     │
                                     ▼
                Status set to: PENDING_ADMIN_MANUAL_REVIEW
                                     │
                                     ▼
 [Admin Reviews Image] ──── Approve? ┴─── No ➔ Ticket Cancelled (Notification sent to citizen)
                             │
                             ▼
                       Status set to OPEN (Case proceeds to normal department assignment)
```

### 19.2 Resolution Validation Failed (GPS Coordinate Offset Too Large)
```
 [Officer Uploads After Photo] ➔ [Server Competes Coordinate Proximity] ➔ [Offset exceeds 50m]
                                                                                  │
                                                                                  ▼
                                                                     Submission REJECTED
                                                                                  │
                                                                                  ▼
                                                                     Ticket returns to IN_PROGRESS
                                                                                  │
                                                                                  ▼
                                                                 Officer must recapture on-site
```

### 19.3 Community Verification Dispute (Citizen Rejection Threshold Met)
```
 [Repairs Verification Queue] ➔ [Voters cast 3 consecutive REJECTS] ➔ [Net Vote Reach -3]
                                                                                  │
                                                                                  ▼
                                                                     Resolution REJECTED
                                                                                  │
                                                                                  ▼
                                                                     Ticket returns to IN_PROGRESS
                                                                                  │
                                                                                  ▼
                                                                 Re-assigned to department
```

---

## SECTION 20: BUSINESS VALUE SUMMARY

The workflows embedded in CommunityComrade provide significant benefits for all community stakeholders:

*   **For Citizens:** Restores municipal trust through transparent audit trails, allows them to actively verify repairs, and provides engaging civic learning paths.
*   **For Officers:** Automates routing, prioritizes urgent safety complaints, and tracks task resolution speeds.
*   **For Administrators:** Drastically cuts down manual triaging workloads, blocks duplicate report spam, and protects city budgets from funding private repairs.
*   **For Communities:** Activates localized civic stewardship, builds high-trust neighborhood circles, and keeps community discussions clean and constructive.
