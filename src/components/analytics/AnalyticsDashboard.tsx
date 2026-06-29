import React, { useState, useEffect } from 'react';
import {
  TrendingUp, Award, Activity, Heart, ShieldAlert,
  MapPin, AlertTriangle, RefreshCw, RefreshCw as SpinIcon,
  BrainCircuit, Sparkles, AlertCircle, FileText, BarChart2,
  List, CheckCircle2, AlertOctagon, HelpCircle, ArrowUpRight
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend, LineChart, Line
} from 'recharts';
import { getAuthHeaders } from '../../utils/auth.js';

interface AnalyticsDashboardProps {
  role: 'CITIZEN' | 'DEPARTMENT_OFFICER' | 'ADMIN';
  user?: any;
}

export default function AnalyticsDashboard({ role, user }: AnalyticsDashboardProps) {
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'heatmap' | 'ai-insights'>('overview');
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [aiInsights, setAiInsights] = useState<any>(null);
  const [heatmapFeatures, setHeatmapFeatures] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const userWard = user?.registeredWard || "Ward 80";
  const userDistrict = user?.registeredDistrict || "Tiruchirappalli";

  // Selected SVG Map Ward for metrics inspection
  const [selectedWard, setSelectedWard] = useState<any>({
    name: `${userWard} (${userDistrict})`,
    score: 94,
    active: 2,
    compliance: "96%"
  });

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const endpoint = role === 'CITIZEN' 
        ? '/api/analytics/dashboard/citizen' 
        : role === 'DEPARTMENT_OFFICER' 
        ? '/api/analytics/dashboard/officer' 
        : '/api/analytics/dashboard/admin';

      const res = await fetch(endpoint, { headers: getAuthHeaders() });
      const data = await res.json();
      if (res.ok && data.success) {
        setDashboardData(data.data);
      } else {
        throw new Error(data.error?.message || "Failed to retrieve telemetry metrics.");
      }

      // Fetch trends for charting
      const trendRes = await fetch('/api/analytics/overall-trends', { headers: getAuthHeaders() });
      const trendData = await trendRes.json();
      if (trendRes.ok && trendData.success) {
        setTrendData(trendData.data);
      }

      // Fetch heatmap features
      const heatRes = await fetch('/api/analytics/heatmaps', { headers: getAuthHeaders() });
      const heatData = await heatRes.json();
      if (heatRes.ok && heatData.success) {
        setHeatmapFeatures(heatData.data.features || []);
      }

      // Fetch dynamic wards with registered users
      const targetDist = selectedDistrict || user?.registeredDistrict || "Tiruchirappalli";
      const wardsRes = await fetch(`/api/analytics/wards?district=${encodeURIComponent(targetDist)}`, { headers: getAuthHeaders() });
      const wardsData = await wardsRes.json();
      if (wardsRes.ok && wardsData.success) {
        setWards(wardsData.data || []);
        if (wardsData.data && wardsData.data.length > 0) {
          setSelectedWard(wardsData.data[0]);
        } else {
          setSelectedWard({
            name: `No Ward Selected (${targetDist})`,
            score: 0,
            active: 0,
            compliance: "0%"
          });
        }
      }

    } catch (e: any) {
      setErrorMsg(e.message || "Failed to establish a telemetry bridge.");
    } finally {
      setIsLoading(false);
    }
  };

  const triggerAiInsights = async () => {
    setIsAiLoading(true);
    try {
      const res = await fetch('/api/analytics/ai-insights', { headers: getAuthHeaders() });
      const data = await res.json();
      if (res.ok && data.success) {
        setAiInsights(data.data);
      }
    } catch (e) {
      console.error("AI insight pipeline interrupted.", e);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Fetch districts list on load or user profile change
  useEffect(() => {
    const fetchDistricts = async () => {
      try {
        const res = await fetch('/api/analytics/districts', { headers: getAuthHeaders() });
        const data = await res.json();
        if (res.ok && data.success) {
          const list: string[] = data.data || [];
          setDistricts(list);
          const userDist = user?.registeredDistrict || "Tiruchirappalli";
          if (list.length > 0) {
            if (list.includes(userDist)) {
              setSelectedDistrict(userDist);
            } else {
              setSelectedDistrict(list[0]);
            }
          } else {
            setSelectedDistrict(userDist);
          }
        }
      } catch (err) {
        console.error("Error fetching districts", err);
      }
    };
    fetchDistricts();
  }, [user]);

  useEffect(() => {
    if (selectedDistrict) {
      fetchDashboardData();
    }
  }, [role, selectedDistrict]);

  useEffect(() => {
    if (activeSubTab === 'ai-insights' && !aiInsights) {
      triggerAiInsights();
    }
  }, [activeSubTab]);

  const getPriorityColor = (priority: string) => {
    switch ((priority || '').toUpperCase()) {
      case 'CRITICAL': return 'text-rose-600 bg-rose-50 border-rose-200';
      case 'HIGH': return 'text-amber-700 bg-amber-50 border-amber-200';
      case 'MEDIUM': return 'text-sky-700 bg-sky-50 border-sky-200';
      default: return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CLOSED':
      case 'COMMUNITY_VERIFIED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'REOPENED':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'RESOLUTION_PENDING_VERIFICATION':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  // Pre-configured list of beautiful geometric polygons in a 300x250 grid
  const presets = [
    { path: "M 30,30 L 150,30 L 140,110 L 20,90 Z", center: [85, 60], color: "#0d9488" },
    { path: "M 150,30 L 280,40 L 260,130 L 140,110 Z", center: [205, 80], color: "#0f766e" },
    { path: "M 20,90 L 140,110 L 110,210 L 10,180 Z", center: [70, 145], color: "#be123c" },
    { path: "M 140,110 L 260,130 L 240,220 L 110,210 Z", center: [185, 165], color: "#b45309" }
  ];

  const mappedWards = (wards || []).slice(0, 4).map((w, idx) => {
    const preset = presets[idx] || presets[0];
    return {
      ...w,
      path: preset.path,
      center: preset.center,
      color: preset.color
    };
  });

  const defaultWards = (() => {
    let wardBaseNumber = 1;
    const match = userWard.match(/\d+/);
    if (match) {
      wardBaseNumber = parseInt(match[0], 10);
    }
    return [
      { id: "ward-def-1", name: `${userWard} (${userDistrict})`, path: "M 30,30 L 150,30 L 140,110 L 20,90 Z", score: 94, active: 2, compliance: "96%", color: "#0d9488", center: [85, 60] },
      { id: "ward-def-2", name: `Ward ${wardBaseNumber + 1} (${userDistrict})`, path: "M 150,30 L 280,40 L 260,130 L 140,110 Z", score: 82, active: 4, compliance: "88%", color: "#0f766e", center: [205, 80] },
      { id: "ward-def-3", name: `Ward ${wardBaseNumber + 2} (${userDistrict})`, path: "M 20,90 L 140,110 L 110,210 L 10,180 Z", score: 68, active: 8, compliance: "72%", color: "#be123c", center: [70, 145] },
      { id: "ward-def-4", name: `Ward ${wardBaseNumber + 3} (${userDistrict})`, path: "M 140,110 L 260,130 L 240,220 L 110,210 Z", score: 75, active: 5, compliance: "80%", color: "#b45309", center: [185, 165] }
    ];
  })();

  const svgWards = mappedWards;

  return (
    <div className="bg-slate-50 rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden font-sans">
      
      {/* Sub tabs rail */}
      <div className="bg-slate-900 px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800">
        <div>
          <h2 className="text-white text-base font-bold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-teal-400" />
            Civic Operations Intelligence Hub
          </h2>
          <p className="text-slate-400 text-xs mt-0.5">Real-time municipal performance trackers and AI analytical models</p>
        </div>

        <div className="flex items-center gap-2 bg-slate-800/80 p-1.5 rounded-xl border border-slate-700/50">
          <button
            onClick={() => setActiveSubTab('overview')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${activeSubTab === 'overview' ? 'bg-teal-500 text-slate-950 font-bold shadow' : 'text-slate-300 hover:text-white'}`}
          >
            Overview Dashboards
          </button>
          <button
            onClick={() => setActiveSubTab('heatmap')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${activeSubTab === 'heatmap' ? 'bg-teal-500 text-slate-950 font-bold shadow' : 'text-slate-300 hover:text-white'}`}
          >
            Hotspot Heatmap
          </button>
          <button
            onClick={() => setActiveSubTab('ai-insights')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${activeSubTab === 'ai-insights' ? 'bg-teal-500 text-slate-950 font-bold shadow' : 'text-slate-300 hover:text-white'}`}
          >
            <span className="flex items-center gap-1">
              <BrainCircuit className="w-3.5 h-3.5" />
              Gemini AI Insights
            </span>
          </button>
          <button
            onClick={fetchDashboardData}
            disabled={isLoading}
            className="p-1.5 text-slate-400 hover:text-white border border-slate-700 rounded-lg hover:bg-slate-750 transition-colors"
            title="Refresh Metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Content Pane */}
      <div className="p-6 md:p-8">
        
        {errorMsg && (
          <div className="mb-6 p-4 bg-rose-50 border-l-4 border-rose-500 text-rose-800 text-xs rounded-r-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {isLoading && !dashboardData ? (
          <div className="py-24 text-center">
            <SpinIcon className="w-10 h-10 text-teal-600 animate-spin mx-auto mb-3" />
            <p className="font-sans font-bold text-slate-700">Connecting Telemetry Pipeline...</p>
            <p className="text-slate-400 text-xs mt-1">Acquiring municipal registers and verifying ledger sync.</p>
          </div>
        ) : (
          <>
            {/* SUB-TAB 1: ROLE-BASED OVERVIEW DASHBOARDS */}
            {activeSubTab === 'overview' && (
              <div className="space-y-8">
                
                {/* 1. CITIZEN VIEW DASHBOARD PANELS */}
                {role === 'CITIZEN' && dashboardData && (
                  <div className="space-y-8">
                    {/* Metrics grid */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Locality Health</span>
                            <Heart className="w-5 h-5 text-rose-500" />
                          </div>
                          <div className="text-3xl font-sans font-bold text-slate-900">{dashboardData.localityHealth?.score || 85}%</div>
                        </div>
                        <div className="mt-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${dashboardData.localityHealth?.score >= 90 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                            {dashboardData.localityHealth?.status}
                          </span>
                          <p className="text-[10px] text-slate-500 mt-1.5 leading-snug">{dashboardData.localityHealth?.summary}</p>
                        </div>
                      </div>

                      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Community Hero Rank</span>
                            <Award className="w-5 h-5 text-teal-500" />
                          </div>
                          <div className="text-3xl font-sans font-bold text-slate-900">#{dashboardData.leaderboard?.rank}</div>
                        </div>
                        <div className="mt-3">
                          <span className="bg-teal-50 text-teal-700 px-2 py-0.5 rounded text-[10px] font-bold">
                            {dashboardData.leaderboard?.tier}
                          </span>
                          <p className="text-[10px] text-slate-500 mt-1.5 leading-snug">Top {Math.round((dashboardData.leaderboard?.rank / (dashboardData.leaderboard?.totalInWard || 1)) * 100)}% of citizens in your area</p>
                        </div>
                      </div>

                      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">My Impact Score</span>
                            <Sparkles className="w-5 h-5 text-amber-500" />
                          </div>
                          <div className="text-3xl font-sans font-bold text-slate-900">{dashboardData.impactScore} pts</div>
                        </div>
                        <div className="mt-3">
                          <p className="text-[10px] text-slate-500 leading-snug font-medium">Acquired through filing verified alerts and auditing municipal resolutions.</p>
                        </div>
                      </div>

                      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Validation Accuracy</span>
                            <Activity className="w-5 h-5 text-indigo-500" />
                          </div>
                          <div className="text-3xl font-sans font-bold text-slate-900">{dashboardData.verificationActivity?.consensusAccuracyRate}%</div>
                        </div>
                        <div className="mt-3">
                          <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-bold">
                            {dashboardData.verificationActivity?.totalVotesCast} Audits Cast
                          </span>
                          <p className="text-[10px] text-slate-500 mt-1.5 leading-snug">Approvals: {dashboardData.verificationActivity?.approvals} | Rejections: {dashboardData.verificationActivity?.rejections}</p>
                        </div>
                      </div>
                    </div>

                    {/* Nearby issues container list */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
                      <h3 className="font-sans font-bold text-slate-900 text-sm mb-4">Open Local Hazards Nearby (Awaiting Citizen Verification Support)</h3>
                      {dashboardData.openIssuesNearby?.length === 0 ? (
                        <div className="text-center py-6 text-slate-400 text-xs">
                          No nearby unverified issues found. Your ward is pristine!
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {dashboardData.openIssuesNearby?.map((issue: any) => (
                            <div key={issue.issueNumber} className="p-4 bg-slate-50 border rounded-xl flex justify-between items-start hover:border-teal-500/30 transition-colors">
                              <div>
                                <span className="text-[9px] bg-slate-200 text-slate-700 font-mono font-bold px-1.5 py-0.5 rounded uppercase">
                                  {issue.category}
                                </span>
                                <h4 className="font-bold text-xs text-slate-900 mt-1.5 line-clamp-1">{issue.title}</h4>
                                <p className="text-[10px] font-mono text-slate-400 mt-0.5">{issue.issueNumber}</p>
                              </div>
                              <span className={`text-[9px] border px-2 py-0.5 rounded font-bold ${getStatusBadge(issue.status)}`}>
                                {issue.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 2. OFFICER VIEW DASHBOARD PANELS */}
                {role === 'DEPARTMENT_OFFICER' && dashboardData && (
                  <div className="space-y-8">
                    {/* Metric Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
                        <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1">Active Queue Backlog</span>
                        <div className="text-3xl font-bold font-sans text-slate-900">
                          {dashboardData.workQueue?.assigned + dashboardData.workQueue?.inProgress}
                        </div>
                        <div className="flex gap-2 text-[10px] text-slate-500 mt-1.5">
                          <span>Assigned: <strong className="text-slate-700 font-mono">{dashboardData.workQueue?.assigned}</strong></span>
                          <span>In Progress: <strong className="text-slate-700 font-mono">{dashboardData.workQueue?.inProgress}</strong></span>
                        </div>
                      </div>

                      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
                        <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1">SLA Compliance Rate</span>
                        <div className="text-3xl font-bold font-sans text-teal-600">
                          {dashboardData.performance?.slaCompliancePercentage}%
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-1.5">Target: {dashboardData.comparison?.slaCompliancePercentage}% (Dept Baseline)</span>
                      </div>

                      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
                        <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1">Avg Resolution Speed</span>
                        <div className="text-3xl font-bold font-sans text-slate-900">
                          {dashboardData.performance?.averageResolutionTimeHours} hrs
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-1.5">Baseline: {dashboardData.comparison?.avgResolutionTimeHours} hrs (Dept Avg)</span>
                      </div>

                      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
                        <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1">Citizen Rework Rate</span>
                        <div className={`text-3xl font-bold font-sans ${dashboardData.performance?.reworkPercentage > 15 ? 'text-rose-600' : 'text-slate-900'}`}>
                          {dashboardData.performance?.reworkPercentage}%
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-1.5">Percentage of re-opened resolutions</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. ADMIN VIEW DASHBOARD PANELS */}
                {role === 'ADMIN' && dashboardData && (
                  <div className="space-y-8">
                    {/* Admin metrics card row */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                        <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1">Active Backlog</span>
                        <div className="text-3xl font-bold font-sans text-slate-900">{dashboardData.summary?.activeOpenIssues}</div>
                        <span className="text-[9px] text-slate-400 block mt-1">Awaiting attention/assignment</span>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                        <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1">Pending Audit</span>
                        <div className="text-3xl font-bold font-sans text-amber-600">{dashboardData.summary?.resolvedPendingVerification}</div>
                        <span className="text-[9px] text-slate-400 block mt-1">Pending community verifications</span>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                        <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1">Resolved (30d)</span>
                        <div className="text-3xl font-bold font-sans text-emerald-600">{dashboardData.summary?.closed30Days}</div>
                        <span className="text-[9px] text-slate-400 block mt-1">Permanently archived files</span>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                        <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1">SLA Breach Ratio</span>
                        <div className={`text-3xl font-bold font-sans ${dashboardData.summary?.overallSlaBreachPercentage > 20 ? 'text-rose-600' : 'text-slate-900'}`}>
                          {dashboardData.summary?.overallSlaBreachPercentage}%
                        </div>
                        <span className="text-[9px] text-slate-400 block mt-1">Average SLA failure rates</span>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                        <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1">Verified Citizens</span>
                        <div className="text-3xl font-bold font-sans text-teal-600">{dashboardData.summary?.activeVerifiedCitizens}</div>
                        <span className="text-[9px] text-slate-400 block mt-1">With government credentials</span>
                      </div>
                    </div>

                    {/* Department Performance Matrix and Alerts */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      
                      {/* Department matrix */}
                      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm md:col-span-2">
                        <h3 className="font-bold text-slate-900 text-sm mb-4">Department Operational SLA Matrix</h3>
                        <div className="overflow-x-auto border border-slate-100 rounded-xl">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase">
                                <th className="p-3">Rank</th>
                                <th className="p-3">Municipal Department</th>
                                <th className="p-3">Active Backlog</th>
                                <th className="p-3 text-right">SLA Compliance</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {dashboardData.departmentLeagueTable?.map((dept: any) => (
                                <tr key={dept.department} className="hover:bg-slate-50/50">
                                  <td className="p-3 font-mono font-bold text-slate-500">#{dept.rank}</td>
                                  <td className="p-3 font-semibold text-slate-800">{dept.department}</td>
                                  <td className="p-3 font-mono text-slate-600">{dept.activeQueue} issues</td>
                                  <td className="p-3 text-right">
                                    <span className={`px-2 py-0.5 rounded font-mono font-bold ${dept.slaCompliance >= 90 ? 'bg-emerald-50 text-emerald-700' : dept.slaCompliance < 75 ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>
                                      {dept.slaCompliance}%
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Citizen participation metrics and warning blocks */}
                      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm mb-4">Civic Participation Index</h3>
                          <div className="space-y-4">
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                              <span className="text-[10px] text-slate-400 font-bold block uppercase">Audited Decisions</span>
                              <div className="text-xl font-bold text-slate-800 mt-1">{dashboardData.citizenParticipation?.totalVotesCast} votes</div>
                            </div>
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                              <span className="text-[10px] text-slate-400 font-bold block uppercase">Audit Consensus Accuracy</span>
                              <div className="text-xl font-bold text-slate-800 mt-1">{dashboardData.citizenParticipation?.consensusAccuracyRate}%</div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Operational Safeguard Alerts</span>
                          {dashboardData.systemAlerts?.map((alert: string, idx: number) => (
                            <p key={idx} className="text-[10px] leading-relaxed font-semibold text-amber-800 bg-amber-50 border border-amber-100 p-2 rounded-lg">
                              {alert}
                            </p>
                          ))}
                        </div>
                      </div>

                    </div>
                  </div>
                )}

                {/* 4. HISTORIC TIME SERIES TRENDS FOR EVERYONE */}
                {trendData.length > 0 && (
                  <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
                    <h3 className="font-sans font-bold text-slate-900 text-sm mb-4 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-teal-600" />
                      Historical Performance Trends (2026 Year-to-Date)
                    </h3>
                    
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={trendData}
                          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient id="colorLogged" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#0d9488" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="period" stroke="#94a3b8" fontSize={11} tickLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: "#1e293b", borderRadius: "12px", border: "none", color: "#fff" }}
                            labelStyle={{ fontWeight: "bold", color: "#38bdf8" }}
                          />
                          <Legend verticalAlign="top" height={36} iconType="circle" />
                          <Area type="monotone" name="Logged Complaints" dataKey="logged" stroke="#0d9488" strokeWidth={2} fillOpacity={1} fill="url(#colorLogged)" />
                          <Area type="monotone" name="Resolved Issues" dataKey="resolved" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorResolved)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* SUB-TAB 2: HOTSPOT HEATMAP SECTION */}
            {activeSubTab === 'heatmap' && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-rose-500" />
                      Dynamic Ward Boundary Hotspot Analysis
                    </h3>
                    <p className="text-slate-400 text-xs mt-0.5">Interactive GIS boundary rendering mapping critical infrastructure backlogs dynamically</p>
                  </div>
                  
                  {role === 'ADMIN' && (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-slate-50 p-2 border rounded-xl">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Select District:</span>
                      <select
                        value={selectedDistrict}
                        onChange={(e) => setSelectedDistrict(e.target.value)}
                        className="border border-slate-200 rounded-lg px-2.5 py-1 text-xs bg-white font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-500"
                      >
                        {districts.map(dist => (
                          <option key={dist} value={dist}>{dist}</option>
                        ))}
                        {districts.length === 0 && (
                          <option value={userDistrict}>{userDistrict}</option>
                        )}
                      </select>
                    </div>
                  )}
                  
                  {/* Category toggle */}
                  <div className="text-[11px] text-slate-500 bg-slate-50 border px-3 py-1 rounded-xl font-mono leading-none">
                    🔑 Geo-privacy active: coordinates fuzzing offset is applied strictly.
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* Left: SVG Map Canvas */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm md:col-span-2 flex flex-col items-center justify-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase mb-3 block text-left w-full">Neighborhood Blueprint Overview</span>
                    
                    <div className="w-full h-80 relative flex items-center justify-center bg-slate-950 rounded-xl overflow-hidden border">
                      
                      {/* Grid overlay */}
                      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-30 pointer-events-none"></div>

                      <svg viewBox="0 0 300 250" className="w-full h-full p-4">
                        {/* Wards polygons */}
                        {svgWards.map(ward => {
                          const isSelected = selectedWard.name === ward.name;
                          return (
                            <g key={ward.id} onClick={() => setSelectedWard({
                              name: ward.name,
                              score: ward.score,
                              active: ward.active,
                              compliance: ward.compliance
                            })} className="cursor-pointer group">
                              <path 
                                d={ward.path} 
                                fill={isSelected ? `${ward.color}30` : "#1e293b"} 
                                stroke={isSelected ? "#2dd4bf" : "#475569"} 
                                strokeWidth={isSelected ? 2 : 1}
                                className="transition-all duration-300 hover:fill-teal-500/10"
                              />
                              {/* Pulsating hotspot circle based on risk */}
                              {ward.active > 3 && (
                                <circle 
                                  cx={ward.center[0]} 
                                  cy={ward.center[1]} 
                                  r={8 + Math.sin(Date.now() / 300) * 2} 
                                  fill="#f43f5e" 
                                  className="animate-ping opacity-25"
                                />
                              )}
                              <circle 
                                cx={ward.center[0]} 
                                cy={ward.center[1]} 
                                r={5} 
                                fill={ward.score >= 80 ? "#10b981" : ward.score >= 70 ? "#f59e0b" : "#ef4444"} 
                              />
                            </g>
                          );
                        })}
                        {svgWards.length === 0 && (
                          <text x="150" y="125" textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="sans-serif">
                            No registered wards found in this district
                          </text>
                        )}
                      </svg>
                      
                      {/* Interactive Legend overlay */}
                      <div className="absolute bottom-4 left-4 bg-slate-900/95 border border-slate-800 p-2.5 rounded-lg text-[9px] font-mono space-y-1 text-slate-400">
                        <div className="text-white font-bold mb-1">Health Index Legend</div>
                        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></div> 80%+ Excellent</div>
                        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-amber-500 rounded-full"></div> 70-79% Modest</div>
                        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-rose-500 rounded-full"></div> &lt; 70% Alert Zone</div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Selected Ward Inspector */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Ward Telemetry Inspector</span>
                      <h4 className="font-sans font-bold text-slate-900 text-base mb-1">{selectedWard.name}</h4>
                      <p className="text-[10px] text-slate-400 font-mono mb-4">Click any blueprint sector on the map to evaluate status</p>
                      
                      <div className="space-y-4">
                        <div className="flex justify-between items-center pb-2 border-b">
                          <span className="text-xs font-semibold text-slate-500">Locality Health Index (LHS)</span>
                          <span className={`text-sm font-mono font-bold ${selectedWard.score >= 80 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {selectedWard.score}%
                          </span>
                        </div>
                        <div className="flex justify-between items-center pb-2 border-b">
                          <span className="text-xs font-semibold text-slate-500">Active Complaint Queue</span>
                          <span className="text-sm font-mono font-bold text-slate-800">
                            {selectedWard.active} reports
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-semibold text-slate-500">SLA Resolution compliance</span>
                          <span className="text-sm font-mono font-bold text-teal-600">
                            {selectedWard.compliance}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-teal-50 border border-teal-100 p-3 rounded-xl mt-4">
                      <h5 className="text-[11px] font-bold text-teal-900">🔍 Real-time Hotspot Note</h5>
                      <p className="text-[10px] text-teal-800 mt-1 leading-relaxed">
                        {selectedWard.name} status is evaluated dynamically based on real-time neighborhood metrics. The current Locality Health Index is {selectedWard.score}%.
                      </p>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* SUB-TAB 3: AI INSIGHTS PANEL */}
            {activeSubTab === 'ai-insights' && (
              <div className="space-y-8">
                
                {/* AI banner */}
                <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 p-6 rounded-2xl border border-teal-500/20 shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                    <BrainCircuit className="w-40 h-40 text-teal-400" />
                  </div>
                  <div className="relative z-10">
                    <span className="text-[9px] bg-teal-500/10 text-teal-300 border border-teal-500/20 px-2 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider">
                      Powered by Gemini 1.5 Flash Pro
                    </span>
                    <h3 className="font-sans font-bold text-white text-lg mt-2 flex items-center gap-2">
                      <BrainCircuit className="w-5 h-5 text-teal-400" />
                      Cognitive Governance Analytics Console
                    </h3>
                    <p className="text-slate-300 text-xs max-w-2xl mt-1.5 leading-relaxed">
                      AI agent executing real-time municipal trend evaluations, pinpointing recurring regional infrastructure clusters, anticipating high-risk hotspots, and diagnosing departmental resource friction.
                    </p>
                  </div>
                </div>

                {isAiLoading ? (
                  <div className="text-center py-20 bg-white border border-slate-200 rounded-2xl">
                    <SpinIcon className="w-10 h-10 text-teal-600 animate-spin mx-auto mb-3" />
                    <p className="font-sans font-bold text-slate-700">Synthesizing Regional Log Arrays...</p>
                    <p className="text-slate-400 text-xs mt-1">Calling Gemini AI to calculate predictive threat indexes...</p>
                  </div>
                ) : aiInsights ? (
                  <div className="space-y-8">
                    
                    {/* Bento grid layout for insights */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Recurring Clusters Card */}
                      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                          <Activity className="w-4.5 h-4.5 text-teal-600" />
                          <h4 className="font-sans font-bold text-slate-900 text-sm">Recurring Spatial Log Clusters</h4>
                        </div>
                        <div className="space-y-4">
                          {aiInsights.recurringIssues?.map((item: any, idx: number) => (
                            <div key={idx} className="p-3 bg-slate-50 border rounded-xl">
                              <div className="flex justify-between items-center">
                                <h5 className="font-bold text-xs text-slate-800">{item.title}</h5>
                                <span className={`text-[8px] font-bold font-mono px-1.5 py-0.5 rounded border ${getPriorityColor(item.severity)}`}>
                                  {item.count} Reports ({item.severity})
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed font-sans">{item.recommendation}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Predictive Hotspots Card */}
                      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                          <MapPin className="w-4.5 h-4.5 text-rose-500" />
                          <h4 className="font-sans font-bold text-slate-900 text-sm">AI-Anticipated Ward Risk Hotspots</h4>
                        </div>
                        <div className="space-y-4">
                          {aiInsights.predictedHotspots?.map((item: any, idx: number) => (
                            <div key={idx} className="p-3 bg-slate-50 border rounded-xl">
                              <div className="flex justify-between items-center mb-1.5">
                                <h5 className="font-bold text-xs text-slate-800">{item.ward}</h5>
                                <span className="text-[10px] font-mono font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                                  Risk: {Math.round(item.riskFactor * 100)}%
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-500 leading-normal"><strong className="text-slate-700">Cause:</strong> {item.cause}</p>
                              <p className="text-[10px] text-teal-700 mt-1 font-medium"><strong className="text-slate-800">Action:</strong> {item.preventativeAction}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Workload bottlenecks Card */}
                      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                          <BarChart2 className="w-4.5 h-4.5 text-amber-600" />
                          <h4 className="font-sans font-bold text-slate-900 text-sm">Department Workload Bottleneck Diagnoses</h4>
                        </div>
                        <div className="space-y-4">
                          {aiInsights.workloadBottlenecks?.map((item: any, idx: number) => (
                            <div key={idx} className="p-3 bg-slate-50 border rounded-xl">
                              <div className="flex justify-between items-center mb-1.5">
                                <h5 className="font-bold text-xs text-slate-800">{item.department}</h5>
                                <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                                  Breaches: {item.slaBreachRate}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-500 leading-relaxed font-sans">{item.analysis}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Critical Hazards list */}
                      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                          <ShieldAlert className="w-4.5 h-4.5 text-rose-600" />
                          <h4 className="font-sans font-bold text-slate-900 text-sm">AI Life-Safety Risk Assessments</h4>
                        </div>
                        <div className="space-y-4">
                          {aiInsights.criticalRisks?.map((item: any, idx: number) => (
                            <div key={idx} className="p-3 bg-rose-50/50 border border-rose-100 rounded-xl">
                              <div className="flex justify-between items-center mb-1.5">
                                <span className="text-[9px] font-mono font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">{item.issueNumber}</span>
                                <span className="text-[8px] font-bold text-white bg-rose-600 px-1.5 py-0.5 rounded font-mono uppercase">
                                  {item.urgency} Action
                                </span>
                              </div>
                              <h5 className="font-bold text-xs text-rose-950 mt-1">{item.hazardType} Hazard Identified</h5>
                              <p className="text-[10px] text-rose-800 mt-1 leading-relaxed font-medium">{item.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>

                  </div>
                ) : (
                  <div className="text-center py-12 bg-white border rounded-2xl">
                    <p className="text-xs text-slate-400 font-mono">Telemetry sync established. Press Refresh or load Tab to trigger Gemini Core calculations.</p>
                  </div>
                )}

              </div>
            )}

          </>
        )}

      </div>
    </div>
  );
}
