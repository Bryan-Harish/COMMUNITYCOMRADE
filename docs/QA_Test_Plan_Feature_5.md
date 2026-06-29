# QA, Workflow & Security Test Plan: Feature 5 - Community Trust, Verification & Engagement System

This document delivers a production-grade, exhaustive test suite designed to battle-test **Feature 5: Community Trust, Verification & Engagement System** of the CommunityComrade platform. As a Principal QA Engineer, Community Trust Auditor, and Hackathon Judge, this plan is formatted to identify logical edge cases, security exploits, performance constraints, and user experience issues. It ensures complete credibility and trust-defense mechanisms for platforms operating at scale with thousands of active civic participants.

---

## SECTION 1: COMMUNITY VERIFIED CITIZEN TESTING

Validates the transition pipeline from a standard Verified Citizen to a prestigious **Community Verified Citizen** based on local upvotes, ensuring absolute integrity of user badges.

| Test Case ID | Test Scenario | Test Steps | Expected Result | Severity | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-CVC-101** | First Upvote Processing | 1. Authenticate with a verified Citizen account from Ward 8.<br>2. Upvote another verified citizen in Ward 8.<br>3. Inspect voter list and upvote counter. | The upvote is registered (+1 upvote). Voter ID added to candidate's upvote ledger. Current count is 1/3. Badge remains standard. | Medium | High |
| **TC-CVC-102** | Second Upvote Processing | 1. Authenticate with a second unique verified Citizen in Ward 8.<br>2. Upvote the same candidate citizen.<br>3. Inspect upvote counter in database and UI. | The upvote is registered (+1 upvote). Current count is 2/3. Badge remains standard. | Medium | High |
| **TC-CVC-103** | Third Upvote (Threshold Met) | 1. Authenticate with a third unique verified Citizen in Ward 8.<br>2. Upvote the same candidate citizen.<br>3. Inspect upvote counter and badge status. | The upvote is registered (+1 upvote). Count is 3/3. Status updates instantly to `COMMUNITY_VERIFIED` with a new badge. | High | Critical |
| **TC-CVC-104** | Badge Assignment & UI Rendering | 1. Navigate to a profile or a discussion comment of a citizen who reached 3 upvotes.<br>2. Check for the "Community Verified" badge. | A distinct, visually high-contrast "Community Verified" trust badge (SVG icon) displays next to the user's name in profile cards and discussion comments. | Medium | High |
| **TC-CVC-105** | Duplicate Upvote Prevention | 1. Citizen A upvotes Citizen B.<br>2. Citizen A attempts to upvote Citizen B again via UI and direct API call. | UI disables the upvote button. The API returns `400 Bad Request` with `DUPLICATE_UPVOTE` error code. Counter remains at 1. | High | Critical |
| **TC-CVC-106** | Self-Upvote Prevention | 1. Authenticate as Citizen A.<br>2. Send an upvote request targeting Citizen A's own profile. | UI does not show upvote button on self-profile. The API returns `403 Forbidden` with "Self-upvoting is strictly prohibited." | High | Critical |
| **TC-CVC-107** | Invalid User Role Upvotes | 1. Authenticate as guest, Department Officer, or Administrator.<br>2. Attempt to upvote Citizen A via API. | API returns `403 Forbidden` stating "Only verified citizens are authorized to cast trust upvotes." | High | High |
| **TC-CVC-108** | Cross-Area Upvotes Blocked | 1. Citizen A (Ward 5, Bengaluru East) attempts to upvote Citizen B (Ward 12, Tiruchirappalli). | API rejects with `400 Bad Request` stating "Voter must belong to the candidate's local district and ward." | High | High |
| **TC-CVC-109** | Upvote Revocation Behavior | 1. Citizen A undoes/revokes their upvote for Citizen B.<br>2. Check Citizen B's upvote counter and badge. | Upvote counter decrements by 1. If upvotes fall below 3, the `COMMUNITY_VERIFIED` badge is revoked and status reverts to standard. | High | High |
| **TC-CVC-110** | Badge Persistence Validation | 1. Trigger Community Verified status for Citizen A.<br>2. Clear browser cache, log out, log in, or restart server.<br>3. Reload Citizen A profile. | The `COMMUNITY_VERIFIED` status and badge persist securely in the persistent database and render immediately. | High | Critical |

---

## SECTION 2: LOCAL COMMUNITY VALIDATION TESTING

