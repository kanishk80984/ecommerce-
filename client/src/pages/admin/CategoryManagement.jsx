import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Trash2, Pencil, X } from 'lucide-react';

const CategoryManagement = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Create Form
  const [form, setForm] = useState({ name: '', slug: '', parent_id: '', status: 'ACTIVE', margin_percentage: 0, gst_percentage: 0 });
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [createLoading, setCreateLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/categories');
      setCategories(res.data.categories);
    } catch (error) {
      console.error('Error fetching categories', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    setMsg({ type: '', text: '' });
    
    try {
      const payload = { ...form };
      if (!payload.parent_id) delete payload.parent_id;

      if (editingId) {
        await api.put(`/admin/categories/${editingId}`, payload);
        setMsg({ type: 'success', text: `Category "${form.name}" updated successfully!` });
      } else {
        await api.post('/admin/categories', payload);
        setMsg({ type: 'success', text: `Category "${form.name}" created successfully!` });
      }
      
      setForm({ name: '', slug: '', parent_id: '', status: 'ACTIVE', margin_percentage: 0, gst_percentage: 0 });
      setEditingId(null);
      setShowCreate(false);
      fetchCategories();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Operation failed.' });
    } finally {
      setCreateLoading(false);
    }
  };

  const handleEditClick = (cat) => {
    setForm({
      name: cat.name,
      slug: cat.slug,
      parent_id: cat.parent_id || '',
      status: cat.status,
      margin_percentage: cat.margin_percentage || 0,
      gst_percentage: cat.gst_percentage || 0
    });
    setEditingId(cat.id);
    setShowCreate(true);
    setMsg({ type: '', text: '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete category "${name}"? This action cannot be undone.`)) return;
    try {
      setLoading(true);
      await api.delete(`/admin/categories/${id}`);
      setMsg({ type: 'success', text: 'Category deleted successfully!' });
      fetchCategories();
    } catch (error) {
      console.error('Error deleting category', error);
      setMsg({ type: 'error', text: error.response?.data?.message || 'Failed to delete category.' });
      setLoading(false);
    }
  };

  // ── Shared UI helpers ────────────────────────────────────────────────────────
  const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white';
  const labelCls = 'block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide';
  const Alert = ({ m }) => m.text ? (
    <div className={`mt-3 px-4 py-2 rounded-lg text-sm font-medium ${m.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
      {m.type === 'success' ? '✅ ' : '❌ '}{m.text}
    </div>
  ) : null;

  return (
    <div className="space-y-8">
      {/* ── Create New Category (SUPER_ADMIN only) ───────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <button
          onClick={() => {
            if (editingId) {
              setEditingId(null);
              setForm({ name: '', slug: '', parent_id: '', status: 'ACTIVE', margin_percentage: 0, gst_percentage: 0 });
              setShowCreate(false);
            } else {
              setShowCreate(v => !v);
            }
          }}
          className="w-full px-6 py-4 border-b border-gray-100 flex items-center justify-between hover:bg-gray-50 transition"
        >
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center ${editingId ? 'bg-blue-100' : 'bg-emerald-100'}`}>
              {editingId ? <Pencil size={18} className="text-blue-600" /> : <span className="text-lg">➕</span>}
            </div>
            <div className="text-left">
              <h3 className="font-bold text-gray-800">{editingId ? 'Edit Category' : 'Create New Category'}</h3>
              <p className="text-xs text-gray-400">{editingId ? `Editing details for #${editingId}` : 'Add a new product category'}</p>
            </div>
          </div>
          <span className="text-gray-400 text-xl">{showCreate || editingId ? <X size={20} /> : '▼'}</span>
        </button>

        {(showCreate || editingId) && (
          <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Name <span className="text-red-400">*</span></label>
              <input className={inputCls} placeholder="e.g. Electronics" required value={form.name}
                onChange={e => {
                  const name = e.target.value;
                  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                  setForm(f => ({ ...f, name, slug }));
                }} />
            </div>
            <div>
              <label className={labelCls}>Slug <span className="text-red-400">*</span></label>
              <input className={inputCls} placeholder="e.g. electronics" required value={form.slug}
                onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>Parent Category (Optional)</label>
              <select className={inputCls} value={form.parent_id}
                onChange={e => setForm(f => ({ ...f, parent_id: e.target.value }))}>
                <option value="">-- None (Top Level) --</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select className={inputCls} value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Margin Percentage (%)</label>
              <input type="number" step="0.01" className={inputCls} value={form.margin_percentage}
                onChange={e => setForm(f => ({ ...f, margin_percentage: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>GST Percentage (%)</label>
              <input type="number" step="0.01" className={inputCls} value={form.gst_percentage}
                onChange={e => setForm(f => ({ ...f, gst_percentage: e.target.value }))} />
            </div>
            <div className="md:col-span-2 lg:col-span-3 flex gap-3">
              <button type="submit" disabled={createLoading}
                className={`px-6 py-2.5 text-white text-sm font-semibold rounded-lg transition disabled:opacity-60 ${editingId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                {createLoading ? 'Saving...' : (editingId ? 'Update Category' : 'Create Category')}
              </button>
              {editingId && (
                <button type="button" onClick={() => {
                  setEditingId(null);
                  setForm({ name: '', slug: '', parent_id: '', status: 'ACTIVE', margin_percentage: 0, gst_percentage: 0 });
                  setShowCreate(false);
                }} className="px-6 py-2.5 bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm font-semibold rounded-lg transition">
                  Cancel
                </button>
              )}
            </div>
            <div className="md:col-span-2 lg:col-span-3">
              <Alert m={msg} />
            </div>
          </form>
        )}
      </div>

      {/* ── Categories List ─────────────────────────────────────────────────────── */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">All Categories</h2>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-4 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 justify-between py-3 border-b border-gray-100 animate-pulse">
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-100 rounded w-1/3" />
                    <div className="h-3 bg-gray-100 rounded w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : categories.length === 0 ? (
            <div className="p-10 text-center text-gray-400">No categories found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500">
                    <th className="p-4 font-semibold">ID</th>
                    <th className="p-4 font-semibold">Name</th>
                    <th className="p-4 font-semibold">Slug</th>
                    <th className="p-4 font-semibold">Parent ID</th>
                    <th className="p-4 font-semibold">Status</th>
                    <th className="p-4 font-semibold text-right">Margin / GST</th>
                    <th  className="p-4 font-semibold  text-left" >Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map(cat => (
                    <tr key={cat.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="p-4 font-semibold text-gray-600">{cat.id}</td>
                      <td className="p-4 font-bold text-gray-800">{cat.name}</td>
                      <td className="p-4 text-gray-500 text-sm">{cat.slug}</td>
                      <td className="p-4 text-gray-500 text-sm">{cat.parent_id || '-'}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${cat.status === 'INACTIVE' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                          {cat.status}
                        </span>
                      </td>
                      <td className="p-4 text-right text-gray-600 text-sm">
                        {parseFloat(cat.margin_percentage || 0).toFixed(1)}% / {parseFloat(cat.gst_percentage || 0).toFixed(1)}%
                      </td>
                      <td className="p-4 text-left">
                        <div className="flex justify-start gap-2">
                          <button
                            onClick={() => handleEditClick(cat)}
                            className="text-blue-500 hover:text-blue-700 p-2 rounded hover:bg-blue-50 transition"
                            title="Edit Category"
                          >
                            <Pencil size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(cat.id, cat.name)}
                            className="text-red-500 hover:text-red-700 p-2 rounded hover:bg-red-50 transition"
                            title="Delete Category"
                          >
                            <Trash2 size={18} />
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
    </div>
  );
};

export default CategoryManagement;
