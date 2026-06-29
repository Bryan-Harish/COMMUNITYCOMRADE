# QA, Workflow & Security Test Plan: Feature 4 - Government Workflow & Issue Resolution Management

This document provides a production-grade, exhaustive test suite designed to battle-test **Feature 4: Government Workflow & Issue Resolution Management** for CommunityComrade. It outlines functional, security, workflow, integration, performance, and compliance verification scenarios to ensure reliability for thousands of citizens and municipal officers.

---

## SECTION 1: FUNCTIONAL TESTING

Validates the end-to-end user-facing functionalities of the government triage and resolution pipeline, ensuring each component serves its administrative and civic purpose seamlessly.

| Test Case ID | Test Scenario | Test Steps | Expected Result | Severity | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-FUN-401** | AI Department Auto-Assignment | 1. Create civic issue "Pothole on 5th Ave".<br>2. Submit report.<br>3. Verify database record and UI assignment field. | The issue is automatically assigned to `Public Works / Road Dept` with confidence >= 90%. | High | Critical |
| **TC-FUN-402** | Officer Dashboard Population | 1. Log in as Department Officer for `Sanitation`.<br>2. Load Officer Dashboard.<br>3. Check list of assigned issues. | Only issues belonging to `Sanitation / Waste Management` are visible. Dashboard metrics (Pending, In Progress) are correct. | High | Critical |
| **TC-FUN-403** | Assigned Issue Details Viewing | 1. Log in as Department Officer.<br>2. Click on a specific assigned issue card.<br>3. Verify rendering of details, map, citizen reporter data, and audit trail. | All details load in <200ms, displaying original title, description, citizen name, media, and correct map pin. | Medium | High |
| **TC-FUN-404** | Issue Acceptance (Triage) | 1. Log in as assigned Department Officer.<br>2. Select an issue in `OPEN` status.<br>3. Click "Accept Issue" (status moves to `IN_PROGRESS`). | Issue status updates to `IN_PROGRESS` in db and UI. Assignment timestamp and assigned officer ID are recorded. | High | High |
| **TC-FUN-405** | Issue Status Updates | 1. Log in as Department Officer.<br>2. Navigate to accepted issue.<br>3. Update status to `RESOLUTION_PENDING` with a progress log comment. | Status is successfully written as `RESOLUTION_PENDING`. Comments are saved to the audit log. | High | High |
| **TC-FUN-406** | Resolution Proof Upload | 1. Navigate to issue in `RESOLUTION_PENDING`.<br>2. Upload "After" resolution photo containing valid EXIF location metadata.<br>3. Submit resolution. | Upload succeeds; system extracts GPS and compares it against original issue coordinates. | High | Critical |
| **TC-FUN-407** | Citizen Resolution Verification | 1. Log in as Citizen (non-author).<br>2. View issue marked as `RESOLUTION_PENDING_VERIFICATION`.<br>3. Click "Approve Resolution". | Citizen's vote is recorded. Progress bar updates. Vote is persistent. | High | High |
| **TC-FUN-408** | Citizen Rejection & Feedback | 1. Log in as Citizen.<br>2. View pending resolution issue.<br>3. Click "Reject Resolution" and input rejection comment. | Rejection vote is logged. Citizen is prompted for evidence. Rejection count increments. | High | High |
| **TC-FUN-409** | Automated Issue Closure | 1. Increment verification approvals on an issue to reach the required threshold.<br>2. Check status of issue. | The issue status transitions automatically to `CLOSED` (or `COMMUNITY_VERIFIED`). | High | High |
| **TC-FUN-410** | Issue History Audit Tracking | 1. Open the audit history panel for a specific issue.<br>2. Verify chronological logs of creation, assignment, transition to In Progress, Resolution uploaded, and citizen votes. | All actions show accurate timestamps, actor roles (CITIZEN, OFFICER, SYSTEM), and detailed descriptions. | Medium | High |

---

