# Design Document: AI Issue Analysis Engine (Feature 3)

## 1. High Level Architecture
The AI Issue Analysis Engine acts as an interceptor in the issue submission flow. When a citizen submits a new issue via `POST /api/issues`, the backend service will:
1.  Receive the issue data (Title, Description, Media, Location).
2.  Trigger a server-side Gemini API call with the issue data.
3.  Receive structured analysis (Categorization, Priority, Department, Public Property Validation, Duplicate Detection).
4.  Process the analysis:
    *   If **Private Property**: Reject the issue creation.
    *   If **Duplicate Detected**: Reject the issue creation, return the `existingIssueId`.
    *   If **Valid**: Populate new AI fields and save the issue to the database.

## 2. Gemini Integration Design
*   **SDK**: Use `@google/genai` TypeScript SDK.
*   **Environment**: Server-side only (via `server.ts`).
*   **Model**: Gemini 1.5 Flash (preferred for latency and performance).
*   **Implementation**: A dedicated service function `analyzeIssue(issueData)` in the backend.

## 3. Prompt Engineering Strategy
*   **System Prompt**: Defined with strict JSON schema output. Roles: "Municipal Issue Analyst". Constraints: Only return JSON conforming to the defined schema.
*   **User Prompt**: Contains `title`, `description`, `location (lat, lon)`, `address`, and `media_urls`.
*   **Response Schema**: Strict JSON structure ensuring all fields (`category`, `priority`, `department`, `isPublicProperty`, `duplicateDetectionResult`) are returned with `confidence` scores and `reasoning`.

## 4. Database Changes (`IssueSchema`)
Add the following fields to the `Issue` model:
*   `aiCategory`: String
*   `aiPriority`: String
*   `aiDepartment`: String
*   `aiConfidence`: Number
*   `isPublicProperty`: Boolean
*   `duplicateIssueId`: String (Optional)
*   `analysisTimestamp`: Date

## 5. Duplicate Detection Strategy
1.  **Geo-Spatial Filtering**: Use MongoDB `$geoNear` to query existing issues within a 500-meter radius.
2.  **Semantic Analysis**: If candidates are found, pass the new issue and the candidate issues to Gemini.
3.  **Gemini Evaluation**: Gemini compares semantic similarity of title, description, and visual content.

## 6. API Changes
*   **POST /api/issues**: The endpoint will now behave synchronously (waiting for AI analysis) or asynchronously (saving with a "PENDING" status, then updating).
*   **Recommendation**: Synchronous analysis for immediate feedback on rejection (e.g., duplicates/private property).

## 7. Error Handling
*   **API Failure**: If the Gemini API is unavailable, the system will fall back to a "UNCATEGORIZED" / "MEDIUM" priority/default assignment and log the error for manual triage, rather than failing the submission.
*   **Malformed JSON**: Retry once; if failed, default to human review queue.

## 8. Security Considerations
*   **API Key Protection**: Store `GEMINI_API_KEY` in server-side environment variables. Never expose in client code.
*   **Input Sanitization**: Sanitize issue data before passing to the AI prompt to prevent injection.
