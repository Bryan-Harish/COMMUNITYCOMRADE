import React from 'react';
import { Shield, Users, Landmark, UserCheck, ArrowRight, Activity, Cpu } from 'lucide-react';

interface LandingPageProps {
  onNavigate: (path: string) => void;
  user: any;
}

export default function LandingPage({ onNavigate, user }: LandingPageProps) {
  return (
    <div className="bg-slate-50 min-h-screen text-slate-800">
      {/* Hero Section */}
      <header className="relative bg-gradient-to-br from-slate-900 to-slate-800 text-white overflow-hidden py-24 px-6 md:px-12">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-teal-500/10 via-transparent to-transparent opacity-40"></div>
        <div className="max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="flex-1 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-500/10 border border-teal-500/30 rounded-full text-teal-400 text-xs font-mono mb-6">
              <Activity className="w-3.5 h-3.5 animate-pulse" />
              Empowering Local Communities
            </div>
            <h1 className="text-4xl md:text-6xl font-sans font-bold tracking-tight text-white mb-6 leading-tight">
              AI-Powered Community Governance & Civic Engagement
            </h1>
            <p className="text-slate-300 text-lg md:text-xl mb-8 leading-relaxed font-sans">
              Welcome to <span className="text-teal-400 font-semibold">CommunityComrade</span>. Report infrastructure issues, engage in community verification, collaborate with municipal departments, and track real-time resolution pipelines.
            </p>
            <div className="flex flex-wrap gap-4">
              {user ? (
                <button
                  id="go-to-portal-btn"
                  onClick={() => {
                    if (user.role === 'CITIZEN') onNavigate('/portal/citizen/dashboard');
                    else if (user.role === 'DEPARTMENT_OFFICER') onNavigate('/portal/officer/dashboard');
                    else if (user.role === 'ADMIN') onNavigate('/portal/admin/dashboard');
                  }}
                  className="px-6 py-3 bg-teal-500 hover:bg-teal-600 active:bg-teal-700 text-white font-medium rounded-lg shadow-lg shadow-teal-500/20 transition-all flex items-center gap-2 text-sm cursor-pointer"
                >
                  Go to Portal Dashboard
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <>
                  <button
                    id="register-btn"
                    onClick={() => onNavigate('/register/citizen')}
                    className="px-6 py-3 bg-teal-500 hover:bg-teal-600 active:bg-teal-700 text-white font-medium rounded-lg shadow-lg shadow-teal-500/20 transition-all flex items-center gap-2 text-sm cursor-pointer"
                  >
                    Register as Citizen
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    id="login-btn"
                    onClick={() => onNavigate('/login')}
                    className="px-6 py-3 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-white font-medium rounded-lg border border-slate-700 transition-all text-sm cursor-pointer"
                  >
                    Portal Login
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="flex-1 w-full max-w-md bg-slate-800/80 backdrop-blur-md border border-slate-700/60 p-8 rounded-2xl shadow-2xl relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 rounded-full blur-2xl"></div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-teal-500/10 rounded-lg flex items-center justify-center border border-teal-500/20">
                <Shield className="w-5 h-5 text-teal-400" />
              </div>
              <div>
                <h3 className="font-mono text-sm uppercase tracking-wider text-teal-400 font-semibold">Active Roster</h3>
                <p className="text-xs text-slate-400">Governance MVP Status</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 bg-slate-900/60 rounded-xl border border-slate-800">
                <span className="text-sm font-medium text-slate-300">Default Super Admin</span>
                <span className="text-xs font-mono px-2 py-0.5 bg-teal-500/10 text-teal-400 border border-teal-500/20 rounded">
                  admin@communitycomrade.org
                </span>
              </div>
              <div className="flex items-center justify-between p-3.5 bg-slate-900/60 rounded-xl border border-slate-800">
                <span className="text-sm font-medium text-slate-300">Citizen Identity Roles</span>
                <span className="text-xs font-mono px-2 py-0.5 bg-slate-500/15 text-slate-300 rounded">
                  Verified / Community Verified
                </span>
              </div>
              <div className="flex items-center justify-between p-3.5 bg-slate-900/60 rounded-xl border border-slate-800">
                <span className="text-sm font-medium text-slate-300">Department Officers</span>
                <span className="text-xs font-mono px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded">
                  Awaiting Approval Flow
                </span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-700/60 text-center">
              <p className="text-xs text-slate-400 font-mono">
                System: Local Persistent / MongoDB Atlas Hybrid Mode
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Feature Section */}
      <section className="max-w-7xl mx-auto py-20 px-6 md:px-12">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 mb-4 font-sans">
            Secure, Tiered Access Roles & Governance
          </h2>
          <p className="text-slate-600 text-lg">
            Designed for secure data custody and robust validation boundaries, ensuring that every issue reported is verified by local citizens and resolved by certified municipal officers.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div id="feature-citizen" className="bg-white p-8 rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center mb-6 border border-teal-100">
                <Users className="w-6 h-6 text-teal-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3 font-sans">Citizen Tier</h3>
              <p className="text-slate-600 text-sm leading-relaxed mb-4">
                Registers with state Government IDs (Aadhaar, Passport, driving licence, etc). Receives credentials verification instantly.
              </p>
              <ul className="text-xs text-slate-500 space-y-2 mb-6 font-mono">
                <li className="flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-teal-500" /> Instant Government ID validation
                </li>
                <li className="flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-teal-500" /> Endorse neighbors to promote verification
                </li>
              </ul>
            </div>
            <button
              onClick={() => onNavigate('/register/citizen')}
              className="text-teal-600 font-medium text-sm flex items-center gap-1 hover:text-teal-700 transition-colors w-full text-left"
            >
              Sign up as Citizen <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div id="feature-officer" className="bg-white p-8 rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center mb-6 border border-amber-100">
                <Landmark className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3 font-sans">Department Officer</h3>
              <p className="text-slate-600 text-sm leading-relaxed mb-4">
                Selects local municipal departments (Roads, Water, Sanitation, Electrical) and maps assigned geographic wards.
              </p>
              <ul className="text-xs text-slate-500 space-y-2 mb-6 font-mono">
                <li className="flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-amber-500" /> Employee ID registration roster
                </li>
                <li className="flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-amber-500" /> Review assignments under ward limits
                </li>
              </ul>
            </div>
            <button
              onClick={() => onNavigate('/register/officer')}
              className="text-amber-600 font-medium text-sm flex items-center gap-1 hover:text-amber-700 transition-colors w-full text-left"
            >
              Sign up as Officer <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div id="feature-admin" className="bg-white p-8 rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-6 border border-slate-200">
                <Shield className="w-6 h-6 text-slate-700" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3 font-sans">Platform Administrator</h3>
              <p className="text-slate-600 text-sm leading-relaxed mb-4">
                Centrally seeds admin instances, controls officer registrations, and reviews platform audits or suspensions.
              </p>
              <ul className="text-xs text-slate-500 space-y-2 mb-6 font-mono">
                <li className="flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-slate-600" /> Approve / Reject officer profiles
                </li>
                <li className="flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-slate-600" /> Global auditing & user management
                </li>
              </ul>
            </div>
            <button
              onClick={() => onNavigate('/login')}
              className="text-slate-700 font-medium text-sm flex items-center gap-1 hover:text-slate-800 transition-colors w-full text-left"
            >
              Access Admin Panel <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 px-6 border-t border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-white font-bold tracking-tight text-lg">CommunityComrade</span>
            <span className="text-xs bg-slate-800 text-teal-400 font-mono px-2 py-0.5 rounded border border-slate-700">MVP</span>
          </div>
          <p className="text-xs text-slate-500 font-mono">
            Hackathon MVP. All rights reserved. &copy; 2026.
          </p>
        </div>
      </footer>
    </div>
  );
}
