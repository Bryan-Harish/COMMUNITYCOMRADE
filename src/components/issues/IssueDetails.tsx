import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  User,
  Tag,
  Shield,
  RefreshCw,
  AlertCircle,
  FileText,
  CheckCircle,
  Clock,
  Sparkles,
  AlertTriangle,
  Check,
  RotateCcw,
  Upload,
  Navigation,
  UserCheck,
  Briefcase,
  ExternalLink,
  Lock,
  History,
  Building2,
  Phone,
  X
} from 'lucide-react';
import { getAuthHeaders, getSession } from '../../utils/auth.js';
import IssueDiscussion from './IssueDiscussion.js';

const normalizeDept = (dept: string): string => {
  if (!dept) return '';
  const d = dept.toUpperCase();
  if (d.includes('ROAD') || d.includes('TRAFFIC')) return 'ROADS';
  if (d.includes('WATER') || d.includes('DRAIN') || d.includes('LEAK')) return 'WATER';
  if (d.includes('ELECTR') || d.includes('LIGHT')) return 'ELECTRICAL';
  if (d.includes('SANITAT') || d.includes('GARBAGE') || d.includes('WASTE') || d.includes('CLEAN')) return 'SANITATION';
  if (d.includes('MUNICIP') || d.includes('ADMIN') || d.includes('CORP')) return 'MUNICIPAL';
  return d;
};

interface IssueDetailsProps {
  issueNumber: string;
  onBack: () => void;
  role: 'CITIZEN' | 'DEPARTMENT_OFFICER' | 'ADMIN';
}

