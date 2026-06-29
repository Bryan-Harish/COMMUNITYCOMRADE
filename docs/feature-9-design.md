# Feature 9 Design: Department Helpline Directory & Civic Contact Infrastructure

## Document Metadata
* **Author:** Senior Solution Architect & Civic Governance Product Designer
* **Status:** Approved / Ready for Implementation
* **Target Version:** v1.9.0
* **System Context:** Integrates seamlessly into the existing MongoDB/Mongoose Express-Vite Full-Stack codebase.

---

## 1. High-Level Architecture

The **Department Helpline Directory & Contact Infrastructure** bridges the gap between active citizen issues and direct communication lines with governance offices. The architecture ensures that citizens have localized, context-aware, and authenticated access to the right service units while maintaining comprehensive tracking and security safeguards.

### System Topology & Interaction Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CLIENT ARCHITECTURE (Vite React Client)         │
│                                                                        │
│  ┌─────────────────────────┐  ┌───────────────────────┐  ┌──────────┐  │
│  │   Helpline Directory    │  │   Issue Detail Card   │  │  Admin   │  │
│  │   (Search & Filter)     │  │  (Assigned Contact)   │  │  Console │  │
│  └────────────┬────────────┘  └───────────┬───────────┘  └────┬─────┘  │
└───────────────┼───────────────────────────┼───────────────────┼────────┘
                │                           │                   │
                │ Secure HTTPS Requests     │                   │
                ▼                           ▼                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        API ROUTER / GATEWAY (Express + Node.js)        │
│                                                                        │
│      /api/helpline/departments       /api/helpline/analytics/track     │
│      /api/helpline/admin/manage      /api/issues/:issueNumber/contact  │
└───────────────┬───────────────────────────────────────────────┬────────┘
                │                                               │
                ▼                                               ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     CORE HELPLINE SERVICES (Node.js)                   │
│                                                                        │
│  ┌───────────────────────────┐         ┌─────────────────────────────┐ │
│  │    Locality Resolver      │◄────────┤      Search & Analytics     │ │
│  │ (Ward/District Matchmaker)│         │     (Aggregation Engine)    │ │
│  └─────────────┬─────────────┘         └──────────────┬──────────────┘ │
│                │                                      │                │
│                ▼                                      ▼                │
│  ┌───────────────────────────┐         ┌─────────────────────────────┐ │
│  │    Access Gatekeeper      │────────►│      Audit Log Service      │ │
│  │  (Role-based Controller)  │         │  (Admin Activity Recording) │ │
│  └─────────────┬─────────────┘         └──────────────┬──────────────┘ │
└────────────────┼──────────────────────────────────────┼────────────────┘
                  ▼                                      ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     PERSISTENCE LAYER (MongoDB / Mongoose)             │
│                                                                        │
│  ┌───────────────────────────┐         ┌─────────────────────────────┐ │
│  │    DepartmentDirectory    │         │  DepartmentContactAudit     │ │
│  │ DepartmentLocalityMapping │         │    HelplineAnalyticsLog     │ │
│  └───────────────────────────┘         └─────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Database Design (Mongoose Schemas)

The database design optimizes for low-latency searches, accurate hierarchical geographic targeting (Locality-Specific mappings), and rigorous auditable administrative actions.

### Collection 1: DepartmentDirectory (`departments`)
This collection represents the primary metadata and contact details of a municipal department or civil organization.