Ensures that the trust system is geographically bounded, meaning that local trust is authenticated solely by citizens from the exact same locality.

| Test Case ID | Test Scenario | Test Steps | Expected Result | Severity | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-LCV-201** | Exact Local Alignment | 1. Citizen A and Citizen B both registered in Ward 12, Tiruchirappalli.<br>2. Citizen A upvotes Citizen B. | System verifies matching `registeredWard` and `registeredDistrict`. Upvote is successfully saved. | High | High |
| **TC-LCV-202** | Ward Mismatch, Same District | 1. Citizen A (Ward 12, Tiruchirappalli) upvotes Citizen B (Ward 14, Tiruchirappalli). | Request is rejected. Local validation requires exact Ward match to prevent city-wide voting alliances. | High | High |
| **TC-LCV-203** | District Mismatch | 1. Citizen A (Ward 5, Bengaluru East) upvotes Citizen B (Ward 5, Tiruchirappalli). | Request is rejected immediately with "District and Ward location mismatch detected." | High | High |
| **TC-LCV-204** | Nearby Reporting Radius | 1. Citizen A views issues reported on the interactive map.<br>2. Verify which issues show "Upvote/Verify" controls. | Only issues filed within Citizen A's registered ward (or within a 500m geofenced radius) are eligible for validation. | Medium | High |
| **TC-LCV-205** | Area Boundary GPS Edge Case | 1. Citizen is standing 2 meters from Ward 12 boundary, but GPS reads inside Ward 11.<br>2. Try to upvote a Ward 12 citizen. | The system resolves the user's location based on their database-registered profiles (`registeredWard`) rather than raw volatile GPS to guarantee stability. | High | High |

---

## SECTION 3: RESOLUTION VERIFICATION TESTING

Validates the democratic verification of officer-submitted resolutions, preventing premature ticket closure and fraudulent "fixed" claims.

| Test Case ID | Test Scenario | Test Steps | Expected Result | Severity | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-RES-301** | Citizen Approves Proof | 1. Log in as a local Citizen.<br>2. Navigate to issue in `RESOLUTION_PENDING_VERIFICATION`.<br>3. Click "Approve Resolution" and confirm. | Citizen's approval is recorded, incrementing the confirmation count by 1. Visual progress bar updates to 1/5. | High | High |
| **TC-RES-302** | Citizen Rejects Proof | 1. Log in as a local Citizen.<br>2. Click "Reject Resolution" and input rejection reason.<br>3. Submit. | Rejection is logged. Comment is appended to the audit trail. If negative threshold is reached, issue returns to `IN_PROGRESS`. | High | High |
| **TC-RES-303** | 5 Confirmation Threshold Met | 1. Submit the 5th unique approval vote for a pending resolution. | The issue status automatically transitions to `CLOSED` or `COMMUNITY_VERIFIED`. SLA timers stop; notifications are sent. | High | Critical |
| **TC-RES-304** | Duplicate Verification Block | 1. Citizen A approves a resolution.<br>2. Citizen A attempts to submit another approval on the same issue. | Button is disabled. Direct API request returns `400 Bad Request` with "You have already verified this resolution." | High | Critical |
| **TC-RES-305** | Issue Creator Restrictions | 1. Creator of the issue attempts to cast a verification vote on their own issue's resolution. | Allowed, but counts as a weighted vote or is isolated to prevent bias. System enforces that at least 3 votes must come from non-authors. | High | High |
| **TC-RES-306** | Verification Tally Persistence | 1. Generate 3 approvals on an issue.<br>2. Force restart server or database connection pool.<br>3. Re-query the issue. | Verification counts remain exactly at 3. Individual user vote associations remain intact. | High | Critical |
| **TC-RES-307** | Verification Audit Trail | 1. Query the issue history details.<br>2. Check logs for the 5 citizen verifications. | Detailed audit logs show "Citizen [ID] verified resolution" with timestamps and any remarks, fully visible to officers/admins. | Medium | High |

---

## SECTION 4: COMMUNITY IMPACT SCORE TESTING

Ensures the gaming/incentive engine awards accurate point values, protects against score inflation, and maintains transaction-level consistency.

