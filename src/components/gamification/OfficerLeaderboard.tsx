import React, { useState, useEffect } from 'react';
import { getAuthHeaders } from '../../utils/auth.js';
import { Trophy, Medal, Star, Shield, Briefcase, MapPin } from 'lucide-react';

export default function OfficerLeaderboard() {
  const [activeTab, setActiveTab] = useState<'ward' | 'district' | 'state'>('ward');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLeaderboard();
  }, [activeTab]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/gamification/leaderboard/officers?scope=${activeTab}`, {
        headers: getAuthHeaders()
      });
      const json = await response.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (e) {
      console.error('Failed to load officer leaderboard', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-amber-50 to-white">
        <div className="flex items-center space-x-3">
          <Trophy className="w-6 h-6 text-amber-600" />
          <div>
            <h2 className="text-xl font-bold text-slate-900 font-sans">Officer Performance Leaderboard</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Comparing active department officers based on verified infrastructure resolution efficiency
            </p>
          </div>
        </div>
        <div className="flex bg-slate-100 rounded-lg p-1 border border-slate-200">
          <button
            onClick={() => setActiveTab('ward')}
            className={`px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-md transition cursor-pointer ${
              activeTab === 'ward'
                ? 'bg-white text-amber-700 shadow-sm font-semibold border-slate-200'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Same Ward
          </button>
          <button
            onClick={() => setActiveTab('district')}
            className={`px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-md transition cursor-pointer ${
              activeTab === 'district'
                ? 'bg-white text-amber-700 shadow-sm font-semibold border-slate-200'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Same District
          </button>
          <button
            onClick={() => setActiveTab('state')}
            className={`px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-md transition cursor-pointer ${
              activeTab === 'state'
                ? 'bg-white text-amber-700 shadow-sm font-semibold border-slate-200'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Same State
          </button>
        </div>
      </div>

      <div className="p-0 overflow-x-auto">
        {loading ? (
          <div className="p-12 text-center text-slate-500 font-mono text-sm animate-pulse">
            Compiling active officer rankings...
          </div>
        ) : (
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase text-slate-400 tracking-wider">
                <th className="p-4 font-bold w-16">Rank</th>
                <th className="p-4 font-bold">Officer & Department</th>
                <th className="p-4 font-bold">Employee ID</th>
                <th className="p-4 font-bold">Complaints Resolved</th>
                <th className="p-4 font-bold text-right">Impact Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((row: any, idx: number) => {
                const resolutionRate = row.assignedCount > 0 
                  ? Math.round((row.resolvedCount / row.assignedCount) * 100) 
                  : 0;
                
                return (
                  <tr key={row._id} className="hover:bg-slate-50/50 transition duration-150">
                    <td className="p-4 font-bold text-slate-700">
                      <span className="flex items-center justify-center w-8 h-8 rounded-full">
                        {idx === 0 && <Medal className="w-6 h-6 text-yellow-500 fill-yellow-100 shrink-0" />}
                        {idx === 1 && <Medal className="w-6 h-6 text-slate-400 fill-slate-100 shrink-0" />}
                        {idx === 2 && <Medal className="w-6 h-6 text-amber-600 fill-amber-50 shrink-0" />}
                        {idx > 2 && <span className="font-mono text-xs text-slate-500">#{idx + 1}</span>}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center font-bold text-sm shrink-0">
                          {row.firstName[0]}
                          {row.lastName[0]}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 text-sm">
                            {row.firstName} {row.lastName}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider bg-amber-500/10 text-amber-700 border border-amber-500/10">
                              {row.departmentName}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono flex items-center gap-0.5">
                              <MapPin className="w-3 h-3 shrink-0 text-slate-300" />
                              {row.registeredWard}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 font-mono text-xs text-slate-500">
                      {row.employeeId}
                    </td>
                    <td className="p-4">
                      <div className="space-y-1.5 max-w-xs">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-slate-700">
                            {row.resolvedCount} <span className="font-normal text-slate-400">/ {row.assignedCount} resolved</span>
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 font-bold bg-slate-100 px-1 py-0.5 rounded">
                            {resolutionRate}% Rate
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className="bg-amber-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(5, resolutionRate))}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="font-mono font-bold text-amber-600 text-sm">
                        {row.impactScore} XP
                      </div>
                    </td>
                  </tr>
                );
              })}
              {data.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-400 font-mono text-sm">
                    No active officers found matching this scope.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
