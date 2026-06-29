import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import {
  UserModel as UserModelRaw,
  CitizenProfileModel as CitizenProfileModelRaw,
  OfficerProfileModel as OfficerProfileModelRaw,
  CommunityEndorsementModel as CommunityEndorsementModelRaw,
  DepartmentModel as DepartmentModelRaw,
  AuditLogModel as AuditLogModelRaw,
  IssueModel as IssueModelRaw,
  IssueAuditModel as IssueAuditModelRaw,
  ResolutionSubmissionModel as ResolutionSubmissionModelRaw,
  ResolutionVerificationModel as ResolutionVerificationModelRaw,
  IssueDiscussionThreadModel as IssueDiscussionThreadModelRaw,
  IssueMessageModel as IssueMessageModelRaw,
  DiscussionSummaryModel as DiscussionSummaryModelRaw,
  DepartmentDirectoryModel as DepartmentDirectoryModelRaw
} from './models.js';

const UserModel = UserModelRaw as any;
const CitizenProfileModel = CitizenProfileModelRaw as any;
const OfficerProfileModel = OfficerProfileModelRaw as any;
const CommunityEndorsementModel = CommunityEndorsementModelRaw as any;
const DepartmentModel = DepartmentModelRaw as any;
const AuditLogModel = AuditLogModelRaw as any;
const IssueModel = IssueModelRaw as any;
const IssueAuditModel = IssueAuditModelRaw as any;
const ResolutionSubmissionModel = ResolutionSubmissionModelRaw as any;
const ResolutionVerificationModel = ResolutionVerificationModelRaw as any;
const IssueDiscussionThreadModel = IssueDiscussionThreadModelRaw as any;
const IssueMessageModel = IssueMessageModelRaw as any;
const DiscussionSummaryModel = DiscussionSummaryModelRaw as any;
const DepartmentDirectoryModel = DepartmentDirectoryModelRaw as any;

const LOCAL_DB_PATH = path.resolve(process.cwd(), 'src/db/local_db.json');

