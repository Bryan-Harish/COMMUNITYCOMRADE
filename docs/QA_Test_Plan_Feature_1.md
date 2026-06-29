# QA & Security Test Plan: Feature 1 - Identity, Registration, Verification & Authentication

## SECTION 1: FUNCTIONAL TESTING

| Test Case ID | Test Scenario | Test Steps | Expected Result | Severity | Priority |
|---|---|---|---|---|---|
| FT-101 | Citizen Registration - Valid Data | 1. Navigate to Citizen Registration.<br>2. Fill all details (Name, Email, Password matching regex, Phone, Govt ID, Location).<br>3. Upload valid Govt ID image.<br>4. Submit. | Account created successfully. User status is set to PENDING. | Critical | High |
| FT-102 | Officer Registration - Valid Data | 1. Navigate to Officer Registration.<br>2. Fill all details including Employee ID and Department.<br>3. Upload Department ID Card.<br>4. Submit. | Account created successfully. User status is PENDING_OFFICER_APPROVAL. | Critical | High |
| FT-103 | Login - Valid Credentials | 1. Navigate to Login.<br>2. Enter registered email and password.<br>3. Submit. | User successfully logs in and is redirected to the appropriate dashboard based on role. | Critical | High |
| FT-104 | Admin - Officer Approval | 1. Login as Admin.<br>2. Go to Officer Approvals tab.<br>3. Click 'Approve Officer'. | Success message appears. Officer status changes to ACTIVE. | High | High |
| FT-105 | Citizen Endorsement | 1. Login as ACTIVE Citizen.<br>2. Endorse a PENDING Citizen in the same locality. | Endorsement count increases. If threshold reached, PENDING citizen becomes ACTIVE. | High | High |

## SECTION 2: NEGATIVE TESTING

| Test Case ID | Test Scenario | Test Steps | Expected Result | Severity | Priority |
|---|---|---|---|---|---|
| NT-101 | Registration - Weak Password | 1. Enter a password without a number or uppercase letter (e.g., `weakpass`).<br>2. Submit. | Validation error: "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number." | High | High |
| NT-102 | Registration - Duplicate Email | 1. Register with an email that already exists in the database.<br>2. Submit. | Validation error: "Email is already registered." | High | High |
| NT-103 | Login - Invalid Credentials | 1. Enter incorrect password or unregistered email.<br>2. Submit. | Error: "Invalid credentials." No access granted. | Critical | High |
| NT-104 | Endorsement - Out of Locality | 1. Login as ACTIVE Citizen in Ward A.<br>2. Attempt to endorse a PENDING Citizen in Ward B. | Error: "Can only endorse citizens in your registered locality." | High | Medium |
| NT-105 | Missing Mandatory ID Image | 1. Submit Registration without uploading the Govt ID / Dept ID image. | Validation error: "Please upload a valid ID image." | High | High |

## SECTION 3: BOUNDARY TESTING

| Test Case ID | Test Scenario | Test Steps | Expected Result | Severity | Priority |
|---|---|---|---|---|---|
| BT-101 | Password Length (Min) | 1. Enter exactly 8 characters matching rules (e.g., `Aa1bbbcc`). | Accepted successfully. | Low | Low |
| BT-102 | Email Length (Max) | 1. Enter an extremely long valid email string (e.g., 255 chars). | Handled gracefully, either accepted or constrained by max length rules. | Medium | Low |
| BT-103 | Endorsement Threshold | 1. Add exactly the number of endorsements required for auto-approval. | Citizen status flips to ACTIVE instantly upon reaching the threshold. | High | High |

## SECTION 4: AUTHENTICATION & AUTHORIZATION TESTING

| Test Case ID | Test Scenario | Test Steps | Expected Result | Severity | Priority |
|---|---|---|---|---|---|
| AT-101 | Unauthenticated Access | 1. Attempt to access `/dashboard` without logging in. | Redirected to `/login`. | Critical | High |
| AT-102 | Role Bypass Attempt (Citizen to Admin) | 1. Login as Citizen.<br>2. Attempt to access Admin dashboard URL. | 403 Forbidden or redirected back to Citizen dashboard. | Critical | High |
| AT-103 | Suspended User Login | 1. Login with credentials of a SUSPENDED user. | Error: "Account suspended. Please contact administrator." Access denied. | High | High |
| AT-104 | Token Expiration | 1. Login.<br>2. Wait for JWT/Session token to expire.<br>3. Attempt an API call. | 401 Unauthorized. User is prompted to log in again. | Medium | Medium |

## SECTION 5: SECURITY TESTING

