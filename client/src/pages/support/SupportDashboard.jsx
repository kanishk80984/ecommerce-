import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { User, ShoppingBag, Briefcase, MessageSquare, Send, CheckCircle, Clock, AlertCircle } from 'lucide-react';

const SupportDashboard = () => {
  const [tickets, setTickets] = useState([]);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [ticketDetails, setTicketDetails] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [activeTab, setActiveTab] = useState('PENDING'); // 'PENDING' | 'IN_PROGRESS' | 'RESOLVED'
  const [detailsSubTab, setDetailsSubTab] = useState('chat'); // 'chat' | 'products' | 'services'
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, []);

  // Poll active ticket details / messages
  useEffect(() => {
    if (!selectedTicketId) return;
    fetchTicketDetails(selectedTicketId, false);
    const interval = setInterval(() => {
      fetchTicketDetails(selectedTicketId, false);
    }, 3000);
    return () => clearInterval(interval);
  }, [selectedTicketId]);

  const fetchTickets = async () => {
    try {
      const res = await api.get('/support/admin/tickets');
      setTickets(res.data.tickets || []);
    } catch (error) {
      console.error('Failed to fetch tickets', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTicketDetails = async (id, showLoader = true) => {
    if (showLoader) setDetailsLoading(true);
    try {
      const [detailsRes, messagesRes] = await Promise.all([
        api.get(`/support/admin/tickets/${id}`),
        api.get(`/support/tickets/${id}/messages`)
      ]);
      setTicketDetails(detailsRes.data);
      setChatMessages(messagesRes.data.messages || []);
    } catch (error) {
      console.error('Failed to fetch ticket details', error);
    } finally {
      if (showLoader) setDetailsLoading(false);
    }
  };

  const handleSendChatMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !selectedTicketId) return;
    try {
      await api.post(`/support/tickets/${selectedTicketId}/messages`, {
        message: chatInput
      });
      setChatInput('');
      fetchTicketDetails(selectedTicketId, false);
      // Refresh tickets to update state if it changed from PENDING to IN_PROGRESS
      fetchTickets();
    } catch (error) {
      alert('Failed to send message');
    }
  };

  const handleResolveTicket = async () => {
    if (!window.confirm('Are you sure you want to resolve and close this ticket?')) return;
    try {
      await api.put(`/support/admin/tickets/${selectedTicketId}/status`, {
        status: 'RESOLVED'
      });
      fetchTickets();
      // Reload ticket details
      fetchTicketDetails(selectedTicketId, true);
      alert('Ticket marked as Resolved successfully!');
    } catch (error) {
      alert('Failed to resolve ticket');
    }
  };

  const filteredTickets = tickets.filter(t => t.status === activeTab);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-140px)]">
      {/* Left panel: Ticket list */}
      <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-150 flex flex-col overflow-hidden shadow-sm">
        {/* Tabs */}
        <div className="flex border-b border-gray-150 bg-gray-50/50">
          {['PENDING', 'IN_PROGRESS', 'RESOLVED'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-xs font-extrabold uppercase tracking-wider transition-colors border-b-2 ${
                activeTab === tab ? 'border-primary text-primary bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Ticket list scroll area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="text-center py-10 text-gray-500 text-sm">
              No tickets found in this tab.
            </div>
          ) : (
            filteredTickets.map(ticket => (
              <div
                key={ticket.id}
                onClick={() => {
                  setSelectedTicketId(ticket.id);
                  setDetailsSubTab('chat');
                }}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col gap-1 ${
                  selectedTicketId === ticket.id 
                    ? 'border-primary bg-blue-50/20 shadow-sm' 
                    : 'border-gray-150 hover:border-gray-300'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-mono text-[11px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
                    #{ticket.ticket_number}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {new Date(ticket.created_at).toLocaleDateString('en-IN')}
                  </span>
                </div>
                <h4 className="font-bold text-gray-900 text-sm truncate">{ticket.subject}</h4>
                <p className="text-xs text-gray-500 truncate">Customer: {ticket.customer_name}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right panel: Ticket details and chat */}
      <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-150 flex flex-col overflow-hidden shadow-sm">
        {selectedTicketId && ticketDetails ? (
          <div className="flex flex-col h-full overflow-hidden">
            {/* Header info */}
            <div className="bg-white border-b border-gray-150 p-4 flex flex-wrap justify-between items-center gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
                    #{ticketDetails.ticket.ticket_number}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                    ticketDetails.ticket.status === 'RESOLVED' ? 'bg-green-100 text-green-800' :
                    ticketDetails.ticket.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {ticketDetails.ticket.status}
                  </span>
                </div>
                <h3 className="font-bold text-gray-900 text-base">{ticketDetails.ticket.subject}</h3>
              </div>

              {ticketDetails.ticket.status !== 'RESOLVED' && (
                <button
                  onClick={handleResolveTicket}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition-colors"
                >
                  <CheckCircle size={14} />
                  Resolve & Close Ticket
                </button>
              )}
            </div>

            {/* Split layout inside detail area */}
            <div className="flex-1 flex overflow-hidden">
              {/* Left pane: Details Tabs & Chat area */}
              <div className="flex-grow flex flex-col border-r border-gray-150 overflow-hidden">
                {/* Details Tab Switcher */}
                <div className="flex border-b border-gray-150 bg-gray-50/50">
                  <button
                    onClick={() => setDetailsSubTab('chat')}
                    className={`flex-1 py-3 text-xs font-extrabold uppercase tracking-wider flex justify-center items-center gap-1.5 border-b-2 ${
                      detailsSubTab === 'chat' ? 'border-primary text-primary bg-white' : 'border-transparent text-gray-500'
                    }`}
                  >
                    <MessageSquare size={14} />
                    Chat Messages
                  </button>
                  <button
                    onClick={() => setDetailsSubTab('products')}
                    className={`flex-1 py-3 text-xs font-extrabold uppercase tracking-wider flex justify-center items-center gap-1.5 border-b-2 ${
                      detailsSubTab === 'products' ? 'border-primary text-primary bg-white' : 'border-transparent text-gray-500'
                    }`}
                  >
                    <ShoppingBag size={14} />
                    Purchased Products
                  </button>
                  <button
                    onClick={() => setDetailsSubTab('services')}
                    className={`flex-1 py-3 text-xs font-extrabold uppercase tracking-wider flex justify-center items-center gap-1.5 border-b-2 ${
                      detailsSubTab === 'services' ? 'border-primary text-primary bg-white' : 'border-transparent text-gray-500'
                    }`}
                  >
                    <Briefcase size={14} />
                    Booked Services
                  </button>
                </div>

                {/* Sub Tab Contents */}
                <div className="flex-1 overflow-y-auto p-4">
                  {detailsSubTab === 'chat' && (
                    <div className="flex flex-col h-full">
                      {/* Chat messages */}
                      <div className="flex-1 space-y-3 overflow-y-auto pb-4 pr-1">
                        {chatMessages.map(msg => {
                          const isSupport = msg.sender_role === 'TECHNICAL_SUPPORT' || msg.sender_role === 'ADMIN' || msg.sender_role === 'SUPER_ADMIN';
                          return (
                            <div key={msg.id} className={`flex flex-col ${isSupport ? 'items-end' : 'items-start'}`}>
                              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                                isSupport ? 'bg-primary text-white rounded-tr-none' : 'bg-gray-100 text-gray-800 rounded-tl-none border border-gray-200'
                              }`}>
                                <p>{msg.message}</p>
                              </div>
                              <span className="text-[10px] text-gray-400 mt-1 px-1">
                                {isSupport ? 'You' : `${msg.sender_name} (Customer)`} • {new Date(msg.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Input area */}
                      {ticketDetails.ticket.status !== 'RESOLVED' ? (
                        <form onSubmit={handleSendChatMessage} className="border-t border-gray-150 pt-3 flex gap-2">
                          <input
                            type="text"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            placeholder="Type a response to the customer..."
                            className="flex-grow border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
                          />
                          <button
                            type="submit"
                            className="p-2.5 bg-primary text-white rounded-xl shadow-sm hover:opacity-90 transition-opacity"
                          >
                            <Send size={18} />
                          </button>
                        </form>
                      ) : (
                        <div className="border-t border-gray-150 pt-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
                          This ticket is resolved and history is saved.
                        </div>
                      )}
                    </div>
                  )}

                  {detailsSubTab === 'products' && (
                    <div className="space-y-4">
                      <h4 className="font-bold text-gray-800 text-sm mb-2">Customer Purchase History</h4>
                      {ticketDetails.orders.length === 0 ? (
                        <p className="text-gray-500 text-sm text-center py-6">No product purchases found for this customer.</p>
                      ) : (
                        ticketDetails.orders.map(order => (
                          <div key={order.order_id} className="p-4 rounded-xl border border-gray-200 bg-gray-50/20 space-y-2">
                            <div className="flex justify-between items-center text-xs font-semibold">
                              <span className="font-mono text-blue-600">Order ID: #{order.order_id}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase ${order.payment_status === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                Payment: {order.payment_status}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500">
                              Placed on: {new Date(order.created_at).toLocaleString('en-IN')}
                            </div>
                            <div className="border-t border-dashed border-gray-200 pt-2 space-y-1">
                              {order.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between text-xs text-gray-700">
                                  <span>{item.name} (x{item.quantity})</span>
                                  <span className="font-bold">₹{Number(item.price * item.quantity).toLocaleString('en-IN')}</span>
                                </div>
                              ))}
                            </div>
                            <div className="flex justify-between items-center text-xs font-bold pt-2 border-t border-gray-200">
                              <span>Total Amount:</span>
                              <span className="text-primary text-sm">₹{Number(order.total_amount).toLocaleString('en-IN')}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {detailsSubTab === 'services' && (
                    <div className="space-y-4">
                      <h4 className="font-bold text-gray-800 text-sm mb-2">Customer Service Bookings</h4>
                      {ticketDetails.services.length === 0 ? (
                        <p className="text-gray-500 text-sm text-center py-6">No service bookings found for this customer.</p>
                      ) : (
                        ticketDetails.services.map(booking => (
                          <div key={booking.booking_id} className="p-4 rounded-xl border border-gray-200 bg-gray-50/20 flex justify-between items-center gap-4">
                            <div className="space-y-1">
                              <h5 className="font-bold text-gray-800 text-xs">{booking.service_name}</h5>
                              <p className="text-[11px] text-gray-500">Booking ID: #{booking.booking_id}</p>
                              <p className="text-[11px] text-gray-500">Date: {new Date(booking.created_at).toLocaleDateString('en-IN')}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1.5">
                              <span className="text-xs font-bold text-gray-900">₹{Number(booking.service_amount).toLocaleString('en-IN')}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                booking.booking_status === 'COMPLETED' || booking.booking_status === 'ACCEPTED' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                              }`}>
                                {booking.booking_status}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Right pane: Customer Card */}
              <div className="w-64 bg-gray-50/50 p-4 space-y-4 overflow-y-auto hidden md:block">
                <h4 className="font-bold text-gray-700 text-xs uppercase tracking-wider border-b border-gray-200 pb-2">Customer Profile</h4>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    <User size={18} />
                  </div>
                  <div>
                    <h5 className="font-bold text-gray-900 text-xs truncate max-w-[150px]">{ticketDetails.ticket.customer_name}</h5>
                    <p className="text-[10px] text-gray-500">User ID: #{ticketDetails.ticket.customer_id}</p>
                  </div>
                </div>
                <div className="space-y-2 text-xs border-t border-gray-200 pt-3">
                  <p className="text-gray-600">Email: <strong className="text-gray-900 break-all">{ticketDetails.ticket.customer_email}</strong></p>
                  <p className="text-gray-600">Phone: <strong className="text-gray-900">{ticketDetails.ticket.customer_phone || 'N/A'}</strong></p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-center items-center text-gray-500 p-6">
            <MessageSquare size={48} className="text-gray-300 mb-3" />
            <h4 className="font-bold text-gray-700 text-sm">No Ticket Selected</h4>
            <p className="text-xs text-gray-400 mt-1">Select a ticket from the left panel to load the customer details and chat.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupportDashboard;
