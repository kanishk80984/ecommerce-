import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Mail, Phone, Calendar, User, Sparkles, MessageSquare, Check, X, CheckSquare, AlertCircle, MapPin, Briefcase } from 'lucide-react';

const VendorEnquiries = () => {
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);

  // Tab state: 'service_enquiries', 'product_enquiries' or 'bookings'
  const [activeListTab, setActiveListTab] = useState('service_enquiries');

  // Reject Reason Modal States
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Unified Alert/Confirm Dialog State
  const [dialogState, setDialogState] = useState({ isOpen: false, type: 'alert', title: '', message: '', onConfirm: null });

  const showConfirm = (title, message, onConfirm) => {
    setDialogState({ isOpen: true, type: 'confirm', title, message, onConfirm });
  };

  const showAlert = (title, message) => {
    setDialogState({ isOpen: true, type: 'alert', title, message, onConfirm: null });
  };

  useEffect(() => {
    fetchEnquiries();
  }, []);

  const fetchEnquiries = async () => {
    try {
      const res = await api.get('/services/enquiries');
      setEnquiries(res.data.enquiries || []);
    } catch (error) {
      console.error('Failed to fetch enquiries', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (id) => {
    showConfirm('Accept Service Request', 'Are you sure you want to accept this service request?', async () => {
      setDialogState(prev => ({ ...prev, isOpen: false }));
      setActionLoading(true);
      try {
        await api.put(`/services/enquiry/${id}/accept`);
        showAlert('Success', 'Service request accepted successfully!');
        fetchEnquiries();
      } catch (err) {
        showAlert('Error', err.response?.data?.message || 'Failed to accept request');
      } finally {
        setActionLoading(false);
      }
    });
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectReason.trim()) {
      showAlert('Error', 'Please provide a reason for rejection.');
      return;
    }
    setActionLoading(true);
    try {
      await api.put(`/services/enquiry/${rejectingId}/reject`, { reason: rejectReason });
      setRejectingId(null);
      setRejectReason('');
      showAlert('Success', 'Service request rejected.');
      fetchEnquiries();
    } catch (err) {
      showAlert('Error', err.response?.data?.message || 'Failed to reject request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async (id, isEnquiry = false) => {
    const title = isEnquiry ? 'Complete Enquiry' : 'Complete Service Request';
    const msg = isEnquiry 
      ? 'Are you sure you want to mark this enquiry as completed?' 
      : 'Are you sure you want to mark this service request as completed?';
      
    showConfirm(title, msg, async () => {
      setDialogState(prev => ({ ...prev, isOpen: false }));
      setActionLoading(true);
      try {
        await api.put(`/services/enquiry/${id}/complete`);
        showAlert('Success', isEnquiry ? 'Enquiry completed!' : 'Service marked as completed!');
        fetchEnquiries();
      } catch (err) {
        showAlert('Error', err.response?.data?.message || 'Failed to complete enquiry');
      } finally {
        setActionLoading(false);
      }
    });
  };

  // Filter items based on active list tab
  const filteredEnquiries = enquiries.filter(item => {
    if (activeListTab === 'service_enquiries') {
      return item.type === 'ENQUIRY' && !item.enquiry_text?.startsWith('Enquiry about Gallery Product');
    }
    if (activeListTab === 'product_enquiries') {
      return item.type === 'ENQUIRY' && item.enquiry_text?.startsWith('Enquiry about Gallery Product');
    }
    return item.type === 'BOOKING';
  });

  const serviceEnquiriesCount = enquiries.filter(e => e.type === 'ENQUIRY' && !e.enquiry_text?.startsWith('Enquiry about Gallery Product')).length;
  const productEnquiriesCount = enquiries.filter(e => e.type === 'ENQUIRY' && e.enquiry_text?.startsWith('Enquiry about Gallery Product')).length;
  const bookedServicesCount = enquiries.filter(e => e.type === 'BOOKING').length;

  if (loading) {
    return <div className="p-8">Loading enquiries...</div>;
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <MessageSquare className="text-blue-600 w-7 h-7" />
          Service Interactions Panel
        </h1>
        <p className="text-gray-500 mt-1">Review enquiries and manage booked service lifecycles.</p>
      </div>

      {/* Selector Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveListTab('service_enquiries')}
          className={`px-6 py-3 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeListTab === 'service_enquiries' 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <MessageSquare size={16} />
          Service Enquiries ({serviceEnquiriesCount})
        </button>
        <button
          onClick={() => setActiveListTab('product_enquiries')}
          className={`px-6 py-3 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeListTab === 'product_enquiries' 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Sparkles size={16} />
          Product Enquiries ({productEnquiriesCount})
        </button>
        <button
          onClick={() => setActiveListTab('bookings')}
          className={`px-6 py-3 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeListTab === 'bookings' 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Briefcase size={16} />
          Booked Services ({bookedServicesCount})
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {filteredEnquiries.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="font-bold text-gray-700 text-lg mb-1">
              {activeListTab === 'service_enquiries' && 'No service enquiries found'}
              {activeListTab === 'product_enquiries' && 'No product enquiries found'}
              {activeListTab === 'bookings' && 'No service bookings found'}
            </h3>
            <p className="text-sm">
              {activeListTab === 'service_enquiries' && 'General service enquiry forms submitted by customers will show up here.'}
              {activeListTab === 'product_enquiries' && 'Enquiries for gallery products will show up here.'}
              {activeListTab === 'bookings' && 'Confirmed service orders and delivery schedules will show up here.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-700 text-xs font-semibold uppercase tracking-wider">
                  <th style={{ width: '30%' }} className="py-4 px-6">Customer & Info Details</th>
                  <th style={{ width: '32%' }} className="py-4 px-6">
                    {activeListTab === 'product_enquiries' ? 'Product Requested' : 'Service Requested'}
                  </th>
                  <th style={{ width: '22%' }} className="py-4 px-6">Status & Date</th>
                  <th style={{ width: '16%' }} className="py-4 px-6 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150 text-gray-600 text-sm">
                {filteredEnquiries.map((enquiry) => (
                  <tr key={enquiry.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex flex-col gap-1.5 max-w-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900 flex items-center gap-1.5">
                            <User size={14} className="text-gray-400" />
                            {enquiry.customer_name}
                          </span>
                           <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-1.5 py-0.5 rounded font-mono whitespace-nowrap">
                             ID: #{1000 + enquiry.id}
                           </span>
                        </div>
                        <a 
                          href={`tel:${enquiry.customer_phone}`}
                          className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1.5"
                        >
                          <Phone size={14} className="text-gray-400" />
                          {enquiry.customer_phone}
                        </a>
                        {enquiry.enquiry_text && !(enquiry.type === 'BOOKING' && enquiry.enquiry_text.startsWith('Wants Service Booking. Address:')) && (
                          (() => {
                            let extractedMessage = enquiry.enquiry_text;
                            if (activeListTab === 'product_enquiries' && extractedMessage.includes('. Message: ')) {
                              extractedMessage = extractedMessage.split('. Message: ')[1];
                            }
                            let msgText = extractedMessage;
                            let cityText = '';
                            let emailText = '';

                            const emailMatch = msgText.match(/\(Email:\s*(.*?)\)/);
                            if (emailMatch) {
                              emailText = emailMatch[1].trim();
                              msgText = msgText.replace(emailMatch[0], '');
                            }

                            const cityMatch = msgText.match(/\(City:\s*(.*?)\)/);
                            if (cityMatch) {
                              cityText = cityMatch[1].trim();
                              msgText = msgText.replace(cityMatch[0], '');
                            }
                            
                            msgText = msgText.trim();
                            
                            return (
                              <div className="text-xs mt-1 bg-gray-50 p-2 rounded break-words border border-gray-100">
                                {emailText && (
                                  <div className="mb-1 text-gray-700">
                                    <span className="font-bold text-gray-900">Email:</span> <span className="font-medium text-blue-600">{emailText}</span>
                                  </div>
                                )}
                                {cityText && (
                                  <div className="mb-1 text-gray-700">
                                    <span className="font-bold text-gray-900">City:</span> <span className="font-medium text-gray-600">{cityText}</span>
                                  </div>
                                )}
                                <div className="text-gray-700">
                                  <span className="font-bold text-gray-900">Message:</span> <span className="italic text-gray-600">"{msgText}"</span>
                                </div>
                              </div>
                            );
                          })()
                        )}
                        
                        {/* Service address details for bookings */}
                        {enquiry.type === 'BOOKING' && enquiry.addr_street && (
                          <div className="mt-1.5 p-2 bg-blue-50/50 rounded-lg border border-blue-100/50 text-xs text-gray-600 space-y-0.5 animate-fadeIn">
                            <p className="font-bold text-[10px] text-blue-800 uppercase tracking-wider flex items-center gap-1">
                              <MapPin size={10} />
                              Service Address:
                            </p>
                            <p className="font-semibold text-gray-700">{enquiry.addr_name} ({enquiry.addr_phone})</p>
                            <p>{enquiry.addr_street}</p>
                            <p>{enquiry.addr_city}, {enquiry.addr_state} - {enquiry.addr_zip}</p>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      {activeListTab === 'product_enquiries' ? (() => {
                        const productMatch = enquiry.enquiry_text.match(/Enquiry about Gallery Product: "([^"]+)"/);
                        const priceMatch = enquiry.enquiry_text.match(/\(Price: ₹([^,)]+)/);
                        const productName = productMatch ? productMatch[1] : 'Gallery Product';
                        const productPrice = priceMatch ? priceMatch[1] : 'N/A';
                        return (
                          <div className="flex flex-col gap-1">
                            <span className="bg-purple-50 text-purple-700 text-xs font-bold px-2.5 py-1 rounded-full border border-purple-100 w-fit">
                              {productName}
                            </span>
                            <span className="text-xs text-gray-400 font-medium">Price: ₹{productPrice}</span>
                          </div>
                        );
                      })() : (
                        <div className="flex flex-col gap-1">
                          <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-full border border-blue-100 w-fit">
                            {enquiry.service_name}
                          </span>
                          <span className="text-xs text-gray-400 font-medium">Price: ₹{Number(enquiry.amount).toLocaleString('en-IN')}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-col gap-1">
                        {/* Status Label */}
                        <span className={`text-xs font-bold px-2.5 py-0.5 rounded w-fit uppercase ${
                          enquiry.status === 'ACCEPTED' ? 'bg-green-100 text-green-800 border border-green-200' :
                          enquiry.status === 'COMPLETED' ? 'bg-green-200 text-green-900 border border-green-300' :
                          enquiry.status === 'REJECTED' ? 'bg-red-100 text-red-800 border border-red-200' :
                          enquiry.status === 'SERVICE_REQUESTED' ? 'bg-blue-100 text-blue-800 border border-blue-200' : 'bg-gray-100 text-gray-600 border border-gray-200'
                        }`}>
                          {enquiry.status === 'ENQUIRY_SUBMITTED' ? 'Enquiry Submitted' :
                           enquiry.status === 'SERVICE_REQUESTED' ? 'Service Requested' :
                           enquiry.status === 'ACCEPTED' ? 'Accepted' :
                           enquiry.status === 'REJECTED' ? 'Rejected' : 
                           activeListTab === 'enquiries' ? 'Enquiry Completed' : 'Service Completed'}
                        </span>
                        
                        {enquiry.status === 'REJECTED' && enquiry.reject_reason && (
                          <span className="text-[11px] text-red-500 italic max-w-xs line-clamp-2">
                            Reason: {enquiry.reject_reason}
                          </span>
                        )}

                        <span className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                          <Calendar size={12} />
                          Created: {new Date(enquiry.created_at).toLocaleDateString('en-IN')}
                        </span>

                        {enquiry.status === 'COMPLETED' && enquiry.completed_at && (
                          <span className="text-[10px] text-green-600 font-semibold mt-0.5 flex items-center gap-1">
                            <CheckSquare size={12} />
                            Completed: {new Date(enquiry.completed_at).toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-left">
                      {/* Action buttons based on active tab and status */}
                      <div className="flex justify-start gap-2 flex-wrap">
                        {(activeListTab === 'service_enquiries' || activeListTab === 'product_enquiries') ? (
                          enquiry.status !== 'COMPLETED' ? (
                            <button
                              onClick={() => handleComplete(enquiry.id, true)}
                              disabled={actionLoading}
                              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 shadow-sm transition-colors"
                            >
                              <CheckSquare size={12} />
                              Enquiry Completed
                            </button>
                          ) : (
                            <span className="text-gray-400 text-xs italic font-medium">Completed</span>
                          )
                        ) : (
                          // Bookings Actions
                          <>
                            {enquiry.status === 'SERVICE_REQUESTED' && (
                              <>
                                <button 
                                  onClick={() => handleAccept(enquiry.id)}
                                  disabled={actionLoading}
                                  className="bg-green-600 hover:bg-green-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 shadow-sm transition-colors"
                                >
                                  <Check size={12} />
                                  Accept
                                </button>
                                <button 
                                  onClick={() => setRejectingId(enquiry.id)}
                                  disabled={actionLoading}
                                  className="bg-red-600 hover:bg-red-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 shadow-sm transition-colors"
                                >
                                  <X size={12} />
                                  Reject
                                </button>
                              </>
                            )}
                            {enquiry.status === 'ACCEPTED' && (
                              <>
                                <button 
                                  onClick={() => handleComplete(enquiry.id, false)}
                                  disabled={actionLoading}
                                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 shadow-sm transition-colors"
                                >
                                  <CheckSquare size={12} />
                                  Service Completed
                                </button>
                                <button 
                                  onClick={() => setRejectingId(enquiry.id)}
                                  disabled={actionLoading}
                                  className="bg-red-600 hover:bg-red-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 shadow-sm transition-colors"
                                >
                                  <X size={12} />
                                  Reject
                                </button>
                              </>
                            )}
                            {(enquiry.status === 'COMPLETED' || enquiry.status === 'REJECTED') && (
                              <span className="text-gray-400 text-xs italic font-medium">Archived</span>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reject Reason Dialog Modal */}
      {rejectingId && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl relative animate-fadeIn">
            <button 
              onClick={() => { setRejectingId(null); setRejectReason(''); }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 bg-gray-100 rounded-full p-1"
            >
              <X size={16} />
            </button>
            
            <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-1.5">
              <AlertCircle className="text-red-500 w-5 h-5" />
              Reject Service Request
            </h3>
            <p className="text-xs text-gray-500 mb-4">Please provide a reason to help explain the rejection to the customer.</p>
            
            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Reason for Rejection</label>
                <textarea 
                  required
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Fully booked on requested dates / Out of service area"
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex gap-3">
                <button 
                  type="button" 
                  onClick={() => { setRejectingId(null); setRejectReason(''); }}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2 rounded-lg text-sm transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded-lg text-sm transition-colors shadow-md"
                >
                  Confirm Reject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Dialog */}
      {dialogState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6 text-center">
            {dialogState.type === 'confirm' ? (
              <AlertCircle className="text-blue-500 w-12 h-12 mx-auto mb-4" />
            ) : dialogState.title === 'Success' ? (
              <Check className="text-green-500 w-12 h-12 mx-auto mb-4" />
            ) : (
              <X className="text-red-500 w-12 h-12 mx-auto mb-4" />
            )}
            
            <h3 className="font-bold text-lg text-gray-800 mb-2">{dialogState.title}</h3>
            <p className="text-sm text-gray-500 mb-6">{dialogState.message}</p>
            
            <div className="flex gap-3 justify-center">
              {dialogState.type === 'confirm' && (
                <button 
                  onClick={() => setDialogState(prev => ({ ...prev, isOpen: false }))}
                  className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg text-sm transition-colors"
                >
                  Cancel
                </button>
              )}
              <button 
                onClick={() => {
                  if (dialogState.type === 'confirm' && dialogState.onConfirm) {
                    dialogState.onConfirm();
                  } else {
                    setDialogState(prev => ({ ...prev, isOpen: false }));
                  }
                }}
                className={`px-5 py-2 text-white font-bold rounded-lg text-sm transition-colors shadow-md ${
                  dialogState.type === 'confirm' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorEnquiries;