## SECTION 2: WORKFLOW TESTING

Ensures that the state machine strictly adheres to the legal transition matrix, preventing illegal shortcuts and state bypasses.

```
       [ CITIZEN CREATES ]
                │
                ▼
            ┌───────┐
            │ OPEN  │
            └───┬───┘
                │ (Officer Accepts)
                ▼
         ┌─────────────┐
         │ IN_PROGRESS │
         └──────┬──────┘
                │ (Officer Uploads Proof)
                ▼
┌─────────────────────────────────┐
│ RESOLUTION_PENDING_VERIFICATION │
└───────────────┬─────────────────┘
                ├───────────────────────────────────┐
                │ (Approve Threshold Met)           │ (Reject Threshold Met)
                ▼                                   ▼
          ┌──────────┐                        ┌─────────────┐
          │  CLOSED  │                        │ IN_PROGRESS │
          └──────────┘                        └─────────────┘
```

| Test Case ID | Test Scenario | Test Steps | Expected Result | Severity | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-WRK-201** | Valid Transition: OPEN → IN_PROGRESS | 1. Officer selects an `OPEN` issue.<br>2. Clicks "Accept/Start Work".<br>3. Check database status. | Transition is successful. Status saved as `IN_PROGRESS`. | High | High |
| **TC-WRK-202** | Valid Transition: IN_PROGRESS → RESOLUTION_PENDING_VERIFICATION | 1. Officer uploads valid proof on `IN_PROGRESS` issue.<br>2. Submits resolution request.<br>3. Verify state. | Status is successfully updated to `RESOLUTION_PENDING_VERIFICATION` (or `RESOLVED` in some schemas). | High | High |
| **TC-WRK-203** | Valid Transition: RESOLUTION_PENDING_VERIFICATION → CLOSED | 1. Citizens approve resolution to hit the consensus threshold.<br>2. Verify final state. | Issue automatically transitions to `CLOSED` (or `COMMUNITY_VERIFIED`). | High | High |
| **TC-WRK-204** | Valid Transition: RESOLUTION_PENDING_VERIFICATION → IN_PROGRESS (Rejection Reopen) | 1. Citizens reject resolution to hit the negative threshold.<br>2. Verify status transitions back to `IN_PROGRESS`. | Issue reverts to `IN_PROGRESS`. Re-evaluation flag is set, and officer is notified. | High | High |
| **TC-WRK-205** | Invalid Transition: OPEN → CLOSED | 1. Attempt to close an `OPEN` issue directly via API/UI without resolution proof. | Transition is blocked with `400 Bad Request` and `INVALID_STATE_TRANSITION` error code. | Critical | Critical |
| **TC-WRK-206** | Invalid Transition: OPEN → RESOLUTION_PENDING_VERIFICATION | 1. Attempt to set an issue to `RESOLUTION_PENDING_VERIFICATION` without assigning an officer first. | Request is blocked; issues must be in `IN_PROGRESS` and have assigned officers before resolving. | High | High |
| **TC-WRK-207** | Invalid Transition: RESOLVED → OPEN | 1. Attempt to transition a `RESOLVED` or `CLOSED` issue back to `OPEN` directly. | Request blocked. Closed issues can only be reopened by administrators under explicit audit. | High | Medium |
| **TC-WRK-208** | Invalid Transition: CLOSED → RESOLUTION_PENDING_VERIFICATION | 1. Try to submit resolution proof on an already `CLOSED` issue. | Request blocked with HTTP `400` / "Issue is already closed." | Medium | High |

---

## SECTION 3: OFFICER MANAGEMENT TESTING

Tests the security, isolation, and capability limits of Department Officers within their respective jurisdictions.

