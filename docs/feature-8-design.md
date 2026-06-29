# Feature 8 Design: Issue Collaboration, Discussion Threads & Official Updates

## Document Metadata
* **Author:** Senior Solution Architect, Collaboration Platform Architect & Product Designer
* **Status:** Approved / Ready for Implementation
* **Target Version:** v1.8.0
* **System Context:** Integrates seamlessly into the existing MongoDB/Mongoose Express-Vite Full-Stack codebase.

---

## 1. High-Level Architecture

The **Issue Collaboration & Discussion Engine** is designed as a secure, real-time-capable, and context-aware communication layer built on top of the existing Issue Management System. It establishes structured communication channels between Citizens, Department Officers, and Administrators directly inside the context of reported civic issues.

### System Topology & Data Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CLIENT ARCHITECTURE (Vite)                      │
│                                                                        │
│  ┌───────────────────────┐   ┌───────────────────┐   ┌──────────────┐  │
│  │   Discussion Thread   │   │  Official Updates │   │ AI Insights  │  │
│  │  (Rich Message List)  │   │   (Timeline Pin)  │   │  & Summaries │  │
│  └───────────┬───────────┘   └─────────┬─────────┘   └──────┬───────┘  │
└──────────────┼─────────────────────────┼────────────────────┼──────────┘
               │ Secure JSON Web Token   │                    │
               ▼                         ▼                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        API ROUTER / GATEWAY (Express)                  │
│                                                                        │
│        /api/issues/:issueId/thread     /api/issues/:issueId/updates    │
└──────────────┬─────────────────────────┬───────────────────────────────┘
               │                         │
               ▼                         ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     CORE COLLABORATION SERVICES (Node.js)              │
│                                                                        │
│  ┌───────────────────────────┐         ┌─────────────────────────────┐ │
│  │    Thread Lifecycle       │◄────────┤    Gemini AI Analyzer       │ │
│  │  (Read-Only Lock Manager) │         │ (Sentiment, Summaries, Risk)│ │
│  └─────────────┬─────────────┘         └──────────────┬──────────────┘ │
│                │                                      │                │
│                │ Notification Trigger                 │                │
│                ▼                                      ▼                │
│  ┌───────────────────────────┐         ┌─────────────────────────────┐ │
│  │    Notification Engine    ├────────►│     Audit Log Service       │ │
│  │ (Push/WS Delivery Broker) │         │ (Moderation & Abuse Actions)│ │
│  └─────────────┬─────────────┘         └──────────────┬──────────────┘ │
└────────────────┼──────────────────────────────────────┼────────────────┘
                  ▼                                      ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        PERSISTENCE LAYER (MongoDB)                     │
│                                                                        │
│  ┌───────────────────────────┐         ┌─────────────────────────────┐ │
│  │   IssueDiscussionThread   │         │     IssueMessage (MDB)      │ │
│  │   OfficialUpdate (MDB)    │         │     DiscussionSummary (MDB) │ │
│  └───────────────────────────┘         └─────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Discussion Architecture & Thread Lifecycle

Each issue mapped in the database acts as the primary root for a conversational thread. Participation and write operations are strictly governed by the issue status and locality criteria.

### Discussion Access Matrix

| Role | Read Permissions | Write Permissions | Attachment Permissions | Moderation Actions |
| :--- | :--- | :--- | :--- | :--- |
| **Issue Creator** | Yes (Any issue status) | Yes (Active status) | Yes (Image, Video, GPS) | None (Can only flag) |
| **Local Citizens** | Yes (Same ward/district) | Yes (Active status) | Yes (Image, GPS) | None (Can only flag) |
| **Assigned Officer** | Yes (Any issue status) | Yes (Active status) | Yes (Official Updates, media) | None (Can edit own posts) |
| **System Admin** | Yes (Global) | Yes (Global) | Yes (Global) | Hard-delete, Lock Thread, Ban |

### Thread State & Operations Flow

