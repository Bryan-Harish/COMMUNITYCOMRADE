# Feature 7 Design: Civic Engagement, Gamification, Quiz Platform & Community Hero Program

## Document Metadata
* **Author:** Senior Solution Architect, Product Designer & Gamification Expert
* **Status:** Approved / Ready for Implementation
* **Target Version:** v1.7.0
* **System Context:** Integrates seamlessly into the existing MongoDB/Mongoose Express-Vite Full-Stack codebase.

---

## 1. High-Level Architecture

The Gamification & Civic Engagement engine is designed as a modular, event-driven service to maintain loose coupling with existing core systems (Issue Reporting, Verification, Moderation). This avoids contaminating core business logic with scoring and badge-triggering side effects.

### System Topology & Data Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CLIENT ARCHITECTURE (Vite)                      │
│                                                                        │
│  ┌───────────────────────┐   ┌───────────────────┐   ┌──────────────┐  │
│  │   Citizen Dashboard   │   │    Quiz Engine    │   │  Leaderboard │  │
│  │ (Badges, Rep, Impact) │   │ (Reactive UI/TMR) │   │    Views     │  │
│  └───────────┬───────────┘   └─────────┬─────────┘   └──────┬───────┘  │
└──────────────┼─────────────────────────┼────────────────────┼──────────┘
               │ Secure JSON Web Token   │                    │
               ▼                         ▼                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        API ROUTER / GATEWAY (Express)                  │
