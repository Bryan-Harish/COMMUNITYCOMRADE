import React, { useState, useEffect } from 'react';
import { getAuthHeaders } from '../../utils/auth.js';
import { Trophy, Medal, Star, TrendingUp } from 'lucide-react';

export default function Leaderboard() {
  const [activeTab, setActiveTab] = useState<'monthly' | 'lifetime' | 'halloffame'>('monthly');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLeaderboard();
  }, [activeTab]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const endpoint = activeTab === 'halloffame' ? '/api/gamification/halloffame' : `/api/gamification/leaderboard/${activeTab}`;
      const res = await fetch(endpoint, { headers: getAuthHeaders() });
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-indigo-50 to-white">
        <div className="flex items-center space-x-3">
          <Trophy className="w-6 h-6 text-indigo-600" />
          <div>
            <h2 className="text-xl font-bold text-gray-900">Community Leaderboards</h2>
            {activeTab !== 'halloffame' && data.length > 0 && data[0]?.userId?.registeredWard && (
              <p className="text-xs text-indigo-600 font-medium mt-0.5">Top 5 Citizens in {data[0].userId.registeredWard}</p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('monthly')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition ${activeTab === 'monthly' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Monthly
          </button>
          <button
            onClick={() => setActiveTab('lifetime')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition ${activeTab === 'lifetime' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Lifetime
          </button>
          <button
            onClick={() => setActiveTab('halloffame')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition ${activeTab === 'halloffame' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Hall of Fame
          </button>
        </div>
      </div>
      
      <div className="p-0">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading rankings...</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-sm uppercase text-gray-500 tracking-wider">
                <th className="p-4 font-medium">{activeTab === 'halloffame' ? 'Award Month' : 'Rank'}</th>
                <th className="p-4 font-medium">Citizen</th>
                <th className="p-4 font-medium">{activeTab === 'halloffame' ? 'Hero Type' : 'Reputation'}</th>
                <th className="p-4 font-medium text-right">{activeTab === 'halloffame' ? 'Contribution Score' : 'Score'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((row: any, idx: number) => (
                <tr key={row._id} className="hover:bg-gray-50 transition">
                  <td className="p-4 font-bold text-gray-700">
                    {activeTab === 'halloffame' ? row.awardMonth : (
                      <span className="flex items-center">
                        {idx === 0 && <Medal className="w-5 h-5 text-yellow-500 inline mr-1" />}
                        {idx === 1 && <Medal className="w-5 h-5 text-gray-400 inline mr-1" />}
                        {idx === 2 && <Medal className="w-5 h-5 text-amber-600 inline mr-1" />}
                        {idx > 2 && <span className="ml-2">#{idx + 1}</span>}
                      </span>
                    )}
                  </td>
                  <td className="p-4 font-medium text-gray-900">
                    <div>
                      {row.userId?.firstName} {row.userId?.lastName}
                      {row.userId?.registeredWard && (
                        <span className="block text-xs text-gray-400 font-normal">{row.userId.registeredWard}</span>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                      {activeTab === 'halloffame' ? row.heroType : row.reputationName}
                    </span>
                  </td>
                  <td className="p-4 text-right font-bold text-indigo-600">
                    {activeTab === 'halloffame' ? row.contributionScore : (activeTab === 'monthly' ? row.monthlyLeaderboardScore : row.lifetimeLeaderboardScore)} {activeTab !== 'halloffame' && 'XP'}
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-500">No rankings available yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
