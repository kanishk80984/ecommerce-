import React, { useState, useEffect } from 'react';
import { Check, X, RefreshCcw, Eye, Search, Filter, Calendar } from 'lucide-react';
import api from '../../services/api';
import ReturnTrackingTimeline from '../../components/returns/ReturnTrackingTimeline';
import { getImageUrl } from '../../utils/imageUrl';

const VendorReturns = () => {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionModal, setActionModal] = useState({
    isOpen: false,
    returnId: null,
    action: null,
    reason: '',
    returnDeliveryProvider: '',
    returnTrackingNumber: '',
    replacementDeliveryProvider: '',
    replacementTrackingNumber: ''
  });
  const [detailsModal, setDetailsModal] = useState({ isOpen: false, req: null });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    fetchReturns();
  }, []);

  const fetchReturns = async () => {
    try {
      const res = await api.get('/returns/vendor');
      setReturns(res.data.returns || []);
    } catch (error) {
      console.error('Failed to fetch vendor returns', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/returns/vendor/${actionModal.returnId}/action`, {
        action: actionModal.action,
        reason: actionModal.reason,
        returnDeliveryProvider: actionModal.returnDeliveryProvider,
        returnTrackingNumber: actionModal.returnTrackingNumber,
        replacementDeliveryProvider: actionModal.replacementDeliveryProvider,
        replacementTrackingNumber: actionModal.replacementTrackingNumber
      });
      alert(`Return request processed successfully.`);
      setActionModal({
        isOpen: false,
        returnId: null,
        action: null,
        reason: '',
        returnDeliveryProvider: '',
        returnTrackingNumber: '',
        replacementDeliveryProvider: '',
        replacementTrackingNumber: ''
      });
      setDetailsModal({ isOpen: false, req: null });
      fetchReturns();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to process return request.');
    }
  };

  const filteredReturns = returns.filter(r => {
    const matchesSearch = r.id.toString().includes(searchTerm) || r.order_id.toString().includes(searchTerm) || (r.product_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) return <div className="p-8 text-center text-gray-500 flex justify-center items-center h-full"><RefreshCcw className="animate-spin text-primary w-8 h-8" /></div>;

  return (
    <div className="p-4 sm:p-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <RefreshCcw className="text-blue-600" />
            Return Management
          </h2>
          <p className="text-sm text-gray-500 mt-1">Manage customer returns and replacements</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search by ID or Product..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-9 pr-8 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="REQUESTED">Requested</option>
              <option value="RETURN_APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="RETURN_RECEIVED">Received</option>
            </select>
          </div>
        </div>
      </div>

      {filteredReturns.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center">
          <RefreshCcw className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-700">No Return Requests Found</h3>
          <p className="text-gray-500 mt-2">Adjust your filters or search term.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredReturns.map(req => (
            <div key={req.id} className="bg-white sm:rounded-2xl shadow-sm border-x-0 sm:border border-y sm:border-gray-200 overflow-hidden hover:shadow-md transition-shadow -mx-4 sm:mx-0">

              {/* Card Header */}
              <div className="bg-gray-50 p-4 border-b border-gray-100 flex flex-wrap justify-between items-center gap-4">
                <div className="flex items-center gap-6">
                  <div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Return ID</p>
                    <p className="font-mono font-bold text-gray-900 text-sm">#{req.id}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Order ID</p>
                    <p className="font-mono font-bold text-gray-900 text-sm">#{req.order_id}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Date Requested</p>
                    <p className="font-semibold text-gray-900 text-sm flex items-center gap-1.5">
                      <Calendar size={14} className="text-gray-400" />
                      {new Date(req.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </div>

                <div>
                  <span className={`px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider ${req.status === 'REQUESTED' ? 'bg-yellow-100 text-yellow-800' :
                    req.status === 'RETURN_APPROVED' ? 'bg-indigo-100 text-indigo-800' :
                      req.status === 'APPROVED' ? 'bg-blue-100 text-blue-800' :
                        req.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                          'bg-green-100 text-green-800'
                    }`}>
                    {req.status.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 sm:p-6 flex flex-col md:flex-row gap-4 md:gap-8 items-start w-full">

                {/* Product Info */}
                <div className="flex items-start gap-4 flex-1 md:flex-[1.8]">
                  <div className="w-20 h-20 rounded-lg border border-gray-200 p-1 shrink-0 bg-white flex items-center justify-center overflow-hidden">
                    <img
                      src={req.product_thumbnail ? getImageUrl(req.product_thumbnail) : 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 150 150"><rect width="100%" height="100%" fill="%23f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="12" fill="%239ca3af">No Image</text></svg>'}
                      alt={req.product_name}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div>
                    <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider mb-1">{req.return_type}</p>
                    <h4 className="text-gray-900 text-sm md:text-base hidden md:block">
                      {req.product_name.includes(' - ') ? (
                        <>
                          <span className="font-bold">{req.product_name.split(' - ')[0]}</span>
                          <span className="font-normal text-gray-500 text-xs md:text-sm"> - {req.product_name.split(' - ').slice(1).join(' - ')}</span>
                        </>
                      ) : (
                        <span className="font-bold">{req.product_name}</span>
                      )}
                    </h4>
                    <h4 className="font-bold text-gray-900 text-sm md:hidden">{req.product_name.split(' - ')[0]}</h4>
                    <p className="text-[10px] text-gray-500 font-bold mt-1">Product ID: #{req.product_id}</p>
                  </div>
                </div>

                {/* Customer Info */}
                <div className="flex-1 border-l-0 md:border-l border-gray-100 pl-0 md:pl-8 text-xs text-gray-600 space-y-1">
                  <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider mb-1">Customer</p>
                  <p className="font-bold text-gray-900 text-sm mb-1">{req.customer_name}</p>
                  <p><strong>Email:</strong> {req.customer_email || '-'}</p>
                  <p><strong>Phone:</strong> {req.customer_phone || '-'}</p>
                  {req.customer_street && (
                    <p>
                      <strong>Address:</strong> {req.customer_street}, {req.customer_city}, {req.customer_state} {req.customer_zip}, {req.customer_country}
                    </p>
                  )}
                </div>

                {/* Quantity Info */}
                <div className="border-l-0 md:border-l border-gray-100 pl-0 md:pl-8 pr-0 md:pr-4 text-xs text-gray-600 shrink-0">
                  <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider mb-1">Quantity</p>
                  <p className="font-extrabold text-gray-900 text-base mt-0.5">{req.quantity}</p>
                </div>

                {/* Actions */}
                <div className="flex gap-3 flex-col md:flex-row w-full md:w-auto items-center mt-2 md:mt-0">
                  <button
                    onClick={() => setDetailsModal({ isOpen: true, req })}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-lg font-bold text-sm hover:bg-gray-800 transition-colors shadow-sm w-full md:w-auto"
                  >
                    <Eye size={16} /> View Details
                  </button>
                  {req.status === 'REQUESTED' && (
                    <button
                      onClick={() => setActionModal({ isOpen: true, returnId: req.id, action: 'APPROVE', reason: '', returnDeliveryProvider: '', returnTrackingNumber: '' })}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg font-bold text-sm hover:bg-green-700 transition-colors shadow-sm"
                    >
                      <Check size={16} /> Approve Request
                    </button>
                  )}
                  {req.status === 'RETURN_IN_TRANSIT' && (
                    <button
                      onClick={() => setActionModal({ isOpen: true, returnId: req.id, action: 'RECEIVE_RETURN', reason: '' })}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-lg font-bold text-sm hover:bg-purple-700 transition-colors shadow-sm whitespace-nowrap"
                    >
                      <Check size={16} /> Package Received
                    </button>
                  )}
                  {req.status === 'RETURN_RECEIVED' && (
                    <button
                      onClick={() => setActionModal({ isOpen: true, returnId: req.id, action: 'INSPECT_APPROVE', reason: '' })}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors shadow-sm whitespace-nowrap"
                    >
                      <Check size={16} /> Inspect & Approve
                    </button>
                  )}
                  {req.status === 'INSPECTION_APPROVED' && req.return_type === 'REPLACEMENT' && (
                    <button
                      onClick={() => setActionModal({ isOpen: true, returnId: req.id, action: 'REPLACEMENT_READY', reason: '', replacementDeliveryProvider: '', replacementTrackingNumber: '' })}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition-colors shadow-sm whitespace-nowrap"
                    >
                      <Check size={16} /> Send Replacement
                    </button>
                  )}
                  {req.status === 'REPLACEMENT_SHIPPED' && (
                    <button
                      onClick={() => setActionModal({ isOpen: true, returnId: req.id, action: 'REPLACEMENT_DELIVERED', reason: '' })}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg font-bold text-sm hover:bg-emerald-700 transition-colors shadow-sm whitespace-nowrap"
                    >
                      <Check size={16} /> Mark Delivered
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Details Modal */}
      {detailsModal.isOpen && detailsModal.req && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-3xl my-8 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <div>
                <h3 className="font-bold text-xl text-gray-900">Return Details</h3>
                <p className="text-sm text-gray-500 mt-1">Request #{detailsModal.req.id}</p>
              </div>
              <button onClick={() => setDetailsModal({ isOpen: false, req: null })} className="p-2 bg-gray-100 text-gray-500 rounded-full hover:bg-gray-200 transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto">

              {/* Timeline */}
              <div className="mb-8">
                <h4 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">Tracking Timeline</h4>
                <div className="bg-gray-50 rounded-xl border border-gray-100 p-2">
                  <ReturnTrackingTimeline
                    currentStatus={detailsModal.req.status}
                    statusLogs={detailsModal.req.statusLogs || []}
                    returnType={detailsModal.req.return_type}
                  />
                </div>
              </div>

              {(detailsModal.req.return_tracking_number || detailsModal.req.replacement_tracking_number) && (
                <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 mb-6">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Shipment Tracking</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
                    {detailsModal.req.return_tracking_number && (
                      <div>
                        <p className="font-semibold text-gray-800">Return Pickup:</p>
                        <p>Provider: <span className="font-bold">{detailsModal.req.return_delivery_provider || 'N/A'}</span></p>
                        <p>Tracking ID: <span className="font-bold">{detailsModal.req.return_tracking_number || 'N/A'}</span></p>
                      </div>
                    )}
                    {detailsModal.req.replacement_tracking_number && (
                      <div>
                        <p className="font-semibold text-gray-800">Replacement Dispatch:</p>
                        <p>Provider: <span className="font-bold">{detailsModal.req.replacement_delivery_provider || 'N/A'}</span></p>
                        <p>Tracking ID: <span className="font-bold">{detailsModal.req.replacement_tracking_number || 'N/A'}</span></p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Product Box */}
                <div className="border border-gray-200 rounded-xl p-4">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Product Information</h4>
                  <div className="flex gap-4">
                    <img
                      src={detailsModal.req.product_thumbnail ? getImageUrl(detailsModal.req.product_thumbnail) : 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 150 150"><rect width="100%" height="100%" fill="%23f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="12" fill="%239ca3af">No Image</text></svg>'}
                      alt={detailsModal.req.product_name}
                      className="w-16 h-16 object-contain rounded border border-gray-100 p-1 bg-white"
                    />
                    <div>
                      <p className="font-bold text-gray-900 text-sm line-clamp-2">{detailsModal.req.product_name}</p>
                      <p className="text-xs text-gray-500 mt-1">Order ID: <span className="font-semibold text-gray-800">#{detailsModal.req.order_id}</span></p>
                      <p className="text-xs text-gray-500 mt-0.5">Quantity: <span className="font-semibold text-gray-800">{detailsModal.req.quantity}</span></p>
                    </div>
                  </div>
                </div>

                {/* Reason Box */}
                <div className="border border-gray-200 rounded-xl p-4 bg-orange-50/30">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Reason for Return</h4>
                  <p className="font-bold text-gray-800 text-sm">{detailsModal.req.reason || 'No specific reason selected'}</p>
                  {detailsModal.req.remarks && (
                    <div className="mt-2 bg-white border border-gray-200 rounded-lg p-3 text-xs text-gray-600 italic">
                      "{detailsModal.req.remarks}"
                    </div>
                  )}
                </div>
              </div>

              {/* Images */}
              {detailsModal.req.images && detailsModal.req.images.length > 0 && (
                <div className="mb-8">
                  <h4 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">Customer Attached Images</h4>
                  <div className="flex gap-4 overflow-x-auto pb-2 hide-scrollbar">
                    {detailsModal.req.images.map((img, i) => (
                      <a key={i} href={getImageUrl(img)} target="_blank" rel="noopener noreferrer" className="shrink-0">
                        <img
                          src={getImageUrl(img)}
                          alt="Return attachment"
                          className="h-32 w-32 object-cover rounded-xl border border-gray-200 shadow-sm hover:opacity-80 transition-opacity"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-4 justify-end rounded-b-2xl">
              {detailsModal.req.status === 'REQUESTED' && (
                <>
                  <button
                    onClick={() => setActionModal({ isOpen: true, returnId: detailsModal.req.id, action: 'REJECT', reason: '' })}
                    className="px-6 py-2.5 rounded-lg text-sm font-bold bg-white text-red-600 border border-red-200 hover:bg-red-50 transition-colors shadow-sm"
                  >
                    Reject Request
                  </button>
                  <button
                    onClick={() => setActionModal({ isOpen: true, returnId: detailsModal.req.id, action: 'APPROVE', reason: '', returnDeliveryProvider: '', returnTrackingNumber: '' })}
                    className="px-6 py-2.5 rounded-lg text-sm font-bold bg-green-600 text-white hover:bg-green-700 transition-colors shadow-sm"
                  >
                    Approve Request
                  </button>
                </>
              )}

              {detailsModal.req.status === 'RETURN_IN_TRANSIT' && (
                <button
                  onClick={() => setActionModal({ isOpen: true, returnId: detailsModal.req.id, action: 'RECEIVE_RETURN', reason: '' })}
                  className="px-6 py-2.5 rounded-lg text-sm font-bold bg-purple-600 text-white hover:bg-purple-700 transition-colors shadow-sm"
                >
                  Package Received
                </button>
              )}

              {detailsModal.req.status === 'RETURN_RECEIVED' && (
                <>
                  <button
                    onClick={() => setActionModal({ isOpen: true, returnId: detailsModal.req.id, action: 'INSPECT_REJECT', reason: '' })}
                    className="px-6 py-2.5 rounded-lg text-sm font-bold bg-white text-red-600 border border-red-200 hover:bg-red-50 transition-colors shadow-sm"
                  >
                    Reject Inspection
                  </button>
                  <button
                    onClick={() => setActionModal({ isOpen: true, returnId: detailsModal.req.id, action: 'INSPECT_APPROVE', reason: '' })}
                    className="px-6 py-2.5 rounded-lg text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    Approve Inspection
                  </button>
                </>
              )}

              {detailsModal.req.status === 'INSPECTION_APPROVED' && detailsModal.req.return_type === 'RETURN' && (
                <>
                  <button
                    onClick={() => setActionModal({ isOpen: true, returnId: detailsModal.req.id, action: 'REFUND_REJECT', reason: '' })}
                    className="px-6 py-2.5 rounded-lg text-sm font-bold bg-white text-red-600 border border-red-200 hover:bg-red-50 transition-colors shadow-sm"
                  >
                    Reject Refund
                  </button>
                  <button
                    onClick={() => setActionModal({ isOpen: true, returnId: detailsModal.req.id, action: 'REFUND_APPROVE', reason: '' })}
                    className="px-6 py-2.5 rounded-lg text-sm font-bold bg-green-600 text-white hover:bg-green-700 transition-colors shadow-sm"
                  >
                    Approve Refund
                  </button>
                </>
              )}

              {detailsModal.req.status === 'INSPECTION_APPROVED' && detailsModal.req.return_type === 'REPLACEMENT' && (
                <button
                  onClick={() => setActionModal({ isOpen: true, returnId: detailsModal.req.id, action: 'REPLACEMENT_READY', reason: '', replacementDeliveryProvider: '', replacementTrackingNumber: '' })}
                  className="px-6 py-2.5 rounded-lg text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  Send Replacement
                </button>
              )}

              {detailsModal.req.status === 'REPLACEMENT_SHIPPED' && (
                <button
                  onClick={() => setActionModal({ isOpen: true, returnId: detailsModal.req.id, action: 'REPLACEMENT_DELIVERED', reason: '' })}
                  className="px-6 py-2.5 rounded-lg text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm"
                >
                  Mark Delivered
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Action Modal (Approve/Reject/Inspect/Refund) */}
      {actionModal.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg text-gray-900">
                {actionModal.action === 'REPLACEMENT_READY' ? 'Send Replacement' : actionModal.action.replace('_', ' ')}
              </h3>
              <button onClick={() => setActionModal({ isOpen: false, returnId: null, action: null, reason: '' })} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAction} className="p-6 space-y-5">
              <div className={`p-4 rounded-xl border ${actionModal.action.includes('APPROVE') || actionModal.action === 'REPLACEMENT_READY' || actionModal.action === 'RECEIVE_RETURN' || actionModal.action === 'REPLACEMENT_DELIVERED' ? 'bg-green-50 border-green-100 text-green-800' : 'bg-red-50 border-red-100 text-red-800'}`}>
                <p className="text-sm font-medium">
                  You are about to {actionModal.action.replace('_', ' ').toLowerCase()} this request.
                </p>
              </div>



              {actionModal.action === 'REPLACEMENT_READY' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">Replacement Website/Carrier Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. www.bluedart.com or FedEx"
                      value={actionModal.replacementDeliveryProvider || ''}
                      onChange={e => setActionModal({ ...actionModal, replacementDeliveryProvider: e.target.value })}
                      className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">Replacement Tracking ID *</label>
                    <input
                      type="text"
                      placeholder="Enter tracking number"
                      value={actionModal.replacementTrackingNumber || ''}
                      onChange={e => setActionModal({ ...actionModal, replacementTrackingNumber: e.target.value })}
                      className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                      required
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">
                  Remarks {actionModal.action.includes('REJECT') && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  required={actionModal.action.includes('REJECT')}
                  rows="3"
                  value={actionModal.reason}
                  onChange={e => setActionModal({ ...actionModal, reason: e.target.value })}
                  placeholder={actionModal.action.includes('REJECT') ? 'Please provide a valid reason for rejection...' : 'Add optional internal remarks...'}
                  className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className={`w-full text-white font-bold py-3 rounded-xl transition-all shadow-sm ${actionModal.action.includes('APPROVE') || actionModal.action === 'REPLACEMENT_READY' || actionModal.action === 'RECEIVE_RETURN' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                >
                  Confirm Action
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default VendorReturns;
