import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
  Layers, Plus, Trash2, Edit2, CheckCircle, AlertCircle, 
  Settings, ArrowUpDown, Eye, EyeOff, Save, X 
} from 'lucide-react';

const AttributeManagement = () => {
  const [categories, setCategories] = useState([]);
  const [selectedCatId, setSelectedCatId] = useState('');
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Status messages
  const [message, setMessage] = useState('');
  const [errMessage, setErrMessage] = useState('');

  // Group Form state
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [groupForm, setGroupForm] = useState({
    category_id: '',
    name: '',
    is_enabled: true,
    sort_order: 0,
    valuesText: ''
  });

  // Inline value addition state
  const [newValueMap, setNewValueMap] = useState({});

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedCatId) {
      fetchGroups(selectedCatId);
    } else {
      setGroups([]);
    }
  }, [selectedCatId]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/public/categories');
      setCategories(res.data.categories || []);
      if (res.data.categories?.length > 0) {
        setSelectedCatId(res.data.categories[0].id.toString());
      }
    } catch (e) {
      console.error(e);
      setErrMessage('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async (catId) => {
    try {
      const res = await api.get(`/admin/attributes/groups?categoryId=${catId}`);
      setGroups(res.data.attributeGroups || []);
    } catch (e) {
      console.error(e);
      setErrMessage('Failed to load attribute groups');
    }
  };

  const handleSubmitGroup = async (e) => {
    e.preventDefault();
    if (!groupForm.category_id || !groupForm.name) {
      setErrMessage('Category and Group Name are required.');
      return;
    }

    setActionLoading(true);
    setErrMessage('');
    setMessage('');

    try {
      const valuesArray = groupForm.valuesText
        ? groupForm.valuesText.split(',').map(v => v.trim()).filter(Boolean)
        : [];

      const payload = {
        category_id: groupForm.category_id,
        name: groupForm.name,
        is_enabled: groupForm.is_enabled,
        sort_order: parseInt(groupForm.sort_order) || 0,
        values: valuesArray
      };

      if (isEditing) {
        await api.put(`/admin/attributes/groups/${editId}`, payload);
        setMessage('Attribute group updated successfully.');
      } else {
        await api.post('/admin/attributes/groups', payload);
        setMessage('Attribute group created successfully.');
      }

      resetForm();
      fetchGroups(selectedCatId);
    } catch (err) {
      setErrMessage(err.response?.data?.message || 'Action failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditGroupClick = (group) => {
    setIsEditing(true);
    setEditId(group.id);
    setGroupForm({
      category_id: group.category_id,
      name: group.name,
      is_enabled: group.is_enabled === 1 || group.is_enabled === true,
      sort_order: group.sort_order,
      valuesText: group.values?.map(v => v.value).join(', ') || ''
    });
  };

  const handleDeleteGroup = async (groupId) => {
    if (!window.confirm('Delete this attribute group and all its values?')) return;
    setActionLoading(true);
    try {
      await api.delete(`/admin/attributes/groups/${groupId}`);
      setMessage('Attribute group deleted.');
      fetchGroups(selectedCatId);
    } catch (e) {
      setErrMessage('Delete failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (group) => {
    try {
      const updatedStatus = !group.is_enabled;
      await api.put(`/admin/attributes/groups/${group.id}`, {
        is_enabled: updatedStatus
      });
      fetchGroups(selectedCatId);
    } catch (e) {
      setErrMessage('Failed to update status');
    }
  };

  const handleAddValueInline = async (groupId) => {
    const val = newValueMap[groupId];
    if (!val || !val.trim()) return;

    try {
      await api.post('/admin/attributes/values', {
        group_id: groupId,
        value: val.trim()
      });
      setNewValueMap({ ...newValueMap, [groupId]: '' });
      fetchGroups(selectedCatId);
    } catch (e) {
      setErrMessage('Failed to add value');
    }
  };

  const handleDeleteValueInline = async (valId) => {
    try {
      await api.delete(`/admin/attributes/values/${valId}`);
      fetchGroups(selectedCatId);
    } catch (e) {
      setErrMessage('Failed to delete value');
    }
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditId(null);
    setGroupForm({
      category_id: selectedCatId,
      name: '',
      is_enabled: true,
      sort_order: 0,
      valuesText: ''
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
          <Layers size={24} className="text-blue-600" />
          Attribute Architecture Manager
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Configure category-specific Attribute Groups (e.g., Color, Storage, Size) and pre-define standard selectable values.
        </p>
      </div>

      {/* Messages */}
      {message && (
        <div className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-3 rounded-xl border border-green-200 text-sm font-semibold">
          <CheckCircle size={16} /> {message}
        </div>
      )}
      {errMessage && (
        <div className="flex items-center gap-2 bg-red-50 text-red-700 px-4 py-3 rounded-xl border border-red-200 text-sm font-semibold">
          <AlertCircle size={16} /> {errMessage}
        </div>
      )}

      {/* Filter and Setup Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Form config */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4 h-fit">
          <h2 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-2">
            {isEditing ? 'Modify Attribute Group' : 'Create Attribute Group'}
          </h2>
          <form onSubmit={handleSubmitGroup} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Category</label>
              <select
                value={groupForm.category_id}
                onChange={e => setGroupForm({ ...groupForm, category_id: e.target.value })}
                required
                className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-500 bg-white"
              >
                <option value="">Select Category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Group Name (e.g. Size, Storage)</label>
              <input
                type="text"
                value={groupForm.name}
                onChange={e => setGroupForm({ ...groupForm, name: e.target.value })}
                required
                placeholder="e.g. RAM, Screen Size"
                className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Sort Order / Reorder</label>
              <input
                type="number"
                value={groupForm.sort_order}
                onChange={e => setGroupForm({ ...groupForm, sort_order: e.target.value })}
                className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Initial Values (Comma-separated)</label>
              <textarea
                value={groupForm.valuesText}
                onChange={e => setGroupForm({ ...groupForm, valuesText: e.target.value })}
                placeholder="e.g. 128GB, 256GB, 512GB"
                rows={3}
                className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isEnabledCheck"
                checked={groupForm.is_enabled}
                onChange={e => setGroupForm({ ...groupForm, is_enabled: e.target.checked })}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="isEnabledCheck" className="text-xs font-bold text-gray-600 uppercase">Enabled</label>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={actionLoading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-xs uppercase tracking-wider disabled:opacity-50"
              >
                {isEditing ? 'Save Changes' : 'Create Group'}
              </button>
              {isEditing && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-4 py-3 rounded-xl text-xs uppercase"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Right Column: List of Attribute Groups */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Category Selector */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center justify-between gap-4">
            <span className="text-sm font-bold text-gray-700">Filter Category:</span>
            <select
              value={selectedCatId}
              onChange={e => {
                setSelectedCatId(e.target.value);
                setGroupForm(f => ({ ...f, category_id: e.target.value }));
              }}
              className="border border-gray-200 rounded-xl p-2.5 text-sm bg-white focus:outline-none max-w-xs"
            >
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* List of Attribute Cards */}
          {loading ? (
            <div className="text-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : groups.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-400">
              No attribute groups configured for this category yet.
            </div>
          ) : (
            <div className="space-y-4">
              {groups.map(group => (
                <div key={group.id} className={`bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4 transition-all ${!group.is_enabled ? 'opacity-60 bg-gray-50/50' : ''}`}>
                  
                  {/* Card Header */}
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 text-base">{group.name}</span>
                        <span className="text-[10px] bg-gray-100 text-gray-500 font-bold px-2 py-0.5 rounded">
                          Order: {group.sort_order}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleStatus(group)}
                        title={group.is_enabled ? 'Disable' : 'Enable'}
                        className={`p-1.5 rounded-lg border transition-all ${group.is_enabled ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100' : 'border-gray-200 bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                      >
                        {group.is_enabled ? <Eye size={14} /> : <EyeOff size={14} />}
                      </button>

                      <button
                        onClick={() => handleEditGroupClick(group)}
                        className="p-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                      >
                        <Edit2 size={14} />
                      </button>

                      <button
                        onClick={() => handleDeleteGroup(group.id)}
                        className="p-1.5 rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Attribute Values Tag list */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Values</label>
                    <div className="flex flex-wrap gap-1.5">
                      {group.values?.map(val => (
                        <span key={val.id} className="inline-flex items-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs px-2.5 py-1 rounded-lg transition-all">
                          {val.value}
                          <button
                            type="button"
                            onClick={() => handleDeleteValueInline(val.id)}
                            className="text-gray-400 hover:text-red-500 font-bold text-[10px]"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Add Inline Value */}
                  <div className="flex gap-2 items-center max-w-xs border-t border-gray-100 pt-3">
                    <input
                      type="text"
                      placeholder="Add value inline..."
                      value={newValueMap[group.id] || ''}
                      onChange={e => setNewValueMap({ ...newValueMap, [group.id]: e.target.value })}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleAddValueInline(group.id);
                      }}
                      className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none w-full"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddValueInline(group.id)}
                      className="bg-blue-600 text-white font-bold p-2 rounded-lg text-xs hover:bg-blue-700"
                    >
                      <Plus size={13} />
                    </button>
                  </div>

                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default AttributeManagement;
