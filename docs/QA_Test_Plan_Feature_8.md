# QA Test Plan: Feature 8 - Community Hero Recognition System

This document delivers a production-grade, exhaustive test suite designed to battle-test **Feature 8: Community Hero Recognition System** of the CommunityComrade platform. As a Principal QA Engineer, Gamification Auditor, Community Recognition Specialist, Product Owner, and Hackathon Judge, this plan is formatted to identify logical edge cases, timing anomalies, scoring leaks, and security vulnerabilities under heavy scaling.

---

## SECTION 1: COMMUNITY HERO SELECTION TESTING

Validates the logic that automatically or manually selects the top contributor for the month, handles ties, and assigns the Hero status.

| Test Case ID | Test Scenario | Test Steps | Expected Result | Severity | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-CHS-101** | Hero Selection Logic (Highest Score) | 1. Fast forward to end of month.<br>2. Citizen A has highest monthly impact score.<br>3. Trigger Hero Selection Cron Job. | Citizen A is awarded "Community Hero". Profile is updated and logged in historical records. | Critical | Critical |
| **TC-CHS-102** | Tie Handling Logic | 1. Citizen A and Citizen B both have exactly 5000 XP at month end.<br>2. Trigger Hero Selection. | System uses secondary criteria (e.g., earlier achievement time, highest lifetime score, or awards both) as defined by business rules without crashing. | High | High |
| **TC-CHS-103** | Monthly Winner Selection Edge Case (Zero Activity) | 1. No users have activity for a given month.<br>2. Trigger Hero Selection. | System detects zero activity, skips hero assignment, and logs a neutral event. No empty/null profiles are displayed. | Medium | Medium |
| **TC-CHS-104** | Winner Persistence Verification | 1. Trigger Hero Selection for previous month.<br>2. Fast forward 5 days. | The selected hero remains the "Hero of the Month" for the entirety of the new month until the next cycle. | High | High |
| **TC-CHS-105** | Officer/Admin Exclusion | 1. Admin/Officer account has the highest score.<br>2. Trigger Hero Selection. | Admin/Officer accounts are excluded. The highest scoring legitimate Citizen is selected. | High | High |

---

## SECTION 2: IMPACT SCORE INTEGRATION TESTING

Ensures all community actions appropriately funnel into the Impact Score calculation used for Hero selection.

| Test Case ID | Test Scenario | Test Steps | Expected Result | Severity | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-ISI-201** | Issue Reporting Contribution | 1. Citizen reports an issue.<br>2. Issue is verified. | Citizen's Impact Score increases by exact configured amount (e.g., +50 XP). Ledger logs "Issue Reported". | High | High |
| **TC-ISI-202** | Verification Contribution | 1. Citizen verifies another user's issue.<br>2. Check Impact Score. | Score increases by verification reward (e.g., +10 XP). | High | High |
| **TC-ISI-203** | Quiz Contribution | 1. Citizen completes daily quiz perfectly.<br>2. Check Impact Score. | Score increases (e.g., +20 XP). Score does not increment on quiz retakes on same day. | High | High |
| **TC-ISI-204** | Discussion/Comment Contribution | 1. Citizen leaves constructive comment on issue.<br>2. Check Impact Score. | Score increases according to rules (e.g., +5 XP, max 5 times/day). | Medium | High |
| **TC-ISI-205** | Impact Score Updates Sync | 1. Perform multiple mixed actions quickly.<br>2. Check overall Monthly Score vs Lifetime Score. | Both Monthly and Lifetime scores update accurately without race conditions dropping points. | High | High |

---

## SECTION 3: RANKING TESTING

Validates the sorting algorithms and real-time/batch updates for user rankings based on Impact Scores.

