import React, { useState, useEffect } from 'react';
import { getAuthHeaders } from '../../utils/auth.js';
import { PlusCircle, RefreshCw, Power, AlertTriangle, Loader2 } from 'lucide-react';
import { isValidQuizCategoryName, sanitizeText } from '../../utils/validation.js';

export default function AdminQuizManager() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchData();

    // Set up a polling interval to auto-refresh counts so the admin sees the questions populate live
    const interval = setInterval(() => {
      fetchData(true);
    }, 5000); // refresh every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const cRes = await fetch('/api/gamification/admin/categories', { headers: getAuthHeaders() });
      const cData = await cRes.json();
      if (cData.success) setCategories(cData.data);
    } catch (e) {
      console.error(e);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanName = sanitizeText(catName);
    const cleanDesc = sanitizeText(catDesc);

    if (!isValidQuizCategoryName(cleanName)) {
      setErrorMsg('Category name is required and cannot exceed 100 characters.');
      return;
    }

    if (!cleanDesc) {
      setErrorMsg('Category description is required.');
      return;
    }

    try {
      const res = await fetch('/api/gamification/admin/categories', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name: cleanName, description: cleanDesc })
      });
      if (res.ok) {
        setShowCategoryForm(false);
        setCatName('');
        setCatDesc('');
        fetchData();
      } else {
        const errorData = await res.json();
        setErrorMsg(errorData.error || 'Failed to create category.');
      }
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || 'An error occurred during category creation.');
    }
  };

  const triggerRegeneration = async (categoryId: string) => {
    setActionLoading(categoryId);
    try {
      const res = await fetch(`/api/gamification/admin/categories/${categoryId}/regenerate`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        fetchData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  const toggleStatus = async (categoryId: string, currentStatus: boolean) => {
    setActionLoading(`status-${categoryId}`);
    try {
      const res = await fetch(`/api/gamification/admin/categories/${categoryId}/status`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ isActive: !currentStatus })
      });
      if (res.ok) {
        fetchData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Categories */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-900">Quiz Categories (AI Generated)</h2>
          <button 
            onClick={() => setShowCategoryForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition"
          >
            <PlusCircle className="w-4 h-4" /> New Category
          </button>
        </div>

        {showCategoryForm && (
          <form onSubmit={handleCreateCategory} className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
            {errorMsg && (
              <div className="mb-4 p-3 bg-rose-50 border-l-4 border-rose-500 text-rose-800 text-xs rounded-r-lg flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold mb-1">Name</label>
                <input required value={catName} onChange={e=>setCatName(e.target.value)} className="w-full border rounded p-2 text-sm" placeholder="e.g. Traffic Rules" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Description</label>
                <input required value={catDesc} onChange={e=>setCatDesc(e.target.value)} className="w-full border rounded p-2 text-sm" placeholder="Basic rules of the road." />
              </div>
            </div>
            <div className="mt-4 flex gap-2 justify-end">
              <button type="button" onClick={()=>{setShowCategoryForm(false); setErrorMsg(null);}} className="px-4 py-2 text-sm text-slate-600 font-semibold">Cancel</button>
              <button type="submit" className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg font-semibold">Create & Auto-Generate Questions</button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {categories.map(c => (
            <div key={c._id} className="flex flex-col p-5 border rounded-xl border-slate-200 shadow-sm bg-white hover:border-indigo-200 transition relative">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">{c.name}</h3>
                  <p className="text-xs text-slate-500 mt-1">{c.description}</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-bold ${c.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {c.isActive ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </div>
              
              {c.isGenerating ? (
                <div className="bg-indigo-50 rounded-lg p-4 mb-4 flex-grow flex flex-col items-center justify-center text-center border border-indigo-100 min-h-[120px]">
                  <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-2" />
                  <p className="text-sm font-semibold text-indigo-900">AI Model is Generating...</p>
                  <p className="text-xs text-indigo-600 animate-pulse mt-1">Populating 100 questions</p>
                </div>
              ) : (
                <div className="bg-indigo-50 rounded-lg p-3 mb-4 flex-grow flex flex-col justify-between min-h-[120px]">
                  <div>
                    <p className="text-sm font-semibold text-indigo-900">Available Questions</p>
                    <p className="text-3xl font-black text-indigo-600">{c.questionCount || 0}</p>
                  </div>
                  {c.questionCount < 50 && (
                    <p className="text-xs text-amber-600 font-medium mt-1">Low pool size. Generation recommended.</p>
                  )}
                </div>
              )}

              {c.generationError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-red-700 leading-normal">{c.generationError}</p>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => triggerRegeneration(c._id)}
                  disabled={actionLoading === c._id || c.isGenerating}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg text-xs font-bold transition disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${(actionLoading === c._id || c.isGenerating) ? 'animate-spin' : ''}`} />
                  {c.isGenerating ? 'Generating...' : 'Regenerate (+100)'}
                </button>
                <button
                  onClick={() => toggleStatus(c._id, c.isActive)}
                  disabled={actionLoading === `status-${c._id}`}
                  className="flex items-center justify-center p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition disabled:opacity-50"
                  title={c.isActive ? 'Disable Category' : 'Enable Category'}
                >
                  <Power className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          
          {categories.length === 0 && !loading && (
            <div className="col-span-full p-8 text-center border-2 border-dashed border-slate-200 rounded-xl text-slate-500 font-medium">
              No categories created yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
