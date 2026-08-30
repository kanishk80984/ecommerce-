import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, Star, Move, Eye, Crop, Image as ImageIcon, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import api from '../services/api';
import ImageCropModal from './ImageCropModal';
import ImagePreviewModal from './ImagePreviewModal';
import { getImageUrl } from '../utils/imageUrl';

const EnterpriseImageUploader = ({
  images = [],
  onChange,
  module = 'products',
  maxFiles = 10,
  maxFileSizeMB = 5,
  aspectRatio = '1:1',
  allowedRatios = ['1:1', '4:5', '16:9', 'free'],
  minResolution = null,
  showAltText = true,
  showSeoTitle = false,
  showImageType = true,
  single = false,
}) => {
  const fileInputRef = useRef(null);
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadQueue, setUploadQueue] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Crop Modal
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState(null);
  const [cropFile, setCropFile] = useState(null);
  const [cropIndex, setCropIndex] = useState(null); // null = new, number = recrop existing

  // Preview Modal
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [previewIndex, setPreviewIndex] = useState(null);

  // Replace file input
  const replaceInputRef = useRef(null);
  const [replaceIndex, setReplaceIndex] = useState(null);

  const showError = (msg) => {
    setError(msg);
    setTimeout(() => setError(null), 5001);
  };

  const showSuccess = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  };


  // ─── FILE VALIDATION ───
  const validateFile = (file) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return `"${file.name}" — unsupported format. Only JPG, PNG, WEBP allowed.`;
    }
    if (file.size > maxFileSizeMB * 1024 * 1024) {
      return `"${file.name}" exceeds ${maxFileSizeMB}MB limit.`;
    }
    return null;
  };

  const validateResolution = (file) => {
    return new Promise((resolve) => {
      if (!minResolution) return resolve(null);
      const img = new Image();
      img.onload = () => {
        if (img.width < minResolution.w || img.height < minResolution.h) {
          resolve(`"${file.name}" is ${img.width}×${img.height}px — minimum ${minResolution.w}×${minResolution.h}px required.`);
        } else {
          resolve(null);
        }
        URL.revokeObjectURL(img.src);
      };
      img.onerror = () => resolve(null);
      img.src = URL.createObjectURL(file);
    });
  };

  // ─── FILE SELECTION ───
  const handleFilesSelected = async (files) => {
    const fileList = Array.from(files);

    if (single && fileList.length > 1) {
      showError('Only one image can be uploaded.');
      return;
    }

    const maxAllowed = single ? 1 : maxFiles - images.length;
    if (fileList.length > maxAllowed) {
      showError(`You can upload a maximum of ${maxAllowed} more image(s).`);
      return;
    }

    // Validate each file
    for (const file of fileList) {
      const sizeErr = validateFile(file);
      if (sizeErr) { showError(sizeErr); return; }
      const resErr = await validateResolution(file);
      if (resErr) { showError(resErr); return; }
    }

    // For each valid file, open crop modal one at a time
    setUploadQueue([...fileList]);
    openCropForFile(fileList[0], null);
  };

  const openCropForFile = (file, index) => {
    setCropFile(file);
    setCropIndex(index);
    const src = URL.createObjectURL(file);
    setCropImageSrc(src);
    setCropModalOpen(true);
  };

  // ─── CROP COMPLETE → UPLOAD ───
  const handleCropSave = async (blob, cropData, previewUrl) => {
    setCropModalOpen(false);

    const file = new File([blob], cropFile?.name || 'image.jpg', { type: blob.type || 'image/jpeg' });
    const altText = cropFile?.name?.split('.')[0] || 'Image';

    // Upload to server
    const queueId = Date.now();
    setUploadProgress(prev => ({ ...prev, [queueId]: 0 }));

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('module', module);
      formData.append('altText', altText);
      if (cropData) formData.append('cropData', JSON.stringify(cropData));
      formData.append('isPrimary', images.length === 0 && cropIndex === null ? 'true' : 'false');
      formData.append('sortOrder', cropIndex !== null ? cropIndex : images.length);

      const res = await api.post('/images/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          const pct = Math.round((e.loaded * 100) / (e.total || 1));
          setUploadProgress(prev => ({ ...prev, [queueId]: pct }));
        },
      });

      setUploadProgress(prev => { const n = { ...prev }; delete n[queueId]; return n; });

      const uploadedImage = {
        id: res.data.image.id,
        imageUrl: res.data.image.mainPath,
        image_url: res.data.image.mainPath,
        imageType: 'GALLERY',
        sortOrder: res.data.image.sortOrder,
        isDefault: res.data.image.isPrimary,
        altText: res.data.image.altText,
        seoTitle: res.data.image.seoTitle || '',
        width: res.data.image.width,
        height: res.data.image.height,
        fileSize: res.data.image.fileSize,
        mimeType: res.data.image.mimeType,
        sizes: res.data.image.sizes,
        _previewUrl: previewUrl, // local blob URL for instant preview
      };

      if (cropIndex !== null) {
        // Replace existing image
        const updated = [...images];
        updated[cropIndex] = { ...updated[cropIndex], ...uploadedImage };
        onChange(updated);
      } else if (single) {
        onChange([uploadedImage]);
      } else {
        onChange([...images, uploadedImage]);
      }

      showSuccess('Image uploaded & optimized successfully!');
    } catch (err) {
      console.error('Upload failed:', err);
      setUploadProgress(prev => { const n = { ...prev }; delete n[queueId]; return n; });

      // Fallback: save as base64 if server upload fails
      const reader = new FileReader();
      reader.onloadend = () => {
        const fallbackImage = {
          imageUrl: reader.result,
          imageType: 'GALLERY',
          sortOrder: cropIndex !== null ? cropIndex : images.length,
          isDefault: images.length === 0 && cropIndex === null,
          altText,
        };
        if (cropIndex !== null) {
          const updated = [...images];
          updated[cropIndex] = { ...updated[cropIndex], ...fallbackImage };
          onChange(updated);
        } else if (single) {
          onChange([fallbackImage]);
        } else {
          onChange([...images, fallbackImage]);
        }
        showSuccess('Image saved locally (optimization unavailable).');
      };
      reader.readAsDataURL(blob);
    }

    // Process next in queue
    const remaining = uploadQueue.slice(1);
    setUploadQueue(remaining);
    if (remaining.length > 0) {
      setTimeout(() => openCropForFile(remaining[0], null), 300);
    }
  };

  const handleCropCancel = () => {
    setCropModalOpen(false);
    setCropImageSrc(null);
    setCropFile(null);
    setUploadQueue([]);
  };

  // ─── DRAG & DROP ZONE ───
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length) handleFilesSelected(files);
  };

  // ─── GALLERY: REORDER ───
  const handleDragStart = (e, idx) => { dragItem.current = idx; };
  const handleDragEnter = (e, idx) => { dragOverItem.current = idx; };
  const handleDragEnd = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    const copy = [...images];
    const dragged = copy[dragItem.current];
    copy.splice(dragItem.current, 1);
    copy.splice(dragOverItem.current, 0, dragged);
    dragItem.current = null;
    dragOverItem.current = null;
    onChange(copy.map((img, idx) => ({ ...img, sortOrder: idx })));
  };

  // ─── GALLERY: ACTIONS ───
  const handleRemove = (idx) => {
    const filtered = images.filter((_, i) => i !== idx);
    const hasDefault = filtered.some(img => img.isDefault);
    if (!hasDefault && filtered.length > 0) filtered[0].isDefault = true;
    onChange(filtered.map((img, i) => ({ ...img, sortOrder: i })));
    setPreviewModalOpen(false);
  };

  const handleSetDefault = (idx) => {
    onChange(images.map((img, i) => ({ ...img, isDefault: i === idx })));
  };

  const handleAltTextChange = (idx, val) => {
    const updated = [...images];
    updated[idx] = { ...updated[idx], altText: val };
    onChange(updated);
  };

  const handleSeoTitleChange = (idx, val) => {
    const updated = [...images];
    updated[idx] = { ...updated[idx], seoTitle: val };
    onChange(updated);
  };

  const handleTypeChange = (idx, val) => {
    const updated = [...images];
    updated[idx] = { ...updated[idx], imageType: val };
    onChange(updated);
  };

  const handlePreview = (img, idx) => {
    setPreviewImage(img);
    setPreviewIndex(idx);
    setPreviewModalOpen(true);
  };

  const handleRecrop = () => {
    setPreviewModalOpen(false);
    if (previewIndex !== null) {
      const img = images[previewIndex];
      const url = getImageUrl(img.imageUrl || img.image_url || img._previewUrl);
      // Need to fetch as blob, then open crop
      fetch(url)
        .then(r => r.blob())
        .then(blob => {
          const file = new File([blob], img.altText || 'image.jpg', { type: blob.type });
          openCropForFile(file, previewIndex);
        })
        .catch(() => showError('Cannot load image for recrop.'));
    }
  };

  const handleReplace = () => {
    setPreviewModalOpen(false);
    setReplaceIndex(previewIndex);
    setTimeout(() => replaceInputRef.current?.click(), 100);
  };

  const handleReplaceFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateFile(file);
    if (err) { showError(err); return; }
    openCropForFile(file, replaceIndex);
    e.target.value = '';
  };

  const isUploading = Object.keys(uploadProgress).length > 0;
  const canAddMore = single ? images.length === 0 : images.length < maxFiles;

  return (
    <div className="space-y-4">
      {/* Toast Messages */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold animate-[fadeIn_0.2s_ease-out]">
          <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-xs text-green-700 font-semibold animate-[fadeIn_0.2s_ease-out]">
          <CheckCircle size={16} className="text-green-500 flex-shrink-0" />
          {success}
        </div>
      )}

      {/* Upload Progress */}
      {Object.entries(uploadProgress).map(([id, pct]) => (
        <div key={id} className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-blue-700 font-bold flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" /> Optimizing image...
            </span>
            <span className="text-xs text-blue-600 font-mono">{pct}%</span>
          </div>
          <div className="w-full bg-blue-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      ))}

      {/* Drag & Drop Upload Zone */}
      {canAddMore && (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`
            relative border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-200
            ${isDragOver
              ? 'border-blue-500 bg-blue-50/50 scale-[1.01]'
              : 'border-gray-300 hover:border-blue-400 bg-gray-50/30 hover:bg-blue-50/20'
            }
            ${isUploading ? 'pointer-events-none opacity-60' : ''}
          `}
        >
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 transition-all ${isDragOver ? 'bg-blue-100' : 'bg-gray-100'}`}>
            <Upload className={`w-6 h-6 ${isDragOver ? 'text-blue-600' : 'text-gray-400'}`} />
          </div>
          <span className="text-sm font-bold text-gray-700">
            {isDragOver ? 'Drop files here' : 'Drag & drop files here, or click to browse'}
          </span>
          <span className="text-xs text-gray-400 mt-1.5">
            JPG, PNG, WEBP • Max {maxFileSizeMB}MB {!single && `• Up to ${maxFiles} images`}
          </span>
          {aspectRatio && (
            <span className="text-xs font-semibold text-blue-600 mt-0.5">
              Crop Ratio: {aspectRatio}
            </span>
          )}
          {minResolution && (
            <span className="text-xs text-gray-400 mt-0.5">
              Min resolution: {minResolution.w}×{minResolution.h}px
            </span>
          )}

          <input
            ref={fileInputRef}
            type="file"
            multiple={!single}
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => handleFilesSelected(e.target.files)}
          />
        </div>
      )}

      {/* Hidden replace input */}
      <input
        ref={replaceInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleReplaceFileChange}
      />

      {/* Gallery Grid */}
      {images.length > 0 && (
        <div className={`grid gap-4 ${single ? 'grid-cols-1 max-w-xs' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'}`}>
          {images.map((img, idx) => {
            const path = img._previewUrl || img.imageUrl || img.image_url || img;
            return (
              <div
                key={idx}
                draggable={!single}
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragEnter={(e) => handleDragEnter(e, idx)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => e.preventDefault()}
                className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex flex-col group cursor-grab active:cursor-grabbing relative hover:shadow-md transition-shadow"
              >
                {/* Drag handle */}
                {!single && (
                  <div className="absolute top-2 left-2 bg-white/80 backdrop-blur-sm p-1 rounded-md text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <Move size={14} />
                  </div>
                )}

                {/* Remove */}
                <button
                  type="button"
                  onClick={() => handleRemove(idx)}
                  className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full hover:bg-red-700 shadow-md z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={14} />
                </button>

                {/* Preview button */}
                <button
                  type="button"
                  onClick={() => handlePreview(img, idx)}
                  className="absolute top-2 right-10 bg-white/90 backdrop-blur-sm text-gray-600 p-1 rounded-full hover:bg-white shadow-md z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Eye size={14} />
                </button>

                {/* Primary badge */}
                {img.isDefault && (
                  <div className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
                    <Star size={10} className="fill-white" />
                    Primary
                  </div>
                )}

                {/* Image preview */}
                <div className="h-40 bg-gray-50 flex items-center justify-center p-2 border-b border-gray-100 overflow-hidden">
                  <img
                    src={getImageUrl(path)}
                    alt={img.altText || 'Product'}
                    className="max-h-full max-w-full object-contain"
                    loading="lazy"
                  />
                </div>

                {/* Controls */}
                <div className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => handleSetDefault(idx)}
                      className={`flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-md border transition-all ${img.isDefault
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                        }`}
                    >
                      <Star size={12} className={img.isDefault ? 'fill-amber-500 text-amber-500' : ''} />
                      {img.isDefault ? 'Primary' : 'Set Primary'}
                    </button>
                    {!single && <span className="text-[10px] text-gray-400 font-mono">#{idx + 1}</span>}
                  </div>

                  {showAltText && (
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-0.5">Alt Text</label>
                      <input
                        type="text"
                        value={img.altText || ''}
                        onChange={(e) => handleAltTextChange(idx, e.target.value)}
                        placeholder="Image description"
                        className="w-full border border-gray-200 rounded-lg p-1.5 text-xs focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  )}

                  {showSeoTitle && (
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-0.5">SEO Title</label>
                      <input
                        type="text"
                        value={img.seoTitle || ''}
                        onChange={(e) => handleSeoTitleChange(idx, e.target.value)}
                        placeholder="SEO image title"
                        className="w-full border border-gray-200 rounded-lg p-1.5 text-xs focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  )}

                  {showImageType && (
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-0.5">Image Type</label>
                      <select
                        value={img.imageType || 'GALLERY'}
                        onChange={(e) => handleTypeChange(idx, e.target.value)}
                        className="w-full border border-gray-200 rounded-lg p-1.5 text-xs bg-white focus:outline-none"
                      >
                        <option value="MAIN">Main Image</option>
                        <option value="GALLERY">Gallery Image</option>
                        <option value="THUMBNAIL">Thumbnail</option>
                        <option value="360">360° View</option>
                      </select>
                    </div>
                  )}

                  {/* Metadata pills */}
                  {(img.width || img.fileSize) && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {img.width && img.height && (
                        <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
                          {img.width}×{img.height}
                        </span>
                      )}
                      {img.fileSize && (
                        <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
                          {(img.fileSize / 1024).toFixed(0)}KB
                        </span>
                      )}
                      {img.mimeType && (
                        <span className="text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded font-bold">
                          WebP
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {images.length === 0 && !canAddMore && (
        <div className="py-8 text-center text-gray-400 text-xs border border-dashed border-gray-200 rounded-xl bg-gray-50/20">
          No images uploaded yet.
        </div>
      )}

      {/* Crop Modal */}
      <ImageCropModal
        isOpen={cropModalOpen}
        imageSrc={cropImageSrc}
        aspectRatio={aspectRatio}
        allowedRatios={allowedRatios}
        onSave={handleCropSave}
        onCancel={handleCropCancel}
      />

      {/* Preview Modal */}
      <ImagePreviewModal
        isOpen={previewModalOpen}
        image={previewImage}
        onClose={() => setPreviewModalOpen(false)}
        onReplace={handleReplace}
        onRecrop={handleRecrop}
        onRemove={() => handleRemove(previewIndex)}
      />
    </div>
  );
};

export default EnterpriseImageUploader;