```typescript
import mongoose, { Schema, Document } from 'mongoose';

export interface IDepartmentDirectoryDoc extends Document {
  name: string;
  description: string;
  associatedCategories: string[]; // e.g. ['POTHOLE', 'STREET_LIGHT', 'GARBAGE']
  primaryHelpline: string;
  escalationHelpline: string;
  officeAddress: string;
  workingHours: string;
  email?: string;
  website?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: Date;
  updatedAt: Date;
  createdBy: mongoose.Types.ObjectId;
}

const DepartmentDirectorySchema = new Schema<IDepartmentDirectoryDoc>({
  name: { type: String, required: true, unique: true, index: true },
  description: { type: String, required: true },
  associatedCategories: [{ type: String, index: true }], // Used to map to Issue categories
  primaryHelpline: { type: String, required: true },
  escalationHelpline: { type: String, required: true },
  officeAddress: { type: String, required: true },
  workingHours: { type: String, required: true }, // e.g., "Mon-Fri: 9 AM - 5 PM, Sat: 9 AM - 1 PM"
  email: { type: String, lowercase: true, trim: true },
  website: { type: String, trim: true },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE', index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

export const DepartmentDirectoryModel = mongoose.models.DepartmentDirectory || 
  mongoose.model<IDepartmentDirectoryDoc>('DepartmentDirectory', DepartmentDirectorySchema);
```

### Collection 2: DepartmentLocalityMapping (`department_locality_mappings`)
This collection facilitates localization. A single department can have a fallback "Global/Centralized" contact, or specialized localized contacts for specific state wards, districts, and municipalities.

```typescript
export interface IDepartmentLocalityMappingDoc extends Document {
  departmentId: mongoose.Types.ObjectId;
  ward: string;       // e.g., "Ward 12", "All"
  district: string;   // e.g., "Bengaluru Urban", "All"
  state: string;      // e.g., "Karnataka", "All"
  isLocalitySpecific: boolean; // true if target is specific ward, false if fallback
  localOfficeAddressOverride?: string;
  localPrimaryHelplineOverride?: string;
  localEscalationHelplineOverride?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DepartmentLocalityMappingSchema = new Schema<IDepartmentLocalityMappingDoc>({
  departmentId: { type: Schema.Types.ObjectId, ref: 'DepartmentDirectory', required: true, index: true },
  ward: { type: String, required: true, index: true },
  district: { type: String, required: true, index: true },
  state: { type: String, required: true, index: true },
  isLocalitySpecific: { type: Boolean, default: false, index: true },
  localOfficeAddressOverride: { type: String },
  localPrimaryHelplineOverride: { type: String },
  localEscalationHelplineOverride: { type: String }
}, { timestamps: true });

// Create compound index for highly optimized regional matches
DepartmentLocalityMappingSchema.index({ state: 1, district: 1, ward: 1 });

export const DepartmentLocalityMappingModel = mongoose.models.DepartmentLocalityMapping || 
  mongoose.model<IDepartmentLocalityMappingDoc>('DepartmentLocalityMapping', DepartmentLocalityMappingSchema);
```

### Collection 3: DepartmentContactAudit (`department_contact_audits`)
Underpins administrative accountability, keeping records of every configuration change made to helplines.

```typescript
export interface IDepartmentContactAuditDoc extends Document {
  departmentId: mongoose.Types.ObjectId;
  actorId: mongoose.Types.ObjectId;
  actorRole: 'ADMIN';
  action: 'CREATE' | 'UPDATE' | 'DEACTIVATE' | 'ACTIVATE' | 'MAPPING_CREATE' | 'MAPPING_DELETE';
  changeDetails: {
    fieldsChanged: string[];
    previousState: Record<string, any>;
    newState: Record<string, any>;
  };
  timestamp: Date;
}

const DepartmentContactAuditSchema = new Schema<IDepartmentContactAuditDoc>({
  departmentId: { type: Schema.Types.ObjectId, ref: 'DepartmentDirectory', required: true, index: true },
  actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  actorRole: { type: String, enum: ['ADMIN'], default: 'ADMIN', required: true },
  action: { 
    type: String, 
    enum: ['CREATE', 'UPDATE', 'DEACTIVATE', 'ACTIVATE', 'MAPPING_CREATE', 'MAPPING_DELETE'], 
    required: true 
  },
  changeDetails: {
    fieldsChanged: [{ type: String }],
    previousState: { type: Schema.Types.Mixed },
    newState: { type: Schema.Types.Mixed }
  },
  timestamp: { type: Date, default: Date.now, index: true }
});

export const DepartmentContactAuditModel = mongoose.models.DepartmentContactAudit || 
  mongoose.model<IDepartmentContactAuditDoc>('DepartmentContactAudit', DepartmentContactAuditSchema);
```

