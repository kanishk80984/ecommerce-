import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Filter, MessageSquare, Phone, Mail, MapPin, Briefcase, Eye, X, Globe, Award, Users, Clock, Star, BadgeCheck } from 'lucide-react';
import api from '../../services/api';

const VendorCommunications = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('vendors'); // 'vendors' or 'messages'
  const [vendors, setVendors] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');

  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
  const [selectedVendor, setSelectedVendor] = useState(null);

  useEffect(() => {
    if (activeTab === 'vendors') {
      fetchVendors();
    } else {
      fetchConversations();
    }
  }, [activeTab, pagination.page]);

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const res = await api.get('/vendor-communications/vendors', {
        params: { search, category, location, page: pagination.page }
      });
      setVendors(res.data.data);
      setPagination(res.data.pagination);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Failed to load vendors');
    } finally {
      setLoading(false);
    }
  };

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const res = await api.get('/vendor-communications/conversations');
      setConversations(res.data.data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination({ ...pagination, page: 1 });
    fetchVendors();
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) return imagePath;
    if (imagePath.startsWith('/uploads/')) return imagePath;
    if (imagePath.startsWith('uploads/')) return `/${imagePath}`;
    return `/uploads/${imagePath}`;
  };

  const handleMessageVendor = async (vendorId) => {
    try {
      const res = await api.post('/vendor-communications/conversations', { targetVendorId: vendorId });
      if (res.data.success) {
        navigate(`/vendor/communicate/${res.data.data.id}`);
      }
    } catch (err) {
      console.error('Failed to create conversation', err);
      alert('Failed to start conversation. Please try again later.');
    }
  };

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Communicate with Vendors</h1>
          <p className="text-gray-500 text-sm mt-1">Connect and collaborate with other vendors on the platform.</p>
        </div>

        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => { setActiveTab('vendors'); setPagination({ ...pagination, page: 1 }); }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'vendors' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}
          >
            All Vendors
          </button>
          <button
            onClick={() => setActiveTab('messages')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'messages' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Messages
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">{error}</div>}

      {activeTab === 'vendors' ? (
        <div className="space-y-6">
          {/* Filters */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search vendors..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch(e)}
              />
            </div>
            <div className="flex gap-4">
              <button onClick={handleSearch} className="px-6 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors">
                Search
              </button>
            </div>
          </div>

          {/* Vendors Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="bg-white p-6 rounded-xl border border-gray-100 h-48"></div>
              ))}
            </div>
          ) : vendors.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {vendors.map(vendor => (
                  <div key={vendor.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-full bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-200">
                        {(vendor.business_logo || vendor.profile_photo) ? (
                          <img src={getImageUrl(vendor.business_logo || vendor.profile_photo)} alt={vendor.business_name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-xl">
                            {vendor.business_name?.charAt(0) || 'V'}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 truncate" title={vendor.business_name}>{vendor.business_name}</h3>
                        <p className="text-sm text-gray-500 truncate">{vendor.name}</p>
                        <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-600">
                          <Briefcase size={14} className="text-gray-400" />
                          <span className="truncate">{vendor.business_category || 'General'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-600">
                          <MapPin size={14} className="text-gray-400" />
                          <span className="truncate">{vendor.city || 'N/A'}, {vendor.state || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-5 pt-4 border-t border-gray-100 flex gap-2">
                      <button
                        onClick={() => setSelectedVendor(vendor)}
                        className="flex-1 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                      >
                        <Eye size={16} /> View Profile
                      </button>
                      <button
                        onClick={() => handleMessageVendor(vendor.id)}
                        className="flex-1 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-medium rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                      >
                        <MessageSquare size={16} /> Message
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="flex justify-center mt-8">
                  <div className="flex gap-2">
                    <button
                      disabled={pagination.page === 1}
                      onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                      className="px-4 py-2 border border-gray-200 rounded-lg disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <span className="px-4 py-2 text-gray-600">
                      Page {pagination.page} of {pagination.pages}
                    </span>
                    <button
                      disabled={pagination.page === pagination.pages}
                      onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                      className="px-4 py-2 border border-gray-200 rounded-lg disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="text-gray-400" size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">No vendors found</h3>
              <p className="text-gray-500">Try adjusting your search filters.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading conversations...</div>
          ) : conversations.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {conversations.map(conv => (
                <div
                  key={conv.conversation_id}
                  onClick={() => navigate(`/vendor/communicate/${conv.conversation_id}`)}
                  className="p-4 hover:bg-gray-50 cursor-pointer flex items-center gap-4 transition-colors"
                >
                  <div className="w-12 h-12 rounded-full bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-200 relative">
                    {conv.other_vendor_logo ? (
                      <img src={`/uploads/${conv.other_vendor_logo}`} alt={conv.other_business_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold">
                        {conv.other_business_name?.charAt(0) || 'V'}
                      </div>
                    )}
                    {conv.unread_count > 0 && (
                      <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 border-2 border-white rounded-full"></span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className={`font-medium truncate ${conv.unread_count > 0 ? 'text-gray-900 font-bold' : 'text-gray-800'}`}>
                        {conv.other_business_name || conv.other_vendor_name}
                      </h3>
                      <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                        {new Date(conv.last_activity).toLocaleDateString()}
                      </span>
                    </div>
                    <p className={`text-sm truncate ${conv.unread_count > 0 ? 'text-gray-800 font-medium' : 'text-gray-500'}`}>
                      {conv.last_message || 'No messages yet'}
                    </p>
                  </div>
                  {conv.unread_count > 0 && (
                    <div className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {conv.unread_count}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="text-gray-400" size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">No messages yet</h3>
              <p className="text-gray-500 mb-6">Start a conversation with a vendor from the vendors list.</p>
              <button
                onClick={() => setActiveTab('vendors')}
                className="px-6 py-2 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
              >
                Find Vendors
              </button>
            </div>
          )}
        </div>
      )}

      {/* Vendor Profile Modal */}
      {selectedVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 my-8">
            {/* Top Banner */}
            <div className="relative h-24 bg-gradient-to-r from-red-600 via-red-700 to-red-900 overflow-hidden">
              <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"></div>
              
              <button
                onClick={() => setSelectedVendor(null)}
                className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/20 hover:bg-black/40 rounded-full p-1.5 transition-colors z-10"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-5 md:px-6 pb-6 relative">
              <div className="flex flex-col md:flex-row justify-between items-start">
                <div className="relative -mt-12 mb-3">
                  <div className="w-20 h-20 bg-white rounded-2xl shadow-md border-4 border-white overflow-hidden flex items-center justify-center">
                    {(selectedVendor.business_logo || selectedVendor.profile_photo) ? (
                      <img src={getImageUrl(selectedVendor.business_logo || selectedVendor.profile_photo)} alt={selectedVendor.business_name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl font-bold text-gray-300">{selectedVendor.business_name?.charAt(0) || 'V'}</span>
                    )}
                  </div>
                  <div className="mt-2 inline-flex items-center gap-1 bg-green-50 text-green-700 px-2 py-0.5 rounded-full text-[10px] font-medium border border-green-200">
                    <BadgeCheck size={12} className="text-green-600" />
                    Verified Vendor
                  </div>
                </div>

                {/* Rating Block */}
                <div className="hidden md:flex flex-col items-center justify-center border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 mt-3">
                  <div className="flex items-center gap-1 text-xl font-bold text-gray-900">
                    <Star className="text-yellow-400 fill-yellow-400" size={18} />
                    4.8
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">(125 Reviews)</div>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold text-gray-900">{selectedVendor.business_name}</h2>
                <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium mt-0.5">
                  <span>{selectedVendor.name}</span>
                  <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                  <span>Vendor Since {selectedVendor.year_established || '2022'}</span>
                </div>
                
                <p className="text-xs text-gray-600 mt-3 leading-relaxed">
                  {selectedVendor.store_description || `${selectedVendor.business_name} provides excellent products and services.`}
                </p>

                <div className="mt-5 space-y-3">
                  <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
                    <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-600 flex-shrink-0">
                      <Briefcase size={16} />
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Category</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedVendor.business_category || 'General'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
                    <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-600 flex-shrink-0">
                      <MapPin size={16} />
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Location</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedVendor.city || 'N/A'}, {selectedVendor.state || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
                    <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-600 flex-shrink-0">
                      <Phone size={16} />
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Phone</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedVendor.phone || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
                    <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-600 flex-shrink-0">
                      <Mail size={16} />
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Email</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedVendor.email || 'N/A'}</p>
                    </div>
                  </div>

                  {selectedVendor.website && (
                    <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
                      <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-600 flex-shrink-0">
                        <Globe size={16} />
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Website</p>
                        <a href={selectedVendor.website.startsWith('http') ? selectedVendor.website : `https://${selectedVendor.website}`} target="_blank" rel="noreferrer" className="text-sm font-semibold text-blue-600 hover:underline">
                          {selectedVendor.website}
                        </a>
                      </div>
                    </div>
                  )}
                </div>



                {/* Bottom Actions */}
                <div className="mt-5 flex flex-col sm:flex-row gap-2">
                  <a
                    href={`tel:${selectedVendor.phone}`}
                    className="flex-1 py-2 bg-white text-gray-800 font-semibold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 border border-gray-200 hover:bg-gray-50"
                  >
                    <Phone size={14} className="text-gray-500" /> Call Vendor
                  </a>
                  <a
                    href={`mailto:${selectedVendor.email}`}
                    className="flex-1 py-2 bg-white text-gray-800 font-semibold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 border border-gray-200 hover:bg-gray-50"
                  >
                    <Mail size={14} className="text-gray-500" /> Email Vendor
                  </a>
                  <button
                    onClick={() => {
                      handleMessageVendor(selectedVendor.id);
                      setSelectedVendor(null);
                    }}
                    className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm shadow-red-600/20"
                  >
                    <MessageSquare size={14} /> Message Vendor
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorCommunications;
