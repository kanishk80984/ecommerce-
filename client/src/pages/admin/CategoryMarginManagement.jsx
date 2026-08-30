import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Percent, Save, CheckCircle, AlertCircle, Search, Edit2 } from 'lucide-react';

const CategoryMarginManagement = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ margin_percentage: '', margin_description: '', gst_percentage: '', youtube_video_link: '' });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/categories/margins');
      setCategories(res.data.categories || []);
    } catch (err) {
      setError('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (cat) => {
    setEditingId(cat.id);
    setEditForm({
      margin_percentage: cat.margin_percentage || '0',
      margin_description: cat.margin_description || '',
      gst_percentage: cat.gst_percentage || '0',
      youtube_video_link: cat.youtube_video_link || ''
    });
    setSuccess('');
    setError('');
  };

  const handleSave = async (catId) => {
    try {
      setSaving(catId);
      setError('');
      await api.put(`/admin/categories/${catId}/margin`, {
        margin_percentage: parseFloat(editForm.margin_percentage) || 0,
        margin_description: editForm.margin_description,
        gst_percentage: parseFloat(editForm.gst_percentage) || 0,
        youtube_video_link: editForm.youtube_video_link
      });
      setSuccess(`Margin, GST & YouTube video updated successfully for category`);
      setEditingId(null);
      fetchCategories();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update category settings');
    } finally {
      setSaving(null);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({ margin_percentage: '', margin_description: '', gst_percentage: '', youtube_video_link: '' });
  };

  const filtered = categories.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
            <Percent size={24} className="text-blue-600" />
            Category Margin & GST Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Set platform margin percentage, description, and GST rate for each category. GST is automatically calculated on product variants when prices are entered.
          </p>
        </div>
      </div>

      {/* Alerts */}
      {success && (
        <div className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-3 rounded-xl border border-green-200 text-sm font-semibold">
          <CheckCircle size={16} /> {success}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 text-red-700 px-4 py-3 rounded-xl border border-red-200 text-sm font-semibold">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search categories..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-blue-500 bg-white font-semibold"
        />
      </div>

      {/* Categories Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-6 py-3.5 font-bold text-gray-500 uppercase text-xs tracking-wider">Category</th>
                <th className="text-left px-6 py-3.5 font-bold text-gray-500 uppercase text-xs tracking-wider">Margin %</th>
                <th className="text-left px-6 py-3.5 font-bold text-gray-500 uppercase text-xs tracking-wider">GST %</th>
                <th className="text-left px-6 py-3.5 font-bold text-gray-500 uppercase text-xs tracking-wider">Description</th>
                <th className="text-left px-6 py-3.5 font-bold text-gray-500 uppercase text-xs tracking-wider">YouTube Video</th>
                <th className="text-left px-6 py-3.5 font-bold text-gray-500 uppercase text-xs tracking-wider">Price & GST Preview</th>
                <th className="text-left px-6 py-3.5 font-bold text-gray-500 uppercase text-xs tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(cat => {
                const isEditing = editingId === cat.id;
                const margin = isEditing ? parseFloat(editForm.margin_percentage) || 0 : parseFloat(cat.margin_percentage) || 0;
                const gstRate = isEditing ? parseFloat(editForm.gst_percentage) || 0 : parseFloat(cat.gst_percentage) || 0;
                
                const sampleVendorPrice = 1000;
                const priceWithMargin = sampleVendorPrice * (1 + margin / 100);
                const gstAmount = priceWithMargin * (gstRate / 100);
                const sampleFinalCustomer = Math.round(priceWithMargin + gstAmount);

                return (
                  <tr key={cat.id} className={`transition-colors ${isEditing ? 'bg-blue-50/40' : 'hover:bg-gray-50'}`}>
                    <td className="px-6 py-4">
                      <span className="font-bold text-gray-900">{cat.name}</span>
                    </td>

                    {/* Margin % */}
                    <td className="px-6 py-4">
                      {isEditing ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={editForm.margin_percentage}
                            onChange={(e) => setEditForm({ ...editForm, margin_percentage: e.target.value })}
                            className="w-20 border border-blue-300 rounded-lg p-2 text-xs font-bold bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="text-gray-500 font-bold text-xs">%</span>
                        </div>
                      ) : (
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold ${margin > 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                          <Percent size={11} />
                          {margin}%
                        </span>
                      )}
                    </td>

                    {/* GST % */}
                    <td className="px-6 py-4">
                      {isEditing ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="50"
                            value={editForm.gst_percentage}
                            onChange={(e) => setEditForm({ ...editForm, gst_percentage: e.target.value })}
                            placeholder="e.g. 18"
                            className="w-20 border border-blue-300 rounded-lg p-2 text-xs font-bold bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="text-gray-500 font-bold text-xs">%</span>
                        </div>
                      ) : (
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold ${gstRate > 0 ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-gray-100 text-gray-500'}`}>
                          GST {gstRate}%
                        </span>
                      )}
                    </td>

                    {/* Description */}
                    <td className="px-6 py-4">
                      {isEditing ? (
                        <textarea
                          value={editForm.margin_description}
                          onChange={(e) => setEditForm({ ...editForm, margin_description: e.target.value })}
                          placeholder="e.g. Platform margin and applicable GST..."
                          rows={2}
                          className="w-full border border-blue-300 rounded-lg p-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-medium"
                        />
                      ) : (
                        <span className="text-gray-500 text-xs">
                          {cat.margin_description || '—'}
                        </span>
                      )}
                    </td>

                    {/* YouTube Video Link */}
                    <td className="px-6 py-4">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.youtube_video_link}
                          onChange={(e) => setEditForm({ ...editForm, youtube_video_link: e.target.value })}
                          placeholder="e.g. https://www.youtube.com/watch?v=..."
                          className="w-full border border-blue-300 rounded-lg p-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                        />
                      ) : (
                        cat.youtube_video_link ? (
                          <a
                            href={cat.youtube_video_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline font-bold text-xs truncate max-w-[150px] block"
                          >
                            View Link
                          </a>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )
                      )}
                    </td>

                    {/* Price & GST Calculation Preview */}
                    <td className="px-6 py-4">
                      <div className="text-xs space-y-0.5 font-medium">
                        <div>Base Price: <span className="font-bold text-gray-700">₹{sampleVendorPrice}</span></div>
                        {margin > 0 && <div className="text-blue-600 font-bold">+ {margin}% Margin: ₹{Math.round(priceWithMargin)}</div>}
                        {gstRate > 0 && <div className="text-amber-600 font-bold">+ GST ({gstRate}%): ₹{Math.round(gstAmount)}</div>}
                        <div className="text-gray-900 font-extrabold pt-0.5 border-t border-gray-100">
                          Total: <span className="text-emerald-600">₹{sampleFinalCustomer}</span>
                        </div>
                      </div>
                    </td>
                    <td className="text-left px-6 py-4">
                      {isEditing ? (
                        <div className="flex items-center justify-start gap-2">
                          <button
                            onClick={() => handleSave(cat.id)}
                            disabled={saving === cat.id}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 disabled:opacity-50"
                          >
                            {saving === cat.id ? (
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                            ) : (
                              <Save size={12} />
                            )}
                            Save
                          </button>
                          <button
                            onClick={handleCancel}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold px-3 py-1.5 rounded-lg text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleEdit(cat)}
                          className="text-blue-600 hover:text-blue-800 font-bold text-xs flex items-center gap-1 mx-auto"
                        >
                          <Edit2 size={12} /> Edit
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-sm font-semibold">No categories found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryMarginManagement;