// Ensure database directory exists
const dbDir = path.dirname(LOCAL_DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// In-memory data structures for JSON local fallback
let localDb = {
  users: [] as any[],
  citizen_profiles: [] as any[],
  officer_profiles: [] as any[],
  community_endorsements: [] as any[],
  departments: [
    { id: 'dept-roads', name: 'Roads Department', description: 'Handles public roadway repairs, filling potholes, and resurfacing.', contactNumbers: ['+91 98765 00001'], categoryMappings: ['pothole', 'road_damage'] },
    { id: 'dept-water', name: 'Water Department', description: 'Manages municipal water supply pipelines, leakage, and drainage blockages.', contactNumbers: ['+91 98765 00002'], categoryMappings: ['leakage', 'drainage'] },
    { id: 'dept-electrical', name: 'Electrical Department', description: 'Responsible for functional streetlights, electrical grids, and hazard lines.', contactNumbers: ['+91 98765 00003'], categoryMappings: ['streetlight', 'wire_hazard'] },
    { id: 'dept-sanitation', name: 'Sanitation Department', description: 'Mainages public waste collections, cleaning campaigns, and public toilets.', contactNumbers: ['+91 98765 00004'], categoryMappings: ['waste', 'overflowing_bin'] },
    { id: 'dept-municipal', name: 'Municipal Corporation', description: 'General administration and citizen support services.', contactNumbers: ['+91 98765 00005'], categoryMappings: ['encroachment', 'unauthorized_sign'] }
  ] as any[],
  audit_logs: [] as any[],
  issues: [] as any[],
  issue_audits: [] as any[],
  resolution_submissions: [] as any[],
  resolution_verifications: [] as any[],
  issue_discussion_threads: [] as any[],
  issue_messages: [] as any[],
  discussion_summaries: [] as any[],
  department_directories: [
    {
      _id: 'dir-police',
      id: 'dir-police',
      name: 'Police Department',
      description: 'Provides round-the-clock law enforcement, public safety maintenance, traffic monitoring, and civic security enforcement.',
      associatedCategories: ['PUBLIC_SAFETY'],
      primaryHelpline: '100',
      escalationHelpline: '112',
      officeAddress: 'Municipal Police Headquarters, Civil Lines Sector 4',
      workingHours: '24/7 Emergency Service',
      email: 'police.help@communitycomrade.org',
      website: 'https://police.communitycomrade.org',
      isEmergencyDepartment: true,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      _id: 'dir-fire',
      id: 'dir-fire',
      name: 'Fire Department',
      description: 'First responders for emergency firefighting, search & rescue operations, and structural fire hazard mitigation.',
      associatedCategories: ['PUBLIC_SAFETY', 'OTHER'],
      primaryHelpline: '101',
      escalationHelpline: '112',
      officeAddress: 'Central Fire Station, Sector 2 Corner',
      workingHours: '24/7 Emergency Service',
      email: 'fire.response@communitycomrade.org',
      website: 'https://fire.communitycomrade.org',
      isEmergencyDepartment: true,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      _id: 'dir-roads',
      id: 'dir-roads',
      name: 'Roads Department',
      description: 'Maintains city road networks, pothole patching, highway paving, structural concrete repairs, and signalizations.',
      associatedCategories: ['POTHOLE', 'ROAD_DAMAGE', 'TRAFFIC_SIGNAL'],
      primaryHelpline: '1800-ROAD-001',
      escalationHelpline: '1800-ROAD-999',
      officeAddress: 'Municipal PWD Complex, Block B Service Rd',
      workingHours: 'Mon-Sat: 9:00 AM - 6:00 PM',
      email: 'roads.complaints@communitycomrade.org',
      website: 'https://pwd.communitycomrade.org',
      isEmergencyDepartment: false,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      _id: 'dir-water',
      id: 'dir-water',
      name: 'Water Department',
      description: 'Manages clean water supply networks, main pipeline leakage repairs, stormwater drainage systems, and sewage blockages.',
      associatedCategories: ['WATER_LEAKAGE', 'DRAINAGE'],
      primaryHelpline: '1800-WATER-001',
      escalationHelpline: '1800-WATER-999',
      officeAddress: 'Water Supply & Sewerage Board, Block C HQ',
      workingHours: 'Mon-Fri: 9:00 AM - 5:30 PM, Sat: 9:00 AM - 1:00 PM',
      email: 'water.supply@communitycomrade.org',
      website: 'https://waterboard.communitycomrade.org',
      isEmergencyDepartment: false,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      _id: 'dir-sanitation',
      id: 'dir-sanitation',
      name: 'Sanitation Department',
      description: 'Responsible for public sanitation, neighborhood street sweeping, solid waste recycling, and periodic collection bin management.',
      associatedCategories: ['GARBAGE'],
      primaryHelpline: '1800-CLEAN-111',
      escalationHelpline: '1800-CLEAN-222',
      officeAddress: 'Municipal Solid Waste Management Depot, Yard 8',
      workingHours: 'Mon-Sat: 8:00 AM - 4:00 PM',
      email: 'cleanliness@communitycomrade.org',
      website: 'https://sanitation.communitycomrade.org',
      isEmergencyDepartment: false,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ] as any[]
};

// Seed default admin inside local database
const defaultAdminPasswordHash = '$2a$10$tZreM.f83L24bK.oXitGCO/9O1O1FvXm8W1I.K67t00I3E19wK0y6'; // Hash of 'Admin123!'

const initialSeedAdmin = {
  _id: 'admin-001',
  id: 'admin-001',
  firstName: 'Super',
  lastName: 'Admin',
  email: 'admin@communitycomrade.org',
  passwordHash: defaultAdminPasswordHash,
  phoneNumber: '+91 99999 88888',
  role: 'ADMIN' as const,
  status: 'ACTIVE_ADMIN' as const,
  registeredAreaName: 'Municipal HQ',
  registeredWard: 'Ward 1',
  registeredDistrict: 'Central District',
  registeredState: 'State Sector',
  latitude: 12.9716,
  longitude: 77.5946,
  impactScore: 100,
  leaderboardScore: 1000,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

// Load or initialize local JSON DB
function loadLocalDb() {
  try {
    if (fs.existsSync(LOCAL_DB_PATH)) {
      const content = fs.readFileSync(LOCAL_DB_PATH, 'utf-8');
      const parsed = JSON.parse(content);
      localDb = { ...localDb, ...parsed };
    } else {
      localDb.users.push(initialSeedAdmin);
      saveLocalDb();
    }
  } catch (err) {
    console.error('Failed to load local DB file, using default structure', err);
    localDb.users.push(initialSeedAdmin);
  }
}

function saveLocalDb() {
  try {
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(localDb, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save local DB file', err);
  }
}

loadLocalDb();

export let isUsingMongo = false;

export async function seedAllRequiredUsers() {
  console.log('🌱 [Database] Ensuring all required users are seeded with correct passwords...');
  const adminHash = await bcrypt.hash('Admin123!', 10);
  const citizenHash = await bcrypt.hash('Citizen123!', 10);
  const officerHash = await bcrypt.hash('Officer123!', 10);

  if (isUsingMongo) {
    try {
      // 1. Seed/Upsert Admin
      let admin = await UserModel.findOne({ email: 'admin@communitycomrade.org' });
      if (!admin) {
        admin = new UserModel({
          firstName: 'Super',
          lastName: 'Admin',
          email: 'admin@communitycomrade.org',
          passwordHash: adminHash,
          phoneNumber: '+91 99999 88888',
          role: 'ADMIN',
          status: 'ACTIVE_ADMIN',
          registeredAreaName: 'Municipal HQ',
          registeredWard: 'Ward 1',
          registeredDistrict: 'Central District',
          registeredState: 'State Sector',
          latitude: 12.9716,
          longitude: 77.5946,
          impactScore: 100,
          leaderboardScore: 1000,
        });
        await admin.save();
        console.log('🌱 [Database] Seeded Admin into MongoDB.');
      } else {
        admin.passwordHash = adminHash;
        admin.status = 'ACTIVE_ADMIN';
        await admin.save();
        console.log('🌱 [Database] Verified and updated Admin credentials in MongoDB.');
      }

      // 2. Seed/Upsert Citizen
      let citizen = await UserModel.findOne({ email: 'citizen.verified@gmail.com' });
      if (!citizen) {
        citizen = new UserModel({
          firstName: 'Verified',
          lastName: 'Citizen',
          email: 'citizen.verified@gmail.com',
          passwordHash: citizenHash,
          phoneNumber: '+91 99999 77777',
          role: 'CITIZEN',
          status: 'VERIFIED_CITIZEN',
          registeredAreaName: 'Indiranagar',
          registeredWard: 'Ward 80',
          registeredDistrict: 'Bengaluru East',
          registeredState: 'Karnataka',
          latitude: 12.9716,
          longitude: 77.5946,
          impactScore: 10,
          leaderboardScore: 150,
        });
        await citizen.save();

        const profile = new CitizenProfileModel({
          userId: citizen._id,
          governmentIdType: 'Aadhaar',
          governmentIdNumber: '123456789012',
          governmentIdImageUrl: 'https://example.com/id.png',
          communityVerificationCount: 0,
        });
        await profile.save();
        console.log('🌱 [Database] Seeded Mock Citizen into MongoDB.');
      } else {
        citizen.passwordHash = citizenHash;
        citizen.status = 'VERIFIED_CITIZEN';
        await citizen.save();
        console.log('🌱 [Database] Verified and updated Mock Citizen credentials in MongoDB.');
      }

      // 3. Seed/Upsert Officer
      let officer = await UserModel.findOne({ email: 'officer.pending@gov.in' });
      if (!officer) {
        officer = new UserModel({
          firstName: 'Pending',
          lastName: 'Officer',
          email: 'officer.pending@gov.in',
          passwordHash: officerHash,
          phoneNumber: '+91 99999 66666',
          role: 'DEPARTMENT_OFFICER',
          status: 'PENDING_OFFICER_APPROVAL',
          registeredAreaName: 'Ward 80',
          registeredWard: 'Ward 80',
          registeredDistrict: 'Bengaluru East',
          registeredState: 'Karnataka',
          latitude: 12.9716,
          longitude: 77.5946,
          impactScore: 0,
          leaderboardScore: 0,
        });
        await officer.save();

        const profile = new OfficerProfileModel({
          userId: officer._id,
          employeeId: 'EMP9999',
          departmentName: 'Roads Department',
          departmentIdCardImageUrl: 'https://example.com/card.png',
          assignedWard: 'Ward 80',
          assignedDistrict: 'Bengaluru East',
          assignedState: 'Karnataka',
        });
        await profile.save();
        console.log('🌱 [Database] Seeded Mock Officer into MongoDB.');
      } else {
        officer.passwordHash = officerHash;
        officer.status = 'PENDING_OFFICER_APPROVAL';
        await officer.save();
        console.log('🌱 [Database] Verified and updated Mock Officer credentials in MongoDB.');
      }

      // Seed departments
      const deptCount = await DepartmentModel.countDocuments();
      if (deptCount === 0) {
        await DepartmentModel.insertMany(localDb.departments.map(d => ({
          name: d.name,
          description: d.description,
          contactNumbers: d.contactNumbers,
          categoryMappings: d.categoryMappings
        })));
      }

    } catch (err) {
      console.error('❌ [Database] Error seeding MongoDB:', err);
    }
  } else {
    // Local JSON Fallback Mode
    try {
      // 1. Seed/Upsert Admin
      let adminIndex = localDb.users.findIndex(u => u.email.toLowerCase() === 'admin@communitycomrade.org');
      if (adminIndex === -1) {
        const user = {
          id: 'admin-001',
          _id: 'admin-001',
          firstName: 'Super',
          lastName: 'Admin',
          email: 'admin@communitycomrade.org',
          passwordHash: adminHash,
          phoneNumber: '+91 99999 88888',
          role: 'ADMIN',
          status: 'ACTIVE_ADMIN',
          registeredAreaName: 'Municipal HQ',
          registeredWard: 'Ward 1',
          registeredDistrict: 'Central District',
          registeredState: 'State Sector',
          latitude: 12.9716,
          longitude: 77.5946,
          impactScore: 100,
          leaderboardScore: 1000,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        localDb.users.push(user);
        console.log('🌱 [Database] Seeded Admin into Local DB.');
      } else {
        localDb.users[adminIndex].passwordHash = adminHash;
        localDb.users[adminIndex].status = 'ACTIVE_ADMIN';
        console.log('🌱 [Database] Updated Admin credentials in Local DB.');
      }

      // 2. Seed/Upsert Citizen
      let citizenIndex = localDb.users.findIndex(u => u.email.toLowerCase() === 'citizen.verified@gmail.com');
      if (citizenIndex === -1) {
        const citizenId = 'usr_cit_001';
        const user = {
          id: citizenId,
          _id: citizenId,
          firstName: 'Verified',
          lastName: 'Citizen',
          email: 'citizen.verified@gmail.com',
          passwordHash: citizenHash,
          phoneNumber: '+91 99999 77777',
          role: 'CITIZEN',
          status: 'VERIFIED_CITIZEN',
          registeredAreaName: 'Indiranagar',
          registeredWard: 'Ward 80',
          registeredDistrict: 'Bengaluru East',
          registeredState: 'Karnataka',
          latitude: 12.9716,
          longitude: 77.5946,
          impactScore: 10,
          leaderboardScore: 150,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        localDb.users.push(user);

        const profile = {
          userId: citizenId,
          governmentIdType: 'Aadhaar',
          governmentIdNumber: '123456789012',
          governmentIdImageUrl: 'https://example.com/id.png',
          communityVerificationCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        localDb.citizen_profiles.push(profile);
        console.log('🌱 [Database] Seeded Mock Citizen into Local DB.');
      } else {
        localDb.users[citizenIndex].passwordHash = citizenHash;
        localDb.users[citizenIndex].status = 'VERIFIED_CITIZEN';
        console.log('🌱 [Database] Updated Mock Citizen credentials in Local DB.');
      }

      // 3. Seed/Upsert Officer
      let officerIndex = localDb.users.findIndex(u => u.email.toLowerCase() === 'officer.pending@gov.in');
      if (officerIndex === -1) {
        const officerId = 'usr_off_001';
        const user = {
          id: officerId,
          _id: officerId,
          firstName: 'Pending',
          lastName: 'Officer',
          email: 'officer.pending@gov.in',
          passwordHash: officerHash,
          phoneNumber: '+91 99999 66666',
          role: 'DEPARTMENT_OFFICER',
          status: 'PENDING_OFFICER_APPROVAL',
          registeredAreaName: 'Ward 80',
          registeredWard: 'Ward 80',
          registeredDistrict: 'Bengaluru East',
          registeredState: 'Karnataka',
          latitude: 12.9716,
          longitude: 77.5946,
          impactScore: 0,
          leaderboardScore: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        localDb.users.push(user);

        const profile = {
          userId: officerId,
          employeeId: 'EMP9999',
          departmentName: 'Roads Department',
          departmentIdCardImageUrl: 'https://example.com/card.png',
          assignedWard: 'Ward 80',
          assignedDistrict: 'Bengaluru East',
          assignedState: 'Karnataka',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        localDb.officer_profiles.push(profile);
        console.log('🌱 [Database] Seeded Mock Officer into Local DB.');
      } else {
        localDb.users[officerIndex].passwordHash = officerHash;
        localDb.users[officerIndex].status = 'PENDING_OFFICER_APPROVAL';
        console.log('🌱 [Database] Updated Mock Officer credentials in Local DB.');
      }

      saveLocalDb();
    } catch (err) {
      console.error('❌ [Database] Error seeding Local DB:', err);
    }
  }
}

export async function seedDefaultDepartmentDirectories() {
  if (!isUsingMongo) return;
  try {
    const count = await DepartmentDirectoryModel.countDocuments();
    if (count === 0) {
      console.log('🌱 [Database] Seeding default department directories...');
      const departments = [
        {
          name: 'Police Department',
          description: 'Provides round-the-clock law enforcement, public safety maintenance, traffic monitoring, and civic security enforcement.',
          associatedCategories: ['PUBLIC_SAFETY'],
          primaryHelpline: '100',
          escalationHelpline: '112',
          officeAddress: 'Municipal Police Headquarters, Civil Lines Sector 4',
          workingHours: '24/7 Emergency Service',
          email: 'police.help@communitycomrade.org',
          website: 'https://police.communitycomrade.org',
          isEmergencyDepartment: true,
          status: 'ACTIVE'
        },
        {
          name: 'Fire Department',
          description: 'First responders for emergency firefighting, search & rescue operations, and structural fire hazard mitigation.',
          associatedCategories: ['PUBLIC_SAFETY', 'OTHER'],
          primaryHelpline: '101',
          escalationHelpline: '112',
          officeAddress: 'Central Fire Station, Sector 2 Corner',
          workingHours: '24/7 Emergency Service',
          email: 'fire.response@communitycomrade.org',
          website: 'https://fire.communitycomrade.org',
          isEmergencyDepartment: true,
          status: 'ACTIVE'
        },
        {
          name: 'Roads Department',
          description: 'Maintains city road networks, pothole patching, highway paving, structural concrete repairs, and signalizations.',
          associatedCategories: ['POTHOLE', 'ROAD_DAMAGE', 'TRAFFIC_SIGNAL'],
          primaryHelpline: '1800-ROAD-001',
          escalationHelpline: '1800-ROAD-999',
          officeAddress: 'Municipal PWD Complex, Block B Service Rd',
          workingHours: 'Mon-Sat: 9:00 AM - 6:00 PM',
          email: 'roads.complaints@communitycomrade.org',
          website: 'https://pwd.communitycomrade.org',
          isEmergencyDepartment: false,
          status: 'ACTIVE'
        },
        {
          name: 'Water Department',
          description: 'Manages clean water supply networks, main pipeline leakage repairs, stormwater drainage systems, and sewage blockages.',
          associatedCategories: ['WATER_LEAKAGE', 'DRAINAGE'],
          primaryHelpline: '1800-WATER-001',
          escalationHelpline: '1800-WATER-999',
          officeAddress: 'Water Supply & Sewerage Board, Block C HQ',
          workingHours: 'Mon-Fri: 9:00 AM - 5:30 PM, Sat: 9:00 AM - 1:00 PM',
          email: 'water.supply@communitycomrade.org',
          website: 'https://waterboard.communitycomrade.org',
          isEmergencyDepartment: false,
          status: 'ACTIVE'
        },
        {
          name: 'Sanitation Department',
          description: 'Responsible for public sanitation, neighborhood street sweeping, solid waste recycling, and periodic collection bin management.',
          associatedCategories: ['GARBAGE'],
          primaryHelpline: '1800-CLEAN-111',
          escalationHelpline: '1800-CLEAN-222',
          officeAddress: 'Municipal Solid Waste Management Depot, Yard 8',
          workingHours: 'Mon-Sat: 8:00 AM - 4:00 PM',
          email: 'cleanliness@communitycomrade.org',
          website: 'https://sanitation.communitycomrade.org',
          isEmergencyDepartment: false,
          status: 'ACTIVE'
        }
      ];
      await DepartmentDirectoryModel.insertMany(departments);
      console.log('✅ [Database] Seeded default department directories successfully.');
    }
  } catch (err) {
    console.error('❌ [Database] Error seeding default department directories:', err);
  }
}

export async function runCitizenMigration() {
  console.log('🔄 [Database] Running citizen registration workflow migration...');
  if (isUsingMongo) {
    try {
      // Find all citizens that have isVerifiedCitizen = true but registrationStatus is not set
      const result1 = await UserModel.updateMany(
        { role: 'CITIZEN', isVerifiedCitizen: true, registrationStatus: { $exists: false } },
        { $set: { registrationStatus: 'APPROVED', verifiedBadge: true } }
      );
      if (result1.modifiedCount > 0) {
        console.log(`🔄 [Database] Migrated ${result1.modifiedCount} existing isVerifiedCitizen=true users to APPROVED.`);
      }

      // Find any citizen with status 'VERIFIED_CITIZEN' or 'COMMUNITY_VERIFIED_CITIZEN' that hasn't been migrated
      const result2 = await UserModel.updateMany(
        { 
          role: 'CITIZEN', 
          status: { $in: ['VERIFIED_CITIZEN', 'COMMUNITY_VERIFIED_CITIZEN'] },
          registrationStatus: { $exists: false } 
        },
        { 
          $set: { 
            registrationStatus: 'APPROVED', 
            isVerifiedCitizen: true, 
            verifiedBadge: true 
          } 
        }
      );
      if (result2.modifiedCount > 0) {
        console.log(`🔄 [Database] Migrated ${result2.modifiedCount} active citizens to APPROVED status.`);
      }
    } catch (err) {
      console.error('❌ [Database] MongoDB citizen migration failed:', err);
    }
  } else {
    // Local JSON
    let modified = false;
    localDb.users.forEach((u: any) => {
      if (u.role === 'CITIZEN') {
        if (u.isVerifiedCitizen === true && !u.registrationStatus) {
          u.registrationStatus = 'APPROVED';
          u.verifiedBadge = true;
          modified = true;
        } else if (['VERIFIED_CITIZEN', 'COMMUNITY_VERIFIED_CITIZEN'].includes(u.status) && !u.registrationStatus) {
          u.registrationStatus = 'APPROVED';
          u.isVerifiedCitizen = true;
          u.verifiedBadge = true;
          modified = true;
        }
      }
    });
    if (modified) {
      saveLocalDb();
      console.log('🔄 [Database] Migrated local JSON database citizens to APPROVED status.');
    }
  }
}

export async function connectDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.log('⚠️ [Database] MONGODB_URI environment variable is missing. Running in LOCAL JSON FALLBACK MODE.');
    isUsingMongo = false;
    await seedAllRequiredUsers();
    await runCitizenMigration();
    return;
  }

  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2000, // Fail fast if unreachable (prevent hang / 'Failed to fetch')
    });
    isUsingMongo = true;
    console.log('✅ [Database] Connected successfully to MongoDB Atlas.');
    await seedAllRequiredUsers();
    await seedDefaultDepartmentDirectories();
    await runCitizenMigration();
  } catch (error) {
    console.error('❌ [Database] MongoDB Atlas connection error:', error);
    console.log('⚠️ [Database] Falling back to LOCAL JSON DB mode.');
    isUsingMongo = false;
    await seedAllRequiredUsers();
    await runCitizenMigration();
  }
}

// Helper to convert Mongo Doc to plain types
function serializeDoc(doc: any) {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : doc;
  obj.id = obj._id ? obj._id.toString() : obj.id;
  if (obj._id) {
    obj._id = obj._id.toString();
  }

  // Convert any ObjectId fields to string
  for (const key of Object.keys(obj)) {
    if (obj[key] && typeof obj[key] === 'object') {
      if (obj[key] instanceof mongoose.Types.ObjectId || (obj[key].constructor && obj[key].constructor.name === 'ObjectId')) {
        obj[key] = obj[key].toString();
      }
    }
  }

  delete obj.__v;
  return obj;
}

// Unified Database API Methods
export const DbService = {
  async getUserByEmail(email: string): Promise<any | null> {
    if (isUsingMongo) {
      const doc = await UserModel.findOne({ email: email.toLowerCase() });
      return serializeDoc(doc);
    } else {
      const found = localDb.users.find(u => u.email.toLowerCase() === email.toLowerCase());
      return found ? { ...found } : null;
    }
  },

  async getUserByPhone(phone: string): Promise<any | null> {
    if (isUsingMongo) {
      const doc = await UserModel.findOne({ phoneNumber: phone });
      return serializeDoc(doc);
    } else {
      const found = localDb.users.find(u => u.phoneNumber === phone);
      return found ? { ...found } : null;
    }
  },

  async getCitizenByGovernmentId(governmentIdNumber: string): Promise<any | null> {
    if (isUsingMongo) {
      const doc = await CitizenProfileModel.findOne({ governmentIdNumber });
      return serializeDoc(doc);
    } else {
      const found = localDb.citizen_profiles.find(cp => cp.governmentIdNumber === governmentIdNumber);
      return found ? { ...found } : null;
    }
  },

  async getOfficerByEmployeeId(employeeId: string): Promise<any | null> {
    if (isUsingMongo) {
      const doc = await OfficerProfileModel.findOne({ employeeId });
      return serializeDoc(doc);
    } else {
      const found = localDb.officer_profiles.find(o => o.employeeId === employeeId);
      return found ? { ...found } : null;
    }
  },

  async getUserById(id: string): Promise<any | null> {
    if (isUsingMongo) {
      try {
        const doc = await UserModel.findById(id);
        return serializeDoc(doc);
      } catch {
        return null;
      }
    } else {
      const found = localDb.users.find(u => u.id === id);
      return found ? { ...found } : null;
    }
  },

  async createCitizen(user: any, citizenProfile: any): Promise<any> {
    if (isUsingMongo) {
      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        const newUser = new UserModel(user);
        await newUser.save({ session });

        const profile = new CitizenProfileModel({
          userId: newUser._id,
          ...citizenProfile
        });
        await profile.save({ session });

        await session.commitTransaction();
        session.endSession();

        return serializeDoc(newUser);
      } catch (err) {
        await session.abortTransaction();
        session.endSession();
        throw err;
      }
    } else {
      const newId = 'usr_' + Math.random().toString(36).substring(2, 11);
      const now = new Date().toISOString();

      const newUser = {
        ...user,
        id: newId,
        _id: newId,
        impactScore: 0,
        leaderboardScore: 0,
        createdAt: now,
        updatedAt: now
      };

      const newProfile = {
        userId: newId,
        ...citizenProfile,
        communityVerificationCount: 0,
        createdAt: now,
        updatedAt: now
      };

      localDb.users.push(newUser);
      localDb.citizen_profiles.push(newProfile);
      saveLocalDb();

      return { ...newUser };
    }
  },

  async createOfficer(user: any, officerProfile: any): Promise<any> {
    if (isUsingMongo) {
      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        const newUser = new UserModel(user);
        await newUser.save({ session });

        const profile = new OfficerProfileModel({
          userId: newUser._id,
          ...officerProfile
        });
        await profile.save({ session });

        await session.commitTransaction();
        session.endSession();

        return serializeDoc(newUser);
      } catch (err) {
        await session.abortTransaction();
        session.endSession();
        throw err;
      }
    } else {
      const newId = 'usr_' + Math.random().toString(36).substring(2, 11);
      const now = new Date().toISOString();

      const newUser = {
        ...user,
        id: newId,
        _id: newId,
        impactScore: 0,
        leaderboardScore: 0,
        createdAt: now,
        updatedAt: now
      };

      const newProfile = {
        userId: newId,
        ...officerProfile,
        createdAt: now,
        updatedAt: now
      };

      localDb.users.push(newUser);
      localDb.officer_profiles.push(newProfile);
      saveLocalDb();

      return { ...newUser };
    }
  },

  async getCitizenProfile(userId: string): Promise<any | null> {
    if (isUsingMongo) {
      try {
        const doc = await CitizenProfileModel.findOne({ userId: new mongoose.Types.ObjectId(userId) });
        return serializeDoc(doc);
      } catch {
        return null;
      }
    } else {
      const found = localDb.citizen_profiles.find(cp => cp.userId === userId);
      return found ? { ...found } : null;
    }
  },

  async getOfficerProfile(userId: string): Promise<any | null> {
    if (isUsingMongo) {
      try {
        const doc = await OfficerProfileModel.findOne({ userId: new mongoose.Types.ObjectId(userId) });
        return serializeDoc(doc);
      } catch {
        return null;
      }
    } else {
      const found = localDb.officer_profiles.find(op => op.userId === userId);
      return found ? { ...found } : null;
    }
  },

  async checkDuplicateEndorsement(endorserUserId: string, endorsedUserId: string): Promise<boolean> {
    if (isUsingMongo) {
      const doc = await CommunityEndorsementModel.findOne({
        endorserUserId: new mongoose.Types.ObjectId(endorserUserId),
        endorsedUserId: new mongoose.Types.ObjectId(endorsedUserId)
      });
      return !!doc;
    } else {
      return localDb.community_endorsements.some(
        e => e.endorserUserId === endorserUserId && e.endorsedUserId === endorsedUserId
      );
    }
  },

  async getEndorsementsByEndorser(endorserUserId: string): Promise<any[]> {
    if (isUsingMongo) {
      const docs = await CommunityEndorsementModel.find({
        endorserUserId: new mongoose.Types.ObjectId(endorserUserId)
      });
      return docs.map(doc => serializeDoc(doc));
    } else {
      return localDb.community_endorsements
        .filter(e => e.endorserUserId === endorserUserId)
        .map(e => ({ ...e }));
    }
  },

  async addEndorsement(endorserUserId: string, endorsedUserId: string): Promise<any> {
    if (isUsingMongo) {
      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        const newEndorsement = new CommunityEndorsementModel({
          endorserUserId: new mongoose.Types.ObjectId(endorserUserId),
          endorsedUserId: new mongoose.Types.ObjectId(endorsedUserId)
        });
        await newEndorsement.save({ session });

        // Count unique endorsements
        const endorsementCount = await CommunityEndorsementModel.countDocuments({
          endorsedUserId: new mongoose.Types.ObjectId(endorsedUserId)
        }, { session });

        // Update Citizen Profile
        const updateObj: any = { communityVerificationCount: endorsementCount };
        let promoteToCommunityVerified = false;

        if (endorsementCount >= 3) {
          updateObj.communityVerifiedAt = new Date();
          promoteToCommunityVerified = true;
        }

        await CitizenProfileModel.findOneAndUpdate(
          { userId: new mongoose.Types.ObjectId(endorsedUserId) },
          { $set: updateObj },
          { session }
        );

        if (promoteToCommunityVerified) {
          await UserModel.findByIdAndUpdate(
            endorsedUserId,
            { $set: { status: 'COMMUNITY_VERIFIED_CITIZEN' } },
            { session }
          );
        }

        await session.commitTransaction();
        session.endSession();
        return serializeDoc(newEndorsement);
      } catch (err) {
        await session.abortTransaction();
        session.endSession();
        throw err;
      }
    } else {
      const newId = 'end_' + Math.random().toString(36).substring(2, 11);
      const now = new Date().toISOString();

      const endorsement = {
        id: newId,
        _id: newId,
        endorserUserId,
        endorsedUserId,
        createdAt: now
      };

      localDb.community_endorsements.push(endorsement);

      // Recalculate endorsements count
      const endorsementsCount = localDb.community_endorsements.filter(e => e.endorsedUserId === endorsedUserId).length;

      const profileIndex = localDb.citizen_profiles.findIndex(cp => cp.userId === endorsedUserId);
      if (profileIndex !== -1) {
        localDb.citizen_profiles[profileIndex].communityVerificationCount = endorsementsCount;
        if (endorsementsCount >= 3) {
          localDb.citizen_profiles[profileIndex].communityVerifiedAt = now;
        }
      }

      if (endorsementsCount >= 3) {
        const userIndex = localDb.users.findIndex(u => u.id === endorsedUserId);
        if (userIndex !== -1) {
          localDb.users[userIndex].status = 'COMMUNITY_VERIFIED_CITIZEN';
        }
      }

      saveLocalDb();
      return { ...endorsement };
    }
  },

  async getPendingOfficers(): Promise<any[]> {
    if (isUsingMongo) {
      // Find all users with role OFFICER and PENDING approval status
      const users = await UserModel.find({ role: 'DEPARTMENT_OFFICER', status: 'PENDING_OFFICER_APPROVAL' });
      const officerProfiles = await OfficerProfileModel.find({
        userId: { $in: users.map(u => u._id) }
      });

      const serializedUsers = users.map(u => serializeDoc(u));
      const serializedProfiles = officerProfiles.map(p => serializeDoc(p));

      return serializedUsers.map(u => ({
        ...u,
        profile: serializedProfiles.find(p => p.userId === u.id) || null
      }));
    } else {
      const pendingUsers = localDb.users.filter(u => u.role === 'DEPARTMENT_OFFICER' && u.status === 'PENDING_OFFICER_APPROVAL');
      return pendingUsers.map(u => {
        const profile = localDb.officer_profiles.find(op => op.userId === u.id) || null;
        return {
          ...u,
          profile
        };
      });
    }
  },

  async getApprovedOfficers(): Promise<any[]> {
    if (isUsingMongo) {
      const users = await UserModel.find({ role: 'DEPARTMENT_OFFICER', status: 'ACTIVE_OFFICER' });
      const officerProfiles = await OfficerProfileModel.find({
        userId: { $in: users.map(u => u._id) }
      });

      const serializedUsers = users.map(u => serializeDoc(u));
      const serializedProfiles = officerProfiles.map(p => serializeDoc(p));

      return serializedUsers.map(u => ({
        ...u,
        profile: serializedProfiles.find(p => p.userId === u.id) || null
      }));
    } else {
      const activeUsers = localDb.users.filter(u => u.role === 'DEPARTMENT_OFFICER' && u.status === 'ACTIVE_OFFICER');
      return activeUsers.map(u => {
        const profile = localDb.officer_profiles.find(op => op.userId === u.id) || null;
        return {
          ...u,
          profile
        };
      });
    }
  },

  async reviewOfficer(officerUserId: string, action: 'APPROVE' | 'REJECT', notes: string, adminUserId: string): Promise<any> {
    const finalStatus = action === 'APPROVE' ? 'ACTIVE_OFFICER' : 'REJECTED_OFFICER';

    if (isUsingMongo) {
      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        const updatedUser = await UserModel.findByIdAndUpdate(
          officerUserId,
          { $set: { status: finalStatus } },
          { new: true, session }
        );

        const log = new AuditLogModel({
          actorId: new mongoose.Types.ObjectId(adminUserId),
          actorRole: 'ADMIN',
          action: `OFFICER_REVIEW_${action}`,
          targetId: new mongoose.Types.ObjectId(officerUserId),
          targetType: 'User',
          timestamp: new Date()
        });
        await log.save({ session });

        await session.commitTransaction();
        session.endSession();

        return serializeDoc(updatedUser);
      } catch (err) {
        await session.abortTransaction();
        session.endSession();
        throw err;
      }
    } else {
      const userIndex = localDb.users.findIndex(u => u.id === officerUserId);
      if (userIndex !== -1) {
        localDb.users[userIndex].status = finalStatus;
      }

      const logId = 'log_' + Math.random().toString(36).substring(2, 11);
      localDb.audit_logs.push({
        id: logId,
        _id: logId,
        actorId: adminUserId,
        actorRole: 'ADMIN',
        action: `OFFICER_REVIEW_${action}`,
        targetId: officerUserId,
        targetType: 'User',
        timestamp: new Date().toISOString()
      });

      saveLocalDb();
      return localDb.users[userIndex] ? { ...localDb.users[userIndex] } : null;
    }
  },

  async suspendUser(targetUserId: string, adminUserId: string): Promise<any> {
    if (isUsingMongo) {
      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        const updatedUser = await UserModel.findByIdAndUpdate(
          targetUserId,
          { $set: { status: 'SUSPENDED' } },
          { new: true, session }
        );

        const log = new AuditLogModel({
          actorId: new mongoose.Types.ObjectId(adminUserId),
          actorRole: 'ADMIN',
          action: 'SUSPEND_USER',
          targetId: new mongoose.Types.ObjectId(targetUserId),
          targetType: 'User',
          timestamp: new Date()
        });
        await log.save({ session });

        await session.commitTransaction();
        session.endSession();

        return serializeDoc(updatedUser);
      } catch (err) {
        await session.abortTransaction();
        session.endSession();
        throw err;
      }
    } else {
      const userIndex = localDb.users.findIndex(u => u.id === targetUserId);
      if (userIndex !== -1) {
        localDb.users[userIndex].status = 'SUSPENDED';
      }

      const logId = 'log_' + Math.random().toString(36).substring(2, 11);
      localDb.audit_logs.push({
        id: logId,
        _id: logId,
        actorId: adminUserId,
        actorRole: 'ADMIN',
        action: 'SUSPEND_USER',
        targetId: targetUserId,
        targetType: 'User',
        timestamp: new Date().toISOString()
      });

      saveLocalDb();
      return localDb.users[userIndex] ? { ...localDb.users[userIndex] } : null;
    }
  },

  async reinstateUser(targetUserId: string, adminUserId: string): Promise<any> {
    if (isUsingMongo) {
      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        const targetUser = await UserModel.findById(targetUserId);
        if (!targetUser) throw new Error('User not found');

        // Restore default statuses based on role
        let restoredStatus = 'VERIFIED_CITIZEN';
        if (targetUser.role === 'DEPARTMENT_OFFICER') {
          restoredStatus = 'ACTIVE_OFFICER';
        } else if (targetUser.role === 'ADMIN') {
          restoredStatus = 'ACTIVE_ADMIN';
        }

        const updatedUser = await UserModel.findByIdAndUpdate(
          targetUserId,
          { $set: { status: restoredStatus } },
          { new: true, session }
        );

        const log = new AuditLogModel({
          actorId: new mongoose.Types.ObjectId(adminUserId),
          actorRole: 'ADMIN',
          action: 'REINSTATE_USER',
          targetId: new mongoose.Types.ObjectId(targetUserId),
          targetType: 'User',
          timestamp: new Date()
        });
        await log.save({ session });

        await session.commitTransaction();
        session.endSession();

        return serializeDoc(updatedUser);
      } catch (err) {
        await session.abortTransaction();
        session.endSession();
        throw err;
      }
    } else {
      const userIndex = localDb.users.findIndex(u => u.id === targetUserId);
      if (userIndex !== -1) {
        const targetUser = localDb.users[userIndex];
        let restoredStatus = 'VERIFIED_CITIZEN';
        if (targetUser.role === 'DEPARTMENT_OFFICER') {
          restoredStatus = 'ACTIVE_OFFICER';
        } else if (targetUser.role === 'ADMIN') {
          restoredStatus = 'ACTIVE_ADMIN';
        }
        localDb.users[userIndex].status = restoredStatus;
      }

      const logId = 'log_' + Math.random().toString(36).substring(2, 11);
      localDb.audit_logs.push({
        id: logId,
        _id: logId,
        actorId: adminUserId,
        actorRole: 'ADMIN',
        action: 'REINSTATE_USER',
        targetId: targetUserId,
        targetType: 'User',
        timestamp: new Date().toISOString()
      });

      saveLocalDb();
      return localDb.users[userIndex] ? { ...localDb.users[userIndex] } : null;
    }
  },

  async getAllUsersList(): Promise<any[]> {
    if (isUsingMongo) {
      const users = await UserModel.find({});
      const citizenProfiles = await CitizenProfileModel.find({});
      const officerProfiles = await OfficerProfileModel.find({});

      const serializedUsers = users.map(u => serializeDoc(u));
      const serializedCitizens = citizenProfiles.map(p => serializeDoc(p));
      const serializedOfficers = officerProfiles.map(p => serializeDoc(p));

      return serializedUsers.map(u => ({
        ...u,
        citizenProfile: serializedCitizens.find(p => p.userId === u.id) || null,
        officerProfile: serializedOfficers.find(p => p.userId === u.id) || null
      }));
    } else {
      return localDb.users.map(u => {
        const citizenProfile = localDb.citizen_profiles.find(cp => cp.userId === u.id) || null;
        const officerProfile = localDb.officer_profiles.find(op => op.userId === u.id) || null;
        return {
          ...u,
          citizenProfile,
          officerProfile
        };
      });
    }
  },

  async createAuditLog(actorId: string, actorRole: string, action: string, targetId: string, targetType: string): Promise<any> {
    if (isUsingMongo) {
      const log = new AuditLogModel({
        actorId: new mongoose.Types.ObjectId(actorId),
        actorRole,
        action,
        targetId: new mongoose.Types.ObjectId(targetId),
        targetType,
        timestamp: new Date()
      });
      await log.save();
      return serializeDoc(log);
    } else {
      const logId = 'log_' + Math.random().toString(36).substring(2, 11);
      const log = {
        id: logId,
        _id: logId,
        actorId,
        actorRole,
        action,
        targetId,
        targetType,
        timestamp: new Date().toISOString()
      };
      localDb.audit_logs.push(log);
      saveLocalDb();
      return { ...log };
    }
  },

  async getAuditLogs(): Promise<any[]> {
    if (isUsingMongo) {
      const logs = await AuditLogModel.find({}).sort({ timestamp: -1 });
      return logs.map(l => serializeDoc(l));
    } else {
      return [...localDb.audit_logs].reverse();
    }
  },

  async seedAdminUserManual(emailInput: string, passInput: string): Promise<any> {
    const salt = '$2a$10$tZreM.f83L24bK.oX'; // stable mock salt for testing
    const passwordHash = '$2a$10$tZreM.f83L24bK.oXitGCO/9O1O1FvXm8W1I.K67t00I3E19wK0y6'; // 'Admin123!'

    if (isUsingMongo) {
      const existing = await UserModel.findOne({ email: emailInput.toLowerCase() });
      if (existing) return serializeDoc(existing);

      const user = new UserModel({
        firstName: 'Seeded',
        lastName: 'Admin',
        email: emailInput.toLowerCase(),
        passwordHash,
        phoneNumber: '+91 99999 88812',
        role: 'ADMIN',
        status: 'ACTIVE_ADMIN',
        registeredAreaName: 'Central HQ',
        registeredWard: 'Ward 1',
        registeredDistrict: 'Central District',
        registeredState: 'State Sector',
        latitude: 12.9716,
        longitude: 77.5946,
        impactScore: 100,
        leaderboardScore: 1000
      });
      await user.save();
      return serializeDoc(user);
    } else {
      const existing = localDb.users.find(u => u.email.toLowerCase() === emailInput.toLowerCase());
      if (existing) return existing;

      const newId = 'usr_' + Math.random().toString(36).substring(2, 11);
      const now = new Date().toISOString();
      const user = {
        id: newId,
        _id: newId,
        firstName: 'Seeded',
        lastName: 'Admin',
        email: emailInput.toLowerCase(),
        passwordHash,
        phoneNumber: '+91 99999 88812',
        role: 'ADMIN' as const,
        status: 'ACTIVE_ADMIN' as const,
        registeredAreaName: 'Central HQ',
        registeredWard: 'Ward 1',
        registeredDistrict: 'Central District',
        registeredState: 'State Sector',
        latitude: 12.9716,
        longitude: 77.5946,
        impactScore: 100,
        leaderboardScore: 1000,
        createdAt: now,
        updatedAt: now
      };
      localDb.users.push(user);
      saveLocalDb();
      return { ...user };
    }
  },

  async generateNextIssueNumber(): Promise<string> {
    const year = new Date().getFullYear();
    let count = 0;
    if (isUsingMongo) {
      count = await IssueModel.countDocuments();
    } else {
      count = localDb.issues.length;
    }
    const numStr = String(count + 1).padStart(6, '0');
    return `CC-${year}-${numStr}`;
  },

  async createIssue(issueData: any): Promise<any> {
    if (isUsingMongo) {
      const issue = new IssueModel(issueData);
      await issue.save();
      return serializeDoc(issue);
    } else {
      const now = new Date().toISOString();
      const issueWithTimestamps = {
        _id: 'iss_' + Math.random().toString(36).substring(2, 11),
        id: 'iss_' + Math.random().toString(36).substring(2, 11),
        ...issueData,
        createdAt: now,
        updatedAt: now
      };
      localDb.issues.push(issueWithTimestamps);
      saveLocalDb();
      return { ...issueWithTimestamps };
    }
  },

  async createIssueAudit(auditData: any): Promise<any> {
    if (isUsingMongo) {
      const formattedData = { ...auditData };
      
      // Ensure actorId is a valid ObjectId
      if (formattedData.actorId) {
        const actorIdStr = String(formattedData.actorId);
        if (mongoose.Types.ObjectId.isValid(actorIdStr)) {
          formattedData.actorId = new mongoose.Types.ObjectId(actorIdStr);
        } else {
          // If not a valid ObjectId, fallback to a system default ObjectId to prevent casting errors
          formattedData.actorId = new mongoose.Types.ObjectId("000000000000000000000000");
        }
      } else {
        formattedData.actorId = new mongoose.Types.ObjectId("000000000000000000000000");
      }

      const audit = new IssueAuditModel(formattedData);
      await audit.save();
      return serializeDoc(audit);
    } else {
      const auditWithTimestamp = {
        _id: 'aud_' + Math.random().toString(36).substring(2, 11),
        id: 'aud_' + Math.random().toString(36).substring(2, 11),
        createdAt: new Date().toISOString(),
        ...auditData
      };
      localDb.issue_audits.push(auditWithTimestamp);
      saveLocalDb();
      return { ...auditWithTimestamp };
    }
  },

  async updateIssue(issueNumber: string, updateFields: any): Promise<any> {
    if (isUsingMongo) {
      await IssueModel.updateOne({ issueNumber }, { $set: updateFields });
      const doc = await IssueModel.findOne({ issueNumber });
      return serializeDoc(doc);
    } else {
      const idx = localDb.issues.findIndex(i => i.issueNumber === issueNumber);
      if (idx !== -1) {
        localDb.issues[idx] = {
          ...localDb.issues[idx],
          ...updateFields,
          updatedAt: new Date().toISOString()
        };
        saveLocalDb();
        return { ...localDb.issues[idx] };
      }
      return null;
    }
  },

  async getIssueByNumber(issueNumber: string): Promise<any | null> {
    if (isUsingMongo) {
      const doc = await IssueModel.findOne({ issueNumber });
      return serializeDoc(doc);
    } else {
      const found = localDb.issues.find(i => i.issueNumber === issueNumber);
      return found ? { ...found } : null;
    }
  },

  async getIssueById(id: string): Promise<any | null> {
    if (isUsingMongo) {
      try {
        const doc = await IssueModel.findById(id);
        return serializeDoc(doc);
      } catch {
        return null;
      }
    } else {
      const found = localDb.issues.find(i => i.id === id || i._id === id);
      return found ? { ...found } : null;
    }
  },

  async getIssueAudits(issueId: string): Promise<any[]> {
    if (isUsingMongo) {
      const docs = await IssueAuditModel.find({ issueId }).sort({ createdAt: 1 });
      return docs.map(doc => serializeDoc(doc));
    } else {
      return localDb.issue_audits
        .filter(a => a.issueId === issueId)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }
  },

  async getIssues(filter: any): Promise<any[]> {
    if (isUsingMongo) {
      const mongoFilter = { ...filter };
      if (typeof mongoFilter.reporterDistrict === 'string') {
        mongoFilter.reporterDistrict = { $regex: new RegExp(`^${mongoFilter.reporterDistrict}$`, 'i') };
      }
      if (typeof mongoFilter.reporterWard === 'string') {
        mongoFilter.reporterWard = { $regex: new RegExp(`^${mongoFilter.reporterWard}$`, 'i') };
      }
      if (typeof mongoFilter.reporterState === 'string') {
        mongoFilter.$or = [
          { reporterState: { $regex: new RegExp(`^${mongoFilter.reporterState}$`, 'i') } },
          { reporterState: { $exists: false } }
        ];
        delete mongoFilter.reporterState;
      }
      const docs = await IssueModel.find(mongoFilter).sort({ createdAt: -1 });
      return docs.map(doc => serializeDoc(doc));
    } else {
      let list = [...localDb.issues];
      if (filter.reporterId) {
        list = list.filter(i => i.reporterId === filter.reporterId);
      }
      if (filter.reporterDistrict) {
        list = list.filter(i => (i.reporterDistrict || '').toLowerCase() === filter.reporterDistrict.toLowerCase());
      }
      if (filter.reporterWard) {
        list = list.filter(i => (i.reporterWard || '').toLowerCase() === filter.reporterWard.toLowerCase());
      }
      if (filter.reporterState) {
        list = list.filter(i => !i.reporterState || (i.reporterState || '').toLowerCase() === filter.reporterState.toLowerCase());
      }
      if (filter.status) {
        list = list.filter(i => i.status === filter.status);
      }
      // Sort descending by createdAt
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return list;
    }
  },

  async createResolutionSubmission(submissionData: any): Promise<any> {
    if (isUsingMongo) {
      const doc = new ResolutionSubmissionModel(submissionData);
      await doc.save();
      return serializeDoc(doc);
    } else {
      const now = new Date().toISOString();
      const submissionWithTimestamps = {
        _id: 'res_' + Math.random().toString(36).substring(2, 11),
        id: 'res_' + Math.random().toString(36).substring(2, 11),
        ...submissionData,
        createdAt: now,
        updatedAt: now
      };
      if (!localDb.resolution_submissions) {
        localDb.resolution_submissions = [];
      }
      localDb.resolution_submissions.push(submissionWithTimestamps);
      saveLocalDb();
      return { ...submissionWithTimestamps };
    }
  },

  async updateResolutionSubmissionAiResult(submissionId: string, aiFields: any): Promise<any> {
    if (isUsingMongo) {
      const doc = await ResolutionSubmissionModel.findByIdAndUpdate(submissionId, { $set: aiFields }, { new: true });
      return doc ? serializeDoc(doc) : null;
    } else {
      if (!localDb.resolution_submissions) {
        localDb.resolution_submissions = [];
      }
      const idx = localDb.resolution_submissions.findIndex(r => r._id === submissionId || r.id === submissionId);
      if (idx !== -1) {
        localDb.resolution_submissions[idx] = {
          ...localDb.resolution_submissions[idx],
          ...aiFields,
          updatedAt: new Date().toISOString()
        };
        saveLocalDb();
        return { ...localDb.resolution_submissions[idx] };
      }
      return null;
    }
  },

  async getResolutionSubmissionsByIssue(issueNumber: string): Promise<any[]> {
    if (isUsingMongo) {
      const docs = await ResolutionSubmissionModel.find({ issueNumber }).sort({ createdAt: -1 });
      return docs ? docs.map(doc => serializeDoc(doc)) : [];
    } else {
      if (!localDb.resolution_submissions) {
        localDb.resolution_submissions = [];
      }
      const matches = localDb.resolution_submissions.filter(r => r.issueNumber === issueNumber);
      matches.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return matches.map(m => ({ ...m }));
    }
  },

  async getResolutionSubmissionByIssue(issueNumber: string): Promise<any | null> {
    const submissions = await DbService.getResolutionSubmissionsByIssue(issueNumber);
    return submissions.length > 0 ? submissions[0] : null;
  },

  async createResolutionVerification(verificationData: any): Promise<any> {
    if (isUsingMongo) {
      const doc = new ResolutionVerificationModel(verificationData);
      await doc.save();
      return serializeDoc(doc);
    } else {
      const now = new Date().toISOString();
      const verificationWithTimestamps = {
        _id: 'ver_' + Math.random().toString(36).substring(2, 11),
        id: 'ver_' + Math.random().toString(36).substring(2, 11),
        ...verificationData,
        createdAt: now,
        updatedAt: now
      };
      if (!localDb.resolution_verifications) {
        localDb.resolution_verifications = [];
      }
      localDb.resolution_verifications.push(verificationWithTimestamps);
      saveLocalDb();
      return { ...verificationWithTimestamps };
    }
  },

  async getResolutionVerifications(issueId: string): Promise<any[]> {
    if (isUsingMongo) {
      const docs = await ResolutionVerificationModel.find({ issueId }).sort({ createdAt: -1 });
      return docs.map(doc => serializeDoc(doc));
    } else {
      if (!localDb.resolution_verifications) {
        localDb.resolution_verifications = [];
      }
      const list = localDb.resolution_verifications
        .filter(v => String(v.issueId) === String(issueId))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return list.map(item => ({ ...item }));
    }
  },

  async getResolutionVerificationByCitizenAndIssue(citizenUserId: string, issueId: string): Promise<any | null> {
    if (isUsingMongo) {
      const doc = await ResolutionVerificationModel.findOne({ citizenUserId, issueId });
      return doc ? serializeDoc(doc) : null;
    } else {
      if (!localDb.resolution_verifications) {
        localDb.resolution_verifications = [];
      }
      const found = localDb.resolution_verifications.find(
        v => String(v.citizenUserId) === String(citizenUserId) && String(v.issueId) === String(issueId)
      );
      return found ? { ...found } : null;
    }
  },

  async clearResolutionVerifications(issueId: string): Promise<void> {
    if (isUsingMongo) {
      await ResolutionVerificationModel.deleteMany({ issueId });
    } else {
      if (localDb.resolution_verifications) {
        localDb.resolution_verifications = localDb.resolution_verifications.filter(
          v => String(v.issueId) !== String(issueId)
        );
        saveLocalDb();
      }
    }
  },

  async awardPoints(userId: string, points: number): Promise<any> {
    if (isUsingMongo) {
      const updatedUser = await UserModel.findByIdAndUpdate(
        userId,
        {
          $inc: {
            leaderboardScore: points,
            monthlyLeaderboardScore: points,
            impactScore: points
          }
        },
        { new: true }
      );
      return updatedUser ? serializeDoc(updatedUser) : null;
    } else {
      const idx = localDb.users.findIndex(u => String(u._id) === String(userId) || String(u.id) === String(userId));
      if (idx !== -1) {
        localDb.users[idx].leaderboardScore = (localDb.users[idx].leaderboardScore || 0) + points;
        localDb.users[idx].monthlyLeaderboardScore = (localDb.users[idx].monthlyLeaderboardScore || 0) + points;
        localDb.users[idx].impactScore = (localDb.users[idx].impactScore || 0) + points;
        saveLocalDb();
        return { ...localDb.users[idx] };
      }
      return null;
    }
  },

  // Feature 8 - Issue Discussion Methods
  async getOrCreateDiscussionThread(issueId: string): Promise<any> {
    if (isUsingMongo) {
      let thread = await IssueDiscussionThreadModel.findOne({ issueId });
      if (!thread) {
        thread = new IssueDiscussionThreadModel({
          issueId,
          isLocked: false,
          messageCount: 0,
          participants: []
        });
        await thread.save();
      }
      return serializeDoc(thread);
    } else {
      if (!localDb.issue_discussion_threads) {
        localDb.issue_discussion_threads = [];
      }
      let thread = localDb.issue_discussion_threads.find(t => String(t.issueId) === String(issueId));
      if (!thread) {
        const now = new Date().toISOString();
        thread = {
          _id: 'thread_' + Math.random().toString(36).substring(2, 11),
          id: 'thread_' + Math.random().toString(36).substring(2, 11),
          issueId,
          isLocked: false,
          messageCount: 0,
          participants: [],
          createdAt: now,
          updatedAt: now
        };
        localDb.issue_discussion_threads.push(thread);
        saveLocalDb();
      }
      return { ...thread };
    }
  },

  async setThreadLockStatus(issueId: string, isLocked: boolean, lockedByUserId?: string): Promise<any> {
    if (isUsingMongo) {
      const thread = await IssueDiscussionThreadModel.findOneAndUpdate(
        { issueId },
        { 
          $set: { 
            isLocked, 
            lockedBy: lockedByUserId ? new mongoose.Types.ObjectId(lockedByUserId) : undefined,
            lockedAt: isLocked ? new Date() : undefined
          } 
        },
        { new: true, upsert: true }
      );
      return serializeDoc(thread);
    } else {
      if (!localDb.issue_discussion_threads) {
        localDb.issue_discussion_threads = [];
      }
      let thread = localDb.issue_discussion_threads.find(t => String(t.issueId) === String(issueId));
      const now = new Date().toISOString();
      if (!thread) {
        thread = {
          _id: 'thread_' + Math.random().toString(36).substring(2, 11),
          id: 'thread_' + Math.random().toString(36).substring(2, 11),
          issueId,
          isLocked,
          lockedBy: lockedByUserId,
          lockedAt: isLocked ? now : undefined,
          messageCount: 0,
          participants: [],
          createdAt: now,
          updatedAt: now
        };
        localDb.issue_discussion_threads.push(thread);
      } else {
        thread.isLocked = isLocked;
        thread.lockedBy = lockedByUserId;
        thread.lockedAt = isLocked ? now : undefined;
        thread.updatedAt = now;
      }
      saveLocalDb();
      return { ...thread };
    }
  },

  async createIssueMessage(messageData: any): Promise<any> {
    if (isUsingMongo) {
      const msg = new IssueMessageModel({
        issueId: new mongoose.Types.ObjectId(messageData.issueId),
        userId: new mongoose.Types.ObjectId(messageData.userId),
        userRole: messageData.userRole,
        messageType: messageData.messageType,
        message: messageData.message,
        imageUrls: messageData.imageUrls || [],
        isDeleted: false
      });
      await msg.save();

      // Update thread message count and participants
      await IssueDiscussionThreadModel.updateOne(
        { issueId: messageData.issueId },
        { 
          $inc: { messageCount: 1 },
          $addToSet: { participants: new mongoose.Types.ObjectId(messageData.userId) }
        },
        { upsert: true }
      );

      return serializeDoc(msg);
    } else {
      if (!localDb.issue_messages) localDb.issue_messages = [];
      if (!localDb.issue_discussion_threads) localDb.issue_discussion_threads = [];

      const now = new Date().toISOString();
      const newMsg = {
        _id: 'msg_' + Math.random().toString(36).substring(2, 11),
        id: 'msg_' + Math.random().toString(36).substring(2, 11),
        issueId: messageData.issueId,
        userId: messageData.userId,
        userRole: messageData.userRole,
        messageType: messageData.messageType,
        message: messageData.message,
        imageUrls: messageData.imageUrls || [],
        isDeleted: false,
        createdAt: now,
        updatedAt: now
      };
      localDb.issue_messages.push(newMsg);

      let thread = localDb.issue_discussion_threads.find(t => String(t.issueId) === String(messageData.issueId));
      if (!thread) {
        thread = {
          _id: 'thread_' + Math.random().toString(36).substring(2, 11),
          id: 'thread_' + Math.random().toString(36).substring(2, 11),
          issueId: messageData.issueId,
          isLocked: false,
          messageCount: 1,
          participants: [messageData.userId],
          createdAt: now,
          updatedAt: now
        };
        localDb.issue_discussion_threads.push(thread);
      } else {
        thread.messageCount = (thread.messageCount || 0) + 1;
        if (!thread.participants) thread.participants = [];
        if (!thread.participants.includes(messageData.userId)) {
          thread.participants.push(messageData.userId);
        }
        thread.updatedAt = now;
      }

      saveLocalDb();
      return { ...newMsg };
    }
  },

  async deleteIssueMessage(messageId: string): Promise<boolean> {
    if (isUsingMongo) {
      try {
        console.log(`[Database] deleteIssueMessage called with messageId: ${messageId}`);
        const queries: any[] = [{ _id: messageId }, { id: messageId }];
        if (mongoose.Types.ObjectId.isValid(messageId)) {
          queries.push({ _id: new mongoose.Types.ObjectId(messageId) });
        }
        
        const res = await IssueMessageModel.updateOne(
          { $or: queries },
          { $set: { isDeleted: true } }
        );
        console.log(`[Database] deleteIssueMessage Mongo update result: matchedCount=${res.matchedCount}, modifiedCount=${res.modifiedCount}`);
        return res.matchedCount > 0 || res.modifiedCount > 0;
      } catch (err) {
        console.error('Error in deleteIssueMessage (mongo):', err);
        return false;
      }
    } else {
      if (!localDb.issue_messages) return false;
      const msg = localDb.issue_messages.find(m => 
        (m._id && String(m._id) === String(messageId)) || 
        (m.id && String(m.id) === String(messageId))
      );
      if (msg) {
        msg.isDeleted = true;
        saveLocalDb();
        return true;
      }
      return false;
    }
  },

  async getDiscussionMessages(issueId: string): Promise<any[]> {
    if (isUsingMongo) {
      const messages = await IssueMessageModel.find({ issueId })
        .sort({ createdAt: 1 })
        .lean();
      
      // Populate user names / details for rendering
      const populatedMessages = [];
      for (const msg of messages) {
        const user = await UserModel.findById(msg.userId).lean();
        let fallbackName = 'Resident';
        if (msg.userRole === 'ADMIN') fallbackName = 'ADMIN';
        else if (msg.userRole === 'DEPARTMENT_OFFICER') fallbackName = 'Officer';

        populatedMessages.push({
          ...serializeDoc(msg),
          userName: user ? `${user.firstName} ${user.lastName}` : fallbackName,
          userEmail: user?.email || '',
        });
      }
      return populatedMessages;
    } else {
      if (!localDb.issue_messages) return [];
      const messages = localDb.issue_messages.filter(m => String(m.issueId) === String(issueId));
      return messages.map(msg => {
        const user = localDb.users.find(u => String(u._id) === String(msg.userId) || String(u.id) === String(msg.userId));
        let fallbackName = 'Resident';
        if (msg.userRole === 'ADMIN') fallbackName = 'ADMIN';
        else if (msg.userRole === 'DEPARTMENT_OFFICER') fallbackName = 'Officer';

        return {
          ...msg,
          userName: user ? `${user.firstName} ${user.lastName}` : fallbackName,
          userEmail: user?.email || '',
        };
      }).sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }
  },

  async saveDiscussionSummary(summaryData: any): Promise<any> {
    if (isUsingMongo) {
      const updated = await DiscussionSummaryModel.findOneAndUpdate(
        { issueId: new mongoose.Types.ObjectId(summaryData.issueId) },
        {
          $set: {
            summary: summaryData.summary,
            keyConcerns: summaryData.keyConcerns || [],
            latestProgress: summaryData.latestProgress,
            pendingActions: summaryData.pendingActions || [],
            generatedAt: new Date()
          }
        },
        { new: true, upsert: true }
      );
      return serializeDoc(updated);
    } else {
      if (!localDb.discussion_summaries) localDb.discussion_summaries = [];
      let summary = localDb.discussion_summaries.find(s => String(s.issueId) === String(summaryData.issueId));
      const now = new Date().toISOString();
      if (!summary) {
        summary = {
          _id: 'sum_' + Math.random().toString(36).substring(2, 11),
          id: 'sum_' + Math.random().toString(36).substring(2, 11),
          issueId: summaryData.issueId,
          summary: summaryData.summary,
          keyConcerns: summaryData.keyConcerns || [],
          latestProgress: summaryData.latestProgress,
          pendingActions: summaryData.pendingActions || [],
          generatedAt: now,
          createdAt: now,
          updatedAt: now
        };
        localDb.discussion_summaries.push(summary);
      } else {
        summary.summary = summaryData.summary;
        summary.keyConcerns = summaryData.keyConcerns || [];
        summary.latestProgress = summaryData.latestProgress;
        summary.pendingActions = summaryData.pendingActions || [];
        summary.generatedAt = now;
        summary.updatedAt = now;
      }
      saveLocalDb();
      return { ...summary };
    }
  },

  async getDiscussionSummary(issueId: string): Promise<any> {
    if (isUsingMongo) {
      const summary = await DiscussionSummaryModel.findOne({ issueId });
      return summary ? serializeDoc(summary) : null;
    } else {
      if (!localDb.discussion_summaries) return null;
      const summary = localDb.discussion_summaries.find(s => String(s.issueId) === String(issueId));
      return summary ? { ...summary } : null;
    }
  },

  async getDiscussionAnalytics(issueId: string): Promise<any> {
    const thread = await this.getOrCreateDiscussionThread(issueId);
    const messages = await this.getDiscussionMessages(issueId);
    
    const participantIds = new Set(messages.map(m => String(m.userId)));
    const officerMessages = messages.filter(m => m.userRole === 'DEPARTMENT_OFFICER');
    const citizenMessages = messages.filter(m => m.userRole === 'CITIZEN');

    // Calculate average response time
    let averageResponseTimeHours = 0;
    if (citizenMessages.length > 0 && officerMessages.length > 0) {
      let totalDiffMs = 0;
      let count = 0;
      for (const cMsg of citizenMessages) {
        const firstOfficerReply = officerMessages.find(o => new Date(o.createdAt).getTime() > new Date(cMsg.createdAt).getTime());
        if (firstOfficerReply) {
          totalDiffMs += new Date(firstOfficerReply.createdAt).getTime() - new Date(cMsg.createdAt).getTime();
          count++;
        }
      }
      if (count > 0) {
        averageResponseTimeHours = (totalDiffMs / count) / (1000 * 60 * 60);
      }
    }

    return {
      messageCount: messages.length,
      participantCount: participantIds.size,
      officerMessageCount: officerMessages.length,
      citizenMessageCount: citizenMessages.length,
      averageOfficerResponseTimeHours: Number(averageResponseTimeHours.toFixed(2))
    };
  },

  async getDepartmentDirectories(filter: any = {}): Promise<any[]> {
    if (isUsingMongo) {
      let query: any = {};
      if (filter.status) query.status = filter.status;
      if (filter.isEmergencyDepartment !== undefined) query.isEmergencyDepartment = filter.isEmergencyDepartment;
      
      const docs = await DepartmentDirectoryModel.find(query).sort({ isEmergencyDepartment: -1, name: 1 });
      return docs.map(d => serializeDoc(d));
    } else {
      let list = [...(localDb.department_directories || [])];
      if (filter.status) list = list.filter(d => d.status === filter.status);
      if (filter.isEmergencyDepartment !== undefined) {
        list = list.filter(d => d.isEmergencyDepartment === filter.isEmergencyDepartment);
      }
      list.sort((a, b) => {
        if (a.isEmergencyDepartment && !b.isEmergencyDepartment) return -1;
        if (!a.isEmergencyDepartment && b.isEmergencyDepartment) return 1;
        return a.name.localeCompare(b.name);
      });
      return list;
    }
  },

  async getDepartmentDirectoryById(id: string): Promise<any | null> {
    if (isUsingMongo) {
      if (!mongoose.Types.ObjectId.isValid(id)) return null;
      const doc = await DepartmentDirectoryModel.findById(id);
      return doc ? serializeDoc(doc) : null;
    } else {
      const found = (localDb.department_directories || []).find(d => String(d._id) === String(id) || String(d.id) === String(id));
      return found ? { ...found } : null;
    }
  },

  async getDepartmentDirectoryByName(name: string): Promise<any | null> {
    if (isUsingMongo) {
      const doc = await DepartmentDirectoryModel.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
      return doc ? serializeDoc(doc) : null;
    } else {
      const found = (localDb.department_directories || []).find(d => d.name.toLowerCase() === name.toLowerCase());
      return found ? { ...found } : null;
    }
  },

  async getDepartmentDirectoryByHelpline(phone: string): Promise<any | null> {
    if (isUsingMongo) {
      const doc = await DepartmentDirectoryModel.findOne({
        $or: [
          { primaryHelpline: phone },
          { escalationHelpline: phone }
        ]
      });
      return doc ? serializeDoc(doc) : null;
    } else {
      const found = (localDb.department_directories || []).find(d => d.primaryHelpline === phone || d.escalationHelpline === phone);
      return found ? { ...found } : null;
    }
  },

  async createDepartmentDirectory(data: any): Promise<any> {
    if (isUsingMongo) {
      const doc = new DepartmentDirectoryModel(data);
      await doc.save();
      return serializeDoc(doc);
    } else {
      const id = 'dir_' + Math.random().toString(36).substring(2, 11);
      const now = new Date().toISOString();
      const newDoc = {
        _id: id,
        id,
        ...data,
        createdAt: now,
        updatedAt: now
      };
      if (!localDb.department_directories) localDb.department_directories = [];
      localDb.department_directories.push(newDoc);
      saveLocalDb();
      return { ...newDoc };
    }
  },

  async updateDepartmentDirectory(id: string, data: any): Promise<any | null> {
    if (isUsingMongo) {
      if (!mongoose.Types.ObjectId.isValid(id)) return null;
      const doc = await DepartmentDirectoryModel.findByIdAndUpdate(id, { $set: data }, { new: true });
      return doc ? serializeDoc(doc) : null;
    } else {
      const list = localDb.department_directories || [];
      const idx = list.findIndex(d => String(d._id) === String(id) || String(d.id) === String(id));
      if (idx === -1) return null;
      const updated = {
        ...list[idx],
        ...data,
        updatedAt: new Date().toISOString()
      };
      list[idx] = updated;
      saveLocalDb();
      return { ...updated };
    }
  },

  async getPendingCitizens(): Promise<any[]> {
    if (isUsingMongo) {
      const docs = await UserModel.find({ role: 'CITIZEN', registrationStatus: 'PENDING_ADMIN_REVIEW' });
      const list = docs.map(d => serializeDoc(d));
      const populated = [];
      for (const u of list) {
        const profile = await this.getCitizenProfile(u.id);
        populated.push({ ...u, profile });
      }
      return populated;
    } else {
      const list = localDb.users.filter((u: any) => u.role === 'CITIZEN' && u.registrationStatus === 'PENDING_ADMIN_REVIEW');
      return list.map((u: any) => {
        const profile = localDb.citizen_profiles.find((cp: any) => cp.userId === u.id);
        return { ...u, profile };
      });
    }
  },

  async updateCitizenReviewStatus(userId: string, data: any): Promise<any | null> {
    if (isUsingMongo) {
      if (!mongoose.Types.ObjectId.isValid(userId)) return null;
      const doc = await UserModel.findByIdAndUpdate(userId, { $set: data }, { new: true });
      return doc ? serializeDoc(doc) : null;
    } else {
      const idx = localDb.users.findIndex((u: any) => String(u._id) === String(userId) || String(u.id) === String(userId));
      if (idx === -1) return null;
      const updated = {
        ...localDb.users[idx],
        ...data,
        updatedAt: new Date().toISOString()
      };
      localDb.users[idx] = updated;
      saveLocalDb();
      return { ...updated };
    }
  },

  async getCitizenReviewDetails(userId: string): Promise<any | null> {
    if (isUsingMongo) {
      if (!mongoose.Types.ObjectId.isValid(userId)) return null;
      const doc = await UserModel.findById(userId);
      if (!doc) return null;
      const user = serializeDoc(doc);
      const profile = await this.getCitizenProfile(user.id);
      return { ...user, profile };
    } else {
      const found = localDb.users.find((u: any) => String(u._id) === String(userId) || String(u.id) === String(userId));
      if (!found) return null;
      const profile = localDb.citizen_profiles.find((cp: any) => cp.userId === found.id);
      return { ...found, profile };
    }
  }
};
