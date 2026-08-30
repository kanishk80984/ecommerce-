import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, RotateCcw, RotateCw, FlipHorizontal, FlipVertical, RefreshCw, Check, ZoomIn, ZoomOut } from 'lucide-react';

const ASPECT_RATIOS = {
  '1:1': 1,
  '4:3': 4 / 3,
  '3:2': 3 / 2,
  '4:5': 4 / 5,
  '16:9': 16 / 9,
  '9:16': 9 / 16,
  '2:1': 2,
  '3:1': 3,
  '21:9': 21 / 9,
  '16:3': 16 / 3,
  '16:5': 16 / 5,
  '21:5': 21 / 5,
  '24:5': 24 / 5,
  free: null,
};

const ImageCropModal = ({
  isOpen,
  imageSrc,
  aspectRatio = '1:1',
  allowedRatios = ['1:1', '4:5', '16:9', 'free'],
  onSave,
  onCancel,
}) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const imageRef = useRef(null);

  const [loaded, setLoaded] = useState(false);
  const [selectedRatio, setSelectedRatio] = useState(aspectRatio);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, w: 0, h: 0 });

  // Load image
  useEffect(() => {
    if (!isOpen || !imageSrc) return;
    setLoaded(false);
    setZoom(1);
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setPanOffset({ x: 0, y: 0 });
    setSelectedRatio(aspectRatio);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      setLoaded(true);
    };
    img.onerror = () => {
      console.error('Failed to load image for crop');
    };
    img.src = imageSrc;
  }, [isOpen, imageSrc, aspectRatio]);

  // Calculate crop area based on container and ratio
  const calculateCropArea = useCallback(() => {
    const container = containerRef.current;
    if (!container) return { x: 0, y: 0, w: 0, h: 0 };

    const cw = container.offsetWidth;
    const ch = container.offsetHeight;
    const padding = 40;
    const maxW = cw - padding * 2;
    const maxH = ch - padding * 2;

    let ratio = null;
    if (selectedRatio && selectedRatio !== 'free') {
      const parts = String(selectedRatio).split(':');
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        ratio = parseFloat(parts[0]) / parseFloat(parts[1]);
      } else {
        ratio = ASPECT_RATIOS[selectedRatio] || null;
      }
    }
    let cropW, cropH;

    if (ratio) {
      if (maxW / maxH > ratio) {
        cropH = maxH;
        cropW = cropH * ratio;
      } else {
        cropW = maxW;
        cropH = cropW / ratio;
      }
    } else {
      const img = imageRef.current;
      const imgRatio = img && img.naturalHeight ? (img.naturalWidth / img.naturalHeight) : 1;
      if (maxW / maxH > imgRatio) {
        cropH = maxH;
        cropW = cropH * imgRatio;
      } else {
        cropW = maxW;
        cropH = cropW / imgRatio;
      }
    }

    return {
      x: (cw - cropW) / 2,
      y: (ch - cropH) / 2,
      w: cropW,
      h: cropH,
    };
  }, [selectedRatio]);

  // Draw canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    const container = containerRef.current;
    if (!canvas || !img || !container || !loaded) return;

    const cw = container.offsetWidth;
    const ch = container.offsetHeight;
    canvas.width = cw;
    canvas.height = ch;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, cw, ch);

    // Calculate crop area
    const area = calculateCropArea();
    setCropArea(area);

    // Fill crop area rectangle with pure WHITE background (#FFFFFF) for excess space
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(area.x, area.y, area.w, area.h);

    // Calculate image display size to fill crop area
    const imgW = img.naturalWidth;
    const imgH = img.naturalHeight;

    // Fit image to fill the crop area
    const scaleX = area.w / imgW;
    const scaleY = area.h / imgH;
    const baseScale = Math.max(scaleX, scaleY);
    const scale = baseScale * zoom;

    const drawW = imgW * scale;
    const drawH = imgH * scale;

    // Center of crop area
    const cx = area.x + area.w / 2 + panOffset.x;
    const cy = area.y + area.h / 2 + panOffset.y;

    // Draw the image
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    // Dark overlay outside crop area
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    // Top
    ctx.fillRect(0, 0, cw, area.y);
    // Bottom
    ctx.fillRect(0, area.y + area.h, cw, ch - area.y - area.h);
    // Left
    ctx.fillRect(0, area.y, area.x, area.h);
    // Right
    ctx.fillRect(area.x + area.w, area.y, cw - area.x - area.w, area.h);

    // Crop area border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 2;
    ctx.strokeRect(area.x, area.y, area.w, area.h);

    // Grid lines (rule of thirds)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 2; i++) {
      // Vertical
      ctx.beginPath();
      ctx.moveTo(area.x + (area.w / 3) * i, area.y);
      ctx.lineTo(area.x + (area.w / 3) * i, area.y + area.h);
      ctx.stroke();
      // Horizontal
      ctx.beginPath();
      ctx.moveTo(area.x, area.y + (area.h / 3) * i);
      ctx.lineTo(area.x + area.w, area.y + (area.h / 3) * i);
      ctx.stroke();
    }

    // Corner handles
    const handleSize = 20;
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 3;
    const corners = [
      [area.x, area.y],
      [area.x + area.w, area.y],
      [area.x, area.y + area.h],
      [area.x + area.w, area.y + area.h],
    ];
    corners.forEach(([cx, cy], idx) => {
      const dx = idx % 2 === 0 ? 1 : -1;
      const dy = idx < 2 ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(cx, cy + handleSize * dy);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx + handleSize * dx, cy);
      ctx.stroke();
    });
  }, [loaded, zoom, rotation, flipH, flipV, panOffset, selectedRatio, calculateCropArea]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Resize observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => drawCanvas());
    observer.observe(container);
    return () => observer.disconnect();
  }, [drawCanvas]);

  // Mouse/touch handlers for panning
  const handlePointerDown = (e) => {
    setIsDragging(true);
    const pt = e.touches ? e.touches[0] : e;
    setDragStart({ x: pt.clientX - panOffset.x, y: pt.clientY - panOffset.y });
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const pt = e.touches ? e.touches[0] : e;
    setPanOffset({
      x: pt.clientX - dragStart.x,
      y: pt.clientY - dragStart.y,
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  // Mouse wheel zoom
  const handleWheel = (e) => {
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    setZoom(prev => Math.min(5, Math.max(1, prev + delta)));
  };

  // Reset all transforms
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setPanOffset({ x: 0, y: 0 });
  };

  // Generate cropped output
  const handleSave = () => {
    const img = imageRef.current;
    if (!img) return;

    const area = calculateCropArea();

    // Create offscreen canvas at crop area dimensions
    const outputCanvas = document.createElement('canvas');
    const outputW = Math.round(area.w);
    const outputH = Math.round(area.h);
    outputCanvas.width = outputW;
    outputCanvas.height = outputH;
    const octx = outputCanvas.getContext('2d');

    // Fill entire output canvas with pure WHITE background (#FFFFFF) to match excess area
    octx.fillStyle = '#FFFFFF';
    octx.fillRect(0, 0, outputW, outputH);

    // Replicate the exact same transform, but shifted so crop area maps to (0,0)
    const imgW = img.naturalWidth;
    const imgH = img.naturalHeight;
    const scaleX = area.w / imgW;
    const scaleY = area.h / imgH;
    const baseScale = Math.max(scaleX, scaleY);
    const scale = baseScale * zoom;
    const drawW = imgW * scale;
    const drawH = imgH * scale;

    const cx = outputW / 2 + panOffset.x;
    const cy = outputH / 2 + panOffset.y;

    octx.save();
    octx.translate(cx, cy);
    octx.rotate((rotation * Math.PI) / 180);
    octx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    octx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    octx.restore();

    // Export as WebP and compress to under 30KB iteratively
    let quality = 0.8;
    const maxSizeBytes = 30 * 1024;

    const exportBlob = (currentQuality) => {
      outputCanvas.toBlob(
        (blob) => {
          if (!blob) return;

          // If blob size is within limit, or quality is at its floor, save it
          if (blob.size <= maxSizeBytes || currentQuality <= 0.1) {
            const cropData = {
              rotation,
              flipH,
              flipV,
              zoom,
              cropWidth: outputW,
              cropHeight: outputH,
            };
            onSave(blob, cropData, URL.createObjectURL(blob));
          } else {
            // Reduce quality and try again
            exportBlob(Math.max(0.1, currentQuality - 0.1));
          }
        },
        'image/webp',
        currentQuality
      );
    };

    exportBlob(quality);
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      {/* Modal Container */}
      <div className="w-full h-full max-w-[1200px] max-h-[90vh] mx-4 flex flex-col bg-gray-900 rounded-2xl overflow-hidden shadow-2xl border border-gray-700/50">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gray-800/80 border-b border-gray-700/50">
          <div>
            <h3 className="text-white font-bold text-base">Crop & Edit Image</h3>
            <p className="text-gray-400 text-xs mt-0.5">Drag to reposition • Scroll to zoom • Select aspect ratio below</p>
          </div>
          <button type="button" onClick={onCancel} className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-all">
            <X size={20} />
          </button>
        </div>

        {/* Canvas Area */}
        <div
          ref={containerRef}
          className="flex-1 relative cursor-grab active:cursor-grabbing select-none overflow-hidden touch-none"
          style={{ touchAction: 'none' }}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
          onWheel={handleWheel}
        >
          {!loaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          <canvas ref={canvasRef} className="block w-full h-full" />
        </div>

        {/* Controls Bar */}
        <div className="px-6 py-4 bg-gray-800/80 border-t border-gray-700/50 space-y-3">
          {/* Aspect Ratio Selector */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-400 font-bold uppercase tracking-wider mr-2">Ratio:</span>
              {allowedRatios.map((r) => (
                <button
                  type="button"
                  key={r}
                  onClick={() => { setSelectedRatio(r); setPanOffset({ x: 0, y: 0 }); setZoom(1); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedRatio === r
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                >
                  {r === 'free' ? 'Original / Free' : r}
                </button>
              ))}
            </div>
          </div>

          {/* Tools Row */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              {/* Zoom */}
              <div className="flex items-center gap-2 bg-gray-700/50 rounded-lg px-3 py-1.5">
                <ZoomOut size={14} className="text-gray-400" />
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="0.01"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="w-24 accent-blue-500"
                />
                <ZoomIn size={14} className="text-gray-400" />
                <span className="text-xs text-gray-400 font-mono w-10 text-right">{Math.round(zoom * 100)}%</span>
              </div>

              {/* Divider */}
              <div className="w-px h-6 bg-gray-700" />

              {/* Rotate */}
              <button type="button" onClick={() => setRotation(r => r - 90)} className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-all" title="Rotate Left">
                <RotateCcw size={16} />
              </button>
              <button type="button" onClick={() => setRotation(r => r + 90)} className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-all" title="Rotate Right">
                <RotateCw size={16} />
              </button>

              <div className="w-px h-6 bg-gray-700" />

              {/* Flip */}
              <button type="button" onClick={() => setFlipH(f => !f)} className={`p-2 rounded-lg transition-all ${flipH ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-700'}`} title="Flip Horizontal">
                <FlipHorizontal size={16} />
              </button>
              <button type="button" onClick={() => setFlipV(f => !f)} className={`p-2 rounded-lg transition-all ${flipV ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-700'}`} title="Flip Vertical">
                <FlipVertical size={16} />
              </button>

              <div className="w-px h-6 bg-gray-700" />

              {/* Reset */}
              <button type="button" onClick={handleReset} className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-all" title="Reset">
                <RefreshCw size={16} />
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-300 bg-gray-700 hover:bg-gray-600 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2"
              >
                <Check size={16} />
                Apply Crop
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ImageCropModal;