```
  ┌───────────────────────────────────────────────────────────────┐
  │                        Active Thread                          │
  │     (Statuses: OPEN, ASSIGNED, ACCEPTED, IN_PROGRESS,        │
  │      RESOLUTION_PENDING_VERIFICATION, COMMUNITY_VERIFIED)     │
  └───────────────────────────────┬───────────────────────────────┘
                                  │
                       Issue is CLOSED (Trigger)
                                  │
                                  ▼
  ┌───────────────────────────────────────────────────────────────┐
  │                       Read-Only Thread                        │
  │     - Posts Locked: Rejects POST /api/issues/:id/messages     │
  │     - Existing conversation remains visible for audits        │
  │     - AI Summarization runs one final time for closure        │
  └───────────────────────────────────────────────────────────────┘
```

---

## 3. Database Design (Mongoose Schemas)

The collection definitions leverage references and subdocuments to optimize read speed while maintaining referential integrity.

### 3.1 `IssueDiscussionThread` Schema
This document controls access settings, thread-specific configurations, and links messages to the parent issue.

```typescript
import mongoose, { Schema, Document } from 'mongoose';

export interface IIssueDiscussionThread extends Document {
  issueId: mongoose.Types.ObjectId;
  isLocked: boolean;
  lockedBy?: mongoose.Types.ObjectId;
  lockedAt?: Date;
  citizenParticipants: mongoose.Types.ObjectId[];
  messageCount: number;
  lastActivityAt: Date;
}

const IssueDiscussionThreadSchema = new Schema<IIssueDiscussionThread>({
  issueId: { type: Schema.Types.ObjectId, ref: 'Issue', required: true, unique: true, index: true },
  isLocked: { type: Boolean, default: false },
  lockedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  lockedAt: { type: Date },
  citizenParticipants: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  messageCount: { type: Number, default: 0 },
  lastActivityAt: { type: Date, default: Date.now }
}, { timestamps: true });

export const IssueDiscussionThreadModel = mongoose.models.IssueDiscussionThread || 
  mongoose.model<IIssueDiscussionThread>('IssueDiscussionThread', IssueDiscussionThreadSchema);
```

### 3.2 `IssueMessage` Schema
Maintains all message logs inside the thread. It accommodates citizen replies, official announcements, and system-generated notifications.

```typescript
export interface IAttachment {
  type: 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  url: string;
  thumbnailUrl?: string;
  filename: string;
  fileSize: number; // in bytes
}

export interface ILocationMetadata {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface IIssueMessage extends Document {
  threadId: mongoose.Types.ObjectId;
  issueId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  senderRole: 'CITIZEN' | 'DEPARTMENT_OFFICER' | 'ADMIN' | 'SYSTEM';
  messageType: 'CITIZEN_MESSAGE' | 'OFFICER_MESSAGE' | 'ADMIN_MESSAGE' | 'OFFICIAL_UPDATE' | 'SYSTEM_EVENT';
  content: string;
  attachments: IAttachment[];
  locationMetadata?: ILocationMetadata;
  isModerated: boolean;
  moderationReason?: string;
  moderatedBy?: mongoose.Types.ObjectId;
  moderatedAt?: Date;
  flagCount: number;
  flaggedBy: mongoose.Types.ObjectId[];
}

const IssueMessageSchema = new Schema<IIssueMessage>({
  threadId: { type: Schema.Types.ObjectId, ref: 'IssueDiscussionThread', required: true, index: true },
  issueId: { type: Schema.Types.ObjectId, ref: 'Issue', required: true, index: true },
  senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  senderRole: { type: String, enum: ['CITIZEN', 'DEPARTMENT_OFFICER', 'ADMIN', 'SYSTEM'], required: true },
  messageType: { 
    type: String, 
    enum: ['CITIZEN_MESSAGE', 'OFFICER_MESSAGE', 'ADMIN_MESSAGE', 'OFFICIAL_UPDATE', 'SYSTEM_EVENT'], 
    required: true 
  },
  content: { type: String, required: true },
  attachments: [{
    type: { type: String, enum: ['IMAGE', 'VIDEO', 'DOCUMENT'], required: true },
    url: { type: String, required: true },
    thumbnailUrl: { type: String },
    filename: { type: String, required: true },
    fileSize: { type: Number, required: true }
  }],
  locationMetadata: {
    latitude: { type: Number },
    longitude: { type: Number },
    address: { type: String }
  },
  isModerated: { type: Boolean, default: false },
  moderationReason: { type: String },
  moderatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  moderatedAt: { type: Date },
  flagCount: { type: Number, default: 0 },
  flaggedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

// Indexing for rapid retrieval and timeline ordering
IssueMessageSchema.index({ threadId: 1, createdAt: 1 });
IssueMessageSchema.index({ messageType: 1 });

export const IssueMessageModel = mongoose.models.IssueMessage || 
  mongoose.model<IIssueMessage>('IssueMessage', IssueMessageSchema);
```