| Test Case ID | Test Scenario | Test Steps | Expected Result | Severity | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-CIS-401** | Points for Issue Reporting | 1. Citizen submits a valid unique issue report.<br>2. Check user's total Impact Score. | Score increments by exactly **+15 points**. A transaction entry is created in the user's ledger. | High | High |
| **TC-CIS-402** | Points for Issue Verification | 1. Citizen verifies another user's issue report.<br>2. Check Impact Score. | Score increments by exactly **+5 points**. | High | High |
| **TC-CIS-403** | Points for Resolution Voting | 1. Citizen votes to approve or reject an officer's resolution proof.<br>2. Check Impact Score. | Score increments by exactly **+10 points**. | High | High |
| **TC-CIS-404** | Points for Discussion Activity | 1. Citizen posts a helpful comment in an active issue thread.<br>2. Check Impact Score. | Score increments by **+2 points** (up to a daily capped limit of 10 points to prevent spamming). | Medium | High |
| **TC-CIS-405** | Points for Quiz Completion | 1. Citizen completes a civic education/safety quiz in the app.<br>2. Check Impact Score. | Score increments by **+20 points** upon passing the quiz. | Medium | Medium |
| **TC-CIS-406** | Points for Community Contributions | 1. Admin awards points to a citizen for exceptional neighborhood cleanup participation.<br>2. Check Impact Score. | Score increments by the custom designated amount (e.g., **+30 points**). | Medium | Medium |
| **TC-CIS-407** | Point Deduction for Flagged Content | 1. Citizen's reported issue is deleted by an admin as "Spam/Fake".<br>2. Inspect citizen's score ledger. | The originally awarded +15 points are subtracted. Total score recalculates correctly. Negative totals are prevented. | High | High |
| **TC-CIS-408** | Duplicate Reward Prevention | 1. Trigger network lag and submit quiz completion multiple times rapidly.<br>2. Inspect point transactions. | Only 1 completion transaction is written; subsequent requests are rejected. Score increases by 20 points only. | Critical | Critical |
| **TC-CIS-409** | Score Re-indexing/Auditing | 1. Trigger a batch re-evaluation of user scores by summing their transaction ledger. | The user's cached `impactScore` field matches the ledger sum exactly. Discrepancies are flagged and corrected. | High | High |
| **TC-CIS-410** | Score Persistence | 1. Earn points, log out, restart database, log in. | Cumulative points are preserved. Leaderboard rankings are updated dynamically. | High | Critical |

---

## SECTION 5: COMMUNITY DISCUSSION TESTING

Validates the real-time comment and communication systems, ensuring constructive dialogue and proper permission control during and after the issue lifecycle.

| Test Case ID | Test Scenario | Test Steps | Expected Result | Severity | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-DIS-501** | Citizen Post Comment | 1. Log in as a Citizen.<br>2. Post "Tree limb cleared, but debris remains" in an active issue thread. | Comment renders immediately with standard font styling and a timestamp. User's trust badge is displayed. | High | High |
| **TC-DIS-502** | Officer Comment Rendering | 1. Log in as an assigned Department Officer.<br>2. Post a progress update in the discussion. | Comment is styled with a distinct border/background and carries a high-visibility `OFFICER` badge and department name. | High | High |
| **TC-DIS-503** | Admin Comment Rendering | 1. Log in as an Administrator.<br>2. Post an official notice in the discussion. | Comment is highlighted in a distinct colorway (e.g., deep amber or crimson) and displays an `ADMINISTRATOR` badge. | High | High |
| **TC-DIS-504** | Discussion Thread Ordering | 1. Post multiple comments in quick succession.<br>2. Inspect order. | Comments are sorted strictly chronologically (ascending, oldest first) to maintain conversational flow. | Medium | High |
| **TC-DIS-505** | Thread Context Separation | 1. Open issue #101 and issue #102.<br>2. Post comment "Test #101" in issue #101.<br>3. Inspect discussions. | Comment appears only in issue #101 thread. Absolute isolation between issue discussions. | High | Critical |
| **TC-DIS-506** | Read-Only After Closure | 1. Close an issue (move status to `CLOSED`).<br>2. Load the discussion panel as any user. | The comment input box and "Submit" button are hidden/disabled. A notice reads "This discussion is locked as the issue is resolved." | High | Critical |
| **TC-DIS-507** | Write Block on Closed Issues | 1. Submit a POST request to `/api/issues/:id/comments` for a closed issue. | Server rejects the request with `403 Forbidden` and message "Comments cannot be posted to closed issues." | Critical | Critical |
| **TC-DIS-508** | Discussion Rate Limiting (Spam Check) | 1. Send 10 comments in 5 seconds via a script. | Server triggers rate limiting at 3 comments/10 seconds. Returns `429 Too Many Requests`. | High | High |

