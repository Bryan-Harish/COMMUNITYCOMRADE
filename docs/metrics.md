# Citizen Engagement Metrics and Score Formulas

This document details the exact mathematical formulas, event triggers, and unlock criteria used to compute citizen engagement levels, reputation ranks, leaderboard standings, achievements, and badges on the Civic Engagement Platform.

---

## 1. Score Categories

### 1.1 Community Impact Score (CIS)
The **Community Impact Score (CIS)** measures a citizen's active, direct contribution to resolving neighborhood issues, participating in verification, and improving public spaces.

* **Starting Value:** `0 CIS`
* **Trigger Formulas:**
  * **Reporting an Issue (`ISSUE_REPORTED`):** `+10 CIS`
  * **Verifying an Issue (`ISSUE_VERIFIED`):** `+5 CIS`
  * **Resolving/Verifying a Resolution (`RESOLUTION_VERIFIED`):** `+15 CIS`
  * **Uploading Helpful Evidence (`HELPFUL_EVIDENCE_UPLOADED`):** `+5 CIS`
  * **Completing a Quiz (`QUIZ_COMPLETED`):** `+5 CIS`

---

### 1.2 Lifetime Score (XP / Lifetime Leaderboard Score)
The **Lifetime Score** represents the total, cumulative Experience Points (XP) earned by a citizen since creating their account.

* **Starting Value:** `0 XP`
* **Trigger Formulas:**
  * **Reporting an Issue (`ISSUE_REPORTED`):** `+25 XP`
  * **Verifying an Issue (`ISSUE_VERIFIED`):** `+10 XP`
  * **Resolving/Verifying a Resolution (`RESOLUTION_VERIFIED`):** `+15 XP`
  * **Uploading Helpful Evidence (`HELPFUL_EVIDENCE_UPLOADED`):** `+20 XP`
  * **Completing a Quiz (`QUIZ_COMPLETED`):**
    * **Base Participation Reward:** `+10 XP`
    * **Performance Bonus:** `+20 XP` for every correct answer (Maximum `+200 XP` per quiz containing 10 questions)
    * *Formula:* `XP = 10 + (Correct Answers * 20)`
  * **Being Awarded Community Hero (`COMMUNITY_HERO_AWARDED`):** `+100 XP`
  * **Unlocking an Achievement:** Adds the specific achievement's XP reward (`+20` to `+150 XP`) to the cumulative total.

---

### 1.3 Monthly Score (Monthly Leaderboard Score)
The **Monthly Score** tracks the subset of XP earned by a citizen within the current calendar month. It encourages continuous active participation and resets at the end of each month.

* **Formula:** Sum of all XP actions earned during the current month.
* **Standings:** Reset to `0` at the start of every calendar month.

---

### 1.4 Leaderboard standing
* **Global Standings:** Ranked based on either `monthlyLeaderboardScore` (for Monthly tab) or `lifetimeLeaderboardScore` (for Lifetime tab).
* **Ward Standings:** Filters citizens who are registered in the same `registeredWard` and ranks them based on their `lifetimeLeaderboardScore`. Limited to the **Top 5** citizens.

---

## 2. Ranks, Criteria, and Achievements

### 2.1 Citizen Reputation Levels
A citizen's **Reputation Rank** determines their stature in the community and is derived using a combined threshold of **cumulative XP** and **Community Impact Score (CIS)**:

| Level | Reputation Name | Required Lifetime XP | Required Community Impact Score (CIS) |
|:---:|:---|:---|:---|
| **1** | New Citizen | `0 XP` | `0 CIS` |
| **2** | Active Citizen | `≥ 300 XP` | `≥ 30 CIS` |
| **3** | Trusted Citizen | `≥ 1000 XP` | `≥ 100 CIS` |
| **4** | Community Leader | `≥ 2500 XP` | `≥ 200 CIS` |
| **5** | Community Hero | `≥ 5000 XP` | `≥ 400 CIS` |
| **6** | Civic Champion | `≥ 10000 XP` | `≥ 800 CIS` |

---

### 2.2 Achievements Criteria
Achievements are automated, milestone-driven honors earned as citizens perform specific civic actions:

