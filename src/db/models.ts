import mongoose, { Schema, Document } from 'mongoose';

// 1. User Schema
export interface IUserDoc extends Document {
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  phoneNumber: string;
  role: 'CITIZEN' | 'DEPARTMENT_OFFICER' | 'ADMIN';
  status: string;
  registeredAreaName: string;
  registeredWard: string;
  registeredDistrict: string;
  registeredState: string;
  latitude: number;
  longitude: number;
  impactScore: number;
  leaderboardScore: number;
  monthlyLeaderboardScore: number;
  lastLeaderboardReset?: Date;
  registrationStatus?: 'PENDING_ADMIN_REVIEW' | 'APPROVED' | 'REJECTED';
  isVerifiedCitizen?: boolean;
  verifiedBadge?: boolean;
  approvedAt?: Date;
  approvedBy?: string;
  rejectedAt?: Date;
  rejectedBy?: string;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUserDoc>(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    phoneNumber: { type: String, required: true, unique: true },
    role: { type: String, enum: ['CITIZEN', 'DEPARTMENT_OFFICER', 'ADMIN'], required: true },
    status: { type: String, required: true },
    registeredAreaName: { type: String, required: true },
    registeredWard: { type: String, required: true },
    registeredDistrict: { type: String, required: true },
    registeredState: { type: String, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    impactScore: { type: Number, default: 0 },
    leaderboardScore: { type: Number, default: 0 },
    monthlyLeaderboardScore: { type: Number, default: 0 },
    lastLeaderboardReset: { type: Date, default: Date.now },
    registrationStatus: { type: String, enum: ['PENDING_ADMIN_REVIEW', 'APPROVED', 'REJECTED'], default: undefined },
    isVerifiedCitizen: { type: Boolean, default: false },
    verifiedBadge: { type: Boolean, default: false },
    approvedAt: { type: Date },
    approvedBy: { type: String },
    rejectedAt: { type: Date },
    rejectedBy: { type: String },
    rejectionReason: { type: String },
  },
  { timestamps: true }
);

// Geo-spatial index for query scaling
UserSchema.index({ latitude: 1, longitude: 1 });

export const UserModel = (mongoose.models.User || mongoose.model<IUserDoc>('User', UserSchema)) as mongoose.Model<IUserDoc>;


// 2. Citizen Profile Schema
export interface ICitizenProfileDoc extends Document {
  userId: mongoose.Types.ObjectId;
  governmentIdType: string;
  governmentIdNumber: string;
  governmentIdImageUrl: string;
  communityVerificationCount: number;
  communityVerifiedAt?: Date;
}

const CitizenProfileSchema = new Schema<ICitizenProfileDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    governmentIdType: { type: String, enum: ['Aadhaar', 'Voter ID', 'Driving License', 'Passport'], required: true },
    governmentIdNumber: { type: String, required: true },
    governmentIdImageUrl: { type: String, required: true },
    communityVerificationCount: { type: Number, default: 0 },
    communityVerifiedAt: { type: Date },
  },
  { timestamps: true }
);

export const CitizenProfileModel =
  mongoose.models.CitizenProfile || mongoose.model<ICitizenProfileDoc>('CitizenProfile', CitizenProfileSchema);


// 3. Officer Profile Schema
export interface IOfficerProfileDoc extends Document {
  userId: mongoose.Types.ObjectId;
  employeeId: string;
  departmentName: string;
  departmentIdCardImageUrl: string;
  assignedWard: string;
  assignedDistrict: string;
  assignedState: string;
}

const OfficerProfileSchema = new Schema<IOfficerProfileDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    employeeId: { type: String, required: true, unique: true, index: true },
    departmentName: { type: String, required: true },
    departmentIdCardImageUrl: { type: String, required: true },
    assignedWard: { type: String, required: true },
    assignedDistrict: { type: String, required: true },
    assignedState: { type: String, required: true },
  },
  { timestamps: true }
);

export const OfficerProfileModel =
  mongoose.models.OfficerProfile || mongoose.model<IOfficerProfileDoc>('OfficerProfile', OfficerProfileSchema);


