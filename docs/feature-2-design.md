# CommunityComrade MVP — Feature #2 Architecture Design Document
**System Architecture & Technical Design: Issue Reporting and Geo-Validation**

---

## 1. High-Level Design

Feature #2 implements a robust, geo-fenced community reporting mechanism that empowers verified citizens to report civic issues with media attachment (Image/Video) and precise geolocation tags. The architecture guarantees that issues reported correspond to the actual operational or registered district of the reporting citizen by validating geodesic distance boundaries before insertion.

### 1.1 Architectural Concept & System Workflow
The reporting cycle is designed as a secure, distributed flow bridging the Client Portal, API Gateway, Geo-Validation Engine, Google Cloud Storage (GCS) buckets, and the MongoDB database.

```
                                  [ CLIENT TIER ]
             Citizen Interface                       Officer & Admin Interface
         +-----------------------+                   +-----------------------+
         | Create Issue Screen   |                   | View Issues / Details |
         +-----------+-----------+                   +-----------+-----------+
                     |                                           ^
                     | 1. Submit JSON + Media Binary             |
                     v                                           | 7. Render
         +-----------+-----------+                               |    Issues Feed
         |  Upload Pipeline &    |                               |
         |  Client-Side Preview  |                               |
         +-----------+-----------+                               |
                     |                                           |
                     | 2. Upload Files                           |
                     v                                           |
+--------------------v-------------------------------------------+-----------+
|                               [ API GATEWAY TIER ]                         |
|                                                                            |
|  +--------------------+    +-----------------------+    +---------------+-+  |
|  |     API Routes     |    | GCS File Upload Agent |    | Auth Handler  |  |  |
|  |    /api/issues     |    | (GCS Node.js SDK /    |    | (JWT/RBAC)    |  |  |
|  +---------+----------+    | Signed Upload URL)    |    +---------------+  |  |
|            |               +-----------+-----------+                       |  |
|            |                           |                                   |  |
|            | 3. Geo-Validation         | 4. Save Binary                    |  |
|            v                           v                                   |  |
|  +---------+----------+    +-----------+-----------+                       |  |
|  | Geodesic Boundary  |    | Google Cloud Storage  |                       |  |
|  | Validator Engine   |    |  (Media Asset Bucket) |                       |  |
|  +---------+----------+    +-----------------------+                       |  |
|            |                                                               |  |
|            | 5. Save Record (MongoDB Atlas)                                |  |
|            +---------------------------+                                   |  |
|                                        v                                   |  |
|                               +--------+--------+                          |  |
|                               |  Mongoose ORM   | <------------------------+  |
|                               +--------+--------+                             |
+----------------------------------------|--------------------------------------+
                                         |
                                         v
                                  [ DATABASE TIER ]
                               +---------+---------+
                               |   MongoDB Atlas   |
                               | (Issues Collection|
                               |  GeoJSON Indices) |
                               +-------------------+
```

### 1.2 End-to-End Sequence Flow
1. **Citizen Portal Initialization**: The citizen selects "Report Issue". The portal auto-populates the citizen's registered geographic center (latitude and longitude) using their session details.
2. **Media Prep & Presigned URL Generation**:
   * To maintain high-scale performance, the client requests a secure, short-lived, presigned upload URL from `/api/issues/upload-url` for any selected media file (Image or Video).
   * The server validates that the authenticated user's role is `CITIZEN` and their status is `VERIFIED_CITIZEN` or `COMMUNITY_VERIFIED_CITIZEN` before returning the signed URL.
3. **Direct-to-Storage Binary Stream**: The client uploads the binary image or video file directly to the Google Cloud Storage bucket via the signed URL, eliminating the need to buffer heavy media files on the serverless API instance.
4. **Issue Record Dispatch**: The client sends a `POST /api/issues` request containing the issue meta-details (Title, Description, Latitude, Longitude, GCS Image/Video URL, and Address).
5. **Geo-Validation**:
   * The backend extracts the reporting citizen's registration coordinates from the `users` collection.
   * It calculates the geodesic distance between the reported coordinate and the citizen's registered coordinate.
   * If the calculated distance exceeds **2.0 km**, the server rejects the request with a `400 Bad Request` and deletes the uploaded media from the GCS bucket to prevent orphaned files.