export default function IssueDetails({ issueNumber, onBack, role }: IssueDetailsProps) {
  const [issue, setIssue] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'discussion'>('details');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Feature 4 States
  const [resolutionDetails, setResolutionDetails] = useState<any>(null);
  const [resolutionHistory, setResolutionHistory] = useState<any[]>([]);
  const [officers, setOfficers] = useState<any[]>([]);
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedWard, setSelectedWard] = useState('');
  const [selectedOfficerId, setSelectedOfficerId] = useState('');
  const [assignmentReason, setAssignmentReason] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const [reopenReason, setReopenReason] = useState('');

  // Officer Submission States
  const [resNotes, setResNotes] = useState('');
  const [resMediaUrl, setResMediaUrl] = useState('');
  const [resUploadedMedia, setResUploadedMedia] = useState<{ url: string, type: 'IMAGE' | 'VIDEO' }[]>([]);
  const [resLat, setResLat] = useState<number | ''>('');
  const [resLng, setResLng] = useState<number | ''>('');
  const [resAddress, setResAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isUploadingEvidence, setIsUploadingEvidence] = useState(false);
  const [isGpsLoading, setIsGpsLoading] = useState(false);

  // Feature 5 States
  const [verifications, setVerifications] = useState<any[]>([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [voterMediaUrl, setVoterMediaUrl] = useState<string>('');
  const [voterMediaType, setVoterMediaType] = useState<'IMAGE' | 'VIDEO'>('IMAGE');
  const [isUploadingVoterMedia, setIsUploadingVoterMedia] = useState(false);

  const departments = [
    { id: 'ROADS', name: 'Roads Department' },
    { id: 'WATER', name: 'Water Department' },
    { id: 'ELECTRICAL', name: 'Electrical Department' },
    { id: 'SANITATION', name: 'Sanitation Department' },
    { id: 'MUNICIPAL', name: 'Municipal Corporation' }
  ];

  const fetchVerifications = async () => {
    try {
      const response = await fetch(`/api/issues/${issueNumber}/verifications`, {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setVerifications(data.data);
          
          const session = getSession();
          const currentUserId = session.user?.id;
          if (currentUserId) {
            const alreadyVoted = data.data.some((v: any) => String(v.citizenUserId) === String(currentUserId));
            setHasVoted(alreadyVoted);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch verifications:', err);
    }
  };

  const handleCastVote = async (action: 'APPROVE' | 'REJECT') => {
    setIsVoting(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      const response = await fetch(`/api/issues/${issueNumber}/verify`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          verificationAction: action,
          comment: commentText,
          media: voterMediaUrl ? [{ type: voterMediaType, url: voterMediaUrl }] : [],
          latitude: resLat || undefined,
          longitude: resLng || undefined,
          address: resAddress || undefined
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setSuccessMsg(data.message || 'Verification vote submitted successfully!');
        setCommentText('');
        setVoterMediaUrl('');
        setVoterMediaType('IMAGE');
        fetchIssueDetails();
      } else {
        throw new Error(data.error?.message || 'Failed to submit verification vote.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error submitting verification vote.');
    } finally {
      setIsVoting(false);
    }
  };

  const handleVoterMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingVoterMedia(true);
    setErrorMsg(null);

    try {
      const file = files[0];
      const isVideo = file.type.startsWith('video/');
      setVoterMediaType(isVideo ? 'VIDEO' : 'IMAGE');
      
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
        throw new Error(signedData.error?.message || 'Failed to initialize upload key.');
      }

      const { uploadUrl, publicUrl } = signedData.data;

      // 2. Perform direct binary upload
      const uploadRes = await fetch(uploadUrl, {
        method: 'POST',
        body: file
      });

      if (!uploadRes.ok) {
        throw new Error('Upload transit error. File could not be written.');
      }

      setVoterMediaUrl(publicUrl);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'File upload failed.');
    } finally {
      setIsUploadingVoterMedia(false);
    }
  };

  const fetchIssueDetails = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const response = await fetch(`/api/issues/${issueNumber}`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setIssue(data.data);
        setTimeline(data.data.timeline || []);
        setSelectedDept(normalizeDept(data.data.assignedDepartment || data.data.department || 'ROADS'));
        setSelectedWard(data.data.reporterWard || '');
        setSelectedOfficerId(data.data.assignedOfficerId || '');
        setAssignmentReason(data.data.assignmentReason || '');

        // Fetch resolution details and verification details if applicable
        if (['RESOLUTION_PENDING_VERIFICATION', 'COMMUNITY_VERIFIED', 'CLOSED'].includes(data.data.status)) {
          fetchResolutionDetails();
          fetchResolutionHistory();
          fetchVerifications();
        }
      } else {
        throw new Error(data.error?.message || 'Failed to fetch issue details.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Unable to load complaint details.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchResolutionDetails = async () => {
    try {
      const response = await fetch(`/api/issues/${issueNumber}/resolution`, {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setResolutionDetails(data.data);
        }
      }
    } catch (err) {
      console.error('Failed to load resolution details:', err);
    }
  };

  const fetchResolutionHistory = async () => {
    try {
      const response = await fetch(`/api/issues/${issueNumber}/resolution-history`, {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setResolutionHistory(data.data || []);
        }
      }
    } catch (err) {
      console.error('Failed to load resolution history:', err);
    }
  };

  const fetchApprovedOfficers = async () => {
    if (role !== 'ADMIN') return;
    try {
      const response = await fetch('/api/admin/officers', {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setOfficers(data.data || []);
        }
      }
    } catch (err) {
      console.error('Failed to load officers list:', err);
    }
  };

  useEffect(() => {
    fetchIssueDetails();
    fetchApprovedOfficers();
  }, [issueNumber]);

  // Admin Assignment Action
  const handleAssignIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const response = await fetch(`/api/admin/issues/${issueNumber}/assign`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          department: selectedDept,
          officerId: selectedOfficerId || undefined,
          assignmentReason: assignmentReason || undefined
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setSuccessMsg('Issue assigned successfully to department.');
        fetchIssueDetails();
      } else {
        throw new Error(data.error?.message || 'Failed to complete assignment.');
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Officer Actions: Accept
  const handleAcceptAssignment = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const response = await fetch(`/api/officer/issues/${issueNumber}/accept`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setSuccessMsg('Assignment accepted successfully.');
        fetchIssueDetails();
      } else {
        throw new Error(data.error?.message || 'Failed to accept assignment.');
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Officer Actions: Start Active Work
  const handleStartWork = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const response = await fetch(`/api/officer/issues/${issueNumber}/start`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setSuccessMsg('Active work commenced on the complaint.');
        fetchIssueDetails();
      } else {
        throw new Error(data.error?.message || 'Failed to start active work.');
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Officer Actions: Submit Resolution
  const handleSubmitResolution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resNotes || resNotes.trim().length < 20) {
      setErrorMsg('Resolution comments must be at least 20 characters in length.');
      return;
    }

    // Combine or resolve media array
    const finalMedia = resUploadedMedia.length > 0 
      ? resUploadedMedia 
      : (resMediaUrl ? [{ type: 'IMAGE' as const, url: resMediaUrl }] : []);

    if (finalMedia.length === 0) {
      setErrorMsg('A valid resolution photo evidence attachment is required.');
      return;
    }

    const hasImage = finalMedia.some(m => m.type === 'IMAGE');
    if (!hasImage) {
      setErrorMsg('At least one resolution IMAGE attachment is required.');
      return;
    }

    if (finalMedia.length > 2) {
      setErrorMsg('Maximum 2 media items allowed. You can upload 2 images or 1 video + 1 image.');
      return;
    }

    if (resLat === '' || resLng === '' || !resAddress) {
      setErrorMsg('Geo-verification location coordinates and physical address are required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const response = await fetch(`/api/officer/issues/${issueNumber}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          notes: resNotes,
          media: finalMedia,
          latitude: Number(resLat),
          longitude: Number(resLng),
          address: resAddress
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setSuccessMsg('Resolution evidence submitted successfully. Case pending admin closure.');
        fetchIssueDetails();
      } else {
        throw new Error(data.error?.message || 'Failed to submit resolution.');
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Admin Actions: Verify & Close
  const handleVerifyAndClose = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const response = await fetch(`/api/admin/issues/${issueNumber}/close`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ notes: closingNotes })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setSuccessMsg('Complaint officially verified and closed.');
        fetchIssueDetails();
      } else {
        throw new Error(data.error?.message || 'Failed to close issue.');
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Admin Actions: Reopen
  const handleReopenIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reopenReason || reopenReason.trim().length < 5) {
      setErrorMsg('A reopen reason of at least 5 characters is required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const response = await fetch(`/api/admin/issues/${issueNumber}/reopen`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ reason: reopenReason })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setSuccessMsg('Complaint reopened and routed back to assignment queue.');
        fetchIssueDetails();
      } else {
        throw new Error(data.error?.message || 'Failed to reopen issue.');
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Proximity simulator helper for Geolocation
  const handleSimulateProximityLocation = () => {
    if (!issue || !issue.location || !issue.location.coordinates) return;
    const issueLng = issue.location.coordinates[0];
    const issueLat = issue.location.coordinates[1];

    // Offset coordinates slightly (roughly 15 meters)
    const simulatedLat = issueLat + 0.00012;
    const simulatedLng = issueLng - 0.00008;

    setResLat(simulatedLat);
    setResLng(simulatedLng);
    setResAddress(`15m Proximity Sector, ${issue.address}`);
  };

  // Upload an evidence file
  const handleEvidenceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newVideoCount = Array.from(files).filter((file: any) => file.type.startsWith('video/')).length;
    const existingVideoCount = resUploadedMedia.filter(m => m.type === 'VIDEO').length;

    if (resUploadedMedia.length + files.length > 2) {
      setErrorMsg("Maximum 2 media items allowed. You can upload up to 2 images or 1 video + 1 image.");
      return;
    }

    if (existingVideoCount + newVideoCount > 1) {
      setErrorMsg("Only 1 video evidence is allowed. You can upload up to 2 images or 1 video + 1 image.");
      return;
    }

    setIsUploadingEvidence(true);
    setErrorMsg(null);

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
          throw new Error(signedData.error?.message || 'Failed to initialize upload key.');
        }

        const { uploadUrl, publicUrl } = signedData.data;

        // 2. Perform direct binary upload
        const uploadRes = await fetch(uploadUrl, {
          method: 'POST',
          body: file
        });

        if (!uploadRes.ok) {
          throw new Error('Upload transit error. File could not be written.');
        }

        const fileType = file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE';

        setResUploadedMedia(prev => [
          ...prev,
          { url: publicUrl, type: fileType }
        ]);
        
        if (fileType === 'IMAGE') {
          setResMediaUrl(publicUrl);
        }
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'File upload failed.');
    } finally {
      setIsUploadingEvidence(false);
    }
  };

  // Grab current physical GPS location
  const handleDetectGPS = () => {
    setIsGpsLoading(true);
    setErrorMsg(null);
    
    if (!navigator.geolocation) {
      setErrorMsg("Your browser does not support geolocation tracking.");
      setIsGpsLoading(false);
      return;
    }

    const optionsHigh = { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 };
    const optionsLow = { enableHighAccuracy: false, timeout: 12000, maximumAge: 60000 };

    const successCallback = (position: GeolocationPosition) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      setResLat(lat);
      setResLng(lng);
      setResAddress(`GPS Location Coords (${lat.toFixed(5)}, ${lng.toFixed(5)})`);
      setIsGpsLoading(false);
    };

    const tryIPGeolocation = async () => {
      try {
        const response = await fetch("https://ipapi.co/json/");
        if (response.ok) {
          const data = await response.json();
          if (data.latitude && data.longitude) {
            setResLat(Number(data.latitude));
            setResLng(Number(data.longitude));
            setResAddress(`IP-Based Location, ${data.city || 'Local Area'}`);
            setIsGpsLoading(false);
            return true;
          }
        }
      } catch (err) {
        console.warn("IP Geolocation fallback 1 failed:", err);
      }
      return false;
    };

    const handleFinalGPSError = async (err: any) => {
      console.warn("Final HTML5 Geolocation failed. Trying network backup...");
      const ipSuccess = await tryIPGeolocation();
      if (ipSuccess) return;

      setErrorMsg(`GPS lookup failed (${err.message || 'unknown'}). Please grant location permissions, use a modern secure browser, or click "Simulate Proximity" above.`);
      setIsGpsLoading(false);
    };

    navigator.geolocation.getCurrentPosition(
      successCallback,
      (error) => {
        console.warn("GPS lookup (high accuracy) failed:", error.message, "code:", error.code);
        if (error.code === error.TIMEOUT || error.code === error.POSITION_UNAVAILABLE) {
          navigator.geolocation.getCurrentPosition(
            successCallback,
            handleFinalGPSError,
            optionsLow
          );
        } else {
          handleFinalGPSError(error);
        }
      },
      optionsHigh
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <span className="bg-sky-50 text-sky-700 border border-sky-200 text-xs font-bold px-3 py-1.5 rounded-full uppercase">Open Complaint</span>;
      case 'ASSIGNED':
        return <span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold px-3 py-1.5 rounded-full uppercase">Officer Assigned</span>;
      case 'ACCEPTED':
        return <span className="bg-teal-50 text-teal-700 border border-teal-200 text-xs font-bold px-3 py-1.5 rounded-full uppercase">Job Accepted</span>;
      case 'IN_PROGRESS':
        return <span className="bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold px-3 py-1.5 rounded-full uppercase">Work In Progress</span>;
      case 'RESOLUTION_PENDING_VERIFICATION':
        return <span className="bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold px-3 py-1.5 rounded-full uppercase">Verification Pending</span>;
      case 'COMMUNITY_VERIFIED':
        return <span className="bg-teal-50 text-teal-700 border border-teal-200 text-xs font-bold px-3 py-1.5 rounded-full uppercase">Community Verified</span>;
      case 'CLOSED':
        return <span className="bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold px-3 py-1.5 rounded-full uppercase">Case Closed</span>;
      case 'REJECTED':
        return <span className="bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold px-3 py-1.5 rounded-full uppercase">Rejected Case</span>;
      case 'REOPENED':
        return <span className="bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold px-3 py-1.5 rounded-full uppercase">Case Reopened</span>;
      case 'MANUAL_REVIEW':
        return <span className="bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold px-3 py-1.5 rounded-full uppercase">Manual Review</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold px-3 py-1.5 rounded-full uppercase">{status}</span>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return <span className="bg-rose-100 text-rose-800 border border-rose-200 text-xs font-bold px-3 py-1.5 rounded-lg">Critical Severity</span>;
      case 'HIGH':
        return <span className="bg-red-50 text-red-700 border border-red-200 text-xs font-bold px-3 py-1.5 rounded-lg">High Severity</span>;
      case 'MEDIUM':
        return <span className="bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold px-3 py-1.5 rounded-lg">Medium Severity</span>;
      case 'LOW':
        return <span className="bg-slate-50 text-slate-600 border border-slate-200 text-xs font-bold px-3 py-1.5 rounded-lg">Low Severity</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold px-3 py-1.5 rounded-lg">{priority}</span>;
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'ISSUE_CREATED':
        return <div className="w-8 h-8 bg-sky-50 text-sky-600 rounded-full flex items-center justify-center border border-sky-100 shrink-0"><FileText className="w-4 h-4" /></div>;
      case 'ISSUE_ASSIGNED':
        return <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center border border-blue-100 shrink-0"><Briefcase className="w-4 h-4" /></div>;
      case 'ISSUE_ACCEPTED':
        return <div className="w-8 h-8 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center border border-teal-100 shrink-0"><UserCheck className="w-4 h-4" /></div>;
      case 'ISSUE_IN_PROGRESS':
        return <div className="w-8 h-8 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center border border-amber-100 shrink-0"><RefreshCw className="w-4 h-4" /></div>;
      case 'RESOLUTION_SUBMITTED':
        return <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center border border-emerald-100 shrink-0"><CheckCircle className="w-4 h-4" /></div>;
      case 'ISSUE_CLOSED':
        return <div className="w-8 h-8 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center border border-slate-200 shrink-0"><Lock className="w-4 h-4" /></div>;
      case 'ISSUE_REOPENED':
        return <div className="w-8 h-8 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center border border-purple-100 shrink-0"><RotateCcw className="w-4 h-4" /></div>;
      case 'ISSUE_FLAGGED_FOR_MANUAL_REVIEW':
        return <div className="w-8 h-8 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center border border-rose-100 shrink-0"><AlertCircle className="w-4 h-4" /></div>;
      case 'ISSUE_APPROVED_BY_ADMIN':
        return <div className="w-8 h-8 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center border border-teal-100 shrink-0"><CheckCircle className="w-4 h-4" /></div>;
      case 'ISSUE_REJECTED_BY_ADMIN':
        return <div className="w-8 h-8 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center border border-rose-100 shrink-0"><AlertCircle className="w-4 h-4" /></div>;
      default:
        return <div className="w-8 h-8 bg-slate-50 text-slate-600 rounded-full flex items-center justify-center border border-slate-100 shrink-0"><Clock className="w-4 h-4" /></div>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-slate-200 max-w-4xl mx-auto p-8">
        <RefreshCw className="w-8 h-8 text-teal-600 animate-spin mb-4" />
        <p className="text-xs text-slate-500 font-mono">Retrieving secure lifecycle ledger file...</p>
      </div>
    );
  }

  if (errorMsg && !issue) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 max-w-xl mx-auto space-y-4 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="font-bold text-slate-800 text-md">Failed to Load Complaint File</h3>
        <p className="text-xs text-slate-500 leading-relaxed">{errorMsg}</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
        >
          Back to list
        </button>
      </div>
    );
  }

  const formattedDate = new Date(issue.createdAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Check SLA Compliance display
  const slaTarget = issue.slaTargetHours || 168;
  const createdDate = new Date(issue.createdAt);
  const targetDate = new Date(createdDate.getTime() + slaTarget * 60 * 60 * 1000);
  const isSlaBreached = issue.slaBreached;

  // Get all unique wards from officers to populate the dropdown
  const uniqueWards = Array.from(
    new Set(
      [
        issue?.reporterWard,
        ...officers.map(off => off.profile?.assignedWard || off.registeredWard)
      ].filter(Boolean)
    )
  ).sort() as string[];

  const filteredOfficersForDeptAndWard = officers.filter((off: any) => {
    if (!off.profile) return false;
    
    // Department check
    const offDeptNormalized = normalizeDept(off.profile.departmentName || '');
    const selectedDeptNormalized = normalizeDept(selectedDept);
    const deptMatch = offDeptNormalized === selectedDeptNormalized;
    
    // Ward check
    const offWard = (off.profile.assignedWard || off.registeredWard || '').trim().toLowerCase();
    const selWard = selectedWard.trim().toLowerCase();
    
    const cleanWard = (w: string) => w.replace(/^ward\s+/i, '');
    const wardMatch = !selWard || offWard === selWard || cleanWard(offWard) === cleanWard(selWard);
    
    return deptMatch && wardMatch;
  });

  const isAssignedOfficer = issue?.assignedOfficerId && String(issue?.assignedOfficerId) === String(getSession().user?.id);
  const currentUser = getSession().user;
  
  const cleanLocalityString = (val: string) => {
    return String(val || '').replace(/\s+/g, '').toLowerCase().trim();
  };

  const isSameLocality = currentUser 
    ? (cleanLocalityString(currentUser.registeredWard) === cleanLocalityString(issue?.reporterWard) && 
       cleanLocalityString(currentUser.registeredDistrict) === cleanLocalityString(issue?.reporterDistrict) &&
       cleanLocalityString(currentUser.registeredState) === cleanLocalityString(issue?.reporterState))
    : false;

  const formatWard = (w: string) => {
    if (!w) return 'N/A';
    return w.toLowerCase().startsWith('ward') ? w : `Ward ${w}`;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12 px-4 sm:px-6">
      {/* Messages */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3">
          <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <p className="text-xs text-emerald-800 font-medium">{successMsg}</p>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <p className="text-xs text-rose-800 font-medium">{errorMsg}</p>
        </div>
      )}

      {issue.status === 'MANUAL_REVIEW' && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-4">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm text-amber-800">Awaiting Manual Verification Review</h4>
            <p className="text-xs text-amber-700 leading-relaxed mt-1">
              AI classified this as potential private property and it is hidden from public views pending administrator manual validation.
            </p>
          </div>
        </div>
      )}

      {/* Header and Back Link */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors cursor-pointer text-slate-500"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wide">COMPLAINT ID:</span>
              <span className="text-xs font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border">{issue.issueNumber}</span>
            </div>
            <h3 className="font-bold text-md text-slate-800 font-sans mt-1">{issue.title}</h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {getPriorityBadge(issue.priority)}
          {getStatusBadge(issue.status)}
        </div>
      </div>

      {/* SLA Status Widget */}
      <div className={`border rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs ${
        isSlaBreached ? 'bg-rose-50/50 border-rose-200' : 'bg-emerald-50/40 border-emerald-200'
      }`}>
        <div className="flex items-start gap-3">
          {isSlaBreached ? (
            <AlertTriangle className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />
          ) : (
            <Clock className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
          )}
          <div>
            <h4 className={`font-bold text-xs uppercase tracking-wider ${isSlaBreached ? 'text-rose-800' : 'text-emerald-800'}`}>
              {isSlaBreached ? 'SLA Target Breached' : 'SLA Standard Compliance'}
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed mt-1">
              Priority level <span className="font-bold">{issue.priority}</span> gives this case a resolution target of <span className="font-bold">{slaTarget} Hours</span>.
              Target deadline was: <span className="font-bold">{targetDate.toLocaleString()}</span>.
            </p>
          </div>
        </div>
        <div className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono border ${
          isSlaBreached ? 'bg-rose-100 text-rose-800 border-rose-200' : 'bg-emerald-100 text-emerald-800 border-emerald-200'
        }`}>
          {isSlaBreached ? 'SLA_BREACHED' : 'SLA_IN_COMPLIANCE'}
        </div>
      </div>

      {/* Tabs Selector Bar */}
      <div className="flex border-b border-slate-200 gap-6 my-6">
        <button
          onClick={() => setActiveTab('details')}
          className={`pb-3 text-sm font-semibold transition-all relative ${
            activeTab === 'details'
              ? 'text-teal-600 font-bold border-b-2 border-teal-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Details & Resolution
        </button>
        <button
          onClick={() => {
            if (role === 'DEPARTMENT_OFFICER' && !isAssignedOfficer) {
              return;
            }
            if (role === 'CITIZEN' && !isSameLocality) {
              return;
            }
            setActiveTab('discussion');
          }}
          disabled={
            (role === 'DEPARTMENT_OFFICER' && !isAssignedOfficer) ||
            (role === 'CITIZEN' && !isSameLocality)
          }
          className={`pb-3 text-sm font-semibold transition-all relative flex items-center gap-2 cursor-pointer ${
            (role === 'DEPARTMENT_OFFICER' && !isAssignedOfficer) || (role === 'CITIZEN' && !isSameLocality)
              ? 'text-slate-300 cursor-not-allowed opacity-60'
              : activeTab === 'discussion'
              ? 'text-teal-600 font-bold border-b-2 border-teal-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
          title={
            role === 'DEPARTMENT_OFFICER' && !isAssignedOfficer 
              ? "Discussion is restricted to the assigned officer only" 
              : role === 'CITIZEN' && !isSameLocality
              ? "Discussion is restricted to verified residents of the same locality"
              : ""
          }
        >
          Community Discussion Forum
          {((role === 'DEPARTMENT_OFFICER' && !isAssignedOfficer) || (role === 'CITIZEN' && !isSameLocality)) && <Lock className="w-3.5 h-3.5 text-slate-400" />}
        </button>
      </div>

      {/* Main Grid: Details Left, Control Panel & Timeline Right */}
      <div className="grid md:grid-cols-3 gap-8">
        {/* Left Column (Span 2) */}
        {activeTab === 'details' ? (
          <div className="md:col-span-2 space-y-8">
          {/* Metadata details block */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-3 border-b border-slate-100">
              Complaint Record Profile
            </h4>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200/60 font-sans">
              {issue.description}
            </p>

            <div className="grid grid-cols-2 gap-6 text-xs">
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Affiliation Category</span>
                <span className="font-semibold text-slate-800 flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-teal-600" />
                  {issue.category}
                </span>
              </div>

              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Reporter Name</span>
                <span className="font-semibold text-slate-800 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  {issue.reporterName || 'Citizen Comrade'}
                </span>
              </div>

              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Reporter Jurisdiction</span>
                <span className="font-semibold text-slate-800 font-mono text-[11px]">
                  Ward {issue.reporterWard || 'N/A'}, {issue.reporterDistrict || 'N/A'}
                </span>
              </div>

              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Logged Date</span>
                <span className="font-semibold text-slate-800 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {formattedDate}
                </span>
              </div>

              {issue.assignedDepartment && (
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Assigned Department</span>
                  <span className="font-semibold text-slate-800 flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-blue-600" />
                    {issue.assignedDepartment}
                  </span>
                </div>
              )}

              {issue.assignedOfficer && (
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Assigned Officer</span>
                  <span className="font-semibold text-slate-800 flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-teal-600" />
                    {issue.assignedOfficer}
                  </span>
                </div>
              )}
            </div>

            {/* Geographical section */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Geographic Pins</span>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex gap-2 text-xs text-slate-600 leading-relaxed">
                <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-800">{issue.address}</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                    Coordinates: Lat {issue.location?.coordinates[1] || 'N/A'}, Lng {issue.location?.coordinates[0] || 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Official Helpline and Department Contact Card */}
            {issue.assignedDepartmentContact && (
              <div className="pt-6 border-t border-slate-100 space-y-3" id="issue-assigned-department-contact-card">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Official Helpline & Department Contact Card</span>
                <div className="p-4 bg-teal-50/40 border border-teal-200/60 rounded-xl space-y-4">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h5 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-teal-600" />
                        {issue.assignedDepartmentContact.name}
                      </h5>
                      <p className="text-xs text-slate-500 mt-1">{issue.assignedDepartmentContact.description}</p>
                    </div>
                    {issue.assignedDepartmentContact.isEmergencyDepartment && (
                      <span className="bg-red-500 text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase font-mono tracking-wider shrink-0 flex items-center gap-1">
                        🚨 Emergency
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-white p-3 rounded-lg border border-slate-200 flex flex-col justify-between">
                      <div>
                        <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Primary Helpline</span>
                        <a href={`tel:${issue.assignedDepartmentContact.primaryHelpline}`} className="text-sm font-bold text-slate-800 font-mono tracking-tight hover:text-teal-600 transition-colors block mt-0.5">
                          {issue.assignedDepartmentContact.primaryHelpline}
                        </a>
                      </div>
                      <div className="flex justify-between items-center mt-2 pt-1.5 border-t border-slate-100 text-[10px]">
                        <a href={`tel:${issue.assignedDepartmentContact.primaryHelpline}`} className="text-teal-600 hover:text-teal-700 font-bold flex items-center gap-1">
                          <Phone className="w-3 h-3" /> Call Helpline
                        </a>
                      </div>
                    </div>

                    <div className="bg-white p-3 rounded-lg border border-slate-200 flex flex-col justify-between">
                      <div>
                        <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Escalation Helpline</span>
                        <a href={`tel:${issue.assignedDepartmentContact.escalationHelpline}`} className="text-sm font-bold text-slate-800 font-mono tracking-tight hover:text-rose-600 transition-colors block mt-0.5">
                          {issue.assignedDepartmentContact.escalationHelpline}
                        </a>
                      </div>
                      <div className="flex justify-between items-center mt-2 pt-1.5 border-t border-slate-100 text-[10px]">
                        <a href={`tel:${issue.assignedDepartmentContact.escalationHelpline}`} className="text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1">
                          <Phone className="w-3 h-3" /> Escalate Issue
                        </a>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-slate-200/50 text-[11px] text-slate-600">
                    <div className="flex items-start gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span>{issue.assignedDepartmentContact.officeAddress}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Office Hours: {issue.assignedDepartmentContact.workingHours}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Media Evidence Carousel */}
          {issue.media && issue.media.length > 0 && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-3 border-b border-slate-100">
                Attached Media Evidence ({issue.media.length})
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {issue.media.map((med: any, idx: number) => (
                  <div key={idx} className="border border-slate-200 rounded-xl overflow-hidden shadow-xs relative bg-slate-900 group aspect-video">
                    {med.type === 'VIDEO' ? (
                      <video src={med.url} className="w-full h-full object-cover" controls referrerPolicy="no-referrer" />
                    ) : (
                      <img
                        src={med.url}
                        alt="Evidence Piece"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <span className="absolute bottom-2.5 left-2.5 bg-slate-950/60 px-2 py-0.5 text-[9px] font-bold text-white rounded font-mono">
                      {med.type} EVIDENCE
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* RESOLUTION DETAILS CARD DISPLAY */}
          {resolutionDetails && (
            <div className="bg-emerald-50/25 border-2 border-emerald-500/20 p-6 rounded-2xl space-y-5 shadow-sm">
              <div className="flex items-center gap-2 pb-3 border-b border-emerald-500/15">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <h4 className="font-bold text-xs text-emerald-900 uppercase tracking-wider">Submitted Resolution Evidence</h4>
              </div>

              <div className="space-y-4 text-xs font-sans">
                <div>
                  <span className="block text-[10px] font-bold text-emerald-700/60 uppercase tracking-wide mb-1">Resolution Comments</span>
                  <p className="bg-white border border-emerald-200/50 p-4 rounded-xl text-slate-700 leading-relaxed italic shadow-xs">
                    "{resolutionDetails.notes}"
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="block text-[10px] font-bold text-emerald-700/60 uppercase tracking-wide mb-1">Resolved By</span>
                    <p className="font-semibold text-slate-800">{resolutionDetails.officerName} ({resolutionDetails.officerDepartment})</p>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-emerald-700/60 uppercase tracking-wide mb-1">Resolution Time</span>
                    <p className="font-semibold text-slate-800">{new Date(resolutionDetails.resolutionTimestamp).toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-emerald-700/60 uppercase tracking-wide mb-1">Geo-Verification Coordinates</span>
                    <p className="font-semibold text-slate-800 font-mono text-[11px]">
                      Lat {resolutionDetails.resolutionLatitude}, Lng {resolutionDetails.resolutionLongitude}
                    </p>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-emerald-700/60 uppercase tracking-wide mb-1">Proximity Offset</span>
                    <p className="font-semibold text-slate-800 font-mono">
                      {Math.round(resolutionDetails.resolutionDistanceMeters)} meters (Validated &lt;50m)
                    </p>
                  </div>
                </div>

                <div>
                  <span className="block text-[10px] font-bold text-emerald-700/60 uppercase tracking-wide mb-1">Resolution Physical Location Address</span>
                  <p className="bg-emerald-100/50 p-3 rounded-xl border border-emerald-200 text-slate-700">
                    {resolutionDetails.resolutionAddress}
                  </p>
                </div>

                {/* Resolution Media */}
                {resolutionDetails.media && resolutionDetails.media.length > 0 && (
                  <div className="pt-3">
                    <span className="block text-[10px] font-bold text-emerald-700/60 uppercase tracking-wide mb-2">Resolution Proof Media ({resolutionDetails.media.length})</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {resolutionDetails.media.map((med: any, idx: number) => (
                        <div key={idx} className="border border-emerald-200 rounded-xl overflow-hidden aspect-video relative bg-slate-900 shadow-sm">
                          {med.type === 'VIDEO' ? (
                            <video src={med.url} className="w-full h-full object-cover" controls referrerPolicy="no-referrer" />
                          ) : (
                            <img
                              src={med.url}
                              alt="Resolution Verification"
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          )}
                          <span className="absolute bottom-2 right-2 bg-emerald-600 text-white font-mono font-bold text-[9px] px-2 py-0.5 rounded">
                            GEO_VERIFIED ({med.type})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Previous Resolution Attempts History */}
                {resolutionHistory.length > 1 && (
                  <div className="mt-4 pt-4 border-t border-dashed border-emerald-500/20">
                    <span className="block text-[10px] font-bold text-emerald-800 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5" />
                      Resolution Submission History ({resolutionHistory.length - 1} previous attempt{resolutionHistory.length > 2 ? 's' : ''})
                    </span>
                    <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                      {resolutionHistory.slice(1).map((hist: any, index: number) => {
                        const attemptNum = resolutionHistory.length - index - 1;
                        return (
                          <div key={hist._id || hist.id || index} className="p-3 bg-white/60 border border-emerald-100 rounded-xl space-y-2">
                            <div className="flex items-center justify-between text-[10px] font-medium text-slate-500">
                              <span className="bg-emerald-100/75 text-emerald-800 font-bold px-2 py-0.5 rounded">
                                Attempt #{attemptNum}
                              </span>
                              <span>{new Date(hist.resolutionTimestamp).toLocaleString()}</span>
                            </div>
                            <p className="text-xs text-slate-700 italic leading-relaxed">
                              "{hist.notes}"
                            </p>
                            <div className="flex items-center justify-between text-[10px] text-slate-400">
                              <span>By: {hist.officerName}</span>
                              {hist.media && hist.media.length > 0 && (
                                <div className="flex gap-2.5 flex-wrap">
                                  {hist.media.map((m: any, mIdx: number) => (
                                    <a 
                                      key={mIdx}
                                      href={m.url} 
                                      target="_blank" 
                                      rel="noreferrer" 
                                      className="text-indigo-600 hover:underline font-bold flex items-center gap-0.5"
                                    >
                                      View Proof {mIdx + 1} ({m.type})
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                            {hist.resolutionValidationSummary && (
                              <div className="mt-2 p-2.5 bg-indigo-50/50 rounded-xl border border-indigo-100/60 text-[11px] text-indigo-950 space-y-1 font-sans text-left">
                                <span className="font-bold uppercase tracking-wider text-[9px] text-indigo-700/90 block">AI Validation Audit (Attempt #{attemptNum})</span>
                                <p className="font-medium">Summary: <span className="text-slate-800">{hist.resolutionValidationSummary}</span></p>
                                {hist.resolutionValidationReasoning && (
                                  <p className="text-slate-600 leading-relaxed"><span className="font-medium text-indigo-900/80">Reasoning:</span> {hist.resolutionValidationReasoning}</p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* AI RESOLUTION VALIDATION SUMMARY */}
          {issue && issue.resolutionValidationSummary && (
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50/50 border-2 border-indigo-200/60 p-6 rounded-2xl space-y-4 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-indigo-100">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-600 animate-pulse" />
                  <h4 className="font-bold text-xs text-indigo-900 uppercase tracking-wider font-sans">Gemini AI Audit Insight</h4>
                </div>
                <span className={`px-2.5 py-1 text-[10px] font-bold rounded-lg ${
                  issue.resolutionLikelyValid 
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                    : 'bg-rose-100 text-rose-800 border border-rose-200'
                }`}>
                  {issue.resolutionLikelyValid ? 'AI APPROVED' : 'AI ALERT WARNING'}
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="block text-[10px] font-bold text-indigo-800/60 uppercase tracking-wide">Analysis Summary</span>
                  <p className="font-medium text-slate-800 leading-relaxed mt-1">{issue.resolutionValidationSummary}</p>
                </div>

                <div className="bg-white/80 backdrop-blur-xs p-4 rounded-xl border border-indigo-100/80">
                  <span className="block text-[10px] font-bold text-indigo-800/60 uppercase tracking-wide mb-1.5">Confidence Level</span>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${issue.resolutionLikelyValid ? 'bg-indigo-600' : 'bg-rose-500'}`}
                        style={{ width: `${(issue.resolutionValidationConfidence || 0.8) * 100}%` }}
                      />
                    </div>
                    <span className="font-bold text-slate-700 font-mono">
                      {Math.round((issue.resolutionValidationConfidence || 0.8) * 100)}%
                    </span>
                  </div>
                </div>

                <div>
                  <span className="block text-[10px] font-bold text-indigo-800/60 uppercase tracking-wide">AI Multi-Modal Comparison Reasoning</span>
                  <p className="text-slate-600 leading-relaxed mt-1 bg-slate-50 border p-4 rounded-xl whitespace-pre-line leading-relaxed">
                    {issue.resolutionValidationReasoning}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* CITIZEN RESOLUTION VERIFICATION / VOTING BOX */}
          {issue && (issue.status === 'RESOLUTION_PENDING_VERIFICATION' || issue.status === 'COMMUNITY_VERIFIED' || verifications.length > 0) && (
            <div className="bg-white border border-slate-200 p-6 rounded-2xl space-y-6 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-teal-600" />
                  <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">Citizen Verification Portal</h4>
                </div>
                {issue.verificationDeadline && (
                  <span className="text-[10px] text-slate-400 font-mono">
                    Deadline: {new Date(issue.verificationDeadline).toLocaleDateString()}
                  </span>
                )}
              </div>

              {/* Voting Summary / Net Score */}
              <div className="grid grid-cols-3 gap-4 text-center bg-slate-50 p-4 rounded-2xl border">
                <div>
                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Net Support Score</span>
                  <span className={`text-md font-extrabold block mt-0.5 font-mono ${
                    (issue.communityConfidence || 0) > 0 
                      ? 'text-emerald-600' 
                      : (issue.communityConfidence || 0) < 0 
                        ? 'text-rose-600' 
                        : 'text-slate-700'
                  }`}>
                    {(issue.communityConfidence || 0) > 0 ? `+${issue.communityConfidence}` : issue.communityConfidence || 0}
                  </span>
                </div>
                <div>
                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Approvals</span>
                  <span className="text-md font-extrabold text-emerald-600 block mt-0.5 font-mono">{issue.communityVerifiedByCount || 0}</span>
                </div>
                <div>
                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Rejections</span>
                  <span className="text-md font-extrabold text-rose-600 block mt-0.5 font-mono">{issue.communityRejectedByCount || 0}</span>
                </div>
              </div>

              {/* Progress to consensus alert banner */}
              {issue.status === 'RESOLUTION_PENDING_VERIFICATION' && (
                <div className="text-[11px] text-slate-500 bg-teal-50/50 border border-teal-200/50 p-3 rounded-xl leading-relaxed">
                  <strong>Consensus Goal:</strong> Requires a net score of <strong>+3</strong> to pass resolution, or <strong>-3</strong> to reject and reopen the issue. Each cast vote awards <strong>+2 Score Points</strong>, and matching the final consensus awards a <strong>+10 points bonus</strong>!
                </div>
              )}

              {/* Voting form */}
              {issue.status === 'RESOLUTION_PENDING_VERIFICATION' && (
                <div className="pt-2 border-t border-dashed border-slate-200 space-y-4">
                  {role === 'ADMIN' ? (
                    <div className="bg-slate-50 text-slate-500 text-xs p-4 rounded-xl italic text-center border border-slate-200">
                      Administrative oversight active. Awaiting citizen voting verification...
                    </div>
                  ) : hasVoted ? (
                    <div className="bg-emerald-50 text-emerald-800 text-xs p-4 rounded-xl font-medium flex items-center gap-2 border border-emerald-100">
                      <Check className="w-4 h-4 shrink-0" />
                      <span>✓ You have successfully cast your verification vote on this issue! Thank you for participating in civic oversight.</span>
                    </div>
                  ) : String(issue.assignedOfficerId) === String(getSession().user?.id) ? (
                    <div className="bg-slate-50 text-slate-500 text-xs p-4 rounded-xl italic text-center border border-slate-200">
                      You are the assigned department officer. Awaiting community validation votes...
                    </div>
                  ) : (role === 'CITIZEN' && !isSameLocality) ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-amber-800">Read-Only Access</p>
                        <p className="text-xs text-amber-700 leading-relaxed mt-1">
                          You are viewing this complaint as an out-of-jurisdiction citizen ({formatWard(currentUser?.registeredWard || '')}, {currentUser?.registeredDistrict || 'N/A'}, {currentUser?.registeredState || 'N/A'}). Voting and verification are restricted to verified residents of <strong>{formatWard(issue?.reporterWard || '')}, {issue?.reporterDistrict || 'N/A'}, {issue?.reporterState || 'N/A'}</strong>.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <h5 className="font-bold text-xs text-slate-700">Cast Your Verification Vote:</h5>
                      
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Review Comment</label>
                        <textarea
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          placeholder="Did they do a thorough job? Provide physical details or observations..."
                          rows={2}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white focus:ring-1 focus:ring-teal-500"
                        />
                      </div>

                      {/* Citizen Verification Evidence Upload */}
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Verification Evidence (Optional Image/Video)</label>
                        <div className="flex items-center gap-3">
                          <label className="flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 hover:border-slate-300 rounded-xl bg-slate-50 text-slate-600 hover:text-slate-800 text-xs font-semibold cursor-pointer transition-colors shrink-0">
                            <Upload className="w-4 h-4 text-slate-500" />
                            <span>{isUploadingVoterMedia ? 'Uploading...' : 'Upload Image/Video'}</span>
                            <input
                              type="file"
                              accept="image/*,video/*"
                              onChange={handleVoterMediaUpload}
                              className="hidden"
                              disabled={isUploadingVoterMedia}
                            />
                          </label>
                          {isUploadingVoterMedia && (
                            <p className="text-[10px] text-teal-600 font-medium animate-pulse">Uploading file, please wait...</p>
                          )}
                          {!isUploadingVoterMedia && voterMediaUrl && (
                            <div className="flex items-center gap-2 border border-slate-200 bg-white p-1 rounded-lg">
                              {voterMediaType === 'VIDEO' ? (
                                <video src={voterMediaUrl} className="w-10 h-10 object-cover rounded" />
                              ) : (
                                <img src={voterMediaUrl} className="w-10 h-10 object-cover rounded" referrerPolicy="no-referrer" />
                              )}
                              <div className="flex flex-col pr-2">
                                <span className="text-[9px] font-bold text-emerald-600">Attached Evidence</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setVoterMediaUrl('');
                                    setVoterMediaType('IMAGE');
                                  }}
                                  className="text-[9px] text-rose-500 hover:underline text-left font-semibold"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <button
                          type="button"
                          disabled={isVoting}
                          onClick={() => handleCastVote('APPROVE')}
                          className="flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors disabled:opacity-50"
                        >
                          <Check className="w-4 h-4" />
                          Verify & Approve
                        </button>
                        <button
                          type="button"
                          disabled={isVoting}
                          onClick={() => handleCastVote('REJECT')}
                          className="flex items-center justify-center gap-2 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors disabled:opacity-50"
                        >
                          <AlertTriangle className="w-4 h-4" />
                          Flag & Reject
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Feed of citizen reviews */}
              {verifications.length > 0 && (
                <div className="pt-4 border-t border-slate-100 space-y-4">
                  <h5 className="font-bold text-xs text-slate-700 uppercase tracking-wider">Citizen Reviews & Audit Logs</h5>
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {verifications.map((v: any, index: number) => (
                      <div key={v._id || v.id || index} className="p-3 border border-slate-100 rounded-xl space-y-2 text-xs bg-slate-50/50">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-700">{v.citizenName}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            v.verificationAction === 'APPROVE' 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {v.verificationAction === 'APPROVE' ? 'APPROVED' : 'REJECTED'}
                          </span>
                        </div>
                        {v.comment && <p className="text-slate-600 italic leading-relaxed">"{v.comment}"</p>}
                        
                        {/* Citizen Uploaded Evidence Thumbnail */}
                        {v.media && v.media.length > 0 && (
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            {v.media.map((mediaItem: any, mIdx: number) => (
                              <div key={mIdx} className="relative group shrink-0">
                                {mediaItem.type === 'VIDEO' ? (
                                  <a 
                                    href={mediaItem.url} 
                                    download 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="block border border-slate-200 rounded-lg overflow-hidden w-20 h-14 bg-slate-900 flex items-center justify-center hover:ring-2 hover:ring-indigo-500 transition-all"
                                    title="Download Video Evidence"
                                  >
                                    <video src={mediaItem.url} className="w-full h-full object-cover pointer-events-none" />
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                      <span className="text-[9px] text-white font-extrabold tracking-wider uppercase">Video</span>
                                    </div>
                                  </a>
                                ) : (
                                  <a 
                                    href={mediaItem.url} 
                                    download 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="block border border-slate-200 rounded-lg overflow-hidden w-20 h-14 bg-white hover:ring-2 hover:ring-indigo-500 transition-all"
                                    title="Download Image Evidence"
                                  >
                                    <img src={mediaItem.url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        <span className="text-[10px] text-slate-400 block text-right font-mono">
                          {new Date(v.createdAt).toLocaleDateString()} {new Date(v.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        ) : (
          <div className="md:col-span-2">
            {role === 'DEPARTMENT_OFFICER' && !isAssignedOfficer ? (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center space-y-3">
                <Lock className="w-12 h-12 text-slate-400 mx-auto" />
                <h4 className="font-bold text-slate-800 text-lg">Discussion Access Restricted</h4>
                <p className="text-sm text-slate-500 max-w-md mx-auto">
                  Only the officer assigned to this complaint has permission to access the community discussion forum.
                </p>
              </div>
            ) : (
              <IssueDiscussion
                issueId={issue._id || issue.id}
                issueNumber={issue.issueNumber}
                issueStatus={issue.status}
                reporterId={issue.reporterId}
                reporterWard={issue.reporterWard}
                reporterDistrict={issue.reporterDistrict}
                reporterState={issue.reporterState}
                onRefreshTimeline={fetchIssueDetails}
              />
            )}
          </div>
        )}

        {/* Right Column: Control Panels & Timeline (Span 1) */}
        <div className="md:col-span-1 space-y-8">
          {/* ACTION PANEL FOR ADMIN */}
          {role === 'ADMIN' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider pb-3 border-b border-slate-100 flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-600" />
                Administrative Controls
              </h4>

              {/* Assignment Form */}
              {['OPEN', 'ASSIGNED', 'REOPENED'].includes(issue.status) && (
                <form onSubmit={handleAssignIssue} className="space-y-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Department allocation</label>
                    <select
                      value={selectedDept}
                      onChange={(e) => {
                        setSelectedDept(e.target.value);
                        setSelectedOfficerId('');
                      }}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 bg-white"
                    >
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ward jurisdiction</label>
                    <select
                      value={selectedWard}
                      onChange={(e) => {
                        setSelectedWard(e.target.value);
                        setSelectedOfficerId('');
                      }}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 bg-white"
                    >
                      <option value="">-- All Wards --</option>
                      {uniqueWards.map((w) => (
                        <option key={w} value={w}>{w}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Officer Assignment</label>
                    <select
                      value={selectedOfficerId}
                      onChange={(e) => setSelectedOfficerId(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 bg-white"
                    >
                      <option value="">-- AI recommended self allocation --</option>
                      {filteredOfficersForDeptAndWard.map((off: any) => (
                        <option key={off.id} value={off.id}>
                          {off.firstName} {off.lastName} (Approved)
                        </option>
                      ))}
                    </select>
                    {filteredOfficersForDeptAndWard.length === 0 && (
                      <p className="text-[10px] text-amber-600 italic">No approved officers registered in this department and ward yet.</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assignment Instructions</label>
                    <textarea
                      value={assignmentReason}
                      onChange={(e) => setAssignmentReason(e.target.value)}
                      placeholder="Enter details about this dispatch allocation..."
                      rows={2}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 bg-white"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? 'Processing Allocation...' : issue.status === 'ASSIGNED' ? 'Reassign Dispatch' : 'Assign Dispatch'}
                  </button>
                </form>
              )}

              {/* Verify and Close Form */}
              {['RESOLUTION_PENDING_VERIFICATION', 'COMMUNITY_VERIFIED'].includes(issue.status) && (
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  {issue.status === 'COMMUNITY_VERIFIED' ? (
                    <form onSubmit={handleVerifyAndClose} className="space-y-3">
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Closure Notes</label>
                        <textarea
                          value={closingNotes}
                          onChange={(e) => setClosingNotes(e.target.value)}
                          placeholder="Satisfactory resolution work..."
                          rows={2}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors disabled:opacity-50"
                      >
                        Verify & Close Complaint
                      </button>
                    </form>
                  ) : (
                    <div className="bg-slate-50 border border-dashed border-slate-200 p-4 rounded-xl text-xs text-slate-500 leading-relaxed italic text-center">
                      Awaiting community verification votes. Admins can officially verify and close once citizens reach consensus (+3 score threshold).
                    </div>
                  )}

                  <form onSubmit={handleReopenIssue} className="space-y-3 pt-3 border-t border-dashed">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reopen reason</label>
                      <textarea
                        value={reopenReason}
                        onChange={(e) => setReopenReason(e.target.value)}
                        placeholder="Notes on why resolution work is incomplete..."
                        rows={2}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors disabled:opacity-50"
                    >
                      Reopen Complaint
                    </button>
                  </form>
                </div>
              )}

              {issue.status === 'CLOSED' && (
                <p className="text-xs text-slate-400 font-mono text-center py-2 bg-slate-50 border rounded-lg uppercase">
                  ✓ Ledger is Closed & Locked
                </p>
              )}
            </div>
          )}

          {/* ACTION PANEL FOR OFFICER */}
          {role === 'DEPARTMENT_OFFICER' && isAssignedOfficer && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider pb-3 border-b border-slate-100 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-teal-600" />
                Officer Actions
              </h4>

              {issue.status === 'ASSIGNED' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    You have been assigned to dispatch this complaint. Please verify and accept assignment to begin work.
                  </p>
                  <button
                    onClick={handleAcceptAssignment}
                    disabled={isSubmitting}
                    className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
                  >
                    {isSubmitting ? 'Accepting...' : 'Accept Assignment'}
                  </button>
                </div>
              )}

              {issue.status === 'ACCEPTED' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    You have accepted this job. Commencing active work notifies citizens of progress.
                  </p>
                  <button
                    onClick={handleStartWork}
                    disabled={isSubmitting}
                    className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
                  >
                    {isSubmitting ? 'Starting...' : 'Mark as Work In Progress'}
                  </button>
                </div>
              )}

              {issue.status === 'IN_PROGRESS' && (
                <form onSubmit={handleSubmitResolution} className="space-y-4">
                  <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 text-[11px] text-teal-800 leading-relaxed">
                    <strong>Resolution Guidance:</strong> You must submit geo-verified photo proof within <strong>50 meters</strong> of the reported coordinates to satisfy dispatch protocols.
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Resolution notes (Min 20 chars)</label>
                    <textarea
                      value={resNotes}
                      onChange={(e) => setResNotes(e.target.value)}
                      placeholder="Detail repairs and works completed..."
                      rows={3}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white"
                      required
                    />
                    <span className="text-[10px] text-slate-400 font-mono block text-right">{resNotes.length}/20 chars</span>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Resolution Evidence & Proof (Max 2)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={resMediaUrl}
                        onChange={(e) => {
                          setResMediaUrl(e.target.value);
                          if (e.target.value) {
                            // Sync with uploaded media if not already present
                            setResUploadedMedia(prev => {
                              if (prev.some(p => p.url === e.target.value)) return prev;
                              return [...prev, { url: e.target.value, type: 'IMAGE' }];
                            });
                          }
                        }}
                        placeholder="Paste image/video link or use upload..."
                        className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white"
                      />
                      <label className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors border border-slate-200 shrink-0 select-none">
                        <Upload className="w-3.5 h-3.5 text-slate-500" />
                        <span>{isUploadingEvidence ? 'Uploading...' : 'Upload File'}</span>
                        <input
                          type="file"
                          accept="image/*,video/*"
                          multiple
                          onChange={handleEvidenceUpload}
                          disabled={isUploadingEvidence}
                          className="hidden"
                        />
                      </label>
                    </div>
                    
                    <p className="text-[10px] text-amber-600 font-semibold font-sans">
                      ⚠️ Maximum 2 items allowed (2 images or 1 video + 1 image)
                    </p>

                    {isUploadingEvidence && (
                      <p className="text-[10px] text-teal-600 font-medium">Uploading file, please wait...</p>
                    )}

                    {/* Pre-uploaded file previews */}
                    {resUploadedMedia.length > 0 && (
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        {resUploadedMedia.map((m, idx) => (
                          <div key={idx} className="relative aspect-video border rounded-lg overflow-hidden bg-slate-900 group">
                            {m.type === 'VIDEO' ? (
                              <video src={m.url} className="w-full h-full object-cover" controls={false} />
                            ) : (
                              <img src={m.url} alt="Proof preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setResUploadedMedia(prev => prev.filter((_, i) => i !== idx));
                              }}
                              className="absolute top-1 right-1 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full cursor-pointer"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                            <span className="absolute bottom-1 left-1.5 text-[8px] font-semibold text-white bg-slate-950/60 px-1 rounded">
                              {m.type}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (resUploadedMedia.length >= 2) {
                            setErrorMsg("Maximum 2 media items allowed. You can upload up to 2 images or 1 video + 1 image.");
                            return;
                          }
                          setResUploadedMedia(prev => [...prev, { url: 'https://images.unsplash.com/photo-1581094288338-2314dddb7eed', type: 'IMAGE' }]);
                        }}
                        className="text-[9px] bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded font-mono text-slate-600"
                      >
                        Insert Pothole Fixed Proof
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (resUploadedMedia.length >= 2) {
                            setErrorMsg("Maximum 2 media items allowed. You can upload up to 2 images or 1 video + 1 image.");
                            return;
                          }
                          setResUploadedMedia(prev => [...prev, { url: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5', type: 'IMAGE' }]);
                        }}
                        className="text-[9px] bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded font-mono text-slate-600"
                      >
                        Insert Road Fixed Proof
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3 pt-3 border-t">
                    <div className="flex justify-between items-center flex-wrap gap-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Geo-Verification Location</span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleDetectGPS}
                          disabled={isGpsLoading}
                          className="text-[10px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <MapPin className="w-3 h-3" />
                          {isGpsLoading ? 'Detecting...' : 'Detect GPS'}
                        </button>
                        <button
                          type="button"
                          onClick={handleSimulateProximityLocation}
                          className="text-[10px] font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1 cursor-pointer"
                        >
                          <Navigation className="w-3 h-3" />
                          Simulate Proximity
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] text-slate-400 block font-mono">LATITUDE</label>
                        <input
                          type="number"
                          step="any"
                          value={resLat}
                          onChange={(e) => setResLat(e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs bg-slate-50 font-mono"
                          required
                          readOnly
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] text-slate-400 block font-mono">LONGITUDE</label>
                        <input
                          type="number"
                          step="any"
                          value={resLng}
                          onChange={(e) => setResLng(e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs bg-slate-50 font-mono"
                          required
                          readOnly
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-400 block font-mono">PHYSICAL ADDRESS OF RESOLUTION</label>
                      <input
                        type="text"
                        value={resAddress}
                        onChange={(e) => setResAddress(e.target.value)}
                        placeholder="Resolution Sector Road 4..."
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-slate-50"
                        required
                        readOnly
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors mt-2 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Uploading & Verifying Proof...' : 'Submit Resolution Proof'}
                  </button>
                </form>
              )}

              {!['ASSIGNED', 'ACCEPTED', 'IN_PROGRESS'].includes(issue.status) && (
                <p className="text-xs text-slate-400 font-mono text-center py-2 bg-slate-50 border rounded-lg uppercase">
                  No Actions Pending
                </p>
              )}
            </div>
          )}

          {/* Timeline Box (Span 1) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider pb-3 border-b border-slate-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              Complaint Lifecycle Log
            </h4>

            {timeline.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-10 font-mono">No actions recorded on dispatch ledger.</p>
            ) : (
              <div className="space-y-6 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                {timeline.map((audit: any, idx: number) => {
                  const auditDate = new Date(audit.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit'
                  });

                  return (
                    <div key={audit.id || idx} className="flex gap-4 relative">
                      {getEventIcon(audit.eventType)}
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-800 leading-normal font-sans">{audit.eventType.replace(/_/g, ' ')}</p>
                        <p className="text-[11px] text-slate-500 leading-relaxed font-sans">{audit.description}</p>
                        <div className="flex gap-1.5 items-center text-[9px] text-slate-400 font-mono">
                          <span className="font-bold">{audit.actorRole}</span>
                          <span>•</span>
                          <span>{auditDate}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
