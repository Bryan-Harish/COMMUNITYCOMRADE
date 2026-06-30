import React, { useState, useRef } from 'react';
import { Landmark, ArrowLeft, Loader2, Upload, FileCheck, CheckCircle2, ShieldAlert } from 'lucide-react';
import { 
  isValidName, 
  isValidPhone, 
  isValidEmail, 
  isValidGovernmentId, 
  sanitizeText 
} from '../utils/validation.js';

interface RegisterOfficerProps {
  onNavigate: (path: string) => void;
}

export default function RegisterOfficer({ onNavigate }: RegisterOfficerProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  
  const [employeeId, setEmployeeId] = useState('');
  const [departmentName, setDepartmentName] = useState('ROADS');
  const [departmentIdCardImageUrl, setDepartmentIdCardImageUrl] = useState('');
  
  // Assigned locality ranges
  const [assignedWard, setAssignedWard] = useState('Ward 80');
  const [assignedDistrict, setAssignedDistrict] = useState('Bengaluru East');
  const [assignedState, setAssignedState] = useState('Karnataka');

  const [dragActive, setDragActive] = useState(false);
  const [uploadFileName, setUploadFileName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const DEPARTMENTS = [
    { value: 'ROADS', label: 'Roads Department' },
    { value: 'WATER', label: 'Water Department' },
    { value: 'ELECTRICAL', label: 'Electrical Department' },
    { value: 'SANITATION', label: 'Sanitation Department' },
    { value: 'MUNICIPAL', label: 'Municipal Corporation' },
  ];

  // Drag and Drop implementation
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const processFile = (file: File) => {
    if (!file) return;
    setUploadFileName(file.name);
    const reader = new FileReader();
    reader.onloadend = () => {
      setDepartmentIdCardImageUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // 1. Sanitize text inputs
    const cleanFirstName = sanitizeText(firstName);
    const cleanLastName = sanitizeText(lastName);
    const cleanEmail = sanitizeText(email);
    const cleanPhone = phoneNumber.replace(/\s+/g, ''); // strip spaces
    const cleanEmployeeId = sanitizeText(employeeId);
    const cleanDeptName = sanitizeText(departmentName);
    const cleanWard = sanitizeText(assignedWard);
    const cleanDistrict = sanitizeText(assignedDistrict);
    const cleanState = sanitizeText(assignedState);

    // 2. Perform validations
    if (!isValidName(cleanFirstName)) {
      setErrorMsg('Please enter a valid first name (2-100 characters, alphabets, spaces, periods, and hyphens only).');
      return;
    }

    if (!isValidName(cleanLastName)) {
      setErrorMsg('Please enter a valid last name (2-100 characters, alphabets, spaces, periods, and hyphens only).');
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    if (!isValidPhone(cleanPhone)) {
      setErrorMsg('Phone number must contain exactly 10 digits.');
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
      setErrorMsg('Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number.');
      return;
    }

    if (!isValidGovernmentId(cleanEmployeeId)) {
      setErrorMsg('Please enter a valid Employee ID (alphanumeric, spaces, and hyphens only, no special character spam).');
      return;
    }

    if (!departmentIdCardImageUrl) {
      setErrorMsg('Please upload a copy of your Department ID Card.');
      return;
    }

    if (!cleanDeptName || !cleanWard || !cleanDistrict || !cleanState) {
      setErrorMsg('All department, ward, district, and state fields are required.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/register/officer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: cleanFirstName,
          lastName: cleanLastName,
          email: cleanEmail,
          password,
          phoneNumber: cleanPhone,
          employeeId: cleanEmployeeId,
          departmentName: cleanDeptName,
          departmentIdCardImageUrl,
          assignedWard: cleanWard,
          assignedDistrict: cleanDistrict,
          assignedState: cleanState
        })
      });

      const resData = await response.json();

      if (!response.ok || !resData.success) {
        throw new Error(resData.error?.message || 'Failed to complete officer registration.');
      }

      setSuccessMsg('Registration submitted! Your officer account status is set to PENDING_OFFICER_APPROVAL. Awaiting administrator evaluation.');
      setTimeout(() => {
        onNavigate('/login');
      }, 5000);

    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during officer registration.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen py-12 px-6 font-sans">
      <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white px-8 py-6 relative">
          <button
            onClick={() => onNavigate('/')}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <h2 className="text-2xl font-bold font-sans">Department Officer Registration</h2>
            <p className="text-xs text-slate-400 mt-1">CommunityComrade Administrative Roster</p>
          </div>
        </div>

        {/* Content Form */}
        <div className="p-8">
          {errorMsg && (
            <div className="mb-6 p-4 bg-rose-50 border-l-4 border-rose-500 text-rose-800 text-sm flex items-start gap-2.5 rounded-r-lg">
              <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0" />
              <div>
                <p className="font-semibold">Registration Halted</p>
                <p className="text-rose-600 mt-0.5">{errorMsg}</p>
              </div>
            </div>
          )}

          {successMsg && (
            <div className="mb-6 p-4 bg-amber-50 border-l-4 border-amber-500 text-amber-800 text-sm flex items-start gap-2.5 rounded-r-lg">
              <CheckCircle2 className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <p className="font-semibold">Submission Accepted & Queued</p>
                <p className="text-amber-700 mt-0.5">{successMsg}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* 1. Basic Credentials */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100">
                1. Basic Credentials
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-2">First Name</label>
                  <input
                    id="officer-firstname-input"
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none text-slate-800"
                    placeholder="Jane"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-2">Last Name</label>
                  <input
                    id="officer-lastname-input"
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none text-slate-800"
                    placeholder="Smith"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-2">Government Email Address</label>
                  <input
                    id="officer-email-input"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none text-slate-800"
                    placeholder="jane.smith@gov.in"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-2">Contact Phone Number</label>
                  <input
                    id="officer-phone-input"
                    type="tel"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none text-slate-800"
                    placeholder="+91 98765 11223"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-2">Secure Password</label>
                  <input
                    id="officer-password-input"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none text-slate-800"
                    placeholder="••••••••••••"
                  />
                </div>
              </div>
            </div>

            {/* 2. Departmental Roster Details */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100">
                2. Departmental & Roster Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-2">Department Division</label>
                  <select
                    id="officer-dept-select"
                    value={departmentName}
                    onChange={(e) => setDepartmentName(e.target.value)}
                    className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none text-slate-800 font-semibold"
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept.value} value={dept.value}>
                        {dept.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-2">Employee ID</label>
                  <input
                    id="officer-empid-input"
                    type="text"
                    required
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none text-slate-800 font-mono"
                    placeholder="EMP-88291"
                  />
                </div>
              </div>
            </div>

            {/* 3. Jurisdictional Area Range */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100">
                3. Assigned Jurisdictional Limits
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-2">Assigned Ward</label>
                  <input
                    id="officer-ward-input"
                    type="text"
                    required
                    value={assignedWard}
                    onChange={(e) => setAssignedWard(e.target.value)}
                    className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none text-slate-800"
                    placeholder="e.g. Ward 80"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-2">Assigned District</label>
                  <input
                    id="officer-district-input"
                    type="text"
                    required
                    value={assignedDistrict}
                    onChange={(e) => setAssignedDistrict(e.target.value)}
                    className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none text-slate-800"
                    placeholder="e.g. Bengaluru East"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-2">Assigned State</label>
                  <input
                    id="officer-state-input"
                    type="text"
                    required
                    value={assignedState}
                    onChange={(e) => setAssignedState(e.target.value)}
                    className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none text-slate-800"
                    placeholder="e.g. Karnataka"
                  />
                </div>
              </div>
            </div>

            {/* 4. Credentials Document Upload */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100">
                4. Credentials & Identification Verification
              </h3>
              
              {/* Drag and Drop Zone */}
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={triggerFileSelect}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  dragActive
                    ? 'border-teal-500 bg-teal-50/25'
                    : departmentIdCardImageUrl
                    ? 'border-amber-500 bg-amber-50/5'
                    : 'border-slate-300 hover:border-teal-400 bg-slate-50/50 hover:bg-slate-50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  id="department-id-file-input"
                  type="file"
                  accept="image/*"
                  onChange={handleFileInput}
                  className="hidden"
                />
                
                {departmentIdCardImageUrl ? (
                  <div className="space-y-3">
                    <div className="w-12 h-12 bg-amber-500/10 text-amber-600 rounded-full flex items-center justify-center mx-auto border border-amber-500/20">
                      <FileCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Department ID Card Uploaded</p>
                      <p className="text-xs text-slate-400 font-mono mt-1">{uploadFileName || 'employee_id_card.png'}</p>
                    </div>
                    <div className="max-w-[200px] h-[100px] mx-auto border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm mt-2">
                      <img src={departmentIdCardImageUrl} alt="Department ID Card Preview" className="w-full h-full object-cover" />
                    </div>
                    <p className="text-xs text-amber-600 font-medium font-sans">
                      Click or drag a new file to change.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="w-12 h-12 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center mx-auto border border-slate-200">
                      <Upload className="w-6 h-6 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700">Drag & drop Department ID Card / credentials file here</p>
                      <p className="text-xs text-slate-400 mt-1">Supports PNG, JPG, or PDF up to 3MB</p>
                    </div>
                    <p className="text-xs text-teal-600 font-semibold uppercase tracking-wider">
                      Or manual selection via click
                    </p>
                  </div>
                )}
              </div>
            </div>

            <button
              id="officer-register-submit-btn"
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 active:bg-black disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting roster details...
                </>
              ) : (
                <>
                  <Landmark className="w-5 h-5 text-amber-400" />
                  Submit Registration Request
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-400">
            Already registered?{' '}
            <button
              onClick={() => onNavigate('/login')}
              className="text-teal-600 font-semibold hover:underline cursor-pointer"
            >
              Portal Sign In
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
