import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { toast } from 'react-hot-toast';
import { MapPin, Calendar, Clock, Users, Shield, Plus, Edit2, Trash2, Search, X, Check, UserMinus } from 'lucide-react';

const Chapters = () => {
  const [chapters, setChapters] = useState([]);
  const [adminsList, setAdminsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Location filter states
  const [filterState, setFilterState] = useState('');
  const [filterDistrict, setFilterDistrict] = useState('');
  const [filterCity, setFilterCity] = useState('');

  // Modals
  const [showFormModal, setShowFormModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [selectedChapterAdmins, setSelectedChapterAdmins] = useState([]);
  const [selectedChapterMembers, setSelectedChapterMembers] = useState([]);

  // Form Fields
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    name: '',
    code: '',
    description: '',
    state: '',
    district: '',
    city: '',
    area: '',
    meeting_location: '',
    meeting_type: 'PHYSICAL',
    meeting_day: 'Wednesday',
    meeting_time: '07:00 AM',
    max_members: 40,
    min_members: 10,
    duplicate_specialty_rule: 'NOT_ALLOWED'
  });

  // Assign Admin Form Field
  const [newAdminId, setNewAdminId] = useState('');

  useEffect(() => {
    fetchChapters();
    fetchAdmins();
  }, []);

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
      toast.error('Failed to load chapters');
    } finally {
      setLoading(false);
    }
  };

  const fetchAdmins = async () => {
    try {
      const res = await api.get('/business-network/admins');
      if (res.data.success) {
        setAdminsList(res.data.admins);
      }
    } catch (error) {
      console.error('Failed to fetch admin list', error);
    }
  };

  const fetchChapterDetails = async (id) => {
    try {
      const res = await api.get(`/business-network/chapters/${id}`);
      if (res.data.success) {
        setSelectedChapter(res.data.chapter);
        setSelectedChapterAdmins(res.data.chapter.admins || []);
        setSelectedChapterMembers(res.data.chapter.members || []);
      }
    } catch (error) {
      toast.error('Failed to load chapter details');
    }
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm({
      name: '',
      code: '',
      description: '',
      state: 'Tamil Nadu',
      district: 'Erode',
      city: 'Erode',
      area: '',
      meeting_location: '',
      meeting_type: 'PHYSICAL',
      meeting_day: 'Wednesday',
      meeting_time: '07:00 AM',
      max_members: 40,
      min_members: 10,
      duplicate_specialty_rule: 'NOT_ALLOWED'
    });
    setShowFormModal(true);
  };

  const handleOpenEdit = (chapter) => {
    setEditingId(chapter.id);
    setForm({
      name: chapter.name,
      code: chapter.code,
      description: chapter.description,
      state: chapter.state,
      district: chapter.district,
      city: chapter.city,
      area: chapter.area || '',
      meeting_location: chapter.meeting_location,
      meeting_type: chapter.meeting_type,
      meeting_day: chapter.meeting_day,
      meeting_time: chapter.meeting_time,
      max_members: chapter.max_members,
      min_members: chapter.min_members,
      duplicate_specialty_rule: chapter.duplicate_specialty_rule
    });
    setShowFormModal(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        const res = await api.put(`/business-network/chapters/${editingId}`, form);
        if (res.data.success) {
          toast.success('Chapter updated successfully');
          setShowFormModal(false);
          fetchChapters();
        }
      } else {
        const res = await api.post('/business-network/chapters', form);
        if (res.data.success) {
          toast.success('Chapter created successfully');
          setShowFormModal(false);
          fetchChapters();
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error saving chapter');
    }
  };

  const handleDeleteChapter = async (id) => {
    if (!window.confirm('Are you sure you want to delete this chapter? This will remove all memberships.')) return;
    try {
      const res = await api.delete(`/business-network/chapters/${id}`);
      if (res.data.success) {
        toast.success('Chapter deleted successfully');
        fetchChapters();
      }
    } catch (error) {
      toast.error('Failed to delete chapter');
    }
  };

  const handleOpenAdmins = async (chapter) => {
    setSelectedChapter(chapter);
    await fetchChapterDetails(chapter.id);
    setShowAdminModal(true);
  };

  const handleAssignAdmin = async (e) => {
    e.preventDefault();
    if (!newAdminId || !selectedChapter) return;
    try {
      const res = await api.post(`/business-network/chapters/${selectedChapter.id}/admins`, {
        admin_id: newAdminId
      });
      if (res.data.success) {
        toast.success('Admin assigned successfully');
        setNewAdminId('');
        fetchChapterDetails(selectedChapter.id);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to assign admin');
    }
  };

  const handleRemoveAdmin = async (adminId) => {
    if (!window.confirm('Are you sure you want to remove this admin?')) return;
    try {
      const res = await api.delete(`/business-network/chapters/${selectedChapter.id}/admins/${adminId}`);
      if (res.data.success) {
        toast.success('Admin removed successfully');
        fetchChapterDetails(selectedChapter.id);
      }
    } catch (error) {
      toast.error('Failed to remove admin');
    }
  };

  const handleOpenDetails = async (chapter) => {
    setSelectedChapter(chapter);
    await fetchChapterDetails(chapter.id);
    setShowDetailsModal(true);
  };

  const filteredChapters = chapters.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Chapters Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Create Chapters, configure locations and meeting schedules, enforce capacity limits and duplicate specialties rules.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="bg-primary hover:bg-opacity-95 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md flex items-center gap-2 w-fit cursor-pointer"
        >
          <Plus size={18} /> Create Chapter
        </button>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-3 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search chapters by name or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <input
            type="text"
            placeholder="Filter State"
            value={filterState}
            onChange={(e) => setFilterState(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-xs w-32 focus:outline-none"
          />
          <input
            type="text"
            placeholder="Filter District"
            value={filterDistrict}
            onChange={(e) => setFilterDistrict(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-xs w-32 focus:outline-none"
          />
          <input
            type="text"
            placeholder="Filter City"
            value={filterCity}
            onChange={(e) => setFilterCity(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-xs w-32 focus:outline-none"
          />
          <button
            onClick={() => {
              fetchChapters();
            }}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-semibold text-xs transition-colors"
          >
            Apply Filters
          </button>
          {(filterState || filterDistrict || filterCity) && (
            <button
              onClick={() => {
                setFilterState('');
                setFilterDistrict('');
                setFilterCity('');
                setTimeout(fetchChapters, 50);
              }}
              className="text-red-500 hover:underline text-xs self-center"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Chapters Table / Cards */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredChapters.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-gray-150 shadow-sm text-gray-400">
          No Chapters created yet. Click "Create Chapter" to begin.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredChapters.map((ch) => (
            <div
              key={ch.id}
              className="bg-white rounded-2xl border border-gray-150 shadow-sm hover:shadow-md transition-all flex flex-col group overflow-hidden"
            >
              {/* Header */}
              <div className="p-5 border-b border-gray-100 bg-gray-50/50 group-hover:bg-blue-50/10 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] bg-primary/10 text-primary px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                    {ch.code}
                  </span>
                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleOpenEdit(ch)}
                      className="text-gray-500 hover:text-primary p-1 bg-white border border-gray-200 rounded-lg hover:border-primary transition-all"
                      title="Edit Chapter"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => handleDeleteChapter(ch.id)}
                      className="text-red-500 hover:text-red-700 p-1 bg-white border border-gray-200 rounded-lg hover:border-red-500 transition-all"
                      title="Delete Chapter"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <h3 className="text-base font-bold text-gray-900 mt-3 group-hover:text-primary transition-colors">
                  {ch.name}
                </h3>
              </div>

              {/* Body */}
              <div className="p-5 flex-1 space-y-3.5">
                <div className="flex items-start gap-2.5 text-xs text-gray-600">
                  <MapPin size={16} className="text-gray-400 shrink-0 mt-0.5" />
                  <span>
                    {ch.meeting_location} <br />
                    <span className="text-gray-400">
                      {ch.area ? `${ch.area}, ` : ''}
                      {ch.city}, {ch.district}, {ch.state}
                    </span>
                  </span>
                </div>

                <div className="flex items-center gap-2.5 text-xs text-gray-600">
                  <Calendar size={16} className="text-gray-400 shrink-0" />
                  <span>{ch.meeting_day}s ({ch.meeting_type})</span>
                </div>

                <div className="flex items-center gap-2.5 text-xs text-gray-600">
                  <Clock size={16} className="text-gray-400 shrink-0" />
                  <span>{ch.meeting_time}</span>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs">
                  <span className="flex items-center gap-1 text-gray-500 font-medium">
                    <Users size={14} /> Active Members:
                  </span>
                  <span className="font-bold text-gray-800">
                    {ch.member_count} / {ch.max_members}
                  </span>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="px-5 py-3.5 border-t border-gray-100 bg-gray-50/30 flex gap-2">
                <button
                  onClick={() => handleOpenDetails(ch)}
                  className="flex-1 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-bold text-xs py-2 rounded-xl transition-all cursor-pointer text-center"
                >
                  View Details
                </button>
                <button
                  onClick={() => handleOpenAdmins(ch)}
                  className="flex-1 bg-blue-50 hover:bg-blue-100 text-primary border border-blue-100 font-bold text-xs py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  <Shield size={12} /> Chapter Admins
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Chapters Create/Edit Modal */}
      {showFormModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-150 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-[zoomIn_0.15s_ease-out]">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                {editingId ? 'Edit Chapter Settings' : 'Create Business Networking Chapter'}
              </h2>
              <button onClick={() => setShowFormModal(false)} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg bg-gray-100">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Chapter Name *</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. IBC Erode - Growth Chapter"
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Chapter Code *</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value })}
                      placeholder="e.g. IBC-ERD-GROWTH-001"
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (form.name) {
                          const acronym = form.name.split(' ').map(w => w[0]).join('').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
                          const rand = Math.floor(100 + Math.random() * 900);
                          setForm({ ...form, code: `IBC-${acronym}-${rand}` });
                        }
                      }}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs px-2.5 rounded-xl font-semibold border"
                    >
                      Autogen
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe the chapter scope or focus area..."
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">State *</label>
                  <input
                    type="text"
                    required
                    value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">District *</label>
                  <input
                    type="text"
                    required
                    value={form.district}
                    onChange={(e) => setForm({ ...form, district: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">City *</label>
                  <input
                    type="text"
                    required
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Area</label>
                  <input
                    type="text"
                    value={form.area}
                    onChange={(e) => setForm({ ...form, area: e.target.value })}
                    placeholder="Neighborhood"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Meeting Location *</label>
                  <input
                    type="text"
                    required
                    value={form.meeting_location}
                    onChange={(e) => setForm({ ...form, meeting_location: e.target.value })}
                    placeholder="Hotel details or Online Link URL"
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Meeting Type *</label>
                  <select
                    value={form.meeting_type}
                    onChange={(e) => setForm({ ...form, meeting_type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm bg-white"
                  >
                    <option value="PHYSICAL">Physical Meeting</option>
                    <option value="ONLINE">Online Meeting</option>
                    <option value="HYBRID">Hybrid Meeting</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Meeting Day *</label>
                  <select
                    value={form.meeting_day}
                    onChange={(e) => setForm({ ...form, meeting_day: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white"
                  >
                    <option value="Monday">Monday</option>
                    <option value="Tuesday">Tuesday</option>
                    <option value="Wednesday">Wednesday</option>
                    <option value="Thursday">Thursday</option>
                    <option value="Friday">Friday</option>
                    <option value="Saturday">Saturday</option>
                    <option value="Sunday">Sunday</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Meeting Time *</label>
                  <input
                    type="text"
                    required
                    value={form.meeting_time}
                    onChange={(e) => setForm({ ...form, meeting_time: e.target.value })}
                    placeholder="e.g. 07:00 AM - 08:30 AM"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Duplicate Specialty rule *</label>
                  <select
                    value={form.duplicate_specialty_rule}
                    onChange={(e) => setForm({ ...form, duplicate_specialty_rule: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white font-semibold text-primary"
                  >
                    <option value="NOT_ALLOWED">Strict (1 Specialty Per Chapter)</option>
                    <option value="ALLOWED">Flexible (Allow Duplicate Specialties)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Min Members Limit</label>
                  <input
                    type="number"
                    value={form.min_members}
                    onChange={(e) => setForm({ ...form, min_members: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Max Members Capacity</label>
                  <input
                    type="number"
                    value={form.max_members}
                    onChange={(e) => setForm({ ...form, max_members: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-5 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-primary text-white rounded-xl text-sm font-bold shadow-md hover:bg-opacity-95"
                >
                  Save Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Chapter Admins Configuration Modal */}
      {showAdminModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-150 w-full max-w-lg flex flex-col overflow-hidden animate-[zoomIn_0.15s_ease-out]">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900">{selectedChapter?.name}</h2>
                <p className="text-xs text-gray-500">Configure administrative assignments for this chapter</p>
              </div>
              <button onClick={() => setShowAdminModal(false)} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg bg-gray-100">
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Assign Form */}
              <form onSubmit={handleAssignAdmin} className="flex gap-2">
                <select
                  required
                  value={newAdminId}
                  onChange={(e) => setNewAdminId(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-xs bg-white"
                >
                  <option value="">Select admin user to assign...</option>
                  {adminsList.map(adm => (
                    <option key={adm.id} value={adm.id}>
                      {adm.name} ({adm.email})
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="bg-primary text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm"
                >
                  Assign Admin
                </button>
              </form>

              {/* Admins List */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider">Assigned Chapter Admins:</h3>
                {selectedChapterAdmins.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No Admins assigned yet. Super Admins hold access by default.</p>
                ) : (
                  <div className="divide-y divide-gray-100 max-h-60 overflow-y-auto scrollbar-thin">
                    {selectedChapterAdmins.map(admin => (
                      <div key={admin.id} className="py-2.5 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-gray-800">{admin.name}</p>
                          <p className="text-[10px] text-gray-500">{admin.email}</p>
                        </div>
                        <button
                          onClick={() => handleRemoveAdmin(admin.id)}
                          className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-1.5 rounded-lg transition-colors"
                          title="Remove Admin"
                        >
                          <UserMinus size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chapter Details View Modal */}
      {showDetailsModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-150 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-[zoomIn_0.15s_ease-out]">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{selectedChapter?.name}</h2>
                <p className="text-xs text-gray-500">Chapter Code: <span className="font-semibold text-primary">{selectedChapter?.code}</span></p>
              </div>
              <button onClick={() => setShowDetailsModal(false)} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg bg-gray-100">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Meta stats */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-blue-50/30 border border-blue-50 rounded-2xl">
                <div className="text-center">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Capacity</p>
                  <p className="text-lg font-extrabold text-primary">{selectedChapterMembers.length} / {selectedChapter?.max_members}</p>
                </div>
                <div className="text-center border-x border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Meeting</p>
                  <p className="text-xs font-bold text-gray-800 mt-1">{selectedChapter?.meeting_day}s</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Specialty Rule</p>
                  <p className="text-[10px] font-bold text-secondary mt-1 uppercase">
                    {selectedChapter?.duplicate_specialty_rule === 'NOT_ALLOWED' ? 'Strict' : 'Flexible'}
                  </p>
                </div>
              </div>

              {/* Members List */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider">Active Members ({selectedChapterMembers.length}):</h3>
                {selectedChapterMembers.length === 0 ? (
                  <p className="text-xs text-gray-400 italic py-4">No active members registered in this Chapter.</p>
                ) : (
                  <div className="border border-gray-150 rounded-xl overflow-hidden divide-y divide-gray-150">
                    {selectedChapterMembers.map(mem => (
                      <div key={mem.member_table_id} className="p-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center border">
                            {mem.business_logo ? (
                              <img src={mem.business_logo} alt={mem.business_name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="font-bold text-gray-400 text-sm">{mem.business_name?.[0]}</span>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900">{mem.business_name}</p>
                            <p className="text-[10px] text-gray-500">
                              Representative: <span className="font-semibold text-gray-700">{mem.owner_name}</span> | City: {mem.city}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] bg-secondary/10 text-secondary px-2.5 py-0.5 rounded-full font-bold uppercase">
                            {mem.specialty_name}
                          </span>
                          <p className="text-[8px] text-gray-400 mt-1">Joined: {new Date(mem.joined_date).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chapters;
