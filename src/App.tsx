import React, { useState, useEffect } from 'react';
import { getSession, saveSession, clearSession } from './utils/auth.js';
import LandingPage from './components/LandingPage.js';
import LoginForm from './components/LoginForm.js';
import RegisterCitizen from './components/RegisterCitizen.js';
import RegisterOfficer from './components/RegisterOfficer.js';
import CitizenDashboard from './components/CitizenDashboard.js';
import OfficerDashboard from './components/OfficerDashboard.js';
import AdminDashboard from './components/AdminDashboard.js';

export default function App() {
  const [currentPath, setCurrentPath] = useState<string>(window.location.pathname || '/');
  const [session, setSession] = useState(getSession());

  // Listen to path changes and popstate
  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname || '/');
    };

    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  const navigateTo = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  const handleLoginSuccess = (user: any, token: string) => {
    saveSession(user, token);
    setSession({ user, token });
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error('Logout error', e);
    }
    clearSession();
    setSession({ user: null, token: null });
    navigateTo('/');
  };

  // Guard routing for protected routes
  const isProtectedRoute = currentPath.startsWith('/portal');
  if (isProtectedRoute && !session.user) {
    // Force redirect to login if session is empty
    return (
      <LoginForm
        onNavigate={navigateTo}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  // Render components based on currentPath
  const renderContent = () => {
    // 1. Prefix matches for portal dashboards to support dynamic route variables
    if (currentPath.startsWith('/portal/citizen')) {
      if (session.user?.role !== 'CITIZEN') {
        return <LandingPage onNavigate={navigateTo} user={session.user} />;
      }
      let subPath: 'dashboard' | 'profile' | 'issues' | 'issues-new' | 'details' | 'analytics' | 'helplines' = 'dashboard';
      let issueId = '';

      if (currentPath === '/portal/citizen/profile') {
        subPath = 'profile';
      } else if (currentPath === '/portal/citizen/analytics') {
        subPath = 'analytics';
      } else if (currentPath === '/portal/citizen/issues') {
        subPath = 'issues';
      } else if (currentPath === '/portal/citizen/issues/new') {
        subPath = 'issues-new';
      } else if (currentPath === '/portal/citizen/helplines') {
        subPath = 'helplines';
      } else if (currentPath.startsWith('/portal/citizen/issues/')) {
        subPath = 'details';
        issueId = currentPath.substring('/portal/citizen/issues/'.length);
      }

      return (
        <CitizenDashboard
          onNavigate={navigateTo}
          user={session.user}
          onLogout={handleLogout}
          subPath={subPath}
          issueId={issueId}
        />
      );
    }

    if (currentPath.startsWith('/portal/officer')) {
      if (session.user?.role !== 'DEPARTMENT_OFFICER') {
        return <LandingPage onNavigate={navigateTo} user={session.user} />;
      }
      let officerSubPath: 'dashboard' | 'profile' | 'issues' | 'details' | 'analytics' | 'leaderboard' | 'helplines' = 'dashboard';
      let officerIssueId = '';

      if (currentPath === '/portal/officer/profile') {
        officerSubPath = 'profile';
      } else if (currentPath === '/portal/officer/analytics') {
        officerSubPath = 'analytics';
      } else if (currentPath === '/portal/officer/issues') {
        officerSubPath = 'issues';
      } else if (currentPath === '/portal/officer/helplines') {
        officerSubPath = 'helplines';
      } else if (currentPath === '/portal/officer/leaderboard') {
        officerSubPath = 'leaderboard';
      } else if (currentPath.startsWith('/portal/officer/issues/')) {
        officerSubPath = 'details';
        officerIssueId = currentPath.substring('/portal/officer/issues/'.length);
      }

      return (
        <OfficerDashboard
          onNavigate={navigateTo}
          user={session.user}
          onLogout={handleLogout}
          subPath={officerSubPath}
          issueId={officerIssueId}
        />
      );
    }

    if (currentPath.startsWith('/portal/admin')) {
      if (session.user?.role !== 'ADMIN') {
        return <LandingPage onNavigate={navigateTo} user={session.user} />;
      }
      let adminSubPath: 'dashboard' | 'users' | 'approvals' | 'issues' | 'details' | 'manual-review' | 'analytics' | 'helplines' | 'admin-helplines' = 'dashboard';
      let adminIssueId = '';

      if (currentPath === '/portal/admin/users') {
        adminSubPath = 'users';
      } else if (currentPath === '/portal/admin/analytics') {
        adminSubPath = 'analytics';
      } else if (currentPath === '/portal/admin/approvals' || currentPath === '/portal/admin/officer-approvals') {
        adminSubPath = 'approvals';
      } else if (currentPath === '/portal/admin/issues') {
        adminSubPath = 'issues';
      } else if (currentPath === '/portal/admin/manual-review') {
        adminSubPath = 'manual-review';
      } else if (currentPath === '/portal/admin/helplines') {
        adminSubPath = 'helplines';
      } else if (currentPath === '/portal/admin/helplines/manage') {
        adminSubPath = 'admin-helplines';
      } else if (currentPath.startsWith('/portal/admin/issues/')) {
        adminSubPath = 'details';
        adminIssueId = currentPath.substring('/portal/admin/issues/'.length);
      }

      return (
        <AdminDashboard
          onNavigate={navigateTo}
          user={session.user}
          onLogout={handleLogout}
          subPath={adminSubPath}
          issueId={adminIssueId}
        />
      );
    }

    // 2. Exact match switch for other paths
    switch (currentPath) {
      case '/':
        return <LandingPage onNavigate={navigateTo} user={session.user} />;
      
      case '/login':
        return (
          <LoginForm
            onNavigate={navigateTo}
            onLoginSuccess={handleLoginSuccess}
          />
        );
      
      case '/register/citizen':
        return <RegisterCitizen onNavigate={navigateTo} />;
      
      case '/register/officer':
        return <RegisterOfficer onNavigate={navigateTo} />;

      default:
        return <LandingPage onNavigate={navigateTo} user={session.user} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {renderContent()}
    </div>
  );
}
