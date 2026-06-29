# QA Test Plan: Feature 2 - Issue Reporting System

## SECTION 1: FUNCTIONAL TESTING

| Test Case ID | Test Scenario | Test Steps | Expected Result | Severity | Priority |
|---|---|---|---|---|---|
| FT-001 | Issue Creation - Valid Data | 1. Login as Verified Citizen.<br>2. Fill all required fields (Title, Description, Category, Location).<br>3. Upload valid image.<br>4. Submit. | Issue is created successfully. Status is OPEN. | Critical | High |
| FT-002 | Issue Viewing - Details | 1. Navigate to Issue Listing.<br>2. Click on a specific issue. | Issue details page loads with Title, Description, Image, Category, and Status. | High | High |
| FT-003 | Issue Filtering - Category | 1. Go to Issue List.<br>2. Select 'ROADS' category filter. | Only issues related to 'ROADS' are displayed. | Medium | Medium |
| FT-004 | Location Capture - GPS | 1. Click 'Use My Location'.<br>2. Allow location access. | Latitude, Longitude, and Address are auto-populated accurately. | High | High |
| FT-005 | Media Upload - Success | 1. Select a .jpg image < 5MB.<br>2. Verify preview.<br>3. Submit. | Image uploads successfully and is linked to the issue. | High | High |

## SECTION 2: NEGATIVE TESTING

| Test Case ID | Test Scenario | Test Steps | Expected Result | Severity | Priority |
|---|---|---|---|---|---|
| NT-001 | Empty Required Fields | 1. Leave Title blank.<br>2. Click Submit. | Validation error: "Title is required". Form not submitted. | High | High |
| NT-002 | Missing Location | 1. Provide all details but no location.<br>2. Click Submit. | Validation error: "Location coordinates are mandatory". | High | High |
| NT-003 | Unsupported File Type | 1. Upload a .exe or .pdf file in the media section. | Error: "Invalid file type. Only JPG, PNG, MP4 allowed." | Medium | High |
| NT-004 | Duplicate Submission | 1. Double-click or spam the "Submit" button rapidly. | Only one issue is created. Button disabled after first click. | High | Medium |
| NT-005 | Corrupted Image Upload | 1. Rename a .txt file to .jpg and upload. | Upload fails with "Invalid image format" error. | Medium | Medium |

## SECTION 3: BOUNDARY TESTING

| Test Case ID | Test Scenario | Test Steps | Expected Result | Severity | Priority |
|---|---|---|---|---|---|
| BT-001 | Title Length (Min) | 1. Enter a 1-character title. | Validation passes or fails based on min-length requirements (e.g., Min 5 chars). | Low | Low |
| BT-002 | Title Length (Max) | 1. Enter a 256-character title (or max limit + 1). | Input is truncated or validation error is shown. | Medium | Medium |
| BT-003 | Description Length | 1. Enter a 5000-character description. | System accepts or gracefully rejects with max limit error. | Medium | Medium |
| BT-004 | Maximum Upload Size | 1. Upload an image exactly at the size limit (e.g., 5.00 MB). | Upload succeeds. | Medium | Medium |
| BT-005 | Maximum Upload Exceeded | 1. Upload an image over the size limit (e.g., 5.01 MB). | Upload blocked with "File too large" error. | High | High |

## SECTION 4: MEDIA VALIDATION TESTING

| Test Case ID | Test Scenario | Test Steps | Expected Result | Severity | Priority |
|---|---|---|---|---|---|
| MV-001 | Multiple Images | 1. Select 3 images (if multi-upload supported). | All images upload, preview correctly, and attach to the issue. | Medium | Medium |
| MV-002 | Media Deletion Pre-Submit | 1. Upload an image.<br>2. Click 'Remove' before submitting. | Image is removed from preview and not sent on submit. | Low | Low |
| MV-003 | Interrupted Uploads | 1. Start large file upload.<br>2. Disconnect network. | Upload fails gracefully with a retry option or clear error. | Medium | Medium |

## SECTION 5: LOCATION TESTING

| Test Case ID | Test Scenario | Test Steps | Expected Result | Severity | Priority |
|---|---|---|---|---|---|
| LT-001 | Nearby Reporting Radius | 1. Set location > 2km from registered ward.<br>2. Submit. | Rejection error: "Must file issues within 2 km of registered location." | Critical | High |
| LT-002 | Location Mismatch | 1. Alter network payload to send a different ward name than the coordinates imply. | Backend validates coordinates against ward geometry and rejects mismatch. | High | High |
| LT-003 | Manual Location Entry | 1. Drag map pin to a valid location.<br>2. Submit. | Coordinates match the pin drop accurately. | High | Medium |

## SECTION 6: AUTHORIZATION TESTING

