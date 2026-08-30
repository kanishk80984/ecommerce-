import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { toast } from 'react-hot-toast';
import { MapPin, Calendar, Clock, Users, ArrowRight, X, Sparkles, AlertTriangle } from 'lucide-react';

const FindChapters = () => {
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [myMembership, setMyMembership] = useState(null);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);

  // Search & Filter States
  const [filterState, setFilterState] = useState('Tamil Nadu');
  const [filterDistrict, setFilterDistrict] = useState('Erode');
  const [filterCity, setFilterCity] = useState('');

  // Modals
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);

  const [selectedChapter, setSelectedChapter] = useState(null);
  const [selectedChapterMembers, setSelectedChapterMembers] = useState([]);
  const [vacancies, setVacancies] = useState([]);

  // Apply Form Fields
  const [form, setForm] = useState({
    chapter_id: '',
    specialty_id: '',
    why_join: '',
    expected_contribution: '',
    referral_interests: ''
  });

  useEffect(() => {
    fetchChapters();
    fetchCategories();
    fetchMyMembership();
  }, []);

  const fetchMyMembership = async () => {
    try {
      const res = await api.get('/business-network/my-memberships');
      if (res.data.success) {
        if (res.data.activeMembership) {
          setMyMembership(res.data.activeMembership);
        }
        const pending = res.data.requests?.some(r => r.status === 'PENDING');
        setHasPendingRequest(pending);
      }
    } catch (error) {
      console.error('Failed to load membership status', error);
    }
  };

  const fetchChapters = async () => {
    setLoading(true);
    try {
      const res = await api.get('/business-network/chapters', {
        params: {
          state: filterState || undefined,
          district: filterDistrict || undefined,
          city: filterCity || undefined
        }
      });
      if (res.data.success) {
        setChapters(res.data.chapters);
      }
    } catch (error) {
      toast.error('Failed to search chapters');
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

  const handleOpenView = async (chapter) => {
    setSelectedChapter(chapter);
    setShowViewModal(true);
    setVacancies([]);

    try {
      const res = await api.get(`/business-network/chapters/${chapter.id}`);
      if (res.data.success) {
        const members = res.data.chapter.members || [];
        setSelectedChapterMembers(members);

        // Calculate vacant/occupied specialties
        // Get all specialties across categories
        const allSpecs = [];
        categories.forEach(cat => {
          cat.specialties?.forEach(s => {
            allSpecs.push({
              ...s,
              categoryName: cat.name
            });
          });
        });

        const list = allSpecs.map(spec => {
          const occupiedBy = members.find(m => m.specialty_name.toLowerCase() === spec.name.toLowerCase());
          return {
            ...spec,
            isOccupied: !!occupiedBy,
            occupiedMember: occupiedBy ? occupiedBy.business_name : null
          };
        });
        setVacancies(list);
      }
    } catch (error) {
      toast.error('Failed to load chapter details');
    }
  };

  const handleOpenApply = (chapter) => {
    setForm({
      chapter_id: chapter.id,
      specialty_id: '',
      why_join: '',
      expected_contribution: '',
      referral_interests: ''
    });
    setSelectedChapter(chapter);
    setShowApplyModal(true);
  };

  const handleApplySubmit = async (e) => {
    e.preventDefault();
    if (!form.specialty_id) {
      toast.error('Please select your business specialty');
      return;
    }

    try {
      const res = await api.post('/business-network/membership-requests', form);
      if (res.data.success) {
        toast.success(res.data.message || 'Application submitted successfully!');
        setShowApplyModal(false);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit application');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Find Chapters</h1>
        <p className="text-sm text-gray-500 mt-1">
          Explore networking groups, inspect category openings, and apply to join a Chapter near you.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="flex flex-wrap gap-3 items-center w-full">
          <div className="flex flex-col gap-1 w-full md:w-44">
            <span className="text-[10px] font-bold text-gray-400 uppercase">State</span>
            <input
              type="text"
              value={filterState}
              onChange={(e) => setFilterState(e.target.value)}
              className="px-3.5 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none"
            />
          </div>
          <div className="flex flex-col gap-1 w-full md:w-44">
            <span className="text-[10px] font-bold text-gray-400 uppercase">District</span>
            <input
              type="text"
              value={filterDistrict}
              onChange={(e) => setFilterDistrict(e.target.value)}
              className="px-3.5 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none"
            />
          </div>
          <div className="flex flex-col gap-1 w-full md:w-44">
            <span className="text-[10px] font-bold text-gray-400 uppercase">City</span>
            <input
              type="text"
              value={filterCity}
              onChange={(e) => setFilterCity(e.target.value)}
              placeholder="All Cities"
              className="px-3.5 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none"
            />
          </div>
          <button
            onClick={fetchChapters}
            className="bg-primary hover:bg-opacity-95 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-md self-end h-9 mt-4 cursor-pointer"
          >
            Search Chapters
          </button>
        </div>
      </div>

      {/* Chapter Listings */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : chapters.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-gray-150 shadow-sm text-gray-400">
          No Chapters found matching the selected locations. Try expanding your search district.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
          {chapters.map((ch) => (
            <div
              key={ch.id}
              className="bg-white rounded-2xl border border-gray-150 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow group overflow-hidden"
            >
              {/* Header */}
              <div className="p-5 border-b border-gray-100 bg-gray-50/50">
                <span className="text-[9px] bg-primary/10 text-primary px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                  {ch.code}
                </span>
                <h3 className="text-sm font-extrabold text-gray-800 mt-2.5 group-hover:text-primary transition-colors">
                  {ch.name}
                </h3>
              </div>

              {/* Specs */}
              <div className="p-5 flex-1 space-y-3.5">
                <div className="flex items-start gap-2.5 text-xs text-gray-600">
                  <MapPin size={16} className="text-gray-400 shrink-0 mt-0.5" />
                  <span>
                    {ch.meeting_location} <br />
                    <span className="text-gray-400">{ch.city}, {ch.district}</span>
                  </span>
                </div>

                <div className="flex items-center gap-2.5 text-xs text-gray-600">
                  <Calendar size={16} className="text-gray-400 shrink-0" />
                  <span>Meetings: {ch.meeting_day}s ({ch.meeting_type})</span>
                </div>

                <div className="flex items-center gap-2.5 text-xs text-gray-600">
                  <Clock size={16} className="text-gray-400 shrink-0" />
                  <span>{ch.meeting_time}</span>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs">
                  <span className="flex items-center gap-1 text-gray-500 font-medium">
                    <Users size={14} /> Members:
                  </span>
                  <span className="font-bold text-gray-800">
                    {ch.member_count} / {ch.max_members}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="p-5 pt-0 flex gap-2">
                <button
                  onClick={() => handleOpenView(ch)}
                  className="flex-1 bg-white hover:bg-gray-50 border text-gray-700 font-bold text-xs py-2.5 rounded-xl transition-colors cursor-pointer text-center"
                >
                  View Details & Slots
                </button>
                {myMembership ? (
                  <button
                    disabled
                    className="flex-1 bg-gray-100 text-gray-400 border border-gray-200 font-bold text-xs py-2.5 rounded-xl cursor-not-allowed flex items-center justify-center gap-1"
                  >
                    Already a Member
                  </button>
                ) : hasPendingRequest ? (
                  <button
                    disabled
                    className="flex-1 bg-yellow-50 text-yellow-600 border border-yellow-250 font-bold text-xs py-2.5 rounded-xl cursor-not-allowed flex items-center justify-center gap-1 animate-pulse"
                  >
                    Pending Approval
                  </button>
                ) : (
                  <button
                    onClick={() => handleOpenApply(ch)}
                    className="flex-1 bg-accent hover:bg-opacity-95 text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-sm cursor-pointer flex items-center justify-center gap-1"
                  >
                    Apply <ArrowRight size={12} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Chapter Detail Slots Modal */}
      {showViewModal && selectedChapter && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-150 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-[zoomIn_0.15s_ease-out]">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900">{selectedChapter.name}</h2>
                <p className="text-xs text-gray-500">Location: {selectedChapter.city}, {selectedChapter.district}</p>
              </div>
              <button onClick={() => setShowViewModal(false)} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg bg-gray-100">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Meeting info */}
              <div className="grid grid-cols-2 gap-4 border p-4 rounded-2xl bg-gray-50">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Meeting Schedule</p>
                  <p className="text-xs font-bold text-gray-800 mt-1">{selectedChapter.meeting_day}s | {selectedChapter.meeting_time}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">Location: {selectedChapter.meeting_location}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Slots rule</p>
                  <p className="text-xs font-bold text-secondary mt-1">
                    {selectedChapter.duplicate_specialty_rule === 'NOT_ALLOWED' 
                      ? 'Strict Uniqueness (No duplicate specialties)'
                      : 'Flexible Slots (Duplicate specialties allowed)'
                    }
                  </p>
                </div>
              </div>

              {/* Specialties Slot vacancy checklist */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={15} className="text-accent" /> Specialties Slots Status:
                </h3>
                
                {vacancies.length === 0 ? (
                  <div className="animate-pulse space-y-2 py-4">
                    <div className="h-4 bg-gray-100 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-100 rounded w-1/2"></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-h-60 overflow-y-auto pr-1.5 scrollbar-thin">
                    {vacancies.map((v) => (
                      <div
                        key={v.id}
                        className={`p-3 rounded-xl border flex items-center justify-between text-xs font-medium transition-all ${
                          v.isOccupied 
                            ? 'bg-red-50/20 border-red-100' 
                            : 'bg-green-50/20 border-green-100'
                        }`}
                      >
                        <div>
                          <p className="font-bold text-gray-800">{v.name}</p>
                          <p className="text-[9px] text-gray-400 uppercase tracking-wider font-bold mt-0.5">{v.categoryName}</p>
                        </div>
                        <div>
                          {v.isOccupied ? (
                            <span className="text-[9px] font-extrabold text-red-500 uppercase tracking-wider bg-red-100/50 px-2 py-0.5 rounded-full" title={`Occupied by: ${v.occupiedMember}`}>
                              Occupied
                            </span>
                          ) : (
                            <span className="text-[9px] font-extrabold text-green-600 uppercase tracking-wider bg-green-100/50 px-2 py-0.5 rounded-full">
                              Vacant
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-gray-100 pt-4 flex gap-2">
                <button
                  onClick={() => setShowViewModal(false)}
                  className="flex-1 px-4 py-2.5 border rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 text-center"
                >
                  Close details
                </button>
                {myMembership ? (
                  <button
                    disabled
                    className="flex-1 bg-gray-100 text-gray-400 border border-gray-200 font-bold text-xs py-2.5 rounded-xl cursor-not-allowed flex items-center justify-center gap-1.5"
                  >
                    Already a Member
                  </button>
                ) : hasPendingRequest ? (
                  <button
                    disabled
                    className="flex-1 bg-yellow-50 text-yellow-600 border border-yellow-250 font-bold text-xs py-2.5 rounded-xl cursor-not-allowed flex items-center justify-center gap-1.5 animate-pulse"
                  >
                    Pending Approval
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setShowViewModal(false);
                      handleOpenApply(selectedChapter);
                    }}
                    className="flex-1 bg-accent hover:bg-opacity-95 text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
                  >
                    Apply to Join <ArrowRight size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Apply to Chapter Modal Form */}
      {showApplyModal && selectedChapter && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-150 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-[zoomIn_0.15s_ease-out]">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900">Apply to Join Chapter</h2>
                <p className="text-xs text-gray-500">Chapter: {selectedChapter.name}</p>
              </div>
              <button onClick={() => setShowApplyModal(false)} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg bg-gray-100">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleApplySubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Note banner */}
              <div className="bg-yellow-50 p-4 border border-yellow-100 rounded-xl flex gap-2 text-xs text-yellow-700">
                <AlertTriangle className="shrink-0 mt-0.5" size={16} />
                <p>
                  Important: Chapter rules may prevent duplicate specialties inside this group. Please select an unoccupied specialty.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Choose Your Represented Specialty *</label>
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
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Why do you want to join? *</label>
                <textarea
                  required
                  value={form.why_join}
                  onChange={(e) => setForm({ ...form, why_join: e.target.value })}
                  placeholder="Describe your motivations..."
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Expected Contribution *</label>
                <textarea
                  required
                  value={form.expected_contribution}
                  onChange={(e) => setForm({ ...form, expected_contribution: e.target.value })}
                  placeholder="What value or referral potential do you bring to this group?"
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Referral Interests *</label>
                <textarea
                  required
                  value={form.referral_interests}
                  onChange={(e) => setForm({ ...form, referral_interests: e.target.value })}
                  placeholder="What type of customer referrals are you seeking from members?"
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none"
                />
              </div>

              <div className="border-t border-gray-100 pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="px-5 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-accent text-white rounded-xl text-sm font-bold shadow-md hover:bg-opacity-95 transition-all"
                >
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FindChapters;