| Test Case ID | Test Scenario | Test Steps | Expected Result | Severity | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-RNK-301** | Monthly Ranking Reset | 1. Simulate transition to 1st of new month.<br>2. Check Monthly Rankings. | All monthly scores are reset to 0. Ranks are cleared/recalculated. | Critical | Critical |
| **TC-RNK-302** | Lifetime Ranking Continuity | 1. Simulate transition to 1st of new month.<br>2. Check Lifetime Rankings. | Lifetime scores remain unaffected and continue accumulating. Rankings persist. | Critical | Critical |
| **TC-RNK-303** | Position Changes on Action | 1. Rank 2 user completes a quiz, overtaking Rank 1's score.<br>2. View Leaderboard. | Rank 2 user instantly updates to Rank 1. Previous Rank 1 drops to Rank 2. | High | High |
| **TC-RNK-304** | Tie Scenarios Display | 1. Three users have identical scores.<br>2. View Leaderboard. | UI displays shared ranks (e.g., three #4s, next is #7) or clearly defines tie-breaker visually. | Medium | Medium |

---

## SECTION 4: COMMUNITY HERO DASHBOARD TESTING

Validates the UI presentation of the current and past Community Heroes on the public/citizen dashboard.

| Test Case ID | Test Scenario | Test Steps | Expected Result | Severity | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-CHD-401** | Current Hero Display | 1. Navigate to Community Dashboard.<br>2. Check "Hero of the Month" section. | Highlights the current hero with a special badge, avatar, and total monthly impact score. | High | High |
| **TC-CHD-402** | Previous Hero Visibility | 1. Check Historical Heroes/Hall of Fame section. | Displays a chronological list/grid of past heroes (Month/Year) with their winning scores. | Medium | High |
| **TC-CHD-403** | Contribution Statistics Rendering | 1. Click on current Hero's profile card. | Displays a breakdown of their contributions (e.g., 10 Issues, 50 Verifications) validating why they won. | Low | Medium |
| **TC-CHD-404** | Ranking Display Accuracy | 1. Check top 10 leaderboard widget. | Accurately mirrors backend data. Current hero is #1 for the finalized month. | High | High |

---

## SECTION 5: HISTORICAL RECORD TESTING

Validates that historical awards are securely stored and retrievable, without being overwritten by new cycles.

| Test Case ID | Test Scenario | Test Steps | Expected Result | Severity | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-HRT-501** | Previous Winners Storage | 1. Simulate 3 months of hero cycles.<br>2. Query hero history database. | DB contains exactly 3 distinct hero records bound to their respective months and years. | Critical | Critical |
| **TC-HRT-502** | Historical Accuracy After Account Deletion | 1. User wins Hero in Jan.<br>2. User deletes account in March.<br>3. Check Jan Hero record. | Hero record persists (anonymized if required by privacy laws) but history does not crash. | High | High |
| **TC-HRT-503** | Month to Month Tracking | 1. User wins back-to-back months (Jan & Feb). | System records two separate distinct awards for the user. UI shows "2x Hero" or lists them twice. | Medium | High |

---

## SECTION 6: AUTHORIZATION TESTING

Validates role-based access controls regarding the issuance and modification of Hero statuses and scores.

| Test Case ID | Test Scenario | Test Steps | Expected Result | Severity | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-AUT-601** | User Cannot Assign Awards | 1. Citizen attempts to call API endpoint to force-assign Hero status. | Request rejected with `403 Forbidden`. | Critical | Critical |
| **TC-AUT-602** | User Cannot Modify Rankings/Scores | 1. Citizen attempts to PATCH their own impact score payload. | Request rejected with `403 Forbidden` or `400 Bad Request`. Scores are server-authoritative. | Critical | Critical |
| **TC-AUT-603** | Admin Manual Override | 1. Admin logs in and manually assigns "Hero" status to a user for outstanding offline real-world action. | Status is assigned, logged in audit trail, and reflected on dashboard. | High | High |

---

## SECTION 7: ABUSE TESTING

Simulates malicious actions intended to farm scores and unfairly win the Community Hero award.

| Test Case ID | Test Scenario | Test Steps | Expected Result | Severity | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-ABU-701** | Score Farming via Fake Issues | 1. Script creates 100 fake spam issues in 5 minutes. | System rate-limits issue creation. Admin flagging removes fake issues and deducts points, penalizing user. | Critical | Critical |
| **TC-ABU-702** | Leaderboard Manipulation (Vote Ring) | 1. 5 users collude to upvote/verify only each other's fake issues. | Anomaly detection flags unusual clustered verification graphs for admin review. | High | High |
| **TC-ABU-703** | Duplicate Contribution Rewards | 1. Intercept network request for quiz completion and replay it 50 times. | Only the first request credits points. Replays are ignored due to idempotency keys/session completion flags. | Critical | Critical |

---

## SECTION 8: DATA INTEGRITY TESTING

Verifies that score logic, leaderboard caching, and transaction ledgers remain mathematically sound.

| Test Case ID | Test Scenario | Test Steps | Expected Result | Severity | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-DIT-801** | Score Consistency Audit | 1. Sum all logged transactions for a user.<br>2. Compare to user's cached total impact score. | Sum exactly matches the cached total. No floating-point errors or dropped transactions. | High | High |
| **TC-DIT-802** | Award Persistence Through Migrations | 1. Simulate a DB schema migration.<br>2. Check past Hero records. | All historical hero relationships and badges remain intact and linked to correct User IDs. | High | High |
| **TC-DIT-803** | Point Deductions on Issue Rejection | 1. User earns 50 XP for issue.<br>2. Admin rejects issue as spam. | The 50 XP is deducted from both Monthly and Lifetime scores. Leaderboards adjust accordingly. | High | High |

---

## SECTION 9: API TESTING

Validates REST endpoint compliance, schema validation, and error handling for Recognition APIs.

| Test Case ID | Test Scenario | Test Steps | Expected Result | Severity | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-API-901** | GET /api/gamification/heroes/current | 1. Request current hero. | Returns `200 OK` with sanitized user profile (Name, Avatar, Score, Badges). Excludes PII (Email, Phone). | High | High |
| **TC-API-902** | GET /api/gamification/heroes/history | 1. Request hero history with pagination parameters. | Returns `200 OK` with array of historical heroes sorted by month descending. | Medium | High |
| **TC-API-903** | POST /api/admin/heroes/manual-assign | 1. Call endpoint without Admin JWT token. | Returns `401 Unauthorized` or `403 Forbidden`. | Critical | Critical |
| **TC-API-904** | Malformed Leaderboard Request | 1. GET `/api/gamification/leaderboard?limit=-5&sort=SELECT*`. | Returns `400 Bad Request` with validation error. No SQL/NoSQL injection succeeds. | High | High |

---

## SECTION 10: UI/UX TESTING

Ensures the Recognition Dashboard and Leaderboards are accessible, responsive, and visually engaging.

| Test Case ID | Test Scenario | Test Steps | Expected Result | Severity | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-UIX-1001** | Mobile Responsiveness of Leaderboard | 1. Load leaderboard on 320px width screen. | Avatars, names, and scores shrink gracefully. No horizontal scrolling required. | Medium | High |
| **TC-UIX-1002** | Hero Presentation Animations | 1. Load Community Hero dashboard. | Hero card uses celebratory CSS animations/confetti effectively without causing performance lag. | Low | Medium |
| **TC-UIX-1003** | Accessibility (Screen Readers) | 1. Navigate Leaderboard using VoiceOver/NVDA. | Ranks, names, and scores are read sequentially with proper ARIA labels. | Medium | High |
| **TC-UIX-1004** | Empty State Handling | 1. Load dashboard on Day 1 of platform launch (no heroes yet). | UI shows a welcoming placeholder (e.g., "Will you be our first hero?") instead of broken components. | Medium | High |

---

## SECTION 11: PERFORMANCE TESTING

Validates the system's ability to handle massive concurrent read requests on the leaderboard and heavy write loads at month-end recalculations.

| Test Case ID | Test Scenario | Test Steps | Expected Result | Severity | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-PRF-1101** | Leaderboard Read Load (10,000 req/min) | 1. Simulate massive traffic to Leaderboard page during a campaign. | Requests are served from Redis/memory cache in <100ms. Database is not overwhelmed. | Critical | High |
| **TC-PRF-1102** | Month-End Recalculation Scalability | 1. Simulate month-end cron job for 50,000 citizens. | Batch process computes winner and resets scores asynchronously in chunks, avoiding memory overflow or DB locking. | High | High |
| **TC-PRF-1103** | Concurrent Action Scoring | 1. 1000 users complete actions simultaneously. | Impact scores update via atomic operations (e.g., `$inc` in MongoDB) with zero lost updates. | High | Critical |

---

## SECTION 12: PRODUCTION READINESS REVIEW

This section evaluates the operational risks, privacy safeguards, and deployment considerations for Feature 8.

### 1. Key Technical Risks Identified
* **Leaderboard Caching:** Real-time calculation of leaderboards across thousands of users on every page load will crash the database. Caching (e.g., updating every 5 minutes) is strictly required.
* **Score Farming:** Without rate limits on daily points or sophisticated spam detection, bad actors will dominate the leaderboard, destroying legitimate community morale.
* **Month-End Cron Failures:** If the cron job selecting the hero fails, the state might get stuck. Idempotent background jobs with retry mechanisms are necessary.

### 2. Safeguards Implemented
* **Rate Limits:** Caps on daily XP from non-verified actions.
* **Atomic Updates:** Using DB-level increment operations to prevent race conditions during rapid point accumulation.

### 3. Hackathon Demo Recommendations
* **Simulate Time:** Build an admin debug button to "Fast Forward to Month End" to instantly demonstrate the Hero Selection logic during a live pitch.
* **Visual Polish:** Ensure the Hero profile has distinct visual flair (gold borders, badges) to make the gamification aspect pop for judges.

---

## SECTION 13: HACKATHON JUDGE REVIEW

Reviewing the **Community Hero Recognition System** as a technical judge:

### 🏆 JUDGE EVALUATION MATRIX

| Evaluation Criteria | Score | Rationale & Constructive Feedback |
| :--- | :--- | :--- |
| **Citizen Engagement** | **9.5 / 10** | **Exceptional.** Public recognition is a massive psychological driver. The "Hero of the Month" creates a strong intrinsic loop for citizens to actively participate. |
| **Community Building** | **9.0 / 10** | **Highly Effective.** Shifting focus from just "reporting potholes" to celebrating civic champions fundamentally changes the tone of the platform from a complaint box to a community hub. |
| **Innovation** | **8.0 / 10** | **Solid.** Leaderboards are standard gamification, but linking them specifically to verified civic infrastructure improvements is a highly practical and novel application. |
| **Social Impact** | **9.0 / 10** | **Strong.** Encourages proactive citizenship. Recognizing heroes creates localized role models. |
| **Scalability** | **8.5 / 10** | **Good.** As long as leaderboards are cached and not calculated on-the-fly via heavy SQL/Aggregation queries on every page load, it will scale perfectly. |
| **Production Readiness** | **8.5 / 10** | **High.** Requires strict anti-spam rules. The deduction of points upon issue rejection is a smart necessary mechanism to prevent farming. |
| **OVERALL GRADE** | **8.75 / 10** | **A powerful engagement engine.** This feature acts as the glue that keeps citizens returning to the app long after their initial complaint is resolved. |

#### Judge Comments & Critiques
> *"Feature 8 elevates the entire platform. While issue tracking is the utility, the Community Hero system is the heart. My main technical concern is 'score farming' — ensure your presentation addresses how you prevent users from spamming fake reports just to top the leaderboard. Building a manual Admin override to strip points or disqualify users is a pragmatic necessity you must include. Visually, the Hall of Fame is a fantastic touch."*
