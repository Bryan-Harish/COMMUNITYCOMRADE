# Design Document: Analytics, Dashboards, Heatmaps, and AI Insights (Feature 6)

This design document outlines the technical architecture, dashboard user experiences, analytical engines, heatmap models, algorithmic formulas, schema extensions, aggregation strategies, REST API specifications, and security considerations for CommunityComrade Feature 6: **Dashboards, Heatmaps, Analytics, and AI Insights**.

---

## 1. High-Level Architecture

The Analytics and Insights subsystem utilizes a hybrid processing pipeline (Lambda-style architecture) to provide real-time updates for transactional operations (such as individual issue changes and voting activities) alongside performant, pre-aggregated OLAP views for map overlays, trend charts, and AI model predictions.

### 1.1 Architectural Blueprint

```
                                      [User Interactions]
                  (Citizens logging/voting, Officers resolving, Admins auditing)
                                               │
                                               ▼
                                   ┌──────────────────────┐
                                   │  Express REST API    │
                                   └───────────┬──────────┘
                                               │
                       ┌───────────────────────┴───────────────────────┐
                       ▼ (Write Path)                                  ▼ (Read Path)
           ┌───────────────────────┐                        ┌─────────────────────┐
           │ MongoDB Transactional │                        │ Redis Caching Layer │
           │     Database (OLTP)   │                        │ (Dashboard Widgets) │
           └───────────┬───────────┘                        └──────────▲──────────┘
                       │                                               │
                       ├──────────────────────┐                        ├─────────────────────┐
                       ▼ (Change Stream)      ▼ (Hourly Cron/Agg)      │                     │
           ┌───────────────────────┐   ┌───────────────────────┐       │                     │
           │ Real-Time WebSocket   │   │  Pre-Aggregation and  │───────┘                     │
           │   Event Publisher     │   │  Materialized Views   │                             │
           └───────────┬───────────┘   └──────────┬────────────┘                             │
                       │                          │                                          │
                       ▼                          ▼                                          ▼
                [Live Updates]             [Heatmaps Data]                       [Analytics & Reports]
             (Active Dashboard UI)     (Mapbox Hexbins / Heatmaps)                 (Recharts & D3)
```

### 1.2 Core Components & Processing Pipelines

1. **Transactional Database (OLTP)**: The primary database (MongoDB or SQLite/local JSON) handles incoming writes. Raw collections (`issues`, `resolution_verifications`, `users`) contain write-optimized indexes.
2. **Materialized Aggregation Engine (OLAP)**: To avoid performance degradation during complex analytics queries over tens of thousands of issues, a periodic cron service runs every 30 minutes to pre-calculate ward-level locality indices, department-level SLA metrics, and historical time-series logs into specialized snapshot collections (`ward_hourly_snapshots`, `department_daily_summaries`).
3. **Multimodal AI Analysis Interface**: Interacts with the Gemini API to analyze aggregated spatial-temporal data, text descriptions of recurring patterns, and workload metadata to output high-value predictive reports.
4. **Geo-Spatial Query Pipeline**: Formulates cluster boundaries and hexbin aggregations using geographical indexing (e.g., MongoDB `$geoNear` or boundary filters) to generate light JSON payloads for client-side mapping rendering.

---

## 2. Dashboard Design

The UI utilizes custom metrics, distinct layouts, and gamified statistics customized for each of the three user personas to guide priority actions.

### 2.1 Citizen Dashboard

