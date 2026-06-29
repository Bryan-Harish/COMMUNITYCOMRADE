import React, { useState, useRef } from 'react';
import { UserPlus, ArrowLeft, Loader2, Upload, FileCheck, CheckCircle2, MapPin } from 'lucide-react';
import MapCoordinatePicker from './issues/MapCoordinatePicker.js';

interface RegisterCitizenProps {
  onNavigate: (path: string) => void;
}

export default function RegisterCitizen({ onNavigate }: RegisterCitizenProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  
  const [governmentIdType, setGovernmentIdType] = useState<'Aadhaar' | 'Voter ID' | 'Driving License' | 'Passport'>('Aadhaar');
  const [governmentIdNumber, setGovernmentIdNumber] = useState('');
  const [governmentIdImageUrl, setGovernmentIdImageUrl] = useState('');
  
  // Locality & Ward selectors (with pre-fill shortcuts to ensure easy coordinate mapping)
  const [registeredAreaName, setRegisteredAreaName] = useState('Indiranagar');
  const [registeredWard, setRegisteredWard] = useState('Ward 80');
  const [registeredDistrict, setRegisteredDistrict] = useState('Bengaluru East');
  const [registeredState, setRegisteredState] = useState('Karnataka');
  const [latitude, setLatitude] = useState(12.9716);
  const [longitude, setLongitude] = useState(77.5946);
  const [isMapDialogOpen, setIsMapDialogOpen] = useState(false);

  const handleMapConfirm = (lat: number, lng: number, resAddress: string, district?: string, state?: string) => {
    setLatitude(lat);
    setLongitude(lng);
    
    if (district) {
      setRegisteredDistrict(district);
    }
    if (state) {
      setRegisteredState(state);
    }
    
    // If we have a reverse-geocoded address, try to fill it in or parse it for convenience!
    if (resAddress) {
      // If we can parse parts of the address, we can auto-fill some fields or at least set Area Name
      const parts = resAddress.split(',');
      if (parts.length > 0) {
        const primaryArea = parts[0].trim();
        // Set area name if it's not too long
        if (primaryArea.length < 50) {
          setRegisteredAreaName(primaryArea);
        }
      }
    }
  };

  const [dragActive, setDragActive] = useState(false);
  const [uploadFileName, setUploadFileName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Interactive Map boundaries
  const MAP_LAT_MIN = 12.9000;
  const MAP_LAT_MAX = 13.0000;
  const MAP_LNG_MIN = 77.5800;
  const MAP_LNG_MAX = 77.7800;

  // Preset quick location selectors for testers to easily place citizens in the same/different localities
  const LOCATION_PRESETS = [
    { name: 'Indiranagar (Ward 80, East Bengaluru)', area: 'Indiranagar', ward: 'Ward 80', district: 'Bengaluru East', state: 'Karnataka', lat: 12.9784, lng: 77.6408 },
    { name: 'Koramangala (Ward 151, South Bengaluru)', area: 'Koramangala', ward: 'Ward 151', district: 'Bengaluru South', state: 'Karnataka', lat: 12.9279, lng: 77.6271 },
    { name: 'Whitefield (Ward 84, East Bengaluru)', area: 'Whitefield', ward: 'Ward 84', district: 'Bengaluru East', state: 'Karnataka', lat: 12.9698, lng: 77.7500 },
  ];

  const applyLocationPreset = (preset: typeof LOCATION_PRESETS[0]) => {
    setRegisteredAreaName(preset.area);
    setRegisteredWard(preset.ward);
    setRegisteredDistrict(preset.district);
    setRegisteredState(preset.state);
    setLatitude(preset.lat);
    setLongitude(preset.lng);
  };

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
    // Convert to mock file path base64 or stable path for automatic validation
    const reader = new FileReader();
    reader.onloadend = () => {
      setGovernmentIdImageUrl(reader.result as string);
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

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
      setErrorMsg('Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number.');
      return;
    }

    if (!governmentIdImageUrl) {
      setErrorMsg('Please upload a Government ID Image file.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/register/citizen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          password,
          phoneNumber,
          governmentIdType,
          governmentIdNumber,
          governmentIdImageUrl,
          registeredAreaName,
          registeredWard,
          registeredDistrict,
          registeredState,
          latitude,
          longitude
        })
      });

      const resData = await response.json();

      if (!response.ok || !resData.success) {
        throw new Error(resData.error?.message || 'Failed to complete registration.');
      }

      setSuccessMsg('Registration successful! Your application has been submitted and is currently pending administrative review. Redirecting to login...');
      setTimeout(() => {
        onNavigate('/login');
      }, 3500);

    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during citizen registration.');
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
            <h2 className="text-2xl font-bold font-sans">Citizen Registration</h2>
            <p className="text-xs text-slate-400 mt-1">CommunityComrade Citizen Engagement Portal</p>
          </div>
        </div>

        {/* Content Form */}
        <div className="p-8">
          {errorMsg && (
            <div className="mb-6 p-4 bg-rose-50 border-l-4 border-rose-500 text-rose-800 text-sm flex items-start gap-2 rounded-r-lg">
              <CheckCircle2 className="w-5 h-5 text-rose-500 shrink-0 transform rotate-180" />
              <div>
                <p className="font-semibold">Registration Stopped</p>
                <p className="text-rose-600 mt-0.5">{errorMsg}</p>
              </div>
            </div>
          )}

          {successMsg && (
            <div className="mb-6 p-4 bg-teal-50 border-l-4 border-teal-500 text-teal-800 text-sm flex items-start gap-2.5 rounded-r-lg">
              <CheckCircle2 className="w-5 h-5 text-teal-500 shrink-0" />
              <div>
                <p className="font-semibold">Verification Application Submitted</p>
                <p className="text-teal-600 mt-0.5">{successMsg}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* 1. Basic Credentials */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100">
                1. Account Credentials
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-2">First Name</label>
                  <input
                    id="citizen-firstname-input"
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none text-slate-800"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-2">Last Name</label>
                  <input
                    id="citizen-lastname-input"
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none text-slate-800"
                    placeholder="Doe"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-2">Email Address</label>
                  <input
                    id="citizen-email-input"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none text-slate-800"
                    placeholder="john.doe@example.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-2">Phone Number</label>
                  <input
                    id="citizen-phone-input"
                    type="tel"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none text-slate-800"
                    placeholder="+91 98765 43210"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-2">Secure Password</label>
                  <input
                    id="citizen-password-input"
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

            {/* 2. Locality Registration */}
            <div>
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  2. Ward & Locality Details
                </h3>
                <div className="flex gap-2 items-center text-xs text-slate-400">
                  <MapPin className="w-3.5 h-3.5 text-teal-500" />
                  Select preset:
                </div>
              </div>

              {/* Presets Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
                {LOCATION_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applyLocationPreset(preset)}
                    className="p-2 border border-slate-200 hover:border-teal-500/50 hover:bg-teal-50/20 text-left rounded-lg text-xs text-slate-600 transition-all cursor-pointer font-medium animate-none"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-2">Registered Area Name</label>
                  <input
                    id="citizen-area-input"
                    type="text"
                    required
                    value={registeredAreaName}
                    onChange={(e) => setRegisteredAreaName(e.target.value)}
                    className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none text-slate-800"
                    placeholder="e.g. Indiranagar"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-2">Ward Number/Name</label>
                  <input
                    id="citizen-ward-input"
                    type="text"
                    required
                    value={registeredWard}
                    onChange={(e) => setRegisteredWard(e.target.value)}
                    className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none text-slate-800"
                    placeholder="e.g. Ward 80"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-2">District Name</label>
                  <input
                    id="citizen-district-input"
                    type="text"
                    required
                    value={registeredDistrict}
                    onChange={(e) => setRegisteredDistrict(e.target.value)}
                    className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none text-slate-800"
                    placeholder="e.g. Bengaluru East"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-2">State Sector</label>
                  <input
                    id="citizen-state-input"
                    type="text"
                    required
                    value={registeredState}
                    onChange={(e) => setRegisteredState(e.target.value)}
                    className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none text-slate-800"
                    placeholder="e.g. Karnataka"
                  />
                </div>
              </div>

              {/* GPS Coordinates & Interactive Google Map Launcher */}
              <div className="mb-6 bg-slate-900 rounded-2xl p-5 border border-slate-800 relative shadow-inner animate-fade-in">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-teal-500/10 text-teal-400 rounded-xl mt-0.5 shrink-0 border border-teal-500/20">
                      <MapPin className="w-5 h-5 animate-bounce" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                        <span className="flex h-2 w-2 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-400"></span>
                        </span>
                        Verified Citizen Locality GPS
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                        Pinpoint your primary residence to ensure accurate local ward assignments and routing of locality complaints.
                      </p>
                      
                      <div className="mt-3 flex flex-wrap gap-2.5 items-center">
                        <span className="px-2.5 py-1 bg-slate-800 border border-slate-700/60 rounded-lg text-[10px] font-mono text-teal-400">
                          LAT: {latitude.toFixed(6)}
                        </span>
                        <span className="px-2.5 py-1 bg-slate-800 border border-slate-700/60 rounded-lg text-[10px] font-mono text-teal-400">
                          LNG: {longitude.toFixed(6)}
                        </span>
                        {registeredAreaName && (
                          <span className="px-2 py-0.5 bg-teal-500/10 text-teal-400 border border-teal-500/20 rounded text-[10px] font-semibold">
                            {registeredAreaName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-row sm:flex-col gap-2 w-full sm:w-auto self-stretch sm:self-auto justify-end shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsMapDialogOpen(true)}
                      className="flex-1 sm:flex-none px-4 py-2 bg-teal-500 hover:bg-teal-600 active:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md hover:shadow-lg hover:shadow-teal-500/15 text-center"
                    >
                      <MapPin className="w-4 h-4 text-white" />
                      Pick via GPS / Map
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setLatitude(12.9716);
                        setLongitude(77.5946);
                        setRegisteredAreaName('Indiranagar');
                        setRegisteredDistrict('Bengaluru East');
                        setRegisteredState('Karnataka');
                      }}
                      className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-850 text-slate-400 hover:text-slate-300 rounded-xl text-[10px] font-bold text-center cursor-pointer transition-colors border border-slate-750"
                    >
                      Reset Coordinates
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-2">Geographic Latitude</label>
                  <input
                    id="citizen-lat-input"
                    type="number"
                    step="0.000001"
                    required
                    value={latitude}
                    onClick={() => setIsMapDialogOpen(true)}
                    onFocus={() => setIsMapDialogOpen(true)}
                    onChange={(e) => setLatitude(parseFloat(e.target.value))}
                    className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none text-slate-800 font-mono cursor-pointer hover:bg-slate-100/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-2">Geographic Longitude</label>
                  <input
                    id="citizen-lng-input"
                    type="number"
                    step="0.000001"
                    required
                    value={longitude}
                    onClick={() => setIsMapDialogOpen(true)}
                    onFocus={() => setIsMapDialogOpen(true)}
                    onChange={(e) => setLongitude(parseFloat(e.target.value))}
                    className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none text-slate-800 font-mono cursor-pointer hover:bg-slate-100/50 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* 3. Government Verification */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100">
                3. Identity Document & Auto Verification
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-2">Government ID Type</label>
                  <select
                    id="citizen-idtype-select"
                    value={governmentIdType}
                    onChange={(e) => setGovernmentIdType(e.target.value as any)}
                    className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none text-slate-800 font-semibold"
                  >
                    <option value="Aadhaar">Aadhaar (12-Digit Card)</option>
                    <option value="Voter ID">Voter ID</option>
                    <option value="Driving License">Driving License</option>
                    <option value="Passport">Passport Number</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-2">Government ID Number</label>
                  <input
                    id="citizen-idnum-input"
                    type="text"
                    required
                    value={governmentIdNumber}
                    onChange={(e) => setGovernmentIdNumber(e.target.value)}
                    className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none text-slate-800 font-mono"
                    placeholder="1234 5678 9012"
                  />
                </div>
              </div>

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
                    : governmentIdImageUrl
                    ? 'border-emerald-500 bg-emerald-50/5'
                    : 'border-slate-300 hover:border-teal-400 bg-slate-50/50 hover:bg-slate-50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  id="government-id-file-input"
                  type="file"
                  accept="image/*"
                  onChange={handleFileInput}
                  className="hidden"
                />
                
                {governmentIdImageUrl ? (
                  <div className="space-y-3">
                    <div className="w-12 h-12 bg-emerald-500/10 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
                      <FileCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Identity File Uploaded</p>
                      <p className="text-xs text-slate-400 font-mono mt-1">{uploadFileName || 'government_id_card.png'}</p>
                    </div>
                    <div className="max-w-[200px] h-[100px] mx-auto border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm mt-2">
                      <img src={governmentIdImageUrl} alt="Government ID Preview" className="w-full h-full object-cover" />
                    </div>
                    <p className="text-xs text-teal-600 font-medium font-sans">
                      Click or drag a new file to change.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="w-12 h-12 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center mx-auto border border-slate-200">
                      <Upload className="w-6 h-6 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700">Drag & drop Government ID Card here</p>
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
              id="citizen-register-submit-btn"
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-teal-500 hover:bg-teal-600 active:bg-teal-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-lg shadow-teal-500/10 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating verified account...
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  Register & Verify Account
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-400">
            Already have an account?{' '}
            <button
              onClick={() => onNavigate('/login')}
              className="text-teal-600 font-semibold hover:underline cursor-pointer"
            >
              Portal Sign In
            </button>
          </div>

        </div>
      </div>

      {isMapDialogOpen && (
        <MapCoordinatePicker
          isOpen={isMapDialogOpen}
          onClose={() => setIsMapDialogOpen(false)}
          initialLat={latitude}
          initialLng={longitude}
          defaultLat={12.9716}
          defaultLng={77.5946}
          onConfirm={handleMapConfirm}
        />
      )}
    </div>
  );
}
