import React, { useState, useEffect } from 'react';
import { RefreshCcw, AlertCircle, Clock, ChevronDown, ChevronRight } from 'lucide-react';
import api from '../../services/api';
import ReturnTrackingTimeline from '../returns/ReturnTrackingTimeline';
import { getImageUrl } from '../../utils/imageUrl';

const UserRefunds = () => {
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRefundId, setExpandedRefundId] = useState(null);
  const [trackingInputs, setTrackingInputs] = useState({});
  const [submittingTracking, setSubmittingTracking] = useState({});

  const toggleRefund = (id) => setExpandedRefundId(prev => prev === id ? null : id);

  const handleTrackingSubmit = async (e, returnId) => {
    e.preventDefault();
    const inputs = trackingInputs[returnId] || {};
    if (!inputs.deliveryProvider || !inputs.trackingNumber) {
      alert('Please enter both Carrier/Website and Tracking ID');
      return;
    }
    setSubmittingTracking(prev => ({ ...prev, [returnId]: true }));
    try {
      await api.post(`/returns/${returnId}/tracking`, {
        deliveryProvider: inputs.deliveryProvider,
        trackingNumber: inputs.trackingNumber
      });
      alert('Tracking details submitted successfully!');
      fetchRefunds();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit tracking details');
    } finally {
      setSubmittingTracking(prev => ({ ...prev, [returnId]: false }));
    }
  };

  useEffect(() => {
    fetchRefunds();
  }, []);

  const fetchRefunds = async () => {
    try {
      const { data } = await api.get('/returns/my-returns');
      if (data.success) {
        const refundsOnly = (data.returns || []).filter(r => r.return_type === 'RETURN');
        setRefunds(refundsOnly);
      }
    } catch (error) {
      console.error('Failed to fetch refunds');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'REQUESTED':
      case 'VENDOR_REVIEW':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'RETURN_APPROVED':
      case 'INSPECTION_APPROVED':
      case 'REFUND_APPROVED':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'REJECTED':
      case 'RETURN_REJECTED':
      case 'INSPECTION_REJECTED':
      case 'REFUND_REJECTED':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'REFUND_COMPLETED':
        return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return <div className="p-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div></div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden lg:max-h-[75vh] lg:overflow-y-auto custom-scrollbar">
      <div className="p-3 md:p-6 border-b border-gray-100 flex items-center gap-2 bg-gray-50">
        <RefreshCcw className="text-gray-500 w-5 h-5" />
        <h3 className="font-semibold text-lg text-gray-800">My Refund Requests</h3>
      </div>

      <div className="p-3 md:p-6">
        {refunds.length === 0 ? (
          <div className="text-center py-10 bg-gray-50 rounded-lg border border-gray-100">
            <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-3" />
            <p className="text-gray-500 font-medium">You haven't requested any refunds yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {refunds.map((refund) => {
              const isExpanded = expandedRefundId === refund.id;
              return (
                <div key={refund.id} className="border border-gray-100 rounded-lg hover:border-gray-200 transition-colors flex flex-col overflow-hidden">

                  {/* Mobile Header */}
                  <div
                    className="md:hidden p-3 flex flex-row gap-3 items-center cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => toggleRefund(refund.id)}
                  >
                    <img src={refund.product_thumbnail ? getImageUrl(refund.product_thumbnail) : 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 150 150"><rect width="100%" height="100%" fill="%23f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="12" fill="%239ca3af">No Image</text></svg>'} alt={refund.product_name} className="w-12 h-12 object-contain bg-white rounded border border-gray-200 p-1 flex-shrink-0" />
                    <div className="flex-1 flex flex-col justify-center min-w-0">
                      <p className="text-sm font-bold text-gray-800 line-clamp-1">{refund.product_name.split(' - ')[0]}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">Product ID: #{refund.product_id}</p>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-[10px] text-gray-500">Return ID: #{refund.id}</span>
                        <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider truncate max-w-[80px] ${getStatusColor(refund.status)}`}>
                          {refund.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>
                    <div className="ml-1 flex-shrink-0">
                      <div className={`p-1 rounded-full transition-colors ${isExpanded ? 'bg-gray-200 text-gray-800' : 'bg-transparent text-gray-400'}`}>
                        {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      </div>
                    </div>
                  </div>

                  {/* Accordion Body */}
                  <div className={`md:block grid transition-all duration-300 ease-in-out md:opacity-100 ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                    <div className="overflow-hidden p-3 pt-0 md:p-4 border-t border-gray-200 md:border-t-0">

                      {/* Desktop Header Content */}
                      <div className="hidden md:flex justify-between items-start mb-3 border-b border-gray-100 pb-3">
                        <div className="flex items-center gap-3">
                          <img src={refund.product_thumbnail ? getImageUrl(refund.product_thumbnail) : 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 150 150"><rect width="100%" height="100%" fill="%23f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="12" fill="%239ca3af">No Image</text></svg>'} alt={refund.product_name} className="w-12 h-12 object-contain bg-white rounded border border-gray-200 p-1" />
                          <div>
                            <p className="text-sm text-gray-800 line-clamp-1">
                              {refund.product_name.includes(' - ') ? (
                                <>
                                  <span className="font-bold">{refund.product_name.split(' - ')[0]}</span>
                                  <span className="font-normal text-gray-500 text-xs"> - {refund.product_name.split(' - ').slice(1).join(' - ')}</span>
                                </>
                              ) : (
                                <span className="font-bold">{refund.product_name}</span>
                              )}
                            </p>
                            <p className="text-[10px] text-gray-500 mt-1">Return ID: #{refund.id} • Order ID: #{refund.order_id} • Product ID: #{refund.product_id} • Qty: {refund.quantity}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end shrink-0 ml-2">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(refund.status)}`}>
                            {refund.status.replace(/_/g, ' ')}
                          </span>
                          <p className="text-[10px] text-gray-400 mt-2 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(refund.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="w-full mt-2 md:mt-6 mb-4">
                        <ReturnTrackingTimeline
                          currentStatus={refund.status}
                          statusLogs={refund.statusLogs || []}
                          returnType={refund.return_type}
                        />
                      </div>

                      {(refund.return_delivery_provider || refund.return_tracking_number) && (
                        <div className="mt-3 p-4 bg-gray-50 rounded-xl space-y-3 text-gray-750 text-xs w-full">
                          <p className="font-bold text-gray-800 border-b border-gray-200 pb-1.5">Return Shipment Details:</p>
                          <div className="text-[11px] space-y-0.5">
                            <p className="font-semibold text-gray-800">Return Pickup/Dropoff Carrier:</p>
                            <p>Provider/Website: <span className="font-bold text-gray-900">{refund.return_delivery_provider || 'N/A'}</span></p>
                            <p>Tracking ID: <span className="font-bold text-gray-900">{refund.return_tracking_number || 'N/A'}</span></p>
                          </div>
                        </div>
                      )}

                      {refund.status === 'RETURN_APPROVED' && (
                        <form onSubmit={(e) => handleTrackingSubmit(e, refund.id)} className="mt-3 p-4 bg-blue-50/50 rounded-xl space-y-3 w-full">
                          <p className="font-bold text-xs text-blue-900">Submit Return Shipment Details</p>
                          <p className="text-[10px] text-gray-500">Please ship the item to the vendor and enter details below so they can track the return package.</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">Carrier Website / Name *</label>
                              <input
                                type="text"
                                required
                                placeholder="e.g. www.delhivery.com"
                                value={trackingInputs[refund.id]?.deliveryProvider || ''}
                                onChange={e => setTrackingInputs(prev => ({
                                  ...prev,
                                  [refund.id]: {
                                    ...(prev[refund.id] || {}),
                                    deliveryProvider: e.target.value
                                  }
                                }))}
                                className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">Tracking Number *</label>
                              <input
                                type="text"
                                required
                                placeholder="Enter tracking number"
                                value={trackingInputs[refund.id]?.trackingNumber || ''}
                                onChange={e => setTrackingInputs(prev => ({
                                  ...prev,
                                  [refund.id]: {
                                    ...(prev[refund.id] || {}),
                                    trackingNumber: e.target.value
                                  }
                                }))}
                                className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                              />
                            </div>
                          </div>
                          <button
                            type="submit"
                            disabled={submittingTracking[refund.id]}
                            className="w-full bg-blue-600 hover:bg-blue-750 text-white font-bold py-2 rounded-lg text-xs transition-colors shadow-sm disabled:opacity-50"
                          >
                            {submittingTracking[refund.id] ? 'Submitting...' : 'Submit Tracking Info'}
                          </button>
                        </form>
                      )}

                      {refund.reason && (
                        <div className="mt-2 text-xs text-gray-500 border-t border-gray-100 pt-3">
                          <span className="font-semibold text-gray-600">Reason:</span> {refund.reason}
                        </div>
                      )}

                      {refund.vendor_rejection_reason && (
                        <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                          <span className="font-semibold">Rejection Reason:</span> {refund.vendor_rejection_reason}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserRefunds;
