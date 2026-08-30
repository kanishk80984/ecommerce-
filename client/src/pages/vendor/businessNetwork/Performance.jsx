import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { toast } from 'react-hot-toast';
import { Award, Compass, HeartHandshake, ShieldCheck, Edit, Save, CheckCircle, Clock } from 'lucide-react';
import { useSelector } from 'react-redux';

const Performance = () => {
  const { user } = useSelector(state => state.auth);
  
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    ideal_customer: '',
    preferred_referral_type: '',
    target_industries: '',
    service_areas: '',
    business_capacity: ''
  });

  useEffect(() => {
    fetchProfileAndStats();
  }, []);

  const fetchProfileAndStats = async () => {
    setLoading(true);
    try {
      // 1. Get stats
      const statsRes = await api.get('/business-network/dashboard/vendor');
      if (statsRes.data.success) {
        setStats(statsRes.data.stats);
      }

      // 2. Get profile details
      const profileRes = await api.get(`/business-network/profiles/${user.id}`);
      if (profileRes.data.success) {
        setProfile(profileRes.data.profile);
        setForm({
          ideal_customer: profileRes.data.profile.ideal_customer || '',
          preferred_referral_type: profileRes.data.profile.preferred_referral_type || '',
          target_industries: profileRes.data.profile.target_industries || '',
          service_areas: profileRes.data.profile.service_areas || '',
          business_capacity: profileRes.data.profile.business_capacity || ''
        });
      }
    } catch (error) {
      toast.error('Failed to load performance scorecard');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/business-network/profiles', form);
      if (res.data.success) {
        toast.success('Networking profile updated successfully!');
        setIsEditing(false);
        fetchProfileAndStats();
      }
    } catch (error) {
      toast.error('Failed to save profile');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Performance Scorecard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Review your given/received conversions and manage your networking-specific business profile.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          {/* Stats Panel */}
          <div className="lg:col-span-1 space-y-6">
            {/* Conversion Score Card */}
            <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm flex flex-col justify-between h-48">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Closed Business Won</p>
                <p className="text-3xl font-extrabold text-green-600 mt-2">
                  ${Number(stats?.businessReceived || 0).toLocaleString()}
                </p>
              </div>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <CheckCircle size={14} className="text-green-500" /> Revenue generated through received leads
              </p>
            </div>

            {/* Referral Given Value */}
            <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm flex flex-col justify-between h-48">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Business Contributed</p>
                <p className="text-3xl font-extrabold text-primary mt-2">
                  ${Number(stats?.businessGiven || 0).toLocaleString()}
                </p>
              </div>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <HeartHandshake size={14} className="text-primary" /> Revenue generated for other members
              </p>
            </div>

            {/* Stats list */}
            <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm space-y-3.5 text-xs text-gray-600">
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Scorecard Summary:</h3>
              <div className="flex justify-between py-1 border-b">
                <span>Referrals Passed:</span>
                <span className="font-bold text-gray-800">{stats?.referralsGiven || 0}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span>Successful Given:</span>
                <span className="font-bold text-green-600">{stats?.referralsGivenWon || 0}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span>Referrals Received:</span>
                <span className="font-bold text-gray-800">{stats?.referralsReceived || 0}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span>Successful Received:</span>
                <span className="font-bold text-primary">{stats?.referralsReceivedWon || 0}</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Attendance Rate:</span>
                <span className="font-bold text-gray-800">{stats?.attendancePercent || 0}%</span>
              </div>
            </div>
          </div>

          {/* Profile Card Configuration */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-150 shadow-sm flex flex-col justify-between min-h-[500px]">
            <div>
              <div className="flex justify-between items-center border-b border-gray-100 pb-3 mb-6">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Networking Profile Fields</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Define your ideal referral match criteria</p>
                </div>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors cursor-pointer"
                  >
                    <Edit size={14} /> Edit Profile
                  </button>
                )}
              </div>

              {isEditing ? (
                <form onSubmit={handleProfileSave} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-gray-600 mb-1.5 uppercase">Ideal Customer Description</label>
                    <input
                      type="text"
                      value={form.ideal_customer}
                      onChange={(e) => setForm({ ...form, ideal_customer: e.target.value })}
                      placeholder="e.g. Small & Medium Retail stores looking for online expansion"
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-600 mb-1.5 uppercase">Preferred Referral Type</label>
                    <input
                      type="text"
                      value={form.preferred_referral_type}
                      onChange={(e) => setForm({ ...form, preferred_referral_type: e.target.value })}
                      placeholder="e.g. Direct Introductions to Business Owners needing SaaS platforms"
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-600 mb-1.5 uppercase">Target Industries</label>
                    <input
                      type="text"
                      value={form.target_industries}
                      onChange={(e) => setForm({ ...form, target_industries: e.target.value })}
                      placeholder="e.g. Retail, Manufacturing, Logistics, E-commerce"
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-600 mb-1.5 uppercase">Target Service Areas</label>
                    <input
                      type="text"
                      value={form.service_areas}
                      onChange={(e) => setForm({ ...form, service_areas: e.target.value })}
                      placeholder="e.g. Erode, Coimbatore, Salem, Tirupur"
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-600 mb-1.5 uppercase">Business Capacity / Limits</label>
                    <input
                      type="text"
                      value={form.business_capacity}
                      onChange={(e) => setForm({ ...form, business_capacity: e.target.value })}
                      placeholder="e.g. Up to 5 mid-size projects simultaneously"
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none"
                    />
                  </div>

                  <div className="flex gap-2 justify-end pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        fetchProfileAndStats();
                      }}
                      className="px-4 py-2 border rounded-xl text-gray-600 font-semibold hover:bg-gray-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-primary text-white rounded-xl font-bold flex items-center gap-1 shadow-md hover:bg-opacity-95 transition-all cursor-pointer"
                    >
                      <Save size={14} /> Save Profile
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-5 text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="font-bold text-gray-400 uppercase tracking-wider">Ideal Customer</p>
                      <p className="text-gray-800 font-semibold bg-gray-50/50 p-3 rounded-xl border border-gray-100 mt-1">
                        {profile?.ideal_customer || 'Not specified yet. Click Edit to fill.'}
                      </p>
                    </div>
                    <div>
                      <p className="font-bold text-gray-400 uppercase tracking-wider">Preferred Referrals</p>
                      <p className="text-gray-800 font-semibold bg-gray-50/50 p-3 rounded-xl border border-gray-100 mt-1">
                        {profile?.preferred_referral_type || 'Not specified yet.'}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="font-bold text-gray-400 uppercase tracking-wider">Target Industries</p>
                    <p className="text-gray-800 font-semibold bg-gray-50/50 p-3 rounded-xl border border-gray-100 mt-1">
                      {profile?.target_industries || 'Not specified.'}
                    </p>
                  </div>

                  <div>
                    <p className="font-bold text-gray-400 uppercase tracking-wider">Service Areas</p>
                    <p className="text-gray-800 font-semibold bg-gray-50/50 p-3 rounded-xl border border-gray-100 mt-1">
                      {profile?.service_areas || 'Not specified.'}
                    </p>
                  </div>

                  <div>
                    <p className="font-bold text-gray-400 uppercase tracking-wider">Business Capacity</p>
                    <p className="text-gray-800 font-semibold bg-gray-50/50 p-3 rounded-xl border border-gray-100 mt-1">
                      {profile?.business_capacity || 'Not specified.'}
                    </p>
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

export default Performance;
