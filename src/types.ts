export type UserRole = 'CITIZEN' | 'DEPARTMENT_OFFICER' | 'ADMIN';

export type UserStatus =
  | 'PENDING_VERIFICATION'
  | 'VERIFIED_CITIZEN'
  | 'COMMUNITY_VERIFIED_CITIZEN'
  | 'SUSPENDED'
  | 'PENDING_OFFICER_APPROVAL'
  | 'ACTIVE_OFFICER'
  | 'REJECTED_OFFICER'
  | 'ACTIVE_ADMIN';

export type GovtIdType = 'Aadhaar' | 'Voter ID' | 'Driving License' | 'Passport';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  passwordHash?: string; // Hidden in API responses
  phoneNumber: string;
  role: UserRole;
  status: UserStatus;
  registeredAreaName: string;
  registeredWard: string;
  registeredDistrict: string;
  registeredState: string;
  latitude: number;
  longitude: number;
  impactScore: number;
  leaderboardScore: number;
  createdAt: string;
  updatedAt: string;
}

export interface CitizenProfile {
  userId: string;
  governmentIdType: GovtIdType;
  governmentIdNumber: string;
  governmentIdImageUrl: string;
  communityVerificationCount: number;
  communityVerifiedAt?: string;
}

export interface OfficerProfile {
  userId: string;
  employeeId: string;
  departmentName: string;
  departmentIdCardImageUrl: string;
  assignedWard: string;
  assignedDistrict: string;
  assignedState: string;
}

export interface CommunityEndorsement {
  id: string;
  endorserUserId: string;
  endorsedUserId: string;
  createdAt: string;
}

export interface Department {
  id: string;
  name: string;
  description: string;
  contactNumbers: string[];
  categoryMappings: string[];
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorRole: UserRole;
  action: string;
  targetId: string;
  targetType: string;
  timestamp: string;
}

// Client-side authentication structures
export interface AuthSession {
  user: User | null;
  token: string | null;
}

// Feature 2: Issue Status, Priority, Category Enums & Interfaces
export type IssueStatusType = 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLUTION_PENDING_VERIFICATION' | 'COMMUNITY_VERIFIED' | 'CLOSED' | 'REJECTED' | 'MANUAL_REVIEW' | 'REOPENED' | 'ACCEPTED';

export type IssuePriorityType = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type IssueCategoryType =
  | 'UNCATEGORIZED'
  | 'POTHOLE'
  | 'GARBAGE'
  | 'WATER_LEAKAGE'
  | 'DRAINAGE'
  | 'STREETLIGHT'
  | 'ROAD_DAMAGE'
  | 'TRAFFIC_SIGNAL'
  | 'PUBLIC_SAFETY'
  | 'OTHER';

export interface IssueMedia {
  type: 'IMAGE' | 'VIDEO';
  url: string;
}

export interface GeoLocation {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

export interface Issue {
  id: string;
  issueNumber: string;
  reporterId: string;
  reporterName: string;
  reporterWard: string;
  reporterDistrict: string;
  reporterState: string;
  title: string;
  description: string;
  category: IssueCategoryType;
  priority: IssuePriorityType;
  department: string; // Default: 'UNASSIGNED'
  media: IssueMedia[];
  location: GeoLocation;
  address: string;
  status: IssueStatusType;
  upvoteCount: number;
  verificationCount: number;
  commentCount: number;
  manualReviewReason?: string;
  manualReviewDecision?: 'APPROVED' | 'REJECTED';
  manualReviewTimestamp?: string;
  manualReviewAdminId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IssueAudit {
  id: string;
  issueId: string;
  eventType: string; // e.g. 'ISSUE_CREATED'
  description: string;
  actorId: string;
  actorRole: UserRole;
  createdAt: string;
}

