import React, { useState, useEffect } from 'react';
import { Package, Truck, CheckCircle, RefreshCcw, FileText, ChevronDown, ChevronRight } from 'lucide-react';
import api from '../../services/api';
import ReturnTrackingTimeline from '../returns/ReturnTrackingTimeline';
import { getImageUrl } from '../../utils/imageUrl';

const UserReturns = () => {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedReturnId, setExpandedReturnId] = useState(null);
  const [trackingInputs, setTrackingInputs] = useState({});
  const [submittingTracking, setSubmittingTracking] = useState({});

  const toggleReturn = (id) => setExpandedReturnId(prev => prev === id ? null : id);

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
      fetchReturns();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit tracking details');
    } finally {
      setSubmittingTracking(prev => ({ ...prev, [returnId]: false }));
    }
  };

  useEffect(() => {
    fetchReturns();
  }, []);

  const fetchReturns = async () => {
    try {
      const res = await api.get('/returns/my-returns');
      const replacements = (res.data.returns || []).filter(r => r.return_type === 'REPLACEMENT');
      setReturns(replacements);
    } catch (error) {
      console.error('Failed to fetch returns:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center p-6 text-gray-500">Loading returns...</div>;

  if (returns.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <RefreshCcw className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-gray-800">No Returns Found</h3>
        <p className="text-sm text-gray-500 mt-2">You haven't requested any returns or replacements yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 md:p-6 lg:max-h-[75vh] lg:overflow-y-auto custom-scrollbar">
      <h3 className="font-bold text-lg text-gray-800 mb-6 flex items-center gap-2 border-b border-gray-50 pb-3">
        <RefreshCcw className="w-5 h-5 text-primary" />
        Returns & Replacements
      </h3>
      <div className="space-y-4">
        {returns.map(ret => {
          const isExpanded = expandedReturnId === ret.id;
          return (
            <div key={ret.id} className="border border-gray-100 rounded-lg shadow-sm bg-gray-50 flex flex-col overflow-hidden">

              {/* Mobile Header */}
              <div
                className="md:hidden p-3 flex flex-row gap-3 items-center cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => toggleReturn(ret.id)}
              >
                <img src={ret.product_thumbnail ? getImageUrl(ret.product_thumbnail) : 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 150 150"><rect width="100%" height="100%" fill="%23f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="12" fill="%239ca3af">No Image</text></svg>'} alt={ret.product_name} className="w-12 h-12 object-contain bg-white rounded border border-gray-200 p-1 flex-shrink-0" />
                <div className="flex-1 flex flex-col justify-center min-w-0">
                  <p className="text-sm font-bold text-gray-800 line-clamp-1">{ret.product_name.split(' - ')[0]}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">Product ID: #{ret.product_id}</p>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-[10px] text-gray-500">Return ID: #{ret.id}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase truncate max-w-[80px] ${ret.status === 'RETURN_COMPLETED' || ret.status === 'REPLACEMENT_DELIVERED' || ret.status === 'REFUNDED' ? 'bg-green-100 text-green-800' : ret.status === 'REJECTED' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>{ret.status.replace(/_/g, ' ')}</span>
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
                  <div className="hidden md:flex justify-between items-start mb-3 border-b border-gray-200 pb-3">
                    <div className="flex items-center gap-3">
                      <img src={ret.product_thumbnail ? getImageUrl(ret.product_thumbnail) : 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 150 150"><rect width="100%" height="100%" fill="%23f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="12" fill="%239ca3af">No Image</text></svg>'} alt={ret.product_name} className="w-12 h-12 object-contain bg-white rounded border border-gray-200 p-1" />
                      <div>
                        <p className="text-sm text-gray-800 line-clamp-1">
                          {ret.product_name.includes(' - ') ? (
                            <>
                              <span className="font-bold">{ret.product_name.split(' - ')[0]}</span>
                              <span className="font-normal text-gray-500 text-xs"> - {ret.product_name.split(' - ').slice(1).join(' - ')}</span>
                            </>
                          ) : (
                            <span className="font-bold">{ret.product_name}</span>
                          )}
                        </p>
                        <p className="text-[10px] text-gray-500 mt-1">Return ID: #{ret.id} • Order ID: #{ret.order_id} • Product ID: #{ret.product_id} • Qty: {ret.quantity}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end shrink-0 ml-2">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${ret.status === 'RETURN_COMPLETED' || ret.status === 'REPLACEMENT_DELIVERED' || ret.status === 'REFUNDED' ? 'bg-green-100 text-green-800' :
                        ret.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                        {ret.status.replace(/_/g, ' ')}
                      </span>
                      <p className="text-[10px] text-gray-400 mt-2">{new Date(ret.created_at).toLocaleDateString('en-IN')}</p>
                    </div>
                  </div>

                  <div className="w-full mt-2 md:mt-4 mb-2">
                    <ReturnTrackingTimeline
                      currentStatus={ret.status}
                      statusLogs={ret.statusLogs || []}
                      returnType={ret.return_type}
                    />
                  </div>

                  {(ret.return_delivery_provider || ret.return_tracking_number || ret.replacement_delivery_provider || ret.replacement_tracking_number) && (
                    <div className="mt-3 p-4 bg-gray-50 rounded-xl space-y-3 text-gray-750 text-xs w-full">
                      <p className="font-bold text-gray-800 border-b border-gray-200 pb-1.5">Return Shipment Details:</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {(ret.return_delivery_provider || ret.return_tracking_number) && (
                          <div className="text-[11px] space-y-0.5">
                            <p className="font-semibold text-gray-800">Return Pickup/Dropoff Carrier:</p>
                            <p>Provider/Website: <span className="font-bold text-gray-900">{ret.return_delivery_provider || 'N/A'}</span></p>
                            <p>Tracking ID: <span className="font-bold text-gray-900">{ret.return_tracking_number || 'N/A'}</span></p>
                          </div>
                        )}
                        {(ret.replacement_delivery_provider || ret.replacement_tracking_number) && (
                          <div className="text-[11px] space-y-0.5 sm:border-l sm:pl-4 border-gray-200">
                            <p className="font-semibold text-indigo-750">Replacement Shipment:</p>
                            <p>Provider/Website: <span className="font-bold text-gray-900">{ret.replacement_delivery_provider || 'N/A'}</span></p>
                            <p>Tracking ID: <span className="font-bold text-gray-900">{ret.replacement_tracking_number || 'N/A'}</span></p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {ret.status === 'RETURN_APPROVED' && (
                    <form onSubmit={(e) => handleTrackingSubmit(e, ret.id)} className="mt-3 p-4 bg-blue-50/50 rounded-xl space-y-3 w-full">
                      <p className="font-bold text-xs text-blue-900">Submit Return Shipment Details</p>
                      <p className="text-[10px] text-gray-500">Please ship the item to the vendor and enter details below so they can track the return package.</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">Carrier Website / Name *</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. www.delhivery.com"
                            value={trackingInputs[ret.id]?.deliveryProvider || ''}
                            onChange={e => setTrackingInputs(prev => ({
                              ...prev,
                              [ret.id]: {
                                ...(prev[ret.id] || {}),
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
                            value={trackingInputs[ret.id]?.trackingNumber || ''}
                            onChange={e => setTrackingInputs(prev => ({
                              ...prev,
                              [ret.id]: {
                                ...(prev[ret.id] || {}),
                                trackingNumber: e.target.value
                              }
                            }))}
                            className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={submittingTracking[ret.id]}
                        className="w-full bg-blue-600 hover:bg-blue-750 text-white font-bold py-2 rounded-lg text-xs transition-colors shadow-sm disabled:opacity-50"
                      >
                        {submittingTracking[ret.id] ? 'Submitting...' : 'Submit Tracking Info'}
                      </button>
                    </form>
                  )}

                  <div className="flex flex-col gap-1 text-xs text-gray-600 mt-4 border-t border-gray-100 pt-3">
                    <p><span className="font-semibold text-gray-700">Type:</span> <span className="font-bold">{ret.return_type}</span></p>
                    <p><span className="font-semibold text-gray-700">Reason:</span> {ret.reason}</p>
                  </div>

                  {ret.status === 'REJECTED' && ret.vendor_rejection_reason && (
                    <div className="mt-3 bg-red-50 p-2.5 rounded-lg text-xs text-red-800 border border-red-100">
                      <span className="font-bold">Rejection Reason:</span> {ret.vendor_rejection_reason}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );
};

export default UserReturns;
