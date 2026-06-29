import React, { useState, useEffect } from 'react';
import { User, Shield, Briefcase, MapPin, Award, AlertTriangle, RefreshCw, Landmark, Clock } from 'lucide-react';
import { getAuthHeaders } from '../utils/auth.js';
import IssuesList from './issues/IssuesList.js';
import IssueDetails from './issues/IssueDetails.js';
import AnalyticsDashboard from './analytics/AnalyticsDashboard.js';
import OfficerLeaderboard from './gamification/OfficerLeaderboard.js';
import DepartmentDirectoryPage from './DepartmentDirectoryPage.js';

interface OfficerDashboardProps {
  onNavigate: (path: string) => void;
  user: any;
  onLogout: () => void;
  subPath?: 'dashboard' | 'profile' | 'issues' | 'details' | 'analytics' | 'leaderboard' | 'helplines';
  issueId?: string;
}

export default function OfficerDashboard({
  onNavigate,
  user: initialUser,
  onLogout,
  subPath,
  issueId
}: OfficerDashboardProps) {
  const [user, setUser] = useState(initialUser);
  const [profile, setProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'profile' | 'issues' | 'details' | 'analytics' | 'leaderboard' | 'helplines'>(
    (subPath as any) || 'dashboard'
  );
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(issueId || null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (subPath) {
      setActiveTab(subPath);
    }
    if (issueId) {
      setSelectedIssueId(issueId);
    }
  }, [subPath, issueId]);

  const fetchProfileDetails = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/profile', {
        headers: getAuthHeaders()
      });
      const resData = await response.json();
      if (response.ok && resData.success) {
        setProfile(resData.data.profile);
        setUser(resData.data.user);
      }
    } catch (e) {
      console.error('Failed to load officer profile details', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileDetails();
  }, [activeTab]);

  const isPending = user.status === 'PENDING_OFFICER_APPROVAL';
  const isActive = user.status === 'ACTIVE_OFFICER';
  const isRejected = user.status === 'REJECTED_OFFICER';

  return (
    <div className="bg-slate-50 min-h-screen font-sans text-slate-800">
      
      {/* Navigation Rail */}
      <nav className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center border-b border-slate-800 shadow-md">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500 text-slate-950 font-bold p-1.5 rounded-lg text-sm">CC</div>
          <span className="font-sans font-bold tracking-tight">CommunityComrade Portal</span>
          <span className="text-[10px] bg-amber-500/15 text-amber-400 border border-amber-500/20 rounded-full px-2 py-0.5 font-mono">
            OFFICER ROLE
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              setActiveTab('dashboard');
              onNavigate('/portal/officer/dashboard');
            }}
            className={`text-sm font-semibold transition-colors cursor-pointer ${activeTab === 'dashboard' ? 'text-amber-400' : 'text-slate-400 hover:text-white'}`}
          >
            Dashboard
          </button>
          {isActive && (
            <button
              id="officer-issues-tab"
              onClick={() => {
                setActiveTab('issues');
                onNavigate('/portal/officer/issues');
              }}
              className={`text-sm font-semibold transition-colors cursor-pointer ${activeTab === 'issues' || activeTab === 'details' ? 'text-amber-400' : 'text-slate-400 hover:text-white'}`}
            >
              Complaints Worklist
            </button>
          )}
          <button
            onClick={() => {
              setActiveTab('profile');
              onNavigate('/portal/officer/profile');
            }}
            className={`text-sm font-semibold transition-colors cursor-pointer ${activeTab === 'profile' ? 'text-amber-400' : 'text-slate-400 hover:text-white'}`}
          >
            My Profile
          </button>
          <button
            id="officer-analytics-tab"
            onClick={() => {
              setActiveTab('analytics');
              onNavigate('/portal/officer/analytics');
            }}
            className={`text-sm font-semibold transition-colors cursor-pointer ${activeTab === 'analytics' ? 'text-amber-400' : 'text-slate-400 hover:text-white'}`}
          >
            Analytics Hub
          </button>
          <button
            id="officer-helpline-tab"
            onClick={() => {
              setActiveTab('helplines');
              onNavigate('/portal/officer/helplines');
            }}
            className={`text-sm font-semibold transition-colors cursor-pointer ${activeTab === 'helplines' ? 'text-amber-400' : 'text-slate-400 hover:text-white'}`}
          >
            Helpline Directory
          </button>
          <button
            id="officer-leaderboard-tab"
            onClick={() => {
              setActiveTab('leaderboard');
              onNavigate('/portal/officer/leaderboard');
            }}
            className={`text-sm font-semibold transition-colors cursor-pointer ${activeTab === 'leaderboard' ? 'text-amber-400' : 'text-slate-400 hover:text-white'}`}
          >
            Leaderboards
          </button>
          <button
            onClick={onLogout}
            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono border border-slate-700 px-3 py-1.5 rounded-lg cursor-pointer transition-all"
          >
            Log Out
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-6 md:p-8">
        
        {/* Welcome Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-500/10 text-amber-600 rounded-full flex items-center justify-center border border-amber-500/20 shrink-0">
              <Landmark className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-sans">Welcome, Officer {user.firstName} {user.lastName}!</h2>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Roster Jurisdiction: {user.registeredWard}, {user.registeredDistrict}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono">Status:</span>
            <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${
              isActive
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : isPending
                ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
              {user.status}
            </span>
          </div>
        </div>

        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            
            {/* Condition 1: Pending Officer Approval Notification */}
            {isPending && (
              <div id="pending-officer-alert" className="p-8 bg-gradient-to-r from-amber-500/10 to-amber-500/5 border border-amber-200/80 rounded-2xl shadow-sm flex flex-col md:flex-row items-start gap-5">
                <div className="w-12 h-12 bg-amber-500/15 text-amber-600 rounded-xl flex items-center justify-center border border-amber-500/20 shrink-0">
                  <Clock className="w-6 h-6 animate-pulse" />
                </div>
                <div className="space-y-3">
                  <h3 className="font-bold text-amber-900 text-lg font-sans">Roster Request Under Admin Review</h3>
                  <p className="text-sm text-amber-800 leading-relaxed max-w-3xl">
                    Your account has been successfully registered under status <span className="font-mono bg-amber-500/10 px-1.5 py-0.5 rounded font-semibold text-amber-950">PENDING_OFFICER_APPROVAL</span>. Security protocols require active administrators to review and authorize department affiliations before active case lists unlock.
                  </p>
                  
                  {/* Testing Helper Box */}
                  <div className="bg-amber-950/5 p-4 rounded-xl border border-amber-500/10 max-w-xl text-xs space-y-2">
                    <p className="font-semibold text-amber-950 uppercase tracking-wide">💡 Interactive Testing Instructions:</p>
                    <p className="text-amber-800 leading-normal">
                      1. Log out of this officer account.<br />
                      2. Sign in as <span className="font-semibold">Super Admin</span> (email: <span className="font-semibold">admin@communitycomrade.org</span>, password: <span className="font-semibold">Admin123!</span>).<br />
                      3. Navigate to <span className="font-semibold">"Approvals"</span> tab to approve or reject this specific employee file.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Condition 2: Active Officer Panel */}
            {isActive && (
              <div className="grid md:grid-cols-3 gap-8">
                
                {/* Left: Department details */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                    <Briefcase className="w-5 h-5 text-amber-500" />
                    <h3 className="font-bold text-slate-900 font-sans">My Division</h3>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Affiliated Department</span>
                      <span className="text-sm font-bold text-slate-800 bg-amber-50 text-amber-800 px-2.5 py-1 rounded-lg border border-amber-100 inline-block font-sans">
                        {profile?.departmentName || 'ROADS'} Department
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Employee ID Card</span>
                      <span className="text-sm font-mono text-slate-700">{profile?.employeeId || 'EMP-1234'}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Geographic Bounds</span>
                      <span className="text-xs text-slate-600 font-mono leading-normal block">
                        Ward Limits: {profile?.assignedWard || user.registeredWard} <br />
                        District Limits: {profile?.assignedDistrict || user.registeredDistrict}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right/Middle: Real-time complaints worklist */}
                <div className="md:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="font-bold text-slate-900 font-sans flex items-center gap-2">
                        <Shield className="w-5 h-5 text-amber-500" />
                        Infrastructure Issues Worklist
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">Assigned complaints awaiting resolution in your Ward</p>
                    </div>
                  </div>

                  <IssuesList
                    role="DEPARTMENT_OFFICER"
                    registeredDistrict={profile?.assignedDistrict || user.registeredDistrict}
                    showCreateButton={false}
                    currentUser={user}
                    officerProfile={profile}
                    onSelectIssue={(num) => {
                      setSelectedIssueId(num);
                      setActiveTab('details');
                      onNavigate(`/portal/officer/issues/${num}`);
                    }}
                  />
                </div>

              </div>
            )}

            {/* Condition 3: Rejected */}
            {isRejected && (
              <div className="p-8 bg-rose-50 border border-rose-200 rounded-2xl shadow-sm text-center max-w-xl mx-auto space-y-4">
                <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
                <h3 className="font-bold text-rose-900 text-lg">Officer Application Rejected</h3>
                <p className="text-sm text-rose-800 leading-relaxed">
                  Your registration request has been evaluated and rejected by the administration team. Please reach out to municipal support systems to verify your credential cards or employee identification keys.
                </p>
              </div>
            )}

          </div>
        )}

        {activeTab === 'analytics' && (
          <AnalyticsDashboard role="DEPARTMENT_OFFICER" user={user} />
        )}

        {activeTab === 'profile' && (
          <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-900 text-white p-6 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg font-sans">Officer Profile Roster</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">Official Credentials Registry</p>
              </div>
              <Award className="w-8 h-8 text-amber-400" />
            </div>

            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">First Name</span>
                  <span className="text-sm font-semibold text-slate-800">{user.firstName}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Last Name</span>
                  <span className="text-sm font-semibold text-slate-800">{user.lastName}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Email Address</span>
                  <span className="text-sm font-semibold text-slate-800">{user.email}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Phone Number</span>
                  <span className="text-sm font-semibold text-slate-800 font-mono">{user.phoneNumber}</span>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-6">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Department Verification Files</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Department Assigned</span>
                    <span className="text-xs font-semibold text-slate-800 font-mono">{profile?.departmentName || 'ROADS'}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Employee ID</span>
                    <span className="text-xs font-semibold text-slate-800 font-mono">{profile?.employeeId || 'EMP-1234'}</span>
                  </div>
                  <div className="md:col-span-2">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Department ID Card Image</span>
                    <div className="w-48 h-28 border border-slate-200 rounded-lg overflow-hidden mt-1 bg-white">
                      {profile?.departmentIdCardImageUrl ? (
                        <img src={profile.departmentIdCardImageUrl} alt="Department ID Asset" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs font-mono">
                          Image Not Found
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-6 text-center">
                <p className="text-xs text-slate-400 font-mono">
                  Assigned Ward Jurisdictions: {profile?.assignedWard || user.registeredWard}, {profile?.assignedDistrict || user.registeredDistrict}
                </p>
              </div>

            </div>
          </div>
        )}

        {activeTab === 'issues' && (
          <IssuesList
            role="DEPARTMENT_OFFICER"
            registeredDistrict={profile?.assignedDistrict || user.registeredDistrict}
            showCreateButton={false}
            currentUser={user}
            officerProfile={profile}
            onSelectIssue={(num) => {
              setSelectedIssueId(num);
              setActiveTab('details');
              onNavigate(`/portal/officer/issues/${num}`);
            }}
          />
        )}

        {activeTab === 'details' && (
          <IssueDetails
            role="DEPARTMENT_OFFICER"
            issueNumber={selectedIssueId || ''}
            onBack={() => {
              setActiveTab('issues');
              onNavigate('/portal/officer/issues');
            }}
          />
        )}

        {activeTab === 'leaderboard' && (
          <OfficerLeaderboard />
        )}

        {activeTab === 'helplines' && (
          <DepartmentDirectoryPage user={user} onNavigate={onNavigate} />
        )}

      </div>
    </div>
  );
}
