import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Users, CheckCircle, Award, Wallet, Copy, IndianRupee, Gift, Link as LinkIcon, FileText, ArrowLeft } from 'lucide-react';
const VendorReferral = () => {
  const [stats, setStats] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [referralCode, setReferralCode] = useState('');
  const [currentBonus, setCurrentBonus] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAllReferrals, setShowAllReferrals] = useState(false);
  const [showAllMobile, setShowAllMobile] = useState(false);

  const displayedReferrals = showAllReferrals ? referrals : referrals.slice(0, 5);

  useEffect(() => {
    fetchDashboard();
    fetchReferrals();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/vendor/referral-dashboard');
      if (res.data.success) {
        setStats(res.data.data.stats);
        setReferralCode(res.data.data.referralCode);
        setCurrentBonus(res.data.data.currentBonus || 500);
      }
    } catch (error) {
      toast.error('Failed to load referral stats');
    }
  };

  const fetchReferrals = async () => {
    try {
      const res = await api.get('/vendor/referral-list');
      if (res.data.success) {
        setReferrals(res.data.referrals);
      }
    } catch (error) {
      toast.error('Failed to load referrals');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!referralCode) return;
    const link = `${window.location.origin}/register?role=VENDOR&ref=${referralCode}`;
    
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(link);
        toast.success('Referral link copied to clipboard!');
      } catch (err) {
        toast.error('Failed to copy link');
      }
    } else {
      // Fallback for non-HTTPS environments (like local network testing)
      const textArea = document.createElement("textarea");
      textArea.value = link;
      textArea.style.position = "absolute";
      textArea.style.left = "-999999px";
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        toast.success('Referral link copied to clipboard!');
      } catch (err) {
        toast.error('Failed to copy link');
      } finally {
        textArea.remove();
      }
    }
  };

  const renderTable = (data) => (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-gray-50 text-gray-600 text-xs md:text-sm">
            <th className="px-2 md:px-6 py-3 md:py-4 font-medium border-b whitespace-nowrap w-8 md:w-12 text-center">#</th>
            <th className="px-2 md:px-6 py-3 md:py-4 font-medium border-b whitespace-nowrap">Business Name</th>
            <th className="px-2 md:px-6 py-3 md:py-4 font-medium border-b whitespace-nowrap">Referral ID</th>
            <th className="px-2 md:px-6 py-3 md:py-4 font-medium border-b whitespace-nowrap">Bonus</th>
            <th className="px-2 md:px-6 py-3 md:py-4 font-medium border-b whitespace-nowrap">Status</th>
            <th className="px-2 md:px-6 py-3 md:py-4 font-medium border-b whitespace-nowrap">Date & Time</th>
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan="6" className="px-2 md:px-6 py-6 md:py-8 text-center text-gray-500 text-xs md:text-sm">
                No referrals yet. Start inviting vendors!
              </td>
            </tr>
          ) : (
            data.map((ref, index) => (
              <tr key={ref.id} className="border-b last:border-b-0 hover:bg-gray-50/50">
                <td className="px-2 md:px-6 py-3 md:py-4 text-xs md:text-sm text-gray-500 font-medium text-center">{index + 1}</td>
                <td className="px-2 md:px-6 py-3 md:py-4 text-xs md:text-sm font-medium text-gray-900">{ref.business_name || 'N/A'}</td>
                <td className="px-2 md:px-6 py-3 md:py-4 text-[11px] md:text-sm text-gray-500">{ref.referral_code}</td>
                <td className="px-2 md:px-6 py-3 md:py-4 text-xs md:text-sm font-semibold text-green-600 whitespace-nowrap">
                  ₹{ref.bonus_amount_given || currentBonus}
                </td>
                <td className="px-2 md:px-6 py-3 md:py-4">
                  <div className="scale-90 md:scale-100 origin-left">
                    <StatusBadge status={ref.status} />
                  </div>
                </td>
                <td className="px-2 md:px-6 py-3 md:py-4 text-[11px] md:text-sm text-gray-500 whitespace-nowrap">
                  {ref.registered_at ? new Date(ref.registered_at).toLocaleString('en-GB', { 
                    day: '2-digit', 
                    month: 'short', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                  }).toUpperCase() : 'N/A'}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  if (loading) return <div className="p-8 text-center">Loading Referral Data...</div>;

  return (
    <div className="max-w-6xl space-y-6 pb-24 md:pb-6">
      {/* Header and Referral Link */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6 flex flex-col gap-5">
        <div className="flex items-start gap-4">
          <div className="bg-green-50 p-3 rounded-full shrink-0">
            <Gift className="text-green-600 w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-800">Refer & Earn</h2>
            <p className="text-sm text-gray-500 mt-1">
              Invite other vendors and earn a bonus of <strong className="text-green-600">₹{currentBonus}</strong> when they sign up and start using the platform.
            </p>
          </div>
        </div>

        {referralCode && (
          <div className="bg-green-50/30 border-0 md:border md:border-green-100 rounded-xl p-4 mt-2">
            <h3 className="text-sm font-bold text-gray-800 mb-3">Your Referral Link</h3>
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
              <div className="flex items-center gap-3 bg-white border border-gray-200 border-dashed rounded-lg p-3 flex-1 overflow-hidden">
                <LinkIcon className="text-gray-400 w-5 h-5 shrink-0" />
                <code className="text-[11px] md:text-xs text-gray-600 break-all select-all flex-1">
                  {`${window.location.origin}/register?role=VENDOR&ref=${referralCode}`}
                </code>
              </div>
              <button 
                onClick={copyToClipboard}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 md:py-2 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors shrink-0"
              >
                <Copy size={18} />
                Copy Link
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard iconBg="bg-blue-50" icon={<Users size={24} className="text-blue-600" />} title="Total Referrals" value={stats.totalReferrals} />
          <StatCard iconBg="bg-orange-50" icon={<FileText size={24} className="text-orange-600" />} title="Registered" value={stats.registeredCount} />
          <StatCard iconBg="bg-purple-50" icon={<Award size={24} className="text-purple-600" />} title="Admin Accepted" value={stats.acceptedCount} />
          <StatCard iconBg="bg-green-50" icon={<CheckCircle size={24} className="text-green-600" />} title="Login Success" value={stats.loginSuccessfulCount} />
          <StatCard iconBg="bg-green-50" icon={<IndianRupee size={24} className="text-green-600" />} title="Total Earned" value={`₹${stats.totalEarned}`} />
          <StatCard iconBg="bg-blue-50" icon={<Wallet size={24} className="text-blue-600" />} title="Wallet Balance" value={`₹${stats.walletBalance}`} />
        </div>
      )}

      {/* Referrals List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b-0 md:border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">Your Referrals</h3>
          <button 
            onClick={() => {
              if (window.innerWidth < 768) {
                setShowAllMobile(true);
              } else {
                setShowAllReferrals(!showAllReferrals);
              }
            }}
            className="text-sm font-semibold text-blue-600 cursor-pointer hover:underline bg-transparent border-none p-0"
          >
            {showAllReferrals && window.innerWidth >= 768 ? 'View Less' : 'View All'}
          </button>
        </div>
        <div className="hidden md:block">
          {renderTable(displayedReferrals)}
        </div>
      </div>

      {/* Mobile Full Screen View All Referrals */}
      {showAllMobile && (
        <div className="md:hidden fixed inset-0 z-50 bg-gray-50 flex flex-col h-screen overflow-hidden">
          <div className="p-4 bg-white border-b border-gray-200 flex items-center gap-3">
            <button 
              onClick={() => setShowAllMobile(false)}
              className="p-1 text-gray-500 hover:text-gray-800"
            >
              <ArrowLeft size={22} />
            </button>
            <h2 className="font-bold text-lg text-gray-900">All Referrals</h2>
          </div>
          <div className="flex-1 overflow-y-auto bg-white">
            {renderTable(referrals)}
          </div>
        </div>
      )}
    </div>
  );
};

const AnimatedNumber = ({ value, duration = 1500 }) => {
  const [count, setCount] = useState(0);
  
  const isCurrency = typeof value === 'string' && value.startsWith('₹');
  const targetValue = isCurrency ? parseInt(value.replace(/[^0-9.-]+/g, ''), 10) : Number(value);

  useEffect(() => {
    if (isNaN(targetValue)) return;
    
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 4); // easeOutQuart
      setCount(Math.floor(easeProgress * targetValue));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setCount(targetValue);
      }
    };
    window.requestAnimationFrame(step);
  }, [targetValue, duration]);

  if (isNaN(targetValue)) return <span>{value}</span>;

  // Format with commas for large numbers if needed, but since original didn't, we keep it simple
  return <span>{isCurrency ? `₹${count}` : count}</span>;
};

