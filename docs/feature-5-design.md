# Design Document: AI Resolution Validation & Community Verification (Feature 5)

This design document outlines the system architecture, database changes, collections schema, API contracts, AI validation logic, citizen verification workflow, security considerations, and gamification hooks for CommunityComrade Feature 5: **AI Resolution Validation & Community Verification**.

---

## 1. High-Level Architecture

The AI Resolution Validation & Community Verification module secures the closing of civic complaints. It ensures that department officers do not falsely mark issues as resolved by combining **automated multimodal AI audits** (powered by Gemini) with **decentralized geo-fenced community consensus**.

### 1.1 Architectural Overview
```
+----------------------------------------------------------------------------------------+
|                                  High-Level Architecture                               |
+----------------------------------------------------------------------------------------+

  [Department Officer]
         │
         ▼  (Submits resolution with Notes, Photos/Videos, Location)
  ┌──────────────────────────────┐
  │ 1. POST /api/issues/:no/res  │
  └──────────────┬───────────────┘
                 │
                 ▼  (Trigger AI comparison)
  ┌──────────────────────────────┐
  │ 2. Gemini Multimodal Engine  │◄──── compares Original Issue vs. Resolution Media/Geo
  └──────────────┬───────────────┘
                 │
                 ▼  (Updates status to 'RESOLUTION_PENDING_VERIFICATION')
  ┌──────────────────────────────┐
  │ 3. MongoDB State Transition  │
  └──────────────┬───────────────┘
                 │
                 ▼  (Enable Verification Panel for Local Citizens)
  [Verified Citizens in Locality]
         │
         ├───────────────────────────────────┐
         ▼                                   ▼
  ┌──────────────────────────────┐   ┌──────────────────────────────┐
  │ 4A. Approve (VERIFY_RES)     │   │ 4B. Reject (REJECT_RES)      │
  └──────────────┬───────────────┘   └──────────────┬───────────────┘
                 │                                  │
                 ▼ (Consensus Reach: 5 Approvals)   ▼ (Consensus Reach: 5 Rejections)
  ┌──────────────────────────────┐   ┌──────────────────────────────┐
  │ 5A. Permanent 'CLOSED'       │   │ 5B. Rolled back to 'REOPENED'│
  │     & Leaderboard Rewards    │   │     & Audit / Admin Alert    │
  └──────────────────────────────┘   └──────────────────────────────┘
```

### 1.2 Core Actors & Pathway Matrix

| Actor | Access Gate | Actions & Functional Scope |
| :--- | :--- | :--- |
| **Department Officer** | Authenticated, assigned to issue, geo-verified within 50m. | Submits resolution payload. Trigger automatic AI validation and transition issue to `RESOLUTION_PENDING_VERIFICATION`. |
| **Verified Citizen** | Authenticated, `status` is verified, registered in same Ward/Locality. | Performs `VERIFY_RESOLUTION` or `REJECT_RESOLUTION`. Optionally posts verification comments. |
| **Administrator (Admin)** | Authenticated, has `ADMIN` role. | Oversees verification backlogs. Can bypass community verification to force close or manually reopen if needed. |

---

## 2. Workflow Design

The workflow enforces a strict sequential protocol before an issue can reach the `CLOSED` state:

```
                      +-----------------------------+
                      |  Issue is 'IN_PROGRESS'     |
                      +--------------┬--------------+
                                     │
                        (Officer submits resolution)
                                     ▼
                      +-----------------------------+
                      |  Trigger Gemini API Audit   |
                      +--------------┬--------------+
                                     │
                                     ▼
                      +-----------------------------+
                      | Is AI output processed?     |
                      +──────┬───────────────┬──────+
                             │               │
                    (Success)│               │(Failed/Error)
                             ▼               ▼
  +-----------------------------------+     +-----------------------------------+
  | Set status to                     |     | Set status to                     |
  | 'RESOLUTION_PENDING_VERIFICATION' |     | 'RESOLUTION_PENDING_VERIFICATION' |
  | with AI Confidence, Summary, &    |     | with "AI review degraded" warning |
  | validation results.               |     | and flag for priority review.     |
  +----------------─┬────────────────-+     +----------------─┬────────────────-+
                    │                                         │
                    └──────────────────┬──────────────────────┘
                                       │
                                       ▼
                      +-----------------------------+
                      | Open for Local Citizen Vote |
                      +────────┬─────────────┬──────+
                               │             │
                    (Verify)   │             │ (Reject)
                               ▼             ▼
                      +──────────────+     +──────────────+
                      | Approval ++  |     | Rejection ++ |
                      +────────┬──────+     +────────┬──────+
                               │             │
                               ▼             ▼
                      +──────────────+     +──────────────+
                      | Approvals>=5?|     |Rejections>=5?|
                      +──────┬───────+     +──────┬───────+
                             │                    │
                        (Yes)│                (Yes)│
                             ▼                    ▼
                      +──────────────+     +──────────────+
                      | Set 'CLOSED' |     |Set 'REOPENED'|
                      | Award Points |     | Audit Logged |
                      +--------------+     +--------------+
```