---

## SECTION 6: LEADERBOARD TESTING

Tests the accuracy and performance of the gamified tracking systems, verifying real-time sorting, monthly resets, and historical consistency.

| Test Case ID | Test Scenario | Test Steps | Expected Result | Severity | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-LDB-601** | Monthly Leaderboard Updates | 1. View the Monthly Leaderboard.<br>2. Complete a high-point action (e.g., Quiz: +20).<br>3. Refresh the leaderboard. | User's score updates. Their monthly ranking advances dynamically relative to other active local users. | High | High |
| **TC-LDB-602** | Lifetime Leaderboard Updates | 1. View Lifetime Leaderboard.<br>2. Verify score matches user's historical cumulative points. | User is ranked accurately across all-time platform participation. Scores are checked against lifetime totals in the db. | High | High |
| **TC-LDB-603** | Tie-Breaker Handling | 1. User A and User B both have exactly 250 Monthly Points.<br>2. Inspect leaderboard positions. | Ranking uses a consistent tie-breaker (e.g., user who reached 250 first gets the higher rank, or alphabetical sorting). No duplicate rank numbers if not desired. | Medium | High |
| **TC-LDB-604** | Real-Time Rank Calculations | 1. User is at rank #15.<br>2. User gains 100 points, surpassing rank #14, #13, and #12.<br>3. Verify rank indicator display on user dashboard. | User dashboard instantly displays "My Rank: #12" in <500ms without manual page refreshes. | Medium | High |
| **TC-LDB-605** | Monthly Reset Behavior | 1. System clock reaches 00:00:00 on the 1st of the month.<br>2. Check Monthly Leaderboard scores. | All users' Monthly Points reset to **0**. Monthly leaderboard is cleared for the new cycle. Lifetime scores remain untouched. | High | Critical |
| **TC-LDB-606** | Reset Archival Integrity | 1. Inspect historical leaderboard records for previous months. | The system has written a snapshot of the top rankings to a historical logs collection for profile badge awards. | High | High |
| **TC-LDB-607** | Performance with Large User Base | 1. Populate the database with 10,000 active citizen profiles with random scores.<br>2. Load Leaderboard page. | Leaderboard loads in <300ms using indexed DB queries (e.g., sorting on `monthlyPoints` index). | High | High |

---

## SECTION 7: COMMUNITY HERO AWARD TESTING

Validates the monthly award program, ensuring the system awards badges correctly, manages ties gracefully, and displays historical accomplishments on citizen profiles.

| Test Case ID | Test Scenario | Test Steps | Expected Result | Severity | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-CHA-701** | Monthly Winner Selection | 1. End of month cron job runs.<br>2. User A is #1 on the Monthly Leaderboard.<br>3. Inspect User A profile. | User A is automatically awarded the "Community Hero Badge" for that month (e.g., "Hero of June 2026"). | High | High |
| **TC-CHA-702** | Winner Selection under Tie Conditions | 1. User A and User B are tied at #1 with 1200 points at the end of the month.<br>2. Cron job executes. | Both users are designated as co-winners. Both receive the Community Hero Award badge, or the tie-breaker rule applies. | High | High |
| **TC-CHA-703** | Award Profile Persistence | 1. Log in as a previous Community Hero winner.<br>2. Check user profile and comments. | The historical award badge remains prominently displayed as a permanent badge of trust and honor. | Medium | High |
| **TC-CHA-704** | Historical Winners Gallery | 1. Navigate to the "Hall of Fame" or Leaderboard Archives section.<br>2. Verify list of historical winners. | The records are accurate, displaying names, districts, and the month of their award, loading successfully. | Low | Medium |
| **TC-CHA-705** | Synchronization of Reset & Award | 1. Trigger month-end transition.<br>2. Check sequence of operations. | 1. Snapshot taken. 2. Winner awarded. 3. Scores reset. Sequence must execute as a single atomic transaction to prevent missing awards. | High | Critical |

---

## SECTION 8: AUTHORIZATION TESTING

Strict role-based access control (RBAC) testing to ensure users cannot manipulate trust metrics, verify their own contributions, or elevate their privileges.