| Test Case ID | Test Scenario | Test Steps | Expected Result | Severity | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-OFF-301** | Jurisdictional Isolation: Unassigned Dept | 1. Log in as `Public Works` Officer.<br>2. Try to view details of a `Sanitation` issue.<br>3. Try to access the issue via direct API request. | Read is blocked or filtered out. Direct API access returns `403 Forbidden`. | Critical | Critical |
| **TC-OFF-302** | Assigned Issues Filtering | 1. Log in as `Water Board` Officer.<br>2. Count list items on dashboard.<br>3. Verify all listed items are marked as assigned to `Water Board`. | The list matches the database subset exactly; no leakage of other departments' records. | High | High |
| **TC-OFF-303** | Authorized Status Modification | 1. Log in as `Public Works` Officer.<br>2. Select an assigned `Public Works` issue.<br>3. Change status to `IN_PROGRESS`. | Update succeeds; change is persistent and reflected in the audit trail. | High | High |
| **TC-OFF-304** | Blocked Cross-Department Status Change | 1. Log in as `Public Works` Officer.<br>2. Identify a `Sanitation` issue ID.<br>3. Submit a status change request via POST/PUT API. | Server returns `403 Forbidden` with "Officer is not authorized to modify this department's issues." | Critical | Critical |
| **TC-OFF-305** | Officer Permission Scope | 1. Log in as Department Officer.<br>2. Attempt to delete an issue or modify global settings. | Actions are blocked. No UI controls are visible, and API attempts return `403 Forbidden`. | High | High |

---

## SECTION 4: RESOLUTION PROOF TESTING

Performs strict schema and validation checks on the files and metadata submitted by officers to verify active, on-site, authentic resolution.

| Test Case ID | Test Scenario | Test Steps | Expected Result | Severity | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-PRF-401** | Before vs After Image Visual Pair | 1. Officer submits resolution.<br>2. Side-by-side modal of "Before" (from citizen report) and "After" (uploaded by officer) renders. | Both images are displayed with clear "Before" and "After" captions to aid citizen verification. | Medium | High |
| **TC-PRF-402** | Correct Location-Tagged Resolution | 1. Upload high-res JPG with EXIF coordinates matching within 15 meters of the issue location. | Image metadata is read successfully; system marks location as "VALIDATED". | High | High |
| **TC-PRF-403** | Missing GPS EXIF Metadata | 1. Upload an image stripped of EXIF metadata (e.g., PNG or web-optimized JPG). | System falls back to manual validation; flags warning to citizen verifiers: "No embedded GPS metadata found." | High | High |
| **TC-PRF-404** | Multiple Resolution Images | 1. Upload 3 separate high-quality images of the resolved site.<br>2. Complete submission. | All 3 images are saved, thumbnails generated, and displayed in the citizen review gallery. | Medium | Medium |
| **TC-PRF-405** | Large Resolution Image Payload | 1. Attempt to upload a 25MB RAW format image. | Client-side validation rejects file with "File size exceeds maximum limit of 10MB." API does the same. | Medium | High |
| **TC-PRF-406** | Corrupted Image File | 1. Upload a file renamed to `.jpg` but containing scrambled text bytes. | Server validation fails with "Invalid image format/file corrupted." No database records are written. | High | High |
| **TC-PRF-407** | Stale or Stock Image Detection (Anti-Fraud) | 1. Upload a stock image of clean asphalt containing stock watermarks or web metadata. | AI verification flags the image as suspicious, lowering confidence score and alerting admin. | Critical | High |

---

## SECTION 5: LOCATION VALIDATION TESTING

Tests the core anti-fraud location matching mechanism, ensuring municipal crews actually visited the site of the issue.

