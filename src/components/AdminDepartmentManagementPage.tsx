import React, { useState, useEffect } from 'react';
import { 
  Building2, Plus, Edit2, Check, X, ShieldAlert, 
  MapPin, Clock, Mail, Globe, AlertCircle, Trash2, 
  RefreshCw, Power, CheckCircle
} from 'lucide-react';
import { getAuthHeaders } from '../utils/auth.js';
import { isValidHelplinePhone, isValidEmail, sanitizeText } from '../utils/validation.js';

interface AdminDepartmentManagementPageProps {
  user: any;
  onBack: () => void;
}

export default function AdminDepartmentManagementPage({ 
  user, 
  onBack 
}: AdminDepartmentManagementPageProps) {
  const [departments, setDepartments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Status and Banner states
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [associatedCategories, setAssociatedCategories] = useState<string[]>([]);
  const [primaryHelpline, setPrimaryHelpline] = useState('');
  const [escalationHelpline, setEscalationHelpline] = useState('');
  const [officeAddress, setOfficeAddress] = useState('');
  const [workingHours, setWorkingHours] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [isEmergencyDepartment, setIsEmergencyDepartment] = useState(false);
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');

  // Available categories inside database/issue schemas
  const categoriesList = [
    { key: 'POTHOLE', label: 'Road Potholes' },
    { key: 'STREETLIGHT', label: 'Streetlights' },
    { key: 'GARBAGE', label: 'Garbage & Waste' },
    { key: 'DRAINAGE', label: 'Drainage & Sewers' },
    { key: 'WATER_LEAKAGE', label: 'Water Leakage' },
    { key: 'ROAD_DAMAGE', label: 'Road Damage' },
    { key: 'TRAFFIC_SIGNAL', label: 'Traffic Signals' },
    { key: 'PUBLIC_SAFETY', label: 'Public Safety' },
    { key: 'OTHER', label: 'Other/General Issues' }
  ];

  const fetchAllDepartments = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      // Admins pull all departments, active and inactive
      const res = await fetch('/api/helpline/departments?status=all', {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDepartments(data.data || []);
      } else {
        throw new Error(data.error?.message || 'Failed to retrieve department listings.');
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Error occurred while loading department listings.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllDepartments();
  }, []);

  const handleCategoryToggle = (key: string) => {
    if (associatedCategories.includes(key)) {
      setAssociatedCategories(associatedCategories.filter(c => c !== key));
    } else {
      setAssociatedCategories([...associatedCategories, key]);
    }
  };

  const handleResetForm = () => {
    setName('');
    setDescription('');
    setAssociatedCategories([]);
    setPrimaryHelpline('');
    setEscalationHelpline('');
    setOfficeAddress('');
    setWorkingHours('');
    setEmail('');
    setWebsite('');
    setIsEmergencyDepartment(false);
    setStatus('ACTIVE');
    setIsEditing(false);
    setEditingId(null);
  };

  const handleEditClick = (dept: any) => {
    setName(dept.name || '');
    setDescription(dept.description || '');
    setAssociatedCategories(dept.associatedCategories || []);
    setPrimaryHelpline(dept.primaryHelpline || '');
    setEscalationHelpline(dept.escalationHelpline || '');
    setOfficeAddress(dept.officeAddress || '');
    setWorkingHours(dept.workingHours || '');
    setEmail(dept.email || '');
    setWebsite(dept.website || '');
    setIsEmergencyDepartment(dept.isEmergencyDepartment || false);
    setStatus(dept.status || 'ACTIVE');
    setIsEditing(true);
    setEditingId(dept.id || dept._id);
    
    // Smooth scroll up to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // 1. Sanitize text inputs
    const cleanName = sanitizeText(name);
    const cleanDescription = sanitizeText(description);
    const cleanPrimaryHelpline = sanitizeText(primaryHelpline).replace(/\s+/g, ''); // strip spacing
    const cleanEscalationHelpline = sanitizeText(escalationHelpline).replace(/\s+/g, '');
    const cleanOfficeAddress = sanitizeText(officeAddress);
    const cleanWorkingHours = sanitizeText(workingHours);
    const cleanEmail = sanitizeText(email);
    const cleanWebsite = sanitizeText(website);

    // 2. Front-end Validations
    if (!cleanName) {
      setErrorMsg('Department Name is required.');
      return;
    }
    if (!cleanDescription) {
      setErrorMsg('Description is required.');
      return;
    }
    if (!cleanPrimaryHelpline) {
      setErrorMsg('Primary Helpline Number is required.');
      return;
    }
    if (!isValidHelplinePhone(cleanPrimaryHelpline)) {
      setErrorMsg('Primary Helpline Number must be digits only, with optional + prefix.');
      return;
    }
    if (!cleanEscalationHelpline) {
      setErrorMsg('Escalation Helpline Number is required.');
      return;
    }
    if (!isValidHelplinePhone(cleanEscalationHelpline)) {
      setErrorMsg('Escalation Helpline Number must be digits only, with optional + prefix.');
      return;
    }
    if (!cleanOfficeAddress) {
      setErrorMsg('Office Address is required.');
      return;
    }
    if (!cleanWorkingHours) {
      setErrorMsg('Working Hours are required.');
      return;
    }
    if (cleanEmail && !isValidEmail(cleanEmail)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      const bodyPayload = {
        name: cleanName,
        description: cleanDescription,
        associatedCategories,
        primaryHelpline: cleanPrimaryHelpline,
        escalationHelpline: cleanEscalationHelpline,
        officeAddress: cleanOfficeAddress,
        workingHours: cleanWorkingHours,
        email: cleanEmail || undefined,
        website: cleanWebsite || undefined,
        isEmergencyDepartment,
        status
      };

      const endpoint = isEditing && editingId
        ? `/api/helpline/admin/departments/${editingId}`
        : '/api/helpline/admin/departments';

      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bodyPayload)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(
          isEditing 
            ? `Successfully updated department "${name}" details!` 
            : `Successfully created new department directory entry "${name}"!`
        );
        handleResetForm();
        fetchAllDepartments();
      } else {
        throw new Error(data.error?.message || 'Server rejected directory creation/update request.');
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'An error occurred while saving the department directory entry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (dept: any) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    const newStatus = dept.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const res = await fetch(`/api/helpline/admin/departments/${dept.id || dept._id}`, {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(`Status for "${dept.name}" updated to ${newStatus} successfully.`);
        fetchAllDepartments();
      } else {
        throw new Error(data.error?.message || 'Failed to toggle status.');
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'An error occurred while toggling the department status.');
    }
  };

  return (
    <div className="space-y-8" id="admin-dept-management-container">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 text-white p-6 rounded-2xl shadow-md border border-slate-800">
        <div className="flex items-center gap-3">
          <Building2 className="w-8 h-8 text-teal-400 shrink-0" />
          <div>
            <h2 className="text-xl font-bold tracking-tight">Admin Directory Manager</h2>
            <p className="text-xs text-slate-400 font-mono">Registry Administration Control Panel</p>
          </div>
        </div>
        <button
          onClick={onBack}
          className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-4 py-2 rounded-xl border border-slate-700 transition-all cursor-pointer"
        >
          ← Back to Directory View
        </button>
      </div>

      {/* Form and Quick Banners */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-900/5 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
          <h3 className="font-sans font-bold text-slate-800 text-sm">
            {isEditing ? `📝 Edit Listing: ${name}` : '✨ Add New Civic Department Listing'}
          </h3>
          {isEditing && (
            <button
              onClick={handleResetForm}
              className="text-xs text-rose-500 hover:text-rose-600 font-semibold transition-colors cursor-pointer"
            >
              Cancel Edit
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
          {errorMsg && (
            <div className="p-4 bg-red-50 border border-red-100 text-red-900 rounded-xl flex items-start gap-2 text-xs">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Validation / Duplicate Block</p>
                <p className="text-red-700 mt-0.5">{errorMsg}</p>
              </div>
            </div>
          )}

          {successMsg && (
            <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-950 rounded-xl flex items-start gap-2 text-xs">
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Success</p>
                <p className="text-emerald-700 mt-0.5">{successMsg}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Department Name */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Department Name *</label>
              <input
                type="text"
                placeholder="e.g. Roads & Highways Department"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                required
              />
            </div>

            {/* Emergency Department Flag */}
            <div className="flex items-center justify-between bg-slate-50 border border-slate-200/60 p-4 rounded-xl">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-500 shrink-0" />
                <div>
                  <span className="block text-xs font-bold text-slate-800">Emergency Department</span>
                  <p className="text-[10px] text-slate-500">Flags department with warning icon & docks it at top</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={isEmergencyDepartment}
                onChange={(e) => setIsEmergencyDepartment(e.target.checked)}
                className="w-4 h-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded cursor-pointer"
              />
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Department Description *</label>
              <textarea
                placeholder="Describe the main public services, administrative focus, and citizen complaints handled by this department..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 h-20 resize-none"
                required
              />
            </div>

            {/* Helplines */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Primary Helpline Number *</label>
              <input
                type="text"
                placeholder="e.g. 1800-111-222"
                value={primaryHelpline}
                onChange={(e) => setPrimaryHelpline(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Escalation Helpline Number *</label>
              <input
                type="text"
                placeholder="e.g. +91 98765 43210"
                value={escalationHelpline}
                onChange={(e) => setEscalationHelpline(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
                required
              />
            </div>

            {/* Address & Hours */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Office Physical Address *</label>
              <input
                type="text"
                placeholder="e.g. Room 402, 4th Floor, Municipal HQ"
                value={officeAddress}
                onChange={(e) => setOfficeAddress(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Office working Hours *</label>
              <input
                type="text"
                placeholder="e.g. Mon-Sat: 9:00 AM - 6:00 PM"
                value={workingHours}
                onChange={(e) => setWorkingHours(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                required
              />
            </div>

            {/* Email & Website */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Official Public Email (Optional)</label>
              <input
                type="email"
                placeholder="e.g. admin@roads.gov.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Official Website URL (Optional)</label>
              <input
                type="url"
                placeholder="e.g. https://pwd.municipal.gov.in"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
              />
            </div>

            {/* Status (Active/Inactive) */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Listing Activation Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
              >
                <option value="ACTIVE">ACTIVE (Visible to general public)</option>
                <option value="INACTIVE">INACTIVE (Hidden in citizen lists)</option>
              </select>
            </div>
          </div>

          {/* Associated Categories Picker */}
          <div className="border-t border-slate-100 pt-6">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
              🛠️ Associated Issue Categories
            </label>
            <p className="text-xs text-slate-500 mb-4">When a citizen logs an issue matching these categories, this contact card will be dynamically linked.</p>
            <div className="flex flex-wrap gap-2">
              {categoriesList.map((cat) => {
                const isSelected = associatedCategories.includes(cat.key);
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => handleCategoryToggle(cat.key)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-teal-50 text-teal-800 border-teal-300 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {isSelected && '✓ '}
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={handleResetForm}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-6 py-3 rounded-xl text-xs transition-all cursor-pointer"
            >
              Reset Form
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-slate-900 hover:bg-slate-800 text-white font-semibold px-8 py-3 rounded-xl text-xs transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              ) : isEditing ? (
                'Save Changes'
              ) : (
                'Create Listing'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Directory Listings List for Management */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-900/5 px-6 py-4 border-b border-slate-200">
          <h3 className="font-sans font-bold text-slate-800 text-sm">🗂️ Active Registry Administration List</h3>
        </div>

        {isLoading ? (
          <div className="p-16 flex flex-col items-center justify-center">
            <RefreshCw className="w-8 h-8 text-slate-300 animate-spin" />
            <p className="text-xs text-slate-400 font-mono mt-3">Refreshing registry records...</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {departments.map((dept) => {
              const isInactive = dept.status === 'INACTIVE';
              return (
                <div 
                  key={dept.id || dept._id} 
                  id={`admin-dept-row-${dept.id || dept._id}`}
                  className={`p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all ${
                    isInactive ? 'bg-slate-50/50' : 'hover:bg-slate-50/30'
                  }`}
                >
                  <div className="space-y-1 max-w-2xl">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-sans font-bold text-slate-900">{dept.name}</h4>
                      {dept.isEmergencyDepartment && (
                        <span className="bg-red-100 text-red-700 border border-red-200 text-[9px] font-bold px-2 py-0.5 rounded uppercase font-mono">
                          🚨 Emergency
                        </span>
                      )}
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase border font-mono ${
                        isInactive
                          ? 'bg-slate-100 text-slate-500 border-slate-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {dept.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">{dept.description}</p>
                    
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400 font-mono pt-1">
                      <span>Primary: {dept.primaryHelpline}</span>
                      <span>•</span>
                      <span>Escalation: {dept.escalationHelpline}</span>
                      {dept.email && (
                        <>
                          <span>•</span>
                          <span>Email: {dept.email}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleToggleStatus(dept)}
                      className={`p-2 rounded-xl border transition-all cursor-pointer ${
                        isInactive
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                      }`}
                      title={isInactive ? 'Activate Department' : 'Deactivate Department'}
                    >
                      <Power className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEditClick(dept)}
                      className="p-2 rounded-xl border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 transition-all cursor-pointer"
                      title="Edit Details"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