| Test Case ID | Test Scenario | Test Steps | Expected Result | Severity | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-AUT-801** | Self-Upvote API Block | 1. Citizen A bypasses the UI and sends a POST request directly to `/api/citizens/upvote` with their own userID as candidate. | Request rejected with `403 Forbidden`. No record is modified. | Critical | Critical |
| **TC-AUT-802** | Multi-Upvote API Block | 1. Send parallel HTTP requests using a multithreaded script to upvote Citizen B multiple times simultaneously. | Database constraints or transactions prevent race conditions. Only 1 upvote is committed. Subsequent ones fail with `400`. | Critical | Critical |
| **TC-AUT-803** | Self-Verification Block | 1. Issue reporter attempts to verify/approve their own issue's resolution via direct API call. | Request is blocked or has a weight of 0 to ensure community consensus is independent. | High | Critical |
| **TC-AUT-804** | Unauthorized Score Adjustment | 1. Log in as Citizen A.<br>2. Send a PUT/PATCH request to `/api/users/profile` with body `{"impactScore": 9999}`. | Request is rejected or the `impactScore` attribute is omitted from mass assignment. Score remains unchanged. | Critical | Critical |
| **TC-AUT-805** | Unauthorized Badge Assignment | 1. Send POST request to `/api/admin/assign-badge` using a standard Citizen session. | Request is rejected with `403 Forbidden` / "Admin access required." Badge is not assigned. | Critical | Critical |

---

## SECTION 9: ABUSE & FRAUD TESTING

Simulates adversarial attacks (vote-farming, bot networks, collusion, spam) to evaluate the security controls of the trust system.

| Test Case ID | Test Scenario | Test Steps | Expected Result | Severity | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-ABU-901** | Sybil Account Injection | 1. Script attempts to register 100 citizen accounts with fake details to farm upvotes. | Blocked by SMS/phone verification, email validation, or captcha controls. Duplicate device/IP registrations are flagged. | Critical | Critical |
| **TC-ABU-902** | Vote Farming (Circular Alliances) | 1. Citizen A upvotes B, B upvotes C, C upvotes A.<br>2. Trigger AI or system heuristic auditing. | The system flags circular voting networks or sudden rapid local upvote clusters for administrative review. | High | High |
| **TC-ABU-903** | Mass Upvote Scripting | 1. Execute an automated script calling the upvote endpoint across multiple users at 50 requests per second. | API rate limiters trigger, temporarily banning the client IP/Token. Database locks prevent consistency issues. | Critical | Critical |
| **TC-ABU-904** | Score Farming via Issue Spam | 1. Script creates 50 fake issues and immediately deletes/cancels them to accumulate reporting points (+15 each). | Deleting/marking an issue as invalid automatically rolls back the points. High frequency filing triggers rate limiting. | High | Critical |
| **TC-ABU-905** | Discussion Spam | 1. Automated script posts random string comments in 20 different active issue threads. | Anti-spam filters block identical or fast-sequenced comments. Messages are flagged, and account is throttled. | High | High |
| **TC-ABU-906** | Collusive Resolution Verification | 1. Officer submits fake resolution.<br>2. Officer colludes with 5 fake accounts to instantly verify. | Verification timestamps are checked. Simultaneous verifications from same subnet/IP are flagged, and closure is delayed. | Critical | Critical |

---

## SECTION 10: DATA INTEGRITY TESTING

Verifies that the underlying database schemas, transactions, and relational states remain perfectly consistent and durable.

| Test Case ID | Test Scenario | Test Steps | Expected Result | Severity | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-INT-101** | Atomic Vote Commits | 1. Trigger high-concurrency upvoting on Citizen A.<br>2. Check consistency of candidate's `upvotes` count vs. the total number of records in the `upvotes_ledger` collection. | The numbers match exactly. No phantom votes or lost votes due to uncommitted database writes. | High | Critical |
| **TC-INT-102** | Badge Cascade on Account Delete | 1. Delete Citizen A's account from the system.<br>2. Check all outstanding upvote records and discussions. | Upvotes cast by Citizen A are archived or removed; Citizen B's upvote count updates; discussion comments show "Deleted User". | Medium | High |
| **TC-INT-103** | Atomic Score Transactions | 1. Citizen completes multiple point-earning actions in a single session.<br>2. Interrupt network connection mid-action. | No half-completed transactions. System either commits full points or rolls back completely (All-or-Nothing). | High | Critical |
| **TC-INT-104** | Discussion Thread Deletion Integrity | 1. Administrator deletes an issue from the system.<br>2. Query comments collection for that issue ID. | All comments associated with that issue ID are deleted or archived in a cascade to prevent orphaned records. | High | High |
| **TC-INT-105** | Audit Trail Append-Only Enforce | 1. Attempt to edit or delete an entry in the issue history audit log. | DB rules block update/delete queries on audit log collections. Log entries are strictly append-only. | Critical | Critical |