| Test Case ID | Test Scenario | Test Steps | Expected Result | Severity | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-LOC-501** | Exact Location Match (<10m) | 1. Issue coordinate: (12.9716, 77.5946).<br>2. Upload resolution photo with metadata: (12.9715, 77.5945) (~11 meters). | Auto-computed distance is ~11m. Marked as "Location Verified". | High | Critical |
| **TC-LOC-502** | Borderline Location Match (50m - 100m) | 1. Issue coordinate: (12.9716, 77.5946).<br>2. Upload metadata: (12.9711, 77.5952) (~85 meters). | System computes distance, marks location verification with yellow warning "Slightly out of bounds" for citizens to review. | High | High |
| **TC-LOC-503** | Blatant Location Mismatch (>500m) | 1. Issue coordinate: (12.9716, 77.5946).<br>2. Upload photo taken in a completely different sector (5km away). | Validation returns "ALERT: Location mismatch detected! Distance: 5.0km." Status is set with a high-alert flag. | Critical | Critical |
| **TC-LOC-504** | GPS Spoofing Detection (EXIF Manipulation) | 1. Officer uses a software tool to inject fake GPS coordinates into an image taken elsewhere.<br>2. Upload to system. | System cross-checks metadata consistency (camera model, creation dates vs upload dates). Suspicious delta triggers human review. | High | High |
| **TC-LOC-505** | Non-Standard GPS Formats | 1. Upload image with DMS (Degrees, Minutes, Seconds) formatted GPS tags instead of decimal degrees. | System parses DMS correctly and converts it to decimal degrees for standard distance comparison. | Medium | Medium |

---

## SECTION 6: CITIZEN VERIFICATION TESTING

Tests the democratic verification consensus mechanism, which empowers citizens to confirm or reject municipal work before a ticket is archived.

| Test Case ID | Test Scenario | Test Steps | Expected Result | Severity | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-CIT-601** | Review Resolution UI rendering | 1. Log in as Citizen.<br>2. Navigate to pending verification issue.<br>3. Check display of "Before" vs "After" photos, officer comments, and GPS distance assessment. | All components render clearly with high readability and active Voting Buttons. | Medium | High |
| **TC-CIT-602** | Citizen Approval Increment | 1. Click "Yes, this is resolved".<br>2. Verify database vote tally and UI state. | Approved votes count increments by 1. Vote action is disabled to prevent rapid multi-clicks. | High | High |
| **TC-CIT-603** | Citizen Rejection & Reopen Trigger | 1. Click "No, this is not fixed".<br>2. Input rejection reason "Trash is still lying there".<br>3. Submit. | Rejection count increments. Audit log appends the rejection comment. | High | High |
| **TC-CIT-604** | Threshold Trigger: Autoclose | 1. Simulate multiple citizen accounts voting "Approve" (threshold = 3).<br>2. Verify status once threshold is hit. | Status automatically transitions to `CLOSED` / `COMMUNITY_VERIFIED`. | High | Critical |
| **TC-CIT-605** | Duplicate Voting Prevention | 1. Try to submit multiple approval votes from the same citizen token. | Server returns `400 Bad Request` with "You have already voted on this resolution." Tally is unaltered. | High | Critical |
| **TC-CIT-606** | Self-Voting Block (Officer self-verification) | 1. Log in as Officer who resolved the issue.<br>2. Access the citizen verification tab for that issue.<br>3. Try to submit a vote. | Action is blocked. Officer is not allowed to vote on their own resolution submission. | High | Critical |
| **TC-CIT-607** | Author Override / High-Weight Vote | 1. Original reporter votes "No, this is not fixed." | Original reporter's rejection holds higher weight or triggers immediate escalation back to In Progress. | Medium | High |

---

## SECTION 7: AUTHORIZATION TESTING

Verifies role-based access control (RBAC) integrity, ensuring distinct separation of powers between Citizens, Officers, and Admins.

