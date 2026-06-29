import React, { useState, useEffect } from 'react';
import { 
  Phone, Search, Building2, Clock, Mail, Globe, 
  Copy, Check, AlertCircle, ShieldAlert, MapPin, 
  ExternalLink, Filter, Plus, Edit2, ToggleLeft, ToggleRight
} from 'lucide-react';
import { getAuthHeaders } from '../utils/auth.js';

interface DepartmentDirectoryPageProps {
  user: any;
  onNavigate?: (path: string) => void;
  onAdminManageClick?: () => void;
}

export default function DepartmentDirectoryPage({ 
  user, 
  onNavigate,
  onAdminManageClick 
}: DepartmentDirectoryPageProps) {
  const [departments, setDepartments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [emergencyOnly, setEmergencyOnly] = useState(false);
  
  // Feedback states for clipboard copy
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<'primary' | 'escalation' | null>(null);

  // Available categories to filter on matching issues schema
  const categoriesList = [
    { key: 'ALL', label: 'All Categories' },
    { key: 'POTHOLE', label: 'Road Potholes' },
    { key: 'STREETLIGHT', label: 'Streetlights' },
    { key: 'GARBAGE', label: 'Garbage & Waste' },
    { key: 'DRAINAGE', label: 'Drainage & Sewers' },
    { key: 'WATER_LEAKAGE', label: 'Water Leakage' },
    { key: 'ROAD_DAMAGE', label: 'Road Damage' },
    { key: 'TRAFFIC_SIGNAL', label: 'Traffic Signals' },
    { key: 'PUBLIC_SAFETY', label: 'Public Safety' }
  ];

  const fetchDepartments = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const url = new URL('/api/helpline/departments', window.location.origin);
      if (selectedCategory !== 'ALL') {
        url.searchParams.append('category', selectedCategory);
      }
      if (emergencyOnly) {
        url.searchParams.append('isEmergency', 'true');
      }
      if (searchQuery.trim()) {
        url.searchParams.append('query', searchQuery.trim());
      }
      // Admins should fetch everything including inactive to manage
      if (user?.role === 'ADMIN') {
        url.searchParams.append('status', 'all');
      }

      const res = await fetch(url.toString(), {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDepartments(data.data || []);
      } else {
        throw new Error(data.error?.message || 'Failed to fetch directory list.');
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Error occurred while loading department helpline listings.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, [selectedCategory, emergencyOnly]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDepartments();
  };

  const handleCopy = (text: string, deptId: string, type: 'primary' | 'escalation') => {
    navigator.clipboard.writeText(text);
    setCopiedId(deptId);
    setCopiedField(type);
    setTimeout(() => {
      setCopiedId(null);
      setCopiedField(null);
    }, 2000);
  };

  const isAdmin = user?.role === 'ADMIN';

  return (
    <div className="space-y-6">
      {/* Directory Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 rounded-2xl shadow-md border border-slate-700">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Official Helpline Directory</h2>
          <p className="text-xs text-slate-300 font-mono mt-1">
            Instant connectivity to Municipal Civic Administration & Emergency Responders
          </p>
        </div>
        {isAdmin && (
          <button
            id="admin-manage-helpline-btn"
            onClick={onAdminManageClick}
            className="flex items-center gap-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold px-4 py-2 rounded-xl text-sm transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Manage Helpline Listings
          </button>
        )}
      </div>

      {/* Searching & Quick Filter Bar */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search departments by name, services, keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm transition-all"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="bg-slate-900 hover:bg-slate-800 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0"
            >
              <Search className="w-4 h-4" />
              Search
            </button>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('ALL');
                setEmergencyOnly(false);
                // Trigger a clean reload
                setTimeout(fetchDepartments, 0);
              }}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-3 rounded-xl text-sm transition-all cursor-pointer shrink-0"
            >
              Reset
            </button>
          </div>
        </form>

        {/* Category Filters Chips */}
        <div className="border-t border-slate-100 pt-4">
          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Filter by Incident Category Association
          </span>
          <div className="flex flex-wrap gap-1.5">
            {categoriesList.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  selectedCategory === cat.key
                    ? 'bg-teal-500 text-slate-950 shadow-sm'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Emergency Services Toggle */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          <div className="flex items-center gap-2">
            <div className="bg-red-50 text-red-600 p-1.5 rounded-lg border border-red-100">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <span className="block text-sm font-bold text-slate-800">🚨 Emergency Departments Only</span>
              <p className="text-xs text-slate-500">Show only round-the-clock emergency assistance lines (Police, Fire, Disaster etc.)</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setEmergencyOnly(!emergencyOnly)}
            className="text-slate-600 hover:text-slate-900 transition-colors focus:outline-none"
          >
            {emergencyOnly ? (
              <ToggleRight className="w-12 h-8 text-red-500 shrink-0 cursor-pointer" />
            ) : (
              <ToggleLeft className="w-12 h-8 text-slate-300 shrink-0 cursor-pointer" />
            )}
          </button>
        </div>
      </div>

      {/* Directory Listings */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-teal-500 rounded-full animate-spin"></div>
          <p className="text-xs text-slate-500 font-mono mt-4">Retrieving helpline listings from registry database...</p>
        </div>
      ) : errorMsg ? (
        <div className="p-6 bg-red-50 border border-red-100 text-red-900 rounded-2xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm">Registry Sync Failure</p>
            <p className="text-xs text-red-700 mt-1">{errorMsg}</p>
          </div>
        </div>
      ) : departments.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
          <p className="text-sm font-semibold text-slate-600">No departments match your query.</p>
          <p className="text-xs text-slate-400">Try modifying your search criteria or toggling off the filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="department-listings-grid">
          {departments.map((dept) => {
            const isDeptEmerg = dept.isEmergencyDepartment;
            const isInactive = dept.status === 'INACTIVE';
            return (
              <div 
                key={dept.id || dept._id}
                id={`dept-card-${dept.id || dept._id}`}
                className={`bg-white rounded-2xl border transition-all hover:shadow-md overflow-hidden relative flex flex-col justify-between ${
                  isInactive 
                    ? 'border-slate-200 opacity-60 bg-slate-50/50' 
                    : isDeptEmerg 
                      ? 'border-red-200 shadow-sm hover:border-red-300 ring-1 ring-red-500/5' 
                      : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Emergency Top Banner */}
                {isDeptEmerg && (
                  <div className="bg-red-500 text-white px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5" /> 🚨 Critical Emergency Department
                  </div>
                )}

                {/* Main Info Body */}
                <div className="p-6 space-y-4 flex-1">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-sans font-bold text-lg text-slate-950">{dept.name}</h3>
                        {isInactive && (
                          <span className="text-[10px] font-bold bg-slate-200 text-slate-600 border border-slate-300 px-2 py-0.5 rounded-full uppercase">
                            INACTIVE
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{dept.description}</p>
                    </div>
                    {!isDeptEmerg && (
                      <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 border border-slate-200/50">
                        <Building2 className="w-5 h-5" />
                      </div>
                    )}
                  </div>

                  {/* Helplines (Dual System) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    {/* Primary Helpline */}
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/60 relative group flex flex-col justify-between">
                      <div>
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Primary Helpline</span>
                        <a 
                          href={`tel:${dept.primaryHelpline}`}
                          className="text-base font-bold text-slate-900 font-mono tracking-tight hover:text-teal-600 transition-colors mt-1 block"
                        >
                          {dept.primaryHelpline}
                        </a>
                      </div>
                      <div className="flex justify-between items-center mt-2 pt-1 border-t border-slate-200/40">
                        <a 
                          href={`tel:${dept.primaryHelpline}`}
                          className="text-[10px] text-teal-600 hover:text-teal-700 font-bold flex items-center gap-1 font-sans"
                        >
                          <Phone className="w-3 h-3" /> Call
                        </a>
                        <button
                          onClick={() => handleCopy(dept.primaryHelpline, dept.id || dept._id, 'primary')}
                          className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-200/50 transition-all cursor-pointer"
                          title="Copy Number"
                        >
                          {copiedId === (dept.id || dept._id) && copiedField === 'primary' ? (
                            <Check className="w-3 h-3 text-emerald-500 stroke-[3]" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Escalation Helpline */}
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/60 relative group flex flex-col justify-between">
                      <div>
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Escalation contact</span>
                        <a 
                          href={`tel:${dept.escalationHelpline}`}
                          className="text-base font-bold text-slate-900 font-mono tracking-tight hover:text-rose-600 transition-colors mt-1 block"
                        >
                          {dept.escalationHelpline}
                        </a>
                      </div>
                      <div className="flex justify-between items-center mt-2 pt-1 border-t border-slate-200/40">
                        <a 
                          href={`tel:${dept.escalationHelpline}`}
                          className="text-[10px] text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 font-sans"
                        >
                          <Phone className="w-3 h-3" /> Escalate
                        </a>
                        <button
                          onClick={() => handleCopy(dept.escalationHelpline, dept.id || dept._id, 'escalation')}
                          className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-200/50 transition-all cursor-pointer"
                          title="Copy Number"
                        >
                          {copiedId === (dept.id || dept._id) && copiedField === 'escalation' ? (
                            <Check className="w-3 h-3 text-emerald-500 stroke-[3]" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Details parameters */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div className="flex items-start gap-2 text-xs text-slate-600">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <span>{dept.officeAddress}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>{dept.workingHours}</span>
                    </div>
                    {(dept.email || dept.website) && (
                      <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-1.5 text-xs">
                        {dept.email && (
                          <a 
                            href={`mailto:${dept.email}`}
                            className="flex items-center gap-1 text-slate-500 hover:text-teal-600 font-mono"
                          >
                            <Mail className="w-3.5 h-3.5" /> {dept.email}
                          </a>
                        )}
                        {dept.website && (
                          <a 
                            href={dept.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-slate-500 hover:text-teal-600 font-mono"
                          >
                            <Globe className="w-3.5 h-3.5" /> {dept.website.replace(/^https?:\/\//i, '')}
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer category chips list */}
                {dept.associatedCategories && dept.associatedCategories.length > 0 && (
                  <div className="px-6 py-3 bg-slate-50/50 border-t border-slate-100 flex flex-wrap gap-1">
                    {dept.associatedCategories.map((catKey: string) => {
                      const matchLabel = categoriesList.find(c => c.key === catKey)?.label || catKey;
                      return (
                        <span 
                          key={catKey}
                          className="text-[9px] font-mono bg-slate-200/50 text-slate-600 border border-slate-200 px-2 py-0.5 rounded"
                        >
                          {matchLabel}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