const StatCard = ({ icon, title, value, iconBg }) => (
  <div className="bg-white rounded-xl border border-gray-100 p-3 md:p-5 shadow-sm flex flex-row md:flex-col items-center h-full">
    <div className={`p-2.5 md:p-3 rounded-full shrink-0 ${iconBg || 'bg-gray-50'} mb-0 md:mb-3 mr-3 md:mr-0`}>
      {icon}
    </div>
    <div className="flex-1 flex flex-col items-center justify-center">
      <p className="text-[1.1rem] md:text-2xl font-bold text-gray-900 mb-0.5 md:mb-1">
        <AnimatedNumber value={value} />
      </p>
      <p className="text-[10px] md:text-xs text-gray-500 font-medium whitespace-nowrap">{title}</p>
    </div>
  </div>
);

const StatusBadge = ({ status }) => {
  const styles = {
    REGISTERED: 'text-orange-700 bg-transparent md:bg-orange-100',
    ADMIN_ACCEPTED: 'text-purple-700 bg-transparent md:bg-purple-100',
    LOGIN_SUCCESSFUL: 'text-green-700 bg-transparent md:bg-green-100',
    REWARDED: 'text-green-800 bg-transparent md:bg-green-100 font-bold',
  };

  const labels = {
    REGISTERED: 'Registered',
    ADMIN_ACCEPTED: 'Approved (Awaiting Login)',
    LOGIN_SUCCESSFUL: 'Login Successful',
    REWARDED: 'Rewarded',
  };

  return (
    <span className={`md:px-2.5 md:py-1 rounded-full text-[11px] md:text-xs font-semibold whitespace-nowrap ${styles[status] || 'bg-transparent md:bg-gray-100 text-gray-700'}`}>
      {labels[status] || status}
    </span>
  );
};

export default VendorReferral;