| Test Case ID | Test Scenario | Test Steps | Expected Result | Severity | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-AUTH-701** | Citizen attempting Officer Actions | 1. Authenticate as standard Citizen.<br>2. Send POST request to `/api/officer/issues/:issueNumber/accept`. | API returns `403 Forbidden` with "Access denied: Required role DEPARTMENT_OFFICER." | Critical | Critical |
| **TC-AUTH-702** | Officer attempting Admin Actions | 1. Authenticate as Department Officer.<br>2. Send POST request to `/api/admin/departments/create` or try to modify other officers. | API returns `403 Forbidden`. Admin boundaries remain intact. | High | High |
| **TC-AUTH-703** | Cross-Department Operations Block | 1. Officer in `Parks & Rec` attempts to resolve an issue in `Public Works`. | Action is blocked. System validates that the authenticated officer’s department matches the issue’s department. | High | Critical |
| **TC-AUTH-704** | Unauthorized Status Transitions via API | 1. Standard user fires a request to update an issue status to `CLOSED` bypassing the citizen voting phase. | Blocked with `403 Forbidden`. Only the voting engine or administrators can trigger transition to Closed. | Critical | Critical |
| **TC-AUTH-705** | Token Spoofing / Tampering | 1. Tamper with JWT payload role claim (change `role` from "CITIZEN" to "DEPARTMENT_OFFICER").<br>2. Submit request. | Signature validation fails on server. Token is rejected with `401 Unauthorized`. | Critical | Critical |

---

## SECTION 8: SECURITY TESTING

Adversarial testing targeting exploits, logical bypasses, data injections, and collusion.

| Test Case ID | Test Scenario | Test Steps | Expected Result | Severity | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-SEC-801** | Arbitrary File Upload (RCE vulnerability) | 1. Try to upload a shell script (`exploit.sh` or `webshell.php`) disguised as a JPEG to the resolution endpoint. | File is rejected on the server by strict mime-type check (magic bytes inspection, not just extension). | Critical | Critical |
| **TC-SEC-802** | Resolution Location EXIF Injection | 1. Officer modifies EXIF header of a photo taken last year in a different country to match the local street coordinates. | AI analysis parses metadata. If creation dates are mismatched or image matches historical indices, it flags fraud. | Critical | High |
| **TC-SEC-803** | Mass Ticket Closure Script | 1. Write an automated loop script calling the close API endpoint across 1000 arbitrary issues. | Rate limiter triggers at 10 requests/sec. API blocks further calls, logs security warning. | Critical | Critical |
| **TC-SEC-804** | Sybil Attack: Duplicate Verification | 1. Create 50 puppet accounts from the same IP.<br>2. Programmatically vote "Approve" on a fake resolution to auto-close it. | System detects multiple registrations/votes from the same IP/subnet or pattern. Votes are held for review. | High | High |
| **TC-SEC-805** | IDOR (Insecure Direct Object Reference) | 1. Submit a resolution proof for Issue B while providing Issue A's ID in the parameter path. | Server verifies that the upload payload matches the targeted issue's current assignment, blocking if mismatched. | Critical | Critical |
| **TC-SEC-806** | SQL/NoSQL Injection in Resolution Upload | 1. Input SQL command string `'; DROP TABLE resolution_submissions; --` into the "Resolution Comment" field. | String is treated purely as literal text. Database queries are parameterized (ORM), avoiding injection. | Critical | Critical |

---

## SECTION 9: DATA INTEGRITY TESTING

Verifies that the state of the database matches administrative actions, preserving consistency under peak transactions.

| Test Case ID | Test Scenario | Test Steps | Expected Result | Severity | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-INT-901** | Auto-Assignment Persistence | 1. Assign issue to `Public Works`.<br>2. Trigger severe app crash / restart dev server.<br>3. Reload issue. | Assignment remains intact. Public Works department ownership is preserved. | Critical | Critical |
| **TC-INT-902** | Resolution Submission Atomic Writes | 1. Submit resolution proof (database write + file write).<br>2. Interrupt connection mid-transaction. | Transaction rollback occurs. Database does not save partial, orphan records. | High | High |
| **TC-INT-903** | History/Audit Trail Immutable Log | 1. Transition issue through 4 states.<br>2. Try to update or delete history records directly via API. | History collection does not support update/delete endpoints. Actions are strictly append-only. | High | High |
| **TC-INT-904** | Referential Integrity on Deletion | 1. Attempt to delete an issue with active resolution submissions. | Cascade rules or relational blocks prevent orphan resolution records from floating in the database. | Medium | High |
| **TC-INT-905** | Database Consistency Checks | 1. Count unresolved issues in a ward.<br>2. Resolve 5 issues.<br>3. Verify Ward SLA/Metrics dashboard calculation updates. | Metrics calculation reflects exactly `Total - 5` active issues. No stale state caches. | Medium | High |

