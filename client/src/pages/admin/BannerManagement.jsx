import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../services/api';
import { Trash2, Plus, Image as ImageIcon } from 'lucide-react';
import EnterpriseImageUploader from '../../components/EnterpriseImageUploader';
import { getImageUrl } from '../../utils/imageUrl';

const BannerManagement = () => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [bannerImages, setBannerImages] = useState([]);

  const { register, handleSubmit, reset } = useForm();

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/banners');
      setBanners(res.data.banners);
    } catch (error) {
      console.error('Error fetching banners', error);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data) => {
    if (bannerImages.length === 0) {
      alert('Please upload a banner image.');
      return;
    }

    setUploading(true);
    try {
      const imgPath = bannerImages[0]?.imageUrl || bannerImages[0]?.image_url || bannerImages[0]?.mainPath;

      const formData = new FormData();
      formData.append('title', data.title);
      formData.append('link_url', data.link_url);

      // If image is already uploaded via EnterpriseImageUploader (has server path), send the path
      if (imgPath && !imgPath.startsWith('data:') && !imgPath.startsWith('blob:')) {
        formData.append('image_path', imgPath);
      } else {
        // Fallback: convert to blob and upload
        const resp = await fetch(imgPath);
        const blob = await resp.blob();
        formData.append('banner', blob, 'banner.webp');
      }

      await api.post('/admin/banners', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      alert('Banner uploaded successfully!');
      reset();
      setBannerImages([]);
      fetchBanners();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to upload banner');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this banner?')) return;
    try {
      await api.delete(`/admin/banners/${id}`);
      fetchBanners();
    } catch (error) {
      alert('Error deleting banner');
    }
  };


  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
      <h2 className="text-xl font-bold text-gray-800 mb-6">Banner Management</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Upload Form */}
        <div className="lg:col-span-1 bg-gray-50 p-6 rounded border border-gray-200">
          <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Plus size={18} /> Upload New Banner
          </h3>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Banner Image *</label>
              <EnterpriseImageUploader
                images={bannerImages}
                onChange={setBannerImages}
                module="banners"
                single={true}
                aspectRatio="16:9"
                allowedRatios={['16:9', '4:5', 'free']}
                maxFileSizeMB={5}
                showAltText={false}
                showImageType={false}
                showSeoTitle={false}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title (Optional)</label>
              <input
                {...register('title')}
                type="text"
                className="w-full border border-gray-300 rounded p-2 focus:outline-none"
                placeholder="e.g. Summer Sale 2026"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Link URL (Optional)</label>
              <input
                {...register('link_url')}
                type="url"
                className="w-full border border-gray-300 rounded p-2 focus:outline-none"
                placeholder="https://example.com/sale"
              />
            </div>

            <button
              type="submit"
              disabled={uploading}
              className="w-full bg-primary text-white font-bold py-2 rounded mt-2 hover:bg-opacity-90 disabled:opacity-50 transition-opacity"
            >
              {uploading ? 'Uploading...' : 'Upload Banner'}
            </button>
          </form>
        </div>

        {/* Banners List */}
        <div className="lg:col-span-2">
          <h3 className="font-semibold text-gray-700 mb-4">Active Banners</h3>

          {loading ? (
            <div className="py-10 text-center text-gray-500">Loading banners...</div>
          ) : banners.length === 0 ? (
            <div className="py-10 text-center text-gray-500 bg-gray-50 rounded border border-dashed border-gray-300">
              No banners uploaded yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {banners.map(banner => (
                <div key={banner.id} className="border border-gray-200 rounded overflow-hidden shadow-sm bg-white">
                  <div className="h-32 bg-gray-100 flex items-center justify-center relative group">
                    <img
                      src={getImageUrl(banner.image_url)}
                      alt={banner.title || 'Banner'}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleDelete(banner.id)}
                        className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
                        title="Delete Banner"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="font-semibold text-sm text-gray-800 truncate">{banner.title || 'Untitled Banner'}</p>
                    <p className="text-xs text-blue-500 truncate mt-1">
                      {banner.link_url ? (
                        <a href={banner.link_url} target="_blank" rel="noreferrer" className="hover:underline">{banner.link_url}</a>
                      ) : 'No link attached'}
                    </p>
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

export default BannerManagement;