---

## 3. Locality Mapping Design

Matching citizens with locality-specific helpline contacts is performed using a **layered hierarchical fallback resolution algorithm** executing at runtime.

### Hierarchical Fallback Resolution Strategy
When a Citizen loads their directory page, the Locality Resolver service queries the available directory mappings based on the user's profile metadata (`registeredWard`, `registeredDistrict`, `registeredState`).

```
                      [Locality Resolution Pipeline]
                                     │
                        ┌────────────▼────────────┐
                        │   Level 1: Exact Match  │
                        │  (Ward, District, State)│
                        └────────────┬────────────┘
                                     │
                              [Found Match?]
                                ├── YES ──► [Return Localized Helpline]
                                └── NO
                                     │
                        ┌────────────▼────────────┐
                        │ Level 2: District Match │
                        │   (District, State)     │
                        └────────────┬────────────┘
                                     │
                              [Found Match?]
                                ├── YES ──► [Return District-wide Helpline]
                                └── NO
                                     │
                        ┌────────────▼────────────┐
                        │  Level 3: State Match   │
                        │        (State)          │
                        └────────────┬────────────┘
                                     │
                              [Found Match?]
                                ├── YES ──► [Return State-wide Helpline]
                                └── NO
                                     │
                        ┌────────────▼────────────┐
                        │ Level 4: Global Fallback│
                        │  (Headquarters Central) │
                        └─────────────────────────┘
```

### Database Query Implementation Pattern
To resolve locality contacts efficiently:
```typescript
async function resolveDepartmentContact(departmentId: string, ward: string, district: string, state: string) {
  // Query mappings ordered by specificity (Ward Match is most specific)
  const mappings = await DepartmentLocalityMappingModel.find({
    departmentId,
    $or: [
      { ward, district, state },
      { ward: 'All', district, state },
      { ward: 'All', district: 'All', state },
      { ward: 'All', district: 'All', state: 'All' }
    ]
  }).lean();

  if (mappings.length === 0) return null;

  // Sort programmatically by level of specificity
  mappings.sort((a, b) => {
    const specificityA = (a.ward !== 'All' ? 4 : 0) + (a.district !== 'All' ? 2 : 0) + (a.state !== 'All' ? 1 : 0);
    const specificityB = (b.ward !== 'All' ? 4 : 0) + (b.district !== 'All' ? 2 : 0) + (b.state !== 'All' ? 1 : 0);
    return specificityB - specificityA; // Descending
  });

  return mappings[0]; // Most specific contact overrides
}
```

---

## 4. Search & Filtering Design

Citizens need instant access during critical situations. The search architecture supports fuzzy matching, categorization, and contextual filters.

### Search Index Strategy
We leverage MongoDB **Text Indexes** combined with regex matching filters to enable fluid, high-performance searching.

```typescript
// Create text search capability on Directory Fields
DepartmentDirectorySchema.index({
  name: 'text',
  description: 'text',
  associatedCategories: 'text'
});
```

### Advanced Filter Matrix

| Search Component | Input Vector | Backend Query Strategy |
| :--- | :--- | :--- |
| **Department Name** | Text String | Text Search (`$text`) or Fuzzy regex matching (`$regex`). |
| **Issue Category** | Option select / Tags | Search matching string in `associatedCategories` array. |
| **Locality** | Text / Selection | Matches active user location (`ward`, `district`, `state`). |
| **Service Type** | Urgent vs Followup | Filters based on presence of designated call capabilities. |