---

## 3. Database Changes

To integrate AI validation and citizen verification seamlessly, the following schema properties and indexes are introduced to the **`Issue`** collection.

### 3.1 Updates to `Issue` Schema
The `status` enumeration field is extended to include `RESOLUTION_PENDING_VERIFICATION`. Additionally, we track verification tallies and the multi-dimensional AI payload directly inside the document.

*   `status`: String (Enum) - Add `'RESOLUTION_PENDING_VERIFICATION'`.
*   `verificationApprovalCount`: Number (Default: `0`) - Count of verified citizen approvals.
*   `verificationRejectionCount`: Number (Default: `0`) - Count of verified citizen rejections.
*   `aiValidation`: Object (Optional) - Captured when the officer submits a resolution:
    *   `resolutionLikelyValid`: Boolean - True if AI determines the resolution images/video match the original issue context.
    *   `confidence`: Number - Score from `0.0` to `1.0` indicating AI confidence in its comparison.
    *   `summary`: String - Human-readable comparison summary (e.g. "Pothole filled with fresh asphalt; matched surrounding road markers").
    *   `reasoning`: String - Detailed logical steps the model took (e.g. "Before image shows a 1m diameter pothole. After image shows filled surface. Textures match surrounding aggregate. Location delta is 12 meters, well within margin of error.").
    *   `validatedAt`: Date - Timestamp of the AI evaluation.

### 3.2 MongoDB Indexes

```javascript
// Index to quickly search for issues awaiting local citizen verification
db.issues.createIndex({ "status": 1, "reporterWard": 1 });

// Compound index for tracking SLA on pending validations
db.issues.createIndex({ "status": 1, "resolvedAt": -1 });
```

---

## 4. Collections Specification

We introduce the **`ResolutionVerification`** collection to prevent double voting and maintain a detailed, tamper-proof record of community reviews.

### 4.1 `ResolutionVerification` Collection (Mongoose/MongoDB)
This collection tracks every vote cast by local verified citizens on a resolved issue.

```json
{
  "$jsonSchema": {
    "bsonType": "object",
    "required": [
      "_id",
      "issueNumber",
      "citizenUserId",
      "citizenName",
      "action",
      "ward",
      "pointsAwarded",
      "timestamp"
    ],
    "properties": {
      "_id": {
        "bsonType": "objectId",
        "description": "Unique identifier of the verification record"
      },
      "issueNumber": {
        "bsonType": "string",
        "description": "The unique CC-xxxx custom issue number"
      },
      "citizenUserId": {
        "bsonType": "objectId",
        "description": "Reference to the voting Citizen's User document"
      },
      "citizenName": {
        "bsonType": "string",
        "description": "Plaintext name of the voting citizen for rapid UI rendering"
      },
      "action": {
        "bsonType": "string",
        "enum": ["VERIFY", "REJECT"],
        "description": "Whether the citizen confirmed or disputed the repair"
      },
      "comment": {
        "bsonType": "string",
        "maxLength": 500,
        "description": "Optional citizen comment regarding the resolution quality"
      },
      "ward": {
        "bsonType": "string",
        "description": "The registered ward of the voting citizen to verify geographic eligibility"
      },
      "pointsAwarded": {
        "bsonType": "number",
        "description": "Points awarded for casting this vote"
      },
      "timestamp": {
        "bsonType": "date",
        "description": "The date and time the vote was cast"
      }
    }
  }
}
```

### 4.2 Constraints & Indexes
```javascript
// Unique index to prevent Sybil attacks: one vote per citizen per issue
db.resolution_verifications.createIndex(
  { "issueNumber": 1, "citizenUserId": 1 },
  { "unique": true }
);

// Query index for fetching comments and votes on an issue
db.resolution_verifications.createIndex({ "issueNumber": 1, "action": 1 });
```

---

## 5. API Contracts

The following API endpoints facilitate the AI audit and citizen voting workflows.

### 5.1 `POST /api/issues/:issueNumber/validate-resolution` (Internal / System Triggered)
Triggered immediately after an officer uploads their resolution. This endpoint coordinates with the Gemini API to analyze the proof.

