import React, { useState, useEffect } from 'react';
import { Search, Filter, AlertCircle, PlusCircle, Eye, Tag, Calendar, MapPin, User, ChevronRight, RefreshCw, Video } from 'lucide-react';
import { getAuthHeaders, getSession } from '../../utils/auth.js';

interface IssuesListProps {
  onSelectIssue: (issueNumber: string) => void;
  onCreateClick?: () => void;
  showCreateButton?: boolean;
  role: 'CITIZEN' | 'DEPARTMENT_OFFICER' | 'ADMIN';
  registeredDistrict?: string;
  currentUser?: any;
  officerProfile?: any;
}

export default function IssuesList({
  onSelectIssue,
  onCreateClick,
  showCreateButton = false,
  role,
  registeredDistrict,
  currentUser,
  officerProfile
}: IssuesListProps) {
  const [issues, setIssues] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Filtering & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [citizenToggle, setCitizenToggle] = useState<'LOCAL' | 'MY'>('LOCAL');
  const [officerTab, setOfficerTab] = useState<'ASSIGNED' | 'DEPT_WARD'>('ASSIGNED');

  const fetchIssues = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const endpoint = (role === 'CITIZEN' && citizenToggle === 'MY') 
        ? '/api/issues/my' 
        : '/api/issues';

      const response = await fetch(endpoint, {
        headers: getAuthHeaders()
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setIssues(data.data || []);
      } else {
        throw new Error(data.error?.message || 'Failed to fetch issues.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Unable to load municipal issues. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues();
  }, [role, citizenToggle]);

  // Apply frontend search and filter arrays
  const filteredIssues = issues.filter(issue => {
    // 1. First, check if the logged in officer matches the active tab
    if (role === 'DEPARTMENT_OFFICER') {
      const activeUser = currentUser || getSession().user;
      const currentUserId = activeUser ? (activeUser.id || activeUser._id) : null;
      const isAssignedToMe = issue.assignedOfficerId && String(issue.assignedOfficerId) === String(currentUserId);

      if (officerTab === 'ASSIGNED') {
        if (!isAssignedToMe) return false;
      } else {
        // Tab DEPT_WARD: issues assigned to their department and ward.
        const officerWard = officerProfile?.assignedWard || activeUser?.registeredWard || '';
        const officerDept = officerProfile?.departmentName || activeUser?.registeredDepartment || 'ROADS';
        
        const normalizeDept = (dept: string): string => {
          if (!dept) return '';
          const d = dept.toUpperCase();
          if (d.includes('ROAD') || d.includes('TRAFFIC')) return 'ROADS';
          if (d.includes('WATER') || d.includes('DRAIN') || d.includes('LEAK')) return 'WATER';
          if (d.includes('ELECTR') || d.includes('LIGHT')) return 'ELECTRICAL';
          if (d.includes('SANITAT') || d.includes('GARBAGE') || d.includes('WASTE') || d.includes('CLEAN')) return 'SANITATION';
          if (d.includes('MUNICIP') || d.includes('ADMIN') || d.includes('CORP')) return 'MUNICIPAL';
          return d;
        };

        const matchesWard = (issue.reporterWard || '').toLowerCase() === officerWard.toLowerCase();
        const matchesDept = normalizeDept(issue.department || issue.assignedDepartment) === normalizeDept(officerDept);
        
        if (!matchesWard || !matchesDept) return false;
      }
    }

    const cleanQuery = searchQuery.trim().toLowerCase();
    const matchesSearch = !cleanQuery ||
      issue.title.toLowerCase().includes(cleanQuery) ||
      issue.issueNumber.toLowerCase().includes(cleanQuery) ||
      issue.description.toLowerCase().includes(cleanQuery) ||
      (issue.reporterName && issue.reporterName.toLowerCase().includes(cleanQuery));

    const matchesStatus = statusFilter === 'ALL' || issue.status === statusFilter;
    const matchesPriority = priorityFilter === 'ALL' || issue.priority === priorityFilter;
    const matchesCategory = categoryFilter === 'ALL' || issue.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <span className="bg-sky-50 text-sky-700 border border-sky-200 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase">Open</span>;
      case 'ASSIGNED':
        return <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase text-nowrap">Assigned</span>;
      case 'ACCEPTED':
        return <span className="bg-teal-50 text-teal-700 border border-teal-200 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase text-nowrap">Accepted</span>;
      case 'IN_PROGRESS':
        return <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase text-nowrap">In Progress</span>;
      case 'RESOLUTION_PENDING_VERIFICATION':
        return <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase text-nowrap">Pending Verification</span>;
      case 'COMMUNITY_VERIFIED':
        return <span className="bg-teal-50 text-teal-700 border border-teal-200 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase text-nowrap">Community Verified</span>;
      case 'CLOSED':
        return <span className="bg-slate-100 text-slate-700 border border-slate-300 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase">Closed</span>;
      case 'REJECTED':
        return <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase">Rejected</span>;
      case 'REOPENED':
        return <span className="bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase">Reopened</span>;
      case 'MANUAL_REVIEW':
        return <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase text-nowrap">Review</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase">{status}</span>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return <span className="bg-rose-100 text-rose-850 border border-rose-200 text-[9px] font-bold px-2 py-0.5 rounded font-mono">CRITICAL</span>;
      case 'HIGH':
        return <span className="bg-red-50 text-red-700 border border-red-100 text-[9px] font-bold px-2 py-0.5 rounded font-mono">HIGH</span>;
      case 'MEDIUM':
        return <span className="bg-amber-50 text-amber-700 border border-amber-100 text-[9px] font-bold px-2 py-0.5 rounded font-mono">MEDIUM</span>;
      case 'LOW':
        return <span className="bg-slate-50 text-slate-600 border border-slate-100 text-[9px] font-bold px-2 py-0.5 rounded font-mono">LOW</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 text-[9px] font-bold px-2 py-0.5 rounded font-mono">{priority}</span>;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Search and Filters Strip */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="font-bold text-slate-900 font-sans text-md flex items-center gap-2">
              <Filter className="w-4 h-4 text-teal-600" />
              Civic Complaints Worklist
            </h3>
            <p className="text-xs text-slate-500">
              {role === 'CITIZEN' 
                ? `Filing boundaries: ${citizenToggle === 'LOCAL' ? `District Limits (${registeredDistrict})` : 'My Personal Submissions'}`
                : role === 'DEPARTMENT_OFFICER'
                ? `Infrastructure Worklist: ${officerTab === 'ASSIGNED' ? 'Issues Assigned Directly to Me' : 'All Open & Active Issues in My Ward & Department'}`
                : `Division limits: ${registeredDistrict ? `${registeredDistrict} District` : 'Global Overview'}`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {role === 'CITIZEN' && (
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  onClick={() => setCitizenToggle('LOCAL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${citizenToggle === 'LOCAL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
                >
                  Locality Issues
                </button>
                <button
                  onClick={() => setCitizenToggle('MY')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${citizenToggle === 'MY' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
                >
                  My Submissions
                </button>
              </div>
            )}

            {role === 'DEPARTMENT_OFFICER' && (
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200" id="officer-worklist-tabs">
                <button
                  id="officer-tab-assigned"
                  onClick={() => setOfficerTab('ASSIGNED')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${officerTab === 'ASSIGNED' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                >
                  My Assigned Issues
                </button>
                <button
                  id="officer-tab-dept-ward"
                  onClick={() => setOfficerTab('DEPT_WARD')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${officerTab === 'DEPT_WARD' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                >
                  Department & Ward Issues
                </button>
              </div>
            )}

            <button
              onClick={fetchIssues}
              disabled={isLoading}
              className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-slate-500"
              title="Refresh complaints list"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            {showCreateButton && onCreateClick && (
              <button
                id="report-issue-btn-top"
                onClick={onCreateClick}
                className="bg-teal-500 hover:bg-teal-600 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-teal-500/10"
              >
                <PlusCircle className="w-4 h-4" />
                Report Civic Issue
              </button>
            )}
          </div>
        </div>

        {/* Filters and search grids */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-slate-100">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search complaints, IDs, text..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value.slice(0, 100))}
              maxLength={100}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 text-slate-800"
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-teal-500 text-slate-700"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLUTION_PENDING_VERIFICATION">Pending Verification</option>
              <option value="COMMUNITY_VERIFIED">Community Verified</option>
              <option value="REOPENED">Reopened</option>
              <option value="CLOSED">Closed</option>
              <option value="REJECTED">Rejected</option>
              <option value="MANUAL_REVIEW">Manual Review</option>
            </select>
          </div>

          <div>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-teal-500 text-slate-700"
            >
              <option value="ALL">All Priorities</option>
              <option value="HIGH">High Priority</option>
              <option value="MEDIUM">Medium Priority</option>
              <option value="LOW">Low Priority</option>
            </select>
          </div>

          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-teal-500 text-slate-700"
            >
              <option value="ALL">All Categories</option>
              <option value="POTHOLE">Potholes</option>
              <option value="STREETLIGHT">Streetlights</option>
              <option value="GARBAGE">Garbage Disposal</option>
              <option value="WATER_LEAKAGE">Water Leakage</option>
              <option value="UNCATEGORIZED">Uncategorized</option>
            </select>
          </div>
        </div>

      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl flex items-start gap-2.5 text-xs">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <p>{errorMsg}</p>
        </div>
      )}

      {/* Grid List of Issues */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200">
          <RefreshCw className="w-8 h-8 text-slate-400 animate-spin mb-3" />
          <p className="text-xs text-slate-500 font-mono">Synchronizing civic files...</p>
        </div>
      ) : filteredIssues.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-6">
          <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-700 text-sm">No municipal issues found</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Try adjusting your search queries, applying different filtering tags, or submitting a new complaint report yourself.
          </p>
          {showCreateButton && onCreateClick && (
            <button
              onClick={onCreateClick}
              className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
            >
              Report First Complaint
            </button>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {filteredIssues.map((issue) => {
            const mediaList = issue.media || [];
            const isImg = (m: any) => m.type === 'IMAGE' || (m.url && /\.(jpg|jpeg|png|gif|webp)/i.test(m.url));
            const isVid = (m: any) => m.type === 'VIDEO' || (m.url && /\.(mp4|mov|avi|mkv|webm)/i.test(m.url));
            
            const imageMedia = mediaList.find(isImg);
            const hasVideoOnly = mediaList.some(isVid) && !imageMedia;

            const formattedDate = new Date(issue.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            });

            return (
              <div
                key={issue.id || issue._id}
                onClick={() => onSelectIssue(issue.issueNumber)}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-slate-300 transition-all shadow-xs hover:shadow-md cursor-pointer flex flex-col justify-between"
              >
                <div>
                  {/* Card Media Header */}
                  <div className="h-44 bg-slate-100 relative overflow-hidden">
                    {imageMedia ? (
                      <img
                        src={imageMedia.url}
                        alt={issue.title}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : hasVideoOnly ? (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 border-b border-slate-100 p-4 text-center">
                        <Video className="w-8 h-8 text-slate-400 mb-2" />
                        <span className="text-[11px] font-semibold text-slate-600 leading-snug">
                          Video evidence attached. Open Complaint to view video evidence
                        </span>
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300 bg-slate-50 font-mono text-xs">
                        No Media Preview Available
                      </div>
                    )}
                    <div className="absolute top-3 left-3 flex gap-1.5">
                      {getStatusBadge(issue.status)}
                    </div>
                    <div className="absolute top-3 right-3 flex gap-1.5">
                      {getPriorityBadge(issue.priority)}
                    </div>
                    {issue.slaBreached && (
                      <div className="absolute bottom-0 inset-x-0 bg-red-600/90 text-white text-[10px] font-bold py-1 px-3 flex items-center gap-1 font-sans">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        SLA BREACHED
                      </div>
                    )}
                  </div>

                  <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider">
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{issue.issueNumber}</span>
                      {issue.assignedDepartment ? (
                        <span className="text-blue-600 font-sans font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-100 uppercase text-[9px]">{issue.assignedDepartment}</span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          {issue.category}
                        </span>
                      )}
                    </div>

                    <h4 className="font-bold text-slate-800 text-sm line-clamp-1 group-hover:text-teal-600 transition-colors">
                      {issue.title}
                    </h4>

                    <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                      {issue.description}
                    </p>
                  </div>
                </div>

                <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <div className="flex items-center gap-1 truncate max-w-[65%]">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{issue.address}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-400">
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    <span>{formattedDate}</span>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
