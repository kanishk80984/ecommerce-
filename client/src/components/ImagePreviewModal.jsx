import React from 'react';
import { createPortal } from 'react-dom';
import { X, Crop, Trash2, Replace, Download, Info } from 'lucide-react';
import { getImageUrl } from '../utils/imageUrl';

const ImagePreviewModal = ({ isOpen, image, onClose, onReplace, onRecrop, onRemove }) => {
  if (!isOpen || !image) return null;

  const imgUrl = getImageUrl(image.imageUrl || image.image_url || image.mainPath || image);
  const fileSize = image.fileSize ? `${(image.fileSize / 1024).toFixed(1)} KB` : null;

  return createPortal(
    <div className="fixed inset-0 z-[9998] flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.88)' }}>
      <div className="relative w-full max-w-4xl max-h-[90vh] mx-4 flex flex-col bg-gray-900 rounded-2xl overflow-hidden shadow-2xl border border-gray-700/50">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gray-800/80 border-b border-gray-700/50">
          <div className="flex items-center gap-3">
            <h3 className="text-white font-bold text-base">Image Preview</h3>
            {image.altText && (
              <span className="text-xs text-gray-400 bg-gray-700/60 px-2 py-0.5 rounded-md">{image.altText}</span>
            )}
          </div>
          <button type="button" onClick={onClose} className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-all">
            <X size={20} />
          </button>
        </div>

        {/* Image Display */}
        <div className="flex-1 flex items-center justify-center p-6 bg-gray-950/50 overflow-auto">
          <img
            src={imgUrl}
            alt={image.altText || 'Preview'}
            className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-2xl"
            style={{ imageRendering: 'auto' }}
          />
        </div>

        {/* Info Bar */}
        {(image.width || image.height || fileSize || image.mimeType) && (
          <div className="px-6 py-2 bg-gray-800/40 flex items-center gap-4 text-xs text-gray-400 border-t border-gray-800">
            <Info size={12} />
            {image.width && image.height && <span>{image.width} × {image.height} px</span>}
            {fileSize && <span>{fileSize}</span>}
            {image.mimeType && <span>{image.mimeType}</span>}
          </div>
        )}

        {/* Action Bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-gray-800/80 border-t border-gray-700/50">
          <div className="flex items-center gap-2">
            {onRecrop && (
              <button
                type="button"
                onClick={onRecrop}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-gray-300 bg-gray-700 hover:bg-gray-600 transition-all"
              >
                <Crop size={14} />
                Recrop
              </button>
            )}
            {onReplace && (
              <button
                type="button"
                onClick={onReplace}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-gray-300 bg-gray-700 hover:bg-gray-600 transition-all"
              >
                <Replace size={14} />
                Replace
              </button>
            )}
          </div>
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all"
            >
              <Trash2 size={14} />
              Remove
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ImagePreviewModal;
