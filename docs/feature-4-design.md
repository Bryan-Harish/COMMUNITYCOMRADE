# Design Document: Government Workflow & Issue Lifecycle Management (Feature 4)

This design document outlines the system architecture, database changes, collections, API contracts, workflow diagrams, security considerations, and future hooks for CommunityComrade Feature 4: **Government Workflow & Issue Lifecycle Management**.

---

## 1. High-Level Design

The Government Workflow and Issue Lifecycle Management module is designed to bridge the gap between citizens reporting civic issues and government officials resolving them. It introduces role-based portals, structured state transitions, and audited timelines to guarantee operational transparency, efficiency, and accountability.

### 1.1 Actor Roles & Permissions Matrix

| Actor | Read Permissions | Write / Transition Actions |
| :--- | :--- | :--- |
| **Citizen** | Can view their reported issues and public (approved/active) issues. Can track the chronological timeline of any visible issue. | Can submit new issues, post comments, upvote, and verify issues. Cannot change issue status manually. |
| **Department Officer** | Can view issues assigned to their specific department and geographic region. | Can accept assigned issues (moves to `ACCEPTED`), mark as active (`IN_PROGRESS`), and submit structural resolutions (`RESOLUTION_SUBMITTED`). |
| **Administrator (Admin)** | Can view all issues globally (including those in `MANUAL_REVIEW`). | Can assign and reassign issues to departments, trigger manual reviews, review officer applications, and permanently close resolved issues (`CLOSED` / `REJECTED`). |

### 1.2 Issue Lifecycle State Machine Constraints
To maintain data integrity, transitions between states are strictly controlled. The following rules govern state progression:
1. **OPEN**: The default state of a newly created, valid issue.
2. **ASSIGNED**: Admin assigns the issue to a specific department.
3. **ACCEPTED**: The assigned officer accepts responsibility for the task.
4. **IN_PROGRESS**: The officer marks the issue as actively being worked on.
5. **RESOLVED**: The officer submits a formal resolution payload. The status remains in a resolved/pending-closure state until closed.
6. **CLOSED**: Admin verifies the resolution and permanently closes the issue.
7. **REJECTED**: Admin or AI (Feature 3) rejects the issue (e.g., duplicates, private property, spam).

---

## 2. Database Changes

To support issue assignment, officer lifecycle tracking, and resolution tracking, the existing `Issue` schema requires schema updates.

### 2.1 Updates to `Issue` Schema
Add the following fields to the primary issue collection to enable seamless lifecycle transitions:
*   `assignedDepartment`: String (Optional) - The municipal department handling the issue (e.g., "Roads & Traffic", "Sanitation", "Water Supply").
*   `assignedOfficerId`: ObjectId/String (Ref: User) (Optional) - The specific officer assigned to the case.
*   `acceptedAt`: Date (Optional) - Timestamp when the officer clicked "Accept".
*   `inProgressAt`: Date (Optional) - Timestamp when the officer clicked "Start Work".
*   `resolvedAt`: Date (Optional) - Timestamp when the resolution was submitted.
*   `closedAt`: Date (Optional) - Timestamp when the Admin approved and closed the issue.
*   `resolutionSubmissionId`: ObjectId/String (Ref: ResolutionSubmission) (Optional) - Relational link to the detailed resolution record.

---

## 3. Collections Specification

To implement this lifecycle cleanly without bloating the primary `Issue` documents, two secondary collections are designed: `ResolutionSubmissions` and `IssueAudits`.

### 3.1 `ResolutionSubmissions` Collection
Stores metadata, visual evidence, notes, and geo-fenced coordinates uploaded by the department officer upon resolving a complaint.