// 4. Community Endorsement Schema
export interface ICommunityEndorsementDoc extends Document {
  endorserUserId: mongoose.Types.ObjectId;
  endorsedUserId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const CommunityEndorsementSchema = new Schema<ICommunityEndorsementDoc>(
  {
    endorserUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    endorsedUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: true }
);

// Ensure no user can endorse the same citizen twice
CommunityEndorsementSchema.index({ endorserUserId: 1, endorsedUserId: 1 }, { unique: true });

export const CommunityEndorsementModel =
  mongoose.models.CommunityEndorsement ||
  mongoose.model<ICommunityEndorsementDoc>('CommunityEndorsement', CommunityEndorsementSchema);


// 5. Department Schema
export interface IDepartmentDoc extends Document {
  name: string;
  description: string;
  contactNumbers: string[];
  categoryMappings: string[];
}

const DepartmentSchema = new Schema<IDepartmentDoc>(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    contactNumbers: [{ type: String }],
    categoryMappings: [{ type: String }],
  },
  { timestamps: true }
);

export const DepartmentModel =
  mongoose.models.Department || mongoose.model<IDepartmentDoc>('Department', DepartmentSchema);


// 6. Audit Log Schema
export interface IAuditLogDoc extends Document {
  actorId: mongoose.Types.ObjectId;
  actorRole: string;
  action: string;
  targetId: mongoose.Types.ObjectId;
  targetType: string;
  timestamp: Date;
}