---

## SECTION 10: API TESTING

Verifies the reliability of backend REST interfaces under non-ideal, malformed payloads.

| Test Case ID | Test Scenario | Test Steps | Expected Result | Severity | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-API-1001** | Post Resolution: Valid Payload | 1. POST to `/api/officer/issues/1004/resolve` with valid JSON comment, coordinates, and image reference. | Server returns `200 OK` with updated issue payload and AI validation metrics. | High | Critical |
| **TC-API-1002** | Post Resolution: Missing Coordinates | 1. POST to resolve endpoint with comment and image, but coordinates omitted. | Server returns `400 Bad Request` with `{"error": "coordinates are required for resolution verification"}`. | High | High |
| **TC-API-1003** | Post Resolution: Malformed JSON | 1. Send broken JSON (missing closing braces) to resolve endpoint. | Express parser catches error, returns `400 Bad Request` "Invalid JSON payload format." | Medium | High |
| **TC-API-1004** | Post Resolution: Unexpected Fields | 1. Send resolution payload containing random fields like `{"adminOverride": true}`. | Schema validator strips unexpected fields; processes standard fields safely. | Medium | Medium |
| **TC-API-1005** | Get Resolution Submission for Closed Issue | 1. Send GET request to `/api/issues/1004/resolution`. | Returns `200 OK` with the matching resolution schema and metadata. | Medium | High |

---

## SECTION 11: UI/UX TESTING

Tests user flows, navigation ergonomics, accessibility, and visual presentation under complex state progressions.

| Test Case ID | Test Scenario | Test Steps | Expected Result | Severity | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-UI-1101** | Officer Dashboard Responsiveness | 1. Open dashboard on desktop (1920px).<br>2. Shrink window to mobile view (375px). | Layout scales seamlessly into a stacked cards view with accessible hamburger navigations. | Medium | High |
| **TC-UI-1102** | Before/After Image Sliders | 1. Open issue detail with active resolution proof.<br>2. Test slide action or side-by-side comparison toggles. | The transition is smooth (using framer-motion), clear contrast, without layout shifting. | Low | Medium |
| **TC-UI-1103** | Clear Status Color Badges | 1. Render issue cards across different states (`OPEN`, `IN_PROGRESS`, `RESOLUTION_PENDING`, `CLOSED`). | Color-coded states are distinct (e.g., Red for Open, Yellow for In Progress, Blue for Pending, Green for Closed) and colorblind-accessible. | Low | High |
| **TC-UI-1104** | Action Button States | 1. Hover, focus, active click transitions on "Accept Issue" and "Verify". | Clear visual feedback on click (loading spinners prevent double submissions). | Low | Medium |
| **TC-UI-1105** | Friendly Error Message Screens | 1. Trigger network offline while submitting a vote. | A helpful toast notification appears: "Network offline. We will sync your vote once reconnected." | Medium | Medium |

---

## SECTION 12: PERFORMANCE TESTING

Validates that the system remains functional, responsive, and durable under high simulated traffic.

