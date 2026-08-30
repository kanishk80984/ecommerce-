import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { toast } from 'react-hot-toast';
import { ClipboardList, Plus, AlertCircle, MapPin, Calendar, ExternalLink, ThumbsUp, Send, Check, X, ShieldAlert, BadgeHelp } from 'lucide-react';

const Requirements = () => {
  const [requirements, setRequirements] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMatchesModal, setShowMatchesModal] = useState(false);
  
  const [selectedReq, setSelectedReq] = useState(null);
  const [matches, setMatches] = useState([]);
  const [matchingLoading, setMatchingLoading] = useState(false);

  // Form Fields
  const [form, setForm] = useState({
    title: '',
    description: '',
    specialty_id: '',
    budget: 0.00,
    location: '',
    timeline: '',
    urgency: 'MEDIUM',
    visibility: 'CHAPTER_ONLY'
  });

  useEffect(() => {
    fetchRequirements();
    fetchCategories();
  }, []);

  const fetchRequirements = async () => {
    setLoading(true);
    try {
      const res = await api.get('/business-network/requirements');
      if (res.data.success) {
        setRequirements(res.data.requirements);
      }
    } catch (error) {
      toast.error('Failed to load connection requirements');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get('/business-network/categories');
      if (res.data.success) {
        setCategories(res.data.data);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!form.specialty_id) {
      toast.error('Please select the specialty required');
      return;
    }

    try {
      // Find matching category ID
      let categoryId = '';
      categories.forEach(cat => {
        if (cat.specialties?.some(s => s.id === Number(form.specialty_id))) {
          categoryId = cat.id;
        }
      });

      const res = await api.post('/business-network/requirements', {
        ...form,
        category_id: Number(categoryId),
        specialty_id: Number(form.specialty_id)
      });

      if (res.data.success) {
        toast.success('Requirement posted successfully');
        setShowCreateModal(false);
        setForm({
          title: '',
          description: '',
          specialty_id: '',
          budget: 0.00,
          location: '',
          timeline: '',
          urgency: 'MEDIUM',
          visibility: 'CHAPTER_ONLY'
        });
        fetchRequirements();
      }
    } catch (error) {
      toast.error('Failed to post requirement');
    }
  };

  const handleOpenMatches = async (req) => {
    setSelectedReq(req);
    setShowMatchesModal(true);
    setMatches([]);
    setMatchingLoading(true);
    try {
      const res = await api.get(`/business-network/requirements/${req.id}/matches`);
      if (res.data.success) {
        setMatches(res.data.matches);
      }
    } catch (error) {
      toast.error('Failed to load recommendation matches');
    } finally {
      setMatchingLoading(false);
    }
  };

  const getUrgencyBadge = (urgency) => {
    switch (urgency) {
      case 'CRITICAL': return 'bg-red-100 text-red-700 border-red-200';
      case 'HIGH': return 'bg-orange-100 text-orange-600 border-orange-200';
      default: return 'bg-gray-100 text-gray-500 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads & Requirements Feed</h1>
          <p className="text-sm text-gray-500 mt-1">
            Post business requirements, discover open requests, and check recommended matching members.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-primary hover:bg-opacity-95 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md flex items-center gap-2 w-fit cursor-pointer animate-colors"
        >
          <Plus size={18} /> Post Requirement
        </button>
      </div>

      {/* Requirements Feed */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : requirements.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-gray-150 shadow-sm text-gray-400">
          No open business requirements posted in your network.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
          {requirements.map((req) => (
            <div
              key={req.id}
              className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow group"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className={`text-[9px] px-2.5 py-1 rounded-full font-bold uppercase border ${getUrgencyBadge(req.urgency)}`}>
                    {req.urgency} Urgency
                  </span>
                  <span className="text-[10px] text-gray-400 font-bold uppercase">
                    {req.visibility.replace('_', ' ')}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-extrabold text-gray-800 line-clamp-1">{req.title}</h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Posted by: <span className="font-semibold text-gray-700">{req.creator_name} ({req.creator_business || 'IBC Member'})</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-3 line-clamp-2 italic">"{req.description}"</p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs text-gray-600 pt-3 border-t border-gray-100">
                  <p className="truncate"><span className="font-semibold text-gray-700">Specialty required:</span> <span className="text-secondary font-bold uppercase text-[10px]">{req.specialty_name}</span></p>
                  <p className="truncate"><span className="font-semibold text-gray-700">Budget:</span> ${Number(req.budget).toLocaleString()}</p>
                  <p className="truncate"><span className="font-semibold text-gray-700">Location:</span> {req.location || 'N/A'}</p>
                  <p className="truncate"><span className="font-semibold text-gray-700">Timeline:</span> {req.timeline || 'N/A'}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 mt-4 border-t border-gray-100 flex gap-2">
                <button
                  onClick={() => handleOpenMatches(req)}
                  className="w-full bg-primary hover:bg-opacity-95 text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <ClipboardList size={14} /> Recommended Matching Members
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Post Requirement Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-150 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-[zoomIn_0.15s_ease-out]">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900">Post Business Requirement</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg bg-gray-100">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Requirement Title *</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Seeking Web Designer for retail platform"
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Description / Details *</label>
                <textarea
                  required
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Elaborate details of the project requirement..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Specialty Required *</label>
                  <select
                    required
                    value={form.specialty_id}
                    onChange={(e) => setForm({ ...form, specialty_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-250 rounded-xl text-sm bg-white"
                  >
                    <option value="">Select specialty...</option>
                    {categories.map(cat => (
                      <optgroup key={cat.id} label={cat.name}>
                        {cat.specialties?.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Urgency *</label>
                  <select
                    value={form.urgency}
                    onChange={(e) => setForm({ ...form, urgency: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-250 rounded-xl text-sm bg-white"
                  >
                    <option value="LOW">Low Urgency</option>
                    <option value="MEDIUM">Medium Urgency</option>
                    <option value="HIGH">High Urgency</option>
                    <option value="CRITICAL">Critical Urgency</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Budget ($)</label>
                  <input
                    type="number"
                    value={form.budget}
                    onChange={(e) => setForm({ ...form, budget: Number(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Visibility *</label>
                  <select
                    value={form.visibility}
                    onChange={(e) => setForm({ ...form, visibility: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-250 rounded-xl text-sm bg-white"
                  >
                    <option value="CHAPTER_ONLY">My Chapter Only</option>
                    <option value="NETWORK">Entire Network</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Location</label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder="e.g. Erode"
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Timeline</label>
                  <input
                    type="text"
                    value={form.timeline}
                    onChange={(e) => setForm({ ...form, timeline: e.target.value })}
                    placeholder="e.g. 1 Month"
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-primary text-white rounded-xl text-sm font-bold shadow-md hover:bg-opacity-95 transition-all"
                >
                  Post Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Match Recommendations Score Modal */}
      {showMatchesModal && selectedReq && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-150 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-[zoomIn_0.15s_ease-out]">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900">Member Match Recommendations</h2>
                <p className="text-xs text-gray-500">Requirement: {selectedReq.title} ({selectedReq.specialty_name})</p>
              </div>
              <button onClick={() => setShowMatchesModal(false)} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg bg-gray-100">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {matchingLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-primary"></div>
                </div>
              ) : matches.length === 0 ? (
                <p className="text-xs text-gray-400 italic py-8 text-center">No matching active members found for this specialty in the network.</p>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs text-gray-500 italic">
                    Recommendations are ranked based on specialty alignment (50pts), district location proximity (30pts), profile verification status (10pts), and experience (10pts).
                  </p>
                  
                  <div className="divide-y divide-gray-100 border border-gray-150 rounded-2xl overflow-hidden bg-white">
                    {matches.map((match) => (
                      <div key={match.vendor_id} className="p-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-gray-100 overflow-hidden border shrink-0 flex items-center justify-center text-gray-400 font-bold">
                            {match.business_logo ? (
                              <img src={match.business_logo} alt={match.business_name} className="w-full h-full object-cover" />
                            ) : (
                              match.business_name?.[0]
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-800 line-clamp-1">{match.business_name}</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              Chapter: <span className="font-semibold text-gray-600">{match.chapter_name}</span> | District: {match.district || 'N/A'}
                            </p>
                          </div>
                        </div>

                        {/* Match score card badge */}
                        <div className="shrink-0 flex flex-col items-end gap-1">
                          <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border ${
                            match.matchScore >= 80 
                              ? 'text-green-600 bg-green-50 border-green-200' 
                              : 'text-orange-500 bg-orange-50 border-orange-200'
                          }`}>
                            Score: {match.matchScore}% Match
                          </span>
                          <span className="text-[8px] bg-secondary/10 text-secondary px-2 rounded-full font-bold uppercase">
                            {match.specialty_name}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Requirements;