| Achievement Name | Code | Unlock Threshold | XP Reward |
|:---|:---|:---|:---:|
| **First Report** | `FIRST_REPORT` | Reports `≥ 1` civic issues | `+50 XP` |
| **First Verification** | `FIRST_VERIFICATION` | Verifies `≥ 1` civic issues reported by others | `+30 XP` |
| **Quiz Beginner** | `QUIZ_BEGINNER` | Completes `≥ 1` civic awareness quizzes | `+20 XP` |
| **Quiz Master** | `QUIZ_MASTER` | Completes `≥ 10` civic awareness quizzes | `+100 XP` |
| **Top Verifier** | `TOP_VERIFIER` | Verifies `≥ 50` civic issues | `+150 XP` |

---

### 2.3 Badge Criteria
Badges are elite medals displayed on profiles for continuous expertise in dedicated areas.

#### 2.3.1 Citizen Badges & Eligibility Criteria

Citizens can earn the following badges based on their civic contributions, activity tracking, and educational quiz scores:

| Badge Name | Icon | Tier | Eligibility & Unlock Threshold | Description / Purpose |
|:---|:---|:---:|:---|:---|
| **Active Verifier** | `ShieldCheck` | Tier 1 | Automatically unlocked upon profile creation / base identity verification. | Successfully verified base identity. |
| **Community Verifier** | `CheckSquare` | Tier 2 | Verifies `≥ 5` civic issues reported by other neighbors (`stats.issuesVerified >= 5`). | Maintain a high community presence with consistent verification votes. |
| **Quiz Champion** | `Award` | Tier 2 | Completes `≥ 20` civic learning and awareness quizzes (`stats.quizzesCompleted >= 20`). | Demonstrates elite understanding of municipal guidelines. |
| **Issue Resolver** | `Wrench` | Tier 2 | Reports `≥ 5` civic issues OR completes `≥ 5` resolution verifications (`stats.issuesReported >= 5 || stats.resolutionsVerified >= 5`). | Cooperates actively to flag and resolve infrastructure problems. |
| **Knowledge Ambassador** | `BookOpen` | Tier 3 | Earns a perfect 10/10 score on all available Quiz categories. | Fully certified in municipal policy, citizen duties, and local governance. |
| **Community Hero** | `Trophy` | Tier 3 | Finishes in the Top 3 of the monthly ward leaderboard. | Celebrates outstanding engagement and public service. |
| **Top Verifier** | `Medal` | Tier 3 | Submits `≥ 100` verification votes for civic issues or resolutions (`stats.issuesVerified >= 100`). | The ultimate badge for vigilance and verification commitment. |

---

#### 2.3.2 Department Officer Badges & Eligibility Criteria

Department Officers can earn professional accolades based on resolution efficiency, accuracy, and resident satisfaction ratings:

| Badge Name | Icon | Tier | Eligibility & Unlock Threshold | Description / Purpose |
|:---|:---|:---:|:---|:---|
| **Active Officer** | `ShieldAlert` | Tier 1 | Successfully finishes officer onboarding and department validation. | Certified municipal department responder. |
| **First Responder** | `Zap` | Tier 2 | Resolves or schedules an issue within 2 hours of report creation for `≥ 10` issues. | Awarded for exceptional response speed and urgency. |
| **Resolution Master** | `Wrench` | Tier 2 | Successfully resolves and logs `≥ 25` civic infrastructure reports. | Elite officer milestone for dedication to municipal resolution. |
| **Department Sentinel** | `Star` | Tier 3 | Maintains an average resident rating of `≥ 4.8` stars across `≥ 10` completed resolutions. | Highly regarded for quality of work and citizen satisfaction. |
| **Civic Guardian** | `Shield` | Tier 3 | Successfully resolves and logs `≥ 100` municipal infrastructure issues. | The highest career honor for outstanding service to municipal restoration. |

---

### 2.4 Community Hero Criteria
The **Community Hero** award is a distinguished title granted to citizens for exceptional public engagement, or outstanding dedication during local crisis events. It can be manually assigned by department administrators or triggered by specialized events.
* **Reward:** `+100 XP`

---

### 2.5 Hall of Fame Criteria
The **Hall of Fame** is reserved for elite community members who have demonstrated long-term, high-impact contributions to municipal enhancement.
* **Selection:** Periodic administrative selections based on continuous top standings in monthly/lifetime leaderboards and exceptional resolution ratios.
* **Display:** Includes the specific award month (e.g. `2026-06`), contribution score, and special hero category designation (e.g., "Infrastructure Sentinel", "Civic Champion").