6. **Persistence & Projection**: If validation passes, the issue is saved with a default status of `OPEN`. It immediately populates the feeds of:
   * **Citizen**: "My Issues" feed and local district map.
   * **Officer**: "Assigned Issues" dashboard (filtered by their assigned Ward/operational polygon).
   * **Admin**: "Global Operations Feed" map and list.

---

## 2. Database Design & Storage Strategy

### 2.1 Database Choices
The design adheres strictly to the existing **MongoDB** document database paradigm managed by the **Mongoose ORM**. 
* To ensure low-latency spatial operations, we leverage MongoDB's native **2dsphere** spatial index, which supports rapid spherical geometry queries (e.g., finding all issues in a specific officer's ward or within a given distance of a municipal point).

### 2.2 Storage Decoupling (Database vs. Cloud Storage)
* **Metadata & Spatial Data (MongoDB)**: The MongoDB `issues` collection stores reference URLs, geographic coordinates in GeoJSON format, textual descriptions, timestamps, and reporting identity references. 
* **Heavy Media Binary Data (Google Cloud Storage)**: To avoid performance degradation of MongoDB documents (limiting document size to 16MB) and slow serialization/deserialization times, all photos and videos are stored inside a dedicated, private GCS bucket. MongoDB holds the fully qualified public CDN or secure, read-only Signed URLs of these GCS objects.

---

## 3. Issue Schema Specification

The `issues` collection is structured to represent complete civic report records. This document model is defined using standard TypeScript and Mongoose types.

### 3.1 MongoDB Schema Document Example

```json
{
  "_id": "667be921f01c2c3104e908da",
  "issueNumber": "4801759230",
  "reporterId": "65f8a2e1f01c2c3104e902b4",
  "title": "Pothole hazardous to two-wheelers near Central Junction",
  "description": "A deep pothole has formed right after the curve on Central Junction. Extremely hazardous at night as streetlights are dimmed.",
  "imageUrls": [
    "https://storage.googleapis.com/communitycomrade-media/issues/img_2026_06_25_99214.jpg"
  ],
  "videoUrls": [],
  "location": {
    "type": "Point",
    "coordinates": [77.5946, 12.9716]
  },
  "address": "45, Central Junction road, Ward 12, Bengaluru, Karnataka",
  "status": "OPEN",
  "createdAt": "2026-06-25T16:15:00Z",
  "updatedAt": "2026-06-25T16:15:00Z"
}
```

### 3.2 Field Level Definitions

| Field Name | Mongoose Data Type | TypeScript Type | Validation & Constraints | Business & Structural Rules |
| :--- | :--- | :--- | :--- | :--- |
| `_id` | `mongoose.Schema.Types.ObjectId` | `string` | Auto-generated | Internal MongoDB unique identifier. |
| `issueNumber` | `String` | `string` | Required, Unique, 10-digit numeric string | **Primary source of issue identification.** Unique public reference code generated upon creation (e.g., `"4801759230"`). Used for all lookups, APIs, and client-facing interfaces. |
| `reporterId` | `mongoose.Schema.Types.ObjectId` | `string` | Required, Ref: `'User'` | Tracks the author of the issue. Must refer to a user with role `'CITIZEN'` and status `'VERIFIED_CITIZEN'` or `'COMMUNITY_VERIFIED_CITIZEN'`. |
| `title` | `String` | `string` | Required, `minlength: 10`, `maxlength: 100` | Human-readable title of the issue. Strips HTML tags and excessive spaces on ingestion. |
| `description` | `String` | `string` | Required, `minlength: 20`, `maxlength: 1000` | Detailed text outlining the civic concern. |
| `imageUrls` | `[String]` | `string[]` | Max 3 items | Array of fully qualified URLs pointing to GCS image files. |
| `videoUrls` | `[String]` | `string[]` | Max 1 item | Array of fully qualified URLs pointing to GCS video files. |
| `location` | `{ type: String, coordinates: [Number] }` | `{ type: "Point"; coordinates: [number, number] }` | Required, GeoJSON formatting | `coordinates` holds exactly two values: `[Longitude, Latitude]` conforming to standard EPSG:4326. |
| `address` | `String` | `string` | Required, `maxlength: 250` | Readable postal address or landmark indicator verified during reporting. |
| `status` | `String` | `'OPEN'` | Required, Default: `'OPEN'` | Initial status indicating the issue has been filed. Extended statuses (e.g., `'ASSIGNED'`, `'RESOLVED'`) are reserved for future phases. |
| `createdAt` | `Date` | `string` | Auto-generated | UTC timestamp when the issue was successfully saved. |
| `updatedAt` | `Date` | `string` | Auto-generated | UTC timestamp when the issue was last modified. |