| Test Case ID | Test Scenario | Test Steps | Expected Result | Severity | Priority |
|---|---|---|---|---|---|
| ST-101 | SQL/NoSQL Injection | 1. Enter `' OR '1'='1` in the login email field.<br>2. Submit. | Input sanitized. Login fails gracefully. | Critical | High |
| ST-102 | Brute Force Protection | 1. Attempt 20 failed logins for the same account rapidly. | Account is temporarily locked or rate-limited (e.g., "Too many attempts"). | High | High |
| ST-103 | XSS in Profile Data | 1. Register with `<script>alert(1)</script>` as First Name. | Tags are escaped when displayed in dashboards or Admin views. | High | High |
| ST-104 | IDOR on Approval Endpoint | 1. Login as Citizen.<br>2. POST to `/api/admin/officers/approve` with an officer ID. | 403 Forbidden. Only Admins can execute this action. | Critical | High |

## SECTION 6: DATA INTEGRITY TESTING

| Test Case ID | Test Scenario | Test Steps | Expected Result | Severity | Priority |
|---|---|---|---|---|---|
| DI-101 | Password Hashing | 1. Register a new user.<br>2. Check DB directly. | Password is securely hashed (e.g., bcrypt/argon2), never stored in plaintext. | Critical | High |
| DI-102 | Unique Constraints | 1. Attempt to register two officers with the same Employee ID. | Rejected by DB constraint. Proper error passed to UI. | High | Medium |
| DI-103 | Status Consistency | 1. Suspend an ACTIVE user.<br>2. Check all related tables. | User status consistently reflects SUSPENDED across auth and profile models. | Medium | Medium |

## SECTION 7: API TESTING

| Test Case ID | Test Scenario | Test Steps | Expected Result | Severity | Priority |
|---|---|---|---|---|---|
| API-101 | Registration Validation | 1. POST to `/api/auth/register/citizen` missing `password`. | 400 Bad Request with specific missing field error. | High | High |
| API-102 | Admin Approval Payload | 1. POST invalid JSON to `/api/admin/officers/approve`. | 400 Bad Request. | Medium | Medium |
| API-103 | Rate Limiting on Auth | 1. Send 100 registration requests per minute from one IP. | 429 Too Many Requests response. | High | High |

## SECTION 8: UI/UX TESTING

| Test Case ID | Test Scenario | Test Steps | Expected Result | Severity | Priority |
|---|---|---|---|---|---|
| UI-101 | Registration Feedback | 1. Submit valid registration. | Clear success message and redirection to login or waiting room. | Medium | High |
| UI-102 | Admin Approval Notifications | 1. Click 'Approve Officer'. | "Operation Successful" notification appears in green without page reload. | Medium | Medium |
| UI-103 | Mobile Responsiveness | 1. Open login/registration on a mobile device (375px wide). | Fields stack correctly. No horizontal scrolling. | High | High |

## SECTION 9: PERFORMANCE TESTING

| Test Case ID | Test Scenario | Test Steps | Expected Result | Severity | Priority |
|---|---|---|---|---|---|
| PT-101 | Concurrent Logins | 1. Simulate 500 users logging in simultaneously. | Response times remain under 2 seconds. No server crashes. | High | Medium |
| PT-102 | Admin Queue Loading | 1. Load Admin Officer Approval queue with 1000 pending officers. | Dashboard loads efficiently (uses pagination or limits). | Medium | High |

## SECTION 10: PRODUCTION READINESS REVIEW

* **Critical Bugs:** Ensure JWT/Session tokens are stored securely (HttpOnly cookies preferred) to prevent XSS exfiltration.
* **High Risk Areas:** Admin approval endpoints and Citizen endorsement endpoints must strictly validate authorization headers and ward matches.
* **Potential Exploits:** Registration endpoint spam. Ensure CAPTCHA or strong rate-limiting is enabled for `/api/auth/register/*`.
* **Missing Validations:** Check for weak JWT secrets or overly long token expiration times.
* **Production Concerns:** Ensure uploaded ID card images are stored in a secure, non-public S3/Cloud Storage bucket.

## SECTION 11: HACKATHON JUDGE REVIEW

* **Innovation (8/10):** The community endorsement model for Citizen verification is an excellent trust-based innovation.
* **Usability (9/10):** The separation of Citizen, Officer, and Admin flows is clean. Feedback notifications (like the recently added success alerts) improve the experience significantly.
* **Security (9/10):** Password complexity rules, strict role-based access control, and manual officer reviews demonstrate a solid security posture.
* **Reliability (8/10):** Handled edge cases well. Dependent on database consistency for endorsements.
* **Overall Verdict:** Feature 1 sets a highly professional standard for identity management. The localized endorsement logic makes it stand out from standard CRUD apps.