│                                                                        │
│        /api/gamification/*             /api/quizzes/*                  │
└──────────────┬─────────────────────────┬───────────────────────────────┘
               │                         │
               ▼                         ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     CORE BACKEND SERVICES (Node.js)                    │
│                                                                        │
│  ┌───────────────────────────┐         ┌─────────────────────────────┐ │
│  │   Gamification Engine     │◄────────┤        Quiz Manager         │ │
│  │ (XP, CIS, Badge Evaluator)│         │ (Session State, Anti-Cheat) │ │
│  └─────────────┬─────────────┘         └──────────────┬──────────────┘ │
│                │                                      │                │
│                │ Event Bus (In-Memory/EventEmitter)   │                │
│                ▼                                      │                │
│  ┌───────────────────────────┐                        │                │
│  │    Civic Event Handler    │◄───────────────────────┘                │
│  │ (Listens: Issue, Verify)  │                                         │
│  └─────────────┬─────────────┘                                         │
└────────────────┼──────────────────────────────────────┼────────────────┘
                 ▼                                      ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        PERSISTENCE LAYER (MongoDB)                     │
│                                                                        │
│  ┌───────────────────────────┐         ┌─────────────────────────────┐ │
│  │   Gamification Profiles   │         │  Quizzes, Questions, Temp   │ │
│  │  (Rep, Badges, Lifetimes) │         │       Active Sessions       │ │
│  └───────────────────────────┘         └─────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

### Architectural Principles

1. **Decoupled Scoring (Observer Pattern):** Actions like reporting an issue or performing a verification dispatch domain events (`ISSUE_SUBMITTED`, `VERIFICATION_APPROVED`, `RESOLUTION_SUBMITTED`) to a centralized `CivicEventBus`. The `GamificationEngine` consumes these events asynchronously to calculate updates to user profiles.
2. **Stateless Quiz Sessions:** Quiz sessions are tracked via cryptographically signed temporary state tokens (JSON Web Tokens specifically generated for the quiz session) or transient database collection documents to guarantee the server holds absolute authority over elapsed time.
3. **Optimistic UI Updates with Server Authority:** Dashboard components update XP dynamically, but all authority regarding level-ups, badge awards, and leaderboard standings remains locked on the server.

---

## 2. Gamification Architecture

The gamification architecture establishes a multi-layered progression system containing **Points/XP**, a highly contextual **Community Impact Score (CIS)**, and a tiered **Reputation System**.

### 2.1 Points & Experience (XP) Engine
XP measures overall system usage and knowledge accumulation. It serves as the primary currency for level progression.

| Action Trigger | XP Awarded | Maximum Daily Frequency Limit |
| :--- | :--- | :--- |
| **Quiz Participation (Complete)** | 10 XP | 2 times / day |
| **Quiz Answer Correct (Each)** | 20 XP | 10 times / day (5 questions per quiz) |
| **Issue Report Submitted** | 50 XP | 3 times / day |
| **First Verification on an Issue** | 30 XP | 5 times / day |
| **Resolution Verification Completed** | 40 XP | 5 times / day |
| **Evidence Media Uploaded (First)** | 15 XP | 3 times / day |

### 2.2 Community Impact Score (CIS)
Unlike XP, which tracks activity volume, the **Community Impact Score (CIS)** strictly measures the *efficacy, quality, and truthfulness* of a citizen's contribution to their community. CIS has positive, neutral, and negative modifiers.

$$\text{CIS} = (I_{\text{reported}} \times 10) + (V_{\text{accurate}} \times 5) + (R_{\text{resolved}} \times 15) - (A_{\text{abuse}} \times 50)$$

Where:
* $I_{\text{reported}}$: Number of reported issues validated by officers/community consensus.
* $V_{\text{accurate}}$: Number of verifications matching the final validated status of an issue.
* $R_{\text{resolved}}$: Resolved issues reported by this citizen.
* $A_{\text{abuse}}$: Spam/abuse reports filed against the user that were verified as malicious by admins. (CIS can go negative, indicating a low-reputation actor).

### 2.3 Reputation Levels
Reputation represents a user's tier of trustworthiness within the city. Higher levels grant enhanced capabilities.

```
┌────────────────────────────────────────────────────────┐
│                   REPUTATION PYRAMID                   │
├────────────────────────────────────────────────────────┤
│ Level 6: Civic Champion       (10,000+ XP, 800+ CIS)   │
│ Level 5: Community Hero       (5,000 XP, 400+ CIS)     │
│ Level 4: Community Leader     (2,500 XP, 200+ CIS)     │
│ Level 3: Trusted Citizen      (1,000 XP, 100+ CIS)     │
│ Level 2: Active Citizen       (300 XP, 30+ CIS)        │
│ Level 1: New Citizen          (0 XP, 0 CIS)            │
└────────────────────────────────────────────────────────┘
```

#### Capability Matrix by Reputation:
* **New Citizen:** Can submit issues, view public maps, and take quizzes.
* **Active Citizen:** Unlocks custom locality-specific message boards.
* **Trusted Citizen:** Verifications carry double weight in automated pre-officer consensus algorithms.
* **Community Leader:** Access to community moderation tools (flagging suspicious issues/verifications for priority review).
* **Community Hero & Civic Champion:** Highlighted posts, fast-track issue assignment queues to municipal officers, and priority invites to local city planning forums.

---

## 3. Quiz System Design

The Quiz System is designed to challenge citizens' civic knowledge dynamically while enforcing strict, auditable transaction cycles.

### 3.1 Quiz Execution Flow

1. **Initiation:** The user clicks "Start Quiz". The client issues a POST request to `/api/quizzes/start`. The server:
   * Checks the daily limit constraint.
   * Generates a randomized deck of 5 questions from the requested category.
   * Shuffles options for each question.
   * Creates a `QuizAttempt` tracking document with `startedAt` set to the current database timestamp.
   * Returns the payload (excluding correct answers) along with a `sessionId`.
2. **Iteration (Step-by-Step Question Presentation):**
   * The UI displays one question at a time.
   * A 10-second reactive countdown timer starts in the browser.
   * *Scenario A (Answered within timer):* User clicks an option. Client sends an intermediate state update `/api/quizzes/submit-answer` containing the answer and time-taken.
   * *Scenario B (Timer expires):* Browser triggers automated timeout, marking the question as skipped, and automatically advances to the next question.
3. **Completion:** When all 5 questions are answered/skipped, the client triggers `/api/quizzes/complete`. The server validates the timestamps of each answer against the initiation timestamp.

### 3.2 Anti-Cheating & Abuse Guardrails

To prevent automated scoring farms, browser inspector scraping, and side-channel cheating, the system implements six core defense-in-depth mechanisms:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          ANTI-CHEAT PROTECTION                          │
├─────────────────────────────────────────────────────────────────────────┤
│ [1] Payload Sanitization   ► No correct answers included in UI payloads│
│ [2] Server-Side Shuffling  ► Question and option sequences randomized    │
│ [3] Cryptographic Session  ► JWT session token tracks elapsed time      │
│ [4] Time Window Validation ► Answers rejected if delta > 11.5s          │
│ [5] Cool-down Locks        ► Retake limits enforced on account-level    │
│ [6] Entropy Verification   ► Speedrun & pattern analysis flags bots      │
└─────────────────────────────────────────────────────────────────────────┘
```

1. **Zero-Knowledge UI Payload:** The correct answer options are *never* returned to the client in the initiation API. Scoring occurs exclusively server-side.
2. **Multi-Option Randomization:** The backend shuffles the questions selected from the pool and randomly shuffles the index representation of the four options. Option "A" for User 1 might be Option "C" for User 2.
3. **Dual-Gate Timer Checks:**
   * Each submission must arrive within `elapsedTime <= 11.5 seconds` of the *previous* question's starting threshold (10s limit + 1.5s networking buffer).
   * Submissions arriving past the network buffer are forcefully evaluated as `Incorrect/Skipped`.
4. **Rate-Limit Cooling:** Users are limited to **2 quiz attempts per day** across the entire platform, preventing brute-force database scraping.
5. **Session Lockout:** Starting a quiz session places a transactional lock on the user's gamification profile. They cannot initiate another session until the active one is closed or times out (automatic expiration after 2 minutes).

---

## 4. Database Design

The schema design utilizes MongoDB collections structured with validation constraints. Models are designed to be compatible with Mongoose.

```
                       ┌─────────────────────────┐
                       │       User Model        │
                       └────────────┬────────────┘
                                    │ 1:1
                                    ▼
┌───────────────────────────────────────────────────────────────────────┐
│                      GamificationProfile Schema                        │
├───────────────────────────────────────────────────────────────────────┤
│ _id: ObjectId                                                         │
│ userId: ObjectId (Ref: User)                                          │
│ xp: Number (default: 0)                                               │
│ communityImpactScore: Number (default: 0)                             │
│ reputationLevel: Number (default: 1)                                  │
│ lifetimeStats: { quizScoreRatio: Number, totalVerifications: Number } │
│ currentBadges: [ ObjectId (Ref: Badge) ]                              │
│ earnedAchievements: [{                                                │
│    achievementId: ObjectId (Ref: Achievement),                        │
│    unlockedAt: Date                                                   │
│ }]                                                                    │
│ quizDailyCount: { date: String, count: Number }                       │
└───────────────────────────────────┬───────────────────────────────────┘
                                    │
                  ┌─────────────────┴─────────────────┐
                  ▼                                   ▼
┌───────────────────────────────────┐   ┌───────────────────────────────┐
│        QuizAttempt Schema         │   │      CommunityHeroAward       │
├───────────────────────────────────┤   ├───────────────────────────────┤
│ _id: ObjectId                     │   │ _id: ObjectId                 │
│ profileId: ObjectId (Ref: Profile)│   │ userId: ObjectId (Ref: User)  │
│ categoryId: String                │   │ awardedMonth: String (YYYY-MM)│
│ startedAt: Date                   │   │ pointsContributed: Number     │
│ answers: [{                       │   │ citation: String              │
│    questionId: ObjectId,          │   │ featuredBadge: ObjectId       │
│    chosenIndex: Number,           │   └───────────────────────────────┘
│    isCorrect: Boolean,            │
│    secondsTaken: Number           │
│ }]                                │
│ finalScore: Number                │
│ completed: Boolean                │
└───────────────────────────────────┘
```

### 4.1 Question & Category Schemas

```typescript
// Mongoose Models Representation

import mongoose, { Schema, Document } from 'mongoose';

export interface IQuestion extends Document {
  categoryId: string; // 'traffic', 'constitution', 'safety', etc.
  questionText: string;
  options: string[];  // Exactly 4 options
  correctAnswerIndex: number; // Server-side validation index (0-3)
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
}

const QuestionSchema = new Schema<IQuestion>({
  categoryId: { type: String, required: true, index: true },
  questionText: { type: String, required: true },
  options: { type: [String], required: true, validate: [arr => arr.length === 4, 'Must have exactly 4 choices'] },
  correctAnswerIndex: { type: Number, required: true, min: 0, max: 3 },
  difficulty: { type: String, enum: ['EASY', 'MEDIUM', 'HARD'], default: 'MEDIUM' },
  isActive: { type: Boolean, default: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });
```

### 4.2 GamificationProfile Schema

```typescript
export interface IGamificationProfile extends Document {
  userId: mongoose.Types.ObjectId;
  xp: number;
  communityImpactScore: number;
  reputationLevel: number;
  locality: string;
  city: string;
  badges: Array<{
    badgeId: mongoose.Types.ObjectId;
    unlockedAt: Date;
  }>;
  achievements: Array<{
    achievementId: mongoose.Types.ObjectId;
    unlockedAt: Date;
  }>;
  quizUsageLimit: {
    lastAttemptDate: string; // "YYYY-MM-DD"
    attemptsCount: number;
  };
}

const GamificationProfileSchema = new Schema<IGamificationProfile>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  xp: { type: Number, default: 0, index: true },
  communityImpactScore: { type: Number, default: 0, index: true },
  reputationLevel: { type: Number, default: 1 },
  locality: { type: String, required: true, index: true },
  city: { type: String, required: true, index: true },
  badges: [{
    badgeId: { type: Schema.Types.ObjectId, ref: 'Badge' },
    unlockedAt: { type: Date, default: Date.now }
  }],
  achievements: [{
    achievementId: { type: Schema.Types.ObjectId, ref: 'Achievement' },
    unlockedAt: { type: Date, default: Date.now }
  }],
  quizUsageLimit: {
    lastAttemptDate: { type: String, default: "" },
    attemptsCount: { type: Number, default: 0 }
  }
});
```

### 4.3 QuizAttempt Schema

```typescript
export interface IQuizAttempt extends Document {
  userId: mongoose.Types.ObjectId;
  categoryId: string;
  questions: mongoose.Types.ObjectId[];
  answers: Array<{
    questionId: mongoose.Types.ObjectId;
    selectedOptionIndex: number;
    timeSpentSeconds: number;
    isCorrect: boolean;
  }>;
  score: number; // Correct answers out of 5
  isCompleted: boolean;
  startedAt: Date;
  completedAt?: Date;
}

const QuizAttemptSchema = new Schema<IQuizAttempt>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  categoryId: { type: String, required: true },
  questions: [{ type: Schema.Types.ObjectId, ref: 'Question' }],
  answers: [{
    questionId: { type: Schema.Types.ObjectId, ref: 'Question' },
    selectedOptionIndex: { type: Number, required: true },
    timeSpentSeconds: { type: Number, required: true },
    isCorrect: { type: Boolean, required: true }
  }],
  score: { type: Number, default: 0 },
  isCompleted: { type: Boolean, default: false },
  startedAt: { type: Date, default: Date.now },
  completedAt: { type: Date }
});
```

---

## 5. Leaderboard Design

Leaderboards act as the primary visual incentive mechanism. Because high-concurrency database sorting can degrade application performance, a tiered indexing strategy is implemented.

### 5.1 Leaderboard Classifications & Dimensions

```
┌────────────────────────────────────────────────────────────────────────┐
│                        LEADERBOARD SEGMENTATION                        │
├────────────────────────────────────────────────────────────────────────┤
│ [1] Temporal:  ► Monthly (Resets 1st of month)  ► Lifetime (No resets)  │
│ [2] Spatial:   ► Locality-Specific              ► City-Wide            │
│ [3] Functional:► Quiz Leaderboard               ► Community Impact     │
└────────────────────────────────────────────────────────────────────────┘
```

1. **Monthly Leaderboard:** Highlights active contributors based on XP earned *within the current calendar month*.
2. **Lifetime Leaderboard:** Displays overall rank based on cumulative XP since account registration.
3. **Locality & City Leaderboards:** Geospatial leaderboards tracking who is contributing the most within local ward areas (e.g., "Indiranagar", "Koramangala") and the broader municipal boundaries.
4. **Quiz & Knowledge Leaderboards:** Ranked by quiz completion rates and correct-answer ratios.

### 5.2 Monthly Reset & Snapshot Strategy

To allow friendly competition to reset fairly each month while maintaining historical integrity:

* **Archival Trigger:** At exactly `00:00:00 UTC` on the first day of every calendar month, an automated cron job runs.
* **Materialization step:**
  1. Compiles the top 50 users from the active Monthly leaderboard.
  2. Creates permanent documents in the `LeaderboardHistory` collection containing individual metrics.
  3. Evaluates the top 3 participants as eligible for the "Community Hero" program.
* **Reset step:** The monthly XP delta tracker inside the users' gamification database profiles is reset to 0.

---

## 6. Achievement Design

Achievements are one-time milestones representing unique accomplishments on the platform.

```
┌────────────────────────────────────────────────────────────────────────┐
│                          ACHIEVEMENT PIPELINE                          │
├────────────────────────────────────────────────────────────────────────┤
│ Action Event   ► Gamification Bus  ► Rules Engine   ► Unlocked State   │
│ (e.g. Issue)   ► (Evaluates Type)  ► (Checks Count) ► (Writes DB Doc)  │
└────────────────────────────────────────────────────────────────────────┘
```

### 6.1 Achievement Registry

| System Identifier | Visual Label | Category | Earning Condition/Rule | XP Reward |
| :--- | :--- | :--- | :--- | :--- |
| `civic_starter` | **First Responder** | Issue Reporting | Report first civic issue that gets validated. | 100 XP |
| `citizen_patrol` | **First Witness** | Verification | Log your first verification on another citizen's issue. | 50 XP |
| `scholar_rank_1` | **Civic Scholar** | Knowledge | Score 5/5 on any single quiz. | 100 XP |
| `scholar_rank_3` | **Constitutionalist** | Knowledge | Complete 10 quizzes successfully with an average >80%. | 250 XP |
| `guardian_road` | **Road Guardian** | Traffic Safety | Correctly report and verify 10 traffic hazard issues. | 200 XP |
| `guardian_eco` | **Green Warden** | Environment | Correctly report and resolve 10 solid waste/sewage issues. | 200 XP |
| `hero_verified` | **Pillar of Truth** | Reputation | Obtain 50 consecutive verification matches without error. | 500 XP |

---

## 7. Badge Design

Badges represent continuous, earned accolades displayed prominently on user profile cards and comments.

```
┌────────────────────────────────────────────────────────────┐
│                       BADGE HIERARCHY                      │
├────────────────────────────────────────────────────────────┤
│ Tier 4: Community Hero        - End-of-month top honors    │
│ Tier 3: Knowledge Ambassador  - High quiz performance      │
│ Tier 2: Community Verifier    - Proven accuracy rating     │
│ Tier 1: Verified Citizen      - Base ID authentication     │
└────────────────────────────────────────────────────────────┘
```

### 7.1 Badge Registry & Criteria

```
Badge: [Verified Citizen]
 ├── Tier: Tier 1 (Base Level)
 └── Criteria: Successfully verified government ID (Aadhaar/Passport/Driving License).
 
Badge: [Community Verifier]
 ├── Tier: Tier 2 (Intermediate)
 └── Criteria: Maintain a verification accuracy rate above 90% with at least 25 verifications logged.

Badge: [Quiz Champion]
 ├── Tier: Tier 2 (Intermediate)
 └── Criteria: Earn 5 or more perfect scores (5/5) across 3 distinct quiz categories.

Badge: [Issue Resolver]
 ├── Tier: Tier 3 (Advanced)
 └── Criteria: Successfully cooperate to resolve 20+ neighborhood infrastructure reports.

Badge: [Knowledge Ambassador]
 ├── Tier: Tier 3 (Advanced)
 └── Criteria: Unlocked after earning perfect scores on all available Quiz Categories.

Badge: [Community Hero]
 ├── Tier: Tier 4 (Elite Prestige)
 └── Criteria: Earned by finishing in the Top 3 of the Monthly Leaderboard.
```

---

## 8. Community Hero Program

The **Community Hero Program** is designed to recognize and celebrate elite citizens, turning virtual accomplishments into tangible community stature.

```
      Month Ends (Cron Event)
                 │
                 ▼
     Evaluate Top 3 Contributors
                 │
                 ▼
   Check Integrity & Abuse Filters  ──(Passed?)──► No: Exclude & Evaluate Next
                 │ Yes
                 ▼
    Auto-Issue "Community Hero" Badge
                 │
                 ▼
     Hall of Fame Database Entry
                 │
                 ▼
   Prominent Highlight on Map & Feeds
```

### 8.1 Selection Protocol & Eligibility Rules

* **Selection Schedule:** Automated evaluation runs on the **last day of every calendar month at 23:59:59 UTC**.
* **Eligibility Boundaries:**
  * Must rank in the Top 3 of the **Monthly Community Impact Leaderboard**.
  * Must have maintained a **Verification Accuracy Score of >= 85%**.
  * **Zero Active Suspensions or Spam Flags:** If the user has any unresolved abuse reports or moderation violations on file for that month, they are disqualified, and the award rolls over to the next eligible user.
  * **Cooldown Rule:** A citizen can win "Community Hero" at most **once every three months** to prevent monopoly and keep other citizens motivated.

### 8.2 Hero Stature Rewards

1. **Digital Badge & Border Highlight:** The user's avatar is outlined with a special golden border, and the "Community Hero" badge is pinned to their cards for 30 days.
2. **Hall of Fame Archive:** The user's profile and a brief summary of their contributions (e.g., *"Helped resolve 14 potholes in Indiranagar Ward"*) is written to the global "Civic Hall of Fame" dashboard.
3. **Double Weight Vote:** For the next month, their verifications count with triple priority in crowdsourced consensus.

---

## 9. Analytics Design

To empower administrators and city managers to optimize civic engagement campaigns, a rich analytics dashboard compiles gamification telemetries.

### 9.1 Key Performance Metrics (KPIs)

* **Daily Quiz Engagement:** Total quizzes initiated vs. completed, tracking the drop-off rate of users mid-quiz.
* **Difficulty Curve Assessment:** Automatically flags questions where the failure rate is above 75% (indicating a potential trick question or overly difficult content) or below 10% (overly simple).
* **Civic Engagement Velocity:** Tracks the correlation between gamification level-ups and the number of active civic resolutions logged.
* **Badge Distribution Spread:** Measures user progression density to ensure badges are neither too easy to acquire nor completely unobtainable.

---

## 10. API Contracts

All gamification-specific endpoints are versioned under `/api/v1/` and secured behind standard JWT authentication headers.

### 10.1 Citizen Endpoints

#### `GET /api/v1/gamification/profile`
* **Description:** Retrieve the calling user's XP, CIS, current badges, and achievement list.
* **Response Payload:**
```json
{
  "success": true,
  "data": {
    "userId": "603d75c92f8fb814ec372a91",
    "xp": 1420,
    "communityImpactScore": 185,
    "reputationLevel": 3,
    "reputationName": "Trusted Citizen",
    "stats": {
      "totalQuizzesCompleted": 14,
      "correctAnswersRatio": 0.82,
      "verificationsLogged": 31
    },
    "badges": [
      { "id": "b1", "name": "Verified Citizen", "icon": "shield-check", "unlockedAt": "2026-06-01T12:00:00Z" },
      { "id": "b2", "name": "Quiz Champion", "icon": "award", "unlockedAt": "2026-06-15T18:30:00Z" }
    ],
    "achievements": [
      { "id": "a1", "name": "First Witness", "unlockedAt": "2026-06-02T09:12:00Z" }
    ]
  }
}
```

#### `POST /api/v1/quizzes/start`
* **Description:** Initiates a secure quiz session. Returns randomized questions.
* **Request Payload:**
```json
{
  "categoryId": "traffic"
}
```
* **Response Payload:**
```json
{
  "success": true,
  "sessionId": "qz_82a931ef19c3b",
  "questions": [
    {
      "id": "q_104",
      "questionText": "What does a flashing yellow traffic light indicate?",
      "options": [
        "Stop completely and wait",
        "Proceed with caution",
        "Yield to oncoming traffic only",
        "Speed up to clear the intersection"
      ]
    }
  ]
}
```

#### `POST /api/v1/quizzes/submit-answer`
* **Description:** Submits answer for a single question. Validated server-side.
* **Request Payload:**
```json
{
  "sessionId": "qz_82a931ef19c3b",
  "questionId": "q_104",
  "selectedOptionIndex": 1,
  "timeSpentSeconds": 4.2
}
```
* **Response Payload:**
```json
{
  "success": true,
  "isCorrect": true,
  "correctOptionIndex": 1
}
```

---

## 11. Security Considerations

To protect the integrity of the community metrics and prevent abuse:

1. **State Injection Protections:**
   * Question indices are shuffled server-side.
   * Users cannot predict option keys based on static asset definitions.
   * Client-side timing states are systematically verified against the database session timeline.
2. **Sybil/Collusion Attack Mitigation:**
   * Users from the same IP, subnet, or location-sharing rings are flagged if they consistently verify each other's issues.
   * Verifying an issue uploaded by a close contact yields 0 CIS/XP.
3. **Farming Restrictions:**
   * Quizzes taken after reaching the daily count threshold continue to display content but award **0 XP** and **0 CIS**, discouraging script-based grinding.

---

## 12. Future Scalability Considerations

As CommunityComrade transitions to a city-wide scale:

* **Redis Sorted Sets (ZSET) integration:** Leaderboard queries can be offloaded from MongoDB aggregate pipelines to memory-resident Redis Sorted Sets. This enables constant-time $O(\log N)$ rank lookups and scores retrieval for millions of active citizens.
* **Locality Geohashing:** Utilizing coordinate indexing (`2dsphere` in MongoDB) to instantly calculate locality leaderboards within dynamic circular ranges, rather than relying on strict static ward boundary labels.
* **AI-Generated Quizzes:** Utilizing the Gemini API to analyze trending local issues (e.g., a surge in water-logging reports) and automatically synthesize and inject highly relevant educational quiz questions on waste disposal and flood preparedness.

---
*End of Design Specification Document.*