### 3.3 `OfficialUpdate` Schema
Specifically highlights official progress steps taken by officers. Documents are linked to both the issue history and the thread.

```typescript
export interface IOfficialUpdate extends Document {
  issueId: mongoose.Types.ObjectId;
  messageId: mongoose.Types.ObjectId; // Links to the IssueMessage
  officerId: mongoose.Types.ObjectId;
  updateStage: 'INSPECTION_COMPLETED' | 'REPAIR_SCHEDULED' | 'WORK_STARTED' | 'WORK_COMPLETED' | 'OTHER';
  progressPercentage: number;
  expectedCompletionDate?: Date;
  notes?: string;
}

const OfficialUpdateSchema = new Schema<IOfficialUpdate>({
  issueId: { type: Schema.Types.ObjectId, ref: 'Issue', required: true, index: true },
  messageId: { type: Schema.Types.ObjectId, ref: 'IssueMessage', required: true, unique: true },
  officerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  updateStage: { 
    type: String, 
    enum: ['INSPECTION_COMPLETED', 'REPAIR_SCHEDULED', 'WORK_STARTED', 'WORK_COMPLETED', 'OTHER'], 
    required: true 
  },
  progressPercentage: { type: Number, default: 0, min: 0, max: 100 },
  expectedCompletionDate: { type: Date },
  notes: { type: String }
}, { timestamps: true });

export const OfficialUpdateModel = mongoose.models.OfficialUpdate || 
  mongoose.model<IOfficialUpdate>('OfficialUpdate', OfficialUpdateSchema);
```

### 3.4 `DiscussionSummary` Schema
Caches AI summaries generated by the Gemini engine alongside community sentiment scores.

```typescript
export interface IDiscussionSummary extends Document {
  issueId: mongoose.Types.ObjectId;
  summaryText: string;
  keyDiscussionPoints: string[];
  latestProgress: string;
  pendingActions: string[];
  officerCommitments: string[];
  citizenSentiment: 'VERY_NEGATIVE' | 'NEGATIVE' | 'NEUTRAL' | 'POSITIVE' | 'VERY_POSITIVE';
  communitySatisfactionScore: number; // scale 1-100
  escalationRiskScore: number; // scale 1-100
  aiModelUsed: string;
  confidenceScore: number; // scale 0-1
  generatedAt: Date;
}

const DiscussionSummarySchema = new Schema<IDiscussionSummary>({
  issueId: { type: Schema.Types.ObjectId, ref: 'Issue', required: true, unique: true, index: true },
  summaryText: { type: String, required: true },
  keyDiscussionPoints: [{ type: String }],
  latestProgress: { type: String, required: true },
  pendingActions: [{ type: String }],
  officerCommitments: [{ type: String }],
  citizenSentiment: { 
    type: String, 
    enum: ['VERY_NEGATIVE', 'NEGATIVE', 'NEUTRAL', 'POSITIVE', 'VERY_POSITIVE'], 
    required: true 
  },
  communitySatisfactionScore: { type: Number, min: 1, max: 100, required: true },
  escalationRiskScore: { type: Number, min: 1, max: 100, required: true },
  aiModelUsed: { type: String, required: true },
  confidenceScore: { type: Number, min: 0, max: 1, required: true },
  generatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

export const DiscussionSummaryModel = mongoose.models.DiscussionSummary || 
  mongoose.model<IDiscussionSummary>('DiscussionSummary', DiscussionSummarySchema);
```