*   **Access Level**: Internal or authenticated `DEPARTMENT_OFFICER` assigned to the issue.
*   **Request Payload**: None (grabs associated issue details and resolution submission directly from the database).
*   **Response Payload (`200 OK`)**:
```json
{
  "success": true,
  "data": {
    "issueNumber": "CC-2026-000001",
    "status": "RESOLUTION_PENDING_VERIFICATION",
    "aiValidation": {
      "resolutionLikelyValid": true,
      "confidence": 0.94,
      "summary": "Pothole filled with hot-mix asphalt and compacted.",
      "reasoning": "The 'after' photograph contains identical static background elements (yellow shop shutter and utility pole) as the 'before' photograph. The hole has been successfully filled. Surface is flat and dry. Distance delta is 4 meters.",
      "validatedAt": "2026-06-26T11:40:00.000Z"
    }
  }
}
```

### 5.2 `POST /api/issues/:issueNumber/verify` (Citizen Vote Submission)
Called when a verified local citizen approves or rejects the officer's resolution proof.

*   **Access Level**: Authenticated `CITIZEN` with `VERIFIED_CITIZEN` / `COMMUNITY_VERIFIED_CITIZEN` status inside the same registered ward.
*   **Request Payload**:
```json
{
  "action": "VERIFY", // or "REJECT"
  "comment": "Walked past the store today. The pothole is completely repaired and level with the pavement. Excellent job!"
}
```
*   **Response Payload (`200 OK`)**:
```json
{
  "success": true,
  "message": "Vote recorded successfully.",
  "data": {
    "issueNumber": "CC-2026-000001",
    "currentApprovals": 3,
    "currentRejections": 0,
    "remainingToClose": 2,
    "pointsEarned": 10,
    "status": "RESOLUTION_PENDING_VERIFICATION"
  }
}
```
*   **Error Responses**:
    *   `400 Bad Request`: "You have already voted on this resolution."
    *   `403 Forbidden`: "Unauthorized. Only verified local citizens registered in Ward 80 can verify this resolution."

### 5.3 `GET /api/issues/:issueNumber/verifications`
Retrieves a detailed tally of the resolution reviews and citizen comments.

*   **Access Level**: Authenticated User (Citizen, Officer, Admin).
*   **Response Payload (`200 OK`)**:
```json
{
  "success": true,
  "data": {
    "issueNumber": "CC-2026-000001",
    "approvals": 5,
    "rejections": 0,
    "status": "CLOSED",
    "aiSummary": "Pothole filled with hot-mix asphalt and compacted.",
    "aiConfidence": 0.94,
    "comments": [
      {
        "citizenName": "Prasath S",
        "action": "VERIFY",
        "comment": "Walked past the store today. The pothole is completely repaired.",
        "timestamp": "2026-06-26T11:42:00.000Z"
      }
    ]
  }
}
```

---

## 6. AI Validation Design

The system leverages Gemini's multimodal and geo-fencing comparisons to pre-vet resolution entries.

### 6.1 Prompt Engineering & Input Package
The backend constructs an image-and-text prompt, packaging the following inputs to pass to `gemini-2.5-flash`:

1.  **Original Issue Image/Video**: Selected from the reporter's submission.
2.  **Resolution Proof Image/Video**: Selected from the officer's submission.
3.  **Original Location**: Coordinates `[longitude, latitude]` from the issue report.
4.  **Resolution Location**: GPS coordinates captured during resolution.
5.  **Distance Delta**: Pre-calculated on-the-fly (in meters) between the original report and the resolution point.

### 6.2 System Prompt Context
```text
You are the CommunityComrade Civic Infrastructure Verification Engine.
Your task is to analyze municipal repair submissions and determine if the reported issue has been successfully resolved.

Analyze the images and metadata provided:
1. "Before" media shows the reported defect.
2. "After" media shows the completed repair.
3. Geo-location delta is: {{distanceDelta}} meters.

Guidelines:
- Confirm visual correspondence: Look for static local markers (e.g., storefront signs, tree branches, utility poles, building outlines) in both images to verify they are of the exact same physical location.
- Evaluate repair quality: For potholes, check if asphalt/concrete has been poured level with the street. For streetlights, check if the bulb is lit. For garbage, check if the container is empty and surrounding ground is clean.
- Evaluate location correctness: A location delta under 50 meters is excellent. A delta above 50 meters is highly suspicious and must lower your confidence.

Output your audit strictly in the following JSON format:
{
  "resolutionLikelyValid": boolean,
  "confidence": float (between 0.0 and 1.0),
  "summary": "A concise 1-2 sentence description of the repair status",
  "reasoning": "A paragraph explaining visual matched landmarks, textures, or spatial issues"
}
```