### API Implementation Schema (Express/Node)
```typescript
app.get('/api/helpline/departments/search', authenticateToken, async (req, res) => {
  const { query, category, ward, district, state } = req.query;
  const user = req.user;

  let dbQuery: any = { status: 'ACTIVE' };

  if (query) {
    dbQuery.$text = { $search: String(query) };
  }
  if (category) {
    dbQuery.associatedCategories = category;
  }

  const departments = await DepartmentDirectoryModel.find(dbQuery).lean();
  
  // Attach resolved localized contacts inline for each department record
  const enrichedDepartments = await Promise.all(departments.map(async (dept) => {
    const contactMapping = await resolveDepartmentContact(
      dept._id, 
      ward || user.registeredWard, 
      district || user.registeredDistrict, 
      state || user.registeredState
    );
    return {
      ...dept,
      localContact: contactMapping || null
    };
  }));

  res.json({ success: true, data: enrichedDepartments });
});
```

---

## 5. Admin Management Design

Administrators can configure, audit, and regulate contacts inside the Directory Management Panel.

### Admin Dashboard Component Workflows
1. **Directory Creation Form**:
   * Setup core department meta (Name, categories, standard office details).
   * Specify global standard helplines.
2. **Locality Mapper Tool**:
   * Interactive UI dropdowns showing State, District, and Ward structures.
   * Input local overrides for address, primary helplines, or escalation numbers.
3. **Status Toggle Switch**:
   * Instantly flip status from `ACTIVE` to `INACTIVE`.
   * Deactivated departments disappear from citizen directory searches in real-time.
4. **Audit History Log Timeline**:
   * A clean, read-only list visualizer that maps exactly who changed a helpline, what the old number was, and what the new one is.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ADMIN DIRECTORY CONSOLE                         │
├────────────────────────────────────────────────────────────────────────┤
│  [+ Add New Department]               [Search Departments...]         │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ WATER DEPARTMENT (Active)                          [Edit] [Deac] │  │
│  │ Primary: 1800-111-111 | Escalation: 1800-111-222                 │  │
│  │ Assigned Localities: Global, Ward A (Override), Ward B (Override) │  │
│  │ ──────────────────────────────────────────────────────────────── │  │
│  │ [Locality Mapping Overrides]                                     │  │
│  │   • Ward A -> Override Primary: 1800-111-112 [Delete Match]       │  │
│  │   • Ward B -> Override Address: "Water Board office, Ward B"     │  │
│  │   [+ Map New Locality Override]                                  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Citizen Experience Design

A highly intuitive, visual UI prioritizing accessibility, click-to-call response speed, and quick-search functionality during stressful civil situations.

### User Interfaces & Page Layouts

#### UI 1: Department Directory Page (`/directory`)
* **Header**: Spacious search container featuring quick-category chips (e.g. `⚡ Electricity`, `💧 Water`, `🛣️ Roads`, `🗑️ Sanitation`).
* **Bento Grid Cards**: Displays departments with responsive action layouts.
* **Local Indicator**: Banner on top showing "📍 Displaying contacts optimized for **Ward 12, Bengaluru Urban**".

#### UI 2: Contact Card Component
* Designed with micro-animations (`motion` from `motion/react`) for crisp hover feedbacks.
* Clear visual demarcation between **Primary Contact (Level 1)** and **Escalation Contact (Level 2)**.
* Includes:
  * **Copy button** with success animations (icon change to checkmark).
  * **Call Button** using standard `tel:` protocol supporting instant Click-to-Call dialing on iOS and Android devices.

```
┌────────────────────────────────────────────────────────┐
│ 📍 Water Supply Department                             │
│ ────────────────────────────────────────────────────── │
│ 📞 Primary Helpline: 1800-111-111           [Copy] [📞] │
│ 🚨 Escalation: 1800-111-222                 [Copy] [📞] │
│                                                        │
│ 🕒 Hours: Mon-Fri (9:00 AM - 5:00 PM)                  │
│ 🏢 Office: Water Board Building, Ward 12               │
└────────────────────────────────────────────────────────┘
```

#### UI 3: Issue Page Contact Section
* Positioned contextually inside the Citizen's reported issue details container.
* Automatically fetches the assigned department contact matching the issue's category and the citizen's locality.
* **Why**: Saves the user from digging through directories if they are looking for updates about an active grievance.

