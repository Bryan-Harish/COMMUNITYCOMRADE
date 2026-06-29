# HACKATHON DEMO & EVALUATION GUIDE 🏛️🛡️
### CommunityComrade: AI-Powered Civic Engagement & Grievance Management Platform

---

## Judge Quick Start (2 Minutes) ⏱️

Welcome Judges! If you are reviewing many submissions and want to see the core value of CommunityComrade instantly, follow this ultra-fast walkthrough:

1. **Open Application URL:** Navigate to `[INSERT_APPLICATION_URL]`.
2. **Login as Citizen:** Use the credentials in Section 3 to log into the Citizen Portal.
3. **View or Create an Issue:** Go to the dashboard, click **Report New Issue**, select a spot on the map, upload an issue image, and submit.
4. **Observe AI Issue Analysis:** Check the details of your submitted issue to see how Gemini AI automatically triages, categorizes, determines severity, and checks for private property compliance.
5. **Login as Officer:** Log out and log back in using the Department Officer credentials.
6. **Resolve an Issue:** Go to the officer dashboard, claim your issue, set it to **In Progress**, and upload an "After" resolution photo.
7. **Observe AI Resolution Validation:** See Gemini AI automatically run GPS proximity, stock-photo fraud, and visual landmark alignment checks.
8. **Open Analytics Dashboard:** View the Map Heatmap and municipal SLA charts.
9. **Open Community Hero Dashboard:** Browse the Hall of Fame and Citizen Leaderboard.

*   **Estimated Evaluation Time:** 3–5 Minutes
*   **Key Features Demonstrated:**
    *   AI Issue Analysis & Automated Routing
    *   Department Officer Workflow & Lifecycle States
    *   Before/After Visual Landmark Alignment Audits
    *   Geofenced Citizen Commenting & Voting
    *   Interactive Analytics & Heatmaps
    *   AI-Generated Civic Learning Quizzes (with Admin controls)
    *   Community Hero Recognition & Hall of Fame

---

## SECTION 1: PROJECT OVERVIEW

### 1.1 The Problem
In modern municipalities, the social contract between citizens and local authorities is often strained. Traditional grievance portals operate as opaque black boxes where complaints disappear without clear tracking, automatic routing, or accountability. This leads to administrative overhead, delayed resolutions, contractor fraud (using fake or stock images of repairs), and private property exploitation (citizens using public funds to repair private assets).

### 1.2 The Solution
**CommunityComrade** is an AI-validated, peer-endorsed, and gamified municipal collaboration platform. It transforms passive citizens into active neighborhood auditors while offering administrators automated, secure triage and fraud protection. 

### 1.3 The Role of Gemini AI
Google Gemini acts as the cognitive processing core of the platform:
*   **Automatic Triage & Vetting:** Scans reported issues to classify categories, estimate severity, and detect if complaints reside on private property (vetoing domestic tiles/fixtures).
*   **Multimodal Resolution Auditing:** Prevents contractor fraud by running pixel scans for commercial stock-photo watermarks and conducting structural visual alignment checks to ensure "Before" and "After" photos were taken at the exact same physical location.
*   **Dynamic Civic Quizzes:** Generates customized, interactive trivia on local laws and civil procedures, allowing citizens to level up and earn rewards responsibly.

---

## SECTION 2: APPLICATION ACCESS

To access the active deployments of CommunityComrade, use the following resource paths:

*   **Production Application URL:** `[INSERT_APPLICATION_URL]`
*   **GitHub Repository URL:** `[INSERT_GITHUB_URL]`
*   **Documentation Library:** `[INSERT_DOCUMENTATION_LINK]`

---

## SECTION 3: DEMO ACCOUNTS

Use the following pre-configured user credentials to evaluate different aspects of the platform:

### 3.1 Administrator Portal
*   **Email:** `[INSERT_ADMIN_EMAIL]`
*   **Password:** `[INSERT_ADMIN_PASSWORD]`

### 3.2 Department Officer Portal
*   **Email:** `[INSERT_OFFICER_EMAIL]`
*   **Password:** `[INSERT_OFFICER_PASSWORD]`

### 3.3 Citizen Portal
*   **Email:** `[INSERT_CITIZEN_EMAIL]`
*   **Password:** `[INSERT_CITIZEN_PASSWORD]`

> ⚠️ **Note to Maintainers:** Replace the placeholders above with real database-seeded accounts before submitting to hackathon reviews.

---

## SECTION 4: USER ROLES

The application enforces strict role-based access control (RBAC), dividing permissions into three discrete pathways:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              ROLE CAPABILITIES                              │
├──────────────────────┬──────────────────────┬───────────────────────────────┤
│       CITIZEN        │  DEPARTMENT OFFICER  │         ADMINISTRATOR         │
├──────────────────────┼──────────────────────┼───────────────────────────────┤
│ • File geo-pin cases │ • Claim local cases  │ • Review pending citizen KYC  │
│ • Geofenced voting   │ • Post updates       │ • Approve/Reject officer IDs  │
│ • Discussion forums  │ • Upload repair proof│ • Configure helpline listings │
│ • Complete quizzes   │ • Coordinate checks  │ • Manage & regenerate quizzes │
│ • Track level states │ • Directory lookup   │ • Moderate private properties │
│                      │                      │ • Suspend/Reinstate any user  │
└──────────────────────┴──────────────────────┴───────────────────────────────┘
```

---

## SECTION 5: RECOMMENDED JUDGE EVALUATION FLOW

To experience the complete, integrated lifecycle of CommunityComrade in under 5 minutes, follow this optimized walkthrough:

```
[1. Citizen: Report Issue] ➔ [2. Gemini AI: Auto-Triage] ➔ [3. Officer: Claim & Resolve]
                                                                        │
                                                                        ▼