---

## SECTION 11: API TESTING

Explores the robust and secure behavior of all Feature 5 API endpoints under valid, invalid, and malformed payload inputs.

| Test Case ID | Test Scenario | Test Steps | Expected Result | Severity | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-API-1101** | Upvote Endpoint (POST) | 1. Send valid request: `POST /api/citizens/upvote` with body `{"targetUserId": "user-abc"}` and valid JWT. | Response: `200 OK` with `{"success": true, "data": {"currentUpvotes": 2}}`. | High | High |
| **TC-API-1102** | Upvote Mismatched Ward (POST) | 1. Send request with target user registered in a different ward. | Response: `400 Bad Request` with `{"success": false, "error": {"message": "Mismatch ward location"}}`. | High | High |
| **TC-API-1103** | Verification Endpoint (POST) | 1. Send valid request: `POST /api/issues/:issueId/verify` with body `{"approve": true, "comment": "Looks fully clean!"}`. | Response: `200 OK` with `{"success": true, "data": {"approvalCount": 3}}`. | High | High |
| **TC-API-1104** | Missing Payload Fields | 1. Send comment payload with missing `comment` body field when trying to submit a rejection. | Response: `400 Bad Request` with `{"success": false, "error": {"message": "Rejection requires reason details"}}`. | Medium | High |
| **TC-API-1105** | Malformed JSON Payload | 1. Send invalid JSON structure (e.g., missing closing brace) to `/api/issues/:issueId/comments`. | Response: `400 Bad Request` with clear parsing error response. | Low | High |
| **TC-API-1106** | JWT Token Tampering | 1. Modify JWT signature by editing a single character, then send comment request. | Response: `401 Unauthorized` or `403 Forbidden`. Thread write blocked. | Critical | Critical |

---

## SECTION 12: UI/UX TESTING

Tests client-side design patterns, responsive layouts, accessibility compliance, and overall engagement feedback.

| Test Case ID | Test Scenario | Test Steps | Expected Result | Severity | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-UIX-1201** | Verification Progress Bar | 1. Open an issue pending verification.<br>2. Inspect progress display. | Displays a polished visual meter showing `[⭐⭐⭐⭐⭐]` or a progress bar reflecting approvals (e.g., "3 of 5 community confirmations"). | Medium | High |
| **TC-UIX-1202** | Dynamic Trust Badge Animations | 1. A user profile card or comment gains Community Verified status.<br>2. Inspect badge. | The badge renders with a soft entry transition, utilizing high-quality SVGs and clear tooltips on hover. | Low | Medium |
| **TC-UIX-1203** | Discussion Auto-Scroll | 1. Open a discussion thread containing 25 comments.<br>2. Post a new comment. | The thread list automatically scrolls smoothly to the bottom, focusing on the newly added comment. | Medium | High |
| **TC-UIX-1204** | Mobile Leaderboard Layout | 1. View the leaderboard on a 375px mobile screen width (e.g., iPhone SE). | No text clipping. Columns (Rank, Name, Score) fit cleanly. Tap targets are at least 44px high. | High | High |
| **TC-UIX-1205** | WCAG 2.1 Accessibility Check | 1. Test text elements on the Leaderboard and Discussion cards for color contrast. | Contrast ratios are >= 4.5:1. Aria labels exist for the interactive Upvote and Verify buttons. | Medium | High |
| **TC-UIX-1206** | Verification Toast Notifications | 1. Submit a verification vote.<br>2. Observe top right corner. | A friendly, non-blocking green success toast notification appears: "+10 Impact points added! Thank you for verifying." | Low | High |

---

## SECTION 13: PERFORMANCE TESTING

Validates performance limits under load, ensuring the application handles concurrent community actions without crashing or lagging.