### 3.3 Indexing Strategy

To guarantee rapid queries during high portal usage, the following indices are designated for the `issues` collection:

1. **Primary Lookup Index (Unique)**:
   * **Key**: `{ "issueNumber": 1 }`
   * **Justification**: Primary identifier for single-issue lookups via client interfaces, search widgets, and API handlers. Must be unique.
2. **Geospatial Index (`2dsphere`)**:
   * **Key**: `{ "location": "2dsphere" }`
   * **Justification**: Crucial for proximity searches (e.g., finding issues near a citizen) and spatial query intersection (e.g., retrieving reports located within an officer's assigned polygonal ward).
3. **Reporter Compound Index**:
   * **Key**: `{ "reporterId": 1, "createdAt": -1 }`
   * **Justification**: Optimizes the retrieval of issues on the citizen's "My Issues" page, sorting by newest records first.
4. **Operational Status Index**:
   * **Key**: `{ "status": 1, "createdAt": -1 }`
   * **Justification**: Accelerates the load of active dashboards for officers and admins where resolving unresolved reports is prioritized.

---

## 4. API Contract Design

All API endpoints reside under the `/api` prefix, communicate exclusively via HTTPS, and enforce unified JSON payloads.

### 4.1 Unified API Payload Protocol
All responses strictly conform to standard wrappers for contract safety:
* **Success (2xx)**: `{ "success": true, "data": <Payload_Object_or_Array> }`
* **Failure (4xx/5xx)**: `{ "success": false, "error": { "code": "ERR_CODE", "message": "User friendly message" } }`

---

### 4.2 Endpoint 1: Create Civic Issue
`POST /api/issues`

Submit a newly validated civic issue with associated location coordinates and GCS media references.

* **Authentication Required**: Yes (JWT Bearer Token or Session Cookie)
* **RBAC Constraints**: User must be logged in as a Citizen and have a status of `'VERIFIED_CITIZEN'` or `'COMMUNITY_VERIFIED_CITIZEN'`.
* **Request Headers**:
  ```http
  Content-Type: application/json
  Authorization: Bearer <JWT_TOKEN>
  ```
* **Request Payload Schema**:
  ```json
  {
    "title": "Severe Water Logging near High School",
    "description": "After a brief downpour, the drainage system overflowed. Water has risen to knee level, blocking access to the school entry.",
    "imageUrls": [
      "https://storage.googleapis.com/communitycomrade-media/issues/usr_65f8a_img_1.jpg"
    ],
    "videoUrls": [],
    "latitude": 12.9722,
    "longitude": 77.5951,
    "address": "4th Cross Road, Sector 3, Bengaluru, Karnataka"
  }
  ```
* **Response Payload Schema (201 Created)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "667be921f01c2c3104e908da",
      "issueNumber": "4801759230",
      "reporterId": "65f8a2e1f01c2c3104e902b4",
      "title": "Severe Water Logging near High School",
      "description": "After a brief downpour, the drainage system overflowed. Water has risen to knee level, blocking access to the school entry.",
      "imageUrls": [
        "https://storage.googleapis.com/communitycomrade-media/issues/usr_65f8a_img_1.jpg"
      ],
      "videoUrls": [],
      "latitude": 12.9722,
      "longitude": 77.5951,
      "address": "4th Cross Road, Sector 3, Bengaluru, Karnataka",
      "status": "OPEN",
      "createdAt": "2026-06-25T16:15:00Z",
      "updatedAt": "2026-06-25T16:15:00Z"
    }
  }
  ```
* **Common Failures & Status Codes**:
  * `400 BAD_REQUEST (MISSING_FIELDS)`: Payload lacks a title, description, valid coordinates, or at least one media asset link.
  * `400 BAD_REQUEST (GEO_VALIDATION_FAILED)`: Calculated distance between the issue coordinates and the reporter's registered coordinates is **2.34 km** (greater than the allowed **2.0 km** threshold).
  * `401 UNAUTHORIZED (TOKEN_EXPIRED)`: Access token has expired or is invalid.
  * `403 FORBIDDEN (INELIGIBLE_STATUS)`: Citizen possesses `'PENDING_VERIFICATION'` or `'SUSPENDED'` status.

---

### 4.3 Endpoint 2: Retrieve Issues Feed
`GET /api/issues`

Retrieves a dynamic, paginated feed of issues. The returned array is auto-scoped by the requester's role.

* **Authentication Required**: Yes
* **RBAC Scoping Behavior**:
  * **Citizen**: Receives issues created within their registered district (matching `registeredDistrict` parameter).
  * **Officer**: Receives issues located within their assigned Ward boundary (intersection of issue point and operational polygon).
  * **Admin**: Receives a global feed of all issues.
* **Query Parameters**:
  * `status` (Optional): Filter by status (currently only `'OPEN'`).
  * `myIssues` (Optional, boolean): If `true`, returns only issues created by the requesting Citizen.
  * `page` (Optional, default `1`): Pagination page number.
  * `limit` (Optional, default `20`): Pagination page limits.
* **Request Headers**:
  ```http
  Authorization: Bearer <JWT_TOKEN>
  ```
* **Response Payload Schema (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "issues": [
        {
          "id": "667be921f01c2c3104e908da",
          "issueNumber": "4801759230",
          "reporterId": "65f8a2e1f01c2c3104e902b4",
          "title": "Severe Water Logging near High School",
          "description": "After a brief downpour, drainage system overflowed...",
          "imageUrls": [
            "https://storage.googleapis.com/communitycomrade-media/issues/usr_65f8a_img_1.jpg"
          ],
          "videoUrls": [],
          "latitude": 12.9722,
          "longitude": 77.5951,
          "address": "4th Cross Road, Sector 3, Bengaluru, Karnataka",
          "status": "OPEN",
          "createdAt": "2026-06-25T16:15:00Z"
        }
      ],
      "pagination": {
        "currentPage": 1,
        "totalPages": 5,
        "totalCount": 84
      }
    }
  }
  ```