The Citizen Dashboard focuses on driving local engagement, fostering transparency, and providing immediate feedback on how their oversight activities contribute to the health of their community.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  WELCOME BACK, CITIZEN GUARDIAN! (Silver Tier - Rank #14 in Ward 8)          │
├──────────────────────────────────────┬───────────────────────────────────────┤
│  MY ISSUES                           │  OPEN ISSUES NEARBY                   │
│  - CC-2026-000045 (Pothole)  [RESOL] │  - Water Leak (250m away)   [IN_PROG] │
│  - CC-2026-000098 (Garbage)  [OPEN ] │  - Streetlight Out (400m)   [PENDING] │
├──────────────────────────────────────┼───────────────────────────────────────┤
│  LOCALITY HEALTH SCORE               │  CIVIC CONTRIBUTION STATS             │
│              [  84 / 100  ]          │  - Community Hero Rank: #14 / 1,240   │
│         Active / Level 2 Health      │  - Total Impact Score: 1,450 pts      │
│  "Minor backlog in Road repairs"     │  - Verification Activity: 42 Votes    │
└──────────────────────────────────────┴───────────────────────────────────────┘
```

*   **My Issues**: Dynamic tracker filtering active, resolved, or pending verification issues reported by the user.
*   **Open Issues Nearby**: A physical, geo-fenced feed within a 2.5km radius of the citizen's registered coordinates, prompting them to keep watch or endorse.
*   **Locality Health Score**: A physical, visual dial displaying the real-time ward health calculated using local repair trends (see Section 7).
*   **Community Hero Rank**: Local leaderboard comparing verified citizens by active contributions within their home ward.
*   **Impact Score**: Gamified points accumulator reflecting verified reporting, accurate consensus voting alignment, and successful problem identifications.
*   **Verification Activity**: Historical tally of approvals/rejections cast by the citizen with high-contrast trend charts detailing their voting patterns.

---

### 2.2 Officer Dashboard

The Officer Dashboard acts as a command console designed to manage workload distribution, optimize dispatch routing, and maintain high standards of SLA compliance.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  OFFICER DASHBOARD (Department of Sanitation | Ward 12 & 14)                  │
├──────────────────────────────────────┬───────────────────────────────────────┤
│  ACTIVE QUEUE                        │  PERFORMANCE METRICS                  │
│  - [Assigned]: 8 Complaints          │  - Avg Resolution Time: 18.4 Hours    │
│  - [In Progress]: 3 Complaints       │  - SLA Compliance Rate: 92.5%         │
│  - [Pending Verification]: 5 Cases   │  - Department Rank: #2 out of 8       │
├──────────────────────────────────────┴───────────────────────────────────────┤
│  SLA COMPLIANCE PROGRESSION                                                  │
│  [██████████████████████████████████████████████████████████▒░░░]  92% Target │
└──────────────────────────────────────────────────────────────────────────────┘
```

*   **Assigned Issues**: Queue of issues routed to the officer based on department specialization and geography.
*   **In Progress Issues**: Interactive board representing issues being currently addressed.
*   **Resolved Issues / Pending Verification**: Backlog of issues resolved by the officer that are awaiting local community consensus voting. Includes details on citizen feedback and voting progress.
*   **Average Resolution Time**: Dynamic KPI indicating the mean elapsed duration between assignment and officer resolution submission.
*   **SLA Compliance Rate**: Percentage of issues resolved prior to their calculated hour-limit target based on priority thresholds.
*   **Department Performance Tracker**: Comparison panel contrasting the officer's performance metrics against the municipal department baseline.

---

### 2.3 Admin Dashboard

The Admin Dashboard provides macro-level operations oversight, surfacing critical municipal statistics, system bottle-necks, citizen engagement rates, and AI-driven predictive insights.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  MUNICIPAL ADMINISTRATION COMMAND PLATFORM                                  │
├──────────────────────────────────────┬───────────────────────────────────────┤
│  MUNICIPAL HEATMAP PREVIEW           │  SYSTEM METRICS SUMMARY               │
│  [   Interactive map of density   ]  │  - Active Open Issues: 452            │
│  Hotspots: Ward 8 (Roads)            │  - SLA Breach Rate: 4.8%              │
│                                      │  - Active Verified Citizens: 18,452   │
├──────────────────────────────────────┼───────────────────────────────────────┤
│  DEPARTMENT PERFORMANCE RATINGS      │  CIVIC ENGAGEMENT INDEX               │
│  1. Sanitation Department (94.2%)    │  - Total Verification Votes: 12,402   │
│  2. Power & Streetlights (89.1%)     │  - Citizen Consensus Accuracy: 96.8%   │
│  3. Roads & Drainage (71.3% - ALERT) │  - Average Votes / Issue: 6.4         │
├──────────────────────────────────────┴───────────────────────────────────────┤
│  GEMINI AI INSIGHTS ENGINE                                                   │
│  ▲ WARNING: Seasonal monsoon pooling predicted in Ward 14 within 72 hours.     │
│  ▲ ANOMALY: Drainage complaints in Ward 3 spiked +140% - check officer logs. │
└──────────────────────────────────────────────────────────────────────────────┘
```

*   **Issue & Resolution Statistics**: Real-time dials tracking incoming volume versus completion rates, cross-referenced by ward.
*   **SLA Metrics Dashboard**: Tabular breakdown of SLA breach incidents, categorized by department, showing root-cause variables.
*   **Department Performance Comparative Matrix**: Side-by-side comparison of municipal agencies based on volume, speed, accuracy, and citizen rejection rates.
*   **Citizen Participation Board**: Macro overview of verification activity, demographic distributions of active users, and ward-by-ward civic health indices.
*   **Gemini AI Insights Console**: Dedicated natural language output container highlighting predictive hotspots, anomaly detections, and resource allocation recommendations.

---

## 3. Analytics Design

Analytics charts are powered by a structured backend data stream that classifies time, category, and spatial relationships.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  MUNICIPAL TREND ANALYSIS & PERFORMANCE METRICS                              │
├──────────────────────────────────────────────────────────────────────────────┤
│  ISSUE TRENDS OVER TIME (Incoming vs. Closed)                                │
│   Vol ▲                                                                      │
│    120│      /\                                                              │
│     80│  _--/  \--_     [Incoming]                                           │
│     40│ /          \                                                         │
│      0───┴────┴────┴────┴────┴────► Time                                     │
│         Jan  Feb  Mar  Apr  May                                              │
├──────────────────────────────────────┬───────────────────────────────────────┤
│  SLA BREACH INCIDENTS BY CATEGORY    │  DEPARTMENT REOPENING RATES           │
│  - Drainage & Sewage: 45 (Worst)     │  - Roads: 18.2% (High Re-work)        │
│  - Roads & Pavements: 22             │  - Sanitation: 2.1% (Excellent)       │
│  - Streetlights: 4                   │  - Power & Safety: 1.4%               │
└──────────────────────────────────────┴───────────────────────────────────────┘
```

### 3.1 Issue Trends
*   **Time-Series Tracking**: Captures daily, weekly, and monthly counts of incoming complaints.
*   **Category Pareto Model**: Isolates which issue categories represent the highest proportion of civic complaints to guide municipal budgeting.
*   **Priority Distribution**: Heat charts showing the ratio of High, Medium, and Low-priority tickets logged across the city.

### 3.2 Resolution Trends
*   **Turnaround Cycle (Cycle Time)**: Aggregates the duration from original logging to final community closure.
*   **Rework & Reopening Rates**: Tracks the percentage of resolutions submitted by officers that fail community validation and are subsequently reopened by citizen vote. High reopening rates indicate potential officer cutting of corners or inadequate verification documentation.
*   **First-Time-Right (FTR) Index**: Measures the percentage of issues resolved successfully on the officer's first submission attempt without citizen rejection.

### 3.3 Department Performance & SLA Breaches
*   **Queue Health Indices**: Measures the ratio of incoming complaints to closed complaints (Burnup/Burndown metric) per department.
*   **SLA Breach Attribution**: Tracks the timestamp and geography of issues that exceed their targeted SLA threshold, isolating systemic patterns (e.g., specific departments experiencing bottlenecks on weekends, or key wards suffering from lack of staff).

### 3.4 Community Participation Analytics
*   **Vote Density Distribution**: Time-series charts detailing the distribution of community approvals and rejections across various municipal wards.
*   **Consensus Speed Index**: Tracks how quickly (in hours) citizens mobilize to reach the required +3 net score threshold once an officer posts a resolution.

---

## 4. Heatmap Design

Heatmaps translate geographical coordinates into visual density models, enabling authorities to deploy physical assets directly to critical problem clusters.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  GEOGRAPHIC INFRASTRUCTURE DENSITY & PERFORMANCE HEATMAP                      │
├──────────────────────────────────────────────────────────────────────────────┤
│  [  Mapbox GL Overlay Map  ]                                                 │
│                                                                              │
│       ( Ward 4 )              ( Ward 8 )             ( Ward 14 )             │
│      ┌──────────┐            ┌──────────┐           ┌──────────┐             │
│      │  [░░░]   │            │  [███]   │           │  [▒▒▒]   │             │
│      │ Low Dens │            │ Hotspot! │           │ Med Dens │             │
│      └──────────┘            └────┬─────┘           └──────────┘             │
│                                   │                                          │
│                                   ▼                                          │
│                       Cluster Alert: 48 active pothole                       │
│                       complaints within 150m radius.                         │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 4.1 Issue Density Heatmaps
*   **Algorithmic Engine**: Renders geographical coordinates using Gaussian Kernel Density Estimation (KDE) or spatial point clustering algorithms (such as DBSCAN).
*   **Mapbox Integration**: Layered utilizing a WebGL heatmap layer which dynamically adjusts cluster radius and intensity based on the viewport zoom level.
*   **Interactive Hotspot Isolation**: Clicking an active hotspot cluster triggers a local bento-grid overlay showing the top reported categories within that boundary.

### 4.2 Category Heatmaps
*   **Multi-Spectrum Mapping**: Filters density layers using color spectrums assigned to specific municipal categories (e.g., Emerald for Greenery/Sanitation, Coral for Water/Sewage, Amber for Roads, Indigo for Public Safety).
*   **Interdependency Mapping**: Highlights spatial overlaps (e.g., high density of both water leaks and road erosion in the same block, indicating structural sub-surface damage).

### 4.3 Resolution Heatmaps
*   **Delta-Mapping Overlay**: Contrasts active issues (represented as hot-colored clusters) against completed/community-verified issues (represented as cool-colored anchors).
*   **Inequality Visualizer**: Highlights wards that have high active queues but slow resolution rates compared to neighboring areas, ensuring equitable civic resource allocation.

### 4.4 Citizen Participation Heatmaps
*   **Civic Engagement Intensity**: Maps the coordinates of cast verification votes rather than issue locations.
*   **Oversight Desert Warnings**: Visualizes areas with low citizen activity ("Participation Deserts"). This notifies administrators to initiate local community recruitment drives or run verification outreach.

---

## 5. AI Insights Design

The system integrates Gemini's large language model capabilities to convert quantitative data into human-digestible, predictive reports and proactive warnings.

### 5.1 System Integration & Data Package Construction
Every week, a system-orchestrated agent pipeline gathers historical logs, active issue tallies, department latency metrics, and climate/weather forecasts into a highly dense semantic prompt context:

```
+------------------------------------------------------------------------------------+
|                                AI Pipeline Payload                                 |
+------------------------------------------------------------------------------------+

1. Historical Ticket Log (Past 30 Days): Category, Location, Ward, Open Date, Close Date.
2. Ward Spatial Coordinates: Grouped clusters of active unresolved complaints.
3. Department Backlog Counts: Queue sizes, active officers per department, SLA breach rates.
4. Climate Metadata API: 7-day municipal rain, temperature, and storm predictions.
```

### 5.2 Gemini Prompt Design
```text
You are the Lead Data Scientist and Municipal Resource Planning Agent for CommunityComrade.
Analyze the provided municipal dataset and generate high-fidelity, predictive, and actionable insights.

Perform the following tasks:
1. Identify "Recurring Issues": Find duplicate or recurring complaints in close geographic proximity (within 100 meters) that indicate band-aid fixes instead of root-cause resolutions (e.g., same pothole filled multiple times).
2. Calculate "Predicted Hotspots": Cross-reference active structural complaints with weather/climate forecast data (e.g., heavy rain predicted over damaged drainage networks in Ward 12).
3. Diagnose "Department Workloads": Pinpoint departments suffering from severe bottlenecks, growing queues, and high SLA breach patterns, suggesting precise staffing shifts.
4. Highlight "Risk Areas": Isolate high-liability complaints (e.g., open high-voltage cables near public schools, or missing sewer grates in active walkways).

Structure your output strictly in the following JSON format:
{
  "recurringIssues": [
    { "title": "...", "coordinates": [lng, lat], "count": 5, "severity": "HIGH", "recommendation": "..." }
  ],
  "predictedHotspots": [
    { "ward": "...", "riskFactor": 0.85, "cause": "...", "preventativeAction": "..." }
  ],
  "workloadBottlenecks": [
    { "department": "...", "activeQueue": 142, "slaBreachRate": "34%", "analysis": "..." }
  ],
  "criticalRisks": [
    { "issueNumber": "...", "description": "...", "hazardType": "SAFETY", "urgency": "IMMEDIATE" }
  ]
}
```

---

## 6. Database Changes

To store dashboards statistics, historical analytics, and AI insights efficiently, we expand the schema and introduce three new collections: `WardMetrics`, `DepartmentMetrics`, and `AIPredictiveInsights`.

### 6.1 Database Schema Diagram

```
  ┌─────────────────────────────────┐
  │              User               │
  ├─────────────────────────────────┤
  │ _id (ObjectId)                  │
  │ name (String)                   │
  │ role (Enum)                     │
  │ leaderboardScore (Number)       │
  │ impactScore (Number)            │◄────────────────────────┐
  └─────────────────────────────────┘                         │
                                                              │ Calculates individual contribution
  ┌─────────────────────────────────┐                         │
  │              Issue              │                         │
  ├─────────────────────────────────┤                         │
  │ _id (ObjectId)                  │                         │
  │ status (Enum)                   │                         │
  │ location (Point GeoJSON)        │                         │
  │ priority (Enum)                 │                         │
  │ reporterWard (String)           │                         │
  └────────────────┬────────────────┘                         │
                   │                                          │
                   │ Has many                                 │
                   ▼                                          │
  ┌─────────────────────────────────┐                         │
  │     ResolutionVerification      │                         │
  ├─────────────────────────────────┤                         │
  │ _id (ObjectId)                  │                         │
  │ citizenUserId (ObjectId)  ──────┼─────────────────────────┘
  │ action (Enum: VERIFY/REJECT)    │
  │ media (Array of MediaObjects)   │◄── NEW: Stores citizen photo/video evidence
  └─────────────────────────────────┘
```

### 6.2 New Schema: `WardMetrics` (For Locality Health Score)
Pre-calculated metrics stored at the ward level to optimize Citizen Dashboard rendering.

```json
{
  "$jsonSchema": {
    "bsonType": "object",
    "required": [
      "_id",
      "wardName",
      "localityHealthScore",
      "activeIssueCount",
      "resolvedIssueCount",
      "slaBreachCount",
      "citizenParticipationRate",
      "lastUpdated"
    ],
    "properties": {
      "_id": { "bsonType": "objectId" },
      "wardName": { "bsonType": "string" },
      "localityHealthScore": { 
        "bsonType": "number",
        "minimum": 0,
        "maximum": 100
      },
      "activeIssueCount": { "bsonType": "number" },
      "resolvedIssueCount": { "bsonType": "number" },
      "slaBreachCount": { "bsonType": "number" },
      "citizenParticipationRate": { "bsonType": "number" },
      "topIssuesByCategory": {
        "bsonType": "array",
        "items": {
          "bsonType": "object",
          "required": ["category", "count"],
          "properties": {
            "category": { "bsonType": "string" },
            "count": { "bsonType": "number" }
          }
        }
      },
      "lastUpdated": { "bsonType": "date" }
    }
  }
}
```

### 6.3 New Schema: `AIPredictiveInsights`
Stores the weekly synthesized JSON report from the Gemini AI Analysis pipeline.

```json
{
  "$jsonSchema": {
    "bsonType": "object",
    "required": [
      "_id",
      "generatedAt",
      "recurringIssues",
      "predictedHotspots",
      "workloadBottlenecks",
      "criticalRisks"
    ],
    "properties": {
      "_id": { "bsonType": "objectId" },
      "generatedAt": { "bsonType": "date" },
      "recurringIssues": { "bsonType": "array" },
      "predictedHotspots": { "bsonType": "array" },
      "workloadBottlenecks": { "bsonType": "array" },
      "criticalRisks": { "bsonType": "array" }
    }
  }
}
```

---

## 7. Aggregation Strategy & Algorithmic Formulas

To maintain numerical objectivity, we define precise mathematical formulas to calculate municipal health, personal impact, and citizen-alignment scores.

### 7.1 Locality Health Score (LHS)
The Locality Health Score represents the overall health of a specific ward on a scale from $0$ to $100$. It is calculated hourly using a weighted balance of four critical metrics:

$$LHS = \max\left(0, \min\left(100, 100 \times \left( w_r \cdot S_{resolved} + w_{sla} \cdot S_{sla} + w_{sev} \cdot S_{severity} + w_p \cdot S_{participation} \right)\right)\right)$$

#### Coefficient Weight Allocation
*   **Resolution Ratio ($S_{resolved}$)**, Weight $w_r = 0.35$: Measures the percentage of issues resolved.
    $$S_{resolved} = 1.0 - \frac{I_{active}}{I_{total\_logged\_30d} + 1.0}$$
*   **SLA Compliance ($S_{sla}$)**, Weight $w_{sla} = 0.30$: Measures timely delivery.
    $$S_{sla} = 1.0 - \frac{I_{breached\_30d}}{I_{resolved\_30d} + 1.0}$$
*   **Severity Penalty ($S_{severity}$)**, Weight $w_{sev} = 0.20$: Measures the impact of critical issues.
    $$S_{severity} = 1.0 - \min\left(1.0, \frac{\sum_{i \in I_{active}} \text{PriorityWeight}(i)}{\text{MaxAcceptableSeverityThreshold}}\right)$$
    $$\text{PriorityWeight}(i) = \begin{cases} 3.0 & \text{if priority is HIGH} \\ 2.0 & \text{if priority is MEDIUM} \\ 1.0 & \text{if priority is LOW} \end{cases}$$
*   **Citizen Participation ($S_{participation}$)**, Weight $w_p = 0.15$: Measures community engagement.
    $$S_{participation} = \min\left(1.0, \frac{\text{TotalVotesCast\_30d}}{\text{ActiveCitizensInWard} \times 2.0}\right)$$

---

### 7.2 Community Impact Score (CIS)
The Community Impact Score measures an individual citizen's civic engagement. It accumulates dynamically through verified, high-quality actions:

$$CIS_u = \left( R_u \times 50 \right) + \left( V_u \times 10 \right) + \left( C_u \times 25 \right) + \left( \text{Streak}_u \times 15 \right) + \left( E_u \times 30 \right)$$

*   $R_u$: Number of validated issues reported by the user that were successfully resolved.
*   $V_u$: Number of verification votes cast by the user.
*   $C_u$: Consensus Alignment Bonus — Awarded when the user's vote aligns with the final community consensus.
*   $\text{Streak}_u$: Active consecutive weeks with at least one report or vote registered on the platform.
*   $E_u$: Quality Evidence Bonus — Awarded when the user uploads valid photo/video evidence during a verification vote that is validated by administrators.

---

### 7.3 Civic Health Index (CHI)
The Civic Health Index aggregates ward-level LHS scores to evaluate the overall health of the entire municipality, factoring in spatial population densities and geographic sizes:

$$CHI = \sum_{w \in W} \left( LHS_w \times \frac{\text{Population}_w}{\text{TotalCityPopulation}} \right) \times \left( 1.0 + \ln\left(1.0 + \text{ParticipationRate}_w\right) \right)$$

This formula scales the physical health of a ward ($LHS_w$) by its population size, applying an engagement multiplier. This reward ensures that highly engaged communities are prioritized in performance indexes.

---

## 8. API Design

The following endpoints support Feature 6, using standard JWT authorization headers.

### 8.1 `GET /api/analytics/dashboard/citizen`
Retrieves personalized metrics, local issues, and gamified scores for the logged-in citizen.

*   **Access level**: Authenticated `CITIZEN`.
*   **Response (`200 OK`)**:
```json
{
  "success": true,
  "data": {
    "userId": "usr_9281a83b",
    "userName": "Ramesh Kumar",
    "ward": "Ward 8",
    "leaderboard": {
      "rank": 14,
      "totalInWard": 1240,
      "tier": "Silver Guardian"
    },
    "impactScore": 1450,
    "localityHealth": {
      "score": 84,
      "status": "Healthy",
      "summary": "Minor backlog in Road repairs"
    },
    "verificationActivity": {
      "totalVotesCast": 42,
      "approvals": 30,
      "rejections": 12,
      "consensusAccuracyRate": 0.95
    }
  }
}
```

### 8.2 `GET /api/analytics/dashboard/officer`
Retrieves work queue statistics, assignment history, and SLA performance indicators for the authenticated officer.

*   **Access level**: Authenticated `DEPARTMENT_OFFICER`.
*   **Response (`200 OK`)**:
```json
{
  "success": true,
  "data": {
    "officerId": "off_2210c44f",
    "departmentName": "Roads & Pavements",
    "assignedWards": ["Ward 12", "Ward 14"],
    "workQueue": {
      "assigned": 8,
      "inProgress": 3,
      "pendingVerification": 5,
      "completed": 114
    },
    "performance": {
      "averageResolutionTimeHours": 18.4,
      "slaCompliancePercentage": 92.5,
      "reworkPercentage": 4.2
    }
  }
}
```

### 8.3 `GET /api/analytics/dashboard/admin`
Retrieves municipal statistics, department rankings, queue bottlenecks, and high-priority action alerts.

*   **Access level**: Authenticated `ADMIN`.
*   **Response (`200 OK`)**:
```json
{
  "success": true,
  "data": {
    "summary": {
      "activeOpenIssues": 452,
      "resolvedPendingVerification": 112,
      "closed30Days": 984,
      "overallSlaBreachPercentage": 4.8
    },
    "departmentLeagueTable": [
      { "department": "Sanitation", "activeQueue": 24, "slaCompliance": 94.2, "rank": 1 },
      { "department": "Power", "activeQueue": 48, "slaCompliance": 89.1, "rank": 2 },
      { "department": "Roads & Drainage", "activeQueue": 184, "slaCompliance": 71.3, "rank": 3 }
    ],
    "systemAlerts": [
      { "type": "SLA_BREACH_WARNING", "count": 14, "ward": "Ward 14", "urgency": "HIGH" }
    ]
  }
}
```

### 8.4 `GET /api/analytics/heatmaps?type=density`
Provides spatial coordinates clustered for heatmap visualization.

*   **Query Parameters**:
    *   `type`: String - One of `density`, `category`, `resolution`, `participation`.
    *   `category`: String (Optional) - Filter by issue category (e.g., `ROADS`).
*   **Response (`200 OK`)**:
```json
{
  "success": true,
  "data": {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "geometry": { "type": "Point", "coordinates": [80.2784, 13.0827] },
        "properties": {
          "weight": 0.82,
          "issueCount": 42,
          "dominantCategory": "ROADS",
          "ward": "Ward 8"
        }
      }
    ]
  }
}
```

---

## 9. Security & Privacy Considerations

Because municipal data involves geographic locations, employee accountability, and public reporting, the analytics engine enforces three primary security controls:

### 9.1 Role-Based Access Control (RBAC) Dashboard Isolation
*   **Citizen Access Isolation**: Citizens can never access internal officer dashboards, employee performance data, or administrative logs.
*   **Officer Access Isolation**: Officers can view aggregate performance metrics, but cannot access administrative configuration controls, user profiles, or other officers' performance reviews.

### 9.2 Geographic Privacy Protection (Coordinates Jittering)
To prevent the tracking of specific individuals or private residences through publicly visible heatmaps:
*   **Coordinates Fuzzing**: Latitude and longitude values returned via the public `/api/analytics/heatmaps` endpoint are slightly jittered using a random normal distribution within a 50-meter radius. This maintains heatmap density accuracy while preventing specific household identification.
*   **Aggregation Masking**: If a cluster contains fewer than three reported issues in a residential zone, it is excluded from public heatmaps to protect user privacy.

### 9.3 Aggregation Injection Prevention
All analytical query pipelines (specifically raw MongoDB queries using `$group`, `$bucket`, or `$lookup`) are parameterized. The application strictly forbids dynamically evaluated code strings or raw client-side inputs in query engines to protect against Denial of Service (DoS) or unauthorized data exposures.