[6. Citizen: Earn Rewards] ◄── [5. Community: Local Vote] ◄── [4. Gemini AI: Fraud Checks]
```

### Step 1: Login as Citizen & Report an Issue
*   Go to the login screen and authenticate with the **Citizen** credentials.
*   Open the Dashboard and click **Report New Issue**.
*   Select a location by dragging the map marker, upload an image of a municipal problem, type a description, and submit.

### Step 2: Observe Gemini AI Triage
*   Go to the issue details screen. You will observe that the issue is automatically assigned an incident category, priority level, and targeted department.
*   If you submitted a picture of an indoor bathroom or household space, note how Gemini automatically flags it as **Private Property** and holds it for admin manual review.

### Step 3: Login as Officer & Resolve the Case
*   Log out and authenticate with the **Officer** credentials.
*   Navigate to the **Dashboard** and search for the active issue matching your department.
*   Click **Claim Issue** and update its status to **In Progress**.
*   Click **Submit Resolution**, input your physical coordinates, and upload an "After" photo.

### Step 4: Observe AI Proximity & Landmark Auditing
*   If you upload an image far away from the original coordinate pin, notice the system rejects the submission due to GPS offsets.
*   If you upload an image with a commercial stock watermark, Gemini's visual audit flags it as fraudulent.
*   Upon submitting valid, aligned photos, the status updates to **Resolution Pending Verification**.

### Step 5: Cast Geofenced Community Votes
*   Log out and sign back in as the **Citizen**.
*   Ensure your coordinate pin is within 2km of the repair. Click **Approve Resolution**.
*   Observe how local residents (both Verified Citizens and Community Verified Citizens) can cast upvotes or downvotes to maintain quality assurance.

### Step 6: Review Analytics & Leaderboards
*   Open the **Analytics Hub** to explore real-time SLA metrics, category weightings, and visual coordinate heatmaps.
*   Navigate to the **Civic Quizzes** area, take a dynamic trivia game, pass with 4/5 or 5/5, and watch your ranking climb the monthly leaderboard!

---

## SECTION 6: FEATURE WALKTHROUGH

| Feature Name | Objective | How to Evaluate | Expected Outcome |
| :--- | :--- | :--- | :--- |
| **AI Issue Reporting** | Automated classification & routing of infrastructure breakages. | Submit a new complaint as a Citizen. | Gemini detects category, severity, and files ticket to Mongoose. |
| **Citizen Verification** | Gated registration flows. | Register a new account and upload a document. | Saved as `PENDING_ADMIN_REVIEW`. Tier 2 unlocks after collecting 3 peer endorsements. |
| **Admin User Registry & Suspension** | Instant suspension/reinstatement controls for user moderations. | Login as Admin, open User Registry tab, find a user and click Suspend. | User status is set to `SUSPENDED`, terminating current login access and blocking any system transactions. Clicking Reinstate restores active state. |
| **Department Workflow** | End-to-end officer claiming. | As an Officer, claim a ticket and progress it through `ASSIGNED` ➔ `ACCEPTED` ➔ `IN_PROGRESS`. | Status transitions update on the digital ledger. |
| **Community Discussions** | Local geofenced threads & comment moderations. | Open an issue discussion thread as Citizen or Admin. | Citizens within 2km can write comments. Administrators can moderate and instantly delete inappropriate messages. |
| **AI Resolution Validation** | Anti-fraud visual checks. | As an Officer, upload "After" proof. | Proximity check (<50m) and landmark visual check must clear for verification. |
| **Community Verification** | Peer-led resolution auditing. | As a Citizen, view a resolved issue. | Verified/Community Verified Citizens cast upvotes/downvotes. Net +3 closes, net -3 reopens. |
| **Analytics & Heatmaps** | Geo-density mapping. | Open the Map Heatmap view. | All users view heatmaps; only Admin can choose and filter by any district. |
| **Civic Learning** | Interactive learning modules. | Open the Quizzes tab and start a topic. | Dynamic Gemini-generated MCQs are served; passing awards profile XP. Admin can add topics, toggle active status, and regenerate. |
| **Community Hero** | Stewardship rewards. | Open the Leaderboard and Hall of Fame. | Displays the highest-ranking citizens, tracking historical Monthly Heroes. |
| **Helpline Directory** | Emergency local directory. | Open the Helpline Directory page (available to all roles). | Lists active departments, contacts, and estimated response timelines. |

---

## SECTION 7: SAMPLE DATA AVAILABLE

Explore the seed data available inside the evaluation environment:

*   **Total Registered Citizens:** `[INSERT_VALUE]`
*   **Active Department Officers:** `[INSERT_VALUE]`
*   **Total Logged Issues:** `[INSERT_VALUE]`
*   **Verified Resolutions:** `[INSERT_VALUE]`
*   **Civic Quiz Attempts Logged:** `[INSERT_VALUE]`
*   **Hall of Fame Heroes Inducted:** `[INSERT_VALUE]`

---

## SECTION 8: KEY FEATURES TO LOOK FOR (JUDGES' CHEATSHEET)

When evaluating CommunityComrade, look for these distinctive engineering integrations:

1.  **Strict Private Property Veto:** Gemini inspects incoming complaint photos. If internal household fixtures (such as bathroom tiles, indoor taps, or living spaces) are detected, it marks `isPublicProperty: false` and redirects the issue to the Admin manual review queue. This prevents municipal funds from being wasted on private properties.
2.  **Multimodal Landmark Alignment:** When an officer resolves a complaint, Gemini compares the "Before" and "After" photos to ensure the backdrop structures (buildings, poles, background trees) align perfectly, preventing contractors from uploading fake resolutions.
3.  **Dynamic AI Quiz Generation with Admin Controls:** Interactive quizzes are dynamically generated using Gemini. Administrators can add new topics, toggle their active status, and trigger Gemini to completely regenerate quiz questions to ensure fresh learning content.
4.  **Spatial Geofencing:** Comments and voting are restricted to users whose registered primary location is within a **2km radius** of the issue coordinates, keeping local threads constructive.
5.  **User Registry Suspension & Kill-Switch:** Administrators retain absolute control over user access. They can immediately suspend or reinstate any citizen or department officer through the central User Registry dashboard, instantly blocking active sessions of malicious or abusive profiles.

---

## SECTION 9: SUGGESTED DEMO SCRIPT

### 9.1 Introduction (0:00 - 0:45)
> *"Hello Judges! Today, we are excited to show you CommunityComrade: an AI-validated, peer-endorsed civic platform designed to bring accountability back to municipal services. Traditional portals are a black box—complaints are lost, duplicate entries clog the system, and contractor fraud wastes millions of taxpayer dollars. We solve this by introducing Google Gemini as our automated cognitive auditor, paired with geofenced neighborhood networks."*

### 9.2 Citizen Filing & AI Triage (0:45 - 1:45)
> *"Let's start as a citizen. We find a pothole, drop a pin on the map, and upload an image. Notice that as soon as we hit submit, our backend sends the image and description to Gemini. Without any human intervention, the ticket is classified, prioritized, and assigned to the correct municipal department. Furthermore, if a user tries to file a complaint about a plumbing leak inside their private bathroom, Gemini's visual vetting system automatically catches it, tags it as private property, and routes it to the administrator for review."*

### 9.3 Officer Action & AI Fraud Audit (1:45 - 3:00)
> *"Now we log in as the department officer. We locate the pothole, claim it, and complete the repair on-site. When we attempt to upload our 'After' repair image, our system runs a double audit. First, we perform an automated GPS proximity check ensuring the officer is standing within 50 meters of the pothole. Second, we hand both photos to Gemini, which audits background landmarks to verify the 'After' photo was taken at the exact same physical spot, and scans for stock-photo watermarks."*

### 9.4 Community Voting & Gamification (3:00 - 4:15)
> *"Once the AI audit passes, the ticket enters the geofenced community voting pool. Verified local residents within 2km can upvote or downvote the quality of the repair. When the threshold is met, the issue is closed, and points are released to the citizen. To encourage community stewardship, citizens can participate in dynamic, AI-generated civic literacy quizzes. We prevent point-farming with a hard daily cap, and our monthly leaderboards feed directly into our prestigious Hall of Fame. Admins maintain full oversight, allowing them to manage departments, moderate alerts, and regenerate quiz topics dynamically."*

### 9.5 Conclusion (4:15 - 5:00)
> *"CommunityComrade bridges the gap between active citizens and transparent government. By combining spatial geofencing, role-based workflows, and Google's Gemini models, we eliminate paper resolutions, cut administration overhead, and empower local neighborhoods to take charge of their civic spaces. Thank you, and we welcome your questions!"*

---

## SECTION 10: TROUBLESHOOTING

If you run into any unexpected behaviors during your evaluation, consult the following fallback guide:

*   **Maps failing to load:** Ensure your browser is not blocking spatial location scripts and that your connection can reach the Google Maps API servers.
*   **AI classification timed out:** If Gemini is under heavy API load, our resilient model fallback controller will automatically retry using lighter-weight models. Please refresh the page and try again.
*   **Comment or Vote button deactivated:** Ensure your logged-in profile has registered coordinate pins within the required **2km geofence** of the issue.

---

## SECTION 11: CONCLUSION

CommunityComrade demonstrates how modern cloud-native architectures, spatial data collections, and Gemini's computer vision can work together to solve real-world civic problems. It provides a secure, engaging, and highly transparent digital town square, laying down a blueprint for the future of democratic municipal collaboration.
