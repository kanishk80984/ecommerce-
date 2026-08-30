import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { toast } from 'react-hot-toast';
import { Users, Plus, Calendar, Clock, MapPin, X, Info } from 'lucide-react';

const Visitors = () => {
  const [chapters, setChapters] = useState([]);
  const [visitorRequests, setVisitorRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRequestModal, setShowRequestModal] = useState(false);

  // Form Fields
  const [form, setForm] = useState({
    chapter_id: '',
    name: '',
    business_name: '',
    category: '',
    specialty: '',
    phone: '',
    email: '',
    reason_for_visit: '',
    preferred_date: ''
  });

  useEffect(() => {
    fetchChapters();
    fetchVisitorRequests();
  }, []);

  const fetchChapters = async () => {
    try {
      const res = await api.get('/business-network/chapters');
      if (res.data.success) {
        setChapters(res.data.chapters);
        if (res.data.chapters.length > 0) {
          setForm(prev => ({ ...prev, chapter_id: res.data.chapters[0].id }));
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchVisitorRequests = async () => {
    setLoading(true);
    try {
      const res = await api.get('/business-network/visitors');
      if (res.data.success) {
        // Filter visitor requests where user contact matches or they posted it
        // Since we logged visitor requests in the backend table, we fetch visitor requests list
        setVisitorRequests(res.data.visitors);
      }
    } catch (error) {
      toast.error('Failed to load visit requests');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/business-network/visitors', form);
      if (res.data.success) {
        toast.success(res.data.message || 'Visit request registered successfully!');
        setShowRequestModal(false);
        setForm({
          chapter_id: chapters[0]?.id || '',
          name: '',
          business_name: '',
          category: '',
          specialty: '',
          phone: '',
          email: '',
          reason_for_visit: '',
          preferred_date: ''
        });
        fetchVisitorRequests();
      }
    } catch (error) {
      toast.error('Failed to register visit request');
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'APPROVED': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'ATTENDED': return 'bg-green-100 text-green-700 border-green-200';
      case 'REJECTED': return 'bg-red-100 text-red-750 border-red-200';
      default: return 'bg-gray-100 text-gray-500 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Chapter Guest Visits</h1>
          <p className="text-sm text-gray-500 mt-1">
            Request to visit other local networking Chapters, connect with their members, and discover opportunities.
          </p>
        </div>
        <button
          onClick={() => setShowRequestModal(true)}
          className="bg-primary hover:bg-opacity-95 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md flex items-center gap-2 w-fit cursor-pointer animate-colors"
        >
          <Plus size={18} /> Request Visit
        </button>
      </div>

      {/* Guest visit cards / tables */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : visitorRequests.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-gray-150 shadow-sm text-gray-400">
          You haven't requested any Chapter visits yet. Click "Request Visit" to register your interest.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-150 shadow-sm overflow-hidden animate-fade-in">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-600 uppercase tracking-wider">
                  <th className="px-6 py-4">Chapter Name</th>
                  <th className="px-6 py-4">Preferred Visit Date</th>
                  <th className="px-6 py-4">Visitor & Specialty</th>
                  <th className="px-6 py-4">Invitation Meeting Slot</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {visitorRequests.map((vis) => (
                  <tr key={vis.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-800">{vis.chapter_name}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">{vis.chapter_code}</p>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-600 font-semibold">
                      {new Date(vis.preferred_date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-850">{vis.name}</p>
                      <span className="inline-block text-[9px] bg-secondary/10 text-secondary px-2 py-0.5 rounded-full font-bold uppercase mt-1">
                        {vis.specialty}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500">
                      {vis.meeting_id ? (
                        <span className="font-bold text-primary">Meeting Slot #{vis.meeting_id}</span>
                      ) : (
                        <span className="italic text-gray-400">Not assigned yet</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase border ${getStatusClass(vis.status)}`}>
                        {vis.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Visitor Request Form Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-150 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-[zoomIn_0.15s_ease-out]">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900">Request Guest Visit to Chapter</h2>
              <button onClick={() => setShowRequestModal(false)} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg bg-gray-100">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleRequestSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-600 mb-1.5 uppercase">Select Target Chapter *</label>
                <select
                  required
                  value={form.chapter_id}
                  onChange={(e) => setForm({ ...form, chapter_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-250 rounded-xl text-sm bg-white"
                >
                  {chapters.map(ch => (
                    <option key={ch.id} value={ch.id}>{ch.name} ({ch.code})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-600 mb-1.5 uppercase">Your Name *</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Anand"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-600 mb-1.5 uppercase">Your Business / Company *</label>
                  <input
                    type="text"
                    required
                    value={form.business_name}
                    onChange={(e) => setForm({ ...form, business_name: e.target.value })}
                    placeholder="e.g. Anand CA Firm"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-600 mb-1.5 uppercase">Broad Category *</label>
                  <input
                    type="text"
                    required
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    placeholder="e.g. Legal & Finance"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-600 mb-1.5 uppercase">Specific Specialty *</label>
                  <input
                    type="text"
                    required
                    value={form.specialty}
                    onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                    placeholder="e.g. Tax Consultant"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-600 mb-1.5 uppercase">Phone *</label>
                  <input
                    type="text"
                    required
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="e.g. +91 9876543210"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-600 mb-1.5 uppercase">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="e.g. anand@example.com"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-600 mb-1.5 uppercase">Preferred Date *</label>
                <input
                  type="date"
                  required
                  value={form.preferred_date}
                  onChange={(e) => setForm({ ...form, preferred_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-600 mb-1.5 uppercase">Reason for Guest Visit / Motivation</label>
                <textarea
                  value={form.reason_for_visit}
                  onChange={(e) => setForm({ ...form, reason_for_visit: e.target.value })}
                  placeholder="Describe what opportunities you seek..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none text-xs"
                />
              </div>

              <div className="border-t border-gray-100 pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="px-4 py-2 border border-gray-200 rounded-lg font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary text-white rounded-lg font-bold shadow-sm"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Visitors;