---

## 7. API Endpoint Specification

All APIs are secured via JWT authentication, following standard project routes structure.

### 1. Retrieve Contextual Department Directory (Citizen)
* **Endpoint**: `GET /api/helpline/directory`
* **Headers**: `Authorization: Bearer <JWT_TOKEN>`
* **Query Params**: `category` (optional), `query` (optional)
* **Response `200 OK`**:
```json
{
  "success": true,
  "localityContext": {
    "ward": "Ward 12",
    "district": "Bengaluru Urban",
    "state": "Karnataka"
  },
  "data": [
    {
      "id": "6a3fb9cf2b...",
      "name": "Water Board Department",
      "description": "Manages local water distribution networks and clean supply pipelines.",
      "primaryHelpline": "1800-111-111",
      "escalationHelpline": "1800-111-222",
      "officeAddress": "Central Water Board Headquarters, Bangalore",
      "workingHours": "9 AM - 5 PM",
      "status": "ACTIVE",
      "isLocalizedOverride": true,
      "localOfficeAddress": "Ward 12 Water Depot, Service Road",
      "localPrimaryHelpline": "1800-111-115"
    }
  ]
}
```

### 2. Retrieve Assigned Department Contact for a Specific Issue
* **Endpoint**: `GET /api/issues/:issueNumber/assigned-contact`
* **Headers**: `Authorization: Bearer <JWT_TOKEN>`
* **Response `200 OK`**:
```json
{
  "success": true,
  "issueNumber": "CC-2026-000008",
  "assignedDepartment": {
    "name": "Sanitation & Garbage Department",
    "primaryHelpline": "1800-444-111",
    "escalationHelpline": "1800-444-222",
    "officeHours": "Mon-Sat: 8 AM - 4 PM",
    "officeAddress": "Muncipality Depot 4, Ward 12"
  }
}
```

### 3. Create Department Record (Admin Only)
* **Endpoint**: `POST /api/helpline/admin/departments`
* **Headers**: `Authorization: Bearer <JWT_TOKEN>`
* **Payload**:
```json
{
  "name": "Roads & Highways Department",
  "description": "Responsible for paving, structural repairs, and potholes correction.",
  "associatedCategories": ["POTHOLE", "STREET_LIGHT"],
  "primaryHelpline": "1800-222-111",
  "escalationHelpline": "1800-222-222",
  "officeAddress": "Central PWD Complex, Area 4",
  "workingHours": "9:30 AM - 6:00 PM"
}
```

### 4. Create Locality Specific Override Mapping (Admin Only)
* **Endpoint**: `POST /api/helpline/admin/mappings`
* **Headers**: `Authorization: Bearer <JWT_TOKEN>`
* **Payload**:
```json
{
  "departmentId": "6a3fb9cf2b...",
  "ward": "Ward A",
  "district": "Bengaluru Urban",
  "state": "Karnataka",
  "localPrimaryHelplineOverride": "1800-222-115",
  "localOfficeAddressOverride": "PWD Block Office, Ward A Sub-center"
}
```

---

## 8. Security Design & Authorization Matrix

The helpline directory mandates strict read/write boundaries to prevent unauthorized adjustments to public helpline structures, shielding citizens from contact fraud or phishing edits.

### Access Control Matrix

| System Resource | Public Visitor | Registered Citizen | Department Officer | Administrator |
| :--- | :--- | :--- | :--- | :--- |
| **Directory Browse** | Denied | Read-Only (Local Context) | Read-Only | Read-Only |
| **Search Operations** | Denied | Read-Only | Read-Only | Read-Only |
| **Call Click Tracker** | Denied | Write (Analytics Log) | Write (Analytics) | Write (Analytics) |
| **Create/Edit Department** | Denied | Denied | Denied | Write & Modify |
| **Locality Overrides** | Denied | Denied | Denied | Write & Modify |
| **Audit Logs View** | Denied | Denied | Denied | Full Access |

