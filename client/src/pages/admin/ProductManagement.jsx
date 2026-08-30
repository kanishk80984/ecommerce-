import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../services/api';
import { Edit, Trash2, Plus, Image as ImageIcon } from 'lucide-react';
import EnterpriseImageUploader from '../../components/EnterpriseImageUploader';
import { getImageUrl } from '../../utils/imageUrl';

const AdminProductManagement = () => {
  const [activeTab, setActiveTab] = useState('LIST'); // 'LIST', 'UPLOAD', 'EDIT'
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [productImages, setProductImages] = useState([]);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm();

  useEffect(() => {
    if (activeTab === 'LIST') {
      fetchProducts();
    }
  }, [activeTab]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/products');
      setProducts(res.data.products);
    } catch (error) {
      console.error('Error fetching products', error);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', data.name);
      formData.append('price', data.price);
      formData.append('mrp', data.mrp);
      formData.append('stock', data.stock);
      formData.append('short_description', data.short_description);

      // Handle the image file if selected via EnterpriseImageUploader
      if (productImages.length > 0) {
        const imgPath = productImages[0].imageUrl || productImages[0].image_url || productImages[0].mainPath;
        if (imgPath && !imgPath.startsWith('data:') && !imgPath.startsWith('blob:')) {
          formData.append('image_path', imgPath);
        } else if (imgPath) {
          const resp = await fetch(imgPath);
          const blob = await resp.blob();
          formData.append('image', blob, 'product.webp');
        }
      } else if (activeTab === 'UPLOAD') {
        alert('Please upload a product image.');
        setLoading(false);
        return;
      }

      const headers = { 'Content-Type': 'multipart/form-data' };

      if (activeTab === 'EDIT') {
        await api.put(`/admin/products/${editingId}`, formData, { headers });
        alert('Product updated successfully!');
      } else {
        await api.post('/admin/products', formData, { headers });
        alert('Product published successfully!');
      }
      reset();
      setProductImages([]);
      setActiveTab('LIST');
    } catch (error) {
      alert(error.response?.data?.message || 'Action failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await api.delete(`/admin/products/${id}`);
      fetchProducts();
    } catch (error) {
      alert('Error deleting product');
    }
  };

  const handleEdit = (product) => {
    setEditingId(product.id);
    setValue('name', product.name);
    setValue('price', product.price);
    setValue('mrp', product.mrp);
    setValue('stock', product.stock);
    setValue('short_description', product.short_description);

    if (product.thumbnail) {
      setProductImages([{ imageUrl: product.thumbnail }]);
    } else {
      setProductImages([]);
    }

    setActiveTab('EDIT');
  };


  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">Product Management</h2>
        {activeTab === 'LIST' ? (
          <button
            onClick={() => { reset(); setProductImages([]); setActiveTab('UPLOAD'); }}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-sm text-sm font-semibold hover:bg-opacity-90"
          >
            <Plus size={16} /> Add New Product
          </button>
        ) : (
          <button
            onClick={() => setActiveTab('LIST')}
            className="text-gray-500 hover:text-gray-800 text-sm font-semibold"
          >
            â† Back to List
          </button>
        )}
      </div>

      {activeTab === 'LIST' && (
        <div>
          {loading ? (
            <div className="py-10 text-center text-gray-500">Loading products...</div>
          ) : products.length === 0 ? (
            <div className="py-10 text-center text-gray-500">No products uploaded yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 text-sm border-b">
                    <th className="p-3">Image</th>
                    <th className="p-3">Product Name</th>
                    <th className="p-3">Price</th>
                    <th className="p-3">Stock</th>
                    <th className="p-3">Status</th>
                    <th  className="p-3  text-left" >Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(p => (
                    <tr key={p.id} className="border-b hover:bg-gray-50 transition-colors">
                      <td className="p-3">
                        {p.thumbnail ? (
                          <img src={getImageUrl(p.thumbnail)} alt={p.name} className="w-12 h-12 object-cover rounded border" />
                        ) : (
                          <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center text-gray-400">
                            <ImageIcon size={20} />
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-gray-800">{p.name}</div>
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-[var(--color-primary)]">â‚¹{p.price}</div>
                        <div className="text-xs text-gray-500 line-through">â‚¹{p.mrp}</div>
                      </td>
                      <td className="p-3">{p.stock}</td>
                      <td className="p-3">
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded font-bold">
                          {p.status}
                        </span>
                      </td>
                      <td className="p-3 text-left">
                        <div className="flex justify-start gap-3">
                          <button onClick={() => handleEdit(p)} className="text-blue-600 hover:text-blue-800">
                            <Edit size={18} />
                          </button>
                          <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:text-red-700">
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
      )}

      {(activeTab === 'UPLOAD' || activeTab === 'EDIT') && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-3xl">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
            <input {...register('name', { required: true })} className="w-full border border-gray-300 rounded p-2 focus:outline-none" placeholder="e.g. iPhone 15" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price (Selling Price) *</label>
              <input {...register('price', { required: true })} type="number" className="w-full border border-gray-300 rounded p-2 focus:outline-none" placeholder="65001" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">MRP (Original Price) *</label>
              <input {...register('mrp', { required: true })} type="number" className="w-full border border-gray-300 rounded p-2 focus:outline-none" placeholder="79900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stock Quantity *</label>
              <input {...register('stock', { required: true })} type="number" className="w-full border border-gray-300 rounded p-2 focus:outline-none" placeholder="50" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Product Image {activeTab === 'UPLOAD' && '*'}</label>
            <EnterpriseImageUploader
              images={productImages}
              onChange={setProductImages}
              module="products"
              single={true}
              aspectRatio="1:1"
              allowedRatios={['1:1', '4:5', 'free']}
              maxFileSizeMB={5}
              showAltText={true}
              showImageType={false}
              showSeoTitle={false}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Short Description</label>
            <textarea {...register('short_description')} rows="3" className="w-full border border-gray-300 rounded p-2 focus:outline-none"></textarea>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-[var(--color-secondary)] text-gray-900 font-bold py-3 rounded mt-6 hover:opacity-90 disabled:opacity-50 transition-opacity">
            {loading ? 'Processing...' : activeTab === 'EDIT' ? 'Update Product' : 'Publish Product'}
          </button>
        </form>
      )}
    </div>
  );
};

export default AdminProductManagement;
