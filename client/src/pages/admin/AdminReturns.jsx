import React, { useState, useEffect } from 'react';
import { RefreshCcw, Search, Eye, Filter, Activity, FileJson, Server, Globe, Package, CheckCircle, XCircle } from 'lucide-react';
import api from '../../services/api';
import ReturnTrackingTimeline from '../../components/returns/ReturnTrackingTimeline';
import { getImageUrl } from '../../utils/imageUrl';

// Mock Logs for Super Admin
const MOCK_DELIVERY_LOGS = [
  { id: 'DL-1', time: new Date().toISOString(), status: 'SUCCESS', details: 'Delivery requested to EcomExpress for order #1234' },
  { id: 'DL-2', time: new Date(Date.now() - 3600000).toISOString(), status: 'FAILED', details: 'Delhivery API timeout during AWB generation' },
  { id: 'DL-3', time: new Date(Date.now() - 7200000).toISOString(), status: 'SUCCESS', details: 'Shadowfax pickup scheduled for return #8' }
];

const MOCK_API_LOGS = [
  { id: 'AL-1', time: new Date().toISOString(), method: 'POST', endpoint: '/api/returns/vendor/8/action', status: 200, latency: '124ms' },
  { id: 'AL-2', time: new Date(Date.now() - 5001).toISOString(), method: 'GET', endpoint: '/api/returns/admin', status: 200, latency: '45ms' },
  { id: 'AL-3', time: new Date(Date.now() - 15001).toISOString(), method: 'POST', endpoint: '/api/orders/payment', status: 500, latency: '850ms' }
];

const MOCK_WEBHOOK_LOGS = [
  { id: 'WL-1', time: new Date().toISOString(), provider: 'Razorpay', event: 'payment.captured', status: 'PROCESSED' },
  { id: 'WL-2', time: new Date(Date.now() - 60000).toISOString(), provider: 'Stripe', event: 'charge.refunded', status: 'PROCESSED' },
  { id: 'WL-3', time: new Date(Date.now() - 120000).toISOString(), provider: 'Delhivery', event: 'shipment.update', status: 'FAILED_RETRY' }
];

