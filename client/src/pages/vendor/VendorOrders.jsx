import { useState, useEffect } from 'react';
import api from '../../services/api';
import { Package, Truck, CheckCircle, Clock, MapPin, User, IndianRupee, ShoppingBag, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getImageUrl } from '../../utils/imageUrl';

const statusConfig = {
  PLACED: { label: 'Order Request', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  PENDING: { label: 'Order Request', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  ACCEPTED: { label: 'Accepted', icon: CheckCircle, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  READY_FOR_DISPATCH: { label: 'Ready for Dispatch', icon: Package, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  SHIPPED: { label: 'Shipped', icon: Truck, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  DISPATCH_REQUEST_SENT: { label: 'Dispatch Requested', icon: Truck, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
  WAITING_FOR_PICKUP: { label: 'Waiting for Pickup', icon: Clock, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
  PACKAGE_COLLECTED: { label: 'Package Collected', icon: Package, color: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-200' },
  IN_TRANSIT: { label: 'In Transit', icon: Truck, color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-200' },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery', icon: Truck, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  DELIVERED: { label: 'Delivered', icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  RETURNED_FAILED_DELIVERY: { label: 'Delivery Failed', icon: CheckCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
  CANCELLED: { label: 'Cancelled', icon: CheckCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
};

const VendorOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [trackingModal, setTrackingModal] = useState({
    isOpen: false,
    orderId: null,
    itemId: null,
    deliveryProvider: '',
    trackingNumber: ''
  });
  const [rejectModal, setRejectModal] = useState({
    isOpen: false,
    itemId: null,
    reason: ''
  });

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const { data } = await api.get('/vendor/orders');
      setOrders(data.orders || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (itemId, newStatus) => {
    try {
      setUpdatingId(itemId);
      await api.put(`/vendor/orders/${itemId}/status`, { status: newStatus });
      toast.success(`Order marked as ${statusConfig[newStatus].label}`);
      setOrders(prev => prev.map(o => o.order_item_id === itemId ? { ...o, item_status: newStatus } : o));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRejectOrder = async () => {
    if (!rejectModal.reason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    
    try {
      setUpdatingId(rejectModal.itemId);
      await api.put(`/vendor/orders/${rejectModal.itemId}/status`, { 
        status: 'CANCELLED', 
        reason: rejectModal.reason 
      });
      toast.success('Order rejected successfully');
      setOrders(prev => prev.map(o => o.order_item_id === rejectModal.itemId ? { ...o, item_status: 'CANCELLED' } : o));
      setRejectModal({ isOpen: false, itemId: null, reason: '' });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject order');
    } finally {
      setUpdatingId(null);
    }
  };

  const requestDelivery = async (orderId, itemId, isRetry = false) => {
    try {
      setUpdatingId(itemId);
      const endpoint = isRetry ? '/delivery/retry' : '/delivery/request';
      await api.post(endpoint, { orderId, itemId });
      toast.success('Delivery request sent successfully!');
      fetchOrders(); // Re-fetch to get all updated DB fields
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send delivery request');
      fetchOrders(); // Re-fetch to get 'FAILED' sync status
    } finally {
      setUpdatingId(null);
    }
  };

  const handleOpenTrackingModal = (orderId, itemId) => {
    setTrackingModal({
      isOpen: true,
      orderId,
      itemId,
      deliveryProvider: '',
      trackingNumber: ''
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Order Management</h1>
          <p className="text-sm text-gray-500">Track and dispatch customer orders</p>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-150 p-12 text-center">
          <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-gray-100">
            <Package className="text-gray-400" size={24} />
          </div>
          <h3 className="font-bold text-gray-800 text-lg">No orders yet</h3>
          <p className="text-gray-500 text-sm mt-1 max-w-sm mx-auto">When customers purchase your products, they will appear here for processing.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {orders.map((order) => {
            const statusStyle = statusConfig[order.item_status] || { label: order.item_status, icon: Clock, color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' };
            const StatusIcon = statusStyle.icon;
            
            return (
              <div key={order.order_item_id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden p-4 md:p-6 hover:bg-gray-50/50 transition-colors">
                <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
                  <div className="w-20 h-20 md:w-24 md:h-24 bg-gray-100 rounded-xl flex-shrink-0 border border-gray-200 overflow-hidden flex items-center justify-center">
                    <img src={order.thumbnail ? getImageUrl(order.thumbnail) : '/placeholder.png'} alt={order.product_name} className="w-full h-full object-cover" />
                  </div>
                  
                  <div className="flex-1 lg:flex-[1.8] min-w-0">
                    <div className="flex justify-between items-start mb-1 md:mb-2">
                       <h3 className="text-gray-900 text-sm md:text-base leading-snug hidden md:block">
                         {order.product_name.includes(' - ') ? (
                           <>
                             <span className="font-bold">{order.product_name.split(' - ')[0]}</span>
                             <span className="font-normal text-gray-500 text-xs md:text-sm"> - {order.product_name.split(' - ').slice(1).join(' - ')}</span>
                           </>
                         ) : (
                           <span className="font-bold">{order.product_name}</span>
                         )}
                       </h3>
                       <h3 className="font-bold text-gray-900 text-sm leading-snug md:hidden">{order.product_name.split(' - ')[0]}</h3>
                      <div className={`hidden lg:flex flex-col items-end gap-1 px-3 py-1.5 rounded-xl text-xs font-bold border ${statusStyle.bg} ${statusStyle.color} ${statusStyle.border}`}>
                        <div className="flex items-center gap-1.5">
                          <StatusIcon size={14} />
                          {order.item_status === 'SHIPPED' ? 'Shipped' : statusStyle.label}
                        </div>
                        {order.item_status === 'SHIPPED' && (
                          <span className="text-[10px] opacity-80 font-medium mt-0.5">
                            {order.delivery_provider} ({order.tracking_number})
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3 md:gap-6 mt-3 text-xs md:text-sm">
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <ShoppingBag size={14} className="text-gray-400" />
                        <span className="font-semibold">Qty: {order.quantity} × <IndianRupee className="inline w-3 h-3" />{parseFloat(order.price).toFixed(2)}</span>
                      </div>
                      <p className="text-xs font-semibold text-gray-600">Product ID: #{order.product_id} • Purchase ID: #{order.order_id}</p>
                    </div>

                    <div className="mt-4 p-3 md:p-4 bg-blue-50/50 rounded-xl border border-blue-100 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs md:text-sm font-bold text-gray-900">{order.customer_name} ({order.customer_email})</p>
                        <p className="text-xs text-gray-600">{order.address_name} - {order.street}, {order.city}, {order.state} {order.zip}</p>
                        <p className="text-xs font-semibold text-gray-700 mt-1">Phone: {order.phone}</p>
                      </div>

                      {(order.delivery_request_id || order.tracking_number) && (
                        <div className="text-xs border-t md:border-t-0 md:border-l border-blue-200 pt-3 md:pt-0 md:pl-4">
                          <p className="font-semibold text-gray-800 mb-1.5">Delivery Information:</p>
                          <div className="flex flex-col gap-1.5 text-gray-600">
                            <div className="flex flex-wrap gap-x-8 gap-y-1.5">
                              <p className="w-40">Provider: <span className="font-bold text-gray-800">{order.delivery_provider || 'N/A'}</span></p>
                              <p>Tracking ID: <span className="font-bold text-gray-800">{order.tracking_number || 'N/A'}</span></p>
                            </div>
                            {order.delivery_agent_name && (
                              <div className="flex flex-wrap gap-x-8 gap-y-1.5">
                                <p className="w-40">Agent: <span className="font-medium text-gray-800">{order.delivery_agent_name}</span></p>
                                {order.delivery_agent_phone && <p>Phone: <span className="font-medium text-gray-800">{order.delivery_agent_phone}</span></p>}
                              </div>
                            )}
                            <div className="flex flex-wrap gap-x-8 gap-y-1.5">
                              {['PACKAGE_COLLECTED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'RETURNED_FAILED_DELIVERY'].includes(order.item_status) && (
                                <p className="w-40">Pickup Time: <span className="font-medium text-gray-800">{order.picked_up_at ? new Date(order.picked_up_at).toLocaleString('en-IN', { hour12: true, month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' }) : '-'}</span></p>
                              )}
                              {order.item_status === 'DELIVERED' && (
                                <p>Delivered Time: <span className="font-medium text-gray-800">{order.delivered_at ? new Date(order.delivered_at).toLocaleString('en-IN', { hour12: true, month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' }) : '-'}</span></p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {['PENDING', 'PLACED', 'ACCEPTED', 'SHIPPED', 'DISPATCH_REQUEST_SENT'].includes(order.item_status) && (
                    <div className="flex flex-row lg:flex-col items-center justify-end gap-2 w-full lg:w-40 pt-2 lg:pt-0 shrink-0">
                      {(order.item_status === 'PENDING' || order.item_status === 'PLACED') && (
                        <>
                          <button
                            onClick={() => updateStatus(order.order_item_id, 'ACCEPTED')}
                            disabled={updatingId === order.order_item_id}
                            className="w-full sm:w-auto lg:w-full py-2.5 px-4 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-all text-xs md:text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                          >
                            Accept Order
                          </button>
                          <button
                            onClick={() => setRejectModal({ isOpen: true, itemId: order.order_item_id, reason: '' })}
                            disabled={updatingId === order.order_item_id}
                            className="w-full sm:w-auto lg:w-full py-2.5 px-4 bg-white text-red-600 font-bold rounded-xl border border-red-200 hover:bg-red-50 hover:border-red-300 transition-all text-xs md:text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {order.item_status === 'ACCEPTED' && (
                        <button
                          onClick={() => handleOpenTrackingModal(order.order_id, order.order_item_id)}
                          disabled={updatingId === order.order_item_id}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-xl font-bold text-xs shadow-sm disabled:opacity-50 flex justify-center"
                        >
                          {updatingId === order.order_item_id ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Dispatch Request'}
                        </button>
                      )}
                      {order.item_status === 'SHIPPED' && (
                        <div className="w-full flex flex-col gap-2">
                          <div className="text-xs text-gray-500 bg-gray-50 border rounded-xl p-2.5 flex flex-col gap-1 text-center font-semibold">
                            <p className="text-gray-700 font-bold">Shipped via</p>
                            <p className="truncate font-semibold">{order.delivery_provider}</p>
                            <p className="font-mono text-[10px] select-all bg-gray-100 px-1 py-0.5 rounded border mt-0.5 font-bold text-gray-900">{order.tracking_number}</p>
                          </div>
                          <button
                            onClick={() => updateStatus(order.order_item_id, 'DELIVERED')}
                            disabled={updatingId === order.order_item_id}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-xl font-bold text-xs shadow-sm disabled:opacity-50"
                          >
                            Mark as Delivered
                          </button>
                        </div>
                      )}
                      {order.item_status === 'DISPATCH_REQUEST_SENT' && order.api_sync_status === 'FAILED' && (
                        <button
                          onClick={() => requestDelivery(order.order_id, order.order_item_id, true)}
                          disabled={updatingId === order.order_item_id}
                          className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-xl font-bold text-xs shadow-sm disabled:opacity-50 flex justify-center"
                        >
                          {updatingId === order.order_item_id ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Retry Dispatch'}
                        </button>
                      )}
                      {order.item_status === 'DISPATCH_REQUEST_SENT' && order.api_sync_status !== 'FAILED' && (
                        <div className="w-full bg-gray-100 text-gray-500 py-2 rounded-xl font-bold text-xs text-center border">
                          Request Processing...
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tracking Details Modal */}
      {trackingModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Enter Shipment Details</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Tracking Website / Carrier Name *</label>
                <input
                  type="text"
                  placeholder="e.g. www.delhivery.com or Blue Dart"
                  value={trackingModal.deliveryProvider}
                  onChange={(e) => setTrackingModal(prev => ({ ...prev, deliveryProvider: e.target.value }))}
                  className="w-full border border-gray-250 rounded-xl p-3 text-sm focus:outline-none focus:border-indigo-500 bg-gray-50"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Tracking ID / Waybill Number *</label>
                <input
                  type="text"
                  placeholder="Enter tracking number"
                  value={trackingModal.trackingNumber}
                  onChange={(e) => setTrackingModal(prev => ({ ...prev, trackingNumber: e.target.value }))}
                  className="w-full border border-gray-250 rounded-xl p-3 text-sm focus:outline-none focus:border-indigo-500 bg-gray-50"
                  required
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setTrackingModal({ isOpen: false, orderId: null, itemId: null, deliveryProvider: '', trackingNumber: '' })}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 font-bold rounded-xl text-sm hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!trackingModal.deliveryProvider.trim() || !trackingModal.trackingNumber.trim()) {
                    toast.error('Please enter both Tracking Website and Tracking ID');
                    return;
                  }
                  const { orderId, itemId, deliveryProvider, trackingNumber } = trackingModal;
                  setTrackingModal(prev => ({ ...prev, isOpen: false }));
                  try {
                    setUpdatingId(itemId);
                    await api.post('/delivery/request', { orderId, itemId, deliveryProvider, trackingNumber });
                    toast.success('Order marked as Shipped!');
                    fetchOrders();
                  } catch (error) {
                    toast.error(error.response?.data?.message || 'Failed to update tracking');
                    fetchOrders();
                  } finally {
                    setUpdatingId(null);
                  }
                }}
                className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm shadow-md transition-colors"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {rejectModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-slideUp">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-red-600">Reject Order</h3>
              <button onClick={() => setRejectModal({ isOpen: false, itemId: null, reason: '' })} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Reason for Rejection</label>
                <textarea 
                  value={rejectModal.reason} 
                  onChange={(e) => setRejectModal({...rejectModal, reason: e.target.value})} 
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-all resize-none h-32" 
                  placeholder="Please specify why you are rejecting this order..." 
                />
              </div>
              <div className="pt-2 flex gap-3">
                <button 
                  onClick={() => setRejectModal({ isOpen: false, itemId: null, reason: '' })}
                  className="flex-1 py-3.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleRejectOrder}
                  disabled={!rejectModal.reason.trim() || updatingId === rejectModal.itemId}
                  className="flex-1 py-3.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all disabled:opacity-50 shadow-md shadow-red-500/20"
                >
                  {updatingId === rejectModal.itemId ? 'Processing...' : 'Confirm Reject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorOrders;