### API Route Security Enforcement
Express route middleware leverages authentication and role authorization boundaries:

```typescript
// Authorization Helper inside server.ts
export const authorizeRoles = (...allowedRoles: string[]) => {
  return (req: any, res: any, next: any) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Access Denied: Insufficient permissions.' }
      });
    }
    next();
  };
};

// Route Security Application Examples
app.post('/api/helpline/admin/departments', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => { ... });
app.put('/api/helpline/admin/departments/:id', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => { ... });
app.delete('/api/helpline/admin/mappings/:id', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => { ... });
```

---

## 9. Analytics Tracking Engine

Analytics logging records directory behavior, tracking demand, localization density, and escalating citizen friction points without storing personally identifiable information.

### Collection Definition: HelplineAnalyticsLog (`helpline_analytics_logs`)
```typescript
export interface IHelplineAnalyticsLogDoc extends Document {
  eventType: 'DIRECTORY_VIEW' | 'SEARCH' | 'NUMBER_COPY' | 'CALL_CLICK';
  departmentId?: mongoose.Types.ObjectId;
  searchQuery?: string;
  categoryFilter?: string;
  userWard: string;
  userDistrict: string;
  userState: string;
  deviceType: 'MOBILE' | 'DESKTOP' | 'TABLET';
  timestamp: Date;
}

const HelplineAnalyticsLogSchema = new Schema<IHelplineAnalyticsLogDoc>({
  eventType: { 
    type: String, 
    enum: ['DIRECTORY_VIEW', 'SEARCH', 'NUMBER_COPY', 'CALL_CLICK'], 
    required: true, 
    index: true 
  },
  departmentId: { type: Schema.Types.ObjectId, ref: 'DepartmentDirectory', index: true },
  searchQuery: { type: String },
  categoryFilter: { type: String, index: true },
  userWard: { type: String, required: true, index: true },
  userDistrict: { type: String, required: true, index: true },
  userState: { type: String, required: true, index: true },
  deviceType: { type: String, enum: ['MOBILE', 'DESKTOP', 'TABLET'], required: true },
  timestamp: { type: Date, default: Date.now, index: true }
});

export const HelplineAnalyticsLogModel = mongoose.models.HelplineAnalyticsLog || 
  mongoose.model<IHelplineAnalyticsLogDoc>('HelplineAnalyticsLog', HelplineAnalyticsLogSchema);
```

### Metrics Dashboard Aggregations (Admin View)
Using MongoDB Aggregations, the Admin Dashboard can calculate:
1. **Most Accessed Departments**: Identifies which utility is receiving the highest volume of citizen call clicks or searches.
2. **Contact Access Density (Locality Specific)**: Identifies which Wards/Districts are experiencing active civic follow-ups.
3. **Escalation Volume Insights**: High click volumes on the escalation contact lines (versus primary numbers) flags departments with unresolved performance issues.

---

## 10. Scalability & Operational Considerations

As citizen adoption surges, the following design guidelines prevent database and compute exhaustion.

### Operational Protocols & Cache Strategy
1. **Locality Resolution Caching**:
   * Resolved mapping calculations (e.g. mapping Ward X to Water Department) change infrequently. The server should cache mapping query combinations for up to 30 minutes in application memory, using local key structures (e.g. `mapped-contact-{ward}-{district}-{state}`).
2. **Index Optimization**:
   * Compound indexes on geographic targeting collections (`state`, `district`, `ward`) prevent full collection scans during matching procedures.
3. **Write-Heavy Analytics Offloading**:
   * Click-to-call and view trackers can be batch-saved to the database, or structured under memory buffers, ensuring user-facing REST responses are never held up by logging procedures.
4. **Resiliency Fallbacks**:
   * In the rare event of a database connectivity failure, the client-side UI falls back gracefully to hardcoded municipal core central helplines stored as persistent fallback resource properties within client configuration files.