| Test Case ID | Test Scenario | Test Steps | Expected Result | Severity | Priority |
|---|---|---|---|---|---|
| AT-001 | Verified Citizen Access | 1. Login as Verified Citizen.<br>2. Navigate to Issue Report. | Issue reporting form is accessible. | Critical | High |
| AT-002 | Unverified Citizen Access | 1. Login as Unverified Citizen (Pending).<br>2. Navigate to Issue Report. | Access Denied. Redirected or shown "Verification Pending" message. | Critical | High |
| AT-003 | Officer Role Restriction | 1. Login as Officer.<br>2. Attempt to POST to `/api/issues/create`. | 403 Forbidden. Officers cannot create citizen issues. | Critical | High |

## SECTION 7: SECURITY TESTING

| Test Case ID | Test Scenario | Test Steps | Expected Result | Severity | Priority |
|---|---|---|---|---|---|
| ST-001 | XSS Injection | 1. Enter `<script>alert('XSS')</script>` in Title/Description. | Input is sanitized. Script does not execute when viewing the issue. | Critical | High |
| ST-002 | API Tampering | 1. Intercept request.<br>2. Change `reporterId` to another user's ID. | 403 Forbidden. Backend enforces ID matches authenticated token. | Critical | High |
| ST-003 | Rate Limiting | 1. Send 100 issue creation requests in 10 seconds via script. | 429 Too Many Requests after threshold is hit. | High | High |
| ST-004 | HTML Injection | 1. Enter `<h1>Huge Text</h1>` in Description. | HTML tags are escaped and rendered as plain text. | Medium | Medium |

## SECTION 8: DATA INTEGRITY TESTING

| Test Case ID | Test Scenario | Test Steps | Expected Result | Severity | Priority |
|---|---|---|---|---|---|
| DI-001 | Issue Persistence | 1. Create issue.<br>2. Check DB directly. | All fields (Title, Location, Creator ID, Status=OPEN) are saved exactly as submitted. | Critical | High |
| DI-002 | Category Consistency | 1. Submit category 'WATER'.<br>2. Fetch issue via API. | Category is exactly 'WATER' (no casing or spacing issues). | Medium | Medium |

## SECTION 9: API TESTING

| Test Case ID | Test Scenario | Test Steps | Expected Result | Severity | Priority |
|---|---|---|---|---|---|
| API-001 | Missing Fields | 1. POST to `/api/issues` omitting `latitude`. | 400 Bad Request with specific error indicating missing `latitude`. | High | High |
| API-002 | Malformed Payload | 1. POST invalid JSON to `/api/issues`. | 400 Bad Request. Server does not crash. | High | High |
| API-003 | Unauthorized Request | 1. POST to `/api/issues` with no Authorization header. | 401 Unauthorized. | Critical | High |

## SECTION 10: UI/UX TESTING

| Test Case ID | Test Scenario | Test Steps | Expected Result | Severity | Priority |
|---|---|---|---|---|---|
| UI-001 | Loading States | 1. Click Submit on a valid form. | Button shows spinner, disables, and prevents double clicks. | Medium | Medium |
| UI-002 | Mobile Experience | 1. Open form on mobile viewport (375px wide). | Form is fully responsive, no horizontal scrolling, touch targets >= 44px. | High | High |
| UI-003 | Error Readability | 1. Trigger a validation error. | Error text is red, clearly visible, and located near the invalid field. | Medium | Low |

## SECTION 11: PERFORMANCE TESTING

| Test Case ID | Test Scenario | Test Steps | Expected Result | Severity | Priority |
|---|---|---|---|---|---|
| PT-001 | Concurrent Submissions | 1. Simulate 100 users submitting issues simultaneously. | 95% of requests succeed within 2 seconds. No DB deadlocks. | High | Medium |
| PT-002 | Issue Listing Load | 1. Load dashboard with 5000 issues in DB. | Data loads in < 1.5s using pagination/indexing. | Medium | High |

## SECTION 12: PRODUCTION READINESS REVIEW

* **Critical Bugs:** Ensure location spoofing (sending coordinates that don't match the selected ward) is strictly handled backend-side.
* **High Risk Areas:** Media uploads. Ensure signed URLs or strict bucket policies are used to prevent malicious uploads or bucket flooding.
* **Potential Exploits:** Rate limiting on the issue creation endpoint is a must to prevent database spam.
* **Missing Validations:** File extension checking must be paired with MIME type/magic number validation to prevent executable disguise.
* **Hackathon Demo Risks:** If GPS fails indoors during a demo, there must be a reliable fallback to manual map selection.

## SECTION 13: HACKATHON JUDGE REVIEW

* **Innovation (8/10):** Standard civic reporting, but AI triage and strict location-ward radius binding adds a solid modern twist.
* **Usability (9/10):** The requirement for location tracking is well-integrated. If the UI handles GPS delays gracefully, it's a winner.
* **Security (7/10):** Strong dependence on client-side location logic can be spoofed. Needs backend cross-referencing (coords to ward geo-boundaries).
* **Reliability (8/10):** Image uploads are the biggest point of failure in hackathon demos. Needs robust error handling.
* **Scalability (8/10):** Standard CRUD scales well if the database is indexed on `status`, `ward`, and `category`.
* **Overall Verdict:** A highly practical, production-oriented feature. If the team can demonstrate live location validation preventing a "fake" issue submission outside the 2km radius, it's a guaranteed top-tier project.
