import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { toast } from 'react-hot-toast';
import { Users, Shield, MapPin, Calendar, ExternalLink, ThumbsUp, Send, Check, X } from 'lucide-react';
import { store } from '../../../store';

const MyChapter = () => {
  const [membership, setMembership] = useState(null);
  const [chapter, setChapter] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modal Views
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [showReqModal, setShowReqModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  const [selectedMember, setSelectedMember] = useState(null);

  // Give Referral Form Fields
  const [refForm, setRefForm] = useState({
    recipient_id: '',
    referral_type: 'INSIDE',
    customer_name: '',
    customer_contact: '',
    requirement: '',
    description: '',
    budget_range: '',
    location: '',
    expected_timeline: '',
    referral_notes: '',
    privacy_level: 'FULL_CONTACT'
  });

  // Post Requirement Form Fields
  const [reqForm, setReqForm] = useState({
    title: '',
    description: '',
    category_id: '',
    specialty_id: '',
    budget: 0.00,
    location: '',
    timeline: '',
    urgency: 'MEDIUM',
    visibility: 'CHAPTER_ONLY'
  });

  useEffect(() => {
    fetchMyChapterData();
  }, []);

  const handleLeaveChapter = async () => {
    setShowLeaveModal(true);
  };

  const confirmLeaveChapter = async () => {
    try {
      const res = await api.delete('/business-network/my-memberships');
      if (res.data.success) {
        toast.success('Successfully left the chapter!');
        setMembership(null);
        setChapter(null);
        setShowLeaveModal(false);
      }
    } catch (error) {
      toast.error('Failed to leave chapter');
    }
  };

  const fetchMyChapterData = async () => {
    setLoading(true);
    try {
      // 1. Get my memberships
      const memRes = await api.get('/business-network/my-memberships');
      if (memRes.data.success && memRes.data.activeMembership) {
        setMembership(memRes.data.activeMembership);
        
        // 2. Fetch full chapter details
        const chRes = await api.get(`/business-network/chapters/${memRes.data.activeMembership.chapter_id}`);
        if (chRes.data.success) {
          setChapter(chRes.data.chapter);
        }
      }
    } catch (error) {
      toast.error('Failed to load chapter directory');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenProfile = async (member) => {
    try {
      const res = await api.get(`/business-network/profiles/${member.user_id}`);
      if (res.data.success) {
        setSelectedMember(res.data.profile);
        setShowProfileModal(true);
      }
    } catch (error) {
      toast.error('Failed to load profile details');
    }
  };

  const handleOpenReferral = (member) => {
    setRefForm({
      receiver_vendor_id: '',
      referral_type: 'INSIDE',
      customer_name: '',
      customer_contact: '',
      requirement: '',
      description: '',
      budget_range: '',
      location: '',
      expected_timeline: '',
      referral_notes: '',
      privacy_level: 'FULL_CONTACT'
    });
    setShowReferralModal(true);
  };

  const handleReferralSubmit = async (e) => {
    e.preventDefault();
    if (!refForm.receiver_vendor_id) {
      toast.error('Please select a recipient member.');
      return;
    }
    try {
      const payload = {
        ...refForm,
        recipient_id: refForm.receiver_vendor_id
      };
      const res = await api.post('/business-network/referrals', payload);
      if (res.data.success) {
        toast.success('Referral given successfully!');
        setShowReferralModal(false);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit referral');
    }
  };

  const handleOpenReq = (member) => {
    setSelectedMember(member);
    setReqForm({
      title: '',
      description: '',
      category_id: chapter?.id ? 1 : '', // placeholder
      specialty_id: member.specialty_id || '',
      budget: 0.00,
      location: '',
      timeline: '',
      urgency: 'MEDIUM',
      visibility: 'CHAPTER_ONLY'
    });
    setShowReqModal(true);
  };

  const handleReqSubmit = async (e) => {
    e.preventDefault();
    try {
      // Fetch matching category ID for this specialty to post requirement
      // For simplicity, we get category_id from selecting categories list
      const categoriesRes = await api.get('/business-network/categories');
      const cats = categoriesRes.data.data;
      let matchedCatId = '';
      cats.forEach(c => {
        if (c.specialties?.some(s => s.id === Number(reqForm.specialty_id))) {
          matchedCatId = c.id;
        }
      });

      const payload = {
        ...reqForm,
        category_id: Number(matchedCatId),
        specialty_id: Number(reqForm.specialty_id)
      };

      const res = await api.post('/business-network/requirements', payload);
      if (res.data.success) {
        toast.success('Business requirement posted successfully!');
        setShowReqModal(false);
      }
    } catch (error) {
      toast.error('Failed to submit requirement');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Chapter Directory</h1>
          <p className="text-sm text-gray-500 mt-1">
            Explore and connect with other active business members of your local networking group.
          </p>
        </div>
        {membership && (
          <button
            onClick={handleLeaveChapter}
            className="px-4 py-2 border border-red-200 hover:bg-red-50 text-red-600 rounded-xl text-xs font-bold transition-all shadow-sm shrink-0 cursor-pointer self-start sm:self-center"
          >
            Leave Chapter
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : !membership ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-gray-150 shadow-sm text-gray-400">
          You are not currently an active member of any Chapter. Find a chapter and apply first.
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in">
          {/* Chapter Details Banner */}
          <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1">
              <span className="text-[9px] bg-primary/10 text-primary px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                {chapter?.code}
              </span>
              <h2 className="text-lg font-extrabold text-gray-800 mt-2.5">{chapter?.name}</h2>
              <p className="text-xs text-gray-400">{chapter?.description}</p>
            </div>
            
            <div className="space-y-2 text-xs text-gray-600 border-t md:border-t-0 md:border-x border-gray-100 px-0 md:px-6 py-4 md:py-0">
              <p className="flex items-center gap-2"><MapPin size={15} className="text-gray-400" /> {chapter?.meeting_location}</p>
              <p className="flex items-center gap-2"><Calendar size={15} className="text-gray-400" /> Every {chapter?.meeting_day} | {chapter?.meeting_time}</p>
            </div>

            <div className="space-y-2 text-xs text-gray-600">
              <h4 className="font-bold text-gray-700">Chapter Admins:</h4>
              {chapter?.admins?.length === 0 ? (
                <p className="italic text-gray-400 text-[10px]">No assigned admins</p>
              ) : (
                chapter?.admins?.map(adm => (
                  <p key={adm.id} className="flex items-center gap-1.5 font-semibold text-gray-800">
                    <Shield size={13} className="text-primary shrink-0" /> {adm.name} ({adm.phone})
                  </p>
                ))
              )}
            </div>
          </div>

          {/* Members Grid */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider">Active Group Members ({chapter?.members?.length || 0}):</h3>
            {chapter?.members?.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No other active members found.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {chapter?.members?.map((mem) => (
                  <div
                    key={mem.member_table_id}
                    className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow group"
                  >
                    <div className="space-y-4">
                      {/* Logo and name */}
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center border">
                          {mem.business_logo ? (
                            <img src={mem.business_logo} alt={mem.business_name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="font-extrabold text-gray-400 text-lg">{mem.business_name?.[0]}</span>
                          )}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-gray-800 line-clamp-1">{mem.business_name}</h4>
                          <p className="text-[10px] text-gray-400 mt-0.5">Rep: <span className="font-semibold text-gray-600">{mem.owner_name}</span></p>
                          <span className="inline-block text-[9px] bg-secondary/10 text-secondary px-2.5 py-0.5 rounded-full font-bold uppercase mt-1">
                            {mem.specialty_name}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs text-gray-500 pt-3 border-t border-gray-100">
                        <p><span className="font-semibold text-gray-700">Location:</span> {mem.city}, {mem.state}</p>
                        <p><span className="font-semibold text-gray-700">Established:</span> {mem.year_established || 'N/A'}</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-4 mt-4 border-t border-gray-100 flex gap-2">
                      <button
                        onClick={() => handleOpenProfile(mem)}
                        className="flex-1 bg-gray-50 hover:bg-gray-100 border text-gray-700 font-bold text-[10px] py-2 rounded-xl transition-colors cursor-pointer text-center"
                      >
                        Profile
                      </button>
                      <button
                        onClick={() => handleOpenReferral(mem)}
                        className="flex-1 bg-primary hover:bg-opacity-95 text-white font-bold text-[10px] py-2 rounded-xl transition-all shadow-sm cursor-pointer flex items-center justify-center gap-0.5"
                      >
                        <ThumbsUp size={11} /> Referral
                      </button>
                      <button
                        onClick={() => handleOpenReq(mem)}
                        className="flex-1 bg-secondary hover:bg-opacity-95 text-white font-bold text-[10px] py-2 rounded-xl transition-all shadow-sm cursor-pointer flex items-center justify-center gap-0.5"
                      >
                        <Send size={11} /> Request
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Member Networking Profile Modal */}
      {showProfileModal && selectedMember && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-150 w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden animate-[zoomIn_0.15s_ease-out]">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900">Networking Profile Card</h2>
                <p className="text-xs text-gray-500">Representative details & target focus</p>
              </div>
              <button onClick={() => setShowProfileModal(false)} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg bg-gray-100">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5 text-sm">
              <div className="p-4 bg-gray-50 rounded-2xl flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gray-200 overflow-hidden shrink-0 flex items-center justify-center border font-bold text-gray-400">
                  {selectedMember.business_logo ? (
                    <img src={selectedMember.business_logo} alt={selectedMember.business_name} className="w-full h-full object-cover" />
                  ) : (
                    selectedMember.business_name?.[0]
                  )}
                </div>
                <div>
                  <h3 className="font-extrabold text-gray-900 text-base">{selectedMember.business_name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Specialty: <span className="font-bold text-secondary uppercase">{selectedMember.specialty_name}</span></p>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ideal Customer Type</p>
                  <p className="text-xs text-gray-700 font-semibold mt-1 bg-gray-50 p-3 border rounded-xl">
                    {selectedMember.ideal_customer || 'Not specified'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Preferred Referral Categories</p>
                  <p className="text-xs text-gray-700 font-semibold mt-1 bg-gray-50 p-3 border rounded-xl">
                    {selectedMember.preferred_referral_type || 'Not specified'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Target Industries</p>
                  <p className="text-xs text-gray-700 font-semibold mt-1 bg-gray-50 p-3 border rounded-xl">
                    {selectedMember.target_industries || 'Not specified'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Target Service Areas</p>
                  <p className="text-xs text-gray-700 font-semibold mt-1 bg-gray-50 p-3 border rounded-xl">
                    {selectedMember.service_areas || 'Not specified'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Business Description / Store Bio</p>
                  <p className="text-xs text-gray-600 bg-gray-50/50 p-3 rounded-xl border border-gray-100 mt-1">
                    {selectedMember.store_description || 'No store description registered.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Give Referral Modal */}
      {showReferralModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-150 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-[zoomIn_0.15s_ease-out]">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900">Give Business Referral</h2>
                <p className="text-xs text-gray-500">Submit a business opportunity to a group member.</p>
              </div>
              <button onClick={() => setShowReferralModal(false)} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg bg-gray-100">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleReferralSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Recipient Member *</label>
                <select
                  required
                  value={refForm.receiver_vendor_id}
                  onChange={(e) => setRefForm({ ...refForm, receiver_vendor_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-250 rounded-xl text-sm bg-white focus:outline-none"
                >
                  <option value="">-- Select Member --</option>
                  {(chapter?.members || [])
                    .filter(m => m.user_id !== store.getState().auth.user?.id)
                    .map(m => (
                      <option key={m.user_id} value={m.user_id}>
                        {m.business_name} ({m.owner_name} - {m.specialty_name})
                      </option>
                    ))
                  }
                </select>
              </div>

              {(() => {
                const selMember = (chapter?.members || []).find(m => String(m.user_id) === String(refForm.receiver_vendor_id));
                if (!selMember) return null;
                return (
                  <div className="p-3.5 bg-gray-50 border rounded-xl text-xs space-y-1.5 animate-fade-in">
                    <p className="text-gray-700 font-semibold"><span className="text-gray-400">Ideal Customer:</span> {selMember.ideal_customer || 'Not specified'}</p>
                    <p className="text-gray-700 font-semibold"><span className="text-gray-400">Preferred Referral:</span> {selMember.preferred_referral_type || 'Not specified'}</p>
                  </div>
                );
              })()}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Referral Type *</label>
                  <select
                    value={refForm.referral_type}
                    onChange={(e) => setRefForm({ ...refForm, referral_type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-250 rounded-xl text-sm bg-white"
                  >
                    <option value="INSIDE">Inside (For Member themselves)</option>
                    <option value="OUTSIDE">Outside (For Third Party client)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Privacy Sharing *</label>
                  <select
                    value={refForm.privacy_level}
                    onChange={(e) => setRefForm({ ...refForm, privacy_level: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-250 rounded-xl text-sm bg-white"
                  >
                    <option value="FULL_CONTACT">Full Contact Sharing</option>
                    <option value="PARTIAL_CONTACT">Partial Contact Sharing</option>
                    <option value="REQUEST_CONTACT">Request Contact Permission</option>
                    <option value="CONFIDENTIAL">Confidential Referral</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Customer Name</label>
                  <input
                    type="text"
                    value={refForm.customer_name}
                    onChange={(e) => setRefForm({ ...refForm, customer_name: e.target.value })}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Customer Contact (Phone/Email)</label>
                  <input
                    type="text"
                    value={refForm.customer_contact}
                    onChange={(e) => setRefForm({ ...refForm, customer_contact: e.target.value })}
                    placeholder="e.g. +91 9876543210"
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Requirement *</label>
                <input
                  type="text"
                  required
                  value={refForm.requirement}
                  onChange={(e) => setRefForm({ ...refForm, requirement: e.target.value })}
                  placeholder="e.g. Needs CA Auditing for Corporate filing"
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Description</label>
                <textarea
                  value={refForm.description}
                  onChange={(e) => setRefForm({ ...refForm, description: e.target.value })}
                  placeholder="Describe requirement details..."
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Budget Range</label>
                <input
                  type="text"
                  value={refForm.budget_range}
                  onChange={(e) => setRefForm({ ...refForm, budget_range: e.target.value })}
                  placeholder="e.g. ₹10,000 - ₹15,000"
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none"
                />
              </div>

              <div className="border-t border-gray-100 pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowReferralModal(false)}
                  className="px-5 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-primary text-white rounded-xl text-sm font-bold shadow-md hover:bg-opacity-95 transition-all"
                >
                  Send Referral
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Post Requirement Modal */}
      {showReqModal && selectedMember && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-150 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-[zoomIn_0.15s_ease-out]">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900">Post Requirement for specialty</h2>
                <p className="text-xs text-gray-500">Targets business specialty: <span className="font-semibold text-secondary uppercase">{selectedMember.specialty_name}</span></p>
              </div>
              <button onClick={() => setShowReqModal(false)} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg bg-gray-100">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleReqSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Requirement Title *</label>
                <input
                  type="text"
                  required
                  value={reqForm.title}
                  onChange={(e) => setReqForm({ ...reqForm, title: e.target.value })}
                  placeholder="e.g. Need Web Development company for B2B portal"
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Detailed Description</label>
                <textarea
                  value={reqForm.description}
                  onChange={(e) => setReqForm({ ...reqForm, description: e.target.value })}
                  placeholder="Explain client requirements in detail..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Budget (₹)</label>
                  <input
                    type="number"
                    value={reqForm.budget}
                    onChange={(e) => setReqForm({ ...reqForm, budget: Number(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Urgency *</label>
                  <select
                    value={reqForm.urgency}
                    onChange={(e) => setReqForm({ ...reqForm, urgency: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-250 rounded-xl text-sm bg-white"
                  >
                    <option value="LOW">Low urgency</option>
                    <option value="MEDIUM">Medium urgency</option>
                    <option value="HIGH">High urgency</option>
                    <option value="CRITICAL">Critical urgency</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Location</label>
                  <input
                    type="text"
                    value={reqForm.location}
                    onChange={(e) => setReqForm({ ...reqForm, location: e.target.value })}
                    placeholder="e.g. Erode / Coimbatore"
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Timeline</label>
                  <input
                    type="text"
                    value={reqForm.timeline}
                    onChange={(e) => setReqForm({ ...reqForm, timeline: e.target.value })}
                    placeholder="e.g. Within 2 weeks"
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowReqModal(false)}
                  className="px-5 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-secondary text-white rounded-xl text-sm font-bold shadow-md hover:bg-opacity-95 transition-all"
                >
                  Post Requirement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Leave Chapter Confirmation Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-150 w-full max-w-md flex flex-col overflow-hidden animate-[zoomIn_0.15s_ease-out]">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900">Leave Chapter</h2>
              <button onClick={() => setShowLeaveModal(false)} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg bg-gray-100">
                <X size={16} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-xs text-gray-600 font-semibold leading-relaxed">
                Are you sure you want to leave this chapter? Your membership will be deleted and you will need to apply again to join.
              </p>
              
              <div className="flex gap-2.5 pt-2">
                <button
                  onClick={() => setShowLeaveModal(false)}
                  className="flex-1 px-4 py-2 border rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmLeaveChapter}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-2 rounded-xl transition-all shadow-md cursor-pointer"
                >
                  Yes, Leave
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyChapter;