---

### 4.4 Endpoint 3: Retrieve Issue Details
`GET /api/issues/:issueNumber`

Retrieve details of a single, specified issue using its unique 10-digit IssueNumber.

* **Authentication Required**: Yes
* **Request Headers**:
  ```http
  Authorization: Bearer <JWT_TOKEN>
  ```
* **Response Payload Schema (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "667be921f01c2c3104e908da",
      "issueNumber": "4801759230",
      "reporterId": "65f8a2e1f01c2c3104e902b4",
      "reporterName": "Aarav Sharma",
      "title": "Severe Water Logging near High School",
      "description": "After a brief downpour, the drainage system overflowed. Water has risen to knee level, blocking access to the school entry.",
      "imageUrls": [
        "https://storage.googleapis.com/communitycomrade-media/issues/usr_65f8a_img_1.jpg"
      ],
      "videoUrls": [],
      "latitude": 12.9722,
      "longitude": 77.5951,
      "address": "4th Cross Road, Sector 3, Bengaluru, Karnataka",
      "status": "OPEN",
      "createdAt": "2026-06-25T16:15:00Z",
      "updatedAt": "2026-06-25T16:15:00Z"
    }
  }
  ```
* **Common Failures & Status Codes**:
  * `404 NOT_FOUND (ISSUE_NOT_FOUND)`: Issue with the provided 10-digit issueNumber does not exist in the database.

---

## 5. Portal Updates & UI/UX Integration

### 5.1 Citizen Portal Updates

The Citizen Portal expands to host a two-panel fluid layout containing:
1. **Interactive Creation Form ("Create Issue")**:
   * **Location Map Picker**: Embedded interactive map displaying a **2.0 km circle overlay** centered exactly on the citizen's registered coordinate location. The citizen can place a pin inside this circular boundary. 
   * **Coordinate Auto-Check**: Real-time feedback in the form: if the placed pin drifts outside the boundary circle, the UI locks the "Submit" button, highlights the circle boundary in deep orange, and displays the banner: *"Please place the pin within 2 km of your registered location."*
   * **Media Upload Dropzone**: Supports drag-and-drop file inputs for image or video capture. Renders instant high-contrast visual thumbnail previews with clear "Delete File" controls. Includes progress indicator bar representing active direct uploads to the GCS bucket.
2. **"My Issues" Dashboard Hub**:
   * Tabbed interface containing two main lists: "Active Neighborhood Feed" (all issues within their registered district) and "My Filed Reports" (their own submissions).
   * Key metadata displays: card-based layout featuring a small image preview, a status tag (colored `'OPEN'` tag in bright teal), date filed, and a "Map View" button.
3. **Report Details Screen**:
   * Displays the full-resolution uploaded picture or integrated HTML5 video player, large heading, comprehensive text description, and a localized static map pinpointing the issue.

```
+---------------------------------------------------------------------------------+
| CITIZEN PORTAL - REPORT AN ISSUE                                                |
+---------------------------------------------------------------------------------+
| [Go Back]                                                                       |
|                                                                                 |
| *Title (Required)*                                 *Neighborhood Geo-Boundary*   |
| +-----------------------------------------------+  +--------------------------+ |
| | E.g., Blocked sewer drain on Main Road        |  |                          | |
| +-----------------------------------------------+  |        /-------\         | |
|                                                    |       /    *    \        | |
| *Description (Required)*                           |      |  [Pin]    |       | |
| +-----------------------------------------------+  |       \         /        | |
| | Enter detailed description of the issue...    |  |        \-------/         | |
| |                                               |  |   [2.0 KM Radius Circle] | |
| +-----------------------------------------------+  +--------------------------+ |
|                                                    | Coordinates:             | |
| *Attach Media* (Drag & drop or Click)              | Lat: 12.9722, Lng: 77.591| |
| +-----------------------------------------------+  +--------------------------+ |
| | [📷 Upload Photo]   OR   [🎥 Upload Video]    |  *Address Pinpointed*       | |
| | Supported types: JPEG, PNG, MP4 (Max 10MB)     |  +--------------------------+ |
| +-----------------------------------------------+  | 4th Cross Road, Sec 3... | |
|                                                    +--------------------------+ |
|  [ SUBMIT REPORT ]                                                              |
+---------------------------------------------------------------------------------+
```

### 5.2 Department Officer Portal Updates

The Department Officer dashboard receives a dedicated operational tab: "Assigned Civic Concerns".
1. **Regional Spatial Map**:
   * Draws the officer's designated jurisdiction boundary (represented as a closed polygon) and places pins for all `OPEN` issues falling inside it.
2. **Issue Detail Panels**:
   * Provides rapid view of submitted pictures/videos.
   * Renders the location address and precise GPS coordinates.
   * Auto-calculates response timelines based on the issue timestamp.

### 5.3 Administrative Portal Updates

1. **Global Surveillance Feed**:
   * Map view displaying all unresolved civic reports across all zones in the municipality. Allows admins to hover over pins to view thumbnails, reporting citizen names, and timestamps.
2. **Detailed Registry Screen**:
   * Full management view of issue listings with capabilities to view media, log audit changes, and verify reporter credentials directly from the issue panel.

---

## 6. Validation Rules & Algorithmic Specifications

### 6.1 Fields Validation Rules Matrix

| Target Field | Constraint Rule | Rejection HTTP Code & Error Response |
| :--- | :--- | :--- |
| **Issue Number** | Must be a unique, exactly 10-digit numeric string generated at submission. | `500 Server Error` `{ "success": false, "error": { "code": "COLLISION_FAILURE", "message": "Failed to generate unique issue identifier." } }` |
| **Title** | Must not be empty. Must have length between 10 and 100 characters. | `400 Bad Request` `{ "success": false, "error": { "code": "INVALID_TITLE", "message": "Title must be between 10 and 100 characters long." } }` |
| **Description** | Must not be empty. Must have length between 20 and 1000 characters. | `400 Bad Request` `{ "success": false, "error": { "code": "INVALID_DESCRIPTION", "message": "Description must be between 20 and 1000 characters long." } }` |
| **Media File** | Array size of `imageUrls` + `videoUrls` must be $\ge 1$. | `400 Bad Request` `{ "success": false, "error": { "code": "MEDIA_REQUIRED", "message": "At least one media file (Image or Video) is required to file a report." } }` |
| **Location** | Coordinates must represent valid decimal values (Latitude: $-90$ to $90$, Longitude: $-180$ to $180$). | `400 Bad Request` `{ "success": false, "error": { "code": "INVALID_COORDINATES", "message": "Coordinates provided are out of range." } }` |
| **User Eligibility**| User role must be `'CITIZEN'` AND status must match `'VERIFIED_CITIZEN'` or `'COMMUNITY_VERIFIED_CITIZEN'`. | `403 Forbidden` `{ "success": false, "error": { "code": "INELIGIBLE_USER", "message": "Only verified community citizens are authorized to report civic issues." } }` |

---

### 6.2 Geo-Validation & The Haversine Formula

To avoid manual, resource-intensive geographic reviews, a real-time spatial guard calculates the shortest curved path (Great-Circle distance) between the coordinates of the reported issue and the reporter's registered location.

#### 6.2.1 Mathematical Formulation
The distance is computed via the **Haversine formula**, which accounts for the Earth's curvature:

$$d = 2 R \cdot \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta\lambda}{2}\right)}\right)$$

Where:
* $d$ = Geodesic distance in kilometers between the two points.
* $R$ = Earth's mean radius $\approx 6371.0\text{ km}$.
* $\phi_1, \phi_2$ = Latitude of the citizen's registered point and the reported issue point (converted to **radians**).
* $\lambda_1, \lambda_2$ = Longitude of the citizen's registered point and the reported issue point (converted to **radians**).
* $\Delta\phi$ = Difference in latitude, $\phi_2 - \phi_1$ in radians.
* $\Delta\lambda$ = Difference in longitude, $\lambda_2 - \lambda_1$ in radians.

#### 6.2.2 Backend Validation Algorithm Steps

```
ALGORITHM GeoValidateIssueLocation
INPUT: 
  CitizenRegisterLat, CitizenRegisterLng
  IssueReportLat, IssueReportLng
  MaxRadiusKm = 2.0