| Test Case ID | Test Scenario | Test Steps | Expected Result | Severity | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-PERF-1201** | 100 Concurrent Status Updates | 1. Run script executing 100 concurrent POST requests to the status transition API for a single department. | All 100 requests complete in <2.0s without deadlocks; database matches final updates correctly. | High | High |
| **TC-PERF-1202** | 100 Concurrent Verification Votes | 1. Simulate 100 citizens voting on a single resolution simultaneously. | Row locks are handled gracefully. Consensus tally is exactly matching. | High | High |
| **TC-PERF-1203** | Dashboard Loading under heavy volumes | 1. Load Officer Dashboard for a department containing 5,000 assigned issues. | Server pagination + indexing returns first 50 records in <150ms. No browser lockups. | Medium | High |
| **TC-PERF-1204** | Timeline Rendering Performance | 1. Load details of an issue with 100 historic actions/reopen audits. | Timeline component renders smoothly with virtualized listing; DOM remains lightweight. | Low | Medium |

---

## SECTION 13: PRODUCTION READINESS REVIEW

An analytical evaluation of potential real-world failure modes and architectural gaps identified during this workflow audit.

### 1. Critical Workflow Risks
* **The "Ghost Resolution" Bypass**: Officers could upload generic black pictures or random pictures of ground pavement to trick the AI validation. Since the image matching relies on structural heuristics, a determined colluder could fake resolution without doing physical work.
  * *Mitigation*: Ensure the Citizen voting phase has a high visibility weight and any rejection triggers immediate escalation to an independent supervisor.
* **SLA Breach Cascade**: If department officers ignore issues, they sit in `IN_PROGRESS` or `OPEN` indefinitely, ruining municipal metrics.
  * *Mitigation*: Build an automated timer task (cron) that flags tickets as "SLA_BREACHED" and auto-reassigns or triggers alerts once an issue spends >72 hours with no update.

### 2. Data Integrity & Abuse Scenarios
* **Sybil Rings voting on Resolutions**: Officers could register multiple citizen accounts from their personal devices to upvote and auto-close their own fake resolutions.
  * *Mitigation*: Restrict registration credentials, cross-reference IP footprints, or require mobile phone verification (OTP) for citizen voter eligibility.
* **Location Spoofing**: Camera EXIF headers can be easily rewritten using free online tools before uploading.
  * *Mitigation*: Encourage the use of a native camera app hook that captures location metadata directly in real-time, or flag all uploads with manual file pickers as "Low Confidence: EXIF Unverified."

---

## SECTION 14: HACKATHON JUDGE REVIEW

**CommunityComrade Workflow Appraisal & Stress Assessment**

### Scorecard
* **Practicality: 9.5 / 10**
  * *Feedback*: The solution directly solves an enormous pain point in municipal administration: accountability. The idea of citizen-audited government resolution with geo-fencing checks is incredibly practical.
* **Governance Value: 9.2 / 10**
  * *Feedback*: Promotes direct transparency. Municipalities can see exactly which departments are lagging and which officers are performing.
* **Transparency: 9.8 / 10**
  * *Feedback*: Splendid. Displaying the exact distance between the reported coordinate and the resolved coordinate in the public audit log leaves no room for back-room deals.
* **Reliability: 8.5 / 10**
  * *Feedback*: Solid, but heavily dependent on the quality of citizen photos and mobile GPS accuracy under dense urban canopy (urban canyons degrade GPS accuracy).
* **Scalability: 8.8 / 10**
  * *Feedback*: The database schemas and Express routes scale nicely, but server-side EXIF extraction needs to be offloaded to asynchronous background jobs to prevent blocking the event loop under heavy loads.
* **Production Readiness: 8.9 / 10**
  * *Feedback*: Excellent progress. With proper security rules and anti-sybil safeguards implemented, this feature is ready for real-world deployment.

### Brutally Honest Judge Feedback
> *"CommunityComrade's resolution verification mechanism is a breath of fresh air in civic tech. Instead of relying on trust, it creates a closed-loop system of physical accountability through distance verification and before/after pairs. However, do not underestimate the adversarial nature of bad actors. If a department officer is lazy, they WILL try to spoof EXIF data or collude with friends to upvote their fake fixes. Hardening the verification threshold and cross-referencing user device patterns will turn this from a brilliant hackathon prototype into an unshakeable institutional tool. Superb execution!"*
