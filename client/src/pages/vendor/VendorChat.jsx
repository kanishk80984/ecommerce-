import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ArrowLeft, Send, Image as ImageIcon, Paperclip, MoreVertical, Search, Check, CheckCheck, X } from 'lucide-react';
import api from '../../services/api';
import { io } from 'socket.io-client';

const VendorChat = () => {
  const { id: conversationId } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector(state => state.auth);

  const [messages, setMessages] = useState([]);
  const [conversation, setConversation] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const messagesEndRef = useRef(null);
  const menuRef = useRef(null);

  // Handle click outside for menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch Conversation Details and Messages
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Get conversation details from the list
        const convRes = await api.get('/vendor-communications/conversations');
        const currentConv = convRes.data.data.find(c => c.conversation_id === conversationId);

        if (currentConv) {
          setConversation(currentConv);
        } else {
          // Fallback if not in recent list
          navigate('/vendor/communicate');
          return;
        }

        // Get messages
        const msgRes = await api.get(`/vendor-communications/conversations/${conversationId}/messages`);
        setMessages(msgRes.data.data);

        // Mark as read
        if (currentConv.unread_count > 0) {
          await api.patch('/vendor-communications/messages/read', { conversationId });
        }
      } catch (err) {
        console.error('Failed to load chat', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [conversationId, navigate]);

  // Setup Socket.IO
  useEffect(() => {
    const token = localStorage.getItem('token'); // or from redux if stored there
    if (!token) return;

    // The backend uses process.env.CLIENT_URL or * for CORS, and runs on the same host for the API
    // If dev-server, usually port 3013, if production 5001. We'll use the current window location origin or standard API base
    const backendUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : window.location.origin;

    const newSocket = io(backendUrl, {
      auth: { token }
    });

    newSocket.on('connect', () => {
      console.log('Connected to chat server');
    });

    newSocket.on('new_message', (message) => {
      if (message.conversation_id === conversationId) {
        setMessages(prev => [...prev, message]);
        // Mark as read immediately if chat is open
        api.patch('/vendor-communications/messages/read', { conversationId }).catch(console.error);
      }
    });

    newSocket.on('messages_read', (data) => {
      if (data.conversationId === conversationId) {
        setMessages(prev => prev.map(m => ({ ...m, is_read: 1 })));
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || conversation?.blocked_by) return;

    const messageText = newMessage.trim();
    setNewMessage(''); // optimistic clear

    try {
      const res = await api.post(`/vendor-communications/conversations/${conversationId}/messages`, {
        message: messageText
      });

      setMessages(prev => [...prev, res.data.data]);
    } catch (err) {
      console.error('Failed to send message', err);
      setNewMessage(messageText); // restore on failure
    }
  };

  const handleClearChat = async () => {
    if (!window.confirm('Are you sure you want to delete all messages? This action cannot be undone.')) return;
    try {
      await api.delete(`/vendor-communications/conversations/${conversationId}/messages`);
      setMessages([]);
      setIsMenuOpen(false);
    } catch (err) {
      console.error('Failed to clear chat', err);
    }
  };

  const handleBlockUnblock = async () => {
    try {
      const action = conversation?.blocked_by === user?.id ? 'unblock' : 'block';
      const res = await api.patch(`/vendor-communications/conversations/${conversationId}/block`, { action });
      setConversation(prev => ({ ...prev, blocked_by: res.data.blocked_by }));
      setIsMenuOpen(false);
    } catch (err) {
      console.error('Failed to block/unblock', err);
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDateLabel = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Group messages by date
  const filteredMessages = messages.filter(m => m.message.toLowerCase().includes(searchQuery.toLowerCase()));
  
  const groupedMessages = filteredMessages.reduce((groups, msg) => {
    const date = formatDateLabel(msg.created_at);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(msg);
    return groups;
  }, {});

  if (loading && !conversation) {
    return <div className="flex h-[calc(100vh-80px)] items-center justify-center">Loading chat...</div>;
  }

  return (
    <div className="h-[calc(100vh-140px)] md:h-[calc(100vh-100px)] flex flex-col bg-gray-50 -mx-4 md:mx-0 md:rounded-xl shadow-sm border border-gray-200 overflow-hidden relative z-10">
      {/* Header */}
      <div className="bg-white px-4 py-3 border-b border-gray-200 flex items-center justify-between shrink-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/vendor/communicate')}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="flex items-center gap-3">
            {isSearchOpen ? (
              <div className="flex items-center bg-gray-100 rounded-full px-3 py-1.5 ml-2 w-48 sm:w-64 transition-all">
                <Search size={16} className="text-gray-400" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..." 
                  className="bg-transparent border-none focus:outline-none text-sm ml-2 w-full"
                  autoFocus
                />
                <button onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }} className="text-gray-400 hover:text-gray-600">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-200">
                  {conversation?.other_vendor_logo ? (
                    <img src={`/uploads/${conversation.other_vendor_logo}`} alt="Vendor" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500 font-bold">
                      {conversation?.other_business_name?.charAt(0) || 'V'}
                    </div>
                  )}
                </div>
                <div>
                  <h2 className="font-bold text-gray-900 text-sm md:text-base leading-tight">
                    {conversation?.other_business_name || 'Vendor'}
                  </h2>
                  <p className="text-xs text-gray-500">
                    {conversation?.other_vendor_name || ''}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 text-gray-500 relative">
          {!isSearchOpen && (
            <button onClick={() => setIsSearchOpen(true)} className="p-2 rounded-full hover:bg-gray-100 transition-colors hidden sm:block">
              <Search size={18} />
            </button>
          )}
          <div ref={menuRef}>
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
              <MoreVertical size={18} />
            </button>
            {isMenuOpen && (
              <div className="absolute right-0 top-10 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50">
                <button 
                  onClick={handleClearChat}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50 transition-colors"
                >
                  Delete all
                </button>
                <button 
                  onClick={handleBlockUnblock}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-100"
                >
                  {conversation?.blocked_by === user?.id ? 'Unblock' : 'Block'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div
        className="flex-1 relative z-0 overflow-hidden"
        style={{ backgroundColor: '#f0f0f0' }}
      >
        {/* Background Pattern */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "url('https://i.pinimg.com/736x/8c/98/99/8c98994518b575bfd8c949e91d20548b.jpg')",
            backgroundRepeat: 'repeat',
            backgroundSize: '400px',
            opacity: 0.6
          }}
        ></div>

        {/* Scrollable Content */}
        <div className="absolute inset-0 overflow-y-auto p-4 space-y-6">
          {Object.entries(groupedMessages).map(([date, msgs]) => (
            <div key={date} className="space-y-4">
              <div className="flex justify-center sticky top-2 z-10">
                <span className="bg-white/90 backdrop-blur-sm text-gray-500 text-xs px-3 py-1 rounded-full shadow-sm border border-gray-100">
                  {date}
                </span>
              </div>

              {msgs.map((msg, index) => {
                const isMine = String(msg.sender_vendor_id) === String(user?.id);
                const showTail = index === msgs.length - 1 || msgs[index + 1].sender_vendor_id !== msg.sender_vendor_id;

                return (
                  <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`
                        max-w-[85%] md:max-w-[70%] relative px-4 py-2 shadow-sm
                        ${isMine
                          ? 'bg-green-600 text-white rounded-2xl rounded-tr-sm'
                          : 'bg-white text-gray-800 rounded-2xl rounded-tl-sm border border-gray-100'
                        }
                      `}
                    >
                      <p className="text-[15px] whitespace-pre-wrap break-words leading-relaxed">{msg.message}</p>
                      <div className={`flex items-center justify-end gap-1.5 mt-1 -mb-1 ${isMine ? 'text-green-100' : 'text-gray-400'}`}>
                        <span className="text-[10px] uppercase">{formatTime(msg.created_at)}</span>
                        {isMine && (
                          msg.is_read ? <CheckCheck size={14} className="text-white" /> : <Check size={14} />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white px-4 py-3 border-t border-gray-200 shrink-0 z-20 relative">
        <form onSubmit={handleSendMessage} className="flex items-end gap-2">
          <button type="button" className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0">
            <ImageIcon size={20} />
          </button>
          <button type="button" className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0 hidden sm:block">
            <Paperclip size={20} />
          </button>

          <div className="flex-1 bg-gray-100 rounded-2xl px-4 py-2 flex items-center min-h-[44px]">
            {conversation?.blocked_by ? (
              <div className="w-full text-center text-gray-500 text-sm py-1">
                {conversation.blocked_by === user?.id ? 'You blocked this vendor' : 'You have been blocked'}
              </div>
            ) : (
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="w-full bg-transparent border-none focus:outline-none resize-none max-h-32 text-[15px]"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
                style={{ minHeight: '24px' }}
              />
            )}
          </div>

          <button
            type="submit"
            disabled={!newMessage.trim() || !!conversation?.blocked_by}
            className={`p-3 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${newMessage.trim() && !conversation?.blocked_by ? 'bg-red-600 text-white hover:bg-red-700 shadow-sm shadow-red-600/30' : 'bg-gray-100 text-gray-400'}`}
          >
            <Send size={18} className={newMessage.trim() ? 'translate-x-0.5 -translate-y-0.5' : ''} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default VendorChat;