---

## 4. AI Summary & Sentiment Analysis Design (Gemini)

The system utilizes Gemini (`gemini-2.5` or specified `@google/genai` models) to perform periodic, asynchronous analysis of the conversations. This decreases information overload for busy department officers and highlights active bottlenecks.

### Prompting Topology & Safety Checks
1. **Trigger Frequency:** Summarization runs when a thread hits an increment of `15 new messages` or when an officer requests a dashboard reload.
2. **Input Sanitization:** Usernames are masked with temporary hashes (`[Citizen_#A]`, `[Officer_#B]`) before sending data to the LLM to safeguard privacy.
3. **Structured Schema Output:** The backend forces JSON-schema response matching to ensure the Mongoose `DiscussionSummary` properties populate error-free.

### Gemini Request Blueprint
```typescript
const geminiPrompt = `
You are a municipal collaboration analyst. Analyze the following chat thread logs for a civic infrastructure issue and generate a structured summary.
Strictly categorize the data according to the requested JSON layout. Ensure sentiment scores represent the real level of concern or frustration felt by the community.

Conversation logs:
{{CHAT_LOGS}}
`;
```

---

## 5. Moderation Design

To prevent abuse, flame wars, and coordinate neighborhood harmony, administrators have access to dedicated moderation endpoints.

### Abuse Flag & Reporting Flow
1. **Flagging:** Any citizen inside the locality can flag a message for "Abuse", "Inappropriate Content", or "Incorrect Information".
2. **Audit Threshold:** Once a message accumulates `3 flags`, its visibility is temporarily blurred, and a notification goes to the district admin.
3. **Admin Verdicts:**
   * **Approved:** Clears flags; restores public rendering.
   * **Moderated / Hidden:** Replaces the text content with *"This message has been removed by a community moderator"* but keeps the metadata structure intact to prevent chronological breaks.
   * **User Ban:** Flags the sending profile for automated system review.

---

## 6. Notification Design

Notifications keep thread participants synchronized without requiring continuous polling.

### Dispatch Rules & Payload Specifications

```typescript
export interface INotificationPayload {
  eventId: string;
  recipientId: string;
  type: 'NEW_MESSAGE' | 'OFFICIAL_UPDATE' | 'OFFICER_RESPONSE' | 'ISSUE_CLOSURE' | 'RESOLUTION_UPLOADED';
  title: string;
  body: string;
  clickActionUrl: string;
  metadata: {
    issueId: string;
    threadId: string;
    senderName?: string;
  };
}
```

* **Trigger Rules:**
  * **NEW_MESSAGE:** Dispatched to the Issue Creator and assigned Department Officer when a citizen replies.
  * **OFFICIAL_UPDATE:** Broadcasted to all citizens residing within the active ward.
  * **ISSUE_CLOSURE:** Dispatched to all thread participants when status changes to `CLOSED`.

---

## 7. API Design

### 7.1 Thread & Messages