const AdminReturns = () => {
  const [activeTab, setActiveTab] = useState('DASHBOARD');
  const [activeLogTab, setActiveLogTab] = useState('DELIVERY');

  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailsModal, setDetailsModal] = useState({ isOpen: false, req: null });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchReturns();
  }, []);

  const fetchReturns = async () => {
    try {
      const res = await api.get('/returns/admin');
      setReturns(res.data.returns || []);
    } catch (error) {
      console.error('Failed to fetch admin returns', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminAction = async (returnId, action) => {
    try {
      await api.post(`/returns/admin/${returnId}/action`, { action });
      alert(`Return request ${action} successful.`);
      setDetailsModal({ isOpen: false, req: null });
      fetchReturns();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to process admin action.');
    }
  };

  const filteredReturns = returns.filter(r => {
    return r.id.toString().includes(searchTerm) || r.order_id.toString().includes(searchTerm) || (r.product_name || '').toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Analytics Calculation
  const totalReturns = returns.length;
  const approvedReturns = returns.filter(r => r.status === 'APPROVED' || r.status === 'RETURN_RECEIVED' || r.status === 'REFUNDED').length;
  const rejectedReturns = returns.filter(r => r.status === 'REJECTED').length;
  const pendingReturns = returns.filter(r => r.status === 'REQUESTED').length;

  return (
    <div className="p-6 w-full space-y-6">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="text-primary" />
            Super Admin Return Center
          </h2>
          <p className="text-sm text-gray-500 mt-1">Enterprise dashboard for returns, analytics, and system logs.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200">
        {['DASHBOARD', 'ANALYTICS', 'LOGS'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 px-2 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 ${activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-gray-400 hover:text-gray-700'
              }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* DASHBOARD TAB */}
      {activeTab === 'DASHBOARD' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search by Return ID, Order ID, or Product..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all"
              />
            </div>
            <div className="hidden md:flex gap-2">
              <span className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold">Total: {returns.length}</span>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-gray-500 flex justify-center"><RefreshCcw className="animate-spin" /></div>
          ) : filteredReturns.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No returns found.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Return ID</th>
                    <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Product</th>
                    <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Status</th>
                    <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Customer</th>
                    <th  className="px-6 py-4 font-bold uppercase tracking-wider text-xs text-left" >Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredReturns.map(req => (
                    <tr key={req.id} className="hover:bg-blue-50/50 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-gray-900">#{req.id}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={req.product_thumbnail ? getImageUrl(req.product_thumbnail) : 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 150 150"><rect width="100%" height="100%" fill="%23f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="12" fill="%239ca3af">No Image</text></svg>'}
                            alt={req.product_name}
                            className="w-8 h-8 rounded border border-gray-200 object-contain bg-white"
                          />
                          <span className="font-semibold text-gray-800 truncate max-w-[200px]">{req.product_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider ${req.status === 'REQUESTED' ? 'bg-yellow-100 text-yellow-800' :
                          req.status === 'APPROVED' ? 'bg-blue-100 text-blue-800' :
                            req.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                              'bg-green-100 text-green-800'
                          }`}>
                          {req.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-gray-800">{req.customer_name}</p>
                        <p className="text-xs text-gray-500">{req.customer_email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => setDetailsModal({ isOpen: true, req })}
                          className="flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors border border-blue-200"
                        >
                          <Eye size={14} /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ANALYTICS TAB */}
      {activeTab === 'ANALYTICS' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Total Returns</p>
              <h3 className="text-3xl font-black text-gray-900 mt-2">{totalReturns}</h3>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
              <p className="text-xs text-blue-500 font-bold uppercase tracking-wider">Pending</p>
              <h3 className="text-3xl font-black text-blue-600 mt-2">{pendingReturns}</h3>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
              <p className="text-xs text-green-500 font-bold uppercase tracking-wider">Approved/Completed</p>
              <h3 className="text-3xl font-black text-green-600 mt-2">{approvedReturns}</h3>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
              <p className="text-xs text-red-500 font-bold uppercase tracking-wider">Rejected</p>
              <h3 className="text-3xl font-black text-red-600 mt-2">{rejectedReturns}</h3>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm flex items-center justify-center min-h-[300px]">
            <p className="text-gray-400 font-medium flex flex-col items-center gap-2">
              <Activity size={32} />
              More advanced visual charts will appear here.
            </p>
          </div>
        </div>
      )}

      {/* LOGS TAB */}
      {activeTab === 'LOGS' && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col md:flex-row min-h-[600px] overflow-hidden animate-fadeIn">
          {/* Sidebar */}
          <div className="w-full md:w-64 bg-gray-50 border-r border-gray-200 p-4 shrink-0">
            <h3 className="font-bold text-gray-900 mb-4 uppercase tracking-wider text-xs">System Logs</h3>
            <nav className="space-y-1">
              <button onClick={() => setActiveLogTab('DELIVERY')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-colors ${activeLogTab === 'DELIVERY' ? 'bg-white text-blue-600 shadow-sm border border-gray-200' : 'text-gray-600 hover:bg-gray-100'}`}>
                <Package size={16} /> Delivery Logs
              </button>
              <button onClick={() => setActiveLogTab('API')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-colors ${activeLogTab === 'API' ? 'bg-white text-blue-600 shadow-sm border border-gray-200' : 'text-gray-600 hover:bg-gray-100'}`}>
                <Server size={16} /> API Logs
              </button>
              <button onClick={() => setActiveLogTab('WEBHOOK')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-colors ${activeLogTab === 'WEBHOOK' ? 'bg-white text-blue-600 shadow-sm border border-gray-200' : 'text-gray-600 hover:bg-gray-100'}`}>
                <Globe size={16} /> Webhook Logs
              </button>
              <button onClick={() => setActiveLogTab('INTEGRATION')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-colors ${activeLogTab === 'INTEGRATION' ? 'bg-white text-blue-600 shadow-sm border border-gray-200' : 'text-gray-600 hover:bg-gray-100'}`}>
                <FileJson size={16} /> Integration Logs
              </button>
            </nav>
          </div>

          {/* Main Log Area */}
          <div className="flex-1 p-6 bg-[#0d1117] text-gray-300 font-mono text-sm overflow-x-auto">
            {activeLogTab === 'DELIVERY' && MOCK_DELIVERY_LOGS.map(log => (
              <div key={log.id} className="mb-3 border-l-2 border-blue-500 pl-3">
                <span className="text-blue-400">[{new Date(log.time).toLocaleTimeString()}]</span>
                <span className={log.status === 'SUCCESS' ? 'text-green-400 mx-2' : 'text-red-400 mx-2'}>{log.status}</span>
                <span className="text-gray-100">{log.details}</span>
              </div>
            ))}

            {activeLogTab === 'API' && MOCK_API_LOGS.map(log => (
              <div key={log.id} className="mb-3 border-l-2 border-purple-500 pl-3">
                <span className="text-blue-400">[{new Date(log.time).toLocaleTimeString()}]</span>
                <span className="text-purple-400 mx-2">{log.method}</span>
                <span className="text-yellow-300 mx-2">{log.status}</span>
                <span className="text-gray-100">{log.endpoint}</span>
                <span className="text-gray-500 ml-4">{log.latency}</span>
              </div>
            ))}

            {activeLogTab === 'WEBHOOK' && MOCK_WEBHOOK_LOGS.map(log => (
              <div key={log.id} className="mb-3 border-l-2 border-orange-500 pl-3">
                <span className="text-blue-400">[{new Date(log.time).toLocaleTimeString()}]</span>
                <span className="text-orange-400 mx-2">[{log.provider}]</span>
                <span className="text-gray-100 mr-2">{log.event}</span>
                <span className={log.status === 'PROCESSED' ? 'text-green-400' : 'text-red-400'}>({log.status})</span>
              </div>
            ))}

            {activeLogTab === 'INTEGRATION' && (
              <div className="text-gray-500 italic">No integration logs available currently.</div>
            )}
          </div>
        </div>
      )}

      {/* Details Modal */}
      {detailsModal.isOpen && detailsModal.req && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-4xl my-8 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <div>
                <h3 className="font-bold text-xl text-gray-900">Return Request Details</h3>
                <p className="text-sm text-gray-500 mt-1">Super Admin View - #{detailsModal.req.id}</p>
              </div>
              <button onClick={() => setDetailsModal({ isOpen: false, req: null })} className="p-2 bg-gray-100 text-gray-500 rounded-full hover:bg-gray-200 transition-colors">
                <XCircle size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto bg-gray-50/30 space-y-8">

              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h4 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">Tracking Timeline</h4>
                <ReturnTrackingTimeline
                  currentStatus={detailsModal.req.status}
                  statusLogs={detailsModal.req.statusLogs || []}
                  returnType={detailsModal.req.return_type}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Customer & Vendor</h4>
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">Customer</p>
                      <p className="font-bold text-gray-900">{detailsModal.req.customer_name}</p>
                      <p className="text-xs text-gray-500">{detailsModal.req.customer_email}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">Vendor</p>
                      <p className="font-bold text-gray-900">{detailsModal.req.vendor_name}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Product Info</h4>
                  <div className="flex gap-4">
                    <img
                      src={detailsModal.req.product_thumbnail ? getImageUrl(detailsModal.req.product_thumbnail) : 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 150 150"><rect width="100%" height="100%" fill="%23f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="12" fill="%239ca3af">No Image</text></svg>'}
                      alt={detailsModal.req.product_name}
                      className="w-16 h-16 object-contain rounded border border-gray-100 p-1 bg-gray-50"
                    />
                    <div>
                      <p className="font-bold text-gray-900 text-sm line-clamp-2">{detailsModal.req.product_name}</p>
                      <p className="text-xs text-gray-500 mt-1">Quantity: <span className="font-semibold text-gray-800">{detailsModal.req.quantity}</span></p>
                      <p className="text-[10px] text-blue-600 font-bold uppercase mt-2 bg-blue-50 px-2 py-1 rounded inline-block">{detailsModal.req.return_type}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default AdminReturns;