```json
{
  "$jsonSchema": {
    "bsonType": "object",
    "required": [
      "_id",
      "issueId",
      "officerId",
      "resolutionNotes",
      "media",
      "location",
      "timestamp"
    ],
    "properties": {
      "_id": {
        "bsonType": "objectId",
        "description": "Unique identifier for the resolution submission"
      },
      "issueId": {
        "bsonType": "string",
        "description": "The custom issue number or database ID of the associated issue"
      },
      "officerId": {
        "bsonType": "objectId",
        "description": "The unique reference to the Department Officer who completed the work"
      },
      "resolutionNotes": {
        "bsonType": "string",
        "minLength": 20,
        "description": "Detailed text from the officer describing the work completed (minimum 20 characters)"
      },
      "media": {
        "bsonType": "object",
        "required": ["url", "mediaType"],
        "properties": {
          "url": {
            "bsonType": "string",
            "description": "CDN or GCS absolute URL of the resolution photo or video"
          },
          "mediaType": {
            "bsonType": "string",
            "enum": ["IMAGE", "VIDEO"],
            "description": "Type of resolution attachment"
          }
        }
      },
      "location": {
        "bsonType": "object",
        "required": ["type", "coordinates"],
        "properties": {
          "type": {
            "bsonType": "string",
            "enum": ["Point"],
            "description": "GeoJSON type"
          },
          "coordinates": {
            "bsonType": "array",
            "minItems": 2,
            "maxItems": 2,
            "items": { "bsonType": "double" },
            "description": "[longitude, latitude] array specifying exact coordinate where resolution media was captured"
          }
        }
      },
      "timestamp": {
        "bsonType": "date",
        "description": "The date and time of file capture / upload"
      }
    }
  }
}
```

### 3.2 `IssueAudits` (Timeline) Collection
Maintains an immutable ledger of all lifecycle milestones for every issue. This feed populates the visual tracking timelines on both the Admin and Citizen views.

```json
{
  "$jsonSchema": {
    "bsonType": "object",
    "required": [
      "_id",
      "issueId",
      "eventType",
      "description",
      "actorId",
      "actorRole",
      "timestamp"
    ],
    "properties": {
      "_id": { "bsonType": "objectId" },
      "issueId": {
        "bsonType": "string",
        "description": "Associated issue number"
      },
      "eventType": {
        "bsonType": "string",
        "enum": [
          "ISSUE_CREATED",
          "ISSUE_FLAGGED_FOR_MANUAL_REVIEW",
          "ISSUE_APPROVED_BY_ADMIN",
          "ISSUE_REJECTED_BY_ADMIN",
          "ISSUE_ASSIGNED",
          "ISSUE_REASSIGNED",
          "ISSUE_ACCEPTED",
          "ISSUE_IN_PROGRESS",
          "RESOLUTION_SUBMITTED",
          "ISSUE_CLOSED"
        ],
        "description": "Standardized transition hook event"
      },
      "description": {
        "bsonType": "string",
        "description": "A clear, localized message summarizing what occurred and why (e.g., 'Assigned to sanitation department by Admin user John Doe')"
      },
      "actorId": {
        "bsonType": "objectId",
        "description": "The unique reference to the user who triggered the transition (e.g., Admin ID, Officer ID, or Citizen ID)"
      },
      "actorRole": {
        "bsonType": "string",
        "enum": ["CITIZEN", "OFFICER", "ADMIN", "SYSTEM_AI"],
        "description": "Role of the action creator"
      },
      "timestamp": {
        "bsonType": "date",
        "description": "Datetime of transition"
      }
    }
  }
}
```

---

## 4. API Contracts

All endpoints are stateless, require HTTPS, and enforce strict Authorization Bearer JSON Web Tokens (JWT).

### 4.1 Admin: Assign / Reassign Issue
* **Endpoint**: `PATCH /api/admin/issues/:issueNumber/assign`
* **Headers**: `Authorization: Bearer <ADMIN_JWT>`
* **Request Payload**:
  ```json
  {
    "department": "Sanitation & Waste Management",
    "officerId": "603d211f01c2c3104e908da1" 
  }
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Issue assigned successfully.",
    "data": {
      "issueNumber": "CC-20260626-8921",
      "status": "ASSIGNED",
      "assignedDepartment": "Sanitation & Waste Management",
      "assignedOfficerId": "603d211f01c2c3104e908da1"
    }
  }
  ```
* **Common Errors**:
  * `400 Bad Request`: Validation errors (e.g. Officer does not belong to specified department, or issue is already closed).
  * `403 Forbidden`: User is authenticated but is not an authorized Admin.