#### GET `/api/issues/:issueId/thread`
Retrieves the thread details, isLocked state, and summary if cached.
* **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "thread": {
      "id": "thread_67890",
      "issueId": "issue_12345",
      "isLocked": false,
      "messageCount": 23,
      "lastActivityAt": "2026-06-27T02:46:16.000Z"
    },
    "cachedSummary": {
      "summaryText": "Citizens are discussing pothole severity on Main St...",
      "citizenSentiment": "NEGATIVE",
      "escalationRiskScore": 34
    }
  }
}
```

#### GET `/api/issues/:issueId/thread/messages`
Paginated retrieval of messages within the thread. Supports scrolling.
* **Query Parameters:** `page=1`, `limit=20`, `beforeTimestamp=...`
* **Response `200 OK`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "msg_001",
      "senderId": "user_54321",
      "senderRole": "CITIZEN",
      "messageType": "CITIZEN_MESSAGE",
      "content": "Water from the leak is starting to flood our sidewalk.",
      "attachments": [],
      "createdAt": "2026-06-27T01:10:00.000Z"
    }
  ],
  "pagination": { "next": true }
}
```

#### POST `/api/issues/:issueId/thread/messages`
Sends a message. Rejects if thread is locked.
* **Request Body:**
```json
{
  "content": "We noticed the repair crew arrived this morning!",
  "attachments": [
    {
      "type": "IMAGE",
      "url": "https://storage.googleapis.com/communitycomrade/uploads/pothole_crew.jpg",
      "filename": "pothole_crew.jpg",
      "fileSize": 1048576
    }
  ]
}
```

---

### 7.2 Official Updates

#### POST `/api/issues/:issueId/thread/official-updates`
Allows assigned department officers to post progress checkpoints.
* **Request Body:**
```json
{
  "updateStage": "WORK_STARTED",
  "progressPercentage": 25,
  "expectedCompletionDate": "2026-06-30T18:00:00.000Z",
  "notes": "Asphalt machinery mobilized to location. Work starting shortly."
}
```

---

### 7.3 Moderation & Admin Control

#### DELETE `/api/issues/:issueId/discussion/messages/:messageId`
Admin-only command to soft-delete a target message in an issue's discussion thread.
* **Role Requirement:** `ADMIN`
* **Response:** `{ "success": true }`

#### POST `/api/issues/:issueId/discussion/lock`
Admin-only command to manually lock or unlock a discussion thread.
* **Role Requirement:** `ADMIN`
* **Request Body:** `{ "isLocked": true }`
* **Response:** `{ "success": true, "isLocked": true }`

---

## 8. Security Design & Ward Validation

To prevent coordinate trolling and cross-town brigading, the backend enforces severe localization rules:

1. **Locality Authentication Filter:**
   When a user attempts to fetch or post in a thread, the router verifies the user's `registeredWard` and `registeredDistrict` against the target issue's `reporterWard` and `reporterDistrict`.
   ```typescript
   if (currentUser.role === 'CITIZEN') {
     if (currentUser.registeredWard !== targetIssue.reporterWard || 
         currentUser.registeredDistrict !== targetIssue.reporterDistrict) {
       return res.status(403).json({ 
         success: false, 
         error: 'Access Denied: You can only participate in discussion threads belonging to your registered ward.' 
       });
     }
   }
   ```
2. **File Upload Security:** Direct references to media assets must point to transient signed URLs, restricting access exclusively to authenticated web clients.

---

## 9. Analytics Design

The system aggregates communication parameters to optimize response metrics for district managers.

* **Key Performance Indicators Tracked:**
  * **Citizen Participation Rate:** Active commentators count divided by total registered ward citizens.
  * **Officer Responsiveness Delay:** The time elapsed between the first citizen question and the first official reply.
  * **Citizen Sentiment Evolution:** Graph detailing weekly sentiment shifts (e.g. from highly negative to neutral after repairs begin).

---

## 10. Scalability Considerations

1. **Read Path Caching:** Highly active threads cache the latest 10 messages inside a Redis cluster or an optimized memory store to prevent read bottlenecks.
2. **Rate Limiting:** Users are capped at 5 posts per minute per thread (`429 Too Many Requests`) to prevent spamming.
3. **Database Projections:** Standard list queries must explicitly exclude attachments and full content bodies until the individual thread is loaded.
