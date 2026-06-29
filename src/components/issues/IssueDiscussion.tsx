import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  Lock,
  Unlock,
  Trash2,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Clock,
  Shield,
  Upload,
  Image as ImageIcon,
  CheckCircle,
  User,
  X,
  FileText
} from 'lucide-react';
import { getAuthHeaders, getSession } from '../../utils/auth.js';

interface IssueDiscussionProps {
  issueId: string;
  issueNumber: string;
  issueStatus: string;
  reporterId: string;
  reporterWard: string;
  reporterDistrict: string;
  reporterState: string;
  onRefreshTimeline?: () => void;
}

export default function IssueDiscussion({
  issueId,
  issueNumber,
  issueStatus,
  reporterId,
  reporterWard,
  reporterDistrict,
  reporterState,
  onRefreshTimeline
}: IssueDiscussionProps) {
  const session = getSession();
  const currentUser = session.user;

  const [messages, setMessages] = useState<any[]>([]);
  const [thread, setThread] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Message compose states
  const [newMessageText, setNewMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [attachedImageUrls, setAttachedImageUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Role-specific message properties
  const [isOfficialUpdate, setIsOfficialUpdate] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState('');

  // AI Summary states
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  // Administrative action states
  const [isTogglingLock, setIsTogglingLock] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const officialMilestones = [
    { value: 'INSPECTION_COMPLETED', label: 'Inspection Completed' },
    { value: 'WORK_SCHEDULED', label: 'Work Scheduled' },
    { value: 'OFFICER_ASSIGNED', label: 'Officer Assigned' },
    { value: 'MATERIAL_PROCURED', label: 'Material Procured' },
    { value: 'RESOLUTION_PENDING_FINAL_SIGN_OFF', label: 'Pending Final Sign-off' }
  ];

  // Locality & participation verification
  const isCreator = currentUser ? (String(currentUser.id) === String(reporterId) || String((currentUser as any)._id || '') === String(reporterId)) : false;
  const isSameLocality = currentUser ? (currentUser.registeredWard === reporterWard && currentUser.registeredDistrict === reporterDistrict) : false;
  const isOfficer = currentUser?.role === 'DEPARTMENT_OFFICER';
  const isAdmin = currentUser?.role === 'ADMIN';

  const isAllowedToPost = isAdmin || isOfficer || isCreator || isSameLocality;
  const isThreadClosed = issueStatus === 'CLOSED';

  const fetchDiscussionData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const response = await fetch(`/api/issues/${issueNumber}/discussion`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setThread(data.thread);
        setMessages(data.messages);
        setSummary(data.summary);
        setAnalytics(data.analytics);
      } else {
        throw new Error(data.error || 'Failed to retrieve discussion thread.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error loading discussion thread.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (issueId) {
      fetchDiscussionData();
    }
  }, [issueId, issueNumber]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setErrorMsg(null);

    try {
      const file = files[0];
      if (!file.type.startsWith('image/')) {
        throw new Error('Only image attachments are allowed in discussions.');
      }

      // Get Signed URL
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

      // Upload binary
      const uploadRes = await fetch(uploadUrl, {
        method: 'POST',
        body: file
      });

      if (!uploadRes.ok) {
        throw new Error('Upload transit error. Attachment could not be saved.');
      }

      setAttachedImageUrls(prev => [...prev, publicUrl]);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Image upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  const removeAttachedImage = (index: number) => {
    setAttachedImageUrls(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim() && attachedImageUrls.length === 0) return;

    setIsSending(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      let finalMsg = newMessageText.trim();
      let msgType = 'CITIZEN_MESSAGE';

      if (isOfficialUpdate && (isOfficer || isAdmin)) {
        msgType = 'OFFICIAL_UPDATE';
        if (selectedMilestone) {
          const label = officialMilestones.find(m => m.value === selectedMilestone)?.label || selectedMilestone;
          finalMsg = `[OFFICIAL UPDATE: ${label}] ${finalMsg}`;
        }
      } else if (isAdmin) {
        msgType = 'ADMIN_MESSAGE';
      } else if (isOfficer) {
        msgType = 'OFFICER_MESSAGE';
      }

      const res = await fetch(`/api/issues/${issueNumber}/discussion/messages`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          message: finalMsg,
          messageType: msgType,
          imageUrls: attachedImageUrls
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setNewMessageText('');
        setAttachedImageUrls([]);
        setIsOfficialUpdate(false);
        setSelectedMilestone('');
        await fetchDiscussionData();
        
        if (onRefreshTimeline && msgType === 'OFFICIAL_UPDATE') {
          onRefreshTimeline();
        }
      } else {
        throw new Error(data.error || 'Failed to submit comment.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error posting message.');
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/issues/${issueNumber}/discussion/messages/${messageId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg('Comment successfully soft-deleted by Administrator.');
        await fetchDiscussionData();
      } else {
        throw new Error(data.error || 'Failed to delete message.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error deleting message.');
    }
  };

  const handleToggleThreadLock = async () => {
    const nextLockState = !thread?.isLocked;
    setIsTogglingLock(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/issues/${issueNumber}/discussion/lock`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ isLocked: nextLockState })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(`Discussion thread has been ${nextLockState ? 'locked' : 'unlocked'}.`);
        await fetchDiscussionData();
        if (onRefreshTimeline) {
          onRefreshTimeline();
        }
      } else {
        throw new Error(data.error || 'Failed to change lock state.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error updating thread lock status.');
    } finally {
      setIsTogglingLock(false);
    }
  };

  const handleGenerateAISummary = async () => {
    setIsGeneratingSummary(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/issues/${issueNumber}/discussion/summary`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg('AI executive discussion summary refreshed successfully!');
        setSummary(data.summary);
        await fetchDiscussionData();
      } else {
        throw new Error(data.error || 'AI summary generation failed.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to generate AI summary. Ensure at least one discussion message exists.');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white border p-12 rounded-2xl flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="w-8 h-8 text-teal-600 animate-spin" />
        <span className="text-sm text-slate-500 font-mono">Securing channel & loading discussion thread...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="issue-discussion-component">
      {/* Dynamic Alerts */}
      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex items-start gap-3 text-xs leading-normal">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">{errorMsg}</div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-rose-700 font-bold">✕</button>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-start gap-3 text-xs leading-normal">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1">{successMsg}</div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-emerald-700 font-bold">✕</button>
        </div>
      )}

      {/* AI Discussion Summary Header Section */}
      <div className="bg-gradient-to-r from-teal-50/50 to-indigo-50/40 border border-teal-100 rounded-2xl p-6 shadow-xs relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-48 h-48 bg-teal-100/20 rounded-full blur-2xl"></div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-teal-100/60 pb-4 mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-teal-600" />
            <div>
              <h4 className="font-extrabold text-sm text-slate-800 flex items-center gap-1.5">
                Community AI Coordinator
              </h4>
              <p className="text-[11px] text-slate-500 font-sans">Gemini-powered executive overview synthesized on-demand</p>
            </div>
          </div>
          <button
            onClick={handleGenerateAISummary}
            disabled={isGeneratingSummary || messages.length === 0}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs ${
              messages.length === 0
                ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                : 'bg-white text-teal-700 border border-teal-200 hover:bg-teal-50/50 hover:text-teal-800 active:scale-95'
            }`}
          >
            {isGeneratingSummary ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Synthesizing...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                <span>Refreshed AI Summary</span>
              </>
            )}
          </button>
        </div>

        {messages.length === 0 ? (
          <p className="text-xs text-slate-500 italic py-4 text-center font-sans">
            Please post at least one message in the discussion forum to unlock Gemini AI-powered thread summarization.
          </p>
        ) : !summary ? (
          <div className="text-center py-6 space-y-3">
            <p className="text-xs text-slate-500 font-sans">No summary has been generated for this thread yet.</p>
            <button
              onClick={handleGenerateAISummary}
              disabled={isGeneratingSummary}
              className="mx-auto bg-teal-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-teal-700 flex items-center gap-2 active:scale-95 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              Generate First Summary
            </button>
          </div>
        ) : (
          <div className="space-y-4 text-xs text-slate-700 leading-relaxed font-sans">
            <div className="bg-white/80 p-3.5 rounded-xl border border-teal-100/40">
              <span className="font-bold text-slate-800 block mb-1">Executive Synopsys</span>
              <p className="text-[11px] text-slate-600">{summary.summary}</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white/70 p-3.5 rounded-xl border border-teal-100/40">
                <span className="font-bold text-slate-800 block mb-2 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-rose-500 rounded-full"></span>
                  Primary Citizen Concerns
                </span>
                {summary.keyConcerns && summary.keyConcerns.length > 0 ? (
                  <ul className="space-y-1.5 list-disc pl-4 text-[11px] text-slate-600">
                    {summary.keyConcerns.map((concern: string, i: number) => (
                      <li key={i}>{concern}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">No specific concerns isolated.</p>
                )}
              </div>

              <div className="bg-white/70 p-3.5 rounded-xl border border-teal-100/40">
                <span className="font-bold text-slate-800 block mb-2 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                  Actionable Pending Steps
                </span>
                {summary.pendingActions && summary.pendingActions.length > 0 ? (
                  <ul className="space-y-1.5 list-disc pl-4 text-[11px] text-slate-600">
                    {summary.pendingActions.map((action: string, i: number) => (
                      <li key={i}>{action}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">No pending items highlighted.</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-teal-100/50 pt-3 mt-1">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Latest Progress: <strong className="text-slate-600">{summary.latestProgress || 'N/A'}</strong>
              </span>
              <span>Updated: {new Date(summary.generatedAt || summary.updatedAt).toLocaleTimeString()}</span>
            </div>
          </div>
        )}
      </div>

      {/* Discussion Forum Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* Messages List Area (Span 2) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl flex flex-col h-[520px] overflow-hidden shadow-xs">
          
          {/* Header */}
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Public Discussion Thread ({messages.length})
              </span>
            </div>

            {/* Admin Lock / Unlock Button */}
            {isAdmin && (
              <button
                onClick={handleToggleThreadLock}
                disabled={isTogglingLock}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold font-mono uppercase tracking-wider flex items-center gap-1 transition-all ${
                  thread?.isLocked
                    ? 'bg-rose-100 text-rose-700 border border-rose-200 hover:bg-rose-200'
                    : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                }`}
              >
                {isTogglingLock ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : thread?.isLocked ? (
                  <>
                    <Lock className="w-3 h-3" />
                    <span>Locked</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-3 h-3" />
                    <span>Lock Thread</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Messages List Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/25">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 space-y-2 p-6">
                <MessageSquare className="w-8 h-8 text-slate-300" />
                <p className="text-xs font-semibold">No comments posted on this complaint ledger yet.</p>
                <p className="text-[10px] text-slate-400 max-w-sm">
                  Verified residents from this ward, assigned officers, and managers can collaborate here to resolve concerns.
                </p>
              </div>
            ) : (
              messages.map((msg: any) => {
                const isOfficial = msg.messageType === 'OFFICIAL_UPDATE';
                const isSystem = msg.messageType === 'SYSTEM_MESSAGE';
                const isDeleted = msg.isDeleted;

                return (
                  <div
                    key={msg.id || msg._id}
                    className={`p-4 rounded-2xl border transition-all ${
                      isDeleted
                        ? 'bg-slate-100/50 border-slate-100 text-slate-400'
                        : isOfficial
                        ? 'bg-amber-50/50 border-amber-200 shadow-xs'
                        : msg.userRole === 'ADMIN'
                        ? 'bg-indigo-50/30 border-indigo-100'
                        : 'bg-white border-slate-100 shadow-2xs'
                    }`}
                  >
                    {/* Message Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
                          <User className="w-3.5 h-3.5 text-slate-500" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-800">
                            {msg.userName || 'Citizen'}
                          </span>
                          <span className="mx-1.5 text-slate-300 text-[10px]">•</span>
                          {isDeleted ? (
                            <span className="bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">
                              Moderated
                            </span>
                          ) : isOfficial ? (
                            <span className="bg-amber-100 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider flex items-center gap-1">
                              <Shield className="w-2.5 h-2.5 text-amber-600" />
                              Official Update
                            </span>
                          ) : msg.userRole === 'ADMIN' ? (
                            <span className="bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">
                              Admin Portal
                            </span>
                          ) : msg.userRole === 'DEPARTMENT_OFFICER' ? (
                            <span className="bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">
                              Officer
                            </span>
                          ) : isCreator ? (
                            <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">
                              Reporter (Author)
                            </span>
                          ) : (
                            <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">
                              Resident
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                        </span>
                        
                        {/* Admin Delete Comment Button */}
                        {isAdmin && !isDeleted && (
                          <div className="flex items-center gap-1.5">
                            {confirmDeleteId === (msg._id || msg.id) ? (
                              <div className="flex items-center gap-1 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-lg animate-fade-in">
                                <span className="text-[9px] text-rose-700 font-bold uppercase tracking-wider">Delete?</span>
                                <button
                                  onClick={() => {
                                    handleDeleteMessage(msg._id || msg.id);
                                    setConfirmDeleteId(null);
                                  }}
                                  className="text-[9px] font-extrabold text-rose-600 hover:text-rose-800 uppercase px-1 hover:bg-rose-100/50 rounded transition-colors"
                                >
                                  Yes
                                </button>
                                <span className="text-rose-300 text-[9px]">/</span>
                                <button
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="text-[9px] font-bold text-slate-500 hover:text-slate-800 uppercase px-1 hover:bg-slate-100 rounded transition-colors"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmDeleteId(msg._id || msg.id)}
                                className="p-1 text-slate-300 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                                title="Soft Delete Comment (Moderator)"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Message Body */}
                    <div className="text-xs text-slate-700 leading-relaxed font-sans whitespace-pre-line">
                      {isDeleted ? (
                        <p className="italic font-sans text-slate-400">
                          This comment was removed by a community moderator for violating neighborhood decorum guidelines.
                        </p>
                      ) : (
                        msg.message
                      )}
                    </div>

                    {/* Attached Images */}
                    {!isDeleted && msg.imageUrls && msg.imageUrls.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {msg.imageUrls.map((url: string, index: number) => (
                          <a
                            key={index}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="block w-24 h-16 rounded-xl border overflow-hidden bg-white hover:ring-2 hover:ring-teal-500 transition-all shrink-0"
                          >
                            <img src={url} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="Message Attachment" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Composer Box (Footer) */}
          <div className="p-4 border-t border-slate-100 bg-white">
            {isThreadClosed ? (
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-center text-xs text-slate-500 font-semibold flex items-center justify-center gap-2">
                <Lock className="w-4 h-4 text-slate-400" />
                This discussion has been locked as the issue is closed and archived.
              </div>
            ) : thread?.isLocked && !isAdmin ? (
              <div className="bg-rose-50 border border-rose-100 p-3 rounded-xl text-center text-xs text-rose-700 font-semibold flex items-center justify-center gap-2">
                <Lock className="w-4 h-4 text-rose-400" />
                This thread has been locked by administrators and is read-only.
              </div>
            ) : !isAllowedToPost ? (
              <div className="bg-amber-50/50 border border-amber-100 p-3.5 rounded-xl text-xs text-slate-600 leading-normal flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <strong>Read-Only Access:</strong> Participation is restricted to verified residents of <strong>Ward {reporterWard}, {reporterDistrict}</strong>, assigned officers, and system managers to prevent spam.
                </div>
              </div>
            ) : (
              <form onSubmit={handleSendMessage} className="space-y-3">
                {/* Image Previews */}
                {attachedImageUrls.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-2 bg-slate-50 border rounded-xl border-dashed">
                    {attachedImageUrls.map((url, i) => (
                      <div key={i} className="relative w-16 h-12 rounded-lg overflow-hidden border bg-white">
                        <img src={url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <button
                          type="button"
                          onClick={() => removeAttachedImage(i)}
                          className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full p-0.5 hover:bg-rose-600 shadow-xs"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Role Specific Control Panel */}
                {(isOfficer || isAdmin) && (
                  <div className="flex flex-wrap items-center gap-4 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs">
                    <label className="flex items-center gap-1.5 font-semibold text-slate-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isOfficialUpdate}
                        onChange={(e) => setIsOfficialUpdate(e.target.checked)}
                        className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 h-3.5 w-3.5"
                      />
                      <span>Post as Official Progress Update</span>
                    </label>

                    {isOfficialUpdate && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400">•</span>
                        <select
                          value={selectedMilestone}
                          onChange={(e) => setSelectedMilestone(e.target.value)}
                          className="bg-white border text-[11px] rounded px-2 py-0.5 font-sans focus:outline-none focus:ring-1 focus:ring-teal-500"
                          required
                        >
                          <option value="">Select Milestone...</option>
                          {officialMilestones.map(m => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {/* Composer Input Area */}
                <div className="flex items-center gap-2">
                  {/* Upload Image Clip */}
                  <label className={`shrink-0 p-2 border rounded-xl flex items-center justify-center cursor-pointer transition-colors ${
                    isUploading ? 'bg-slate-100 text-slate-300 border-slate-100' : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-500'
                  }`} title="Attach photo of progress or issue details">
                    {isUploading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={isUploading}
                      className="hidden"
                    />
                  </label>

                  <input
                    type="text"
                    value={newMessageText}
                    onChange={(e) => setNewMessageText(e.target.value)}
                    placeholder={
                      isOfficialUpdate
                        ? "Enter detail of this official milestone update..."
                        : "Type neighborhood message or request for status..."
                    }
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-sans focus:outline-none focus:ring-1 focus:ring-teal-500 focus:bg-white"
                  />

                  <button
                    type="submit"
                    disabled={isSending || (!newMessageText.trim() && attachedImageUrls.length === 0)}
                    className="bg-teal-600 text-white p-2 rounded-xl hover:bg-teal-700 disabled:opacity-40 disabled:hover:bg-teal-600 transition-colors active:scale-95"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Analytics & Rules Panel (Span 1) */}
        <div className="space-y-6">
          {/* Thread Statistics */}
          {analytics && (
            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-4 font-sans">
              <h5 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-100">
                Thread Audit Indicators
              </h5>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-3 bg-slate-50 border rounded-xl">
                  <span className="block text-[9px] font-bold text-slate-400 uppercase">Participant Vol.</span>
                  <span className="text-md font-extrabold text-slate-700 block mt-0.5">{analytics.participantCount || 0}</span>
                </div>
                <div className="p-3 bg-slate-50 border rounded-xl">
                  <span className="block text-[9px] font-bold text-slate-400 uppercase">Total Posts</span>
                  <span className="text-md font-extrabold text-slate-700 block mt-0.5">{analytics.messageCount || 0}</span>
                </div>
              </div>

              <div className="space-y-2 text-xs text-slate-600 pt-1.5">
                <div className="flex justify-between items-center">
                  <span>Resident Submissions:</span>
                  <strong className="text-slate-800">{analytics.citizenMessageCount || 0}</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span>Officer Statements:</span>
                  <strong className="text-slate-800">{analytics.officerMessageCount || 0}</strong>
                </div>
                <div className="flex justify-between items-center border-t border-dashed pt-2 mt-1">
                  <span>Avg Officer Response Time:</span>
                  <strong className="text-slate-800 font-mono">
                    {analytics.averageOfficerResponseTimeHours > 0
                      ? `${analytics.averageOfficerResponseTimeHours} Hours`
                      : 'No dialogue logs'}
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* neighborhood guideline handbook */}
          <div className="bg-slate-50/50 border border-slate-200 p-5 rounded-2xl space-y-3 font-sans text-xs text-slate-600 leading-normal">
            <h5 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-teal-600" />
              Neighborhood Guidelines
            </h5>
            <ul className="space-y-2 list-disc pl-4 text-[11px] text-slate-500">
              <li>This channel coordinates practical updates on the complaint dispatch.</li>
              <li>Only uploads showing real, physical site context or materials are permitted.</li>
              <li>Official milestones are highlighted in amber and published on the dispatch logs.</li>
              <li>Inappropriate, political, or abusive dialog is flagged for immediate soft-deletion.</li>
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
}
