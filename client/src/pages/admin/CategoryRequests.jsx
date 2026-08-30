import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Check, X, Store, Clock, Trash2, Tag, ListFilter, MapPin, Star, ShieldCheck, ExternalLink, BookOpen, Layers, Plus } from 'lucide-react';
import { getImageUrl } from '../../utils/imageUrl';
import EnterpriseImageUploader from '../../components/EnterpriseImageUploader';


const CategoryRequests = () => {
  const [activeTab, setActiveTab] = useState('requested'); // 'requested' or 'all'
  const [requests, setRequests] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [msg, setMsg] = useState({ type: '', text: '' });

  // SEO Management States
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [seoForm, setSeoForm] = useState({
    primary_keyword: '',
    seo_title: '',
    seo_meta_description: '',
    seo_h1: '',
    seo_content: '',
    seo_status: 'Active',
    index_status: 'Index',
    canonical_url: '',
    keywords: [],
    targetLocations: []
  });
  const [keywordInput, setKeywordInput] = useState('');
  const [locationInput, setLocationInput] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [seoMsg, setSeoMsg] = useState({ type: '', text: '' });
  const [selectedKeywordIndex, setSelectedKeywordIndex] = useState(null);
  const [bannerImages, setBannerImages] = useState([]);

  useEffect(() => {
    if (activeTab === 'requested') {
      fetchRequests();
    } else {
      fetchCategories();
    }
  }, [activeTab]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/service-categories');
      setRequests(res.data.requests || []);
    } catch (error) {
      console.error('Error fetching category requests', error);
      setMsg({ type: 'error', text: 'Failed to fetch category requests.' });
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch DB service categories (which now come from the service_categories table)
      const dbCatRes = await api.get('/public/service-categories');
      const dbCats = dbCatRes.data?.categories || [];
      
      // 2. Fetch businesses to count active listings in each category
      const bizRes = await api.get('/public/businesses');
      const bizList = bizRes.data?.businesses || [];
      
      const counts = {};
      bizList.forEach(b => {
        if (b.category) {
          counts[b.category] = (counts[b.category] || 0) + 1;
        }
      });
      
      // 3. Build final category list objects mapping database id if present
      const categoryList = dbCats
        .filter(c => c.name !== 'Others')
        .map((dbCat, index) => {
          return {
            id: index + 1,
            dbId: dbCat.id,
            name: dbCat.name,
            slug: dbCat.slug || dbCat.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
            count: counts[dbCat.name] || 0,
            status: dbCat.status || 'ACTIVE'
          };
        });
      
      setCategories(categoryList);
    } catch (error) {
      console.error('Error fetching categories', error);
      setMsg({ type: 'error', text: 'Failed to fetch categories list.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (id, action) => {
    setActionLoading(id);
    setMsg({ type: '', text: '' });
    try {
      await api.post(`/admin/service-categories/${id}/decide`, { action });
      setMsg({ type: 'success', text: `Category suggestion ${action === 'APPROVE' ? 'approved' : 'rejected'} successfully!` });
      fetchRequests();
    } catch (error) {
      console.error('Error processing category request', error);
      setMsg({ type: 'error', text: error.response?.data?.message || 'Failed to process request.' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteServiceCategory = async (name) => {
    if (!window.confirm(`Are you sure you want to permanently delete the service category "${name}"? This action cannot be undone.`)) return;
    try {
      setLoading(true);
      await api.delete(`/admin/service-categories/${encodeURIComponent(name)}`);
      setMsg({ type: 'success', text: 'Service Category deleted successfully!' });
      fetchCategories();
    } catch (error) {
      console.error('Error deleting service category', error);
      setMsg({ type: 'error', text: error.response?.data?.message || 'Failed to delete service category.' });
      setLoading(false);
    }
  };

  // ── SEO Management Handlers ──────────────────────────────────────────────────

  const handleOpenSeo = async (category) => {
    setSelectedCategory(category);
    setSelectedKeywordIndex(null);
    setSeoMsg({ type: '', text: '' });
    setKeywordInput('');
    setLocationInput('');

    // If it has no dbId, initialize default form values
    if (!category.dbId) {
      setSeoForm({
        primary_keyword: '',
        seo_title: '',
        seo_meta_description: '',
        seo_h1: '',
        seo_content: '',
        seo_status: 'Active',
        index_status: 'Index',
        canonical_url: '',
        banner_image: '',
        keywords: [],
        targetLocations: []
      });
      setBannerImages([]);
      return;
    }

    try {
      const res = await api.get(`/admin/service-categories/${category.dbId}/seo`);
      if (res.data.success && res.data.seoSettings) {
        const settings = res.data.seoSettings;
        setSeoForm({
          primary_keyword: settings.primary_keyword || '',
          seo_title: settings.seo_title || '',
          seo_meta_description: settings.seo_meta_description || '',
          seo_h1: settings.seo_h1 || '',
          seo_content: settings.seo_content || '',
          seo_status: settings.seo_status || 'Active',
          index_status: settings.index_status || 'Index',
          canonical_url: settings.canonical_url || '',
          banner_image: settings.banner_image || '',
          keywords: settings.keywords || [],
          targetLocations: settings.targetLocations || []
        });
        if (settings.banner_image) {
          setBannerImages([{ imageUrl: settings.banner_image }]);
        } else {
          setBannerImages([]);
        }
      }
    } catch (err) {
      console.error('Error fetching SEO settings', err);
    }
  };

  const handleKeywordKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === '/') {
      e.preventDefault();
      addKeywordTag();
    }
  };

  const addKeywordTag = () => {
    const rawVal = keywordInput.trim();
    if (!rawVal) return;

    const parts = rawVal.split(/[/,]+/).map(p => p.trim()).filter(Boolean);
    const updatedKeywords = [...seoForm.keywords];

    parts.forEach(part => {
      const normalized = part.toLowerCase();
      const exists = updatedKeywords.some(k => k.keyword.toLowerCase() === normalized);
      if (!exists) {
        updatedKeywords.push({
          keyword: part,
          slug: part.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
          search_intent: 'Category',
          priority: 'Medium',
          is_active: 1,
          index_status: 'Index',
          location_id: null
        });
      }
    });

    setSeoForm(f => ({ ...f, keywords: updatedKeywords }));
    setKeywordInput('');
  };

  const removeKeywordTag = (index) => {
    const updated = [...seoForm.keywords];
    updated.splice(index, 1);
    setSeoForm(f => ({ ...f, keywords: updated }));
    if (selectedKeywordIndex === index) {
      setSelectedKeywordIndex(null);
    } else if (selectedKeywordIndex > index) {
      setSelectedKeywordIndex(selectedKeywordIndex - 1);
    }
  };

  const reorderKeyword = (index, direction) => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === seoForm.keywords.length - 1) return;

    const updated = [...seoForm.keywords];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    setSeoForm(f => ({ ...f, keywords: updated }));
    if (selectedKeywordIndex === index) setSelectedKeywordIndex(targetIndex);
    else if (selectedKeywordIndex === targetIndex) setSelectedKeywordIndex(index);
  };

  const addLocationTag = () => {
    const val = locationInput.trim();
    if (!val) return;

    const exists = seoForm.targetLocations.some(l => l.name.toLowerCase() === val.toLowerCase());
    if (!exists) {
      const slug = val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      setSeoForm(f => ({
        ...f,
        targetLocations: [...f.targetLocations, { name: val, slug }]
      }));
    }
    setLocationInput('');
  };

  const removeLocationTag = (index) => {
    const updated = [...seoForm.targetLocations];
    updated.splice(index, 1);
    setSeoForm(f => ({ ...f, targetLocations: updated }));
  };

  const handleSaveSeo = async () => {
    setSaveLoading(true);
    setSeoMsg({ type: '', text: '' });
    try {
      let activeDbId = selectedCategory.dbId;

      // 1. If Category does not exist in DB yet, create it first
      if (!activeDbId) {
        const createRes = await api.post('/admin/categories', {
          name: selectedCategory.name,
          slug: selectedCategory.slug,
          status: 'ACTIVE',
          margin_percentage: 0,
          gst_percentage: 0
        });
        
        // Fetch categories to get the newly created database ID
        const dbCatRes = await api.get('/public/categories');
        const dbCats = dbCatRes.data?.categories || [];
        const matched = dbCats.find(c => c.name.toLowerCase() === selectedCategory.name.toLowerCase());
        if (matched) {
          activeDbId = matched.id;
          setSelectedCategory(prev => ({ ...prev, dbId: matched.id }));
        } else {
          throw new Error('Failed to retrieve newly created category ID.');
        }
      }

      // 2. Save SEO Settings
      const payload = { ...seoForm };
      const uploadedBanner = bannerImages[0];
      if (uploadedBanner) {
        payload.banner_image = uploadedBanner.imageUrl || uploadedBanner.image_url || uploadedBanner.mainPath || uploadedBanner;
      } else {
        payload.banner_image = null;
      }
      
      await api.post(`/admin/service-categories/${activeDbId}/seo`, payload);

      setSeoMsg({ type: 'success', text: 'SEO settings saved successfully!' });
      
      // Reload categories list to refresh dbId mappings
      fetchCategories();
    } catch (err) {
      setSeoMsg({ type: 'error', text: err.response?.data?.message || err.message || 'Failed to save SEO settings.' });
    } finally {
      setSaveLoading(false);
    }
  };

  const updateKeywordDetail = (index, field, value) => {
    const updated = [...seoForm.keywords];
    updated[index] = { ...updated[index], [field]: value };
    setSeoForm(f => ({ ...f, keywords: updated }));
  };

  const previewTitle = seoForm.seo_title || `${selectedCategory?.name} Services | IBC Mart`;
  const firstLoc = seoForm.targetLocations[0]?.slug || '';
  const previewUrl = `https://www.ibcmart.com/${firstLoc ? firstLoc + '/' : ''}${selectedCategory?.slug}`;
  const previewDesc = seoForm.seo_meta_description || `Find the best ${selectedCategory?.name} listing details, reviews, address, contact numbers, and more on IBC Mart.`;

  const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white';
  const labelCls = 'block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide';

  const Alert = ({ m }) => m.text ? (
    <div className={`mb-6 px-4 py-3 rounded-xl text-sm font-medium border ${
      m.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
    }`}>
      {m.type === 'success' ? '✅ ' : '❌ '}{m.text}
    </div>
  ) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Service Categories</h1>
          <p className="text-sm text-gray-500">Manage all registered categories and approve vendor custom suggestions.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => { setActiveTab('requested'); setSelectedCategory(null); }}
          className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm border-b-2 transition-all ${
            activeTab === 'requested'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Clock className="w-4 h-4" />
          Requested Categories
        </button>
        <button
          onClick={() => { setActiveTab('all'); setSelectedCategory(null); }}
          className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm border-b-2 transition-all ${
            activeTab === 'all'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Tag className="w-4 h-4" />
          All Categories
        </button>
      </div>

      <Alert m={msg} />

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
        </div>
      ) : activeTab === 'requested' ? (
        // TAB: REQUESTED CATEGORIES
        requests.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700">No suggestions yet</h3>
            <p className="text-sm text-gray-400 mt-1">Vendor custom category suggestion requests will appear here.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-12rem)] relative">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10 bg-white shadow-sm">
                  <tr className="bg-gray-50/95 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="px-6 py-4">Vendor & Business</th>
                    <th className="px-6 py-4">Suggested Category</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Request Date</th>
                    <th  className="px-6 py-4  text-left" >Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                  {requests.map((req) => (
                    <tr key={req.id} className="hover:bg-gray-50/50 transition">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-800">{req.vendor_name}</div>
                        <div className="text-xs text-gray-400 flex items-center gap-1.5 mt-0.5">
                          <Store className="w-3.5 h-3.5" />
                          {req.business_name || 'No business profile yet'}
                        </div>
                        <div className="text-xs text-gray-400">{req.vendor_email}</div>
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {req.suggested_name}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                          req.status === 'PENDING' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                          req.status === 'APPROVED' ? 'bg-green-50 text-green-700 border-green-200' :
                          'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          {req.status === 'PENDING' ? '⏳ Pending' :
                           req.status === 'APPROVED' ? '✅ Approved' :
                           '❌ Rejected'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500">
                        {new Date(req.created_at).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="px-6 py-4 text-left">
                        {req.status === 'PENDING' ? (
                          <div className="flex justify-start gap-2">
                            <button
                              disabled={actionLoading !== null}
                              onClick={() => handleDecision(req.id, 'APPROVE')}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-55 text-white text-xs font-bold rounded-lg shadow-sm transition"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Approve
                            </button>
                            <button
                              disabled={actionLoading !== null}
                              onClick={() => handleDecision(req.id, 'REJECT')}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-55 text-white text-xs font-bold rounded-lg shadow-sm transition"
                            >
                              <X className="w-3.5 h-3.5" />
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Processed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        // TAB: ALL CATEGORIES
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
          <div className="xl:col-span-2">
            {categories.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                <Tag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-700">No categories found</h3>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-12rem)] relative">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 z-10 bg-white shadow-sm">
                      <tr className="bg-gray-50/95 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        <th className="px-6 py-4">S.No</th>
                        <th className="px-6 py-4">Category Name</th>
                        <th className="px-6 py-4">Slug</th>
                        <th className="px-6 py-4">Active Businesses</th>
                        <th className="px-6 py-4">Status</th>
                        <th  className="px-6 py-4  text-left" >Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                      {categories.map((cat, idx) => (
                        <tr key={idx} className={`hover:bg-gray-50/50 transition-colors ${selectedCategory?.name === cat.name ? 'bg-indigo-50/30' : ''}`}>
                          <td className="px-6 py-4 font-semibold text-gray-500">
                            {idx + 1}
                          </td>
                          <td className="px-6 py-4 font-bold text-gray-900">
                            {cat.name}
                          </td>
                          <td className="px-6 py-4 text-xs text-gray-400">
                            {cat.slug}
                          </td>
                          <td className="px-6 py-4 font-medium text-gray-700">
                            {cat.count} {cat.count === 1 ? 'business' : 'businesses'}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                              cat.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                            }`}>
                              {cat.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-left">
                            <div className="flex justify-start gap-2">
                              <button
                                onClick={() => handleOpenSeo(cat)}
                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition shadow-sm"
                              >
                                Manage SEO
                              </button>
                              <button
                                onClick={() => handleDeleteServiceCategory(cat.name)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-sm transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Side panel SEO settings form */}
          <div className="xl:col-span-1 sticky top-6 self-start">
            {selectedCategory ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden max-h-[calc(100vh-6rem)] overflow-y-auto">
                <div className="bg-indigo-650 px-6 py-4 flex justify-between items-center text-white sticky top-0 z-10" style={{ backgroundColor: '#4f46e5' }}>
                  <div>
                    <h3 className="font-bold text-lg">SEO Management</h3>
                    <p className="text-xs text-indigo-100">Category: {selectedCategory.name}</p>
                  </div>
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition font-bold"
                  >
                    ✕
                  </button>
                </div>

                <div className="p-6 space-y-6">
                  {/* Google Preview */}
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-2">
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Search Engine Snippet Preview</span>
                    <div className="space-y-1">
                      <a
                        href={`/${firstLoc ? firstLoc + '/' : ''}${selectedCategory.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-lg text-blue-800 font-medium hover:underline block leading-snug"
                      >
                        {previewTitle}
                      </a>
                      <div className="text-xs text-green-700 truncate">{previewUrl}</div>
                      <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">{previewDesc}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className={labelCls}>Primary Keyword</label>
                      <input className={inputCls} placeholder="e.g. Best Hospital in Erode" value={seoForm.primary_keyword}
                        onChange={e => setSeoForm(f => ({ ...f, primary_keyword: e.target.value }))} />
                    </div>

                    {/* Banner Image */}
                    <div className="bg-white p-4 rounded-xl border border-gray-100">
                      <label className={labelCls}>Banner Image</label>
                      <p className="text-xs text-gray-500 mb-3">Upload a banner image to display on the public category page. Recommended size: 1920x400px.</p>
                      
                      <EnterpriseImageUploader
                        images={bannerImages}
                        onChange={setBannerImages}
                        module="categories"
                        single={true}
                        aspectRatio="24:5"
                        allowedRatios={['24:5', 'free']}
                        maxFileSizeMB={5}
                        showAltText={false}
                        showImageType={false}
                        showSeoTitle={false}
                      />
                    </div>

                    {/* Target Locations */}
                    <div>
                      <label className={labelCls}>Target Locations</label>
                      <div className="flex gap-2 mb-2">
                        <input className={inputCls} placeholder="e.g. Erode" value={locationInput}
                          onChange={e => setLocationInput(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addLocationTag(); } }} />
                        <button onClick={addLocationTag} className="px-3 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-lg text-xs font-semibold">
                          Add
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {seoForm.targetLocations.map((loc, i) => (
                          <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 border border-gray-200 rounded-full text-xs font-medium text-gray-700">
                            {loc.name}
                            <button onClick={() => removeLocationTag(i)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* SEO Keyword Chips input */}
                    <div>
                      <label className={labelCls}>SEO Keywords / Search Phrases</label>
                      <textarea
                        rows={2}
                        className={`${inputCls} resize-none`}
                        placeholder="Enter keywords separated by slash '/' or comma ',' or press Enter..."
                        value={keywordInput}
                        onChange={e => setKeywordInput(e.target.value)}
                        onKeyDown={handleKeywordKeyDown}
                        onBlur={addKeywordTag}
                      />
                      <div className="flex flex-wrap gap-1.5 mt-2 max-h-48 overflow-y-auto p-1 bg-gray-50 border border-gray-100 rounded-lg">
                        {seoForm.keywords.map((kw, i) => (
                          <span
                            key={i}
                            onClick={() => setSelectedKeywordIndex(i)}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium cursor-pointer transition ${selectedKeywordIndex === i ? 'bg-indigo-600 text-white' : 'bg-indigo-50 border border-indigo-100 text-indigo-700 hover:bg-indigo-100'}`}
                          >
                            <span className="flex items-center gap-1">
                              <button onClick={(e) => { e.stopPropagation(); reorderKeyword(i, 'up'); }} className="opacity-40 hover:opacity-100">▲</button>
                              <button onClick={(e) => { e.stopPropagation(); reorderKeyword(i, 'down'); }} className="opacity-40 hover:opacity-100">▼</button>
                            </span>
                            <span className="truncate max-w-[120px]">{kw.keyword}</span>
                            <button onClick={(e) => { e.stopPropagation(); removeKeywordTag(i); }} className="opacity-60 hover:opacity-100 font-bold">✕</button>
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Keyword property details */}
                    {selectedKeywordIndex !== null && seoForm.keywords[selectedKeywordIndex] && (
                      <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] uppercase font-bold text-indigo-600">Keyword Config</span>
                          <button onClick={() => setSelectedKeywordIndex(null)} className="text-gray-400 hover:text-gray-600 font-bold text-xs">✕</button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-semibold text-gray-500">Intent</label>
                            <select
                              className={`${inputCls} py-1 text-xs`}
                              value={seoForm.keywords[selectedKeywordIndex].search_intent || 'Category'}
                              onChange={e => updateKeywordDetail(selectedKeywordIndex, 'search_intent', e.target.value)}
                            >
                              <option value="Informational">Informational</option>
                              <option value="Commercial">Commercial</option>
                              <option value="Transactional">Transactional</option>
                              <option value="Local">Local</option>
                              <option value="Service">Service</option>
                              <option value="Category">Category</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold text-gray-500">Priority</label>
                            <select
                              className={`${inputCls} py-1 text-xs`}
                              value={seoForm.keywords[selectedKeywordIndex].priority || 'Medium'}
                              onChange={e => updateKeywordDetail(selectedKeywordIndex, 'priority', e.target.value)}
                            >
                              <option value="High">High</option>
                              <option value="Medium">Medium</option>
                              <option value="Low">Low</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold text-gray-500">Location Mapping</label>
                            <select
                              className={`${inputCls} py-1 text-xs`}
                              value={seoForm.keywords[selectedKeywordIndex].location_id || ''}
                              onChange={e => updateKeywordDetail(selectedKeywordIndex, 'location_id', e.target.value ? parseInt(e.target.value) : null)}
                            >
                              <option value="">-- None --</option>
                              {seoForm.targetLocations.map((loc, idx) => (
                                <option key={idx} value={loc.id || ''}>{loc.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold text-gray-500">Index Status</label>
                            <select
                              className={`${inputCls} py-1 text-xs`}
                              value={seoForm.keywords[selectedKeywordIndex].index_status || 'Index'}
                              onChange={e => updateKeywordDetail(selectedKeywordIndex, 'index_status', e.target.value)}
                            >
                              <option value="Index">Index</option>
                              <option value="Noindex">Noindex</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}

                    <hr className="border-gray-100" />

                    <div>
                      <label className={labelCls}>SEO Title</label>
                      <input className={inputCls} value={seoForm.seo_title}
                        onChange={e => setSeoForm(f => ({ ...f, seo_title: e.target.value }))} />
                    </div>

                    <div>
                      <label className={labelCls}>SEO Meta Description</label>
                      <textarea rows={3} className={inputCls} value={seoForm.seo_meta_description}
                        onChange={e => setSeoForm(f => ({ ...f, seo_meta_description: e.target.value }))} />
                    </div>

                    <div>
                      <label className={labelCls}>SEO H1</label>
                      <input className={inputCls} value={seoForm.seo_h1}
                        onChange={e => setSeoForm(f => ({ ...f, seo_h1: e.target.value }))} />
                    </div>

                    <div>
                      <label className={labelCls}>SEO Introduction / Content</label>
                      <textarea rows={4} className={inputCls} value={seoForm.seo_content}
                        onChange={e => setSeoForm(f => ({ ...f, seo_content: e.target.value }))} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelCls}>Index Status</label>
                        <select className={inputCls} value={seoForm.index_status}
                          onChange={e => setSeoForm(f => ({ ...f, index_status: e.target.value }))}>
                          <option value="Index">Index</option>
                          <option value="Noindex">Noindex</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>SEO Status</label>
                        <select className={inputCls} value={seoForm.seo_status}
                          onChange={e => setSeoForm(f => ({ ...f, seo_status: e.target.value }))}>
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className={labelCls}>Canonical URL</label>
                      <input className={inputCls} placeholder="Auto Generated (Leave empty)" value={seoForm.canonical_url}
                        onChange={e => setSeoForm(f => ({ ...f, canonical_url: e.target.value }))} />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleSaveSeo}
                      disabled={saveLoading}
                      className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition disabled:opacity-50 text-sm shadow-sm"
                    >
                      {saveLoading ? 'Saving...' : 'Save SEO Settings'}
                    </button>

                    <a
                      href={`/${firstLoc ? firstLoc + '/' : ''}${selectedCategory.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-3 bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-700 font-bold rounded-xl transition text-sm flex items-center justify-center"
                    >
                      Preview
                    </a>
                  </div>

                  <Alert m={seoMsg} />
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-8 text-center text-gray-400 h-96 flex flex-col justify-center items-center">
                <span className="text-4xl mb-2">🧭</span>
                <p className="font-semibold text-sm">No Category Selected</p>
                <p className="text-xs max-w-xs mt-1">Select a category from the table on the left to configure dynamic landing pages, primary keywords, intent, priority, and SEO meta values.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryRequests;