### 4.2 Officer: Accept Assigned Issue
* **Endpoint**: `POST /api/officer/issues/:issueNumber/accept`
* **Headers**: `Authorization: Bearer <OFFICER_JWT>`
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Issue accepted successfully.",
    "data": {
      "issueNumber": "CC-20260626-8921",
      "status": "ACCEPTED",
      "acceptedAt": "2026-06-26T10:45:00Z"
    }
  }
  ```
* **Common Errors**:
  * `403 Forbidden`: Authenticated officer is not the one assigned to this issue.
  * `400 Bad Request`: Issue is not in `ASSIGNED` status.

### 4.3 Officer: Mark In Progress
* **Endpoint**: `POST /api/officer/issues/:issueNumber/start`
* **Headers**: `Authorization: Bearer <OFFICER_JWT>`
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Work marked in progress.",
    "data": {
      "issueNumber": "CC-20260626-8921",
      "status": "IN_PROGRESS",
      "inProgressAt": "2026-06-26T11:15:00Z"
    }
  }
  ```
* **Common Errors**:
  * `400 Bad Request`: Issue is not in `ACCEPTED` status.

### 4.4 Officer: Submit Resolution
* **Endpoint**: `POST /api/officer/issues/:issueNumber/resolve`
* **Headers**: `Authorization: Bearer <OFFICER_JWT>`
* **Request Payload**:
  ```json
  {
    "resolutionNotes": "Pothole completely patched using durable cold asphalt mix. Surface rolled flat and dry.",
    "mediaUrl": "https://storage.googleapis.com/cc-media-bucket/resolutions/res_8921.jpg",
    "mediaType": "IMAGE",
    "latitude": 37.7749,
    "longitude": -122.4194,
    "timestamp": "2026-06-26T12:00:00Z"
  }
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Resolution submitted successfully. Awaiting final Admin closure.",
    "data": {
      "issueNumber": "CC-20260626-8921",
      "status": "RESOLVED",
      "resolvedAt": "2026-06-26T12:00:00Z"
    }
  }
  ```
* **Common Errors**:
  * `400 Bad Request`: Coordinates are significantly out of bounds (> 50 meters) from the reported issue location.
  * `422 Unprocessable`: Resolution Notes are too short (minimum 20 characters).

### 4.5 Admin: Close / Confirm Resolution
* **Endpoint**: `POST /api/admin/issues/:issueNumber/close`
* **Headers**: `Authorization: Bearer <ADMIN_JWT>`
* **Request Payload**:
  ```json
  {
    "closeNotes": "Verified photo evidence. Work is satisfactory."
  }
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Issue closed successfully.",
    "data": {
      "issueNumber": "CC-20260626-8921",
      "status": "CLOSED",
      "closedAt": "2026-06-26T14:30:00Z"
    }
  }
  ```

---

## 5. Workflow Diagrams

### 5.1 Comprehensive Issue Lifecycle State Machine
This ASCII diagram outlines how an issue flows through the entire system from reporting to closure, highlighting automated AI validation gates and review queues.

```
                    [ Citizen Submits Issue ]
                               |
                               v
                     +-------------------+
                     |  Feature 3 AI     |
                     |  Analysis Gate    |
                     +---------+---------+
                               |
                     +---------+---------+
                     |                   |
                     v (Passed)          v (Private Prop Conf >= 80%)
                 +-------+      +------------------+
                 | OPEN  |      |  MANUAL_REVIEW   |
                 +---+---+      +--------+---------+
                     |                   |
                     |                   +-----> (Approved by Admin) ----+
                     |                   |                               |
                     |                   v (Rejected by Admin)           |
                     |             +-----------+                         |
                     |             | REJECTED  |                         |
                     |             +-----------+                         |
                     |                                                   |
                     +------------------<--------------------------------+
                     |
                     v [ Admin Action: Assign to Department ]
               +-----------+
               | ASSIGNED  |
               +-----+-----+
                     |
                     v [ Officer Action: Accept Issue ]
               +-----------+
               | ACCEPTED  |
               +-----+-----+
                     |
                     v [ Officer Action: Start Work ]
              +--------------+
              | IN_PROGRESS  |
              +------+-------+
                     |
                     v [ Officer Action: Submit Resolution Payload ]
               +-----------+
               | RESOLVED  |
               +-----+-----+
                     |
                     v [ Admin Action: Close / Verify ]
                +----------+
                |  CLOSED  |
                +----------+
```

