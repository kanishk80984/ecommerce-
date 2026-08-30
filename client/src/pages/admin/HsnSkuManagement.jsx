import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
  FileText, Plus, Trash2, Edit2, Settings, Layers, 
  RefreshCw, CheckCircle, AlertCircle, Eye, Tag
} from 'lucide-react';

const HsnSkuManagement = () => {
  const [hsnCodes, setHsnCodes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [skuSettings, setSkuSettings] = useState([]);
  
  // Form states
  const [newHsn, setNewHsn] = useState({ code: '', description: '' });
  const [editingHsnId, setEditingHsnId] = useState(null);
  
  // Mapping states
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedHsnId, setSelectedHsnId] = useState('');
  const [selectedGstRate, setSelectedGstRate] = useState('18');

  // SKU configurations
  const [skuPrefix, setSkuPrefix] = useState('FSH');
  const [skuLen, setSkuLen] = useState(6);
  const [skuPreview, setSkuPreview] = useState('');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [errMessage, setErrMessage] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const hsnRes = await api.get('/hsn/codes');
      setHsnCodes(hsnRes.data.hsnCodes || []);

      const catRes = await api.get('/public/categories');
      setCategories(catRes.data.categories || []);

      const skuRes = await api.get('/admin/sku/settings/list');
      setSkuSettings(skuRes.data.settings || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddOrEditHsn = async (e) => {
    e.preventDefault();
    if (![4, 6, 8].includes(newHsn.code.length)) {
      setErrMessage('HSN Code must be exactly 4, 6, or 8 digits.');
      return;
    }
    setErrMessage('');
    setMessage('');
    
    try {
      if (editingHsnId) {
        await api.put(`/admin/hsn/edit/${editingHsnId}`, newHsn);
        setMessage('HSN Code updated successfully!');
      } else {
        await api.post('/admin/hsn/add', newHsn);
        setMessage('HSN Code added successfully!');
      }
      setNewHsn({ code: '', description: '' });
      setEditingHsnId(null);
      fetchData();
    } catch (err) {
      setErrMessage(err.response?.data?.message || 'Action failed.');
    }
  };

  const handleDeleteHsn = async (id) => {
    if (!window.confirm('Delete this HSN Code?')) return;
    try {
      await api.delete(`/admin/hsn/delete/${id}`);
      fetchData();
    } catch (err) {
      alert('Delete failed');
    }
  };

  const handleSaveMapping = async (e) => {
    e.preventDefault();
    if (!selectedCategoryId || !selectedHsnId) return;
    setMessage('');
    setErrMessage('');
    try {
      await api.post('/admin/hsn/mapping', {
        categoryId: selectedCategoryId,
        hsnCodeId: selectedHsnId,
        gstRate: parseFloat(selectedGstRate)
      });
      setMessage('Category HSN code mapping and GST rate saved successfully!');
      fetchData();
    } catch (err) {
      setErrMessage('Mapping failed');
    }
  };

  const handleSaveSkuSettings = async (e) => {
    e.preventDefault();
    setMessage('');
    setErrMessage('');
    try {
      await api.post('/admin/sku/settings', {
        prefix: skuPrefix,
        numberLength: skuLen
      });
      setMessage('SKU Prefix configurations saved successfully!');
      fetchData();
    } catch (err) {
      setErrMessage('SKU Config save failed');
    }
  };

  const triggerSkuPreview = () => {
    const val = Math.floor(Math.random() * 100) + 1;
    const formatted = `${skuPrefix.toUpperCase()}-GEN-${String(val).padStart(skuLen, '0')}`;
    setSkuPreview(formatted);
  };

  return (
    <div className="p-6 md:p-8 space-y-8 bg-gray-50/50 min-h-screen text-gray-700">
      
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
          <Settings size={26} className="text-blue-600" />
          HSN & Seller SKU Configurations
        </h1>
        <p className="text-xs text-gray-500 mt-1">Manage global tax HSN mappings and concurrent seller SKU sequence parameters.</p>
      </div>

      {/* Messages */}
      {message && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl text-xs flex items-center gap-1.5">
          <CheckCircle size={16} />
          {message}
        </div>
      )}

      {errMessage && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-1.5">
          <AlertCircle size={16} />
          {errMessage}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Col 1: HSN Code Editor */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-gray-900 border-b border-gray-150 pb-3 flex items-center gap-1.5 uppercase">
            <Plus size={16} className="text-blue-500" />
            {editingHsnId ? 'Edit HSN Code' : 'Add HSN Code'}
          </h2>
          
          <form onSubmit={handleAddOrEditHsn} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">HSN Code Number (4, 6 or 8 digits)</label>
              <input 
                type="text" 
                maxLength={8}
                required
                value={newHsn.code}
                onChange={(e) => setNewHsn(prev => ({ ...prev, code: e.target.value.replace(/\D/g, '') }))}
                placeholder="e.g. 6109"
                className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">Description / Goods Category</label>
              <textarea 
                rows={3}
                value={newHsn.description}
                onChange={(e) => setNewHsn(prev => ({ ...prev, description: e.target.value }))}
                placeholder="e.g. Knitted t-shirts, polo shirts..."
                className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            <button 
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-xs uppercase tracking-wider shadow-sm"
            >
              {editingHsnId ? 'Update HSN Code' : 'Create HSN Code'}
            </button>
            
            {editingHsnId && (
              <button 
                type="button"
                onClick={() => { setEditingHsnId(null); setNewHsn({ code: '', description: '' }); }}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2 rounded-xl text-xs uppercase"
              >
                Cancel Edit
              </button>
            )}
          </form>
        </div>

        {/* Col 2: HSN Mappings */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-gray-900 border-b border-gray-150 pb-3 flex items-center gap-1.5 uppercase">
            <Layers size={16} className="text-blue-500" />
            Map HSN to Categories
          </h2>

          <form onSubmit={handleSaveMapping} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">Select Category</label>
              <select 
                value={selectedCategoryId} 
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none"
              >
                <option value="">Choose Category</option>
                {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">Select HSN Code</label>
              <select 
                value={selectedHsnId} 
                onChange={(e) => setSelectedHsnId(e.target.value)}
                className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none"
              >
                <option value="">Choose HSN Code</option>
                {hsnCodes.map(h => <option key={h.id} value={h.id}>{h.code} - {h.description?.slice(0, 30)}...</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">Select GST Rate (%)</label>
              <select 
                value={selectedGstRate} 
                onChange={(e) => setSelectedGstRate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none"
              >
                <option value="5">5%</option>
                <option value="12">12%</option>
                <option value="18">18%</option>
                <option value="28">28%</option>
              </select>
            </div>

            <button 
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-xs uppercase tracking-wider shadow-sm"
            >
              Save HSN Mapping
            </button>
          </form>
        </div>

        {/* Col 3: SKU prefix configs */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-gray-900 border-b border-gray-150 pb-3 flex items-center gap-1.5 uppercase">
            <Settings size={16} className="text-blue-500" />
            Configure SKU Prefixes
          </h2>

          <form onSubmit={handleSaveSkuSettings} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">SKU Prefix</label>
                <input 
                  type="text" 
                  value={skuPrefix}
                  maxLength={5}
                  onChange={(e) => setSkuPrefix(e.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase())}
                  placeholder="FSH"
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">Sequence Length</label>
                <select 
                  value={skuLen} 
                  onChange={(e) => setSkuLen(Number(e.target.value))}
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none"
                >
                  <option value={4}>4 digits</option>
                  <option value={6}>6 digits</option>
                  <option value={8}>8 digits</option>
                </select>
              </div>
            </div>

            <button 
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-xs uppercase tracking-wider shadow-sm"
            >
              Save Prefix Config
            </button>

            <div className="pt-2 border-t border-gray-100 flex flex-col gap-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Interactive SKU Generator Preview</span>
              <div className="flex gap-2">
                <span className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-mono font-bold text-gray-600 flex items-center justify-center">
                  {skuPreview || 'Click Preview'}
                </span>
                <button 
                  type="button"
                  onClick={triggerSkuPreview}
                  className="bg-gray-100 hover:bg-gray-250 p-2 rounded-xl text-gray-600"
                  title="Generate Preview"
                >
                  <Eye size={16} />
                </button>
              </div>
            </div>
          </form>
        </div>

      </div>

      {/* HSN Codes list table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-150 bg-gray-50/50 flex justify-between items-center">
          <h2 className="font-bold text-gray-800 text-sm flex items-center gap-1.5">
            <FileText size={18} className="text-gray-400" />
            Configured HSN Codes
          </h2>
        </div>

        {loading ? (
          <div className="py-12 text-center text-gray-400">Loading configurations...</div>
        ) : hsnCodes.length === 0 ? (
          <div className="py-12 text-center text-gray-400">No HSN codes configured yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-150 text-gray-700 text-xs font-bold uppercase tracking-wider">
                  <th className="py-3 px-6">HSN Code</th>
                  <th className="py-3 px-6">Description</th>
                  <th  className="py-3 px-6  text-left" >Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150 text-gray-600 text-sm">
                {hsnCodes.map(h => (
                  <tr key={h.id} className="hover:bg-gray-50/50 transition-all">
                    <td className="py-3 px-6 font-mono font-bold text-blue-600">{h.code}</td>
                    <td className="py-3 px-6">{h.description || 'N/A'}</td>
                    <td className="py-3 px-6 text-left">
                      <div className="flex justify-start gap-2">
                        <button 
                          onClick={() => { setEditingHsnId(h.id); setNewHsn({ code: h.code, description: h.description || '' }); }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                          title="Edit"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={() => handleDeleteHsn(h.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};

export default HsnSkuManagement;
