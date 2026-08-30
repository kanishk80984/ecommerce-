import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../services/api';
import { Trash2, Plus, Image as ImageIcon } from 'lucide-react';
import EnterpriseImageUploader from '../../components/EnterpriseImageUploader';
import { getImageUrl } from '../../utils/imageUrl';

const AdvertisementManagement = () => {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [desktopImages, setDesktopImages] = useState([]);
  const [mobileImages, setMobileImages] = useState([]);

  const { register, handleSubmit, reset, watch } = useForm();
  const selectedPosition = watch('position', 'HERO_SLIDER');

  const getDesktopUploaderSettings = (pos) => {
    switch (pos) {
      case 'HERO_SLIDER':
        return { aspectRatio: '1216:420', allowedRatios: ['1216:420'] };
      case 'COUPON':
      case 'BOTTOM':
        return { aspectRatio: '1216:128', allowedRatios: ['1216:128'] };
      case 'GRID_LARGE':
        return { aspectRatio: '910:320', allowedRatios: ['910:320'] };
      case 'GRID_HORIZONTAL':
        return { aspectRatio: '1216:160', allowedRatios: ['1216:160'] };
      case 'BETWEEN_SECTIONS':
        return { aspectRatio: '1248:192', allowedRatios: ['1248:192'] };
      default:
        return { aspectRatio: '16:9', allowedRatios: ['16:9'] };
    }
  };

  const getMobileUploaderSettings = (pos) => {
    switch (pos) {
      case 'HERO_SLIDER':
        return { aspectRatio: '336:180', allowedRatios: ['336:180'] };
      case 'COUPON':
      case 'BOTTOM':
        return { aspectRatio: '338:90', allowedRatios: ['338:90'] };
      case 'GRID_LARGE':
        return { aspectRatio: '282:160', allowedRatios: ['282:160'] };
      case 'GRID_HORIZONTAL':
        return { aspectRatio: '336:96', allowedRatios: ['336:96'] };
      case 'BETWEEN_SECTIONS':
        return { aspectRatio: '374:192', allowedRatios: ['374:192'] };
      default:
        return { aspectRatio: '16:9', allowedRatios: ['16:9'] };
    }
  };

  const desktopSettings = getDesktopUploaderSettings(selectedPosition);
  const mobileSettings = getMobileUploaderSettings(selectedPosition);

  useEffect(() => {
    fetchAds();
  }, []);

  const fetchAds = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/advertisements');
      setAds(res.data.advertisements || []);
    } catch (error) {
      console.error('Error fetching advertisements', error);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data) => {
    if (desktopImages.length === 0) {
      alert('Please upload a desktop image.');
      return;
    }

    setUploading(true);
    try {
      const desktopPath = desktopImages[0]?.imageUrl || desktopImages[0]?.image_url || desktopImages[0]?.mainPath;
      const mobilePath = mobileImages[0]?.imageUrl || mobileImages[0]?.image_url || mobileImages[0]?.mainPath;

      const formData = new FormData();
      formData.append('title', data.title);
      formData.append('description', data.description || '');
      formData.append('redirect_url', data.redirect_url || '');
      formData.append('button_text', data.button_text || '');
      formData.append('position', data.position);
      formData.append('priority', data.priority || 0);

      if (desktopPath && !desktopPath.startsWith('data:') && !desktopPath.startsWith('blob:')) {
        formData.append('image_path', desktopPath);
      } else if (desktopPath) {
        const resp = await fetch(desktopPath);
        const blob = await resp.blob();
        formData.append('image', blob, 'desktop.webp');
      }

      if (mobilePath && !mobilePath.startsWith('data:') && !mobilePath.startsWith('blob:')) {
        formData.append('mobile_image_path', mobilePath);
      } else if (mobilePath) {
        const resp = await fetch(mobilePath);
        const blob = await resp.blob();
        formData.append('mobile_image', blob, 'mobile.webp');
      }

      await api.post('/admin/advertisements', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      alert('Advertisement created successfully!');
      reset();
      setDesktopImages([]);
      setMobileImages([]);
      fetchAds();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to create advertisement');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this advertisement?')) return;
    try {
      await api.delete(`/admin/advertisements/${id}`);
      fetchAds();
    } catch (error) {
      alert('Error deleting advertisement');
    }
  };


  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
      <h2 className="text-xl font-bold text-gray-800 mb-6">Advertisement Management</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Upload Form */}
        <div className="lg:col-span-1 bg-gray-50 p-6 rounded border border-gray-200">
          <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Plus size={18} /> Create Advertisement
          </h3>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input
                {...register('title', { required: true })}
                type="text"
                className="w-full border border-gray-300 rounded p-2 focus:outline-none"
                placeholder="e.g. Mega Electronics Sale"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Position *</label>
              <select {...register('position', { required: true })} className="w-full border border-gray-300 rounded p-2 focus:outline-none bg-white">
                <option value="HERO_SLIDER">Hero Slider (Top)</option>
                <option value="COUPON">Coupon Banner</option>
                <option value="GRID_LARGE">Grid - Large Card</option>
                <option value="GRID_HORIZONTAL">Grid - Horizontal Card</option>
                <option value="BETWEEN_SECTIONS">Between Product Sections</option>
                <option value="BOTTOM">Bottom Banner</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Desktop Image *</label>
              <EnterpriseImageUploader
                key={selectedPosition}
                images={desktopImages}
                onChange={setDesktopImages}
                module="advertisements"
                single={true}
                aspectRatio={desktopSettings.aspectRatio}
                allowedRatios={desktopSettings.allowedRatios}
                maxFileSizeMB={5}
                showAltText={false}
                showImageType={false}
                showSeoTitle={false}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mobile Image (Optional)</label>
              <EnterpriseImageUploader
                key={`mobile-${selectedPosition}`}
                images={mobileImages}
                onChange={setMobileImages}
                module="advertisements"
                single={true}
                aspectRatio={mobileSettings.aspectRatio}
                allowedRatios={mobileSettings.allowedRatios}
                maxFileSizeMB={5}
                showAltText={false}
                showImageType={false}
                showSeoTitle={false}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Link URL (Optional)</label>
              <input
                {...register('redirect_url')}
                type="url"
                className="w-full border border-gray-300 rounded p-2 focus:outline-none"
                placeholder="https://example.com/sale"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority (0-100)</label>
                <input
                  {...register('priority')}
                  type="number"
                  defaultValue={0}
                  className="w-full border border-gray-300 rounded p-2 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Button Text</label>
                <input
                  {...register('button_text')}
                  type="text"
                  placeholder="Shop Now"
                  className="w-full border border-gray-300 rounded p-2 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={uploading}
              className="w-full bg-primary text-white font-bold py-2 rounded mt-2 hover:bg-opacity-90 disabled:opacity-50 transition-opacity"
            >
              {uploading ? 'Uploading...' : 'Create Advertisement'}
            </button>
          </form>
        </div>

        {/* Ads List */}
        <div className="lg:col-span-2">
          <h3 className="font-semibold text-gray-700 mb-4">Active Advertisements</h3>

          {loading ? (
            <div className="py-10 text-center text-gray-500">Loading advertisements...</div>
          ) : ads.length === 0 ? (
            <div className="py-10 text-center text-gray-500 bg-gray-50 rounded border border-dashed border-gray-300">
              No advertisements created yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ads.map(ad => (
                <div key={ad.id} className="border border-gray-200 rounded overflow-hidden shadow-sm bg-white">
                  <div className="h-40 bg-gray-100 flex items-center justify-center relative group">
                    <img
                      src={getImageUrl(ad.image)}
                      alt={ad.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleDelete(ad.id)}
                        className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
                        title="Delete Advertisement"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="flex justify-between items-start">
                      <p className="font-semibold text-sm text-gray-800 line-clamp-1">{ad.title}</p>
                      <span className="bg-blue-100 text-blue-800 text-[10px] px-2 py-0.5 rounded font-bold">{ad.position.replace('_', ' ')}</span>
                    </div>
                    <p className="text-xs text-blue-500 truncate mt-1">
                      {ad.redirect_url ? (
                        <a href={ad.redirect_url} target="_blank" rel="noreferrer" className="hover:underline">{ad.redirect_url}</a>
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

export default AdvertisementManagement;