### 5.2 Sequence Diagram: Report-to-Resolution Life
Demonstrates interactions between Actors, Frontend Portals, the API Gateway, and the Database Tiers.

```
Citizen          Officer          Admin         API Gateway       Database
   |                |               |                |                |
   |--[Report]----->|---------------|-------------->|                |
   |                |               |                |--[Save Open]-->|
   |                |               |                |<--[Success]----|
   |<--[Notify]-----|---------------|----------------|                |
   |                |               |                |                |
   |                |               |<-[Load All]----|                |
   |                |               |--[Assign]----->|                |
   |                |               |                |--[Save Assign]->|
   |                |               |<--[Assigned]---|                |
   |                |<--[Notify]----|----------------|                |
   |                |               |                |                |
   |                |--[Accept]---->|--------------->|                |
   |                |               |                |--[Save Accept]->|
   |                |--[Start]----->|--------------->|                |
   |                |               |                |--[Save Active]->|
   |                |               |                |                |
   |                |--[Resolve]--->|--------------->|                |
   |                |   (With GPS,  |                |--[Save Res]--->|
   |                |    Photo,     |                |                |
   |                |    Notes)     |                |                |
   |                |               |<-[View Res]----|                |
   |                |               |--[Close]------>|                |
   |                |               |                |--[Save Close]->|
   |                |               |<--[Closed]-----|                |
   |<--[Updated]----|---------------|----------------|                |
```

---

## 6. Security & Integrity Considerations

### 6.1 Geo-Fenced Resolution Integrity (Anti-Spoofing Gate)
To prevent negligent officers from marking issues as resolved from their offices without visiting the site, the API Gateway enforces a physical coordinate match:
* **The Rule**: The `latitude` and `longitude` coordinates embedded in the `ResolutionSubmission` payload (retrieved dynamically from the officer's device GPS at the time of capturing the resolution image) must be within **50 meters** of the original issue's reported `location` coordinates.
* **Fallback**: If the coordinates exceed 50 meters, the API returns a `400 Bad Request` with an integrity alert block, requiring the officer to re-verify location coordinates.

### 6.2 Strict Access Validation
* **Officer Operations**: The endpoints `/api/officer/issues/:issueNumber/*` must check that `req.user.userId === issue.assignedOfficerId` and that the officer's state is fully `APPROVED` and `ACTIVE`.
* **State Transition Locking**: The API must validate state state sequence to prevent illegal jumps (e.g. going from `ASSIGNED` directly to `RESOLVED` without `ACCEPTED` and `IN_PROGRESS` sequences).

---

## 7. Future Hooks for Community Verification

Before an issue is formally transitioned to `CLOSED` by an administrator, the platform can scale Feature 4 to leverage community validation, reducing administrative bottlenecks:

1. **The Verification Window**:
   * When an officer submits a resolution, the issue status shifts to `RESOLVED`, starting a **72-hour validation clock**.
2. **Citizen Consensus Voting**:
   * Citizens living within 500 meters of the issue coordinate are notified via the app.
   * They can vote: **"Verify Resolution"** (thumbs up) or **"Dispute Resolution"** (thumbs down, with a dispute note and photo).
3. **Automated Transition rules**:
   * **Auto-Closure**: If the resolution receives $\ge 3$ verified positive votes and zero disputes, the issue automatically shifts to `CLOSED` after 72 hours, completely bypassing manual Admin intervention.
   * **Auto-Escalation**: If a dispute is lodged with $\ge 2$ disputes, the status is automatically flagged as `DISPUTED`, routing it back to the Admin manual review dashboard with the officer's resolution and citizen's dispute photos aligned side-by-side.

---

## 8. Document Summary & Design Approvals
This design outlines a scalable, performant, and secure lifecycle architecture. The schema structure preserves high write speeds in MongoDB, while API contracts ensure rigorous geo-validation safeguards and intuitive, roles-guided progression.
