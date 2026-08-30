import React, { useState } from 'react';
import { Calendar, Package, ShoppingBag, CheckCircle, RefreshCcw, Star, ChevronDown, ChevronRight } from 'lucide-react';
import { getImageUrl } from '../../utils/imageUrl';
import InvoiceViewer from '../user/InvoiceViewer';
import { useSelector } from 'react-redux';

const CustomerOrders = ({
  orders,
  handleDeliveryReceived,
  selectedReturnItems,
  toggleReturnItemSelection,
  setReturnModalState,
  setReviewModalState
}) => {
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [viewingInvoiceOrder, setViewingInvoiceOrder] = useState(null);
  const { user } = useSelector(state => state.auth);

  const toggleOrder = (orderId) => {
    setExpandedOrderId(prev => prev === orderId ? null : orderId);
  };

  const getOrderStatusColor = (status) => {
    if (['DELIVERED', 'RETURNED', 'COMPLETED'].includes(status)) return 'bg-green-100 text-green-800';
    if (['PARTIALLY_RETURNED'].includes(status)) return 'bg-orange-100 text-orange-800 border border-orange-200';
    if (['CANCELLED', 'REJECTED'].includes(status)) return 'bg-red-100 text-red-800 border border-red-200';
    return 'bg-blue-100 text-blue-800 border border-blue-200';
  };

  if (!orders || orders.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
        <ShoppingBag className="w-16 h-16 text-gray-200 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-700">No Product Orders</h3>
        <p className="text-gray-500 mt-2">You haven't placed any product orders yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 md:space-y-4">
      {orders.map((order) => {
        const isExpanded = expandedOrderId === order.id;

        return (
          <div key={order.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">

            {/* Order Header */}
            <div className="bg-gray-50/70 border-b border-gray-200">
              <div className="hidden md:grid gap-6 items-center w-full px-6 py-4" style={{ gridTemplateColumns: '80px 1.5fr 1fr 1fr 1.2fr auto' }}>

                {/* Image */}
                <div className="flex items-center justify-center">
                  <div className="w-12 h-12 rounded-lg border border-gray-200 bg-white flex items-center justify-center overflow-hidden p-0.5">
                    {order.items && order.items[0] && (
                      <img
                        src={order.items[0].thumbnail ? getImageUrl(order.items[0].thumbnail) : 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 150 150"><rect width="100%" height="100%" fill="%23f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="12" fill="%239ca3af">No Image</text></svg>'}
                        alt="Order preview"
                        className="max-h-full max-w-full object-contain"
                      />
                    )}
                  </div>
                </div>

                {/* Order ID & Date */}
                <div className="text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-gray-900">
                    <Package size={14} className="text-gray-400" />
                    ID: #{order.id}
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-500 mt-1 font-semibold">
                    <Calendar size={14} />
                    {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </div>

                {/* Items & Total */}
                <div className="text-xs">
                  <p className="text-gray-500 font-bold">
                    Items: <span className="text-gray-900 font-extrabold">{order.items?.length || 0}</span>
                  </p>
                  <p className="font-extrabold text-gray-900 mt-1">₹{order.total_amount}</p>
                </div>

                {/* Payment Method */}
                <div className="text-xs">
                  <p className="text-gray-500 font-bold">Payment</p>
                  <span className="inline-block mt-1 font-extrabold text-gray-900 uppercase tracking-wider text-[10px] bg-gray-150 px-2 py-0.5 rounded">
                    {order.payment_method}
                  </span>
                </div>

                {/* Status Badge */}
                <div className="text-xs">
                  <p className="text-gray-500 font-bold mb-1">Status</p>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${getOrderStatusColor(order.order_status)}`}>
                    {order.order_status.replace(/_/g, ' ')}
                  </span>
                </div>

                {/* Expand Button */}
                <div className="flex justify-end gap-2">
                  <button
                    disabled
                    onClick={(e) => {
                      e.stopPropagation();
                      // setViewingInvoiceOrder(order); // Temporarily disabled
                    }}
                    className="flex items-center gap-1 px-3 py-2 border border-gray-250 rounded-lg text-[10px] font-bold text-gray-400 bg-gray-50 cursor-not-allowed shadow-sm"
                    title="Invoice coming soon"
                  >
                    Invoice
                  </button>
                  <button
                    onClick={() => toggleOrder(order.id)}
                    className="flex items-center gap-1 px-4 py-2 border border-gray-250 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm hover:shadow"
                  >
                    {isExpanded ? 'Hide Details' : 'View Order'}
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>
                </div>

              </div>

              {/* Mobile Header */}
              <div
                className="md:hidden p-4 flex justify-between items-center cursor-pointer hover:bg-gray-100/50 transition-colors"
                onClick={() => toggleOrder(order.id)}
              >
                <div className="flex gap-3 items-center">
                  <div className="w-12 h-12 rounded-lg border border-gray-200 bg-white flex items-center justify-center overflow-hidden p-0.5">
                    {order.items && order.items[0] && (
                      <img
                        src={order.items[0].thumbnail ? getImageUrl(order.items[0].thumbnail) : 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 150 150"><rect width="100%" height="100%" fill="%23f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="12" fill="%239ca3af">No Image</text></svg>'}
                        alt="Order preview"
                        className="max-h-full max-w-full object-contain"
                      />
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">Order #{order.id}</h4>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} • ₹{order.total_amount}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${getOrderStatusColor(order.order_status)}`}>
                    {order.order_status.replace(/_/g, ' ')}
                  </span>
                  <div className={`p-1 rounded-full transition-colors ${isExpanded ? 'bg-gray-100 text-gray-800' : 'bg-transparent text-gray-400'}`}>
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </div>
                </div>
              </div>
              
              {/* Mobile Invoice Button */}
              <div className="md:hidden px-4 pb-3 flex justify-end">
                  <button
                    disabled
                    onClick={(e) => {
                      e.stopPropagation();
                      // setViewingInvoiceOrder(order); // Temporarily disabled
                    }}
                    className="px-3 py-1.5 border border-gray-250 rounded bg-gray-50 text-[10px] font-bold text-gray-400 cursor-not-allowed shadow-sm"
                    title="Invoice coming soon"
                  >
                    View Invoice
                  </button>
              </div>

            </div>

            {/* Accordion Body */}
            {isExpanded && (
              <div className="border-t border-gray-200 animate-slideDown">

                {/* Items List */}
                <div className="divide-y divide-gray-150">
                  {order.items?.map((item, idx) => {
                    const deliveredDate = item.delivered_at ? new Date(item.delivered_at) : null;
                    const diffDays = deliveredDate ? Math.ceil(Math.abs(new Date() - deliveredDate) / (1000 * 60 * 60 * 24)) : 0;
                    const windowDays = item.return_window_days || 7;
                    const policy = item.return_policy || 'NO_RETURN';
                    const hasActiveReturn = !!item.return_request;
                    const isEligibleForReturn = item.item_status === 'DELIVERED' && deliveredDate && (diffDays <= windowDays) && (policy !== 'NO_RETURN') && !hasActiveReturn;
                    const isSelected = (selectedReturnItems[order.id] || []).some(i => i.id === item.id);

                    const deadline = deliveredDate ? new Date(deliveredDate) : null;
                    if (deadline) deadline.setDate(deadline.getDate() + windowDays);

                    return (
                      <div key={idx} className={`p-4 md:p-6 bg-white/50 flex flex-col md:flex-row gap-4 sm:gap-6 transition-colors ${isSelected ? 'bg-blue-50/40' : ''}`}>

                        {/* Checkbox */}
                        <div className="flex items-start pt-2">
                          {isEligibleForReturn ? (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleReturnItemSelection(order.id, item)}
                              className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer shadow-sm"
                            />
                          ) : (
                            <div className="w-5" />
                          )}
                        </div>

                        {/* Product Image */}
                        <div className="w-16 h-16 rounded-xl border border-gray-250 bg-white p-1 shrink-0 flex items-center justify-center overflow-hidden">
                          <img
                            src={item.thumbnail ? getImageUrl(item.thumbnail) : 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 150 150"><rect width="100%" height="100%" fill="%23f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="12" fill="%239ca3af">No Image</text></svg>'}
                            alt={item.name}
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0 text-xs">
                          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                            <div>
                               <h4 className="text-gray-900 text-sm hidden md:block">
                                 {item.name.includes(' - ') ? (
                                   <>
                                     <span className="font-bold">{item.name.split(' - ')[0]}</span>
                                     <span className="font-normal text-gray-500 text-xs"> - {item.name.split(' - ').slice(1).join(' - ')}</span>
                                   </>
                                 ) : (
                                   <span className="font-bold">{item.name}</span>
                                 )}
                               </h4>
                               <h4 className="font-bold text-gray-900 text-sm md:hidden">{item.name.split(' - ')[0]}</h4>
                              <p className="text-gray-500 font-bold mt-1">
                                Product ID: <span className="text-gray-900 font-extrabold">#{item.product_id}</span> • Qty: <span className="text-gray-900 font-extrabold">{item.quantity}</span> • Price: <span className="text-gray-900 font-extrabold">₹{item.price}</span>
                              </p>
                              {item.item_status && (
                                <div className="mt-2 flex items-center gap-1.5">
                                  <span className="font-bold text-gray-500">Item Status:</span>
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                    item.item_status === 'DELIVERED' ? 'bg-green-100 text-green-800' :
                                    item.item_status === 'SHIPPED' ? 'bg-indigo-100 text-indigo-800' :
                                    item.item_status.startsWith('RETURN_') ? 'bg-red-50 text-red-700 border border-red-200' :
                                    'bg-blue-50 text-blue-700'
                                  }`}>
                                    {item.item_status.replace(/_/g, ' ')}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {item.item_status === 'CANCELLED' && item.rejection_reason && (
                            <div className="mt-3 bg-red-50/50 border border-red-100 rounded-xl p-3">
                              <p className="text-red-800 text-xs font-bold mb-1">Order Cancelled by Seller</p>
                              <p className="text-red-600 text-xs">Reason: {item.rejection_reason}</p>
                            </div>
                          )}

                          <div className="mt-4 pt-4 border-t border-dashed border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div className="flex-1">
                              {item.item_status === 'DELIVERED' && deadline && !hasActiveReturn && (
                                <div className="text-xs text-gray-500 font-semibold bg-gray-50/50 px-3.5 py-2.5 rounded-xl border border-gray-200/60 inline-flex flex-col gap-0.5">
                                  {isEligibleForReturn ? (
                                    <div className="bg-green-50 text-green-800 px-3 py-2 rounded-lg border border-green-100 inline-block">
                                      <span className="font-bold text-[10px] uppercase tracking-wider flex items-center gap-1.5"><CheckCircle size={12} /> Return Window Open</span>
                                      <p className="mt-0.5">Eligible for {policy.replace(/_/g, ' ').toLowerCase()} until <strong className="font-bold">{deadline.toLocaleDateString('en-IN', { month: 'long', day: 'numeric' })}</strong></p>
                                    </div>
                                  ) : policy === 'NO_RETURN' ? (
                                    <p className="text-gray-500 italic text-xs bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 inline-block">This item is non-returnable.</p>
                                  ) : (
                                    <p className="text-gray-500 italic text-xs bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 inline-block">Return window closed on {deadline.toLocaleDateString('en-IN')}</p>
                                  )}
                                </div>
                              )}

                              {hasActiveReturn && (
                                <div className="mt-3 p-3 bg-gray-50 border border-gray-150 rounded-xl space-y-1.5 text-gray-750 w-full max-w-md animate-fadeIn">
                                  <div className="flex justify-between items-center">
                                    <p className="font-bold text-xs text-gray-900">Return Request: #{1000 + item.return_request.id}</p>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${item.return_request.status === 'REPLACEMENT_DELIVERED' || item.return_request.status === 'RETURN_COMPLETED' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'} border`}>
                                      {item.return_request.status === 'REPLACEMENT_SHIPPED' ? 'REPLACEMENT READY' : item.return_request.status === 'REPLACEMENT_DELIVERED' ? 'REPLACEMENT DELIVERED' : item.return_request.status.replace(/_/g, ' ')}
                                    </span>
                                  </div>
                                  <p className="text-[11px] font-semibold">Type: <span className="font-bold text-gray-900">{item.return_request.return_type}</span></p>
                                  
                                  {(item.return_request.return_tracking_number || item.return_request.replacement_tracking_number) && (
                                    <div className="text-[11px] pt-1.5 border-t border-gray-200 space-y-0.5">
                                      <p className="font-bold text-gray-800">Tracking Info:</p>
                                      <p className="pl-2">ID: <span className="font-mono font-bold text-gray-900">{item.return_request.replacement_tracking_number || item.return_request.return_tracking_number}</span></p>
                                      <p className="pl-2">Website/Provider: <span className="font-bold text-gray-900">{item.return_request.replacement_delivery_provider || item.return_request.return_delivery_provider}</span></p>
                                    </div>
                                  )}

                                  <p className="text-[10px] text-gray-500 font-semibold pt-1">To view full timeline or submit return tracking details, please visit the <strong className="text-red-500">Returns</strong> tab.</p>
                                </div>
                              )}
                            </div>

                            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                              {item.item_status === 'DELIVERED' && !hasActiveReturn && (
                                <button
                                  onClick={() => setReviewModalState({ isOpen: true, item, product_id: item.product_id, rating: 5, title: '', body: '', images: [] })}
                                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 text-xs bg-white text-gray-700 px-4 py-2 rounded-lg font-bold border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm hover:shadow"
                                >
                                  <Star size={14} className="text-yellow-500" /> Write a Review
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>

                {/* Footer Actions */}
                {(selectedReturnItems[order.id] && selectedReturnItems[order.id].length > 0) && (
                  <div className="bg-blue-50 p-4 sm:p-5 flex flex-col md:flex-row justify-between items-center gap-4 border-t border-gray-250">
                    <span className="text-sm font-bold text-blue-800">{selectedReturnItems[order.id].length} item(s) selected</span>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setReturnModalState({ isOpen: true, items: selectedReturnItems[order.id], orderId: order.id, type: 'REFUND', reason: '', description: '' })}
                        className="text-xs bg-white text-red-600 px-5 py-2.5 rounded-lg font-bold border border-red-200 hover:bg-red-50 transition-all shadow-sm"
                      >
                        Request Refund
                      </button>
                      <button
                        onClick={() => setReturnModalState({ isOpen: true, items: selectedReturnItems[order.id], orderId: order.id, type: 'REPLACEMENT', reason: '', description: '' })}
                        className="text-xs bg-gray-900 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-gray-800 transition-all shadow-sm"
                      >
                        Request Replacement
                      </button>
                    </div>
                  </div>
                )}

              </div>
            )}

          </div>
        );
      })}
      
      {/* Invoice Viewer Modal */}
      {viewingInvoiceOrder && (
        <InvoiceViewer 
          order={viewingInvoiceOrder}
          user={user}
          onClose={() => setViewingInvoiceOrder(null)} 
        />
      )}
    </div>
  );
};

export default CustomerOrders;