const AuditLogSchema = new Schema<IAuditLogDoc>({
  actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  actorRole: { type: String, required: true },
  action: { type: String, required: true },
  targetId: { type: Schema.Types.ObjectId, required: true },
  targetType: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

export const AuditLogModel =
  mongoose.models.AuditLog || mongoose.model<IAuditLogDoc>('AuditLog', AuditLogSchema);


// 7. Issue Schema
export interface IIssueDoc extends Document {
  issueNumber: string;
  reporterId: mongoose.Types.ObjectId;
  reporterName: string;
  reporterWard: string;
  reporterDistrict: string;
  reporterState: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  department: string;
  media: Array<{ type: 'IMAGE' | 'VIDEO'; url: string }>;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  address: string;
  status: string;
  upvoteCount: number;
  verificationCount: number;
  commentCount: number;
  aiCategory?: string;
  aiPriority?: string;
  aiDepartment?: string;
  aiSummary?: string;
  aiReasoning?: string;
  categoryConfidence?: number;
  priorityConfidence?: number;
  departmentConfidence?: number;
  publicPropertyConfidence?: number;
  duplicateConfidence?: number;
  isPublicProperty?: boolean;
  duplicateIssueId?: string;
  analysisTimestamp?: Date;
  analysisVersion?: string;
  aiAnalysisStatus?: 'PENDING' | 'COMPLETED' | 'FAILED' | 'MANUAL_REVIEW';
  rawAiResponse?: string;
  manualReviewReason?: string;
  manualReviewDecision?: 'APPROVED' | 'REJECTED';
  manualReviewTimestamp?: Date;
  manualReviewAdminId?: mongoose.Types.ObjectId | string;
  assignedDepartment?: string;
  assignedOfficer?: string;
  assignedOfficerId?: mongoose.Types.ObjectId | string;
  assignedAt?: Date;
  acceptedAt?: Date;
  inProgressAt?: Date;
  resolvedAt?: Date;
  closedAt?: Date;
  reopenedAt?: Date;
  assignmentReason?: string;
  slaTargetHours?: number;
  slaBreached?: boolean;
  slaBreachTimestamp?: Date;
  resolutionLikelyValid?: boolean;
  resolutionValidationConfidence?: number;
  resolutionValidationSummary?: string;
  resolutionValidationReasoning?: string;
  verificationDeadline?: Date;
  communityConfidence?: number;
  communityVerifiedAt?: Date;
  communityVerifiedByCount?: number;
  communityRejectedByCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

const IssueSchema = new Schema<IIssueDoc>(
  {
    issueNumber: { type: String, required: true, unique: true, index: true },
    reporterId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    reporterName: { type: String, required: true },
    reporterWard: { type: String, required: true },
    reporterDistrict: { type: String, required: true },
    reporterState: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: {
      type: String,
      enum: [
        'UNCATEGORIZED', 'POTHOLE', 'GARBAGE', 'WATER_LEAKAGE', 'DRAINAGE',
        'STREETLIGHT', 'ROAD_DAMAGE', 'TRAFFIC_SIGNAL', 'PUBLIC_SAFETY', 'OTHER'
      ],
      default: 'UNCATEGORIZED'
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM'
    },
    department: { type: String, default: 'UNASSIGNED' },
    media: [
      {
        type: { type: String, enum: ['IMAGE', 'VIDEO'], required: true },
        url: { type: String, required: true }
      }
    ],
    location: {
      type: { type: String, enum: ['Point'], default: 'Point', required: true },
      coordinates: { type: [Number], required: true } // [longitude, latitude]
    },
    address: { type: String, required: true },
    status: {
      type: String,
      enum: ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLUTION_PENDING_VERIFICATION', 'COMMUNITY_VERIFIED', 'CLOSED', 'REJECTED', 'MANUAL_REVIEW', 'ACCEPTED', 'REOPENED'],
      default: 'OPEN',
      index: true
    },
    upvoteCount: { type: Number, default: 0 },
    verificationCount: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },
    aiCategory: { type: String },
    aiPriority: { type: String },
    aiDepartment: { type: String },
    aiSummary: { type: String },
    aiReasoning: { type: String },
    categoryConfidence: { type: Number },
    priorityConfidence: { type: Number },
    departmentConfidence: { type: Number },
    publicPropertyConfidence: { type: Number },
    duplicateConfidence: { type: Number },
    isPublicProperty: { type: Boolean },
    duplicateIssueId: { type: String },
    analysisTimestamp: { type: Date },
    analysisVersion: { type: String },
    aiAnalysisStatus: {
      type: String,
      enum: ['PENDING', 'COMPLETED', 'FAILED', 'MANUAL_REVIEW'],
      default: 'PENDING'
    },
    rawAiResponse: { type: String },
    manualReviewReason: { type: String },
    manualReviewDecision: { type: String, enum: ['APPROVED', 'REJECTED'] },
    manualReviewTimestamp: { type: Date },
    manualReviewAdminId: { type: Schema.Types.ObjectId, ref: 'User' },
    assignedDepartment: { type: String },
    assignedOfficer: { type: String },
    assignedOfficerId: { type: Schema.Types.ObjectId, ref: 'User' },
    assignedAt: { type: Date },
    acceptedAt: { type: Date },
    inProgressAt: { type: Date },
    resolvedAt: { type: Date },
    closedAt: { type: Date },
    reopenedAt: { type: Date },
    assignmentReason: { type: String },
    slaTargetHours: { type: Number },
    slaBreached: { type: Boolean, default: false },
    slaBreachTimestamp: { type: Date },
    resolutionLikelyValid: { type: Boolean },
    resolutionValidationConfidence: { type: Number },
    resolutionValidationSummary: { type: String },
    resolutionValidationReasoning: { type: String },
    verificationDeadline: { type: Date },
    communityConfidence: { type: Number, default: 0 },
    communityVerifiedAt: { type: Date },
    communityVerifiedByCount: { type: Number, default: 0 },
    communityRejectedByCount: { type: Number, default: 0 }
  },
  { timestamps: true }
);

// Create indexes
IssueSchema.index({ status: 1 });
IssueSchema.index({ assignedDepartment: 1 });
IssueSchema.index({ assignedOfficerId: 1 });
IssueSchema.index({ slaBreached: 1 });
IssueSchema.index({ resolvedAt: 1 });
IssueSchema.index({ createdAt: 1 });
IssueSchema.index({ verificationDeadline: 1 });
IssueSchema.index({ communityConfidence: 1 });

// Create 2dsphere index for GeoJSON location searches
IssueSchema.index({ location: '2dsphere' });

export const IssueModel =
  mongoose.models.Issue || mongoose.model<IIssueDoc>('Issue', IssueSchema);


// 8. Issue Audit (Timeline) Schema
export interface IIssueAuditDoc extends Document {
  issueId: string; // Keep as string (can refer to CC-xxxx number or _id)
  eventType: string; // e.g. 'ISSUE_CREATED'
  description: string;
  actorId: mongoose.Types.ObjectId | string;
  actorRole: string;
  createdAt: Date;
  // Optional AI resolution validation results to preserve previous evaluations
  resolutionLikelyValid?: boolean;
  resolutionValidationConfidence?: number;
  resolutionValidationSummary?: string;
  resolutionValidationReasoning?: string;
}

const IssueAuditSchema = new Schema<IIssueAuditDoc>(
  {
    issueId: { type: String, required: true, index: true },
    eventType: { type: String, required: true },
    description: { type: String, required: true },
    actorId: { type: Schema.Types.ObjectId, required: true },
    actorRole: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    resolutionLikelyValid: { type: Boolean },
    resolutionValidationConfidence: { type: Number },
    resolutionValidationSummary: { type: String },
    resolutionValidationReasoning: { type: String }
  }
);

export const IssueAuditModel =
  mongoose.models.IssueAudit || mongoose.model<IIssueAuditDoc>('IssueAudit', IssueAuditSchema);


// 9. Resolution Submission Schema
export interface IResolutionSubmissionDoc extends Document {
  issueId: string;
  issueNumber: string;
  officerId: mongoose.Types.ObjectId | string;
  officerName: string;
  officerDepartment: string;
  notes: string;
  media: Array<{ type: 'IMAGE' | 'VIDEO'; url: string }>;
  resolutionLatitude: number;
  resolutionLongitude: number;
  resolutionAddress: string;
  resolutionDistanceMeters: number;
  resolutionTimestamp: Date;
  createdAt: Date;
  updatedAt: Date;
  // AI resolution validation results to preserve previous evaluations
  resolutionLikelyValid?: boolean;
  resolutionValidationConfidence?: number;
  resolutionValidationSummary?: string;
  resolutionValidationReasoning?: string;
}

const ResolutionSubmissionSchema = new Schema<IResolutionSubmissionDoc>(
  {
    issueId: { type: String, required: true, index: true },
    issueNumber: { type: String, required: true, index: true },
    officerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    officerName: { type: String, required: true },
    officerDepartment: { type: String, required: true },
    notes: { type: String, required: true },
    media: [
      {
        type: { type: String, enum: ['IMAGE', 'VIDEO'], required: true },
        url: { type: String, required: true }
      }
    ],
    resolutionLatitude: { type: Number, required: true },
    resolutionLongitude: { type: Number, required: true },
    resolutionAddress: { type: String, required: true },
    resolutionDistanceMeters: { type: Number, required: true },
    resolutionTimestamp: { type: Date, required: true },
    resolutionLikelyValid: { type: Boolean },
    resolutionValidationConfidence: { type: Number },
    resolutionValidationSummary: { type: String },
    resolutionValidationReasoning: { type: String }
  },
  { timestamps: true }
);

export const ResolutionSubmissionModel =
  mongoose.models.ResolutionSubmission || mongoose.model<IResolutionSubmissionDoc>('ResolutionSubmission', ResolutionSubmissionSchema);


// 10. Resolution Verification Schema
export interface IResolutionVerificationDoc extends Document {
  issueId: mongoose.Types.ObjectId | string;
  issueNumber: string;
  citizenUserId: mongoose.Types.ObjectId | string;
  citizenName: string;
  verificationAction: 'APPROVE' | 'REJECT';
  comment?: string;
  media?: Array<{ type: 'IMAGE' | 'VIDEO'; url: string }>;
  verificationLatitude?: number;
  verificationLongitude?: number;
  verificationAddress?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ResolutionVerificationSchema = new Schema<IResolutionVerificationDoc>(
  {
    issueId: { type: Schema.Types.ObjectId, ref: 'Issue', required: true, index: true },
    issueNumber: { type: String, required: true, index: true },
    citizenUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    citizenName: { type: String, required: true },
    verificationAction: { type: String, enum: ['APPROVE', 'REJECT'], required: true, index: true },
    comment: { type: String },
    media: [
      {
        type: { type: String, enum: ['IMAGE', 'VIDEO'], required: true },
        url: { type: String, required: true }
      }
    ],
    verificationLatitude: { type: Number },
    verificationLongitude: { type: Number },
    verificationAddress: { type: String }
  },
  { timestamps: true }
);

// Unique voting rule: One citizen can vote only once per issue
ResolutionVerificationSchema.index({ issueId: 1, citizenUserId: 1 }, { unique: true });

export const ResolutionVerificationModel =
  mongoose.models.ResolutionVerification || mongoose.model<IResolutionVerificationDoc>('ResolutionVerification', ResolutionVerificationSchema);


// GAMIFICATION MODELS (FEATURE 7)

// 11. QuizCategory Schema
export interface IQuizCategoryDoc extends Document {
  name: string;
  description: string;
  isActive: boolean;
  isGenerating?: boolean;
  generationError?: string;
  createdAt: Date;
  updatedAt: Date;
}

const QuizCategorySchema = new Schema<IQuizCategoryDoc>({
  name: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  isGenerating: { type: Boolean, default: false },
  generationError: { type: String, default: "" },
}, { timestamps: true });

export const QuizCategoryModel = (mongoose.models.QuizCategory || mongoose.model<IQuizCategoryDoc>('QuizCategory', QuizCategorySchema)) as mongoose.Model<IQuizCategoryDoc>;


// 12. Question Schema
export interface IQuestionDoc extends Document {
  category: string;
  question: string;
  options: string[];
  correctAnswer: number;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  explanation: string;
  isActive: boolean;
  createdBy?: mongoose.Types.ObjectId;
  aiGenerated: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const QuestionSchema = new Schema<IQuestionDoc>({
  category: { type: String, required: true, index: true },
  question: { type: String, required: true },
  options: { type: [String], required: true, validate: [arr => arr.length === 4, 'Must have exactly 4 choices'] },
  correctAnswer: { type: Number, required: true, min: 0, max: 3 },
  difficulty: { type: String, enum: ['EASY', 'MEDIUM', 'HARD'], default: 'MEDIUM', index: true },
  explanation: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  aiGenerated: { type: Boolean, default: false }
}, { timestamps: true });

export const QuestionModel = (mongoose.models.Question || mongoose.model<IQuestionDoc>('Question', QuestionSchema)) as mongoose.Model<IQuestionDoc>;


// 13. QuizAttempt Schema
export interface IQuizAttemptDoc extends Document {
  userId: mongoose.Types.ObjectId;
  category: string;
  questions: mongoose.Types.ObjectId[];
  answers: Array<{
    questionId: mongoose.Types.ObjectId;
    selectedOptionIndex: number;
    timeSpentSeconds: number;
    isCorrect: boolean;
  }>;
  score: number;
  correctAnswers: number;
  incorrectAnswers: number;
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  earnedXP: number;
}

const QuizAttemptSchema = new Schema<IQuizAttemptDoc>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  category: { type: String, required: true, index: true },
  questions: [{ type: Schema.Types.ObjectId, ref: 'Question' }],
  answers: [{
    questionId: { type: Schema.Types.ObjectId, ref: 'Question' },
    selectedOptionIndex: { type: Number, required: true },
    timeSpentSeconds: { type: Number, required: true },
    isCorrect: { type: Boolean, required: true }
  }],
  score: { type: Number, default: 0 },
  correctAnswers: { type: Number, default: 0 },
  incorrectAnswers: { type: Number, default: 0 },
  startedAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
  duration: { type: Number },
  earnedXP: { type: Number, default: 0 }
});

export const QuizAttemptModel = (mongoose.models.QuizAttempt || mongoose.model<IQuizAttemptDoc>('QuizAttempt', QuizAttemptSchema)) as mongoose.Model<IQuizAttemptDoc>;


// 14. Achievement Schema
export interface IAchievementDoc extends Document {
  name: string;
  description: string;
  code: string;
  xpReward: number;
  createdAt: Date;
}

const AchievementSchema = new Schema<IAchievementDoc>({
  name: { type: String, required: true },
  description: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  xpReward: { type: Number, required: true },
}, { timestamps: true });

export const AchievementModel = (mongoose.models.Achievement || mongoose.model<IAchievementDoc>('Achievement', AchievementSchema)) as mongoose.Model<IAchievementDoc>;


// 15. Badge Schema
export interface IBadgeDoc extends Document {
  name: string;
  description: string;
  icon: string;
  tier: number;
  createdAt: Date;
}

const BadgeSchema = new Schema<IBadgeDoc>({
  name: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  icon: { type: String, required: true },
  tier: { type: Number, required: true },
}, { timestamps: true });

export const BadgeModel = (mongoose.models.Badge || mongoose.model<IBadgeDoc>('Badge', BadgeSchema)) as mongoose.Model<IBadgeDoc>;


// 16. GamificationProfile Schema
export interface IGamificationProfileDoc extends Document {
  userId: mongoose.Types.ObjectId;
  xp: number;
  communityImpactScore: number;
  reputationLevel: number;
  reputationName: string;
  monthlyLeaderboardScore: number;
  lifetimeLeaderboardScore: number;
  badges: Array<{
    badgeId: mongoose.Types.ObjectId;
    unlockedAt: Date;
  }>;
  achievements: Array<{
    achievementId: mongoose.Types.ObjectId;
    unlockedAt: Date;
  }>;
  stats: {
    issuesReported: number;
    issuesVerified: number;
    resolutionsVerified: number;
    evidenceUploaded: number;
    quizzesCompleted: number;
    correctAnswers: number;
  };
  quizUsageLimit: {
    lastAttemptDate: string; // "YYYY-MM-DD"
    attemptsCount: number;
  };
}

const GamificationProfileSchema = new Schema<IGamificationProfileDoc>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  xp: { type: Number, default: 0, index: true },
  communityImpactScore: { type: Number, default: 0, index: true },
  reputationLevel: { type: Number, default: 1 },
  reputationName: { type: String, default: 'New Citizen' },
  monthlyLeaderboardScore: { type: Number, default: 0, index: true },
  lifetimeLeaderboardScore: { type: Number, default: 0, index: true },
  badges: [{
    badgeId: { type: Schema.Types.ObjectId, ref: 'Badge' },
    unlockedAt: { type: Date, default: Date.now }
  }],
  achievements: [{
    achievementId: { type: Schema.Types.ObjectId, ref: 'Achievement' },
    unlockedAt: { type: Date, default: Date.now }
  }],
  stats: {
    issuesReported: { type: Number, default: 0 },
    issuesVerified: { type: Number, default: 0 },
    resolutionsVerified: { type: Number, default: 0 },
    evidenceUploaded: { type: Number, default: 0 },
    quizzesCompleted: { type: Number, default: 0 },
    correctAnswers: { type: Number, default: 0 }
  },
  quizUsageLimit: {
    lastAttemptDate: { type: String, default: "" },
    attemptsCount: { type: Number, default: 0 }
  }
});