OUTPUT: 
  Boolean (True if within radius, False if outside)

BEGIN
  // Step 1: Convert coordinates to radians
  lat1Rad = CitizenRegisterLat * (PI / 180)
  lng1Rad = CitizenRegisterLng * (PI / 180)
  lat2Rad = IssueReportLat * (PI / 180)
  lng2Rad = IssueReportLng * (PI / 180)

  // Step 2: Compute delta coordinates
  dLat = lat2Rad - lat1Rad
  dLng = lng2Rad - lng1Rad

  // Step 3: Compute Haversine terms
  a = sin(dLat / 2)^2 + cos(lat1Rad) * cos(lat2Rad) * sin(dLng / 2)^2
  c = 2 * atan2(sqrt(a), sqrt(1 - a))

  // Step 4: Multiply by Earth radius (6371 km)
  calculatedDistanceKm = 6371.0 * c

  // Step 5: Assert threshold limit
  IF calculatedDistanceKm <= MaxRadiusKm THEN
    RETURN True
  ELSE
    RETURN False
  ENDIF
END
```

If the algorithm evaluates to `False`, the API halts the reporting process and returns:
* **HTTP Code**: `400 Bad Request`
* **Error Payload**:
  ```json
  {
    "success": false,
    "error": {
      "code": "GEO_VALIDATION_FAILED",
      "message": "Report coordinates exceed the allowed 2.0 km radius from your registered residence area."
    }
  }
  ```

---

## 7. Security Considerations & Threat Modeling

For municipal software processing location coordinates and image/video uploads, the following defense-in-depth measures are mandated:

### 7.1 GCS Upload Security & Asset Isolation
* **Direct Private Bucket Ingestion**: Google Cloud Storage buckets are closed to direct public writes. Signed upload URLs are generated server-side for authenticated users only, with an expiration window of exactly **5 minutes**.
* **MIME-Type Assertions**: Signed URLs are bound to strict content types (`image/jpeg`, `image/png`, `video/mp4`). Uploading executable scripts, binary files, or unvalidated formats will be rejected by GCS at the edge.
* **Metadata Sanitization**: Uploaded images have all **EXIF GPS metadata stripped** server-side upon save confirmation, or handled in GCS triggers, to prevent leaks of citizens' personal location tracking inside files.

### 7.2 Payload Limitations
* **Maximum File Sizes**:
  * **Images**: Capped at **5MB** per file.
  * **Videos**: Capped at **15MB** per file (limited to 30 seconds at standard resolution).
* **Payload Verification**: API endpoints assert size and structure of incoming JSON payloads before parsing to protect against memory exhaustion attacks.

### 7.3 Rate Limiting
To prevent bot-nets or malicious scripts from spamming reports and overloading GCS storage or MongoDB clusters, the following rate limits are enforced:
* **Maximum Submissions**: An individual citizen profile is restricted to **5 issue creation attempts within an hour**.
* **IP-Based Access**: Limits are tracked via distributed Redis counters to guarantee security.

---

## 8. Future AI Integration Hooks & Gemini Extensions

The architecture is built with decoupling in mind, leaving explicit, asynchronous hooks to easily attach **Google Gemini API** features in the next release without modifying the core pipeline.

```
                  [ CORE SAVE PIPELINE ]
               +---------------------------+
               | Mongoose: Issue Saved     |
               +-------------+-------------+
                             |
                      Triggers Hook
                             v
               +-------------+-------------+
               |  Asynchronous Event Bus   |
               | (Redis Queue / PubSub)    |
               +------/------+-------\-----+
                     /                 \
                    /                   \
                   v                     v
     +-------------+-------------+  +----+----------------------+
     | Gemini Vision Model       |  | Gemini NLP Triage Model   |
     | (Image Moderation/Verify) |  | (Auto-tagging & Severity) |
     +---------------------------+  +---------------------------+
