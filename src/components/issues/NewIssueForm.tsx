import React, { useState, useEffect } from 'react';
import { ArrowLeft, MapPin, Upload, Video, Image, FileText, Check, AlertTriangle, ShieldCheck, RefreshCw, X } from 'lucide-react';
import { getAuthHeaders } from '../../utils/auth.js';
import MapCoordinatePicker from './MapCoordinatePicker.js';

interface NewIssueFormProps {
  onBack: () => void;
  onSuccess: (issueNumber: string) => void;
  citizenUser: any;
}

// Haversine Distance Formula (in km)
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

// Preset visual attachments for rapid simulation testing
const PRESET_MOCK_ASSETS = [
  {
    name: 'Asphalt Pothole',
    type: 'IMAGE',
    url: 'https://images.unsplash.com/photo-1515162305285-0293e4767cc2?w=800'
  },
  {
    name: 'Broken Streetlight',
    type: 'IMAGE',
    url: 'https://images.unsplash.com/photo-1542640244-7e672d6cef21?w=800'
  },
  {
    name: 'Overflowing Trash',
    type: 'IMAGE',
    url: 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?w=800'
  },
  {
    name: 'Burst Water Main',
    type: 'IMAGE',
    url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800'
  }
];

export default function NewIssueForm({ onBack, onSuccess, citizenUser }: NewIssueFormProps) {
  // Form values
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('POTHOLE');
  const [priority, setPriority] = useState('MEDIUM');
  
  // Geolocation values
  const [latitude, setLatitude] = useState<number | ''>('');
  const [longitude, setLongitude] = useState<number | ''>('');
  const [address, setAddress] = useState('');
  const [distanceCheck, setDistanceCheck] = useState<number | null>(null);

  // Media values
  const [uploadedMedia, setUploadedMedia] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Messaging
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [isMapDialogOpen, setIsMapDialogOpen] = useState(false);

  // Automatically pre-load citizen's registered coordinates for convenience
  useEffect(() => {
    if (citizenUser) {
      setLatitude(citizenUser.latitude || '');
      setLongitude(citizenUser.longitude || '');
      setAddress(citizenUser.registeredAreaName ? `${citizenUser.registeredAreaName}, Ward ${citizenUser.registeredWard}, ${citizenUser.registeredDistrict}` : '');
    }
  }, [citizenUser]);

  // Recalculate distance from user registered coordinates
  useEffect(() => {
    if (latitude !== '' && longitude !== '' && citizenUser?.latitude && citizenUser?.longitude) {
      const d = getDistance(citizenUser.latitude, citizenUser.longitude, Number(latitude), Number(longitude));
      setDistanceCheck(d);
    } else {
      setDistanceCheck(null);
    }
  }, [latitude, longitude, citizenUser]);

  // Grab current physical GPS location
  const handleAutoGPS = () => {
    setGpsLoading(true);
    setErrorMessage(null);
    
    if (!navigator.geolocation) {
      setErrorMessage("Your browser does not support geolocation tracking.");
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setLatitude(lat);
        setLongitude(lng);
        setAddress(`GPS Location Coords (${lat.toFixed(5)}, ${lng.toFixed(5)})`);
        setGpsLoading(false);
      },
      (error) => {
        console.warn("GPS lookup failed, using register preset fallback:", error);
        // Load citizen's registered coordinates
        setLatitude(citizenUser.latitude);
        setLongitude(citizenUser.longitude);
        setAddress(citizenUser.registeredAreaName ? `${citizenUser.registeredAreaName}, Ward ${citizenUser.registeredWard}, ${citizenUser.registeredDistrict}` : 'GPS Offline Fallback');
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  // Handle selected map coordinates and update input state values
  const handleMapConfirm = (lat: number, lng: number, resAddress: string) => {
    setLatitude(lat);
    setLongitude(lng);
    if (resAddress) {
      setAddress(resAddress);
    }
  };

  // Upload a physical local file
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newVideoCount = Array.from(files).filter((file: any) => file.type.startsWith('video/')).length;
    const existingVideoCount = uploadedMedia.filter(m => m.type === 'VIDEO').length;

    if (uploadedMedia.length + files.length > 2) {
      setErrorMessage("Maximum 2 media items allowed. You can upload up to 2 images or 1 video + 1 image.");
      return;
    }

    if (existingVideoCount + newVideoCount > 1) {
      setErrorMessage("Only 1 video evidence is allowed. You can upload up to 2 images or 1 video + 1 image.");
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // 1. Get Signed URL Parameters
        const signedRes = await fetch('/api/uploads/signed-url', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type
          })
        });

        const signedData = await signedRes.json();
        if (!signedRes.ok || !signedData.success) {
          throw new Error(signedData.error?.message || 'Failed to initialize GCS file key.');
        }

        const { uploadUrl, publicUrl, fileKey } = signedData.data;

        // 2. Perform direct binary upload (supports PUT/POST and stream-pipe in our server)
        const uploadRes = await fetch(uploadUrl, {
          method: 'POST', // Supports both, our handleLocalUpload processes req stream
          body: file
        });

        if (!uploadRes.ok) {
          throw new Error('Upload transit error. File could not be written.');
        }

        const fileType = file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE';

        setUploadedMedia(prev => [
          ...prev,
          {
            url: publicUrl,
            type: fileType,
            fileKey
          }
        ]);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'File upload failed. Try using a mock simulation template instead.');
    } finally {
      setIsUploading(false);
    }
  };

  // Attach sample images instantly
  const handleAttachPreset = (asset: typeof PRESET_MOCK_ASSETS[0]) => {
    if (uploadedMedia.length >= 2) {
      setErrorMessage("Maximum 2 media items allowed. You can upload up to 2 images or 1 video + 1 image.");
      return;
    }
    const existingVideoCount = uploadedMedia.filter(m => m.type === 'VIDEO').length;
    const isVideo = asset.type === 'VIDEO';
    if (isVideo && existingVideoCount >= 1) {
      setErrorMessage("Only 1 video evidence is allowed. You can upload up to 2 images or 1 video + 1 image.");
      return;
    }
    setUploadedMedia(prev => [
      ...prev,
      {
        url: asset.url,
        type: asset.type,
        fileKey: `mock_${Date.now()}_preset`
      }
    ]);
  };

  const handleRemoveMedia = (idx: number) => {
    setUploadedMedia(prev => prev.filter((_, i) => i !== idx));
  };

  // Submit Issue form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Front-end sanity bounds validation
    if (title.trim().length < 10 || title.trim().length > 100) {
      setErrorMessage("Complaint Title must be between 10 and 100 characters long.");
      return;
    }

    if (description.trim().length < 20 || description.trim().length > 1000) {
      setErrorMessage("Incident Description must be between 20 and 1000 characters long.");
      return;
    }

    if (latitude === '' || longitude === '') {
      setErrorMessage("Complaint GPS Coordinates are required. Pin your location.");
      return;
    }

    if (address.trim().length === 0) {
      setErrorMessage("Municipal location address is required.");
      return;
    }

    if (uploadedMedia.length === 0) {
      setErrorMessage("At least one media file (Image or Video) is required for evidence validation.");
      return;
    }

    if (distanceCheck !== null && distanceCheck > 2.0) {
      setErrorMessage(`You cannot file issues outside 2 km of your registered area. Current distance: ${distanceCheck.toFixed(2)} km.`);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/issues', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          latitude: Number(latitude),
          longitude: Number(longitude),
          address: address.trim(),
          media: uploadedMedia.map(m => ({ url: m.url, type: m.type }))
        })
      });

      const resData = await response.json();
      if (!response.ok || !resData.success) {
        throw new Error(resData.error?.message || 'Failed to report complaint.');
      }

      onSuccess(resData.data.issueNumber);
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during submission.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isOOR = distanceCheck !== null && distanceCheck > 2.0;

  return (
    <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm max-w-3xl mx-auto space-y-6">
      
      {/* Form header */}
      <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
        <button
          onClick={onBack}
          className="p-2 hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors cursor-pointer text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h3 className="font-bold text-lg text-slate-900 font-sans">Submit Civic Complaint</h3>
          <p className="text-xs text-slate-500 mt-0.5">File an infrastructure issue with media evidence and GPS location logs</p>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 bg-rose-50 border-l-4 border-rose-500 text-rose-800 text-xs rounded-r-lg flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Validation Error</p>
            <p className="text-rose-600 mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Row 1: Title */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
            Issue Title <span className="text-rose-500">*</span>
          </label>
          <input
            id="issue-title-input"
            type="text"
            required
            placeholder="E.g., Huge deep pothole near sector 4 traffic signal"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full p-3 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none text-slate-800"
          />
          <span className="block text-[10px] text-slate-400">10 to 100 characters. Length: {title.length}</span>
        </div>

        {/* Row 2: Description */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
            Detailed Incident Description <span className="text-rose-500">*</span>
          </label>
          <textarea
            id="issue-desc-input"
            required
            rows={4}
            placeholder="Provide precise details, when it happened, depth size, impacts on local vehicle traffic..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-3 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none text-slate-800"
          />
          <span className="block text-[10px] text-slate-400">20 to 1000 characters. Length: {description.length}</span>
        </div>

        {/* Row 3: Category & Priority */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Category Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-3 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:border-teal-500 outline-none text-slate-700"
            >
              <option value="POTHOLE">Road Pothole</option>
              <option value="STREETLIGHT">Streetlight Failure</option>
              <option value="GARBAGE">Garbage Accumulation</option>
              <option value="WATER_LEAKAGE">Water Leakage</option>
              <option value="UNCATEGORIZED">Uncategorized / Other</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Priority Severity</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full p-3 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:border-teal-500 outline-none text-slate-700"
            >
              <option value="LOW">Low - Minimal local disruption</option>
              <option value="MEDIUM">Medium - Average disruption</option>
              <option value="HIGH">High - Hazardous to life or vehicle safety</option>
            </select>
          </div>
        </div>

        {/* Section: GPS Location logs */}
        <div className="border-t border-slate-100 pt-6 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">GPS Boundary Verification</h4>
              <p className="text-[10px] text-slate-400 mt-0.5">Complaints must fall within a 2.0 km municipal radius limit of your home sector.</p>
            </div>
            <button
              type="button"
              onClick={() => setIsMapDialogOpen(true)}
              className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs hover:bg-slate-50 transition-colors flex items-center gap-1.5 font-semibold text-slate-600 cursor-pointer"
            >
              <MapPin className="w-3.5 h-3.5 text-teal-600" />
              Locate Current Coordinates
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase">Latitude Coordinate</label>
              <input
                type="number"
                step="any"
                required
                value={latitude}
                onChange={(e) => setLatitude(e.target.value === '' ? '' : Number(e.target.value))}
                onClick={() => setIsMapDialogOpen(true)}
                onFocus={() => setIsMapDialogOpen(true)}
                placeholder="Select on map"
                className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 outline-none text-slate-800 cursor-pointer hover:bg-slate-100/50 transition-colors"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase">Longitude Coordinate</label>
              <input
                type="number"
                step="any"
                required
                value={longitude}
                onChange={(e) => setLongitude(e.target.value === '' ? '' : Number(e.target.value))}
                onClick={() => setIsMapDialogOpen(true)}
                onFocus={() => setIsMapDialogOpen(true)}
                placeholder="Select on map"
                className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 outline-none text-slate-800 cursor-pointer hover:bg-slate-100/50 transition-colors"
              />
            </div>
          </div>
          <span className="block text-[10px] text-slate-400 italic">💡 Everytime there is an input for coordinates, a live interactive map will help you pinpoint the location.</span>

          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-400 uppercase">Exact Reference Address</label>
            <input
              type="text"
              required
              placeholder="E.g. Opposite Sector 4 Bus Stand, Main Road"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 outline-none text-slate-800"
            />
          </div>

          {/* Real-time distance metric display */}
          {distanceCheck !== null && (
            <div className={`p-3.5 rounded-xl border flex gap-2 text-xs ${
              isOOR 
                ? 'bg-rose-50 border-rose-200 text-rose-800' 
                : 'bg-teal-50/50 border-teal-200 text-teal-800'
            }`}>
              {isOOR ? (
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              ) : (
                <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-semibold">{isOOR ? 'Out of Boundaries limit' : 'Verified Location Boundary check'}</p>
                <p className="text-[10px] mt-0.5 leading-normal">
                  Distance from your registered home sector is <span className="font-bold">{distanceCheck.toFixed(2)} km</span>. 
                  {isOOR 
                    ? ' Platform rules prevent submitting complaints reported beyond a 2.0 km municipal radius limit.' 
                    : ' This complaint falls inside your eligible 2.0 km municipal community limits.'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Section: Upload Media & Preset Simulation templates */}
        <div className="border-t border-slate-100 pt-6 space-y-4">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
            Media Complaint Evidence <span className="text-rose-500">*</span>
          </label>

          {/* File selector Dropzone */}
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-5 hover:border-teal-500/50 transition-colors bg-slate-50/50 text-center relative cursor-pointer">
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer"
              disabled={isUploading}
            />
            {isUploading ? (
              <div className="flex flex-col items-center justify-center space-y-2">
                <RefreshCw className="w-8 h-8 text-teal-500 animate-spin" />
                <p className="text-xs font-semibold text-teal-700">Writing media packets to GCS Bucket...</p>
              </div>
            ) : (
              <div className="space-y-1">
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-1" />
                <p className="text-xs font-bold text-slate-700">Choose Files or Drag & Drop</p>
                <p className="text-[10px] text-slate-400 font-mono">JPG, PNG, MP4 up to 50MB</p>
                <p className="text-[10px] text-amber-600 font-semibold font-sans mt-1">⚠️ Maximum 2 items allowed (2 images or 1 video + 1 image)</p>
              </div>
            )}
          </div>

          {/* Preset Visuals Rapid Simulation Panel */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
              💡 Interactive Testing Shortcuts (Preloaded Unsplash Assets):
            </p>
            <div className="flex flex-wrap gap-2">
              {PRESET_MOCK_ASSETS.map((asset) => (
                <button
                  key={asset.name}
                  type="button"
                  onClick={() => handleAttachPreset(asset)}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 hover:border-teal-500/50 rounded-lg text-[10px] font-bold text-slate-600 hover:text-teal-700 cursor-pointer transition-colors"
                >
                  + {asset.name} Photo
                </button>
              ))}
            </div>
          </div>

          {/* Uploaded assets lists preview */}
          {uploadedMedia.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
              {uploadedMedia.map((media, idx) => (
                <div key={idx} className="relative aspect-video border rounded-lg overflow-hidden group bg-slate-900">
                  {media.type === 'VIDEO' ? (
                    <video src={media.url} className="w-full h-full object-cover" controls={false} />
                  ) : (
                    <img src={media.url} alt="Attached Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  )}
                  
                  {/* Remove indicator */}
                  <button
                    type="button"
                    onClick={() => handleRemoveMedia(idx)}
                    className="absolute top-1.5 right-1.5 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>

                  <div className="absolute bottom-1 left-1.5 text-[9px] font-semibold text-white bg-slate-950/60 px-1 rounded">
                    {media.type}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit action */}
        <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
          <button
            type="button"
            onClick={onBack}
            className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold cursor-pointer text-slate-600 transition-colors"
          >
            Cancel
          </button>
          <button
            id="report-issue-submit-btn"
            type="submit"
            disabled={isSubmitting || isOOR}
            className="px-6 py-2.5 bg-teal-500 hover:bg-teal-600 disabled:bg-slate-200 disabled:text-slate-400 disabled:border-slate-200 text-white font-semibold text-xs rounded-xl transition-all shadow-lg shadow-teal-500/15 cursor-pointer flex items-center gap-1.5"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Submitting Complaint...
              </>
            ) : (
              'Submit Complaint Record'
            )}
          </button>
        </div>

      </form>

      {isMapDialogOpen && (
        <MapCoordinatePicker
          isOpen={isMapDialogOpen}
          onClose={() => setIsMapDialogOpen(false)}
          initialLat={latitude}
          initialLng={longitude}
          defaultLat={citizenUser?.latitude || 12.9716}
          defaultLng={citizenUser?.longitude || 77.5946}
          onConfirm={handleMapConfirm}
        />
      )}
    </div>
  );
}