export const GamificationProfileModel = (mongoose.models.GamificationProfile || mongoose.model<IGamificationProfileDoc>('GamificationProfile', GamificationProfileSchema)) as mongoose.Model<IGamificationProfileDoc>;


// 17. CommunityHeroAward Schema
export interface ICommunityHeroAwardDoc extends Document {
  userId: mongoose.Types.ObjectId;
  awardedMonth: string; // "YYYY-MM"
  pointsContributed: number;
  citation: string;
  type: 'GLOBAL' | 'LOCAL';
  locality?: string;
  createdAt: Date;
}

const CommunityHeroAwardSchema = new Schema<ICommunityHeroAwardDoc>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  awardedMonth: { type: String, required: true, index: true },
  pointsContributed: { type: Number, required: true },
  citation: { type: String, required: true },
  type: { type: String, enum: ['GLOBAL', 'LOCAL'], required: true },
  locality: { type: String },
}, { timestamps: true });

export const CommunityHeroAwardModel = (mongoose.models.CommunityHeroAward || mongoose.model<ICommunityHeroAwardDoc>('CommunityHeroAward', CommunityHeroAwardSchema)) as mongoose.Model<ICommunityHeroAwardDoc>;


// 18. HallOfFame Schema
export interface IHallOfFameDoc extends Document {
  userId: mongoose.Types.ObjectId;
  awardMonth: string; // "YYYY-MM"
  contributionScore: number;
  heroType: 'GLOBAL' | 'LOCAL';
  createdAt: Date;
}