```

### 8.1 Visual Anomaly Verification & Image Moderation
* **Hook Point**: `afterSave` mongoose middleware.
* **AI Operation**: When an issue is stored, the image GCS URL is dispatched asynchronously to a Gemini visual moderation hook (`gemini-2.5-flash`). The model evaluates the image content to:
  * Detect and filter out offensive, violent, or unrelated images.
  * Verify that the image actually contains visual traces of the reported civic issue (e.g., verifying a pothole, broken streetlight, or garbage pile).

### 8.2 Automated Categorization & Severity Triage
* **Hook Point**: Post-insertion worker queue.
* **AI Operation**: The description is processed by Gemini NLP models to:
  * Extract semantic details and auto-classify the report into departments (e.g., classifying *"blocked drainage with dirty water flowing into street"* to `'SANITATION'` or `'WATER'`).
  * Grade severity (e.g., `'LOW'`, `'MEDIUM'`, `'HIGH'`) based on safety parameters outlined in the report (e.g., road blocks or active flooding are tagged `'HIGH'`).

### 8.3 Duplicate Detection
* **Hook Point**: Pre-insertion coordinates search.
* **AI Operation**: Querying Gemini embeddings to search previously reported issues within a 100-meter bounding box. If an active report matching the description already exists, the system flags the issue to avoid redundant work.