| Test Case ID | Test Scenario | Test Steps | Expected Result | Severity | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-PRF-1301** | 100 Concurrent Upvotes | 1. Simulate 100 concurrent HTTP POST requests to upvote Citizen A within 1 second. | Server handles all requests. No database locking timeouts. Total duration <3 seconds. | High | High |
| **TC-PRF-1302** | 100 Concurrent Verifications | 1. Simulate 100 concurrent citizen approvals on issue #202 within 1 second. | Transaction integrity is maintained. The confirmation count updates precisely without double-counting. | High | High |
| **TC-PRF-1303** | 100 Concurrent Discussion Comments | 1. Simulate 100 users typing and submitting comments in the same active thread at once. | Server handles throughput. Clients receive real-time comment additions sequentially without interface freeze. | High | High |
| **TC-PRF-1304** | Cached Leaderboard Refreshes | 1. Trigger 500 requests to `/api/analytics/leaderboard` within 10 seconds. | Server serves cached leaderboard data (TTL: 5 minutes) rather than hitting database query engine every time. CPU stays <20%. | High | High |
| **TC-PRF-1305** | Batch Score Recalculation | 1. Trigger full-system score recalculation for 5,000 active users. | Executes as a background job without blocking main Express event loop or UI response times. | Medium | High |

---

## SECTION 14: PRODUCTION READINESS REVIEW

### 🚨 TRUST & RISK METRICS ASSESSMENT

1. **The "Neighbor Cartel" Risk (High)**
   - *Risk description*: Groups of local citizens colluding to systematically upvote each other's profiles to attain "Community Verified" status or farm "Impact points" without genuine neighborhood engagement.
   - *Safeguard*: Implement an automated heuristic monitor that flags accounts showing high-frequency mutual upvotes (e.g., User A upvotes B, and B upvotes A within a 24-hour window) and suspends point accrual for those interactions pending audit.

2. **The "Ghost Town" Problem (Medium)**
   - *Risk description*: In newly added or lower-population wards, an issue may never reach the 5 citizen confirmations required for closure because there are fewer than 5 active citizens registered in that area.
   - *Safeguard*: Implement a dynamic, tiered threshold. If a ward has fewer than 10 registered citizens, scale down the confirmation requirement to 3, or allow neighboring-ward verified citizens to assist in validation.

3. **Leaderboard demotivation / "Runaway Winner" Effect (Low)**
   - *Risk description*: A small group of highly active users establishing a massive, insurmountable lead on the Lifetime Leaderboard, discouraging new users from attempting to participate.
   - *Safeguard*: Focus primary visual attention on the Monthly Leaderboard, highlighting the "Active Monthly Hero" and resetting scores regularly to ensure everyone starts on a level playing field each cycle.

---

## SECTION 15: HACKATHON JUDGE REVIEW

### 🏆 SCORECARD & CRITIQUE

| Criteria | Score (1-10) | Brutally Honest Judge Feedback |
| :--- | :--- | :--- |
| **Innovation** | **9 / 10** | Integrating a localized, peer-to-peer trust ledger directly into a civic service ticket system is brilliant. It successfully moves away from standard top-down government reporting and introduces decentralized community verification. |
| **Community Engagement** | **10 / 10** | Excellent gamification loops! By rewarding citizens for reporting, discussions, and quizzes, you've created an addictive positive-sum game. The Monthly Leaderboard and Community Hero Awards are highly motivating. |
| **Citizen Trust** | **9 / 10** | Strong design of the "Community Verified Citizen" badge. It relies on localized social proof rather than easily manipulated automated parameters, giving real human authority to active neighborhood champions. |
| **Transparency** | **8 / 10** | The chronological audit trail is robust. However, showing the breakdown of *who* verified an issue is critical to prevent officers from creating fake accounts to "auto-close" their own tickets. Transparency needs to be absolute. |
| **Scalability** | **7 / 10** | The database design requires careful optimization. Querying upvote lists, comments, and leaderboard rankings dynamically can cause bottlenecks as the platform scales. Caching layers are mandatory. |
| **Social Impact** | **10 / 10** | Tremendous! This directly empowers local neighborhoods, gives voice to marginalized communities, and builds immense trust between municipal authorities and the public they serve. |
| **Production Readiness** | **8 / 10** | The core workflow is sound. To be 100% ready for the real world, the system must incorporate the anti-abuse/cartel detection heuristics and SMS/verification checks outlined in Section 14. |
| **OVERALL SCORE** | **8.7 / 10** | **Outstanding Concept & Execution!** With small enhancements to anti-fraud detection and query caching, this is a winning product that can transform municipal accountability globally. |