const HallOfFameSchema = new Schema<IHallOfFameDoc>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  awardMonth: { type: String, required: true, index: true },
  contributionScore: { type: Number, required: true },
  heroType: { type: String, enum: ['GLOBAL', 'LOCAL'], required: true },
}, { timestamps: true });

export const HallOfFameModel = (mongoose.models.HallOfFame || mongoose.model<IHallOfFameDoc>('HallOfFame', HallOfFameSchema)) as mongoose.Model<IHallOfFameDoc>;


// 19. IssueDiscussionThread Schema
export interface IIssueDiscussionThreadDoc extends Document {
  issueId: mongoose.Types.ObjectId;
  isLocked: boolean;
  lockedBy?: mongoose.Types.ObjectId | string;
  lockedAt?: Date;
  messageCount: number;
  participants: (mongoose.Types.ObjectId | string)[];
}

const IssueDiscussionThreadSchema = new Schema<IIssueDiscussionThreadDoc>({
  issueId: { type: Schema.Types.ObjectId, ref: 'Issue', required: true, unique: true, index: true },
  isLocked: { type: Boolean, default: false },
  lockedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  lockedAt: { type: Date },
  messageCount: { type: Number, default: 0 },
  participants: [{ type: Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

export const IssueDiscussionThreadModel = (mongoose.models.IssueDiscussionThread || 
  mongoose.model<IIssueDiscussionThreadDoc>('IssueDiscussionThread', IssueDiscussionThreadSchema)) as mongoose.Model<IIssueDiscussionThreadDoc>;


// 20. IssueMessage Schema
export interface IIssueMessageDoc extends Document {
  issueId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  userRole: 'CITIZEN' | 'DEPARTMENT_OFFICER' | 'ADMIN' | 'SYSTEM';
  messageType: 'CITIZEN_MESSAGE' | 'OFFICER_MESSAGE' | 'ADMIN_MESSAGE' | 'OFFICIAL_UPDATE' | 'SYSTEM_MESSAGE';
  message: string;
  imageUrls: string[];
  createdAt: Date;
  editedAt?: Date;
  isDeleted: boolean;
}

const IssueMessageSchema = new Schema<IIssueMessageDoc>({
  issueId: { type: Schema.Types.ObjectId, ref: 'Issue', required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  userRole: { type: String, enum: ['CITIZEN', 'DEPARTMENT_OFFICER', 'ADMIN', 'SYSTEM'], required: true },
  messageType: { 
    type: String, 
    enum: ['CITIZEN_MESSAGE', 'OFFICER_MESSAGE', 'ADMIN_MESSAGE', 'OFFICIAL_UPDATE', 'SYSTEM_MESSAGE'], 
    required: true 
  },
  message: { type: String, required: true },
  imageUrls: [{ type: String }],
  editedAt: { type: Date },
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

export const IssueMessageModel = (mongoose.models.IssueMessage || 
  mongoose.model<IIssueMessageDoc>('IssueMessage', IssueMessageSchema)) as mongoose.Model<IIssueMessageDoc>;


// 21. DiscussionSummary Schema
export interface IDiscussionSummaryDoc extends Document {
  issueId: mongoose.Types.ObjectId;
  summary: string;
  keyConcerns: string[];
  latestProgress: string;
  pendingActions: string[];
  generatedAt: Date;
}

const DiscussionSummarySchema = new Schema<IDiscussionSummaryDoc>({
  issueId: { type: Schema.Types.ObjectId, ref: 'Issue', required: true, unique: true, index: true },
  summary: { type: String, required: true },
  keyConcerns: [{ type: String }],
  latestProgress: { type: String, required: true },
  pendingActions: [{ type: String }],
  generatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

export const DiscussionSummaryModel = (mongoose.models.DiscussionSummary || 
  mongoose.model<IDiscussionSummaryDoc>('DiscussionSummary', DiscussionSummarySchema)) as mongoose.Model<IDiscussionSummaryDoc>;


// 22. DepartmentDirectory Schema
export interface IDepartmentDirectoryDoc extends Document {
  name: string;
  description: string;
  associatedCategories: string[];
  primaryHelpline: string;
  escalationHelpline: string;
  officeAddress: string;
  workingHours: string;
  email?: string;
  website?: string;
  isEmergencyDepartment: boolean;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: Date;
  updatedAt: Date;
}

const DepartmentDirectorySchema = new Schema<IDepartmentDirectoryDoc>({
  name: { type: String, required: true, unique: true, index: true },
  description: { type: String, required: true },
  associatedCategories: [{ type: String, index: true }],
  primaryHelpline: { type: String, required: true },
  escalationHelpline: { type: String, required: true },
  officeAddress: { type: String, required: true },
  workingHours: { type: String, required: true },
  email: { type: String },
  website: { type: String },
  isEmergencyDepartment: { type: Boolean, default: false, index: true },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE', index: true }
}, { timestamps: true });

export const DepartmentDirectoryModel = (mongoose.models.DepartmentDirectory || 
  mongoose.model<IDepartmentDirectoryDoc>('DepartmentDirectory', DepartmentDirectorySchema)) as mongoose.Model<IDepartmentDirectoryDoc>;