---

## 7. Citizen Verification Design

Civic engagement is secured by physical proximity validation and community gatekeepers.

### 7.1 Location and Status Verification Rules

To prevent coordinated remote voting (voting rings) and guarantee high-fidelity reviews, voters must satisfy three distinct gating criteria:

1.  **Verified Status Gate**:
    *   The voter must have an active `IUserDoc` profile where `role === 'CITIZEN'`.
    *   The user's `status` must be either `'VERIFIED_CITIZEN'` or `'COMMUNITY_VERIFIED_CITIZEN'`. Users with `'PENDING'` status are blocked from voting.
2.  **Geographic Ward Gate**:
    *   The voter's `registeredWard` must exactly match the issue's `reporterWard`.
3.  **Proximity Distance Gate (Symmetric Check)**:
    *   The physical distance between the voter's registered coordinates `[longitude, latitude]` and the issue coordinates must be within **2,500 meters** (2.5km) to qualify as part of their active locality.

### 7.2 Automated Consensus Triggers

```javascript
// Pseudocode for counting votes and transitioning states
async function processVote(issue, voteAction) {
  if (voteAction === 'VERIFY') {
    issue.verificationApprovalCount += 1;
    if (issue.verificationApprovalCount >= 5) {
      issue.status = 'CLOSED';
      issue.closedAt = new Date();
      await auditLog('ISSUE_CLOSED_BY_COMMUNITY_CONSENSUS', issue.issueNumber);
      await distributeLeaderboardPoints(issue.issueNumber, 'CLOSED');
    }
  } else if (voteAction === 'REJECT') {
    issue.verificationRejectionCount += 1;
    if (issue.verificationRejectionCount >= 5) {
      issue.status = 'REOPENED';
      issue.reopenedAt = new Date();
      await auditLog('ISSUE_REOPENED_BY_COMMUNITY_REJECTION', issue.issueNumber);
      await penalizeOfficerScore(issue.assignedOfficerId);
    }
  }
  await issue.save();
}
```

---

## 8. Security Considerations

To ensure the integrity of the platform, the following measures protect against fraudulent submissions:

1.  **Anti-Sybil Mechanics**:
    *   Each citizen is mapped to a unique verified identifier (such as Aadhaar or Voter ID) during account creation.
    *   The database compound unique index (`{ "issueNumber": 1, "citizenUserId": 1 }`) strictly enforces a "one-citizen, one-vote" rule.
2.  **Geo-Fencing Boundaries**:
    *   All officer submissions require geo-location telemetry captured via browser/device GPS.
    *   If the distance delta between the issue creation coordinates and the resolution coordinates is greater than **50 meters**, the UI flags this to the officer and the backend records it in the AI reasoning payload, penalizing the AI validation confidence score.
3.  **Admin Overrides**:
    *   In cases of community gridlock or disputed votes, platform administrators have absolute override capability to force-close or force-reopen issues, logging a specialized audit trail entry to prevent abuse.

---

## 9. Gamification Hooks

CommunityComrade leverages gamification to motivate verified citizens to participate in local governance.

```
+----------------------------------------------------------------------------------------+
|                                    Gamification Table                                  |
+----------------------------------------------------------------------------------------+

┌────────────────────────────┬──────────────────┬───────────────────────────────────────┐
│ Action                     │ Points Awarded   │ Impact Score Contribution             │
├────────────────────────────┼──────────────────┼───────────────────────────────────────┤
│ Cast Verification Vote     │ +10 Points       │ +1 Impact Score                       │
│ Consensus Alignment Bonus  │ +25 Points       │ +5 Impact Score                       │
│ First Verifier Speed Bonus │ +15 Points       │ +2 Impact Score                       │
└────────────────────────────┴──────────────────┴───────────────────────────────────────┘
```

*   **Active Verification (+10 Points)**: Awarded immediately when a verified citizen registers a vote (Verify or Reject) with a helpful comment.
*   **Consensus Alignment Bonus (+25 Points)**: Once the issue officially reaches a resolution decision (either successfully `CLOSED` or `REOPENED`), all users who voted in alignment with the final majority consensus receive a bonus.
*   **Speed Bonus (+15 Points)**: The first two local citizens who audit the resolution and cast a vote receive a speed bonus, accelerating the verification cycle.
*   **Leaderboard Integration**:
    *   Points are added directly to the user's `leaderboardScore`.
    *   Impact scores (`impactScore`) increment dynamically, qualifying active citizens for community badges (e.g., "Ward Guardian", "Civic Inspector").

---
