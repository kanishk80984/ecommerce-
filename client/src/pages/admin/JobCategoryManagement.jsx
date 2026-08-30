import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, ShieldCheck, X } from 'lucide-react';
import api from '../../services/api';

const JobCategoryManagement = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentCategory, setCurrentCategory] = useState({ id: '', name: '', slug: '', status: 'ACTIVE' });
  const [deleteModal, setDeleteModal] = useState({ open: false, category: null });
  const [error, setError] = useState('');

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/admin/job-categories?search=${search}&status=${statusFilter}&page=${page}&limit=20`);
      if (res.data.success) {
        setCategories(res.data.data);
        setTotalPages(Math.ceil(res.data.total / 20));
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [search, statusFilter, page]);

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (currentCategory.id) {
        await api.put(`/admin/job-categories/${currentCategory.id}`, currentCategory);
      } else {
        await api.post('/admin/job-categories', currentCategory);
      }
      setIsModalOpen(false);
      fetchCategories();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save category');
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await api.patch(`/admin/job-categories/${id}/status`, { status: newStatus });
      fetchCategories();
    } catch (err) {
      console.error('Error toggling status', err);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/admin/job-categories/${deleteModal.category.id}`);
      setDeleteModal({ open: false, category: null });
      fetchCategories();
    } catch (err) {
      if (err.response?.data?.canDeactivate) {
        alert(err.response.data.message);
      } else {
        alert('Failed to delete category');
      }
      setDeleteModal({ open: false, category: null });
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Job Management</h1>
          <p className="text-gray-500 text-sm mt-1">Manage job categories used across the IBC Jobs Marketplace.</p>
        </div>
        <button
          onClick={() => {
            setCurrentCategory({ id: '', name: '', slug: '', status: 'ACTIVE' });
            setError('');
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-[#1e293b] hover:bg-gray-800 text-white px-4 py-2.5 rounded-lg transition-colors font-medium text-sm whitespace-nowrap"
        >
          <Plus size={18} /> Add Job Category
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50/50">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search job categories..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e293b]/20 focus:border-[#1e293b]"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-sm font-medium text-gray-700">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e293b]/20 focus:border-[#1e293b] flex-1 sm:flex-none"
            >
              <option value="All">All</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">ID</th>
                <th className="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Job Category</th>
                <th className="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Jobs Count</th>
                <th className="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Created Date</th>
                <th className="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-gray-500">Loading categories...</td>
                </tr>
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-gray-500">No job categories found.</td>
                </tr>
              ) : (
                categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 px-4 text-sm text-gray-600">#{cat.id}</td>
                    <td className="py-3 px-4">
                      <div className="text-sm font-semibold text-gray-900">{cat.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{cat.slug}</div>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleStatus(cat.id, cat.status)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
                          cat.status === 'ACTIVE'
                            ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                            : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${cat.status === 'ACTIVE' ? 'bg-green-600' : 'bg-gray-500'}`}></span>
                        {cat.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-sm font-medium text-gray-700">{cat.jobs_count || 0}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {new Date(cat.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setCurrentCategory({ id: cat.id, name: cat.name, slug: cat.slug, status: cat.status });
                            setError('');
                            setIsModalOpen(true);
                          }}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => setDeleteModal({ open: true, category: cat })}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-white">
            <span className="text-sm text-gray-500">
              Showing page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-4 lg:p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">
                {currentCategory.id ? 'Edit Job Category' : 'Add Job Category'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSaveCategory} className="p-4 lg:p-6 space-y-4">
              {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg font-medium">{error}</div>}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Job Category Name *</label>
                <input
                  type="text"
                  required
                  value={currentCategory.name}
                  onChange={(e) => setCurrentCategory({ ...currentCategory, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#1e293b]/20 focus:border-[#1e293b]"
                  placeholder="e.g. Software Developer"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slug (Optional)</label>
                <input
                  type="text"
                  value={currentCategory.slug}
                  onChange={(e) => setCurrentCategory({ ...currentCategory, slug: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#1e293b]/20 focus:border-[#1e293b]"
                  placeholder="e.g. software-developer"
                />
                <p className="text-xs text-gray-500 mt-1">Leave empty to auto-generate from name.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={currentCategory.status}
                  onChange={(e) => setCurrentCategory({ ...currentCategory, status: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#1e293b]/20 focus:border-[#1e293b]"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-100 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 text-white bg-[#1e293b] hover:bg-gray-800 rounded-lg font-medium transition-colors"
                >
                  {currentCategory.id ? 'Update Category' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="text-red-600" size={24} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 text-center mb-2">Delete Job Category?</h2>
            <p className="text-gray-500 text-center mb-6">
              Are you sure you want to delete <span className="font-semibold text-gray-900">"{deleteModal.category?.name}"</span>?
              This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModal({ open: false, category: null })}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobCategoryManagement;
