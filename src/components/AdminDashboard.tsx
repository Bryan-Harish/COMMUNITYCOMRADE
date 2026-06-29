import React, { useState, useEffect } from 'react';
import { Shield, Users, Landmark, UserX, UserCheck, AlertOctagon, Check, X, FileText, Search, RefreshCw, AlertCircle } from 'lucide-react';
import { getAuthHeaders } from '../utils/auth.js';
import IssuesList from './issues/IssuesList.js';
import IssueDetails from './issues/IssueDetails.js';
import AnalyticsDashboard from './analytics/AnalyticsDashboard.js';
import AdminQuizManager from './gamification/AdminQuizManager.js';
import DepartmentDirectoryPage from './DepartmentDirectoryPage.js';
import AdminDepartmentManagementPage from './AdminDepartmentManagementPage.js';

interface AdminDashboardProps {
  onNavigate: (path: string) => void;
  user: any;
  onLogout: () => void;
  subPath?: 'dashboard' | 'users' | 'approvals' | 'issues' | 'details' | 'manual-review' | 'analytics' | 'helplines' | 'admin-helplines';
  issueId?: string;
}

export default function AdminDashboard({
  onNavigate,
  user,
  onLogout,
  subPath,
  issueId
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'approvals' | 'issues' | 'details' | 'manual-review' | 'analytics' | 'quizzes' | 'helplines' | 'admin-helplines'>(
    (subPath as any) || 'dashboard'
  );
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(issueId || null);
  
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [pendingOfficers, setPendingOfficers] = useState<any[]>([]);
  const [pendingCitizens, setPendingCitizens] = useState<any[]>([]);
  const [approvalSubTab, setApprovalSubTab] = useState<'officers' | 'citizens'>('officers');
  const [selectedRejectionReason, setSelectedRejectionReason] = useState<{[key: string]: string}>({});
  const [customRejectionReasons, setCustomRejectionReasons] = useState<{[key: string]: string}>({});
  const [rejectionTargetId, setRejectionTargetId] = useState<string | null>(null);
  const [manualReviewIssues, setManualReviewIssues] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (subPath) {
      setActiveTab(subPath as any);
    }
    if (issueId) {
      setSelectedIssueId(issueId);
    }
  }, [subPath, issueId]);

  // Load Admin Data (all users and pending list)
  const fetchAdminData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      // 1. Fetch pending officers
      const pendingRes = await fetch('/api/admin/officers/pending', {
        headers: getAuthHeaders()
      });
      const pendingData = await pendingRes.json();
      if (pendingRes.ok && pendingData.success) {
        setPendingOfficers(pendingData.data);
      }

      // 1.5. Fetch pending citizens
      const citizensRes = await fetch('/api/admin/citizens/pending', {
        headers: getAuthHeaders()
      });
      const citizensData = await citizensRes.json();
      if (citizensRes.ok && citizensData.success) {
        setPendingCitizens(citizensData.data);
      }

      // 2. Fetch all users registry
      const usersRes = await fetch('/api/admin/users', {
        headers: getAuthHeaders()
      });
      const usersData = await usersRes.json();
      if (usersRes.ok && usersData.success) {
        setAllUsers(usersData.data);
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to sync administrative roster database.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchManualReviewIssues = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/admin/issues/manual-review', {
        headers: getAuthHeaders()
      });
      const resData = await res.json();
      if (res.ok && resData.success) {
        setManualReviewIssues(resData.data);
      } else {
        throw new Error(resData.error?.message || 'Failed to fetch manual review issues.');
      }
    } catch (err: any) {
      console.error('Error fetching manual reviews:', err);
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setErrorMsg(null);
    setSuccessMsg(null);
    if (activeTab === 'manual-review') {
      fetchManualReviewIssues();
    } else {
      fetchAdminData();
    }
  }, [activeTab]);

  // Handle citizen reviews (Approve / Reject)
  const handleCitizenReview = async (userId: string, decision: 'APPROVE' | 'REJECT', reason?: string) => {
    setActionLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const response = await fetch(`/api/admin/citizens/${userId}/${decision.toLowerCase()}`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: decision === 'REJECT' ? JSON.stringify({ rejectionReason: reason }) : undefined
      });

      const resData = await response.json();
      if (!response.ok || !resData.success) {
        throw new Error(resData.error?.message || `Failed to ${decision.toLowerCase()} citizen registration.`);
      }

      setSuccessMsg(`Citizen registration successfully ${decision === 'APPROVE' ? 'Approved' : 'Rejected'}.`);
      fetchAdminData();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'An error occurred during citizen review.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Issue Manual Review (APPROVE / REJECT)
  const handleIssueReview = async (issueNumber: string, decision: 'APPROVE' | 'REJECT') => {
    setActionLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const notesElement = document.getElementById(`issue-review-notes-${issueNumber}`) as HTMLTextAreaElement | null;
      const notes = notesElement ? notesElement.value : '';

      if (decision === 'REJECT' && !notes.trim()) {
        throw new Error('A rejection reason is required to reject an issue.');
      }

      const response = await fetch(`/api/admin/issues/${issueNumber}/review`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ decision, reason: notes })
      });

      const resData = await response.json();
      if (!response.ok || !resData.success) {
        throw new Error(resData.error?.message || 'Failed to submit issue review.');
      }

      if (notesElement) {
        notesElement.value = '';
      }
      setSuccessMsg(`Issue ${decision === 'APPROVE' ? 'Approved' : 'Rejected'} successfully.`);
      fetchManualReviewIssues();
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during issue review.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle officer actions (Approve / Reject)
  const handleOfficerReview = async (officerUserId: string, action: 'APPROVE' | 'REJECT') => {
    setActionLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    const endpoint = action === 'APPROVE' ? '/api/admin/officers/approve' : '/api/admin/officers/reject';
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ officerUserId, notes: reviewNotes })
      });

      const resData = await response.json();
      if (!response.ok || !resData.success) {
        throw new Error(resData.error?.message || 'Failed to record officer evaluation review.');
      }

      setReviewNotes('');
      setSuccessMsg(`Officer ${action === 'APPROVE' ? 'Approved' : 'Rejected'} successfully.`);
      fetchAdminData();
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during evaluation.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle user suspension (Suspend / Reinstate)
  const handleUserStatusChange = async (targetUserId: string, action: 'SUSPEND' | 'REINSTATE') => {
    setActionLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    const endpoint = action === 'SUSPEND' ? '/api/admin/users/suspend' : '/api/admin/users/reinstate';
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ targetUserId })
      });

      const resData = await response.json();
      if (!response.ok || !resData.success) {
        throw new Error(resData.error?.message || 'Failed to update user security status.');
      }

      setSuccessMsg(`Account status set to ${action === 'SUSPEND' ? 'SUSPENDED' : 'ACTIVE'} successfully.`);
      fetchAdminData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to change user status.');
    } finally {
      setActionLoading(false);
    }
  };

  // Filter user registry list based on search
  const filteredUsers = allUsers.filter(u => {
    const fullName = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
    const email = (u.email || '').toLowerCase();
    const role = (u.role || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    return fullName.includes(query) || email.includes(query) || role.includes(query);
  });

  // Calculate high level stats
  const totalCitizens = allUsers.filter(u => u.role === 'CITIZEN').length;
  const totalOfficers = allUsers.filter(u => u.role === 'DEPARTMENT_OFFICER').length;
  const activeOfficersCount = allUsers.filter(u => u.role === 'DEPARTMENT_OFFICER' && u.status === 'ACTIVE_OFFICER').length;
  const suspendedCount = allUsers.filter(u => u.status === 'SUSPENDED').length;

  return (
    <div className="bg-slate-50 min-h-screen font-sans text-slate-800">
      
      {/* Navigation Rail */}
      <nav className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center border-b border-slate-800 shadow-md">
        <div className="flex items-center gap-3">
          <div className="bg-teal-500 text-slate-950 font-bold p-1.5 rounded-lg text-sm">CC</div>
          <span className="font-sans font-bold tracking-tight">CommunityComrade Admin Portal</span>
          <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 rounded-full px-2 py-0.5 font-mono font-bold">
            MASTER ADMIN
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              setActiveTab('dashboard');
              onNavigate('/portal/admin/dashboard');
            }}
            className={`text-sm font-semibold transition-colors cursor-pointer ${activeTab === 'dashboard' ? 'text-teal-400' : 'text-slate-400 hover:text-white'}`}
          >
            Dashboard
          </button>
          <button
            id="admin-issues-tab"
            onClick={() => {
              setActiveTab('issues');
              onNavigate('/portal/admin/issues');
            }}
            className={`text-sm font-semibold transition-colors cursor-pointer ${activeTab === 'issues' || activeTab === 'details' ? 'text-teal-400' : 'text-slate-400 hover:text-white'}`}
          >
            All Complaints
          </button>
          <button
            onClick={() => {
              setActiveTab('users');
              onNavigate('/portal/admin/users');
            }}
            className={`text-sm font-semibold transition-colors cursor-pointer ${activeTab === 'users' ? 'text-teal-400' : 'text-slate-400 hover:text-white'}`}
          >
            User Registry
          </button>
          <button
            onClick={() => {
              setActiveTab('approvals');
              onNavigate('/portal/admin/approvals');
            }}
            className={`text-sm font-semibold transition-colors relative cursor-pointer ${activeTab === 'approvals' ? 'text-teal-400' : 'text-slate-400 hover:text-white'}`}
          >
            Approvals
            {(pendingOfficers.length + pendingCitizens.length) > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-amber-500 text-slate-950 font-bold font-mono rounded-full text-[9px] w-4 h-4 flex items-center justify-center">
                {pendingOfficers.length + pendingCitizens.length}
              </span>
            )}
          </button>
          <button
            id="admin-manual-review-tab"
            onClick={() => {
              setActiveTab('manual-review');
              onNavigate('/portal/admin/manual-review');
            }}
            className={`text-sm font-semibold transition-colors relative cursor-pointer ${activeTab === 'manual-review' ? 'text-teal-400' : 'text-slate-400 hover:text-white'}`}
          >
            Manual Review
            {manualReviewIssues.length > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-rose-500 text-white font-bold font-mono rounded-full text-[9px] w-4.5 h-4.5 flex items-center justify-center">
                {manualReviewIssues.length}
              </span>
            )}
          </button>
          <button
            id="admin-analytics-tab"
            onClick={() => {
              setActiveTab('analytics');
              onNavigate('/portal/admin/analytics');
            }}
            className={`text-sm font-semibold transition-colors relative cursor-pointer ${activeTab === 'analytics' ? 'text-teal-400' : 'text-slate-400 hover:text-white'}`}
          >
            Analytics Hub
          </button>
          <button
            onClick={() => {
              setActiveTab('quizzes');
              onNavigate('/portal/admin/quizzes');
            }}
            className={`text-sm font-semibold transition-colors cursor-pointer ${activeTab === 'quizzes' ? 'text-teal-400' : 'text-slate-400 hover:text-white'}`}
          >
            Quizzes
          </button>
          <button
            id="admin-helpline-tab"
            onClick={() => {
              setActiveTab('helplines');
              onNavigate('/portal/admin/helplines');
            }}
            className={`text-sm font-semibold transition-colors cursor-pointer ${activeTab === 'helplines' || activeTab === 'admin-helplines' ? 'text-teal-400' : 'text-slate-400 hover:text-white'}`}
          >
            Helpline Directory
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
        
        {errorMsg && (
          <div className="mb-6 p-4 bg-rose-50 border-l-4 border-rose-500 text-rose-800 text-sm flex items-start gap-2.5 rounded-r-lg">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
            <div>
              <p className="font-semibold">Security Operation Failure</p>
              <p className="text-rose-600 mt-0.5">{errorMsg}</p>
            </div>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 text-sm flex items-start gap-2.5 rounded-r-lg">
            <Check className="w-5 h-5 text-emerald-500 shrink-0" />
            <div>
              <p className="font-semibold">Operation Successful</p>
              <p className="text-emerald-600 mt-0.5">{successMsg}</p>
            </div>
          </div>
        )}

        {/* Tab 1: Administrative Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div>
                <h2 className="text-xl font-bold text-slate-900 font-sans">Global Platform Analytics</h2>
                <p className="text-xs text-slate-500 mt-0.5">CommunityComrade Identity and Role management overview</p>
              </div>
              <button
                onClick={fetchAdminData}
                disabled={isLoading}
                className="p-2 border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Metrics cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Registered Citizens</span>
                  <Users className="w-5 h-5 text-teal-600" />
                </div>
                <div className="text-3xl font-bold text-slate-900 font-mono">{totalCitizens}</div>
                <div className="text-[10px] text-slate-400 font-mono mt-1">Verified / Community Verified</div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Department Officers</span>
                  <Landmark className="w-5 h-5 text-amber-600" />
                </div>
                <div className="text-3xl font-bold text-slate-900 font-mono">{totalOfficers}</div>
                <div className="text-[10px] text-slate-400 font-mono mt-1">{activeOfficersCount} Active Roster Limits</div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Officers</span>
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-3xl font-bold text-slate-900 font-mono text-amber-600">{pendingOfficers.length}</div>
                <div className="text-[10px] text-slate-400 font-mono mt-1">Awaiting Credentials Check</div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Suspended Profiles</span>
                  <AlertOctagon className="w-5 h-5 text-rose-600" />
                </div>
                <div className="text-3xl font-bold text-slate-900 font-mono text-rose-600">{suspendedCount}</div>
                <div className="text-[10px] text-slate-400 font-mono mt-1">Violation Containments</div>
              </div>
            </div>

            {/* Quick Audit / Telemetry panel */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-900 font-sans mb-4">System Configuration Parameters</h3>
              <div className="grid md:grid-cols-2 gap-6 text-sm">
                <div className="bg-slate-50 p-4 rounded-xl border space-y-2">
                  <p className="font-semibold text-slate-700">🔐 Cryptographic Storage Policies:</p>
                  <ul className="text-xs text-slate-500 list-disc list-inside space-y-1 font-mono">
                    <li>Passwords hashed with dynamic Salt / standard BCrypt.</li>
                    <li>Government ID number indexing protected via masking.</li>
                    <li>Internal API requests guarded by signature-validated JWT tokens.</li>
                  </ul>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border space-y-2">
                  <p className="font-semibold text-slate-700">📡 Database Cluster Isolation:</p>
                  <p className="text-xs text-slate-500 leading-relaxed font-mono">
                    Current active driver connection is operating under: <span className="font-bold text-teal-600 bg-teal-50 px-1 border rounded">{allUsers.length > 0 ? 'LIVE SCHEMAS' : 'SEEDED'}</span>. Data mutations are processed inside transaction scopes.
                  </p>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* Tab 2: User Registry */}
        {activeTab === 'users' && (
          <div className="space-y-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            
            {/* Search filter */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-slate-900 font-sans text-lg">Platform User Directory</h3>
                <p className="text-xs text-slate-500 mt-0.5">Control, suspend, or reinstate citizen and officer credentials</p>
              </div>

              <div className="relative w-full max-w-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  id="admin-search-input"
                  type="text"
                  placeholder="Search by name, email, or role..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none text-slate-800"
                />
              </div>
            </div>

            {/* Users list table */}
            <div className="overflow-x-auto border border-slate-100 rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="p-4">User Name</th>
                    <th className="p-4">Roster Role</th>
                    <th className="p-4">Ward / Local Range</th>
                    <th className="p-4">Credential Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400 font-semibold">
                        No registered users match your search query.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const isSuspended = u.status === 'SUSPENDED';
                      return (
                        <tr key={u.id} className="hover:bg-slate-50/50">
                          <td className="p-4">
                            <div className="font-semibold text-slate-800">{u.firstName} {u.lastName}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{u.email}</div>
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                              u.role === 'CITIZEN' ? 'bg-teal-50 text-teal-700' : u.role === 'ADMIN' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                            }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="p-4 font-mono text-slate-500">
                            {u.registeredWard || 'HQ'}, {u.registeredDistrict || 'HQ'}
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              isSuspended
                                ? 'bg-red-50 text-red-700'
                                : u.status.includes('ACTIVE') || u.status.includes('VERIFIED')
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-amber-50 text-amber-700'
                            }`}>
                              {u.status}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            {u.role !== 'ADMIN' && (
                              isSuspended ? (
                                <button
                                  id={`reinstate-btn-${u.id}`}
                                  onClick={() => handleUserStatusChange(u.id, 'REINSTATE')}
                                  disabled={actionLoading}
                                  className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ml-auto"
                                >
                                  <UserCheck className="w-3.5 h-3.5" />
                                  Reinstate
                                </button>
                              ) : (
                                <button
                                  id={`suspend-btn-${u.id}`}
                                  onClick={() => handleUserStatusChange(u.id, 'SUSPEND')}
                                  disabled={actionLoading}
                                  className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ml-auto"
                                >
                                  <UserX className="w-3.5 h-3.5" />
                                  Suspend User
                                </button>
                              )
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* Tab 3: Officer & Citizen Approvals */}
        {activeTab === 'approvals' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Sub-tabs toggle */}
            <div className="flex gap-4 border-b border-slate-200 pb-2">
              <button
                onClick={() => setApprovalSubTab('officers')}
                className={`text-sm font-semibold pb-2 border-b-2 transition-all cursor-pointer ${approvalSubTab === 'officers' ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
              >
                Officer Applications ({pendingOfficers.length})
              </button>
              <button
                onClick={() => setApprovalSubTab('citizens')}
                className={`text-sm font-semibold pb-2 border-b-2 transition-all cursor-pointer ${approvalSubTab === 'citizens' ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
              >
                Citizen Applications ({pendingCitizens.length})
              </button>
            </div>

            {approvalSubTab === 'officers' ? (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="font-bold text-slate-900 font-sans text-lg">Awaiting Officer Registration Reviews</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Evaluate departmental employee credentials and area assignments before authorizing active system status</p>
                </div>

                {pendingOfficers.length === 0 ? (
                  <div className="bg-white py-16 rounded-2xl border border-slate-200 shadow-sm text-center">
                    <UserCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="font-bold text-slate-600 font-sans">All Applications Evaluated</p>
                    <p className="text-xs text-slate-400 mt-0.5">There are currently no pending officer profiles awaiting administrative review.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {pendingOfficers.map((officer) => (
                      <div key={officer.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden grid md:grid-cols-3 gap-6">
                        
                        {/* Left Panel: Profile Credentials */}
                        <div className="p-6 md:col-span-1 border-r border-slate-100 space-y-4">
                          <div>
                            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Officer Name</span>
                            <p className="text-sm font-bold text-slate-800">{officer.firstName} {officer.lastName}</p>
                            <p className="text-xs text-slate-400 font-mono mt-0.5">{officer.email}</p>
                          </div>
                          <div>
                            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Department Name</span>
                            <p className="text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 inline-block">
                              {officer.profile?.departmentName || 'ROADS'}
                            </p>
                          </div>
                          <div>
                            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Employee ID</span>
                            <p className="text-xs font-semibold text-slate-700 font-mono">{officer.profile?.employeeId || 'EMP-1234'}</p>
                          </div>
                          <div>
                            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Assigned Ward Limits</span>
                            <p className="text-xs text-slate-600 font-mono leading-normal">
                              Ward: {officer.profile?.assignedWard || officer.registeredWard} <br />
                              District: {officer.profile?.assignedDistrict || officer.registeredDistrict}
                            </p>
                          </div>
                        </div>

                        {/* Middle Panel: Uploaded Credential ID image */}
                        <div className="p-6 md:col-span-1 flex flex-col justify-between border-r border-slate-100">
                          <div>
                            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Uploaded Department ID Card Image</span>
                            <div className="w-full h-36 border border-slate-200 rounded-xl overflow-hidden bg-slate-50 relative shadow-inner">
                              {officer.profile?.departmentIdCardImageUrl ? (
                                <img src={officer.profile.departmentIdCardImageUrl} alt="Officer Credentials Card" className="w-full h-full object-cover" />
                              ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-slate-300 font-mono text-xs">
                                  ID Preview Not Found
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right Panel: Decision Console */}
                        <div className="p-6 md:col-span-1 bg-slate-50/50 flex flex-col justify-between">
                          <div className="space-y-3">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              Evaluation Review Notes
                            </label>
                            <textarea
                              id={`review-notes-${officer.id}`}
                              placeholder="Provide audit justification details here..."
                              value={reviewNotes}
                              onChange={(e) => setReviewNotes(e.target.value)}
                              className="block w-full p-3 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none text-slate-800"
                              rows={3}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3 mt-4">
                            <button
                              id={`approve-officer-btn-${officer.id}`}
                              onClick={() => handleOfficerReview(officer.id, 'APPROVE')}
                              disabled={actionLoading}
                              className="py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/10 transition-colors"
                            >
                              <Check className="w-4 h-4" />
                              Approve Officer
                            </button>
                            <button
                              id={`reject-officer-btn-${officer.id}`}
                              onClick={() => handleOfficerReview(officer.id, 'REJECT')}
                              disabled={actionLoading}
                              className="py-2.5 bg-red-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                            >
                              <X className="w-4 h-4" />
                              Reject Application
                            </button>
                          </div>
                        </div>

                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Citizen Applications Analytics Bar */}
                <div className="grid grid-cols-3 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-inner">
                  <div className="bg-white p-4 rounded-xl border border-slate-200 text-center shadow-sm">
                    <p className="text-[10px] font-mono font-bold text-slate-400 uppercase">Pending Applications</p>
                    <p className="text-2xl font-bold text-amber-500 mt-1">{pendingCitizens.length}</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200 text-center shadow-sm">
                    <p className="text-[10px] font-mono font-bold text-slate-400 uppercase">Approved Citizens</p>
                    <p className="text-2xl font-bold text-emerald-500 mt-1 font-sans">
                      {allUsers.filter(u => u.role === 'CITIZEN' && (u.registrationStatus === 'APPROVED' || u.isVerifiedCitizen === true)).length}
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200 text-center shadow-sm">
                    <p className="text-[10px] font-mono font-bold text-slate-400 uppercase">Rejected Applications</p>
                    <p className="text-2xl font-bold text-rose-500 mt-1 font-sans">
                      {allUsers.filter(u => u.role === 'CITIZEN' && u.registrationStatus === 'REJECTED').length}
                    </p>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="font-bold text-slate-900 font-sans text-lg">Awaiting Citizen Registration Reviews</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Evaluate government credentials, uploaded proof documents, and registered location limits before authorizing verified system credentials</p>
                </div>

                {pendingCitizens.length === 0 ? (
                  <div className="bg-white py-16 rounded-2xl border border-slate-200 shadow-sm text-center">
                    <UserCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="font-bold text-slate-600 font-sans">No Pending Citizen Reviews</p>
                    <p className="text-xs text-slate-400 mt-0.5">There are currently no new citizen registrations awaiting administrative review.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {pendingCitizens.map((citizen) => (
                      <div key={citizen.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden grid md:grid-cols-3 gap-6">
                        {/* Left Panel: Citizen Information */}
                        <div className="p-6 md:col-span-1 border-r border-slate-100 space-y-4">
                          <div>
                            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Applicant Name</span>
                            <p className="text-sm font-bold text-slate-800">{citizen.firstName} {citizen.lastName}</p>
                            <p className="text-xs text-slate-400 font-mono mt-0.5">{citizen.email}</p>
                            <p className="text-xs text-slate-500 font-mono mt-0.5">{citizen.phoneNumber}</p>
                          </div>
                          <div>
                            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Registered Location Details</span>
                            <p className="text-xs text-slate-600 font-mono leading-normal">
                              Ward: {citizen.registeredWard} <br />
                              Area: {citizen.registeredAreaName} <br />
                              District: {citizen.registeredDistrict} <br />
                              State: {citizen.registeredState} <br />
                              Coordinates: {citizen.latitude?.toFixed(4)}, {citizen.longitude?.toFixed(4)}
                            </p>
                          </div>
                          <div>
                            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Registration Timestamp</span>
                            <p className="text-xs text-slate-600 font-mono">{citizen.createdAt ? new Date(citizen.createdAt).toLocaleString() : 'N/A'}</p>
                          </div>
                          <div>
                            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Registration Status</span>
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full uppercase">
                              {citizen.registrationStatus || 'PENDING_REVIEW'}
                            </span>
                          </div>
                        </div>

                        {/* Middle Panel: Uploaded Government ID and details */}
                        <div className="p-6 md:col-span-1 border-r border-slate-100 flex flex-col justify-between">
                          <div className="space-y-4">
                            <div>
                              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Government ID Details</span>
                              <p className="text-xs font-bold text-slate-700">
                                {citizen.profile?.governmentIdType || 'Aadhaar'}: <span className="font-mono text-xs font-semibold text-teal-600 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded ml-1">{citizen.profile?.governmentIdNumber}</span>
                              </p>
                            </div>
                            <div>
                              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Uploaded Government ID Proof</span>
                              <div className="w-full h-36 border border-slate-200 rounded-xl overflow-hidden bg-slate-50 relative shadow-inner">
                                {citizen.profile?.governmentIdImageUrl ? (
                                  <img src={citizen.profile.governmentIdImageUrl} alt="Government ID Proof" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="absolute inset-0 flex items-center justify-center text-slate-300 font-mono text-xs">
                                    ID Preview Not Found
                                  </div>
                                )}
                              </div>
                              {citizen.profile?.governmentIdImageUrl && (
                                <a
                                  href={citizen.profile.governmentIdImageUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] text-teal-600 hover:text-teal-700 font-bold font-mono mt-1.5 flex items-center gap-1 cursor-pointer"
                                >
                                  View Uploaded ID Proof (New Tab)
                                </a>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right Panel: Decision Console */}
                        <div className="p-6 md:col-span-1 bg-slate-50/50 flex flex-col justify-between">
                          {rejectionTargetId === citizen.id ? (
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                  Select Rejection Reason
                                </label>
                                <select
                                  value={selectedRejectionReason[citizen.id] || 'Invalid Government ID'}
                                  onChange={(e) => setSelectedRejectionReason({ ...selectedRejectionReason, [citizen.id]: e.target.value })}
                                  className="block w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none text-slate-800"
                                >
                                  <option value="Invalid Government ID">Invalid Government ID</option>
                                  <option value="Unreadable ID Proof">Unreadable ID Proof</option>
                                  <option value="Incomplete Information">Incomplete Information</option>
                                  <option value="Location Verification Failed">Location Verification Failed</option>
                                  <option value="Other">Other</option>
                                </select>
                              </div>

                              {(selectedRejectionReason[citizen.id] || 'Invalid Government ID') === 'Other' && (
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                    Describe Custom Reason
                                  </label>
                                  <textarea
                                    value={customRejectionReasons[citizen.id] || ''}
                                    onChange={(e) => setCustomRejectionReasons({ ...customRejectionReasons, [citizen.id]: e.target.value })}
                                    placeholder="Enter specific audit notes..."
                                    className="block w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none text-slate-800"
                                    rows={2}
                                  />
                                </div>
                              )}

                              <div className="flex gap-2">
                                <button
                                  disabled={actionLoading}
                                  onClick={() => {
                                    const reason = selectedRejectionReason[citizen.id] || 'Invalid Government ID';
                                    const finalReason = reason === 'Other' ? (customRejectionReasons[citizen.id] || 'Other') : reason;
                                    handleCitizenReview(citizen.id, 'REJECT', finalReason);
                                  }}
                                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs cursor-pointer transition-colors text-center"
                                >
                                  Confirm Reject
                                </button>
                                <button
                                  disabled={actionLoading}
                                  onClick={() => setRejectionTargetId(null)}
                                  className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition-colors text-center"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col justify-center h-full space-y-4">
                              <p className="text-xs text-slate-500 text-center leading-relaxed">
                                Review government identification credentials thoroughly before making an administrative system authorization decision.
                              </p>
                              <div className="grid grid-cols-2 gap-3">
                                <button
                                  onClick={() => handleCitizenReview(citizen.id, 'APPROVE')}
                                  disabled={actionLoading}
                                  className="py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/10 transition-colors"
                                >
                                  <Check className="w-4 h-4" />
                                  Approve
                                </button>
                                <button
                                  onClick={() => {
                                    setRejectionTargetId(citizen.id);
                                    if (!selectedRejectionReason[citizen.id]) {
                                      setSelectedRejectionReason({ ...selectedRejectionReason, [citizen.id]: 'Invalid Government ID' });
                                    }
                                  }}
                                  disabled={actionLoading}
                                  className="py-2.5 bg-red-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                                >
                                  <X className="w-4 h-4" />
                                  Reject
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        )}

        {/* Tab 5: Manual Review Queue */}
        {activeTab === 'manual-review' && (
          <div className="space-y-6">
            
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-900 font-sans text-lg">Awaiting Manual Property Verification Reviews</h3>
                <p className="text-xs text-slate-500 mt-0.5">Inspect complaints marked by the AI model as potentially located on private property.</p>
              </div>
              <button 
                onClick={fetchManualReviewIssues} 
                className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 transition-colors cursor-pointer"
                title="Refresh Queue"
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {isLoading ? (
              <div className="bg-white py-16 rounded-2xl border border-slate-200 shadow-sm text-center">
                <RefreshCw className="w-8 h-8 text-slate-400 animate-spin mx-auto mb-3" />
                <p className="text-xs text-slate-500 font-mono">Syncing manual review records...</p>
              </div>
            ) : manualReviewIssues.length === 0 ? (
              <div className="bg-white py-16 rounded-2xl border border-slate-200 shadow-sm text-center">
                <Landmark className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="font-bold text-slate-600 font-sans">Queue Empty</p>
                <p className="text-xs text-slate-400 mt-0.5">There are currently no issues awaiting private/public property verification reviews.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {manualReviewIssues.map((issue) => (
                  <div key={issue.issueNumber} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden grid md:grid-cols-3 gap-6">
                    
                    {/* Left Panel: Issue Details & AI Flag Metrics */}
                    <div className="p-6 md:col-span-1 border-r border-slate-100 space-y-4">
                      <div>
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Issue Number / Title</span>
                        <p className="text-xs font-mono font-bold text-slate-900 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 inline-block mb-1.5">{issue.issueNumber}</p>
                        <p className="text-sm font-bold text-slate-800 leading-snug">{issue.title}</p>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-3">{issue.description}</p>
                      </div>

                      <div className="pt-2 border-t border-slate-100">
                        <span className="block text-[10px] font-bold text-rose-500 uppercase tracking-wider mb-1">AI PROPERTY CLASSIFICATION</span>
                        <div className="bg-rose-50/50 p-2.5 rounded-xl border border-rose-100 space-y-1.5">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-slate-500">Public Property:</span>
                            <span className="font-bold text-rose-700">{issue.isPublicProperty === false ? 'FALSE (Private)' : 'TRUE'}</span>
                          </div>
                          <div className="flex justify-between text-[11px]">
                            <span className="text-slate-500">AI Confidence:</span>
                            <span className="font-bold text-rose-700">{Math.round((issue.publicPropertyConfidence || 0) * 100)}%</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Address & Coordinates</span>
                        <p className="text-xs text-slate-600 leading-normal font-sans">
                          {issue.address} <br />
                          <span className="font-mono text-[10px] text-slate-400">({issue.location?.coordinates?.[1]?.toFixed(5)}, {issue.location?.coordinates?.[0]?.toFixed(5)})</span>
                        </p>
                      </div>
                    </div>

                    {/* Middle Panel: Uploaded Evidence Image */}
                    <div className="p-6 md:col-span-1 flex flex-col justify-between">
                      <div>
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Complaint Evidence Media</span>
                        <div className="w-full h-40 border border-slate-200 rounded-xl overflow-hidden bg-slate-50 relative shadow-inner">
                          {issue.media && issue.media[0]?.url ? (
                            <img src={issue.media[0].url} alt="Evidence Preview" className="w-full h-full object-cover" />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-slate-300 font-mono text-xs">
                              Evidence Media Not Found
                            </div>
                          )}
                        </div>
                        {issue.media && issue.media.length > 1 && (
                          <p className="text-[10px] text-slate-400 mt-1.5 font-sans font-medium text-center">+{issue.media.length - 1} more attachment(s)</p>
                        )}
                      </div>
                    </div>

                    {/* Right Panel: Review Action Console */}
                    <div className="p-6 md:col-span-1 bg-slate-50/50 flex flex-col justify-between border-l border-slate-100">
                      <div className="space-y-3">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Review / Rejection Reason
                        </label>
                        <textarea
                          id={`issue-review-notes-${issue.issueNumber}`}
                          placeholder="If approving, notes are optional. If rejecting, provide a clear reason for rejection."
                          className="block w-full p-3 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-500/10 focus:border-rose-500 outline-none text-slate-800"
                          rows={4}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3 mt-4">
                        <button
                          onClick={() => handleIssueReview(issue.issueNumber, 'APPROVE')}
                          disabled={actionLoading}
                          className="py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/10 transition-colors"
                        >
                          <Check className="w-4 h-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleIssueReview(issue.issueNumber, 'REJECT')}
                          disabled={actionLoading}
                          className="py-2.5 bg-red-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <X className="w-4 h-4" />
                          Reject
                        </button>
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            )}

          </div>
        )}

        {activeTab === 'analytics' && (
          <AnalyticsDashboard role="ADMIN" user={user} />
        )}

        {activeTab === 'quizzes' && (
          <AdminQuizManager />
        )}

        {activeTab === 'helplines' && (
          <DepartmentDirectoryPage 
            user={user} 
            onNavigate={onNavigate}
            onAdminManageClick={() => setActiveTab('admin-helplines')}
          />
        )}

        {activeTab === 'admin-helplines' && (
          <AdminDepartmentManagementPage 
            user={user} 
            onBack={() => setActiveTab('helplines')}
          />
        )}

        {activeTab === 'issues' && (
          <IssuesList
            role="ADMIN"
            showCreateButton={false}
            onSelectIssue={(num) => {
              setSelectedIssueId(num);
              setActiveTab('details');
              onNavigate(`/portal/admin/issues/${num}`);
            }}
          />
        )}

        {activeTab === 'details' && (
          <IssueDetails
            role="ADMIN"
            issueNumber={selectedIssueId || ''}
            onBack={() => {
              setActiveTab('issues');
              onNavigate('/portal/admin/issues');
            }}
          />
        )}

      </div>
    </div>
  );
}
