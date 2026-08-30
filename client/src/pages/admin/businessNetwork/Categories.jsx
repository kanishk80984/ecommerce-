import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { toast } from 'react-hot-toast';
import { FolderPlus, Plus, Trash2, Edit2, ToggleLeft, ToggleRight, Check, X, Search } from 'lucide-react';

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newCatName, setNewCatName] = useState('');
  const [newSpecName, setNewSpecName] = useState('');
  const [selectedCatId, setSelectedCatId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Editing States
  const [editingCatId, setEditingCatId] = useState(null);
  const [editingCatName, setEditingCatName] = useState('');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await api.get('/business-network/categories');
      if (res.data.success) {
        setCategories(res.data.data);
        if (res.data.data.length > 0 && !selectedCatId) {
          setSelectedCatId(res.data.data[0].id);
        }
      }
    } catch (error) {
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      const res = await api.post('/business-network/categories', { name: newCatName });
      if (res.data.success) {
        toast.success('Category added successfully');
        setNewCatName('');
        fetchCategories();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error creating category');
    }
  };

  const handleAddSpecialty = async (e) => {
    e.preventDefault();
    if (!newSpecName.trim() || !selectedCatId) return;
    try {
      const res = await api.post('/business-network/specialties', {
        category_id: selectedCatId,
        name: newSpecName
      });
      if (res.data.success) {
        toast.success('Specialty added successfully');
        setNewSpecName('');
        fetchCategories();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error creating specialty');
    }
  };

  const handleToggleCategory = async (cat) => {
    try {
      const res = await api.put(`/business-network/categories/${cat.id}`, {
        is_active: cat.is_active ? 0 : 1
      });
      if (res.data.success) {
        toast.success('Status updated');
        fetchCategories();
      }
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleUpdateCategoryName = async (id) => {
    if (!editingCatName.trim()) return;
    try {
      const res = await api.put(`/business-network/categories/${id}`, { name: editingCatName });
      if (res.data.success) {
        toast.success('Category name updated');
        setEditingCatId(null);
        fetchCategories();
      }
    } catch (error) {
      toast.error('Failed to update name');
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Are you sure you want to delete this category? All nested specialties will be deleted.')) return;
    try {
      const res = await api.delete(`/business-network/categories/${id}`);
      if (res.data.success) {
        toast.success('Category deleted');
        if (selectedCatId === id) setSelectedCatId(null);
        fetchCategories();
      }
    } catch (error) {
      toast.error('Failed to delete category');
    }
  };

  const handleDeleteSpecialty = async (id) => {
    if (!window.confirm('Are you sure you want to delete this specialty?')) return;
    try {
      const res = await api.delete(`/business-network/specialties/${id}`);
      if (res.data.success) {
        toast.success('Specialty deleted');
        fetchCategories();
      }
    } catch (error) {
      toast.error('Failed to delete specialty');
    }
  };

  const selectedCategory = categories.find(c => c.id === selectedCatId);
  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Networking Categories & Specialties</h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure categories and nested unique business specialties for the IBC Business Network.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Categories Section */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col h-[600px]">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <FolderPlus size={20} className="text-primary" /> Categories
          </h2>

          {/* Add Category Form */}
          <form onSubmit={handleAddCategory} className="mb-4 flex gap-2">
            <input
              type="text"
              placeholder="New category name..."
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            <button
              type="submit"
              className="bg-primary hover:bg-opacity-95 text-white p-2 rounded-xl transition-all shadow-sm shrink-0 flex items-center justify-center w-10 h-10"
              title="Add Category"
            >
              <Plus size={20} />
            </button>
          </form>

          {/* Search bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none"
            />
          </div>

          {/* Category List */}
          <div className="flex-1 overflow-y-auto scrollbar-thin pr-1 space-y-2">
            {loading ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : filteredCategories.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-xs">No categories found</div>
            ) : (
              filteredCategories.map((cat) => (
                <div
                  key={cat.id}
                  onClick={() => setSelectedCatId(cat.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${
                    selectedCatId === cat.id
                      ? 'border-primary bg-blue-50/40'
                      : 'border-gray-150 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex-1 min-w-0 pr-2">
                    {editingCatId === cat.id ? (
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editingCatName}
                          onChange={(e) => setEditingCatName(e.target.value)}
                          className="px-2 py-1 text-xs border border-gray-300 rounded w-full"
                          autoFocus
                        />
                        <button
                          onClick={() => handleUpdateCategoryName(cat.id)}
                          className="p-1 bg-green-50 text-green-600 rounded"
                        >
                          <Check size={12} />
                        </button>
                        <button
                          onClick={() => setEditingCatId(null)}
                          className="p-1 bg-red-50 text-red-600 rounded"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold truncate ${cat.is_active ? 'text-gray-800' : 'text-gray-400 line-through'}`}>
                          {cat.name}
                        </span>
                        <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-bold">
                          {cat.specialties?.length || 0}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => {
                        setEditingCatId(cat.id);
                        setEditingCatName(cat.name);
                      }}
                      className="text-gray-500 hover:text-gray-700 p-1"
                      title="Edit Category Name"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => handleToggleCategory(cat)}
                      className={cat.is_active ? 'text-green-500' : 'text-gray-400'}
                      title={cat.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {cat.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="text-red-500 hover:text-red-700 p-1"
                      title="Delete Category"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Specialties Section */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col h-[600px]">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Plus size={20} className="text-secondary" /> Specialties
            </span>
            {selectedCategory && (
              <span className="text-xs text-gray-400 font-medium">
                Under category: <span className="text-primary font-semibold">{selectedCategory.name}</span>
              </span>
            )}
          </h2>

          {selectedCatId ? (
            <>
              {/* Add Specialty Form */}
              <form onSubmit={handleAddSpecialty} className="mb-4 flex gap-2">
                <input
                  type="text"
                  placeholder={`Add specialty to ${selectedCategory?.name}...`}
                  value={newSpecName}
                  onChange={(e) => setNewSpecName(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary"
                />
                <button
                  type="submit"
                  className="bg-secondary hover:bg-opacity-95 text-white px-4 rounded-xl font-bold text-sm transition-all shadow-sm flex items-center gap-1 shrink-0"
                >
                  <Plus size={16} /> Add Specialty
                </button>
              </form>

              {/* Specialties List */}
              <div className="flex-1 overflow-y-auto scrollbar-thin pr-1">
                {selectedCategory?.specialties?.length === 0 ? (
                  <div className="text-center py-20 text-gray-400 text-sm">
                    No specialties created under this category.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedCategory?.specialties?.map((spec) => (
                      <div
                        key={spec.id}
                        className="p-3.5 border border-gray-150 rounded-xl flex items-center justify-between hover:bg-gray-50 transition-all group"
                      >
                        <span className="text-sm font-semibold text-gray-700">{spec.name}</span>
                        <button
                          onClick={() => handleDeleteSpecialty(spec.id)}
                          className="text-red-500 hover:text-red-700 p-1.5 rounded-lg bg-red-50 hover:bg-red-100 transition-colors opacity-0 group-hover:opacity-100"
                          title="Delete Specialty"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 text-gray-400">
              <FolderPlus size={48} className="mb-2 stroke-1" />
              <p className="text-sm">Select a category on the left to manage specialties</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Categories;
