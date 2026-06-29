import React, { useState, useEffect } from 'react';
import { getAuthHeaders } from '../../utils/auth.js';
import { Star, Shield, Award, TrendingUp, Zap, Target } from 'lucide-react';

export default function GamificationProfileWidget() {
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/gamification/profile', { headers: getAuthHeaders() });
      const json = await res.json();
      if (json.success) {
        setProfile(json.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!profile) return <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-100 animate-pulse h-32"></div>;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="bg-indigo-100 p-3 rounded-full">
            <Shield className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{profile.reputationName}</h2>
            <p className="text-sm text-gray-500">Level {profile.reputationLevel} Citizen</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black text-indigo-600">{profile.xp} <span className="text-sm text-gray-500 font-medium">XP</span></div>
          <p className="text-xs text-gray-500">Lifetime Experience</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
          <div className="flex items-center space-x-2 mb-1">
            <Target className="w-4 h-4 text-gray-500" />
            <span className="text-xs font-medium text-gray-500 uppercase">Impact Score</span>
          </div>
          <div className="text-xl font-bold text-gray-900">{profile.communityImpactScore}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
          <div className="flex items-center space-x-2 mb-1">
            <Zap className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-medium text-gray-500 uppercase">Monthly Score</span>
          </div>
          <div className="text-xl font-bold text-gray-900">{profile.monthlyLeaderboardScore}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
          <div className="flex items-center space-x-2 mb-1">
            <Award className="w-4 h-4 text-purple-500" />
            <span className="text-xs font-medium text-gray-500 uppercase">Quizzes</span>
          </div>
          <div className="text-xl font-bold text-gray-900">{profile.stats?.quizzesCompleted || 0}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
          <div className="flex items-center space-x-2 mb-1">
            <Star className="w-4 h-4 text-green-500" />
            <span className="text-xs font-medium text-gray-500 uppercase">Verified</span>
          </div>
          <div className="text-xl font-bold text-gray-900">{profile.stats?.issuesVerified || 0}</div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center">
          <Award className="w-4 h-4 mr-2 text-gray-400" /> Earned Badges
        </h3>
        {profile.badges && profile.badges.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {Array.from(new Set(profile.badges.map((b: any) => b.badgeId?.name || 'Badge'))).map((name: any, idx: number) => (
              <span key={idx} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                {name}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 italic">No badges earned yet. Participate in community activities to earn badges!</p>
        )}
      </div>
    </div>
  );
}
